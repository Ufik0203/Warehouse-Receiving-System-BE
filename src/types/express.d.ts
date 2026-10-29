import type { AuthUser } from '../modules/auth/auth.repository.js';

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      user?: AuthUser;
    }
  }
}
