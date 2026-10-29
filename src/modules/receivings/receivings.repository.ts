import type { Prisma } from '../../generated/prisma/client.js';
import { offset } from '../../common/validation/input.js';
import type { CreateReceiving, ReceivingQuery } from './receivings.schema.js';

export function createReceivingsRepository() {
  return {
    header: async (db: Prisma.TransactionClient, id: string) => db.receiving.findUnique({ where: { id } }),
    detailItems: (db: Prisma.TransactionClient, id: string) => db.receivingItem.findMany({ where: { receivingId: id }, include: { product: true }, orderBy: { id: 'asc' } }),
    list: (db: Prisma.TransactionClient, query: ReceivingQuery) => db.receiving.findMany({ where: query.status ? { status: query.status } : {}, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], ...offset(query) }),
    count: (db: Prisma.TransactionClient, query: ReceivingQuery) => db.receiving.count({ where: query.status ? { status: query.status } : {} }),
    products: (db: Prisma.TransactionClient, ids: string[]) => db.product.findMany({ where: { id: { in: ids } }, select: { id: true } }),
    create: (db: Prisma.TransactionClient, id: string, actorId: string, input: CreateReceiving) => db.receiving.create({ data: {
      id, number: `RCV-${id.toUpperCase()}`, reference: input.reference, createdBy: actorId, items: { create: input.items }
    } }),
    lockReceiving: (db: Prisma.TransactionClient, id: string) => db.$queryRaw<Array<{ id: string }>>`SELECT id FROM receivings WHERE id = ${id}::uuid FOR UPDATE`,
    lockItems: (db: Prisma.TransactionClient, id: string) => db.$queryRaw<Array<{ id: string }>>`SELECT id FROM receiving_items WHERE receiving_id = ${id}::uuid ORDER BY id FOR UPDATE`,
    receipt: (db: Prisma.TransactionClient, receivingId: string, idempotencyKey: string) => db.receipt.findUnique({
      where: { receivingId_idempotencyKey: { receivingId, idempotencyKey } },
      include: { transactions: { orderBy: { receivingItemId: 'asc' } } }
    }),
    createReceipt: (db: Prisma.TransactionClient, receivingId: string, actorId: string, idempotencyKey: string, payloadHash: string) => db.receipt.create({ data: { receivingId, actorId, idempotencyKey, payloadHash } }),
    incrementItem: (db: Prisma.TransactionClient, id: string, quantity: number) => db.receivingItem.update({ where: { id }, data: { receivedQuantity: { increment: quantity } } }),
    ledger: (db: Prisma.TransactionClient, data: { receiptId: string; receivingId: string; receivingItemId: string; productId: string; quantity: number }) => db.inventoryTransaction.create({ data }),
    incrementBalance: async (db: Prisma.TransactionClient, productId: string, quantity: number) => db.inventoryBalance.update({ where: { productId }, data: { availableQuantity: { increment: quantity } } }),
    updateStatus: (db: Prisma.TransactionClient, id: string, status: 'PARTIAL' | 'COMPLETED') => db.receiving.update({ where: { id }, data: { status } })
  };
}
export type ReceivingsRepository = ReturnType<typeof createReceivingsRepository>;
