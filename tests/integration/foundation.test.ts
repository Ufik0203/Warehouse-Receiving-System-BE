import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { verify } from 'argon2';
import { createApp } from '../../app.js';
import { loadEnvironmentFile } from '../../src/config/load-env.js';
import { createPrisma } from '../../src/lib/prisma.js';
import { createRedis } from '../../src/lib/redis.js';
import { createReadinessCheck } from '../../src/modules/health/health.service.js';
import { parseSeedAccounts, seedAccounts } from '../../prisma/seeds/seed.js';
import { parseEnvironment } from '../../src/config/env.js';
import { startServer } from '../../server.js';

loadEnvironmentFile();
const url = process.env['DATABASE_URL'];
const redisUrl = process.env['REDIS_URL'];
if (process.env['RUN_FOUNDATION_INTEGRATION'] !== 'true' || !url || !new URL(url).pathname.endsWith('_test') || !redisUrl) {
  throw new Error('Integration requires explicit RUN_FOUNDATION_INTEGRATION=true and isolated DATABASE_URL ending _test plus REDIS_URL.');
}
const prisma = createPrisma(url);
const redis = createRedis(redisUrl);

beforeAll(async () => { await prisma.$connect(); await redis.connect(); });
afterAll(async () => { await prisma.$disconnect(); if (redis.isOpen) await redis.close(); });

describe('real PostgreSQL/Redis foundation', () => {
  it('starts a real HTTP listener and shuts down HTTP, Prisma and Redis cleanly', async () => {
    const runtime = await startServer({ ...parseEnvironment(process.env), PORT: 0 });
    try {
      const address = runtime.server.address();
      if (!address || typeof address === 'string') throw new Error('Expected TCP listener.');
      const response = await fetch(`http://127.0.0.1:${address.port}/health/ready`);
      expect(response.status).toBe(200);
    } finally { await runtime.shutdown(); }
    expect(runtime.server.listening).toBe(false);
    expect(runtime.server.address()).toBeNull();
  });
  it('returns ready against migrated PostgreSQL and real Redis', async () => {
    const app = createApp({ checkReadiness: createReadinessCheck({ prisma, redis }) });
    await request(app).get('/health/live').expect(200);
    expect((await request(app).get('/health/ready').expect(200)).body.dependencies).toEqual({ postgres: 'up', redis: 'up' });
  });
  it('preserves seed rows and existing password hashes on rerun with changed credentials', async () => {
    const accounts = parseSeedAccounts(process.env);
    const before = await prisma.user.findMany({ orderBy: { email: 'asc' } });
    expect(before.filter(user => accounts.some(account => account.email === user.email))).toHaveLength(2);
    await seedAccounts(prisma, accounts.map(value => ({ ...value, name: 'Do not replace', password: randomUUID() })));
    const after = await prisma.user.findMany({ orderBy: { email: 'asc' } });
    // Compare full rows without placing hashes in assertion output on failure.
    expect(JSON.stringify(after) === JSON.stringify(before)).toBe(true);
    for (const account of accounts) {
      const user = after.find(value => value.email === account.email);
      expect(user).toBeDefined();
      if (user) expect(await verify(user.passwordHash, account.password)).toBe(true);
    }
  });
  it('has all SQL CHECK constraints and composite foreign keys with RESTRICT', async () => {
    const rows = await prisma.$queryRaw<Array<{ conname: string; definition: string }>>`
      SELECT conname, pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE connamespace = 'public'::regnamespace`;
    for (const name of ['users_email_lowercase','users_auth_version_positive','products_sku_format','products_unit_pcs','receiving_items_expected_range','receiving_items_received_nonnegative','receiving_items_received_max','inventory_transactions_quantity_range','inventory_balances_nonnegative']) expect(rows.some(value => value.conname === name)).toBe(true);
    const composite = rows.filter(value => value.definition.includes('FOREIGN KEY (receipt_id, receiving_id)') || value.definition.includes('FOREIGN KEY (receiving_item_id, receiving_id, product_id)'));
    expect(composite).toHaveLength(2);
    for (const row of composite) expect(row.definition).toContain('ON DELETE RESTRICT');
  });
  it('rejects invalid quantities and cross-document ledger links without persisting fixtures', async () => {
    const actor = await prisma.user.findFirstOrThrow();
    const product = randomUUID(); const doc = randomUUID(); const otherDoc = randomUUID(); const item = randomUUID(); const receipt = randomUUID();
    async function invalid(quantity: number, sourceDoc: string, expectedError: RegExp) {
      await expect(prisma.$transaction(async tx => {
        await tx.product.create({ data: { id: product, sku: `TEST_${product.replaceAll('-', '')}`, name: 'Disposable fixture' } });
        await tx.receiving.createMany({ data: [doc, otherDoc].map(id => ({ id, number: `RCV-${id.toUpperCase()}`, createdBy: actor.id })) });
        await tx.receivingItem.create({ data: { id: item, receivingId: doc, productId: product, expectedQuantity: 10 } });
        await tx.receipt.create({ data: { id: receipt, receivingId: sourceDoc, actorId: actor.id, idempotencyKey: randomUUID(), payloadHash: 'a'.repeat(64) } });
        await tx.inventoryTransaction.create({ data: { receiptId: receipt, receivingId: doc, receivingItemId: item, productId: product, quantity } });
      })).rejects.toThrow(expectedError);
      expect(await prisma.product.findUnique({ where: { id: product } })).toBeNull();
    }
    await invalid(0, doc, /constraint|quantity/i);
    await invalid(1, otherDoc, /constraint|foreign key/i);
  });
  it('fails readiness with actual PostgreSQL connection failure', async () => {
    const badUrl = new URL(url);
    badUrl.port = '1';
    const unavailable = createPrisma(badUrl.toString());
    try {
      const app = createApp({ checkReadiness: createReadinessCheck({ prisma: unavailable, redis }) });
      await request(app).get('/health/ready').expect(503);
      await request(app).get('/health/live').expect(200);
    } finally { await unavailable.$disconnect(); }
  });
  it('fails readiness after the actual Redis client is closed', async () => {
    const isolatedClient = createRedis(redisUrl);
    await isolatedClient.connect();
    await isolatedClient.close();
    const app = createApp({ checkReadiness: createReadinessCheck({ prisma, redis: isolatedClient }) });
    await request(app).get('/health/ready').expect(503);
  });
});
