# Progress Tracking Implementation - Agent Onboarding

**Date:** 2025-11-05
**Branch:** TBD (continue `feature/content-system` or create `feature/progress-tracking`)
**Prerequisites:** Content system complete (see `01-CONTENT_SYSTEM_BUILD.md`)
**Status:** 🔜 Ready to start

---

## Mission

Implement Phase 1: Core User Flow - lesson completion tracking, XP awards, progress calculation, course completion detection.

**Goal:** Enable users to complete lessons, earn XP, track progress, and complete courses.

---

## What Needs to Be Built

### 1. Lesson Completion Endpoint

**tRPC mutation:** `courses.markLessonComplete`

**Input:**
```typescript
{
  courseId: string
  lessonId: string
}
```

**Business Logic:**
1. Verify user is enrolled in course (check `user_enrollments` for active enrollment)
2. Check if lesson exists and belongs to course
3. Create or update `user_lesson_progress` record:
   - Set `status = 'completed'`
   - Set `completed_at = now()`
   - Increment `time_spent` if tracking
4. Award XP to user (lesson XP reward)
5. Update enrollment progress percentage
6. Check if course is complete (all required lessons done)
7. If course complete:
   - Set enrollment `status = 'completed'`
   - Set `completed_at = now()`
   - Award course completion XP bonus
   - Unlock next course enrollment

**Output:**
```typescript
{
  success: boolean
  xpAwarded: number
  totalXp: number
  progressPercentage: number
  courseCompleted: boolean
  nextCourseUnlocked?: boolean
}
```

---

### 2. User Stats Tracking

**Option A: Extend `users` table**
Add columns:
- `total_xp` (integer, default 0)
- `level` (integer, default 1)
- `current_streak` (integer, default 0)
- `longest_streak` (integer, default 0)
- `last_activity_date` (timestamp/integer)

**Option B: Create `user_stats` table** (recommended for flexibility)
```sql
CREATE TABLE user_stats (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  total_xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_activity_date INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
```

**Decision needed:** Which approach? (Recommend Option B for separation of concerns)

---

### 3. XP Award Logic

**Function:** `awardXP(userId: string, amount: number)`

**Steps:**
1. Get or create user stats
2. Add XP to `total_xp`
3. Calculate new level (if XP threshold crossed)
4. Update streak (if new day)
5. Save stats
6. Return updated stats

**XP to Level Formula (suggested):**
```typescript
function calculateLevel(totalXp: number): number {
  // Simple: Every 100 XP = 1 level
  return Math.floor(totalXp / 100) + 1

  // OR exponential: Level 1 = 100 XP, Level 2 = 250 XP, Level 3 = 450 XP...
  // return Math.floor(Math.sqrt(totalXp / 50)) + 1
}
```

**Decision needed:** Which XP formula?

---

### 4. Progress Percentage Calculation

**Function:** `calculateProgress(enrollmentId: string)`

**Steps:**
1. Get all lessons for course
2. Count required lessons
3. Count completed required lessons
4. Calculate: `(completed / total) * 100`
5. Update `user_enrollments.progress`

---

### 5. Course Completion Detection

**Function:** `checkCourseCompletion(enrollmentId: string)`

**Steps:**
1. Get all required lessons for course
2. Get user's lesson progress
3. If all required lessons completed:
   - Set enrollment `status = 'completed'`
   - Set `completed_at = now()`
   - Award course completion bonus XP
   - Return `true`
4. Else return `false`

---

### 6. Streak Tracking

**Function:** `updateStreak(userId: string)`

**Logic:**
1. Get user stats
2. Get `last_activity_date`
3. Check if today is new day:
   - If yesterday: increment `current_streak`
   - If same day: no change
   - If gap > 1 day: reset `current_streak = 1`
4. Update `longest_streak` if current > longest
5. Set `last_activity_date = today`

**Call on:** Every lesson completion

---

### 7. New Endpoints to Add

**tRPC queries:**
```typescript
// Get user stats
courses.getUserStats()
// Returns: { totalXp, level, currentStreak, longestStreak }

// Get progress for current enrollment
courses.getProgress()
// Returns: { progressPercentage, lessonsCompleted, totalLessons, currentLesson }

// Check if can enroll in new course (after completion)
courses.canEnroll()
// Returns: { canEnroll: boolean, reason?: string }
```

---

## Database Schema Changes

### New Table (if Option B chosen):
```sql
CREATE TABLE user_stats (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  total_xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_activity_date INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
```

### Existing Tables (no changes needed)
- `user_enrollments` - already has `progress`, `total_xp_earned`, `streak`
- `user_lesson_progress` - already has `status`, `completed_at`
- `lessons` - already has `xp_reward`
- `courses` - already has `xp_reward` (bonus for completion)

**Note:** `user_enrollments` already tracks some stats per course. `user_stats` would track global user stats across all courses.

---

## File Locations (Where to Add Code)

```
packages/db/src/
├── schema.ts                             # Add user_stats table (SQLite)
├── schema-postgres.ts                    # Add user_stats table (PostgreSQL)
├── migrate-stats.ts                      # NEW: Migration script for user_stats
└── index.ts                              # Export user_stats table

apps/api/src/trpc/routers/
├── courses.ts                            # ADD: markLessonComplete, getUserStats, getProgress
└── progress.ts                           # NEW (optional): Separate router for progress logic

packages/content/src/
└── progress.ts                           # NEW: Helper functions (awardXP, calculateProgress, etc.)
```

