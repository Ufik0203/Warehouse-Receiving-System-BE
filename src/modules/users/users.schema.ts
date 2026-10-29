import { z } from "zod";
import { pagination, text } from "../../common/validation/input.js";

const role = z.enum(["OPERATOR", "SUPERVISOR"]);
const queryBoolean = z
  .enum(["true", "false"])
  .transform((value) => value === "true");
export const usersQuery = z.strictObject({
  ...pagination,
  role: role.optional(),
  isActive: queryBoolean.optional(),
  includeDeleted: queryBoolean.default(false),
});
export const createUserSchema = z.strictObject({
  name: text(1, 120),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email())
    .refine((value) => [...value].length <= 254),
  password: z
    .string()
    .refine((value) => [...value].length >= 12 && [...value].length <= 128),
  role,
});
export const updateUserSchema = z
  .strictObject({
    name: text(1, 120).optional(),
    role: role.optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (value) => Object.values(value).some((field) => field !== undefined),
    "At least one field is required.",
  );
export type UsersQuery = z.output<typeof usersQuery>;
export type CreateUser = z.output<typeof createUserSchema>;
export type UpdateUser = z.output<typeof updateUserSchema>;
