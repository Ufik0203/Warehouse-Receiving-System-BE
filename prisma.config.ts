import { defineConfig } from 'prisma/config';
import { z } from 'zod';
import { loadEnvironmentFile } from './src/config/load-env.js';

loadEnvironmentFile();
const url = z.url().safeParse(process.env['DATABASE_URL']);
if (!url.success) throw new Error('DATABASE_URL must be configured as a PostgreSQL URL for Prisma CLI.');
if (!['postgres:', 'postgresql:'].includes(new URL(url.data).protocol)) throw new Error('DATABASE_URL must use the PostgreSQL protocol.');

export default defineConfig({
  schema: 'prisma',
  migrations: { path: 'prisma/migrations', seed: 'tsx prisma/seeds/index.ts' },
  datasource: { url: url.data }
});
