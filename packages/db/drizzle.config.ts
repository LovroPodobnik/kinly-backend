import type { Config } from 'drizzle-kit';

export default {
  schema: './src/schema.ts',
  out: './migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: './sqlite.db',
  },
  verbose: true,
  strict: false,
  breakpoints: true,
} satisfies Config;
