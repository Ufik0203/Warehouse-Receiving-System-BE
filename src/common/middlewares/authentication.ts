import type { RequestHandler } from 'express';
import type { Environment } from '../../config/env.js';
import type { AuthService } from '../../modules/auth/auth.service.js';
import { AppError } from '../errors/app-error.js';
import { destroySession, saveSession } from '../security/session.js';
import { sessionRemaining } from '../cache/session-store.js';

export function authenticate(service: AuthService, environment: Environment): RequestHandler {
  return async (request, response, next) => {
    if (!request.session.userId) throw new AppError(401, 'UNAUTHENTICATED', 'Authentication required.');
    if (sessionRemaining(request.session, environment) <= 0) {
      await destroySession(request, response, environment);
      throw new AppError(401, 'SESSION_EXPIRED', 'Session expired.');
    }
    const user = await service.currentUser(request.session.userId);
    if (!user || !user.isActive || user.deletedAt || request.session.authVersion !== user.authVersion) {
      await destroySession(request, response, environment);
      throw new AppError(401, 'UNAUTHENTICATED', 'Authentication required.');
    }
    request.user = user;
    request.session.lastActivityAt = Date.now();
    request.session.cookie.maxAge = sessionRemaining(request.session, environment);
    await saveSession(request);
    next();
  };
}
