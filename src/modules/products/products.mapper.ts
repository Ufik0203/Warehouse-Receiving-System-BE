import type {
  Product,
  ProductEditHistory,
} from "../../generated/prisma/client.js";

export function mapProduct(row: Product) {
  return {
    id: row.id,
    sku: row.sku,
    name: row.name,
    unit: "pcs" as const,
    createdAt: row.createdAt.toISOString(),
  };
}

export function mapProductHistory(row: ProductEditHistory) {
  const changedFields: Array<"sku" | "name"> = [];
  if (row.beforeSku !== row.afterSku) changedFields.push("sku");
  if (row.beforeName !== row.afterName) changedFields.push("name");
  return {
    id: row.id,
    productId: row.productId,
    actorId: row.actorId,
    actorName: row.actorName,
    changedAt: row.changedAt.toISOString(),
    changedFields,
    before: { sku: row.beforeSku, name: row.beforeName },
    after: { sku: row.afterSku, name: row.afterName },
  };
}
