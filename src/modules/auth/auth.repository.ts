import type { PrismaClient, User } from '../../generated/prisma/client.js';
import { unavailable } from '../../common/errors/app-error.js';

export type AuthUser = Pick<User, 'id' | 'email' | 'name' | 'role' | 'isActive' | 'authVersion' | 'deletedAt' | 'createdAt' | 'updatedAt'>;
export function createAuthRepository(prisma: PrismaClient) {
  return {
    async byEmail(email: string) {
      try { return await prisma.user.findUnique({ where: { email } }); } catch { throw unavailable(); }
    },
    async byId(id: string): Promise<AuthUser | null> {
      try {
        return await prisma.user.findUnique({ where: { id }, select: {
          id: true, email: true, name: true, role: true, isActive: true, authVersion: true,
          deletedAt: true, createdAt: true, updatedAt: true
        } });
      } catch { throw unavailable(); }
    }
  };
}
export type AuthRepository = ReturnType<typeof createAuthRepository>;
