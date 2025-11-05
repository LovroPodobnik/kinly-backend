import Database from 'bun:sqlite';
import path from 'path';

// Create SQLite database and run migrations
const dbPath = path.join(process.cwd(), '../../sqlite.db');
const db = new Database(dbPath);

console.log(`📁 Migrating content tables to: ${dbPath}`);

// Create courses table
db.exec(`
CREATE TABLE IF NOT EXISTS courses (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  short_description TEXT NOT NULL,
  description TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  category TEXT NOT NULL,
  estimated_hours INTEGER NOT NULL,
  \`order\` INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  xp_reward INTEGER NOT NULL DEFAULT 0,
  badge_id TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  published_at INTEGER
);
`);

console.log('✅ Created courses table');

// Create lessons table
db.exec(`
CREATE TABLE IF NOT EXISTS lessons (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  content TEXT NOT NULL,
  summary TEXT,
  \`order\` INTEGER NOT NULL,
  duration INTEGER NOT NULL,
  type TEXT NOT NULL DEFAULT 'lesson',
  xp_reward INTEGER NOT NULL DEFAULT 0,
  is_required INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
`);

console.log('✅ Created lessons table');

// Create indexes
db.exec('CREATE INDEX IF NOT EXISTS lessons_course_id_idx ON lessons(course_id);');

// Create user_enrollments table
db.exec(`
CREATE TABLE IF NOT EXISTS user_enrollments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active',
  current_lesson_id TEXT,
  progress INTEGER NOT NULL DEFAULT 0,
  total_xp_earned INTEGER NOT NULL DEFAULT 0,
  streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  enrolled_at INTEGER NOT NULL,
  started_at INTEGER,
  completed_at INTEGER,
  last_accessed_at INTEGER NOT NULL
);
`);

console.log('✅ Created user_enrollments table');

// Create indexes for user_enrollments
db.exec('CREATE INDEX IF NOT EXISTS user_enrollments_user_id_idx ON user_enrollments(user_id);');
db.exec('CREATE INDEX IF NOT EXISTS user_enrollments_course_id_idx ON user_enrollments(course_id);');

// Create user_lesson_progress table
db.exec(`
CREATE TABLE IF NOT EXISTS user_lesson_progress (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'not_started',
  time_spent INTEGER NOT NULL DEFAULT 0,
  completed_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
`);

console.log('✅ Created user_lesson_progress table');

// Create indexes for user_lesson_progress
db.exec('CREATE INDEX IF NOT EXISTS user_lesson_progress_user_id_idx ON user_lesson_progress(user_id);');
db.exec('CREATE INDEX IF NOT EXISTS user_lesson_progress_lesson_id_idx ON user_lesson_progress(lesson_id);');

console.log('🎉 Content tables migration complete!');

db.close();
