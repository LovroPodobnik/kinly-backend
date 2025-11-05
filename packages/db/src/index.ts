import { drizzle as drizzleSqlite } from 'drizzle-orm/bun-sqlite';
import { drizzle as drizzlePostgres } from 'drizzle-orm/postgres-js';
import Database from 'bun:sqlite';
import postgres from 'postgres';
import * as schemaSqlite from './schema';
import * as schemaPostgres from './schema-postgres';

// Use PostgreSQL in production, SQLite in development
const DATABASE_URL = process.env.DATABASE_URL;

let db: any;
let schema: any;

if (DATABASE_URL) {
  // PostgreSQL for production
  console.log('🐘 Using PostgreSQL database');
  const queryClient = postgres(DATABASE_URL);
  schema = schemaPostgres;
  db = drizzlePostgres(queryClient, { schema });
} else {
  // SQLite for local development
  console.log('📁 Using SQLite database (local development)');
  // Path relative to where the API runs (apps/api)
  const sqlite = new Database('../../sqlite.db');
  schema = schemaSqlite;
  db = drizzleSqlite(sqlite, { schema });
}

// Export the active schema tables
export const {
  users,
  sessions,
  accounts,
  verifications,
  courses,
  lessons,
  userEnrollments,
  userLessonProgress,
  userStats,
} = schema;

export { db, schema };
