import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { randomUUID } from 'node:crypto';
import { createApp } from '../../app.js';
import { createPrisma } from '../../src/lib/prisma.js';
import { createRedis } from '../../src/lib/redis.js';
import { loadEnvironment } from '../../src/config/env.js';
import { createReadinessCheck } from '../../src/modules/health/health.service.js';
import { createApiRouter } from '../../src/routes/index.js';
import { authenticate } from '../../src/common/middlewares/authentication.js';
import { authorize } from '../../src/common/middlewares/authorization.js';
import { errorHandler } from '../../src/common/middlewares/error-handler.js';
import { createAuthRepository } from '../../src/modules/auth/auth.repository.js';
import { createAuthService } from '../../src/modules/auth/auth.service.js';
import { DEFAULT_LIMITS } from '../../src/common/security/rate-limits.js';
import type { RatePolicy } from '../../src/common/security/rate-limits.js';
import type { Environment } from '../../src/config/env.js';

const base = loadEnvironment();
if (process.env['RUN_FOUNDATION_INTEGRATION'] !== 'true' || !new URL(base.DATABASE_URL).pathname.endsWith('_test') || !base.REDIS_NAMESPACE.startsWith('wrs:test:')) {
  throw new Error('Auth integration requires explicit test flag, database _test and REDIS_NAMESPACE starting wrs:test:.');
}
const prisma = createPrisma(base.DATABASE_URL);
const redis = createRedis(base.REDIS_URL);
const operatorEmail = process.env['SEED_OPERATOR_EMAIL']?.trim().toLowerCase();
const supervisorEmail = process.env['SEED_SUPERVISOR_EMAIL']?.trim().toLowerCase();
const operatorPassword = process.env['SEED_OPERATOR_PASSWORD'];
const supervisorPassword = process.env['SEED_SUPERVISOR_PASSWORD'];
if (!operatorEmail || !supervisorEmail || !operatorPassword || !supervisorPassword) throw new Error('Test seed credentials required.');
const actorEmail: string = operatorEmail;
const actorPassword: string = operatorPassword;
const adminEmail: string = supervisorEmail;
const adminPassword: string = supervisorPassword;
beforeAll(async () => { await prisma.$connect(); await redis.connect(); });
afterAll(async () => { await prisma.$disconnect(); if (redis.isOpen) await redis.close(); });
beforeEach(async () => {
  await prisma.user.update({ where: { email: actorEmail }, data: { isActive: true, deletedAt: null, role: 'OPERATOR', authVersion: 1 } });
});

function context(options: Partial<Environment> = {}, limits: RatePolicy = DEFAULT_LIMITS) {
  const environment = { ...base, REDIS_NAMESPACE: `${base.REDIS_NAMESPACE}:${randomUUID()}`, ...options };
  const security = { environment, prisma, redis, limits };
  const app = createApp({ checkReadiness: createReadinessCheck({ prisma, redis }), security });
  return { app, environment, security };
}
function cookie(response: request.Response): string {
  const values: unknown = response.headers['set-cookie'];
  if (!Array.isArray(values) || typeof values[0] !== 'string') throw new Error('Session cookie missing.');
  return values[0].split(';')[0] ?? '';
}
async function bootstrap(app: ReturnType<typeof createApp>) {
  const response = await request(app).get('/api/v1/auth/csrf-token').expect(200);
  const token: unknown = response.body.data.csrfToken;
  if (typeof token !== 'string') throw new Error('CSRF token missing.');
  return { cookie: cookie(response), token, response };
}
function login(app: ReturnType<typeof createApp>, session: { cookie: string; token: string }, email = actorEmail, password = actorPassword) {
  return request(app).post('/api/v1/auth/login').set('Cookie', session.cookie).set('Origin', base.APP_ORIGIN).set('X-CSRF-Token', session.token).send({ email, password });
}
async function authenticated(app: ReturnType<typeof createApp>) {
  const anonymous = await bootstrap(app);
  const response = await login(app, anonymous).expect(200);
  const token: string = response.body.data.csrfToken;
  return { cookie: cookie(response), token, response, anonymous };
}
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
async function stored(cookieValue: string, namespace: string) {
  const value = decodeURIComponent(cookieValue.slice(cookieValue.indexOf('=') + 1));
  const id = value.slice(2).split('.')[0];
  const raw = await redis.get(`${namespace}:sess:${id}`);
  return { raw, ttl: await redis.ttl(`${namespace}:sess:${id}`) };
}

