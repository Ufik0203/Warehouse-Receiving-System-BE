import { z } from "zod";

export const loginSchema = z.strictObject({
  email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
  password: z
    .string()
    .refine(
      (value) => [...value].length >= 1 && [...value].length <= 128,
      "Password must contain 1-128 Unicode code points.",
    ),
});
export type LoginInput = z.infer<typeof loginSchema>;
