import { Router } from 'express';
import { randomUUID } from 'node:crypto';

export function createHealthRouter(checkReadiness: () => Promise<void>) {
  const router = Router();
  router.use((request, response, next) => {
    if (Object.keys(request.query).length > 0) {
      response.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Unknown query parameters are not allowed.', requestId: randomUUID() } });
      return;
    }
    next();
  });
  router.get('/live', (_request, response) => response.json({ status: 'ok' }));
  router.get('/ready', async (_request, response) => {
    try {
      await checkReadiness();
      response.json({ status: 'ready', dependencies: { postgres: 'up', redis: 'up' } });
    } catch {
      response.status(503).json({ error: { code: 'DEPENDENCY_UNAVAILABLE', message: 'Required dependencies are not ready.', requestId: randomUUID() } });
    }
  });
  return router;
}