describe('real session, CSRF and authorization security', () => {
  it('bootstraps a stable token with Redis TTL and secure local cookie attributes', async () => {
    const ctx = context(); const anonymous = await bootstrap(ctx.app);
    expect(anonymous.response.headers['cache-control']).toBe('no-store');
    const headers = String(anonymous.response.headers['set-cookie'] ?? '');
    const attributes = headers.split(';').map(value => value.trim().split('=')[0]);
    expect(headers).toContain('SameSite=Lax'); expect(headers).toContain('Path=/');
    expect(attributes).toContain('HttpOnly'); expect(attributes).toContain('SameSite'); expect(attributes).toContain('Path');
    expect(attributes).not.toContain('Domain'); expect(attributes).not.toContain('Secure');
    const state = await stored(anonymous.cookie, ctx.environment.REDIS_NAMESPACE);
    expect(state.raw !== null).toBe(true); expect(state.ttl).toBeGreaterThan(0); expect(state.ttl).toBeLessThanOrEqual(900);
    const again = await request(ctx.app).get('/api/v1/auth/csrf-token').set('Cookie', anonymous.cookie).expect(200);
    expect(again.body.data.csrfToken === anonymous.token).toBe(true);
    await request(ctx.app).get('/api/v1/auth/me').set('Cookie', anonymous.cookie).expect(401);
    await request(ctx.app).get('/api/v1/auth/me').expect(401);
  });
  it('rejects missing/wrong CSRF and untrusted/missing Origin before login', async () => {
    const { app } = context(); const anonymous = await bootstrap(app);
    for (const token of ['', 'incorrect']) {
      const result = await request(app).post('/api/v1/auth/login').set('Cookie', anonymous.cookie).set('Origin', base.APP_ORIGIN).set('X-CSRF-Token', token).send({ email: actorEmail, password: actorPassword }).expect(403);
      expect(result.body.error.code).toBe('CSRF_INVALID');
    }
    for (const origin of ['', 'https://untrusted.example']) {
      await request(app).post('/api/v1/auth/login').set('Cookie', anonymous.cookie).set('Origin', origin).set('X-CSRF-Token', anonymous.token).send({ email: actorEmail, password: actorPassword }).expect(403);
    }
    await request(app).post('/api/v1/auth/login').set('Cookie', anonymous.cookie).set('Referer', `${base.APP_ORIGIN}/login`).set('X-CSRF-Token', anonymous.token).send({ email: actorEmail, password: actorPassword }).expect(200);
  });
  it('regenerates SID/token, returns a safe DTO and revokes the pre-login session', async () => {
    const ctx = context(); const active = await authenticated(ctx.app);
    expect(active.cookie !== active.anonymous.cookie).toBe(true);
    expect(active.token !== active.anonymous.token).toBe(true);
    expect((await stored(active.anonymous.cookie, ctx.environment.REDIS_NAMESPACE)).raw === null).toBe(true);
    const user = active.response.body.data.user;
    expect(Object.keys(user).sort()).toEqual(['id','email','name','role','isActive','deletedAt','createdAt','updatedAt'].sort());
    expect(user.role).toBe('OPERATOR');
    const state = await stored(active.cookie, ctx.environment.REDIS_NAMESPACE);
    expect(state.ttl).toBeGreaterThan(0); expect(state.ttl).toBeLessThanOrEqual(1800);
    await request(ctx.app).get('/api/v1/auth/me').set('Cookie', active.cookie).expect(200);
    await request(ctx.app).get('/api/v1/auth/me').set('Cookie', active.anonymous.cookie).expect(401);
    await login(ctx.app, { cookie: active.cookie, token: active.anonymous.token }).expect(403);
  });
  it('destroys Redis session and expires the cookie on confirmed logout', async () => {
    const ctx = context(); const active = await authenticated(ctx.app);
    const response = await request(ctx.app).post('/api/v1/auth/logout').set('Cookie', active.cookie).set('Origin', base.APP_ORIGIN).set('Content-Type', 'application/json').set('X-CSRF-Token', active.token).expect(204);
    expect(response.text).toBe('');
    expect((await stored(active.cookie, ctx.environment.REDIS_NAMESPACE)).raw === null).toBe(true);
    await request(ctx.app).get('/api/v1/auth/me').set('Cookie', active.cookie).expect(401);
  });
  it('rejects invalid/unknown input and never trims passwords; normalizes email', async () => {
    const { app } = context(); const anonymous = await bootstrap(app);
    const mutation = () => request(app).post('/api/v1/auth/login').set('Cookie', anonymous.cookie).set('Origin', base.APP_ORIGIN).set('X-CSRF-Token', anonymous.token);
    await mutation().send({ email: actorEmail, password: actorPassword, role: 'SUPERVISOR' }).expect(400);
    await mutation().send({ email: actorEmail, password: '😀'.repeat(129) }).expect(400);
    await mutation().send({ email: actorEmail, password: `${actorPassword} ` }).expect(401);
    await mutation().send({ email: actorEmail, password: '😀'.repeat(128) }).expect(401);
    await mutation().send({ email: ` ${actorEmail.toUpperCase()} `, password: actorPassword }).expect(200);
  });
  it('rejects malformed JSON, oversized JSON, unknown queries and wrong content type', async () => {
    const { app } = context(); const anonymous = await bootstrap(app);
    await request(app).get('/api/v1/auth/csrf-token?unknown=true').expect(400);
    const mutation = () => request(app).post('/api/v1/auth/login').set('Cookie', anonymous.cookie).set('Origin', base.APP_ORIGIN).set('X-CSRF-Token', anonymous.token);
    await mutation().set('Content-Type', 'application/json').send('{').expect(400);
    await mutation().set('Content-Type', 'text/plain').send('text').expect(415);
    await mutation().send({ email: actorEmail, password: 'x'.repeat(70000) }).expect(413);
  });
  it('uses generic credential errors for wrong password, unknown, inactive and deleted users', async () => {
    const { app } = context(); const anonymous = await bootstrap(app);
    const wrong = await login(app, anonymous, actorEmail, 'wrong-password').expect(401);
    const unknown = await login(app, anonymous, 'missing@example.test', actorPassword).expect(401);
    await prisma.user.update({ where: { email: actorEmail }, data: { isActive: false } });
    const inactive = await login(app, anonymous).expect(401);
    await prisma.user.update({ where: { email: actorEmail }, data: { isActive: true, deletedAt: new Date() } });
    const deleted = await login(app, anonymous).expect(401);
    expect([unknown, inactive, deleted].every(value => value.body.error.message === wrong.body.error.message && value.body.error.code === 'INVALID_CREDENTIALS')).toBe(true);
    await prisma.user.update({ where: { email: actorEmail }, data: { isActive: true, deletedAt: null } });
  });
  it('revokes old sessions after status, deletion or authVersion changes', async () => {
    for (const data of [{ isActive: false }, { deletedAt: new Date() }, { authVersion: 2 }]) {
      await prisma.user.update({ where: { email: actorEmail }, data: { isActive: true, deletedAt: null, authVersion: 1 } });
      const { app } = context(); const active = await authenticated(app);
      await prisma.user.update({ where: { email: actorEmail }, data });
      await request(app).get('/api/v1/auth/me').set('Cookie', active.cookie).expect(401);
    }
  });
  it('loads role from PostgreSQL and authorizes supervisor only on a test-only protected probe', async () => {
    const ctx = context(); const api = createApiRouter(ctx.security);
    const service = createAuthService(createAuthRepository(prisma));
    api.get('/role-probe', authenticate(service, ctx.environment), authorize('SUPERVISOR'), (_req, res) => res.json({ allowed: true }));
    const app = express(); app.use((req, _res, next) => { req.requestId = randomUUID(); next(); }); app.use('/api/v1', api); app.use(errorHandler);
    const operator = await authenticated(app);
    await request(app).get('/api/v1/role-probe').set('Cookie', operator.cookie).expect(403);
    const anonymous = await bootstrap(app);
    const supervisor = await login(app, anonymous, adminEmail, adminPassword).expect(200);
    await request(app).get('/api/v1/role-probe').set('Cookie', cookie(supervisor)).expect(200);
    await prisma.user.update({ where: { email: actorEmail }, data: { role: 'SUPERVISOR' } });
    const refreshed = await request(app).get('/api/v1/auth/me').set('Cookie', operator.cookie).expect(200);
    expect(refreshed.body.data.role).toBe('SUPERVISOR');
    await prisma.user.update({ where: { email: actorEmail }, data: { role: 'OPERATOR' } });
  });
  it('enforces actual Redis idle expiry and anonymous lifetime', async () => {
    const ctx = context({ SESSION_IDLE_SECONDS: 1, SESSION_ABSOLUTE_SECONDS: 5, ANONYMOUS_SESSION_SECONDS: 1 });
    const active = await authenticated(ctx.app);
    await delay(1150);
    await request(ctx.app).get('/api/v1/auth/me').set('Cookie', active.cookie).expect(401);
    const next = await bootstrap(ctx.app); await delay(1150);
    await login(ctx.app, next).expect(403);
  });
  it('caps rolling Redis/cookie lifetime at absolute deadline despite active use', async () => {
    const ctx = context({ SESSION_IDLE_SECONDS: 2, SESSION_ABSOLUTE_SECONDS: 3 });
    const active = await authenticated(ctx.app);
    await delay(1100); await request(ctx.app).get('/api/v1/auth/me').set('Cookie', active.cookie).expect(200);
    await delay(1100); await request(ctx.app).get('/api/v1/auth/me').set('Cookie', active.cookie).expect(200);
    expect((await stored(active.cookie, ctx.environment.REDIS_NAMESPACE)).ttl).toBeLessThanOrEqual(1);
    await delay(1000); await request(ctx.app).get('/api/v1/auth/me').set('Cookie', active.cookie).expect(401);
  });
  it('sets HTTPS host cookie only with explicitly trusted HTTPS proxy', async () => {
    const ctx = context({ DEPLOYMENT_MODE: 'https', SESSION_COOKIE_SECURE: true, APP_ORIGIN: 'https://warehouse.example', TRUST_PROXY: 'loopback' });
    const response = await request(ctx.app).get('/api/v1/auth/csrf-token').set('X-Forwarded-Proto', 'https').expect(200);
    const values = String(response.headers['set-cookie'] ?? '');
    const attributes = values.split(';').map(value => value.trim().split('=')[0]);
    expect(cookie(response).startsWith('__Host-wrs.sid=')).toBe(true);
    expect(attributes).toContain('Secure'); expect(attributes).toContain('HttpOnly'); expect(attributes).not.toContain('Domain');
    await request(ctx.app).get('/api/v1/auth/csrf-token').expect(403);
    const untrusted = context({ DEPLOYMENT_MODE: 'https', SESSION_COOKIE_SECURE: true, APP_ORIGIN: 'https://warehouse.example', TRUST_PROXY: '' });
    await request(untrusted.app).get('/api/v1/auth/csrf-token').set('X-Forwarded-Proto', 'https').expect(403);
  });
});

