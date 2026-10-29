import type { RequestHandler, Request, Response } from 'express';
import { rateLimit, ipKeyGenerator } from 'express-rate-limit';
import { createHash } from 'node:crypto';
import type { RedisClient } from '../../lib/redis.js';
import { createRateLimitStore } from '../cache/rate-limit-store.js';
import { AppError, unavailable } from '../errors/app-error.js';
import type { LoginInput } from '../../modules/auth/auth.schema.js';

export interface RatePolicy { global: number; loginIp: number; loginPair: number; user: number }
export const DEFAULT_LIMITS: RatePolicy = { global: 300, loginIp: 10, loginPair: 5, user: 120 };
export function createLimiters(redis: RedisClient, namespace: string, limits: RatePolicy = DEFAULT_LIMITS) {
  function limiter(scope: string, limit: number, windowMs: number, keyGenerator: (request: Request, response: Response) => string): RequestHandler {
    const middleware = rateLimit({ windowMs, limit, keyGenerator, store: createRateLimitStore(redis, `${namespace}:rl:${scope}:`),
      passOnStoreError: false, standardHeaders: 'draft-8', legacyHeaders: false,
      handler: (_request, _response, next) => next(new AppError(429, 'RATE_LIMITED', 'Too many requests.')) });
    return (request, response, next) => middleware(request, response, error => next(error instanceof AppError && error.status === 429 ? error : error ? unavailable() : undefined));
  }
  return {
    global: limiter('global', limits.global, 60000, request => ipKeyGenerator(request.ip ?? '127.0.0.1')),
    loginIp: limiter('login-ip', limits.loginIp, 900000, request => ipKeyGenerator(request.ip ?? '127.0.0.1')),
    loginPair: limiter('login-pair', limits.loginPair, 900000, (request, response) => {
      const input: LoginInput = response.locals['login'];
      return `${ipKeyGenerator(request.ip ?? '127.0.0.1')}:${createHash('sha256').update(input.email).digest('hex')}`;
    }),
    user: limiter('user', limits.user, 60000, request => request.user?.id ?? 'unauthenticated')
  };
}
