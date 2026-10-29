import type { RequestHandler } from 'express';
import { csrfSync } from 'csrf-sync';
import type { Environment } from '../../config/env.js';
import { AppError } from '../errors/app-error.js';
import { sessionRemaining } from '../cache/session-store.js';

export function createCsrf(environment: Environment) {
  const sync = csrfSync({ size: 32, getTokenFromRequest: request => request.get('X-CSRF-Token') });
  const protect: RequestHandler = (request, response, next) => {
    if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(request.method)) { next(); return; }
    if (sessionRemaining(request.session, environment) <= 0) {
      next(new AppError(403, 'CSRF_INVALID', 'Invalid CSRF token.')); return;
    }
    let origin = request.get('Origin');
    if (!origin) {
      try { origin = new URL(request.get('Referer') ?? '').origin; } catch { /* Invalid/missing referer is rejected. */ }
    }
    if (origin !== environment.APP_ORIGIN) { next(new AppError(403, 'ORIGIN_NOT_ALLOWED', 'Origin is not allowed.')); return; }
    if (request.get('Content-Type')?.split(';')[0]?.trim().toLowerCase() !== 'application/json') {
      next(new AppError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Mutations require application/json.')); return;
    }
    sync.csrfSynchronisedProtection(request, response, error => next(error ? new AppError(403, 'CSRF_INVALID', 'Invalid CSRF token.') : undefined));
  };
  return { generateToken: sync.generateToken, protect };
}
