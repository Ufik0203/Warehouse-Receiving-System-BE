import type { Prisma, Receiving } from "../../generated/prisma/client.js";
type DetailItem = Prisma.ReceivingItemGetPayload<{
  include: { product: true };
}>;
type StoredReceipt = Prisma.ReceiptGetPayload<{
  include: { transactions: true };
}>;

export function mapReceiving(row: Receiving) {
  return {
    id: row.id,
    number: row.number,
    reference: row.reference,
    status: row.status,
    createdBy: row.createdBy,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
export function mapReceivingDetail(row: Receiving, items: DetailItem[]) {
  return {
    ...mapReceiving(row),
    items: items.map((item) => ({
      id: item.id,
      productId: item.productId,
      sku: item.product.sku,
      productName: item.product.name,
      expectedQuantity: item.expectedQuantity,
      receivedQuantity: item.receivedQuantity,
      remainingQuantity: item.expectedQuantity - item.receivedQuantity,
    })),
  };
}
export function mapReceipt(row: StoredReceipt) {
  return {
    id: row.id,
    receivingId: row.receivingId,
    receivedBy: row.actorId,
    receivedAt: row.receivedAt.toISOString(),
    items: row.transactions.map((item) => ({
      receivingItemId: item.receivingItemId,
      productId: item.productId,
      quantity: item.quantity,
    })),
  };
}
