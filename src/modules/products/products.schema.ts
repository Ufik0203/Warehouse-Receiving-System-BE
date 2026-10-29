import { z } from "zod";
import { text, pagination } from "../../common/validation/input.js";

export const createProductSchema = z.strictObject({
  sku: z
    .string()
    .trim()
    .toUpperCase()
    .pipe(
      z
        .string()
        .min(1)
        .max(40)
        .regex(/^[A-Z0-9_-]+$/),
    ),
  name: text(1, 120),
});
export type CreateProduct = z.output<typeof createProductSchema>;
export const updateProductSchema = createProductSchema
  .partial()
  .refine(
    (value) => value.sku !== undefined || value.name !== undefined,
    "At least one field is required.",
  );
export type UpdateProduct = z.output<typeof updateProductSchema>;
export const productHistoryQuery = z.strictObject(pagination);
export type ProductHistoryQuery = z.output<typeof productHistoryQuery>;
