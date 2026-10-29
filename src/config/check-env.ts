import { loadEnvironment } from './env.js';

try {
  loadEnvironment();
  console.info('Environment configuration is valid.');
} catch (error: unknown) {
  console.error(error instanceof Error ? error.message : 'Invalid environment.');
  process.exitCode = 1;
}
