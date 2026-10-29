import type { Prisma } from '../../generated/prisma/client.js';
type Balance = Prisma.InventoryBalanceGetPayload<{ include: { product: true } }>;
type Movement = Prisma.InventoryTransactionGetPayload<{ include: { product: true; receiving: true; receipt: { include: { actor: { select: { id: true; name: true } } } } } }>;
export function mapBalance(row: Balance) {
  return { productId: row.productId, sku: row.product.sku, productName: row.product.name, unit: 'pcs' as const, availableQuantity: row.availableQuantity.toString(), updatedAt: row.updatedAt.toISOString() };
}
export function mapMovement(row: Movement) {
  return { id: row.id, receiptId: row.receiptId, receivingId: row.receivingId, receivingNumber: row.receiving.number,
    receivingItemId: row.receivingItemId, productId: row.productId, sku: row.product.sku, productName: row.product.name,
    quantity: row.quantity, actorId: row.receipt.actor.id, actorName: row.receipt.actor.name, createdAt: row.createdAt.toISOString() };
}
