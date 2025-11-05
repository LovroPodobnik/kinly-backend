# Production Database Access

## Quick Connect to Production Postgres

```bash
# Interactive SQL console
fly postgres connect -a my-better-t-app-db -d my_better_t_app_shy_sky_8404

# Run single query
echo "SELECT * FROM users;" | fly postgres connect -a my-better-t-app-db -d my_better_t_app_shy_sky_8404

# Run multiple commands
fly postgres connect -a my-better-t-app-db -d my_better_t_app_shy_sky_8404 <<'EOF'
SELECT COUNT(*) FROM users;
SELECT email, name, status FROM users ORDER BY created_at DESC;
EOF
```

## Database Info

- **App name**: `my-better-t-app-db`
- **Database name**: `my_better_t_app_shy_sky_8404`
- **Hostname**: `postgresql://my-better-t-app-db.flycast`

## Common Operations

```sql
-- View all users
SELECT email, name, status, created_at FROM users ORDER BY created_at DESC;

-- Count users
SELECT COUNT(*) FROM users;

-- Clean test data
DELETE FROM users WHERE email LIKE '%example.com%';

-- View all tables
\dt

-- Exit console
\q
```

## WARNING

**This is unmanaged Postgres** - you are responsible for:
- Backups
- Disaster recovery
- All operations

Consider upgrading to Managed Postgres: `fly mpg`

---

# Content System Architecture (Markdown-Based CMS)

## Overview

File-based content management: Markdown files → Database sync → tRPC API. No admin UI needed for MVP.

**Branch:** `feature/content-system` (9 commits ahead of `main`)
**Status:** ✅ Tested, working, ready to merge

## File Structure

```
content/courses/                          # Source of truth (Git-versioned)
└── 01-ai-za-zacetnike/
    ├── course.json                       # Metadata (title, XP, difficulty, etc.)
    ├── 01-uvod-v-ai.md                   # Lesson markdown with frontmatter
    ├── 02-chatgpt-osnove.md
    └── 03-projekt-prvi-asistent.md

packages/content/                         # Content loader package
├── src/loader.ts                         # Read markdown, parse frontmatter (gray-matter)
├── src/cache.ts                          # In-memory cache (1min TTL)
├── src/sync.ts                           # Sync files → database (upsert)
└── package.json                          # Dep: gray-matter@^4.0.3

packages/db/src/
├── schema.ts                             # SQLite schema (dev)
├── schema-postgres.ts                    # PostgreSQL schema (prod)
└── migrate-content.ts                    # Manual migration script (Bun SQLite)

apps/api/src/
├── index.ts                              # Auto-sync on startup
├── trpc/routers/courses.ts               # Course endpoints
└── trpc/root.ts                          # Router registry
```

## Database Schema

**Tables added:**
- `courses` - Course metadata, XP rewards, status
- `lessons` - Markdown content, order, duration, type
- `user_enrollments` - Track ONE active course per user
- `user_lesson_progress` - Completion tracking, time spent

**Key constraint:** User can only enroll in ONE course at a time (enforced in API).

## Data Flow

```
1. Markdown files (content/courses/)
   ↓ (on startup or manual trigger)
2. Content Loader (packages/content/src/loader.ts)
   ↓ (reads files, parses frontmatter)
3. Content Cache (1min TTL, in-memory)
   ↓ (on sync)
4. Database Sync (packages/content/src/sync.ts)
   ↓ (upsert courses + lessons)
5. SQLite/PostgreSQL
   ↓ (via tRPC)
6. API Endpoints (apps/api/src/trpc/routers/courses.ts)
```

## API Endpoints (tRPC)

**Public:**
- `courses.getAll()` - List published courses
- `courses.getById({ id })` - Get course + all lessons

**Protected (requires auth):**
- `courses.getLesson({ courseId, lessonId })` - Get lesson content
- `courses.enroll({ courseId })` - Enroll in course (enforces one active)
- `courses.getCurrentEnrollment()` - Get user's active course

**Test:**
```bash
curl http://localhost:3000/trpc/courses.getAll
curl "http://localhost:3000/trpc/courses.getById?input=%7B%22id%22%3A%22ai-za-zacetnike%22%7D"
```

## Commands

**Setup (first time):**
```bash
# Create tables (SQLite only - drizzle-kit doesn't work with Bun SQLite)
bun run packages/db/migrate-content.ts

# Or manually via server startup (auto-creates on first run)
bun run dev
```

**Dev workflow:**
```bash
# Start server (auto-syncs content on startup)
bun run dev

# Manual sync (dev only, endpoint added)
curl http://localhost:3000/api/sync-content

# Add new course: Just create markdown files, restart server
mkdir content/courses/02-new-course
# Add course.json + lesson markdown files
bun run dev  # Auto-syncs
```

**Production:**
- Content syncs automatically on app startup
- PostgreSQL schema matches SQLite (dual schemas maintained)
- Tables created via Drizzle migrations or manual SQL

## Important Patterns

**Lesson Markdown Format:**
```markdown
---
id: lesson-slug
title: Lesson Title
slug: lesson-slug
order: 1
duration: 15
type: lesson  # or 'quiz', 'project', 'checkpoint'
xpReward: 50
isRequired: true
---

# Lesson Content

Markdown body here...
```

**Course Metadata (course.json):**
```json
{
  "id": "course-slug",
  "title": "Course Title",
  "slug": "course-slug",
  "description": "...",
  "difficulty": "beginner",
  "estimatedHours": 8,
  "order": 1,
  "status": "published",
  "gamification": {
    "xpReward": 500,
    "badgeId": "badge-id"
  },
  "published": true
}
```

## Path Resolution

`packages/content/src/loader.ts` uses `findProjectRoot()` to locate `content/courses/` from any working directory (handles monorepo structure).

## Known Issues

- `drizzle-kit push` doesn't work with Bun's native SQLite (use `migrate-content.ts` instead)
- Content cache is in-memory only (reset on server restart, acceptable for MVP)

## Next Steps (Not Implemented)

- User enrollment flow (frontend)
- Lesson completion tracking
- XP/level system
- Streak tracking
- Badge system
- User progress queries
- Course completion logic

## Git Branch State

```bash
# Current branch
git checkout feature/content-system

# View commits
git log --oneline --graph feature/content-system ^main

# Merge to main (when ready)
git checkout main
git merge feature/content-system
git push origin main
```

## Testing Checklist

✅ Content loads from markdown files
✅ Database sync works
✅ tRPC endpoints return data
✅ One-course-at-a-time enforcement
✅ Server startup sync
⬜ Enrollment flow (not yet implemented)
⬜ Progress tracking (not yet implemented)
