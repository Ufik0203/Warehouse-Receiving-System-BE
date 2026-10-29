import type { Prisma } from "../../generated/prisma/client.js";
import { offset, type SearchQuery } from "../../common/validation/input.js";
import { productWhere } from "../products/products.repository.js";
import type { HistoryQuery } from "./inventory.schema.js";

const historyWhere = (
  query: HistoryQuery,
): Prisma.InventoryTransactionWhereInput => ({
  ...(query.productId ? { productId: query.productId } : {}),
  ...(query.receivingId ? { receivingId: query.receivingId } : {}),
});

export function createInventoryRepository() {
  return {
    balances: (db: Prisma.TransactionClient, query: SearchQuery) =>
      db.inventoryBalance.findMany({
        where: { product: productWhere(query) },
        include: { product: true },
        orderBy: [{ product: { sku: "asc" } }, { productId: "asc" }],
        ...offset(query),
      }),
    balanceCount: (db: Prisma.TransactionClient, query: SearchQuery) =>
      db.inventoryBalance.count({ where: { product: productWhere(query) } }),
    history: (db: Prisma.TransactionClient, query: HistoryQuery) =>
      db.inventoryTransaction.findMany({
        where: historyWhere(query),
        ...offset(query),
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        include: {
          product: true,
          receiving: true,
          receipt: { include: { actor: { select: { id: true, name: true } } } },
        },
      }),
    historyCount: (db: Prisma.TransactionClient, query: HistoryQuery) =>
      db.inventoryTransaction.count({ where: historyWhere(query) }),
  };
}
