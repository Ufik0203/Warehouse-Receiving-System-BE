import type { Prisma } from "../../generated/prisma/client.js";
import { offset, type SearchQuery } from "../../common/validation/input.js";
import type {
  CreateProduct,
  UpdateProduct,
  ProductHistoryQuery,
} from "./products.schema.js";

export function productWhere(query: SearchQuery): Prisma.ProductWhereInput {
  // q is a literal substring, not a client-supplied SQL LIKE pattern.
  const needle = query.q?.replace(/[\\%_]/g, "\\$&");
  return needle
    ? {
        OR: [
          { sku: { contains: needle, mode: "insensitive" } },
          { name: { contains: needle, mode: "insensitive" } },
        ],
      }
    : {};
}

export function createProductsRepository() {
  return {
    lock: (db: Prisma.TransactionClient, id: string) =>
      db.$queryRaw<
        Array<{ id: string }>
      >`SELECT id FROM products WHERE id = ${id}::uuid FOR UPDATE`,
    actor: (db: Prisma.TransactionClient, id: string) =>
      db.user.findUnique({ where: { id }, select: { id: true, name: true } }),
    addHistory: async (
      db: Prisma.TransactionClient,
      data: Prisma.ProductEditHistoryUncheckedCreateInput,
    ) => db.productEditHistory.create({ data }),
    history: (
      db: Prisma.TransactionClient,
      productId: string,
      query: ProductHistoryQuery,
    ) =>
      db.productEditHistory.findMany({
        where: { productId },
        orderBy: [{ changedAt: "desc" }, { id: "desc" }],
        ...offset(query),
      }),
    historyCount: (db: Prisma.TransactionClient, productId: string) =>
      db.productEditHistory.count({ where: { productId } }),
    byId: (db: Prisma.TransactionClient, id: string) =>
      db.product.findUnique({ where: { id } }),
    list: (db: Prisma.TransactionClient, query: SearchQuery) =>
      db.product.findMany({
        where: productWhere(query),
        orderBy: [{ sku: "asc" }, { id: "asc" }],
        ...offset(query),
      }),
    count: (db: Prisma.TransactionClient, query: SearchQuery) =>
      db.product.count({ where: productWhere(query) }),
    create: (db: Prisma.TransactionClient, input: CreateProduct) =>
      db.product.create({ data: { ...input, balance: { create: {} } } }),
    update: (db: Prisma.TransactionClient, id: string, input: UpdateProduct) =>
      db.product.update({
        where: { id },
        data: {
          ...(input.sku !== undefined ? { sku: input.sku } : {}),
          ...(input.name !== undefined ? { name: input.name } : {}),
        },
      }),
  };
}
