import type { PrismaClient } from '../../generated/prisma/client.js';
import { databaseOperation } from '../../common/errors/database-operation.js';
import { paginated, type SearchQuery } from '../../common/validation/input.js';
import { createInventoryRepository } from './inventory.repository.js';
import { mapBalance, mapMovement } from './inventory.mapper.js';
import type { HistoryQuery } from './inventory.schema.js';
export function createInventoryService(prisma: PrismaClient) {
  const repository = createInventoryRepository();
  return {
    balances: (query: SearchQuery) => databaseOperation(() => prisma.$transaction(async tx => paginated(
      (await repository.balances(tx, query)).map(mapBalance), await repository.balanceCount(tx, query), { page: query.page, limit: query.limit }
    ), { isolationLevel: 'RepeatableRead' })),
    history: (query: HistoryQuery) => databaseOperation(() => prisma.$transaction(async tx => paginated(
      (await repository.history(tx, query)).map(mapMovement), await repository.historyCount(tx, query), { page: query.page, limit: query.limit }
    ), { isolationLevel: 'RepeatableRead' }))
  };
}
export type InventoryService = ReturnType<typeof createInventoryService>;
