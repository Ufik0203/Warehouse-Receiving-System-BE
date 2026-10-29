import { defineConfig } from 'prisma/config';

// Code generation and schema validation are offline operations. Migration/seed
// commands still use prisma.config.ts and require an explicit DATABASE_URL.
export default defineConfig({ schema: 'prisma' });
