import type { Product } from '../../generated/prisma/client.js';
export function mapProduct(row: Product) {
  return { id: row.id, sku: row.sku, name: row.name, unit: 'pcs' as const, createdAt: row.createdAt.toISOString() };
}
