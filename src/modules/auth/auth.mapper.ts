import type { AuthUser } from './auth.repository.js';

export function mapUser(user: AuthUser) {
  return { id: user.id, email: user.email, name: user.name, role: user.role,
    isActive: user.isActive, deletedAt: user.deletedAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(), updatedAt: user.updatedAt.toISOString() };
}
