import { beforeAll, afterAll, afterEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { createApp } from '../../app.js';
import { loadEnvironment } from '../../src/config/env.js';
import { createPrisma } from '../../src/lib/prisma.js';
import { createRedis } from '../../src/lib/redis.js';
import { createReceivingsRepository } from '../../src/modules/receivings/receivings.repository.js';
import { createReceivingsService } from '../../src/modules/receivings/receivings.service.js';
import { createProductsService } from '../../src/modules/products/products.service.js';
import { createInventoryService } from '../../src/modules/inventory/inventory.service.js';
import type { Prisma } from '../../src/generated/prisma/client.js';

const environment = loadEnvironment();
if (process.env['RUN_FOUNDATION_INTEGRATION'] !== 'true' || !new URL(environment.DATABASE_URL).pathname.endsWith('_test') || !environment.REDIS_NAMESPACE.startsWith('wrs:test:')) throw new Error('Explicit isolated test database and Redis namespace required.');
const prisma = createPrisma(environment.DATABASE_URL);
const redis = createRedis(environment.REDIS_URL);
beforeAll(async () => { await prisma.$connect(); await redis.connect(); });
afterAll(async () => { await prisma.$disconnect(); if (redis.isOpen) await redis.close(); });
afterEach(async () => { vi.restoreAllMocks(); await reconcile(); });

function context(limits?: { global: number; loginIp: number; loginPair: number; user: number }) {
  return createApp({ checkReadiness: async () => {}, security: {
    environment: { ...environment, REDIS_NAMESPACE: `${environment.REDIS_NAMESPACE}:${randomUUID()}` }, prisma, redis, ...(limits ? { limits } : {})
  } });
}
type App = ReturnType<typeof createApp>;
type Actor = { sid: string; token: string; id: string };
type Item = { id: string; productId: string; expectedQuantity: number; receivedQuantity: number; remainingQuantity: number };
type Document = { id: string; status: string; items: Item[] };
function sessionCookie(response: request.Response) {
  const values: unknown = response.headers['set-cookie'];
  if (!Array.isArray(values) || typeof values[0] !== 'string') throw new Error('Cookie missing.');
  return values[0].split(';')[0] ?? '';
}
async function actor(app: App, role: 'OPERATOR' | 'SUPERVISOR' = 'OPERATOR'): Promise<Actor> {
  const init = await request(app).get('/api/v1/auth/csrf-token').expect(200);
  const email = process.env[`SEED_${role}_EMAIL`]; const password = process.env[`SEED_${role}_PASSWORD`];
  if (!email || !password) throw new Error('Seed credentials required.');
  const login = await request(app).post('/api/v1/auth/login').set('Cookie', sessionCookie(init)).set('Origin', environment.APP_ORIGIN).set('X-CSRF-Token', String(init.body.data.csrfToken)).send({ email, password }).expect(200);
  return { sid: sessionCookie(login), token: String(login.body.data.csrfToken), id: String(login.body.data.user.id) };
}
const read = (app: App, user: Actor, path: string) => request(app).get(`/api/v1${path}`).set('Cookie', user.sid);
const post = (app: App, user: Actor, path: string) => request(app).post(`/api/v1${path}`).set('Cookie', user.sid).set('Origin', environment.APP_ORIGIN).set('X-CSRF-Token', user.token);
async function product(app: App, supervisor: Actor, name = 'Test product') {
  const result = await post(app, supervisor, '/products').send({ sku: `T4-${randomUUID()}`, name }).expect(201);
  return String(result.body.data.id);
}
async function document(app: App, user: Actor, productIds: string[], expectedQuantity = 10): Promise<Document> {
  const result = await post(app, user, '/receivings').send({ items: productIds.map(productId => ({ productId, expectedQuantity })) }).expect(201);
  return result.body.data;
}
const items = (doc: Document, quantity: number) => doc.items.map(item => ({ receivingItemId: item.id, quantity }));
const receive = (app: App, user: Actor, doc: Document, quantity: number, key = randomUUID()) => post(app, user, `/receivings/${doc.id}/receipts`).set('Idempotency-Key', key).send({ items: items(doc, quantity) });
async function setup(count = 1, expected = 10) {
  const app = context(); const supervisor = await actor(app, 'SUPERVISOR'); const operator = await actor(app);
  const products: string[] = [];
  for (let i = 0; i < count; i++) products.push(await product(app, supervisor));
  const doc = await document(app, operator, products, expected);
  return { app, supervisor, operator, products, doc };
}
async function reconcile() {
  const balances = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT p.id FROM products p LEFT JOIN inventory_balances b ON b.product_id=p.id
    LEFT JOIN (SELECT product_id,SUM(quantity) AS qty FROM inventory_transactions GROUP BY product_id) l ON l.product_id=p.id
    WHERE b.product_id IS NULL OR b.available_quantity <> COALESCE(l.qty,0)`;
  const counters = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT i.id FROM receiving_items i LEFT JOIN (SELECT receiving_item_id,SUM(quantity) AS qty FROM inventory_transactions GROUP BY receiving_item_id) l ON l.receiving_item_id=i.id
    WHERE i.received_quantity <> COALESCE(l.qty,0) OR i.received_quantity<0 OR i.received_quantity>i.expected_quantity`;
  const statuses = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT r.id FROM receivings r JOIN receiving_items i ON i.receiving_id=r.id GROUP BY r.id
    HAVING (r.status='COMPLETED') <> bool_and(i.received_quantity=i.expected_quantity)
    OR (r.status='OPEN') <> bool_and(i.received_quantity=0)`;
  expect(balances).toEqual([]); expect(counters).toEqual([]); expect(statuses).toEqual([]);
}
async function state(doc: Document) {
  return JSON.stringify({
    header: await prisma.receiving.findUnique({ where: { id: doc.id } }),
    items: await prisma.receivingItem.findMany({ where: { receivingId: doc.id }, orderBy: { id: 'asc' } }),
    receipts: await prisma.receipt.findMany({ where: { receivingId: doc.id }, orderBy: { id: 'asc' } }),
    ledger: await prisma.inventoryTransaction.findMany({ where: { receivingId: doc.id }, orderBy: { id: 'asc' } }),
    balances: await prisma.inventoryBalance.findMany({ where: { productId: { in: doc.items.map(item => item.productId) } }, orderBy: { productId: 'asc' } })
  }, (_key, value: unknown) => typeof value === 'bigint' ? value.toString() : value);
}

describe('core receiving HTTP contract on real PostgreSQL/Redis', () => {
  it('enforces roles, CSRF and strict input; product and zero balance are created atomically', async () => {
    const app = context(); const operator = await actor(app); const supervisor = await actor(app, 'SUPERVISOR');
    await request(app).get('/api/v1/products').expect(401);
    await post(app, operator, '/products').send({ sku: 'A', name: 'A' }).expect(403);
    await request(app).post('/api/v1/products').set('Cookie', supervisor.sid).set('Origin', environment.APP_ORIGIN).send({ sku: 'A', name: 'A' }).expect(403);
    await post(app, supervisor, '/products').send({ sku: 'A', name: 'A', unit: 'kg' }).expect(400);
    const sku = `NORMAL-${randomUUID().slice(0, 8)}`.toUpperCase();
    const created = await post(app, supervisor, '/products').send({ sku: ` ${sku.toLowerCase()} `, name: ' Product ' }).expect(201);
    expect(created.body.data.sku).toBe(sku); expect(created.body.data.name).toBe('Product'); expect(created.body.data.unit).toBe('pcs');
    expect((await prisma.inventoryBalance.findUniqueOrThrow({ where: { productId: String(created.body.data.id) } })).availableQuantity).toBe(0n);
    const conflict = await post(app, supervisor, '/products').send({ sku: sku.toLowerCase(), name: 'Other' }).expect(409);
    expect(conflict.body.error.code).toBe('SKU_ALREADY_EXISTS');
    await read(app, operator, `/products/${created.body.data.id}`).expect(200);
  });
  it('maps R-10 missing products/receivings and validates before lookup without writes', async () => {
    const { app, operator, products, doc } = await setup();
    expect((await read(app, operator, `/products/${randomUUID()}`).expect(404)).body.error.code).toBe('PRODUCT_NOT_FOUND');
    expect((await read(app, operator, `/receivings/${randomUUID()}`).expect(404)).body.error.code).toBe('RECEIVING_NOT_FOUND');
    const before = await prisma.receiving.count();
    const missing = await post(app, operator, '/receivings').send({ items: [{ productId: products[0], expectedQuantity: 1 }, { productId: randomUUID(), expectedQuantity: 1 }] }).expect(404);
    expect(missing.body.error.code).toBe('PRODUCT_NOT_FOUND'); expect(await prisma.receiving.count()).toBe(before);
    await post(app, operator, '/receivings').send({ items: [{ productId: randomUUID(), expectedQuantity: 0 }] }).expect(400);
    await read(app, operator, '/products/not-uuid').expect(400);
    const missingDoc = { ...doc, id: randomUUID() };
    expect((await receive(app, operator, missingDoc, 1).expect(404)).body.error.code).toBe('RECEIVING_NOT_FOUND');
  });
  it('round trips R-11 astral boundaries after normalization; rejects excess name/reference/query/SKU', async () => {
    const app = context(); const supervisor = await actor(app, 'SUPERVISOR');
    const name = '\u{1f600}'.repeat(120); const id = await product(app, supervisor, ` ${name} `);
    expect((await read(app, supervisor, `/products/${id}`).expect(200)).body.data.name).toBe(name);
    await post(app, supervisor, '/products').send({ sku: randomUUID(), name: name + '\u{1f600}' }).expect(400);
    await post(app, supervisor, '/products').send({ sku: 'A'.repeat(41), name: 'X' }).expect(400);
    await post(app, supervisor, '/products').send({ sku: randomUUID().replaceAll('-', '') + 'B'.repeat(8), name: 'e\u0301'.repeat(60) }).expect(201);
    const reference = '\u{1f600}'.repeat(160);
    const created = await post(app, supervisor, '/receivings').send({ reference: ` ${reference} `, items: [{ productId: id, expectedQuantity: 1 }] }).expect(201);
    expect(created.body.data.reference).toBe(reference);
    await post(app, supervisor, '/receivings').send({ reference: reference + 'x', items: [{ productId: id, expectedQuantity: 1 }] }).expect(400);
    await read(app, supervisor, '/products').query({ q: '\u{1f600}'.repeat(100) }).expect(200);
    await read(app, supervisor, '/inventory').query({ q: '\u{1f600}'.repeat(101) }).expect(400);
    await read(app, supervisor, '/products').query({ q: ' '.repeat(3), page: '1', limit: '100' }).expect(200);
  });
  it('creates OPEN receiving without stock movement, then partial and full receipt with safe DTOs', async () => {
    const { app, operator, doc, products } = await setup(1, 100);
    expect(doc.status).toBe('OPEN'); expect(doc.items[0]?.receivedQuantity).toBe(0);
    expect((await prisma.inventoryBalance.findUniqueOrThrow({ where: { productId: products[0] ?? '' } })).availableQuantity).toBe(0n);
    const first = await receive(app, operator, doc, 40).expect(201);
    expect(first.headers['idempotency-replayed']).toBe('false');
    expect(Object.keys(first.body.data).sort()).toEqual(['id','receivingId','receivedBy','receivedAt','items'].sort());
    const partial = await read(app, operator, `/receivings/${doc.id}`).expect(200);
    expect(partial.body.data.status).toBe('PARTIAL'); expect(partial.body.data.items[0].remainingQuantity).toBe(60);
    const before = await state(doc); expect((await receive(app, operator, doc, 61).expect(409)).body.error.code).toBe('OVER_RECEIPT'); expect(await state(doc)).toBe(before);
    await receive(app, operator, doc, 60).expect(201);
    expect((await read(app, operator, `/receivings/${doc.id}`).expect(200)).body.data.status).toBe('COMPLETED');
    expect((await receive(app, operator, doc, 1).expect(409)).body.error.code).toBe('RECEIVING_COMPLETED');
    const inventory = await read(app, operator, '/inventory').query({ q: (await prisma.product.findUniqueOrThrow({ where: { id: products[0] ?? '' } })).sku }).expect(200);
    expect(inventory.body.data[0].availableQuantity).toBe('100');
    const history = await read(app, operator, '/inventory/transactions').query({ receivingId: doc.id }).expect(200);
    expect(history.body.pagination.total).toBe(2); expect(history.body.data.every((row: { actorId: string }) => row.actorId === operator.id)).toBe(true);
  });
  it('rejects foreign items, malformed quantities, duplicates and client totals without changing state', async () => {
    const { app, operator, doc, products } = await setup(); const other = await document(app, operator, products);
    const before = await state(doc);
    expect((await post(app, operator, `/receivings/${doc.id}/receipts`).set('Idempotency-Key', randomUUID()).send({ items: items(other, 1) }).expect(404)).body.error.code).toBe('RECEIVING_ITEM_NOT_FOUND');
    for (const quantity of [0, -1, 1.5, '1', 1000001]) await post(app, operator, `/receivings/${doc.id}/receipts`).set('Idempotency-Key', randomUUID()).send({ items: [{ receivingItemId: doc.items[0]?.id, quantity }] }).expect(400);
    await post(app, operator, `/receivings/${doc.id}/receipts`).set('Idempotency-Key', randomUUID()).send({ items: [...items(doc, 1), ...items(doc, 2)] }).expect(400);
    await post(app, operator, `/receivings/${doc.id}/receipts`).set('Idempotency-Key', 'invalid').send({ items: items(doc, 1) }).expect(400);
    await post(app, operator, `/receivings/${doc.id}/receipts`).send({ items: items(doc, 1) }).expect(400);
    await post(app, operator, `/receivings/${doc.id}/receipts`).set('Idempotency-Key', randomUUID()).send({ items: items(doc, 1), receivedQuantity: 1 }).expect(400);
    await post(app, operator, '/receivings').send({ items: [{ productId: products[0], expectedQuantity: 1 }, { productId: products[0]?.toUpperCase(), expectedQuantity: 2 }] }).expect(400);
    expect(await state(doc)).toBe(before);
  });
  it('rejects one excessive item atomically and accepts a valid multi-item receipt', async () => {
    const { app, operator, doc } = await setup(2); const before = await state(doc);
    await post(app, operator, `/receivings/${doc.id}/receipts`).set('Idempotency-Key', randomUUID()).send({ items: doc.items.map((item, index) => ({ receivingItemId: item.id, quantity: index ? 11 : 1 })) }).expect(409);
    expect(await state(doc)).toBe(before); await receive(app, operator, doc, 2).expect(201);
    expect((await read(app, operator, `/receivings/${doc.id}`).expect(200)).body.data.items.every((item: Item) => item.receivedQuantity === 2)).toBe(true);
  });
  it('replays final receipt after completion/reordered uppercase payload, and conflicts on actor or quantity changes', async () => {
    const { app, operator, supervisor, doc } = await setup(2); const key = randomUUID();
    const initial = await receive(app, operator, doc, 10, key).expect(201); const before = await state(doc);
    const replay = await post(app, operator, `/receivings/${doc.id.toUpperCase()}/receipts`).set('Idempotency-Key', key.toUpperCase()).send({ items: items(doc, 10).reverse().map(item => ({ ...item, receivingItemId: item.receivingItemId.toUpperCase() })) }).expect(200);
    expect(replay.headers['idempotency-replayed']).toBe('true'); expect(replay.body).toEqual(initial.body); expect(await state(doc)).toBe(before);
    expect((await receive(app, operator, doc, 1, key).expect(409)).body.error.code).toBe('IDEMPOTENCY_CONFLICT');
    expect((await receive(app, supervisor, doc, 10, key).expect(409)).body.error.code).toBe('IDEMPOTENCY_CONFLICT');
    expect(await state(doc)).toBe(before);
  });
  it('supports pagination/filter rules, zero balances and missing-history filters', async () => {
    const { app, operator, products } = await setup();
    const found = await read(app, operator, '/products').query({ page: 1, limit: 1 }).expect(200);
    expect(found.body.data).toHaveLength(1); expect(Object.keys(found.body.pagination).sort()).toEqual(['limit','page','total']);
    await read(app, operator, '/products').query({ unknown: 1 }).expect(400);
    await read(app, operator, '/products').query({ page: 0 }).expect(400);
    await read(app, operator, '/receivings').query({ status: 'INVALID' }).expect(400);
    await read(app, operator, '/receivings').query({ status: 'OPEN' }).expect(200);
    const empty = await read(app, operator, '/inventory/transactions').query({ productId: randomUUID() }).expect(200); expect(empty.body.data).toEqual([]);
    await read(app, operator, '/inventory/transactions').query({ receivingId: 'invalid' }).expect(400);
    const sku = (await prisma.product.findUniqueOrThrow({ where: { id: products[0] ?? '' } })).sku;
    const balances = await read(app, operator, '/inventory').query({ q: sku.toLowerCase() }).expect(200); expect(balances.body.data[0].availableQuantity).toBe('0');
  });
  it('treats SQL LIKE special characters as literal search substrings', async () => {
    const app = context(); const supervisor = await actor(app, 'SUPERVISOR'); const stem = randomUUID();
    const wanted = await product(app, supervisor, `${stem}%_Z`);
    await product(app, supervisor, `${stem}XXZ`);
    for (const path of ['/products','/inventory']) {
      const result = await read(app, supervisor, path).query({ q: `${stem}%_Z` }).expect(200);
      expect(result.body.data).toHaveLength(1);
      expect(String(result.body.data[0].id ?? result.body.data[0].productId)).toBe(wanted);
    }
  });
  it('allows subset receipts and replays an earlier immutable receipt after later operations', async () => {
    const { app, operator, doc } = await setup(2); const key = randomUUID();
    const firstItem = doc.items[0]; const secondItem = doc.items[1];
    if (!firstItem || !secondItem) throw new Error('Expected two items.');
    const body = { items: [{ receivingItemId: firstItem.id, quantity: 10 }] };
    const first = await post(app, operator, `/receivings/${doc.id}/receipts`).set('Idempotency-Key', key).send(body).expect(201);
    const partial = await read(app, operator, `/receivings/${doc.id}`).expect(200);
    expect(partial.body.data.status).toBe('PARTIAL');
    await post(app, operator, `/receivings/${doc.id}/receipts`).set('Idempotency-Key', randomUUID()).send({ items: [{ receivingItemId: secondItem.id, quantity: 10 }] }).expect(201);
    const before = await state(doc);
    expect((await post(app, operator, `/receivings/${doc.id}/receipts`).set('Idempotency-Key', key).send(body).expect(200)).body).toEqual(first.body);
    expect(await state(doc)).toBe(before);
  });
  it('enforces receiving item count/ranges and CSRF without trusting client state', async () => {
    const { app, operator, products, doc } = await setup(); const before = await state(doc);
    for (const input of [{ items: [] }, { items: [{ productId: products[0], expectedQuantity: '1' }] }, { items: [{ productId: products[0], expectedQuantity: 1000001 }] }, { items: [{ productId: products[0], expectedQuantity: 1 }], status: 'COMPLETED' }]) {
      await post(app, operator, '/receivings').send(input).expect(400);
    }
    await post(app, operator, '/receivings').send({ items: Array.from({ length: 51 }, () => ({ productId: randomUUID(), expectedQuantity: 1 })) }).expect(400);
    await request(app).post(`/api/v1/receivings/${doc.id}/receipts`).set('Cookie', operator.sid).set('Origin', environment.APP_ORIGIN).set('Idempotency-Key', randomUUID()).send({ items: items(doc, 1) }).expect(403);
    await request(app).post('/api/v1/receivings').set('Cookie', operator.sid).set('X-CSRF-Token', operator.token).send({ items: [{ productId: products[0], expectedQuantity: 1 }] }).expect(403);
    expect(await state(doc)).toBe(before);
  });
  it('fails closed on Redis loss for all business read routes', async () => {
    const down = createRedis(environment.REDIS_URL); await down.connect();
    const app = createApp({ checkReadiness: async () => {}, security: { environment: { ...environment, REDIS_NAMESPACE: `${environment.REDIS_NAMESPACE}:${randomUUID()}` }, prisma, redis: down } });
    const operator = await actor(app); down.destroy();
    for (const path of ['/products','/receivings','/inventory','/inventory/transactions']) {
      expect((await read(app, operator, path).expect(503)).body.error.code).toBe('DEPENDENCY_UNAVAILABLE');
    }
  });
  it('preserves per-user limiting and authVersion revocation for new endpoints', async () => {
    const app = context({ global: 300, loginIp: 10, loginPair: 5, user: 1 }); const user = await actor(app);
    await read(app, user, '/products').expect(200); const limited = await read(app, user, '/inventory').expect(429); expect(Number(limited.headers['retry-after'])).toBeGreaterThan(0);
    const normal = context(); const operator = await actor(normal);
    await prisma.user.update({ where: { id: operator.id }, data: { authVersion: { increment: 1 } } });
    try { await read(normal, operator, '/receivings').expect(401); }
    finally { await prisma.user.update({ where: { id: operator.id }, data: { authVersion: 1 } }); }
  });
});

describe('real transaction concurrency and snapshot isolation', () => {
  it('serializes concurrent same-key HTTP requests into one receipt and one stock increment', async () => {
    const { app, operator, doc } = await setup(); const key = randomUUID();
    const results = await Promise.all([receive(app, operator, doc, 4, key), receive(app, operator, doc, 4, key)]);
    expect(results.map(result => result.status).sort()).toEqual([200,201]); expect(results[0]?.body).toEqual(results[1]?.body);
    expect(await prisma.receipt.count({ where: { receivingId: doc.id } })).toBe(1);
    expect((await prisma.receivingItem.findUniqueOrThrow({ where: { id: doc.items[0]?.id ?? '' } })).receivedQuantity).toBe(4);
  });
  it('rejects one concurrent distinct-key 7+7 operation when expected is 10', async () => {
    const { app, operator, doc } = await setup();
    const results = await Promise.all([receive(app, operator, doc, 7), receive(app, operator, doc, 7)]);
    expect(results.map(result => result.status).sort()).toEqual([201,409]);
    expect((await prisma.receivingItem.findUniqueOrThrow({ where: { id: doc.items[0]?.id ?? '' } })).receivedQuantity).toBe(7);
  });
  it('accepts concurrent distinct-key 4+6 operations and completes exactly once', async () => {
    const { app, operator, doc } = await setup();
    const results = await Promise.all([receive(app, operator, doc, 4), receive(app, operator, doc, 6)]);
    expect(results.map(result => result.status)).toEqual([201,201]);
    expect((await prisma.receiving.findUniqueOrThrow({ where: { id: doc.id } })).status).toBe('COMPLETED');
  });
  it('maintains shared-product balances across documents with opposite payload order', async () => {
    const { app, operator, doc, products } = await setup(2); const second = await document(app, operator, [...products].reverse());
    const key = randomUUID();
    const results = await Promise.all([receive(app, operator, doc, 4, key), receive(app, operator, second, 6, key)]);
    expect(results.map(result => result.status)).toEqual([201,201]);
    expect(results[0]?.body.data.id === results[1]?.body.data.id).toBe(false);
    for (const productId of products) expect((await prisma.inventoryBalance.findUniqueOrThrow({ where: { productId } })).availableQuantity).toBe(10n);
  });
  it('rolls back an actual PostgreSQL failure after receipt, counters and ledger writes', async () => {
    const { operator, doc } = await setup(2); const before = await state(doc);
    const repository = createReceivingsRepository(); const original = repository.incrementBalance; let writesObserved = false; let calls = 0;
    vi.spyOn(repository, 'incrementBalance').mockImplementation(async (tx, productId, quantity) => {
      calls++;
      if (calls === 2) {
        writesObserved = await tx.receipt.count({ where: { receivingId: doc.id } }) === 1 && await tx.inventoryTransaction.count({ where: { receivingId: doc.id } }) === 2;
        await tx.$executeRaw`UPDATE inventory_balances SET available_quantity=-1 WHERE product_id=${productId}::uuid`;
      }
      return original(tx, productId, quantity);
    });
    await expect(createReceivingsService(prisma, repository).receive(doc.id, operator.id, randomUUID(), { items: items(doc, 3) })).rejects.toMatchObject({ status: 503, code: 'DEPENDENCY_UNAVAILABLE' });
    expect(writesObserved).toBe(true); expect(calls).toBe(2); expect(await state(doc)).toBe(before);
  });
  it('uses one REPEATABLE READ snapshot when a receipt commits between header and item SELECTs', async () => {
    const { operator, doc } = await setup(); const repository = createReceivingsRepository(); const header = repository.header;
    let release: (() => void) | undefined; let observed: (() => void) | undefined;
    const paused = new Promise<void>(resolve => { observed = resolve; });
    const resume = new Promise<void>(resolve => { release = resolve; });
    let isolation = ''; let readOnly = ''; let txUsed: Prisma.TransactionClient | undefined;
    vi.spyOn(repository, 'header').mockImplementation(async (tx, id) => {
      txUsed = tx;
      isolation = (await tx.$queryRaw<Array<{ transaction_isolation: string }>>`SHOW transaction_isolation`)[0]?.transaction_isolation ?? '';
      readOnly = (await tx.$queryRaw<Array<{ transaction_read_only: string }>>`SHOW transaction_read_only`)[0]?.transaction_read_only ?? '';
      const result = await header(tx, id); observed?.(); await resume; return result;
    });
    const originalItems = repository.detailItems;
    vi.spyOn(repository, 'detailItems').mockImplementation((tx, id) => { expect(tx === txUsed).toBe(true); return originalItems(tx, id); });
    const pending = createReceivingsService(prisma, repository).detail(doc.id);
    await paused;
    try { await createReceivingsService(prisma).receive(doc.id, operator.id, randomUUID(), { items: items(doc, 10) }); }
    finally { release?.(); }
    const old = await pending;
    expect(isolation).toBe('repeatable read'); expect(readOnly).toBe('on'); expect(old.status).toBe('OPEN'); expect(old.items[0]?.receivedQuantity).toBe(0);
    const fresh = await createReceivingsService(prisma).detail(doc.id); expect(fresh.status).toBe('COMPLETED'); expect(fresh.items[0]?.receivedQuantity).toBe(10);
  });
  it('returns controlled dependency errors from each business service when PostgreSQL is unavailable', async () => {
    const badUrl = new URL(environment.DATABASE_URL); badUrl.port = '1'; const bad = createPrisma(badUrl.toString());
    try {
      for (const operation of [() => createProductsService(bad).detail(randomUUID()), () => createReceivingsService(bad).detail(randomUUID()), () => createInventoryService(bad).balances({ page: 1, limit: 20 })]) await expect(operation()).rejects.toMatchObject({ status: 503 });
    } finally { await bad.$disconnect(); }
  });
});
