import { Prisma, type PrismaClient } from '../../generated/prisma/client.js';
import { AppError } from '../../common/errors/app-error.js';
import { databaseOperation } from '../../common/errors/database-operation.js';
import { paginated, type SearchQuery } from '../../common/validation/input.js';
import { createProductsRepository } from './products.repository.js';
import { mapProduct } from './products.mapper.js';
import type { CreateProduct } from './products.schema.js';

export function createProductsService(prisma: PrismaClient) {
  const repository = createProductsRepository();
  return {
    list: (query: SearchQuery) => databaseOperation(() => prisma.$transaction(async tx => paginated(
      (await repository.list(tx, query)).map(mapProduct), await repository.count(tx, query), { page: query.page, limit: query.limit }
    ), { isolationLevel: 'RepeatableRead' })),
    detail: (id: string) => databaseOperation(async () => {
      const row = await repository.byId(prisma, id);
      if (!row) throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product not found.');
      return mapProduct(row);
    }),
    create: (input: CreateProduct) => databaseOperation(async () => {
      try { return await prisma.$transaction(async tx => mapProduct(await repository.create(tx, input))); }
      catch (error: unknown) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new AppError(409, 'SKU_ALREADY_EXISTS', 'SKU already exists.');
        throw error;
      }
    })
  };
}
export type ProductsService = ReturnType<typeof createProductsService>;
