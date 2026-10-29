import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

export function createPrisma(databaseUrl: string): PrismaClient {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl, connectionTimeoutMillis: 3000, statement_timeout: 5000, query_timeout: 6000, max: 10 }), transactionOptions: { maxWait: 5000, timeout: 10000 } });
}
