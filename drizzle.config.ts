import { loadEnvConfig } from '@next/env';
import { defineConfig } from 'drizzle-kit';

// `npm run db:generate` writes a migration from lib/postgres/schema.ts into
// drizzle/; `npm run db:migrate` applies whatever is pending. Both read
// DATABASE_URL from .env.local the same way Next does.
loadEnvConfig(process.cwd());

export default defineConfig({
  dialect: 'postgresql',
  schema: './lib/postgres/schema.ts',
  out: './drizzle',
  dbCredentials: { url: process.env.DATABASE_URL ?? '' },
  strict: true,
  verbose: true,
});
