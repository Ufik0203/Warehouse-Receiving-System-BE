import { z } from "zod";
import { AppError } from "../errors/app-error.js";

export function parseInput<S extends z.ZodType>(
  schema: S,
  input: unknown,
): z.output<S> {
  const result = schema.safeParse(input);
  if (!result.success)
    throw new AppError(400, "VALIDATION_ERROR", "Invalid request input.");
  return result.data;
}
export const uuid = z.uuid().transform((value) => value.toLowerCase());
export const idParams = z.strictObject({ id: uuid });
export const emptyQuery = z.strictObject({});
export const text = (min: number, max: number) =>
  z
    .string()
    .trim()
    .refine((value) => {
      const count = [...value].length;
      return count >= min && count <= max;
    }, "Text length is outside the permitted Unicode code point range.");
const queryInteger = (max: number) =>
  z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .pipe(z.number().int().min(1).max(max));
export const pagination = {
  page: queryInteger(1000000).default(1),
  limit: queryInteger(100).default(20),
};
export const searchQuery = z.strictObject({
  ...pagination,
  q: text(0, 100).optional(),
});
export type SearchQuery = z.output<typeof searchQuery>;
export const offset = (query: { page: number; limit: number }) => ({
  skip: (query.page - 1) * query.limit,
  take: query.limit,
});
export const paginated = <T>(
  data: T[],
  total: number,
  query: { page: number; limit: number },
) => ({ data, pagination: { page: query.page, limit: query.limit, total } });
