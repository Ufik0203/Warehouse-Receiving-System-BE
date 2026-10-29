import type { PrismaClient } from "../../generated/prisma/client.js";
import type { RedisClient } from "../../lib/redis.js";

export interface HealthDependencies {
  prisma: Pick<PrismaClient, "$queryRaw">;
  redis: Pick<RedisClient, "ping" | "isReady">;
}

export function createReadinessCheck({
  prisma,
  redis,
}: HealthDependencies): () => Promise<void> {
  return async () => {
    // LIMIT 0 still checks table/column availability and SELECT permission without reading user data.
    await prisma.$queryRaw`SELECT u.id, p.id, r.id, i.id, rc.id, t.id, b.product_id, ph.id
      FROM users u, products p, receivings r, receiving_items i, receipts rc,
      inventory_transactions t, inventory_balances b, product_edit_history ph LIMIT 0`;
    if (!redis.isReady || (await redis.ping()) !== "PONG")
      throw new Error("Redis unavailable.");
  };
}
