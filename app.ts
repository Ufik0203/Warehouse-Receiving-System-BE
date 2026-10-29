import express from 'express';
import { createHealthRouter } from './src/modules/health/health.route.js';
import { randomUUID } from 'node:crypto';
import { createApiRouter, type SecurityDependencies } from './src/routes/index.js';
import { errorHandler } from './src/common/middlewares/error-handler.js';

export function createApp(dependencies: { checkReadiness: () => Promise<void>; security?: SecurityDependencies }) {
  const app = express();
  app.disable('x-powered-by');
  app.use((request, _response, next) => { request.requestId = randomUUID(); next(); });
  app.use('/health', createHealthRouter(dependencies.checkReadiness));
  if (dependencies.security) {
    const trusted = dependencies.security.environment.TRUST_PROXY;
    app.set('trust proxy', trusted ? trusted.split(',').map(value => value.trim()) : false);
    app.use('/api/v1', createApiRouter(dependencies.security));
  }
  app.use(errorHandler);
  return app;
}
