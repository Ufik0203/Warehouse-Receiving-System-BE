import { describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import { developmentEnvironment } from '../../scripts/dev-config.js';

const path = resolve('env/.env');
const file: NodeJS.ProcessEnv = {
  NODE_ENV: 'development', DEPLOYMENT_MODE: 'local', PORT: '3000', APP_ORIGIN: 'http://localhost:5175',
  DATABASE_URL: 'postgresql://dev:placeholder@127.0.0.1:55450/warehouse_development',
  REDIS_URL: 'redis://:placeholder@127.0.0.1:56400', SESSION_SECRET: 'x'.repeat(48), SESSION_COOKIE_SECURE: 'false',
  REDIS_NAMESPACE: 'wrs:dev:laptop', TRUST_PROXY: '', COMPOSE_PROJECT_NAME: 'wrs-development-laptop',
  POSTGRES_USER: 'dev', POSTGRES_PASSWORD: 'placeholder', POSTGRES_DB: 'warehouse_development', POSTGRES_PORT: '55450',
  REDIS_PASSWORD: 'placeholder', REDIS_PORT: '56400',
  SEED_SUPERVISOR_NAME: 'Supervisor', SEED_SUPERVISOR_EMAIL: 'supervisor@example.test', SEED_SUPERVISOR_PASSWORD: 'test-only-placeholder',
  SEED_OPERATOR_NAME: 'Operator', SEED_OPERATOR_EMAIL: 'operator@example.test', SEED_OPERATOR_PASSWORD: 'test-only-placeholder'
};

describe('development target safety', () => {
  it('accepts the local development file and preserves unrelated terminal settings', () => {
    const environment = developmentEnvironment(file, { PATH: 'local-path' }, path);
    expect(environment['BACKEND_ENV_FILE']).toBe(path);
    expect(environment['PATH']).toBe('local-path');
  });
  it('rejects conflicting inherited database/origin/namespace without exposing values', () => {
    for (const key of ['DATABASE_URL', 'APP_ORIGIN', 'REDIS_NAMESPACE']) {
      expect(() => developmentEnvironment(file, { [key]: 'private-terminal-value' }, path)).toThrow(key);
      try { developmentEnvironment(file, { [key]: 'private-terminal-value' }, path); }
      catch (error: unknown) { expect(String(error)).not.toContain('private-terminal-value'); }
    }
    expect(() => developmentEnvironment(file, { BACKEND_ENV_FILE: resolve('env/.env.task5') }, path)).toThrow('BACKEND_ENV_FILE');
  });
  it('rejects test databases, deployment projects, wrong origins and credential/port mismatches before preparation', () => {
    for (const replacement of [
      { DATABASE_URL: 'postgresql://dev:placeholder@127.0.0.1:55450/another_test' },
      { COMPOSE_PROJECT_NAME: 'wrs-task7-example' }, { APP_ORIGIN: 'http://localhost:5174' },
      { POSTGRES_PORT: '55442' }, { REDIS_PASSWORD: 'mismatch' }
    ]) expect(() => developmentEnvironment({ ...file, ...replacement }, {}, path)).toThrow('Invalid laptop development target');
  });
});
