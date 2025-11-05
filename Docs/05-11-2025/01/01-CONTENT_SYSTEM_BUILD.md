# Content System Implementation - Agent Onboarding

**Date:** 2025-11-05
**Branch:** `feature/content-system` (10 commits ahead of `main`)
**Status:** ✅ Tested, working, ready for Phase 2 or merge
**Context Window Used:** 184k/200k tokens (92%)

---

## Mission

Build markdown-based course content system for Kinly (Slovenian AI learning platform). No admin UI for MVP. Instructors write markdown files, system syncs to database, serves via tRPC API.

**Core constraint:** Users can only enroll in ONE course at a time (enforces focus).

---

## What Was Built (Session Summary)

### 1. Content Package (`packages/content/`)
- **loader.ts** - Reads markdown files with gray-matter frontmatter parsing
- **cache.ts** - In-memory cache (1min TTL), reduces filesystem reads
- **sync.ts** - Syncs markdown files → database (upserts courses + lessons)
- **Path resolution** - `findProjectRoot()` handles monorepo structure, works from any package

### 2. Database Schema Extensions
**4 new tables added to both SQLite and PostgreSQL schemas:**

```sql
courses                 # Course metadata, XP rewards, difficulty, status
lessons                 # Markdown content, order, duration, type (lesson/quiz/project)
user_enrollments        # Track ONE active course per user, progress %, streak
user_lesson_progress    # Per-lesson completion, time spent, status
```

**Key relationships:**
- User → one active enrollment → one course → many lessons
- Cascade deletes on user/course removal
- Indexes on foreign keys for performance

### 3. Content Sync System
**Flow:** Markdown files → Loader → Cache → Sync → Database → tRPC API

**Triggers:**
- Auto-sync on app startup (`apps/api/src/index.ts`)
- Manual endpoint: `GET /api/sync-content` (dev only)

**Sync behavior:**
- Upserts courses (updates if ID exists)
- Upserts lessons (updates if ID exists)
- Idempotent, safe to run multiple times
- Logs sync status per course

### 4. tRPC Endpoints (`apps/api/src/trpc/routers/courses.ts`)

**Public:**
- `courses.getAll()` - List published courses
- `courses.getById({ id })` - Get course with all lessons (full markdown content)

**Protected (requires auth):**
- `courses.getLesson({ courseId, lessonId })` - Get lesson content (checks enrollment)
- `courses.enroll({ courseId })` - Enroll in course (enforces one-active rule)
- `courses.getCurrentEnrollment()` - Get user's active enrollment with course + lessons

**Tested via curl, all working ✅**

### 5. Example Course Structure
```
content/courses/01-ai-za-zacetnike/
├── course.json                       # Metadata: title, XP, difficulty, etc.
├── 01-uvod-v-ai.md                   # Lesson: frontmatter + markdown body
├── 02-chatgpt-osnove.md              # Lesson
└── 03-projekt-prvi-asistent.md       # Project type lesson (higher XP)
```

**Lesson frontmatter format:**
```yaml
---
id: lesson-slug
title: Lesson Title
slug: lesson-slug
order: 1
duration: 15              # minutes
type: lesson              # or 'quiz', 'project', 'checkpoint'
xpReward: 50
isRequired: true
---
```

---

## Technical Decisions

### Why File-Based CMS?
- **Speed:** No admin UI to build (weeks saved)
- **Version control:** Git tracks all content changes
- **Editor freedom:** Write in VSCode/Cursor, any tool
- **Simple workflow:** Edit markdown → commit → deploy → auto-sync
- **Good enough for MVP:** Can add web editor later if needed

### Why One Active Course?
- User focus (prevents course-hopping)
- Simpler progress tracking
- Better completion rates (product requirement from brainstorming)

### Why Dual Schemas (SQLite + PostgreSQL)?
- SQLite for local dev (fast, no setup)
- PostgreSQL for production (Fly.io deployment)
- Drizzle maintains both automatically

### Known Limitation
`drizzle-kit push` doesn't work with Bun's native SQLite. Workaround: `packages/db/migrate-content.ts` creates tables directly via Bun SQLite API.

---

## File Locations (Critical Paths)

```
content/courses/                          # SOURCE OF TRUTH (Git-versioned)
├── 01-ai-za-zacetnike/                   # Example course
│   ├── course.json
│   └── *.md lessons

packages/content/
├── src/loader.ts                         # Markdown reader
├── src/cache.ts                          # Cache layer
├── src/sync.ts                           # DB sync logic
└── package.json                          # Dep: gray-matter@^4.0.3

packages/db/src/
├── schema.ts                             # SQLite schema
├── schema-postgres.ts                    # PostgreSQL schema
├── migrate-content.ts                    # Manual migration (run once)
└── index.ts                              # Exports: courses, lessons, userEnrollments, userLessonProgress

apps/api/src/
├── index.ts                              # Startup sync integration
├── trpc/routers/courses.ts               # Course endpoints
└── trpc/root.ts                          # Router: courses added

claude.md                                 # Agent memory (architecture docs)
```

---

## Commands Reference

