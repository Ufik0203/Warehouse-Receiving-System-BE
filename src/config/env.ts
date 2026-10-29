import { z } from 'zod';
import { loadEnvironmentFile } from './load-env.js';

const positiveSeconds = z.coerce.number().int().positive();
function hasProtocol(value: string, protocols: string[]): boolean {
  try { return protocols.includes(new URL(value).protocol); } catch { return false; }
}
const databaseUrl = z.url().refine(value => hasProtocol(value, ['postgres:', 'postgresql:']), 'Must be a PostgreSQL URL');
const redisUrl = z.url().refine(value => hasProtocol(value, ['redis:', 'rediss:']), 'Must be a Redis URL');

export const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DEPLOYMENT_MODE: z.enum(['local', 'https']).default('local'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  APP_ORIGIN: z.url().refine(value => {
    try {
      const url = new URL(value);
      return ['http:', 'https:'].includes(url.protocol) && value === url.origin;
    } catch { return false; }
  }, 'Must be an HTTP(S) origin without path or trailing slash'),
  DATABASE_URL: databaseUrl,
  REDIS_URL: redisUrl,
  SESSION_SECRET: z.string().refine(value => Buffer.byteLength(value, 'utf8') >= 32, 'Must contain at least 32 bytes'),
  SESSION_COOKIE_SECURE: z.enum(['true', 'false']).transform(value => value === 'true'),
  SESSION_IDLE_SECONDS: positiveSeconds.default(1800),
  SESSION_ABSOLUTE_SECONDS: positiveSeconds.default(28800),
  ANONYMOUS_SESSION_SECONDS: positiveSeconds.default(900)
}).superRefine((value, context) => {
  if (value.SESSION_IDLE_SECONDS > value.SESSION_ABSOLUTE_SECONDS) context.addIssue({ code: 'custom', path: ['SESSION_IDLE_SECONDS'], message: 'Must not exceed absolute lifetime' });
  if (value.DEPLOYMENT_MODE === 'https' && (!value.SESSION_COOKIE_SECURE || !value.APP_ORIGIN.startsWith('https://'))) context.addIssue({ code: 'custom', path: ['DEPLOYMENT_MODE'], message: 'HTTPS requires secure cookies and an HTTPS origin' });
  if (!value.SESSION_COOKIE_SECURE && (value.DEPLOYMENT_MODE !== 'local' || !value.APP_ORIGIN.startsWith('http://'))) context.addIssue({ code: 'custom', path: ['SESSION_COOKIE_SECURE'], message: 'False is permitted only for local HTTP' });
});

export type Environment = z.infer<typeof environmentSchema>;

export function parseEnvironment(input: NodeJS.ProcessEnv): Environment {
  const result = environmentSchema.safeParse(input);
  if (!result.success) {
    // Never include raw values, connection strings or secrets in diagnostics.
    throw new Error(`Invalid environment: ${result.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('; ')}`);
  }
  return result.data;
}

export function loadEnvironment(): Environment {
  loadEnvironmentFile();
  return parseEnvironment(process.env);
}
