import { createServer } from 'node:http';
import { createApp } from './app.js';
import { loadEnvironment } from './src/config/env.js';
import { createPrisma } from './src/lib/prisma.js';
import { createRedis } from './src/lib/redis.js';
import { createReadinessCheck } from './src/modules/health/health.service.js';
import type { Environment } from './src/config/env.js';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

export async function startServer(environment: Environment) {
  const prisma = createPrisma(environment.DATABASE_URL);
  const redis = createRedis(environment.REDIS_URL);
  const readiness = createReadinessCheck({ prisma, redis });
  try {
    await prisma.$connect();
    await redis.connect();
    await readiness();
  } catch {
    await Promise.allSettled([prisma.$disconnect(), redis.isOpen ? redis.close() : Promise.resolve()]);
    throw new Error('Startup failed: PostgreSQL schema or Redis is unavailable.');
  }
  const server = createServer(createApp({ checkReadiness: readiness }));
  let stopping = false;
  async function shutdown(exitCode = 0): Promise<void> {
    if (stopping) return;
    stopping = true;
    const deadline = setTimeout(() => { server.closeAllConnections(); process.exit(1); }, 10000);
    deadline.unref();
    try {
      if (server.listening) await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
      await Promise.all([prisma.$disconnect(), redis.isOpen ? redis.close() : Promise.resolve()]);
      process.exitCode = exitCode;
      console.info('Shutdown completed.');
    } catch {
      process.exitCode = 1;
      console.error('Shutdown could not close all resources.');
    } finally {
      clearTimeout(deadline);
      process.removeListener('SIGINT', onInterrupt);
      process.removeListener('SIGTERM', onTerminate);
    }
  }
  function onInterrupt() { void shutdown(0); }
  function onTerminate() { void shutdown(0); }
  try {
    await new Promise<void>((resolveListening, reject) => {
      server.once('error', reject);
      server.listen(environment.PORT, () => { server.removeListener('error', reject); resolveListening(); });
    });
  } catch {
    await shutdown(1);
    throw new Error('HTTP listener failed.');
  }
  process.once('SIGINT', onInterrupt);
  process.once('SIGTERM', onTerminate);
  server.once('error', () => { console.error('HTTP listener failed.'); void shutdown(1); });
  const address = server.address();
  console.info(`API listening on port ${typeof address === 'object' && address !== null ? address.port : environment.PORT}.`);
  return { server, shutdown };
}

async function main(): Promise<void> {
  await startServer(loadEnvironment());
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'Startup failed.');
    process.exitCode = 1;
  });
}
