import express, { Router } from 'express';
import session from 'express-session';
import type { Environment } from '../config/env.js';
import type { PrismaClient } from '../generated/prisma/client.js';
import type { RedisClient } from '../lib/redis.js';
import { createSessionStore } from '../common/cache/session-store.js';
import { createLimiters, type RatePolicy } from '../common/security/rate-limits.js';
import { createCsrf } from '../common/middlewares/csrf.js';
import { sessionCookie } from '../common/security/session.js';
import { createAuthRepository } from '../modules/auth/auth.repository.js';
import { createAuthService } from '../modules/auth/auth.service.js';
import { createAuthRouter } from '../modules/auth/auth.route.js';
import { AppError, unavailable } from '../common/errors/app-error.js';
import { authenticate } from '../common/middlewares/authentication.js';
import { createProductsService } from '../modules/products/products.service.js';
import { createProductsRouter } from '../modules/products/products.route.js';
import { createReceivingsService } from '../modules/receivings/receivings.service.js';
import { createReceivingsRouter } from '../modules/receivings/receivings.route.js';
import { createInventoryService } from '../modules/inventory/inventory.service.js';
import { createInventoryRouter } from '../modules/inventory/inventory.route.js';

export interface SecurityDependencies { environment: Environment; prisma: PrismaClient; redis: RedisClient; limits?: RatePolicy }
export function createApiRouter({ environment, prisma, redis, limits }: SecurityDependencies) {
  const router = Router();
  const cookie = sessionCookie(environment);
  const sessionMiddleware = session({ name: cookie.name, secret: environment.SESSION_SECRET,
    resave: false, saveUninitialized: false, rolling: true,
    store: createSessionStore(redis, environment), cookie: { ...cookie.options, maxAge: environment.ANONYMOUS_SESSION_SECONDS * 1000 } });
  const limiters = createLimiters(redis, environment.REDIS_NAMESPACE, limits);
  const csrf = createCsrf(environment);
  // Includes parser/store/limiter errors: every auth response is noncacheable.
  router.use('/auth', (_request, response, next) => { response.set('Cache-Control', 'no-store'); next(); });
  router.use(async (request, _response, next) => {
    if (environment.DEPLOYMENT_MODE === 'https' && !request.secure) throw new AppError(403, 'FORBIDDEN', 'HTTPS is required.');
    try { if (!redis.isReady || await redis.ping() !== 'PONG') throw unavailable(); } catch { throw unavailable(); }
    next();
  });
  router.use(limiters.global);
  router.use((request, response, next) => sessionMiddleware(request, response, error => next(error ? unavailable() : undefined)));
  router.use(csrf.protect);
  router.use(express.json({ limit: '64kb', strict: true }));
  router.use('/auth', createAuthRouter(createAuthService(createAuthRepository(prisma)), environment, csrf, limiters));
  // Apply the current-user reload and shared per-user limiter only to business modules.
  const protectedRoutes = Router();
  protectedRoutes.use(authenticate(createAuthService(createAuthRepository(prisma)), environment), limiters.user);
  protectedRoutes.use('/products', createProductsRouter(createProductsService(prisma)));
  protectedRoutes.use('/receivings', createReceivingsRouter(createReceivingsService(prisma)));
  protectedRoutes.use('/inventory', createInventoryRouter(createInventoryService(prisma)));
  router.use(protectedRoutes);
  return router;
}
