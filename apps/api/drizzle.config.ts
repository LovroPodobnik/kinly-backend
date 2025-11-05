import type { Config } from 'drizzle-kit';

export default {
  schema: '../../packages/db/src/schema.ts',
  out: '../../packages/db/migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: '../../sqlite.db',
  },
  verbose: true,
  strict: false,
  breakpoints: true,
} satisfies Config;
