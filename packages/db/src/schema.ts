import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

// Users Table (Core; updated for Better Auth)
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  emailVerified: integer('email_verified', { mode: 'boolean' }).default(false),
  name: text('name'),
  image: text('image'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),

  // Waitlist/User Status Fields
  status: text('status').notNull().default('waitlist'), // 'waitlist', 'active', 'premium', etc.
  interests: text('interests'), // AI course topics they're interested in
  signupSource: text('signup_source'), // Track where they signed up (landing page, referral, etc.)
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

// Sessions Table (Required for session management)
export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  token: text('token').notNull().unique(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
}, (table) => ({
  userIdIdx: index('sessions_user_id_idx').on(table.userId),
}));

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;

// Accounts Table (Required for OAuth/social providers)
export const accounts = sqliteTable('accounts', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: integer('access_token_expires_at', { mode: 'timestamp' }),
  refreshTokenExpiresAt: integer('refresh_token_expires_at', { mode: 'timestamp' }),
  scope: text('scope'),
  password: text('password'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  userIdIdx: index('accounts_user_id_idx').on(table.userId),
}));

export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;

// Verification Tokens Table (For email verification, password resets)
export const verifications = sqliteTable('verifications', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export type Verification = typeof verifications.$inferSelect;
export type NewVerification = typeof verifications.$inferInsert;

// Relationships (For type-safe joins in Drizzle)
export const usersRelations = relations(users, ({ one, many }) => ({
  sessions: many(sessions),
  accounts: many(accounts),
  stats: one(userStats, {
    fields: [users.id],
    references: [userStats.userId],
  }),
  enrollments: many(userEnrollments),
  lessonProgress: many(userLessonProgress),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

// ============================================
// CONTENT MANAGEMENT TABLES
// ============================================

// Courses Table
export const courses = sqliteTable('courses', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  slug: text('slug').notNull().unique(),
  shortDescription: text('short_description').notNull(),
  description: text('description').notNull(),
  difficulty: text('difficulty').notNull(), // 'beginner', 'intermediate', 'advanced'
  category: text('category').notNull(),
  estimatedHours: integer('estimated_hours').notNull(),
  order: integer('order').notNull(),
  status: text('status').notNull().default('draft'), // 'draft', 'published', 'archived'
  xpReward: integer('xp_reward').notNull().default(0),
  badgeId: text('badge_id'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  publishedAt: integer('published_at', { mode: 'timestamp' }),
});

export type Course = typeof courses.$inferSelect;
export type NewCourse = typeof courses.$inferInsert;

// Lessons Table
export const lessons = sqliteTable('lessons', {
  id: text('id').primaryKey(),
  courseId: text('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  slug: text('slug').notNull(),
  content: text('content').notNull(), // Markdown content
  summary: text('summary'),
  order: integer('order').notNull(),
  duration: integer('duration').notNull(), // Minutes
  type: text('type').notNull().default('lesson'), // 'lesson', 'quiz', 'project', 'checkpoint'
  xpReward: integer('xp_reward').notNull().default(0),
  isRequired: integer('is_required', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  courseIdIdx: index('lessons_course_id_idx').on(table.courseId),
}));

export type Lesson = typeof lessons.$inferSelect;
export type NewLesson = typeof lessons.$inferInsert;

// User Enrollments (one active course at a time)
export const userEnrollments = sqliteTable('user_enrollments', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  courseId: text('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  status: text('status').notNull().default('active'), // 'active', 'completed', 'abandoned'
  currentLessonId: text('current_lesson_id'),
  progress: integer('progress').notNull().default(0), // Percentage 0-100
  totalXpEarned: integer('total_xp_earned').notNull().default(0),
  streak: integer('streak').notNull().default(0),
  longestStreak: integer('longest_streak').notNull().default(0),
  enrolledAt: integer('enrolled_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  startedAt: integer('started_at', { mode: 'timestamp' }),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  lastAccessedAt: integer('last_accessed_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  userIdIdx: index('user_enrollments_user_id_idx').on(table.userId),
  courseIdIdx: index('user_enrollments_course_id_idx').on(table.courseId),
}));

export type UserEnrollment = typeof userEnrollments.$inferSelect;
export type NewUserEnrollment = typeof userEnrollments.$inferInsert;

// User Lesson Progress
export const userLessonProgress = sqliteTable('user_lesson_progress', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  lessonId: text('lesson_id').notNull().references(() => lessons.id, { onDelete: 'cascade' }),
  courseId: text('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  status: text('status').notNull().default('not_started'), // 'not_started', 'in_progress', 'completed'
  timeSpent: integer('time_spent').notNull().default(0), // Seconds
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  userIdIdx: index('user_lesson_progress_user_id_idx').on(table.userId),
  lessonIdIdx: index('user_lesson_progress_lesson_id_idx').on(table.lessonId),
}));

export type UserLessonProgress = typeof userLessonProgress.$inferSelect;
export type NewUserLessonProgress = typeof userLessonProgress.$inferInsert;

// User Stats (Global gamification stats across all courses)
export const userStats = sqliteTable('user_stats', {
  userId: text('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  totalXp: integer('total_xp').notNull().default(0),
  level: integer('level').notNull().default(1),
  currentStreak: integer('current_streak').notNull().default(0),
  longestStreak: integer('longest_streak').notNull().default(0),
  lastActivityDate: integer('last_activity_date', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export type UserStats = typeof userStats.$inferSelect;
export type NewUserStats = typeof userStats.$inferInsert;

// Relations
export const coursesRelations = relations(courses, ({ many }) => ({
  lessons: many(lessons),
  enrollments: many(userEnrollments),
}));

export const lessonsRelations = relations(lessons, ({ one, many }) => ({
  course: one(courses, {
    fields: [lessons.courseId],
    references: [courses.id],
  }),
  progress: many(userLessonProgress),
}));

export const userEnrollmentsRelations = relations(userEnrollments, ({ one }) => ({
  user: one(users, {
    fields: [userEnrollments.userId],
    references: [users.id],
  }),
  course: one(courses, {
    fields: [userEnrollments.courseId],
    references: [courses.id],
  }),
}));

export const userLessonProgressRelations = relations(userLessonProgress, ({ one }) => ({
  user: one(users, {
    fields: [userLessonProgress.userId],
    references: [users.id],
  }),
  lesson: one(lessons, {
    fields: [userLessonProgress.lessonId],
    references: [lessons.id],
  }),
  course: one(courses, {
    fields: [userLessonProgress.courseId],
    references: [courses.id],
  }),
}));

export const userStatsRelations = relations(userStats, ({ one }) => ({
  user: one(users, {
    fields: [userStats.userId],
    references: [users.id],
  }),
}));
