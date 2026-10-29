import express from 'express';
import { createHealthRouter } from './src/modules/health/health.route.js';

export function createApp(dependencies: { checkReadiness: () => Promise<void> }) {
  const app = express();
  app.disable('x-powered-by');
  app.use('/health', createHealthRouter(dependencies.checkReadiness));
  return app;
}
