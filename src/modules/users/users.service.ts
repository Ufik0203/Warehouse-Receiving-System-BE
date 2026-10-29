import { Prisma, type PrismaClient } from '../../generated/prisma/client.js';
import { AppError } from '../../common/errors/app-error.js';
import { databaseOperation } from '../../common/errors/database-operation.js';
import { hashPassword } from '../../common/security/password.js';
import { paginated } from '../../common/validation/input.js';
import { createUsersRepository } from './users.repository.js';
import { mapUser } from './users.mapper.js';
import type { CreateUser, UpdateUser, UsersQuery } from './users.schema.js';

const missing = () => new AppError(404, 'USER_NOT_FOUND', 'User not found.');
export function createUsersService(prisma: PrismaClient, repository = createUsersRepository()) {
  async function actor(tx: Prisma.TransactionClient, id: string) {
    await repository.lock(tx);
    const current = await repository.byId(tx, id);
    if (!current || current.role !== 'SUPERVISOR' || !current.isActive || current.deletedAt) throw new AppError(403, 'FORBIDDEN', 'Active supervisor required.');
  }
  async function invariant(tx: Prisma.TransactionClient) {
    if (await repository.activeSupervisors(tx) < 1) throw new AppError(409, 'LAST_ACTIVE_SUPERVISOR', 'At least one active supervisor is required.');
  }
  return {
    list: (query: UsersQuery) => databaseOperation(() => prisma.$transaction(async tx => paginated(
      (await repository.list(tx, query)).map(mapUser), await repository.count(tx, query), query
    ), { isolationLevel: 'RepeatableRead' })),
    detail: (id: string) => databaseOperation(async () => {
      const row = await repository.byId(prisma, id); if (!row) throw missing(); return mapUser(row);
    }),
    create: (actorId: string, input: CreateUser) => databaseOperation(async () => {
      // Expensive hashing is outside the account lock/transaction. Recheck actor afterwards.
      const passwordHash = await hashPassword(input.password);
      try {
        return await prisma.$transaction(async tx => {
          await actor(tx, actorId);
          const row = await repository.create(tx, { name: input.name, email: input.email, role: input.role }, passwordHash);
          await invariant(tx); return mapUser(row);
        });
      } catch (error: unknown) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new AppError(409, 'EMAIL_ALREADY_EXISTS', 'Email already exists.');
        throw error;
      }
    }),
    update: (actorId: string, id: string, input: UpdateUser) => databaseOperation(() => prisma.$transaction(async tx => {
      await actor(tx, actorId);
      const target = await repository.byId(tx, id); if (!target) throw missing();
      if (target.deletedAt) throw new AppError(409, 'USER_DELETED', 'Deleted users cannot be updated.');
      if (id === actorId && (input.role === 'OPERATOR' || input.isActive === false)) throw new AppError(409, 'SELF_ACCOUNT_RESTRICTION', 'Cannot revoke your own access.');
      const revoke = (input.role !== undefined && input.role !== target.role) || (input.isActive !== undefined && input.isActive !== target.isActive);
      const row = await repository.update(tx, id, input, revoke);
      await invariant(tx); return mapUser(row);
    })),
    remove: (actorId: string, id: string) => databaseOperation(() => prisma.$transaction(async tx => {
      await actor(tx, actorId);
      const target = await repository.byId(tx, id); if (!target) throw missing();
      if (id === actorId) throw new AppError(409, 'SELF_ACCOUNT_RESTRICTION', 'Cannot delete your own account.');
      if (!target.deletedAt) await repository.softDelete(tx, id);
      await invariant(tx);
    }))
  };
}
export type UsersService = ReturnType<typeof createUsersService>;
