import { Router } from 'express';
import type { Environment } from '../../config/env.js';
import type { AuthService } from './auth.service.js';
import type { createCsrf } from '../../common/middlewares/csrf.js';
import type { createLimiters } from '../../common/security/rate-limits.js';
import { noQuery, validateLogin } from '../../common/middlewares/validation.js';
import { authenticate } from '../../common/middlewares/authentication.js';
import { createAuthController } from './auth.controller.js';

export function createAuthRouter(service: AuthService, environment: Environment, csrf: ReturnType<typeof createCsrf>, limits: ReturnType<typeof createLimiters>) {
  const router = Router();
  const auth = authenticate(service, environment);
  const controller = createAuthController(service, environment, csrf);
  router.use((_request, response, next) => { response.set('Cache-Control', 'no-store'); next(); });
  router.use(noQuery);
  router.get('/csrf-token', async (request, response, next) => {
    if (request.session.userId) await auth(request, response, next);
    else next();
  }, controller.bootstrap);
  router.post('/login', limits.loginIp, validateLogin, limits.loginPair, controller.login);
  router.get('/me', auth, limits.user, controller.me);
  router.post('/logout', auth, limits.user, controller.logout);
  return router;
}
