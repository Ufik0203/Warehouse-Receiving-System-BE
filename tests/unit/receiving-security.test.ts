import { describe, expect, it } from 'vitest';
import { Prisma } from '../../src/generated/prisma/client.js';
import { databaseOperation } from '../../src/common/errors/database-operation.js';
import { canonicalReceipt } from '../../src/modules/receivings/receivings.service.js';
import { randomUUID } from 'node:crypto';

describe('receipt canonicalization and safe transaction retry errors', () => {
  it('normalizes identity and item permutation while preserving actor and quantity distinctions', () => {
    const receiving = randomUUID(); const actor = randomUUID(); const a = randomUUID(); const b = randomUUID();
    const first = canonicalReceipt(receiving, actor, { items: [{ receivingItemId: a, quantity: 1 }, { receivingItemId: b, quantity: 2 }] });
    const second = canonicalReceipt(receiving.toUpperCase(), actor.toUpperCase(), { items: [{ receivingItemId: b.toUpperCase(), quantity: 2 }, { receivingItemId: a.toUpperCase(), quantity: 1 }] });
    expect(first).toEqual(second);
    expect(canonicalReceipt(receiving, randomUUID(), { items: first.items }).payloadHash).not.toBe(first.payloadHash);
    expect(canonicalReceipt(receiving, actor, { items: [{ receivingItemId: a, quantity: 2 }, { receivingItemId: b, quantity: 2 }] }).payloadHash).not.toBe(first.payloadHash);
  });
  it('maps aborted deadlock, serialization and lock timeout to controlled retry without raw database detail', async () => {
    for (const code of ['40P01', '40001', '55P03']) {
      const failure = new Prisma.PrismaClientKnownRequestError('private SQL detail', { code: 'P2010', clientVersion: '7.10.1', meta: { code } });
      await expect(databaseOperation(async () => { throw failure; })).rejects.toMatchObject({ status: 503, code: 'TRANSACTION_RETRY_REQUIRED', message: 'Transaction must be retried.' });
    }
  });
  it('preserves unexpected programming errors for the generic 500 handler', async () => {
    const failure = new Error('internal detail');
    await expect(databaseOperation(async () => { throw failure; })).rejects.toBe(failure);
  });
});
