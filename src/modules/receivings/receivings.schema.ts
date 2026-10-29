import { z } from "zod";
import { pagination, text, uuid } from "../../common/validation/input.js";

const quantity = z.number().int().min(1).max(1000000);
export const receivingQuery = z.strictObject({
  ...pagination,
  status: z.enum(["OPEN", "PARTIAL", "COMPLETED"]).optional(),
});
export const createReceivingSchema = z
  .strictObject({
    reference: text(0, 160).default(""),
    items: z
      .array(z.strictObject({ productId: uuid, expectedQuantity: quantity }))
      .min(1)
      .max(50),
  })
  .refine(
    (value) =>
      new Set(value.items.map((item) => item.productId)).size ===
      value.items.length,
    "Duplicate product IDs.",
  );
export const receiptSchema = z
  .strictObject({
    items: z
      .array(z.strictObject({ receivingItemId: uuid, quantity }))
      .min(1)
      .max(50),
  })
  .refine(
    (value) =>
      new Set(value.items.map((item) => item.receivingItemId)).size ===
      value.items.length,
    "Duplicate receiving item IDs.",
  );
export type ReceivingQuery = z.output<typeof receivingQuery>;
export type CreateReceiving = z.output<typeof createReceivingSchema>;
export type ReceiveItems = z.output<typeof receiptSchema>;
