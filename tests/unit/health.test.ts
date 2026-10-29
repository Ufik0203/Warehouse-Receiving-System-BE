import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app.js';

describe('health HTTP contract', () => {
  it('returns the exact liveness/readiness bodies', async () => {
    const app = createApp({ checkReadiness: async () => {} });
    expect((await request(app).get('/health/live').expect(200)).body).toEqual({ status: 'ok' });
    expect((await request(app).get('/health/ready').expect(200)).body).toEqual({ status: 'ready', dependencies: { postgres: 'up', redis: 'up' } });
    await request(app).get('/health/live?unknown=true').expect(400);
  });
  it('returns a safe 503 while liveness remains available', async () => {
    const app = createApp({ checkReadiness: async () => { throw new Error('postgresql://secret:password@internal'); } });
    const response = await request(app).get('/health/ready').expect(503);
    expect(response.body).toMatchObject({ error: { code: 'DEPENDENCY_UNAVAILABLE', requestId: expect.any(String) } });
    expect(JSON.stringify(response.body)).not.toContain('password');
    await request(app).get('/health/live').expect(200);
  });
  it('does not expose authentication or business routes', async () => {
    const app = createApp({ checkReadiness: async () => {} });
    await request(app).post('/api/v1/auth/login').expect(404);
    await request(app).get('/api/v1/products').expect(404);
  });
});
