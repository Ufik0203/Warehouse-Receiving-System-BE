import type { Prisma } from '../../generated/prisma/client.js';
import { offset, type SearchQuery } from '../../common/validation/input.js';
import type { CreateProduct } from './products.schema.js';

export function productWhere(query: SearchQuery): Prisma.ProductWhereInput {
  // q is a literal substring, not a client-supplied SQL LIKE pattern.
  const needle = query.q?.replace(/[\\%_]/g, '\\$&');
  return needle ? { OR: [{ sku: { contains: needle, mode: 'insensitive' } }, { name: { contains: needle, mode: 'insensitive' } }] } : {};
}
export function createProductsRepository() {
  return {
    byId: (db: Prisma.TransactionClient, id: string) => db.product.findUnique({ where: { id } }),
    list: (db: Prisma.TransactionClient, query: SearchQuery) => db.product.findMany({ where: productWhere(query), orderBy: [{ sku: 'asc' }, { id: 'asc' }], ...offset(query) }),
    count: (db: Prisma.TransactionClient, query: SearchQuery) => db.product.count({ where: productWhere(query) }),
    create: (db: Prisma.TransactionClient, input: CreateProduct) => db.product.create({ data: { ...input, balance: { create: {} } } })
  };
}
