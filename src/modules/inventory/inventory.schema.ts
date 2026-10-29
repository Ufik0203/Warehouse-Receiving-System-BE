import { z } from 'zod';
import { pagination, uuid } from '../../common/validation/input.js';
export const historyQuery = z.strictObject({ ...pagination, productId: uuid.optional(), receivingId: uuid.optional() });
export type HistoryQuery = z.output<typeof historyQuery>;
