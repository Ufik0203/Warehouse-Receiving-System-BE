import { beforeAll, afterAll, afterEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { verify } from 'argon2';
import { createApp } from '../../app.js';
import { loadEnvironment } from '../../src/config/env.js';
import { createPrisma } from '../../src/lib/prisma.js';
import { createRedis } from '../../src/lib/redis.js';
import { createUsersService } from '../../src/modules/users/users.service.js';
import { createUsersRepository } from '../../src/modules/users/users.repository.js';
import { createReceivingsService } from '../../src/modules/receivings/receivings.service.js';
import { createProductsService } from '../../src/modules/products/products.service.js';
import type { Role } from '../../src/generated/prisma/client.js';

const env = loadEnvironment();
if (process.env['RUN_FOUNDATION_INTEGRATION'] !== 'true' || !new URL(env.DATABASE_URL).pathname.endsWith('_test') || !env.REDIS_NAMESPACE.startsWith('wrs:test:')) throw new Error('Explicit isolated database/Redis required.');
const prisma = createPrisma(env.DATABASE_URL); const redis = createRedis(env.REDIS_URL);
const password = `  ${randomUUID()}  `;
const dtoFields = ['id','email','name','role','isActive','deletedAt','createdAt','updatedAt'].sort();
beforeAll(async () => { await prisma.$connect(); await redis.connect(); });
afterAll(async () => { await prisma.$disconnect(); if (redis.isOpen) await redis.close(); });
afterEach(async () => { vi.restoreAllMocks(); expect(await prisma.user.count({ where: { role: 'SUPERVISOR', isActive: true, deletedAt: null } })).toBeGreaterThan(0); });
function app() { return createApp({ checkReadiness: async () => {}, security: { environment: { ...env, REDIS_NAMESPACE: `${env.REDIS_NAMESPACE}:${randomUUID()}` }, prisma, redis } }); }
type App = ReturnType<typeof app>;
type Actor = { sid: string; token: string; id: string };
function cookie(response: request.Response) {
  const values: unknown = response.headers['set-cookie'];
  if (!Array.isArray(values) || typeof values[0] !== 'string') throw new Error('Session cookie missing.');
  return values[0].split(';')[0] ?? '';
}
async function login(api: App, email: string, secret: string): Promise<Actor> {
  const bootstrap = await request(api).get('/api/v1/auth/csrf-token').expect(200);
  const result = await request(api).post('/api/v1/auth/login').set('Cookie', cookie(bootstrap)).set('Origin', env.APP_ORIGIN).set('X-CSRF-Token', String(bootstrap.body.data.csrfToken)).send({ email, password: secret }).expect(200);
  return { sid: cookie(result), token: String(result.body.data.csrfToken), id: String(result.body.data.user.id) };
}
async function seedActor(api: App, role = 'SUPERVISOR') {
  const email = process.env[`SEED_${role}_EMAIL`]; const secret = process.env[`SEED_${role}_PASSWORD`];
  if (!email || !secret) throw new Error('Seed credentials required.'); return login(api, email, secret);
}
const read = (api: App, actor: Actor, path: string) => request(api).get(`/api/v1${path}`).set('Cookie', actor.sid);
function mutation(api: App, actor: Actor, method: 'post' | 'patch' | 'delete', path: string) {
  return request(api)[method](`/api/v1${path}`).set('Cookie', actor.sid).set('Origin', env.APP_ORIGIN).set('Content-Type', 'application/json').set('X-CSRF-Token', actor.token);
}
async function fixture(actorId: string, role: Role = 'OPERATOR') {
  return createUsersService(prisma).create(actorId, { name: 'Fixture', email: `${randomUUID()}@example.test`, password, role });
}
async function setup() { const api = app(); const supervisor = await seedActor(api); return { api, supervisor }; }
function gate() { let resolve: (() => void) | undefined; const promise = new Promise<void>(done => { resolve = done; }); return { promise, resolve: () => resolve?.() }; }

describe('supervisor user-management HTTP and revocation', () => {
  it('denies unauthenticated and operator access to every user endpoint', async () => {
    const api = app(); const operator = await seedActor(api, 'OPERATOR'); const id = randomUUID();
    await request(api).get('/api/v1/users').expect(401);
    await read(api, operator, '/users').expect(403); await read(api, operator, `/users/${id}`).expect(403);
    for (const [method, path] of [['post','/users'],['patch',`/users/${id}`],['delete',`/users/${id}`]] as const) await mutation(api, operator, method, path).send({}).expect(403);
  });
  it('creates both roles, normalizes unique emails, hashes untrimmed passwords and exposes only DTO fields', async () => {
    const { api, supervisor } = await setup();
    for (const role of ['OPERATOR','SUPERVISOR']) {
      const email = `${randomUUID()}@example.test`;
      const result = await mutation(api, supervisor, 'post', '/users').send({ name: ' Name ', email: ` ${email.toUpperCase()} `, password, role }).expect(201);
      expect(result.body.data.email).toBe(email); expect(result.body.data.name).toBe('Name'); expect(Object.keys(result.body.data).sort()).toEqual(dtoFields);
      const stored = await prisma.user.findUniqueOrThrow({ where: { id: String(result.body.data.id) } });
      expect(stored.passwordHash === password).toBe(false); expect(await verify(stored.passwordHash, password)).toBe(true); expect(await verify(stored.passwordHash, password.trim())).toBe(false);
      expect((await mutation(api, supervisor, 'post', '/users').send({ name: 'Other', email: email.toUpperCase(), password, role }).expect(409)).body.error.code).toBe('EMAIL_ALREADY_EXISTS');
      await login(api, email, password);
    }
  });
  it('validates code-point boundaries, strict inputs and immutable email/password updates', async () => {
    const { api, supervisor } = await setup(); const user = await fixture(supervisor.id);
    const body = { name: '\u{1f600}'.repeat(120), email: `${randomUUID()}@example.test`, password: '\u{1f600}'.repeat(12), role: 'OPERATOR' };
    const created = await mutation(api, supervisor, 'post', '/users').send(body).expect(201);
    expect((await read(api, supervisor, `/users/${created.body.data.id}`).expect(200)).body.data.name).toBe(body.name);
    for (const invalid of [{ ...body, name: body.name+'x' }, { ...body, password: '\u{1f600}'.repeat(11) }, { ...body, password: '\u{1f600}'.repeat(129) }, { ...body, role: 'ADMIN' }, { ...body, authVersion: 1 }]) await mutation(api, supervisor, 'post', '/users').send(invalid).expect(400);
    await mutation(api, supervisor, 'post', '/users').send({ ...body, email: `${randomUUID()}@example.test`, password: '\u{1f600}'.repeat(128) }).expect(201);
    const longEmail = randomUUID().replaceAll('-', '') + 'a'.repeat(32) + '@' + 'b'.repeat(63) + '.' + 'c'.repeat(63) + '.' + 'd'.repeat(61);
    expect(longEmail.length).toBe(254);
    await mutation(api, supervisor, 'post', '/users').send({ ...body, email: longEmail }).expect(201);
    await mutation(api, supervisor, 'post', '/users').send({ ...body, email: longEmail + 'd' }).expect(400);
    const before = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    for (const invalid of [{}, { email: 'other@example.test' }, { password: 'changed-password' }, { name: '' }, { name: '\u{1f600}'.repeat(121) }, { isActive: 'false' }, { deletedAt: null }]) await mutation(api, supervisor, 'patch', `/users/${user.id}`).send(invalid).expect(400);
    expect(JSON.stringify(await prisma.user.findUniqueOrThrow({ where: { id: user.id } })) === JSON.stringify(before)).toBe(true);
    await mutation(api, supervisor, 'patch', `/users/${user.id}`).send({ name: 'e\u0301'.repeat(60) }).expect(200);
  });
  it('implements USER_NOT_FOUND and strict queries', async () => {
    const { api, supervisor } = await setup(); const id = randomUUID();
    expect((await read(api, supervisor, `/users/${id}`).expect(404)).body.error.code).toBe('USER_NOT_FOUND');
    for (const method of ['patch','delete'] as const) expect((await mutation(api, supervisor, method, `/users/${id}`).send(method === 'patch' ? { name: 'A' } : undefined).expect(404)).body.error.code).toBe('USER_NOT_FOUND');
    await read(api, supervisor, '/users/not-uuid').expect(400);
    for (const query of [{ unknown: 1 }, { includeDeleted: '1' }, { isActive: 'FALSE' }, { role: 'ADMIN' }, { limit: 101 }]) await read(api, supervisor, '/users').query(query).expect(400);
  });
  it('lists active/inactive users, excludes deleted by default and uses deterministic pagination/safe DTOs', async () => {
    const { api, supervisor } = await setup(); const user = await fixture(supervisor.id);
    await mutation(api, supervisor, 'patch', `/users/${user.id}`).send({ isActive: false }).expect(200);
    const inactive = await read(api, supervisor, '/users').query({ isActive: 'false', role: 'OPERATOR', limit: 100 }).expect(200);
    expect(inactive.body.data.some((row: { id: string }) => row.id === user.id)).toBe(true);
    const page = await read(api, supervisor, '/users').query({ limit: 1 }).expect(200); expect(page.body.data).toHaveLength(1); expect(Object.keys(page.body.data[0]).sort()).toEqual(dtoFields);
    const expected = await prisma.user.findFirstOrThrow({ where: { deletedAt: null }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] }); expect(page.body.data[0].id).toBe(expected.id);
    await mutation(api, supervisor, 'delete', `/users/${user.id}`).expect(204);
    expect((await read(api, supervisor, '/users').query({ limit: 100 }).expect(200)).body.data.some((row: { id: string }) => row.id === user.id)).toBe(false);
    expect((await read(api, supervisor, '/users').query({ includeDeleted: 'true', isActive: 'false', limit: 100 }).expect(200)).body.data.some((row: { id: string }) => row.id === user.id)).toBe(true);
    expect(Object.keys((await read(api, supervisor, `/users/${user.id}`).expect(200)).body.data).sort()).toEqual(dtoFields);
  });
  it('rejects self-demotion/deactivation/deletion with no partial changes', async () => {
    const { api, supervisor } = await setup(); const before = await prisma.user.findUniqueOrThrow({ where: { id: supervisor.id } });
    for (const input of [{ role: 'OPERATOR' }, { name: 'Should rollback', isActive: false }]) expect((await mutation(api, supervisor, 'patch', `/users/${supervisor.id}`).send(input).expect(409)).body.error.code).toBe('SELF_ACCOUNT_RESTRICTION');
    expect((await mutation(api, supervisor, 'delete', `/users/${supervisor.id}`).expect(409)).body.error.code).toBe('SELF_ACCOUNT_RESTRICTION');
    expect(JSON.stringify(await prisma.user.findUniqueOrThrow({ where: { id: supervisor.id } })) === JSON.stringify(before)).toBe(true);
  });
  it('revokes sessions for actual role/status changes, preserves them for name/no-op updates', async () => {
    const { api, supervisor } = await setup(); const user = await fixture(supervisor.id); const session = await login(api, user.email, password);
    const service = createUsersService(prisma); const start = (await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).authVersion;
    await mutation(api, supervisor, 'patch', `/users/${user.id}`).send({ name: 'Renamed', role: 'OPERATOR', isActive: true }).expect(200);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).authVersion).toBe(start); await read(api, session, '/auth/me').expect(200);
    await mutation(api, supervisor, 'patch', `/users/${user.id}`).send({ role: 'SUPERVISOR', isActive: false }).expect(200);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).authVersion).toBe(start+1); await read(api, session, '/auth/me').expect(401);
    await service.update(supervisor.id, user.id, { isActive: true }); const next = await login(api, user.email, password);
    await service.update(supervisor.id, user.id, { role: 'OPERATOR' }); await read(api, next, '/auth/me').expect(401);
  });
  it('soft-deletes idempotently, rejects login/update/reused email and preserves receipt history', async () => {
    const { api, supervisor } = await setup(); const user = await fixture(supervisor.id); const session = await login(api, user.email, password);
    const product = await createProductsService(prisma).create({ sku: randomUUID().toUpperCase(), name: 'History' });
    const receiving = await createReceivingsService(prisma).create(user.id, { reference: '', items: [{ productId: product.id, expectedQuantity: 1 }] });
    const item = receiving.items[0]; if (!item) throw new Error('Item required.');
    await createReceivingsService(prisma).receive(receiving.id, user.id, randomUUID(), { items: [{ receivingItemId: item.id, quantity: 1 }] });
    await mutation(api, supervisor, 'delete', `/users/${user.id}`).expect(204); const deleted = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(deleted.isActive).toBe(false); expect(deleted.deletedAt).not.toBeNull(); expect(deleted.authVersion).toBe(2); await read(api, session, '/auth/me').expect(401);
    const bootstrap = await request(api).get('/api/v1/auth/csrf-token').expect(200);
    expect((await request(api).post('/api/v1/auth/login').set('Cookie', cookie(bootstrap)).set('Origin', env.APP_ORIGIN).set('X-CSRF-Token', String(bootstrap.body.data.csrfToken)).send({ email: user.email, password }).expect(401)).body.error.code).toBe('INVALID_CREDENTIALS');
    expect((await mutation(api, supervisor, 'patch', `/users/${user.id}`).send({ isActive: true }).expect(409)).body.error.code).toBe('USER_DELETED');
    await mutation(api, supervisor, 'delete', `/users/${user.id}`).expect(204);
    expect(JSON.stringify(await prisma.user.findUniqueOrThrow({ where: { id: user.id } })) === JSON.stringify(deleted)).toBe(true);
    expect((await mutation(api, supervisor, 'post', '/users').send({ name: 'Reuse', email: user.email.toUpperCase(), password, role: 'OPERATOR' }).expect(409)).body.error.code).toBe('EMAIL_ALREADY_EXISTS');
    const history = await read(api, supervisor, '/inventory/transactions').query({ receivingId: receiving.id }).expect(200); expect(history.body.data[0].actorId).toBe(user.id);
    expect((await read(api, supervisor, `/receivings/${receiving.id}`).expect(200)).body.data.createdBy).toBe(user.id);
  });
  it('requires CSRF on create/update/delete including no-body delete', async () => {
    const { api, supervisor } = await setup(); const user = await fixture(supervisor.id);
    for (const [method,path] of [['post','/users'],['patch',`/users/${user.id}`],['delete',`/users/${user.id}`]] as const) await request(api)[method](`/api/v1${path}`).set('Cookie', supervisor.sid).set('Origin', env.APP_ORIGIN).set('Content-Type','application/json').send(method === 'delete' ? undefined : {}).expect(403);
  });
});

