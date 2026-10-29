import { AppError } from "../../common/errors/app-error.js";
import { verifyPassword } from "../../common/security/password.js";
import type { AuthRepository } from "./auth.repository.js";

export function createAuthService(repository: AuthRepository) {
  return {
    async login(email: string, password: string) {
      const user = await repository.byEmail(email);
      const valid = await verifyPassword(user?.passwordHash, password);
      if (!user || !valid || !user.isActive || user.deletedAt)
        throw new AppError(
          401,
          "INVALID_CREDENTIALS",
          "Invalid email or password.",
        );
      return user;
    },
    currentUser: repository.byId,
  };
}
export type AuthService = ReturnType<typeof createAuthService>;
