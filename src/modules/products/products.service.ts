import { Prisma, type PrismaClient } from "../../generated/prisma/client.js";
import { AppError } from "../../common/errors/app-error.js";
import { databaseOperation } from "../../common/errors/database-operation.js";
import { paginated, type SearchQuery } from "../../common/validation/input.js";
import { createProductsRepository } from "./products.repository.js";
import { mapProduct, mapProductHistory } from "./products.mapper.js";
import type {
  CreateProduct,
  UpdateProduct,
  ProductHistoryQuery,
} from "./products.schema.js";

export function createProductsService(
  prisma: PrismaClient,
  repository = createProductsRepository(),
) {
  return {
    list: (query: SearchQuery) =>
      databaseOperation(() =>
        prisma.$transaction(
          async (tx) =>
            paginated(
              (await repository.list(tx, query)).map(mapProduct),
              await repository.count(tx, query),
              { page: query.page, limit: query.limit },
            ),
          { isolationLevel: "RepeatableRead" },
        ),
      ),
    detail: (id: string) =>
      databaseOperation(async () => {
        const row = await repository.byId(prisma, id);
        if (!row)
          throw new AppError(404, "PRODUCT_NOT_FOUND", "Product not found.");
        return mapProduct(row);
      }),
    history: (id: string, query: ProductHistoryQuery) =>
      databaseOperation(() =>
        prisma.$transaction(
          async (tx) => {
            if (!(await repository.byId(tx, id)))
              throw new AppError(
                404,
                "PRODUCT_NOT_FOUND",
                "Product not found.",
              );
            return paginated(
              (await repository.history(tx, id, query)).map(mapProductHistory),
              await repository.historyCount(tx, id),
              query,
            );
          },
          { isolationLevel: "RepeatableRead" },
        ),
      ),
    update: (id: string, input: UpdateProduct, actorId: string) =>
      databaseOperation(async () => {
        try {
          return await prisma.$transaction(
            async (tx) => {
              const locked = await repository.lock(tx, id);
              if (!locked.length)
                throw new AppError(
                  404,
                  "PRODUCT_NOT_FOUND",
                  "Product not found.",
                );
              const before = await repository.byId(tx, id);
              if (!before)
                throw new AppError(
                  404,
                  "PRODUCT_NOT_FOUND",
                  "Product not found.",
                );
              const sku = input.sku ?? before.sku;
              const name = input.name ?? before.name;
              if (sku === before.sku && name === before.name)
                return mapProduct(before);
              const actor = await repository.actor(tx, actorId);
              if (!actor)
                throw new AppError(
                  401,
                  "UNAUTHENTICATED",
                  "Authentication required.",
                );
              const after = await repository.update(tx, id, input);
              await repository.addHistory(tx, {
                productId: id,
                actorId: actor.id,
                actorName: actor.name,
                beforeSku: before.sku,
                afterSku: after.sku,
                beforeName: before.name,
                afterName: after.name,
              });
              return mapProduct(after);
            },
            { isolationLevel: "ReadCommitted" },
          );
        } catch (error: unknown) {
          if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === "P2002")
              throw new AppError(
                409,
                "SKU_ALREADY_EXISTS",
                "SKU already exists.",
              );
            if (error.code === "P2025")
              throw new AppError(
                404,
                "PRODUCT_NOT_FOUND",
                "Product not found.",
              );
          }
          throw error;
        }
      }),
    create: (input: CreateProduct) =>
      databaseOperation(async () => {
        try {
          return await prisma.$transaction(async (tx) =>
            mapProduct(await repository.create(tx, input)),
          );
        } catch (error: unknown) {
          if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002"
          )
            throw new AppError(
              409,
              "SKU_ALREADY_EXISTS",
              "SKU already exists.",
            );
          throw error;
        }
      }),
  };
}
export type ProductsService = ReturnType<typeof createProductsService>;
