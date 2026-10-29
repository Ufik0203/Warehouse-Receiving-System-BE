import { randomUUID, createHash } from "node:crypto";
import type { PrismaClient } from "../../generated/prisma/client.js";
import { AppError } from "../../common/errors/app-error.js";
import { databaseOperation } from "../../common/errors/database-operation.js";
import { paginated } from "../../common/validation/input.js";
import { createReceivingsRepository } from "./receivings.repository.js";
import {
  mapReceiving,
  mapReceivingDetail,
  mapReceipt,
} from "./receivings.mapper.js";
import type {
  CreateReceiving,
  ReceiveItems,
  ReceivingQuery,
} from "./receivings.schema.js";

export function canonicalReceipt(
  receivingId: string,
  actorId: string,
  input: ReceiveItems,
) {
  const items = input.items
    .map((item) => ({
      receivingItemId: item.receivingItemId.toLowerCase(),
      quantity: item.quantity,
    }))
    .sort((a, b) => a.receivingItemId.localeCompare(b.receivingItemId));
  const payloadHash = createHash("sha256")
    .update(
      JSON.stringify({
        receivingId: receivingId.toLowerCase(),
        actorId: actorId.toLowerCase(),
        items,
      }),
    )
    .digest("hex");
  return { items, payloadHash };
}
const missing = () =>
  new AppError(404, "RECEIVING_NOT_FOUND", "Receiving not found.");
export function createReceivingsService(
  prisma: PrismaClient,
  repository = createReceivingsRepository(),
) {
  return {
    list: (query: ReceivingQuery) =>
      databaseOperation(() =>
        prisma.$transaction(
          async (tx) =>
            paginated(
              (await repository.list(tx, query)).map(mapReceiving),
              await repository.count(tx, query),
              { page: query.page, limit: query.limit },
            ),
          { isolationLevel: "RepeatableRead" },
        ),
      ),
    detail: (id: string) =>
      databaseOperation(() =>
        prisma.$transaction(
          async (tx) => {
            await tx.$executeRaw`SET TRANSACTION READ ONLY`;
            const header = await repository.header(tx, id);
            if (!header) throw missing();
            return mapReceivingDetail(
              header,
              await repository.detailItems(tx, id),
            );
          },
          { isolationLevel: "RepeatableRead" },
        ),
      ),
    create: (actorId: string, input: CreateReceiving) =>
      databaseOperation(() =>
        prisma.$transaction(async (tx) => {
          const products = await repository.products(
            tx,
            input.items.map((item) => item.productId),
          );
          if (products.length !== input.items.length)
            throw new AppError(
              404,
              "PRODUCT_NOT_FOUND",
              "Referenced product not found.",
            );
          const header = await repository.create(
            tx,
            randomUUID(),
            actorId,
            input,
          );
          return mapReceivingDetail(
            header,
            await repository.detailItems(tx, header.id),
          );
        }),
      ),
    receive: (
      receivingId: string,
      actorId: string,
      key: string,
      input: ReceiveItems,
    ) => {
      const canonical = canonicalReceipt(receivingId, actorId, input);
      return databaseOperation(() =>
        prisma.$transaction(
          async (tx) => {
            if (!(await repository.lockReceiving(tx, receivingId)).length)
              throw missing();
            const existing = await repository.receipt(tx, receivingId, key);
            if (existing) {
              if (
                existing.payloadHash !== canonical.payloadHash ||
                existing.actorId !== actorId
              )
                throw new AppError(
                  409,
                  "IDEMPOTENCY_CONFLICT",
                  "Idempotency key already belongs to another operation.",
                );
              return { receipt: mapReceipt(existing), replayed: true };
            }
            const header = await repository.header(tx, receivingId);
            if (!header) throw missing();
            if (header.status === "COMPLETED")
              throw new AppError(
                409,
                "RECEIVING_COMPLETED",
                "Receiving is completed.",
              );
            await repository.lockItems(tx, receivingId);
            const allItems = await repository.detailItems(tx, receivingId);
            const byId = new Map(allItems.map((item) => [item.id, item]));
            for (const item of canonical.items) {
              const stored = byId.get(item.receivingItemId);
              if (!stored)
                throw new AppError(
                  404,
                  "RECEIVING_ITEM_NOT_FOUND",
                  "Receiving item not found in document.",
                );
              if (
                item.quantity >
                stored.expectedQuantity - stored.receivedQuantity
              )
                throw new AppError(
                  409,
                  "OVER_RECEIPT",
                  "Quantity exceeds remaining.",
                );
            }
            const receipt = await repository.createReceipt(
              tx,
              receivingId,
              actorId,
              key,
              canonical.payloadHash,
            );
            const balances: Array<{ productId: string; quantity: number }> = [];
            for (const item of canonical.items) {
              const stored = byId.get(item.receivingItemId);
              if (!stored) throw new Error("Validated item missing.");
              await repository.incrementItem(tx, stored.id, item.quantity);
              await repository.ledger(tx, {
                receiptId: receipt.id,
                receivingId,
                receivingItemId: stored.id,
                productId: stored.productId,
                quantity: item.quantity,
              });
              balances.push({
                productId: stored.productId,
                quantity: item.quantity,
              });
              stored.receivedQuantity += item.quantity;
            }
            for (const balance of balances.sort((a, b) =>
              a.productId.localeCompare(b.productId),
            ))
              await repository.incrementBalance(
                tx,
                balance.productId,
                balance.quantity,
              );
            await repository.updateStatus(
              tx,
              receivingId,
              allItems.every(
                (item) => item.receivedQuantity === item.expectedQuantity,
              )
                ? "COMPLETED"
                : "PARTIAL",
            );
            const result = await repository.receipt(tx, receivingId, key);
            if (!result) throw new Error("Inserted receipt missing.");
            return { receipt: mapReceipt(result), replayed: false };
          },
          { isolationLevel: "ReadCommitted", maxWait: 5000, timeout: 10000 },
        ),
      );
    },
  };
}
export type ReceivingsService = ReturnType<typeof createReceivingsService>;
