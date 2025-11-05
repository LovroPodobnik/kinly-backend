import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const queryClient = postgres(DATABASE_URL, { max: 1 });
const db = drizzle(queryClient);

console.log('Running PostgreSQL migrations...');
await migrate(db, { migrationsFolder: './migrations-postgres' });
console.log('Migrations completed successfully!');
await queryClient.end();
