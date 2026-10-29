import { resolve } from 'node:path';
import { parseEnvironment } from '../src/config/env.js';
import { parseSeedAccounts } from '../prisma/seeds/seed.js';

export const developmentProject = 'wrs-development-laptop';

export function developmentEnvironment(file: NodeJS.ProcessEnv, inherited: NodeJS.ProcessEnv, envPath: string): NodeJS.ProcessEnv {
  if (inherited['BACKEND_ENV_FILE'] && resolve(inherited['BACKEND_ENV_FILE']) !== envPath) {
    throw new Error('Development requires env/.env. Remove the BACKEND_ENV_FILE override.');
  }
  const conflicts = Object.keys(file).filter(key => inherited[key] !== undefined && inherited[key] !== file[key]);
  if (conflicts.length) throw new Error(`Conflicting terminal overrides: ${conflicts.join(', ')}. Remove these variables before npm run dev.`);
  const environment = parseEnvironment(file);
  const db = new URL(environment.DATABASE_URL);
  const redis = new URL(environment.REDIS_URL);
  if (environment.NODE_ENV !== 'development' || environment.PORT !== 3000 || environment.APP_ORIGIN !== 'http://localhost:5175' ||
      environment.DEPLOYMENT_MODE !== 'local' || environment.SESSION_COOKIE_SECURE || environment.TRUST_PROXY !== '' ||
      file['COMPOSE_PROJECT_NAME'] !== developmentProject || file['POSTGRES_DB'] !== 'warehouse_development' ||
      db.hostname !== '127.0.0.1' || db.pathname !== '/warehouse_development' || db.port !== file['POSTGRES_PORT'] ||
      redis.hostname !== '127.0.0.1' || redis.port !== file['REDIS_PORT'] || environment.REDIS_NAMESPACE !== 'wrs:dev:laptop' ||
      decodeURIComponent(db.username) !== file['POSTGRES_USER'] || decodeURIComponent(db.password) !== file['POSTGRES_PASSWORD'] ||
      decodeURIComponent(redis.password) !== file['REDIS_PASSWORD']) {
    throw new Error('Invalid laptop development target. Check env/.env: development, port 3000, origin localhost:5175, local HTTP, development database/project and matching host-port credentials.');
  }
  try { parseSeedAccounts(file); }
  catch { throw new Error('Invalid development seed configuration. Check SEED_SUPERVISOR_* and SEED_OPERATOR_* in env/.env.'); }
  return { ...inherited, ...file, BACKEND_ENV_FILE: envPath };
}
