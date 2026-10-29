import { hash, argon2id } from 'argon2';
import { z } from 'zod';
import type { PrismaClient } from '../../src/generated/prisma/client.js';
import { ACCOUNT_MANAGEMENT_LOCK } from '../../src/common/security/account-lock.js';

const password = z.string().refine(value => [...value].length >= 12 && [...value].length <= 128, 'Must contain 12-128 Unicode code points');
const account = z.object({
  name: z.string().trim().refine(value => [...value].length >= 1 && [...value].length <= 120, 'Must fit PostgreSQL varchar(120)'),
  email: z.email().max(254).transform(value => value.trim().toLowerCase()),
  password
});

export function parseSeedAccounts(environment: NodeJS.ProcessEnv) {
  const read = (prefix: string) => account.parse({
    name: environment[`${prefix}_NAME`],
    email: environment[`${prefix}_EMAIL`]?.trim().toLowerCase(),
    password: environment[`${prefix}_PASSWORD`]
  });
  const supervisor = read('SEED_SUPERVISOR');
  const operator = read('SEED_OPERATOR');
  if (supervisor.email === operator.email) throw new Error('Seed accounts must use different emails.');
  return [{ ...supervisor, role: 'SUPERVISOR' as const }, { ...operator, role: 'OPERATOR' as const }];
}

export async function seedAccounts(prisma: PrismaClient, accounts: ReturnType<typeof parseSeedAccounts>): Promise<void> {
  // Hash outside transaction; existing records, including deleted accounts, are never overwritten.
  const data = await Promise.all(accounts.map(async value => ({
    name: value.name, email: value.email, role: value.role,
    passwordHash: await hash(value.password, { type: argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 })
  })));
  await prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${ACCOUNT_MANAGEMENT_LOCK})`;
    await tx.user.createMany({ data, skipDuplicates: true });
    const activeSupervisor = await tx.user.count({ where: { role: 'SUPERVISOR', isActive: true, deletedAt: null } });
    if (activeSupervisor === 0) throw new Error('Seed requires an active supervisor; existing accounts are never overwritten.');
  });
}
