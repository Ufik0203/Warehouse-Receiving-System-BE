import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createPrisma } from '../src/lib/prisma.js';
import { loadEnvironmentFile } from '../src/config/load-env.js';
import { backendRoot } from '../paths.js';

loadEnvironmentFile();
const url = process.env['DATABASE_URL'];
if (process.env['RUN_FOUNDATION_INTEGRATION'] !== 'true' || !url || !new URL(url).pathname.endsWith('_test')) {
  throw new Error('Verification requires RUN_FOUNDATION_INTEGRATION=true and a new database ending _test.');
}
const npmPath = process.env['npm_execpath'];
if (!npmPath) throw new Error('Run through npm run verify:database.');
const prisma = createPrisma(url);
function deploy(): void {
  execFileSync(process.execPath, [npmPath ?? '', 'run', 'db:migrate:deploy'], { cwd: backendRoot, stdio: 'inherit' });
}
async function snapshot() {
  const columns = await prisma.$queryRaw`SELECT table_name, column_name, data_type, is_nullable, column_default
    FROM information_schema.columns WHERE table_schema = 'public' ORDER BY table_name, ordinal_position`;
  const constraints = await prisma.$queryRaw`SELECT conname, pg_get_constraintdef(oid)
    FROM pg_constraint WHERE connamespace = 'public'::regnamespace ORDER BY conname`;
  const migrations = await prisma.$queryRaw`SELECT id, checksum, migration_name, finished_at, applied_steps_count FROM _prisma_migrations ORDER BY id`;
  return JSON.stringify({ columns, constraints, migrations });
}
try {
  const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`;
  assert.equal(tables.length, 0, 'Refusing to claim an empty-database check: public schema already contains tables. No data was deleted.');
  console.info('PASS: dedicated verification database has zero public tables before migration.');
  deploy();
  const first = await snapshot();
  deploy();
  assert.equal(await snapshot(), first, 'Repeated deploy changed schema or migration history.');
  console.info('PASS: repeated migration deploy preserved all column/constraint definitions and migration history.');
} finally { await prisma.$disconnect(); }
