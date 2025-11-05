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

## Progress Tracking (Phase 1) ✅

**Branch:** `feature/content-system`
**Status:** Implemented, tested, working

### User Stats Table
New `user_stats` table for global gamification:
- `totalXp` - Accumulated XP across all courses
- `level` - Calculated from total XP (linear: 100 XP = 1 level)
- `currentStreak` - Days of consecutive activity
- `longestStreak` - Best streak achieved
- `lastActivityDate` - For streak calculation

### Helper Functions (`packages/content/src/progress.ts`)
- `awardXP(userId, amount)` - Award XP, calculate level
- `updateStreak(userId)` - Track daily activity streaks
- `calculateProgress(enrollmentId)` - Calculate % complete
- `checkCourseCompletion(enrollmentId)` - Detect course completion

### New tRPC Endpoints
**Mutation:**
- `courses.markLessonComplete({ courseId, lessonId })` - Complete lesson, award XP, update progress

**Queries:**
- `courses.getUserStats()` - Get user's global stats (XP, level, streaks)
- `courses.getProgress()` - Get current enrollment progress with lesson details
- `courses.canEnroll()` - Check if can enroll in new course

### Lesson Completion Flow
1. Verify user enrollment
2. Verify lesson exists
3. Check if already completed (prevent duplicate XP)
4. Create lesson progress record
5. Award lesson XP
6. Update enrollment progress
7. Update streak
8. Check course completion
9. If complete: award course bonus XP, mark enrollment complete

### XP Formula
- Linear: Every 100 XP = 1 level
- Lesson XP: Defined in lesson frontmatter (`xpReward`)
- Course bonus: Defined in course.json (`gamification.xpReward`)

### Testing
```bash
# Complete a lesson (requires auth token)
curl -X POST http://localhost:3000/trpc/courses.markLessonComplete \
  -H "Authorization: Bearer <token>" \
  -d '{"courseId":"ai-za-zacetnike","lessonId":"uvod-v-ai"}'

# Get user stats
curl http://localhost:3000/trpc/courses.getUserStats \
  -H "Authorization: Bearer <token>"

# Get progress
curl http://localhost:3000/trpc/courses.getProgress \
  -H "Authorization: Bearer <token>"
```

## Next Steps (Not Implemented)

- Frontend integration
- Badge system (course completion badges)
- Achievement system
- Leaderboard (optional)
- User dashboard
- Activity feed

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

---

# tRPC Type Sharing for Frontend (CRITICAL)

## Problem

Frontend (velocity-landing-page) is in a **separate repository**. tRPC v11 requires `AppRouter` type at compile time for type safety. Direct imports cause frontend to compile backend code → build failures.

**Impact:** Frontend currently uses type assertions (stopgap) which loses all compile-time safety:
- ❌ No autocomplete for endpoints
- ❌ No TypeScript errors for typos
- ❌ No input/output validation
- ⚠️ Errors only at runtime

## Solution: Shared Types Package

Export `AppRouter` type as lightweight NPM package (`@kinly/trpc-types`) that frontend can install.

### Implementation (30min)

**1. Create package structure:**
```bash
mkdir -p packages/trpc-types/src
```

**2. `packages/trpc-types/package.json`:**
```json
{
  "name": "@kinly/trpc-types",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsc --emitDeclarationOnly --declaration --declarationMap",
    "dev": "tsc --emitDeclarationOnly --declaration --declarationMap --watch"
  },
  "peerDependencies": {
    "@trpc/server": "^11.0.0"
  }
}
```

**3. `packages/trpc-types/src/index.ts`:**
```typescript
// Re-export AppRouter type for frontend
export type { AppRouter } from '@my-app/api/src/trpc/root';
```

**4. `packages/trpc-types/tsconfig.json`:**
```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "emitDeclarationOnly": true,
    "declaration": true,
    "declarationMap": true
  },
  "include": ["src/**/*"]
}
```

**5. Build and link:**
```bash
cd packages/trpc-types
bun run build        # Creates dist/index.d.ts
npm link             # Makes available locally
```

**6. Frontend uses:**
```typescript
// velocity-landing-page/src/lib/trpc.ts
import type { AppRouter } from '@kinly/trpc-types';  // ✅ Real types
export const api = createTRPCReact<AppRouter>();
```

### Development Workflow

```bash
# Terminal 1: Watch types (rebuilds on API changes)
cd packages/trpc-types && bun run dev

# Terminal 2: Backend dev
bun run dev
```

When you change tRPC routers:
1. Types rebuild automatically (if watch mode)
2. Frontend gets TypeScript errors if breaking changes
3. No manual sync needed

### Production Deployment

Publish to NPM (public or private):
```bash
cd packages/trpc-types
npm publish --access public
```

Frontend installs:
```bash
bun add @kinly/trpc-types
```

### Why This Pattern

- ✅ **No runtime code** - Only `.d.ts` type declarations
- ✅ **Automatic updates** - Types match backend exactly
- ✅ **Frontend type safety** - Catches errors at compile time
- ✅ **Version control** - Can pin to specific API version
- ✅ **Zero backend changes** - Just re-exports existing types

### Reference

- **Frontend request:** `../velocity-landing-page/Docs/11-05-2025/BACKEND_TYPE_SHARING_REQUEST.md`
- **Frontend stopgap:** `../velocity-landing-page/Docs/11-05-2025/TRPC_FIX_APPLIED.md`
- **Status:** Not yet implemented (frontend using type assertions)

### Checklist

⬜ Create `packages/trpc-types` workspace
⬜ Add build script for declarations
⬜ Export `AppRouter` type
⬜ Build package
⬜ Link locally for frontend team
⬜ (Optional) Publish to NPM registry
