import { z } from 'zod';
import { text } from '../../common/validation/input.js';
export const createProductSchema = z.strictObject({
  sku: z.string().trim().toUpperCase().pipe(z.string().min(1).max(40).regex(/^[A-Z0-9_-]+$/)),
  name: text(1, 120)
});
export type CreateProduct = z.output<typeof createProductSchema>;
