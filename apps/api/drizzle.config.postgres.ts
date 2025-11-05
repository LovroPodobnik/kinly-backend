import type { Config } from 'drizzle-kit';

export default {
  schema: '../../packages/db/src/schema-postgres.ts',
  out: '../../packages/db/migrations-postgres',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://localhost:5432/mydb',
  },
  verbose: true,
  strict: false,
  breakpoints: true,
} satisfies Config;