### Setup (First Time)
```bash
# Create content tables
bun run packages/db/migrate-content.ts

# Start dev server (auto-syncs content)
bun run dev
```

### Add New Course
```bash
# 1. Create directory
mkdir content/courses/02-new-course

# 2. Add course.json + lesson markdown files

# 3. Restart server (auto-syncs)
bun run dev

# 4. Commit to Git
git add content/
git commit -m "Add new course: ..."
```

### Manual Content Sync
```bash
# Dev only
curl http://localhost:3000/api/sync-content
```

### Test Endpoints
```bash
# List all courses
curl http://localhost:3000/trpc/courses.getAll

# Get course with lessons
curl "http://localhost:3000/trpc/courses.getById?input=%7B%22id%22%3A%22ai-za-zacetnike%22%7D"
```

---

## What's NOT Implemented Yet

From brainstorming session, next priorities:

### Phase 1: Core User Flow (Next)
- [ ] Lesson completion endpoint (`markLessonComplete`)
- [ ] Award XP on completion
- [ ] Update progress percentage
- [ ] Detect course completion
- [ ] Allow enrollment in next course after completion

### Phase 2: Gamification
- [ ] User stats table (totalXp, level, streak)
- [ ] XP → Level calculation
- [ ] Streak tracking (daily activity)
- [ ] Badge system (course completion badges)

### Phase 3: Polish
- [ ] Leaderboard (optional)
- [ ] User dashboard data
- [ ] Recent activity feed

---

## Current State of Data

**Database:**
- ✅ Tables created (SQLite dev)
- ✅ 1 course synced: "AI za začetnike"
- ✅ 3 lessons synced
- ⬜ No enrollments yet (no user flow implemented)
- ⬜ No progress records yet

**Git:**
- ✅ Feature branch: `feature/content-system`
- ✅ 10 commits (clean history)
- ✅ Pushed to GitHub
- ✅ Main branch untouched (safe backup)

---

## How to Continue (Agent Instructions)

### Option A: Merge to Main
```bash
git checkout main
git merge feature/content-system
git push origin main
```
**When:** Content system stable, deploy as-is, build user flow later.

### Option B: Continue on Feature Branch
Stay on `feature/content-system`, implement Phase 1 (lesson completion), then merge everything together.

### Option C: New Feature Branch
```bash
git checkout main
git merge feature/content-system
git push origin main
git checkout -b feature/progress-tracking
```
**When:** Want to keep features isolated, merge content system first.

---

## Testing Checklist

✅ Content loads from markdown files
✅ Database sync works
✅ tRPC endpoints return correct data
✅ One-course-at-a-time enforcement
✅ Server startup sync
✅ Monorepo path resolution
⬜ Enrollment flow (no frontend yet)
⬜ Progress tracking (not implemented)
⬜ XP system (not implemented)
⬜ Course completion (not implemented)

---

## Important Context

### User Story (from brainstorming)
- User visits landing page (Kinly)
- Signs up / activates account
- Sees list of available courses
- Picks ONE course to start
- Goes through lessons one by one
- Earns XP per lesson
- Completes course → earns badge + bonus XP
- Can then pick next course
- Sees progress, streak, level (gamification)

### Product Requirements
- Simple system (MVP)
- No videos for now (text-based lessons)
- Tracking + gamification essential
- One course at a time (user focus)
- Content prepared separately (not by agent)
- Backend builds the pipes

### Tech Stack
- **Runtime:** Bun
- **API:** Hono + tRPC
- **Auth:** BetterAuth (already implemented on main)
- **DB:** Drizzle ORM (SQLite dev, PostgreSQL prod)
- **Monorepo:** Turborepo + workspaces
- **Content:** Markdown + frontmatter (gray-matter)

---

## Agent Handoff Notes

**If continuing from here:**
1. Read `claude.md` for architecture overview
2. Check branch: `git status` (should be on `feature/content-system`)
3. Review endpoints in `apps/api/src/trpc/routers/courses.ts`
4. Next logical step: Implement `markLessonComplete` endpoint
5. Then: XP award logic, progress calculation, course completion detection

**Context preserved in:**
- This file (`Docs/05-11-2025/01-CONTENT_SYSTEM_BUILD.md`)
- `claude.md` (architecture reference)
- Git history (`git log feature/content-system`)

**If stuck:**
- Check `claude.md` for commands
- Run `bun run dev` and test endpoints
- Schema is in `packages/db/src/schema*.ts`
- Example course is in `content/courses/01-ai-za-zacetnike/`

---

## Commits on Feature Branch

```
cbe6689 docs: add content system architecture to claude.md
469a122 feat: add SQLite content tables migration script
c8f1f37 fix: correct content directory path for monorepo
0555bc7 chore: add content package dependency to API
e335f6c feat: integrate content sync into API startup
c4ffffe feat: add tRPC courses endpoints
92b6797 feat: add content sync utility
866cc71 feat: add database schema for content management
b7db8ff feat: add example course content structure
75d7363 feat: add content package with loader and cache system
```

**Clean, atomic commits. Ready to merge or continue.**

---

**End of agent handoff document.**
**Session complete. Next agent: Pick up from Phase 1 or merge to main.**