describe('Redis rate limit sharing and controlled dependency failures', () => {
  it('groups IPv6 subnets and IPv4-mapped IPv6 consistently for shared IP limits', async () => {
    for (const [first, second] of [['192.0.2.10', '::ffff:192.0.2.10'], ['2001:db8:1234:5600::1', '2001:db8:1234:56aa::2']]) {
      const ctx = context({ TRUST_PROXY: 'loopback' }, { ...DEFAULT_LIMITS, global: 1 });
      await request(ctx.app).get('/api/v1/auth/csrf-token').set('X-Forwarded-For', first ?? '').expect(200);
      await request(ctx.app).get('/api/v1/auth/csrf-token').set('X-Forwarded-For', second ?? '').expect(429);
    }
  });
  it('does not acknowledge failed session persistence or failed logout destruction', async () => {
    const ctx = context(); await bootstrap(ctx.app);
    const save = vi.spyOn(redis, 'set').mockRejectedValue(new Error('private store failure'));
    try { await request(ctx.app).get('/api/v1/auth/csrf-token').expect(503); }
    finally { save.mockRestore(); }
    const active = await authenticated(ctx.app);
    const destroy = vi.spyOn(redis, 'del').mockRejectedValue(new Error('private destroy failure'));
    try {
      const result = await request(ctx.app).post('/api/v1/auth/logout').set('Cookie', active.cookie).set('Origin', base.APP_ORIGIN).set('Content-Type', 'application/json').set('X-CSRF-Token', active.token).expect(503);
      expect(result.body.error.code).toBe('DEPENDENCY_UNAVAILABLE');
      expect(JSON.stringify(result.body).includes('private')).toBe(false);
    } finally { destroy.mockRestore(); }
    await request(ctx.app).get('/api/v1/auth/me').set('Cookie', active.cookie).expect(200);
  });
  it('shares the global IP limiter between two API instances and returns Retry-After', async () => {
    const ctx = context({}, { ...DEFAULT_LIMITS, global: 2 });
    const second = createApp({ checkReadiness: async () => {}, security: ctx.security });
    await request(ctx.app).get('/api/v1/auth/csrf-token').expect(200);
    await request(second).get('/api/v1/auth/csrf-token').expect(200);
    const limited = await request(ctx.app).get('/api/v1/auth/csrf-token').expect(429);
    expect(limited.body.error.code).toBe('RATE_LIMITED'); expect(Number(limited.headers['retry-after'])).toBeGreaterThan(0);
  });
  it('enforces distinct login-IP, normalized-email-pair and authenticated-user limits', async () => {
    for (const limits of [{ ...DEFAULT_LIMITS, loginIp: 1 }, { ...DEFAULT_LIMITS, loginPair: 1 }]) {
      const ctx = context({}, limits); const anonymous = await bootstrap(ctx.app);
      await login(ctx.app, anonymous, actorEmail, 'bad-password').expect(401);
      await login(ctx.app, anonymous, actorEmail.toUpperCase(), 'bad-password').expect(429);
    }
    const ctx = context({}, { ...DEFAULT_LIMITS, user: 1 }); const active = await authenticated(ctx.app);
    await request(ctx.app).get('/api/v1/auth/me').set('Cookie', active.cookie).expect(200);
    await request(ctx.app).get('/api/v1/auth/me').set('Cookie', active.cookie).expect(429);
  });
  it('fails closed on a real disconnected Redis client for auth and limits', async () => {
    const down = createRedis(base.REDIS_URL); await down.connect();
    const ctx = context(); const app = createApp({ checkReadiness: async () => {}, security: { ...ctx.security, redis: down } });
    await bootstrap(app); down.destroy();
    await request(app).get('/api/v1/auth/me').expect(503);
    await request(app).post('/api/v1/auth/login').send({}).expect(503);
    await request(app).get('/health/live').expect(200);
  });
  it('maps limiter store errors to 503 even when Redis PING still succeeds', async () => {
    const ctx = context(); await bootstrap(ctx.app);
    const spy = vi.spyOn(redis, 'sendCommand').mockRejectedValue(new Error('private connection detail'));
    try {
      const response = await request(ctx.app).get('/api/v1/auth/csrf-token').expect(503);
      expect(response.body.error.code).toBe('DEPENDENCY_UNAVAILABLE');
      expect(JSON.stringify(response.body).includes('private')).toBe(false);
    } finally { spy.mockRestore(); }
  });
  it('maps PostgreSQL failure to 503 without treating it as invalid credentials', async () => {
    const badUrl = new URL(base.DATABASE_URL); badUrl.port = '1'; const bad = createPrisma(badUrl.toString());
    const ctx = context(); const active = await authenticated(ctx.app);
    const app = createApp({ checkReadiness: async () => {}, security: { ...ctx.security, prisma: bad } });
    try { await request(app).get('/api/v1/auth/me').set('Cookie', active.cookie).expect(503); }
    finally { await bad.$disconnect(); }
  });
});
