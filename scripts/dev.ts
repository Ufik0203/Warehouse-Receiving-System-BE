import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createServer } from 'node:net';
import { spawn, spawnSync } from 'node:child_process';
import { parse } from 'dotenv';
import { backendRoot } from '../paths.js';
import { developmentEnvironment, developmentProject } from './dev-config.js';

async function main(): Promise<void> {
  const envPath = join(backendRoot, 'env/.env');
  let contents: string;
  try { contents = readFileSync(envPath, 'utf8'); }
  catch { throw new Error('Missing env/.env. Copy env/.env.example and configure development credentials first.'); }
  const environment = developmentEnvironment(parse(contents), process.env, envPath);
  await new Promise<void>((resolve, reject) => {
    const probe = createServer();
    probe.once('error', () => reject(new Error('Port 3000 is unavailable. Stop your previous backend or identify the owning application; nothing was stopped automatically.')));
    probe.listen(3000, () => probe.close(error => error ? reject(error) : resolve()));
  });
  function run(command: string, args: string[], message: string, timeout = 120000): void {
    const result = spawnSync(command, args, { cwd: backendRoot, env: environment, windowsHide: true, encoding: 'utf8', timeout });
    if (result.error || result.status !== 0) throw new Error(message);
  }
  console.info('[dev] Using env/.env; development only. Browser: http://localhost:5175');
  run('docker', ['info', '--format', '{{.ServerVersion}}'], 'Docker engine unavailable. Start Docker Desktop, wait until the engine is ready, then retry npm run dev.', 15000);
  console.info(`[dev] Waiting for PostgreSQL/Redis in ${developmentProject} (existing data preserved)...`);
  run('docker', ['compose', '-f', join(backendRoot, 'compose.yaml'), '-p', developmentProject, '--env-file', envPath, 'up', '-d', '--wait', '--wait-timeout', '90', 'postgres', 'redis'], 'Development dependencies failed to become healthy. Check Docker Desktop, host port conflicts and development Compose status; do not delete volumes.');
  const prismaCli = join(backendRoot, 'node_modules/prisma/build/index.js');
  run(process.execPath, [prismaCli, 'generate', '--config', 'prisma.generate.config.ts'], 'Prisma generate failed. Check installed local dependencies.');
  // Verify the database reached through the host URL before any migration/seed writes.
  const { createPrisma } = await import('../src/lib/prisma.js');
  const prisma = createPrisma(environment['DATABASE_URL'] ?? '');
  try {
    const rows = await prisma.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`;
    if (rows[0]?.name !== 'warehouse_development') throw new Error('Unexpected development database.');
  } catch { throw new Error('Cannot verify the development database through its host URL. Check env/.env and PostgreSQL; no migration/seed was started.'); }
  finally { await prisma.$disconnect(); }
  console.info('[dev] Applying pending migrations and idempotent seed once (existing account passwords preserved)...');
  run(process.execPath, [prismaCli, 'migrate', 'deploy'], 'Migration deploy failed. Inspect development database/migrations; never reset or edit applied migrations.');
  run(process.execPath, [prismaCli, 'db', 'seed'], 'Development seed failed. Check seed configuration and active supervisor; existing accounts were not overwritten.');
  console.info('[dev] Preparation complete. Starting API watcher on port 3000; source restarts do not repeat preparation.');
  const watcher = spawn(process.execPath, [join(backendRoot, 'node_modules/tsx/dist/cli.mjs'), 'watch', 'server.ts'], {
    cwd: backendRoot, env: environment, stdio: 'inherit', windowsHide: true
  });
  watcher.once('error', () => { console.error('[dev] Cannot start watcher. Check local dependencies.'); process.exitCode = 1; });
  const interrupt = () => { watcher.kill('SIGINT'); };
  const terminate = () => { watcher.kill('SIGTERM'); };
  process.once('SIGINT', interrupt);
  process.once('SIGTERM', terminate);
  watcher.once('exit', code => {
    process.removeListener('SIGINT', interrupt);
    process.removeListener('SIGTERM', terminate);
    process.exitCode = code ?? 0;
  });
}

main().catch((error: unknown) => {
  console.error(`[dev] ${error instanceof Error ? error.message : 'Development startup failed.'}`);
  process.exitCode = 1;
});
