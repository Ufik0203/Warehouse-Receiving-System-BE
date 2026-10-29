import { describe, expect, it } from 'vitest';
import { parseEnvironment } from '../../src/config/env.js';
import { parseSeedAccounts } from '../../prisma/seeds/seed.js';

const valid = {
  APP_ORIGIN: 'http://localhost:5173', DATABASE_URL: 'postgresql://user:private@localhost/warehouse_test',
  REDIS_URL: 'redis://:private@localhost:6379', SESSION_SECRET: 'x'.repeat(32), SESSION_COOKIE_SECURE: 'false'
};

describe('environment safety', () => {
  it('rejects missing settings with field names and without secret values', () => {
    expect(() => parseEnvironment({})).toThrow('DATABASE_URL');
    expect(() => parseEnvironment({ ...valid, DATABASE_URL: '', REDIS_URL: '' })).toThrow('DATABASE_URL');
    expect(() => parseEnvironment({ ...valid, SESSION_SECRET: 'private-secret' })).toThrow('SESSION_SECRET');
    try { parseEnvironment({ ...valid, SESSION_SECRET: 'private-secret' }); }
    catch (error: unknown) { expect(String(error)).not.toContain('private-secret'); }
  });
  it('rejects insecure HTTPS and inconsistent lifetime settings', () => {
    expect(() => parseEnvironment({ ...valid, DEPLOYMENT_MODE: 'https' })).toThrow('HTTPS requires');
    expect(() => parseEnvironment({ ...valid, SESSION_IDLE_SECONDS: '30000' })).toThrow('SESSION_IDLE_SECONDS');
  });
  it('accepts a valid local configuration and explicit boolean false', () => {
    const config = parseEnvironment(valid);
    expect(config.SESSION_COOKIE_SECURE).toBe(false);
    expect(config.SESSION_ABSOLUTE_SECONDS).toBe(28800);
  });
});

describe('seed input', () => {
  const accounts = {
    SEED_SUPERVISOR_NAME: ' Supervisor ', SEED_SUPERVISOR_EMAIL: ' SUPERVISOR@EXAMPLE.COM ', SEED_SUPERVISOR_PASSWORD: '😀'.repeat(12),
    SEED_OPERATOR_NAME: 'Operator', SEED_OPERATOR_EMAIL: 'operator@example.com', SEED_OPERATOR_PASSWORD: '  preserved password  '
  };
  it('normalizes names/emails and preserves password whitespace and code points', () => {
    const result = parseSeedAccounts(accounts);
    expect(result[0]?.email).toBe('supervisor@example.com');
    expect(result[0]?.password).toBe('😀'.repeat(12));
    expect(result[1]?.password).toBe('  preserved password  ');
  });
  it('rejects short passwords and duplicate normalized emails', () => {
    expect(() => parseSeedAccounts({ ...accounts, SEED_SUPERVISOR_PASSWORD: '😀'.repeat(11) })).toThrow();
    expect(() => parseSeedAccounts({ ...accounts, SEED_OPERATOR_EMAIL: 'supervisor@example.com' })).toThrow('different emails');
  });
});