---

## Implementation Plan

### Step 1: Database Schema
- [ ] Decide: Extend `users` table OR create `user_stats` table
- [ ] Add table to both SQLite and PostgreSQL schemas
- [ ] Create migration script (`migrate-stats.ts`)
- [ ] Run migration
- [ ] Export table in `packages/db/src/index.ts`

### Step 2: Helper Functions
- [ ] Create `packages/content/src/progress.ts`
- [ ] Implement `awardXP(userId, amount)`
- [ ] Implement `calculateProgress(enrollmentId)`
- [ ] Implement `checkCourseCompletion(enrollmentId)`
- [ ] Implement `updateStreak(userId)`
- [ ] Decide XP to Level formula

### Step 3: Lesson Completion Endpoint
- [ ] Add `courses.markLessonComplete` mutation in `courses.ts`
- [ ] Validate user enrollment
- [ ] Update lesson progress
- [ ] Award XP
- [ ] Update enrollment progress
- [ ] Check course completion
- [ ] Update streak
- [ ] Return response with stats

### Step 4: Stats Endpoints
- [ ] Add `courses.getUserStats` query
- [ ] Add `courses.getProgress` query
- [ ] Add `courses.canEnroll` query (check if active enrollment exists)

### Step 5: Testing
- [ ] Test lesson completion flow (curl or frontend)
- [ ] Verify XP awarded correctly
- [ ] Verify progress percentage updates
- [ ] Verify course completion detection
- [ ] Verify streak tracking
- [ ] Test edge cases (re-completing lesson, non-enrolled user, etc.)

### Step 6: Documentation
- [ ] Update `claude.md` with progress tracking info
- [ ] Document new endpoints
- [ ] Add testing examples
- [ ] Update Phase 1 checklist

---

## Decisions Needed

### 1. User Stats Storage
**Option A:** Extend `users` table
- ✅ Simpler (no new table)
- ❌ Mixes user identity with gamification data

**Option B:** Create `user_stats` table
- ✅ Clean separation of concerns
- ✅ Easier to extend later (badges, achievements)
- ❌ Extra join for queries

**Recommendation:** Option B (`user_stats` table)

---

### 2. XP to Level Formula
**Option A:** Linear (every 100 XP = 1 level)
- ✅ Simple, predictable
- ❌ No scaling challenge

**Option B:** Exponential (sqrt formula)
- ✅ More engaging long-term
- ❌ Harder to balance

**Recommendation:** Start with linear, adjust later based on feedback

---

### 3. Router Organization
**Option A:** Add all to `courses.ts`
- ✅ All course-related logic in one place
- ❌ File gets large

**Option B:** Create separate `progress.ts` router
- ✅ Better separation
- ❌ More files

**Recommendation:** Start with Option A, refactor if needed

---

## Testing Plan

### Manual Testing (curl)

**1. Complete a lesson:**
```bash
curl -X POST http://localhost:3000/trpc/courses.markLessonComplete \
  -H "Authorization: Bearer <token>" \
  -d '{"courseId":"ai-za-zacetnike","lessonId":"uvod-v-ai"}'
```

**2. Get user stats:**
```bash
curl http://localhost:3000/trpc/courses.getUserStats \
  -H "Authorization: Bearer <token>"
```

**3. Get progress:**
```bash
curl http://localhost:3000/trpc/courses.getProgress \
  -H "Authorization: Bearer <token>"
```

### Edge Cases to Test
- Re-completing same lesson (should not award XP twice)
- Completing lesson without enrollment (should fail)
- Completing all lessons (should trigger course completion)
- Streak tracking across days

---

## Expected Outcomes

After implementation:
- ✅ Users can complete lessons via API
- ✅ XP awarded on completion
- ✅ Progress percentage updates
- ✅ Course completion detected
- ✅ Streak tracking works
- ✅ User stats queryable via API
- ✅ One-course constraint still enforced

---

## Next Steps After Phase 1

**Phase 2: Gamification Enhancement**
- Badge system (course completion badges)
- Achievement system
- Level-up notifications
- Streak milestones

**Phase 3: Polish**
- Leaderboard (optional)
- User dashboard data
- Recent activity feed
- Analytics

---

## Context from Previous Session

**Content System Status:**
- ✅ Markdown loader working
- ✅ Database sync working
- ✅ tRPC endpoints working
- ✅ Enrollment system working
- ✅ One-course constraint enforced

**Git State:**
- Branch: `feature/content-system`
- 10 commits ahead of main
- All tested and working

**Important Files:**
- `claude.md` - Architecture reference
- `Docs/05-11-2025/01/01-CONTENT_SYSTEM_BUILD.md` - Previous session docs

---

## Agent Instructions

**Before starting:**
1. Decide on user stats storage (Option A or B)
2. Decide on XP formula (linear or exponential)
3. Check branch (`git status`)
4. Review existing schema (`packages/db/src/schema*.ts`)

**During implementation:**
1. Use TodoWrite tool to track progress
2. Make small, atomic commits
3. Test each endpoint as you build it
4. Update `claude.md` with new architecture

**When stuck:**
- Check existing `user_enrollments` table (already has some progress tracking)
- Review tRPC patterns in `apps/api/src/trpc/routers/courses.ts`
- Check database schema in `packages/db/src/schema*.ts`

---

**Ready to start Phase 1!**
**Next agent: Begin with Step 1 (Database Schema).**