describe('advisory lock and account invariant with real transactions', () => {
  it('preserves a sole active supervisor and serializes concurrent cross-demotion', async () => {
    const { api, supervisor } = await setup(); const a = await fixture(supervisor.id, 'SUPERVISOR'); const b = await fixture(supervisor.id, 'SUPERVISOR');
    const others = await prisma.user.findMany({ where: { role: 'SUPERVISOR', isActive: true, deletedAt: null, id: { notIn: [a.id,b.id] } }, select: { id: true } });
    try {
      await prisma.user.updateMany({ where: { id: { in: others.map(user => user.id) } }, data: { isActive: false } });
      const results = await Promise.allSettled([createUsersService(prisma).update(a.id,b.id,{ role:'OPERATOR' }),createUsersService(prisma).update(b.id,a.id,{ role:'OPERATOR' })]);
      expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
      const rejection = results.find(result => result.status === 'rejected'); expect(rejection?.status === 'rejected' && rejection.reason.code === 'FORBIDDEN').toBe(true);
      expect(await prisma.user.count({ where: { role:'SUPERVISOR', isActive:true, deletedAt:null } })).toBe(1);
      const last = await prisma.user.findFirstOrThrow({ where: { role:'SUPERVISOR',isActive:true,deletedAt:null } });
      const session = await login(api,last.email,password);
      for (const body of [{ role:'OPERATOR' },{ isActive:false }]) await mutation(api,session,'patch',`/users/${last.id}`).send(body).expect(409);
      await mutation(api,session,'delete',`/users/${last.id}`).expect(409);
      expect(await prisma.user.count({ where: { role:'SUPERVISOR', isActive:true, deletedAt:null } })).toBe(1);
    } finally { await prisma.user.updateMany({ where: { id: { in: others.map(user=>user.id) } },data:{ isActive:true } }); }
  });
  it('rechecks an actor whose access changes while PostgreSQL confirms an advisory-lock wait', async () => {
    const { supervisor } = await setup();
    for (const change of [{ isActive:false },{ role:'OPERATOR' as const },{ deletedAt:new Date(),isActive:false }]) {
      const acting = await fixture(supervisor.id,'SUPERVISOR'); const target = await fixture(supervisor.id); const held = gate(); const finish = gate(); const queued = gate(); let pid = 0;
      const repository = createUsersRepository(); const originalLock=repository.lock;
      const holder = prisma.$transaction(async tx => { await originalLock(tx); held.resolve(); await finish.promise; await tx.user.update({ where:{ id:acting.id },data:change }); }, { timeout:10000 });
      await held.promise;
      vi.spyOn(repository,'lock').mockImplementation(async tx => { pid=(await tx.$queryRaw<Array<{ pid:number }>>`SELECT pg_backend_pid() AS pid`)[0]?.pid ?? 0; const lock=originalLock(tx); queued.resolve(); await lock; });
      const pending=createUsersService(prisma,repository).update(acting.id,target.id,{ name:'Must not persist' });
      const checked=expect(pending).rejects.toMatchObject({ status:403,code:'FORBIDDEN' });
      await queued.promise;
      try {
        let waiting=false;
        for(let attempt=0;attempt<100;attempt++) {
          waiting=(await prisma.$queryRaw<Array<{ waiting:boolean }>>`SELECT EXISTS(SELECT 1 FROM pg_locks WHERE pid=${pid} AND locktype='advisory' AND NOT granted) AS waiting`)[0]?.waiting ?? false;
          if(waiting) break; await new Promise(resolve=>setTimeout(resolve,10));
        }
        expect(waiting).toBe(true);
      } finally { finish.resolve(); }
      await holder; await checked;
      expect((await prisma.user.findUniqueOrThrow({ where:{ id:target.id } })).name).toBe(target.name);
    }
  });
  it('rolls back user fields and authVersion on a PostgreSQL failure after update', async () => {
    const { supervisor } = await setup(); const target=await fixture(supervisor.id); const before=await prisma.user.findUniqueOrThrow({ where:{ id:target.id } });
    const repository=createUsersRepository();const update=repository.update;let wrote=false;
    vi.spyOn(repository,'update').mockImplementation(async (tx,id,input,revoke)=>{
      const result=await update(tx,id,input,revoke);wrote=result.role==='SUPERVISOR'&&result.authVersion===before.authVersion+1;
      await tx.$executeRaw`UPDATE users SET auth_version=0 WHERE id=${id}::uuid`;return result;
    });
    await expect(createUsersService(prisma,repository).update(supervisor.id,target.id,{ role:'SUPERVISOR',name:'Rollback' })).rejects.toMatchObject({ status:503 });
    expect(wrote).toBe(true);expect(JSON.stringify(await prisma.user.findUniqueOrThrow({ where:{ id:target.id } }))===JSON.stringify(before)).toBe(true);
  });
  it('rolls back if a transaction would leave zero active supervisors', async () => {
    const { supervisor }=await setup();const target=await fixture(supervisor.id);const repository=createUsersRepository();const update=repository.update;
    const before=await prisma.user.findUniqueOrThrow({ where:{ id:target.id } });
    vi.spyOn(repository,'update').mockImplementation(async(tx,id,input,revoke)=>{
      const result=await update(tx,id,input,revoke);
      // Test-only corruption within the same transaction exercises the final invariant guard.
      await tx.user.updateMany({ where:{ role:'SUPERVISOR' },data:{ isActive:false } });return result;
    });
    await expect(createUsersService(prisma,repository).update(supervisor.id,target.id,{ name:'Rollback' })).rejects.toMatchObject({ status:409,code:'LAST_ACTIVE_SUPERVISOR' });
    expect(JSON.stringify(await prisma.user.findUniqueOrThrow({ where:{ id:target.id } }))===JSON.stringify(before)).toBe(true);
  });
});
