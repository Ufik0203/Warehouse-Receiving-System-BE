import { createPrisma } from '../../src/lib/prisma.js';
import { loadEnvironmentFile } from '../../src/config/load-env.js';
import { parseSeedAccounts, seedAccounts } from './seed.js';
import { z } from 'zod';

loadEnvironmentFile();
const databaseUrl = process.env['DATABASE_URL'];
if (!databaseUrl) throw new Error('DATABASE_URL is required for seed.');
const prisma = createPrisma(databaseUrl);
try {
  const accounts = parseSeedAccounts(process.env);
  await seedAccounts(prisma, accounts);
  console.info('Seed completed; existing accounts preserved.');
} catch (error: unknown) {
  // A ZodError can contain submitted values; report paths/messages only.
  if (error instanceof z.ZodError) console.error(`Invalid seed environment: ${error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('; ')}`);
  else console.error('Seed failed; check credentials, active supervisor and database availability.');
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
