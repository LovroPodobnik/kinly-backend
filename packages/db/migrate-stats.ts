import Database from 'bun:sqlite';
import path from 'path';

// Create SQLite database and run migrations
const dbPath = path.join(process.cwd(), '../../sqlite.db');
const db = new Database(dbPath);

console.log(`📁 Migrating user stats table to: ${dbPath}`);

// Create user_stats table
db.exec(`
CREATE TABLE IF NOT EXISTS user_stats (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  total_xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_activity_date INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
`);

console.log('✅ Created user_stats table');

console.log('🎉 User stats table migration complete!');

db.close();
