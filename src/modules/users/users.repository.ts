import type { Prisma } from "../../generated/prisma/client.js";
import { ACCOUNT_MANAGEMENT_LOCK } from "../../common/security/account-lock.js";
import { offset } from "../../common/validation/input.js";
import type { CreateUser, UpdateUser, UsersQuery } from "./users.schema.js";

export const userFields = {
  id: true,
  email: true,
  name: true,
  role: true,
  isActive: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
  authVersion: true,
} as const;

const where = (query: UsersQuery): Prisma.UserWhereInput => ({
  ...(!query.includeDeleted ? { deletedAt: null } : {}),
  ...(query.role ? { role: query.role } : {}),
  ...(query.isActive === undefined ? {} : { isActive: query.isActive }),
});

export function createUsersRepository() {
  return {
    lock: async (tx: Prisma.TransactionClient) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${ACCOUNT_MANAGEMENT_LOCK})`;
    },
    byId: async (db: Prisma.TransactionClient, id: string) =>
      db.user.findUnique({ where: { id }, select: userFields }),
    list: (db: Prisma.TransactionClient, query: UsersQuery) =>
      db.user.findMany({
        where: where(query),
        select: userFields,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        ...offset(query),
      }),
    count: (db: Prisma.TransactionClient, query: UsersQuery) =>
      db.user.count({ where: where(query) }),
    activeSupervisors: async (tx: Prisma.TransactionClient) =>
      tx.user.count({
        where: { role: "SUPERVISOR", isActive: true, deletedAt: null },
      }),
    create: async (
      tx: Prisma.TransactionClient,
      input: Omit<CreateUser, "password">,
      passwordHash: string,
    ) =>
      tx.user.create({ data: { ...input, passwordHash }, select: userFields }),
    update: async (
      tx: Prisma.TransactionClient,
      id: string,
      input: UpdateUser,
      revoke: boolean,
    ) =>
      tx.user.update({
        where: { id },
        data: {
          ...(input.name === undefined ? {} : { name: input.name }),
          ...(input.role === undefined ? {} : { role: input.role }),
          ...(input.isActive === undefined ? {} : { isActive: input.isActive }),
          ...(revoke ? { authVersion: { increment: 1 } } : {}),
        },
        select: userFields,
      }),
    softDelete: async (tx: Prisma.TransactionClient, id: string) =>
      tx.user.update({
        where: { id },
        data: {
          isActive: false,
          deletedAt: new Date(),
          authVersion: { increment: 1 },
        },
        select: userFields,
      }),
  };
}
