# Kinly Backend API Reference - Frontend Developer Guide

**Date:** 2025-11-05
**API Version:** v1 (feature/content-system branch)
**Status:** ✅ Implemented, tested, ready for frontend integration
**Base URL:** `http://localhost:3000` (dev) | `https://api.kinly.si` (prod, TBD)

---

## Table of Contents
1. [Authentication](#authentication)
2. [tRPC Endpoints](#trpc-endpoints)
3. [Data Types](#data-types)
4. [User Flows](#user-flows)
5. [Error Handling](#error-handling)

---

## Authentication

**System:** BetterAuth (already implemented)
**Endpoints:** `/api/auth/*`

### Auth Flow
```typescript
// Sign up / Sign in
POST /api/auth/sign-up
POST /api/auth/sign-in

// Session check
GET /api/auth/session

// Sign out
POST /api/auth/sign-out
```

### Protected Endpoints
All tRPC endpoints with `protected` require valid session token.
- Include session cookie automatically (httpOnly cookie)
- Frontend: Use BetterAuth client library for session management

---

## tRPC Endpoints

**Base Path:** `/trpc/*`
**Protocol:** tRPC (type-safe RPC)

### Courses Router (`/trpc/courses.*`)

#### Public Endpoints (No Auth Required)

##### `courses.getAll()`
Get all published courses for course selection screen.

**Request:** None

**Response:**
```typescript
{
  id: string;              // "ai-za-zacetnike"
  title: string;           // "AI za začetnike"
  slug: string;            // "ai-za-zacetnike"
  shortDescription: string;
  description: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  category: string;
  estimatedHours: number;  // 8
  order: number;           // Display order
  status: "published";
  xpReward: number;        // Course completion bonus XP
  badgeId: string | null;
  createdAt: Date;
  updatedAt: Date;
  publishedAt: Date | null;
}[]
```

**Use Case:** Display course catalog on homepage/browse page.

---

##### `courses.getById({ id: string })`
Get single course with all lessons (for course details page).

**Request:**
```typescript
{ id: "ai-za-zacetnike" }
```

**Response:**
```typescript
{
  ...courseFields,
  lessons: [
    {
      id: string;           // "uvod-v-ai"
      courseId: string;
      title: string;
      slug: string;
      content: string;      // Full markdown content
      summary: string | null;
      order: number;
      duration: number;     // Minutes
      type: "lesson" | "quiz" | "project" | "checkpoint";
      xpReward: number;
      isRequired: boolean;
      createdAt: Date;
      updatedAt: Date;
    }
  ]
}
```

**Use Case:** Course details page before enrollment.

---

#### Protected Endpoints (Auth Required)

##### `courses.enroll({ courseId: string })`
Enroll user in a course.

**Request:**
```typescript
{ courseId: "ai-za-zacetnike" }
```

**Response:**
```typescript
{
  success: boolean;
  enrollmentId: string;
}
```

**Errors:**
- "Already enrolled in another course. Complete it first." (one-course-at-a-time rule)
- "Course not found"

**Use Case:** "Start Course" button click.

---

##### `courses.getCurrentEnrollment()`
Get user's active enrollment with course and lessons.

**Request:** None

**Response:**
```typescript
{
  id: string;               // enrollmentId
  userId: string;
  courseId: string;
  status: "active" | "completed" | "abandoned";
  currentLessonId: string | null;
  progress: number;         // 0-100 percentage
  totalXpEarned: number;    // XP from this course
  streak: number;
  longestStreak: number;
  enrolledAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  lastAccessedAt: Date;
  course: {
    ...courseFields,
    lessons: Lesson[]
  }
} | null  // null if no active enrollment
```

**Use Case:** Display user's current course on dashboard.

---

##### `courses.getLesson({ courseId: string, lessonId: string })`
Get single lesson content (requires enrollment).

**Request:**
```typescript
{
  courseId: "ai-za-zacetnike",
  lessonId: "uvod-v-ai"
}
```

**Response:**
```typescript
{
  id: string;
  courseId: string;
  title: string;
  slug: string;
  content: string;      // Markdown content to render
  summary: string | null;
  order: number;
  duration: number;
  type: string;
  xpReward: number;
  isRequired: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

**Errors:**
- "Not enrolled in this course"
- "Lesson not found"

**Use Case:** Lesson viewer page.

---

##### `courses.markLessonComplete({ courseId: string, lessonId: string })`
Mark lesson as complete, award XP, update progress.

**Request:**
```typescript
{
  courseId: "ai-za-zacetnike",
  lessonId: "uvod-v-ai"
}
```

**Response:**
```typescript
{
  success: boolean;
  alreadyCompleted: boolean;     // true if lesson was already done
  xpAwarded: number;             // XP from this lesson
  totalXp: number;               // User's total XP (all courses)
  level: number;                 // User's level
  progressPercentage: number;    // Course progress 0-100
  courseCompleted: boolean;      // true if course just completed
  courseCompletionBonus: number; // Bonus XP if course completed
}
```

**Use Case:**
- "Mark as Complete" button
- Show XP animation: `+${xpAwarded} XP`
- Show level up if level changed
- Show course completion modal if `courseCompleted === true`

---

##### `courses.getUserStats()`
Get user's global stats (XP, level, streaks).

**Request:** None

**Response:**
```typescript
{
  userId: string;
  totalXp: number;         // Total XP across all courses
  level: number;           // Calculated: Math.floor(totalXp / 100) + 1
  currentStreak: number;   // Days of consecutive activity
  longestStreak: number;   // Best streak achieved
  lastActivityDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
```

**Default (no stats yet):**
```typescript
{
  totalXp: 0,
  level: 1,
  currentStreak: 0,
  longestStreak: 0,
  lastActivityDate: null
}
```

**Use Case:** Display in user profile, dashboard header.

---

##### `courses.getProgress()`
Get detailed progress for current enrollment.

**Request:** None

**Response:**
```typescript
{
  enrollmentId: string;
  courseId: string;
  courseName: string;
  progressPercentage: number;  // 0-100
  lessonsCompleted: number;
  totalLessons: number;        // Required lessons only
  currentLesson: {
    id: string;
    title: string;
    slug: string;
    order: number;
  } | null,  // null if all complete
  totalXpEarned: number;       // XP from this course
  streak: number;
} | null  // null if no active enrollment
```

**Use Case:**
- Progress bar: `${progressPercentage}%`
- Display: "Lesson 3 of 10 complete"
- Next lesson CTA

---

##### `courses.canEnroll()`
Check if user can enroll in new course.

**Request:** None

**Response:**
```typescript
{
  canEnroll: boolean;
  reason: string | null;  // "Already enrolled in an active course. Complete it first."
  activeEnrollmentId: string | null;
}
```

**Use Case:**
- Show/hide "Start Course" button
- Display message if can't enroll

---

## Data Types

### Course
```typescript
interface Course {
  id: string;
  title: string;
  slug: string;
  shortDescription: string;
  description: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  category: string;
  estimatedHours: number;
  order: number;
  status: "draft" | "published" | "archived";
  xpReward: number;        // Bonus XP on completion
  badgeId: string | null;
  createdAt: Date;
  updatedAt: Date;
  publishedAt: Date | null;
}
```

### Lesson
```typescript
interface Lesson {
  id: string;
  courseId: string;
  title: string;
  slug: string;
  content: string;         // Markdown
  summary: string | null;
  order: number;
  duration: number;        // Minutes
  type: "lesson" | "quiz" | "project" | "checkpoint";
  xpReward: number;
  isRequired: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### Enrollment
```typescript
interface Enrollment {
  id: string;
  userId: string;
  courseId: string;
  status: "active" | "completed" | "abandoned";
  currentLessonId: string | null;
  progress: number;        // 0-100
  totalXpEarned: number;
  streak: number;
  longestStreak: number;
  enrolledAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  lastAccessedAt: Date;
}
```

### UserStats
```typescript
interface UserStats {
  userId: string;
  totalXp: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: Date | null;
}
```

---

## User Flows

### 1. Course Discovery & Enrollment

```typescript
// 1. Display course catalog
const courses = await trpc.courses.getAll.query();
// Show grid/list of courses

// 2. View course details
const course = await trpc.courses.getById.query({ id: courseId });
// Show course info + lesson list

// 3. Check if can enroll
const { canEnroll, reason } = await trpc.courses.canEnroll.query();

// 4. Enroll
if (canEnroll) {
  const { enrollmentId } = await trpc.courses.enroll.mutate({ courseId });
  // Redirect to first lesson
}
```

---

### 2. Learning Flow

```typescript
// 1. Get current enrollment
const enrollment = await trpc.courses.getCurrentEnrollment.query();
if (!enrollment) {
  // Show "No active course" state
  return;
}

// 2. Get current progress
const progress = await trpc.courses.getProgress.query();
// Display: "Lesson 3 of 10" | 30% complete

// 3. Display lesson
const lesson = await trpc.courses.getLesson.query({
  courseId: enrollment.courseId,
  lessonId: currentLessonId
});
// Render lesson.content (markdown)

// 4. Complete lesson
const result = await trpc.courses.markLessonComplete.mutate({
  courseId: enrollment.courseId,
  lessonId: currentLessonId
});

// 5. Show feedback
if (result.alreadyCompleted) {
  // "Already completed"
} else {
  // Show XP animation: +${result.xpAwarded} XP
  // Update progress bar
  if (result.courseCompleted) {
    // Show course completion modal
    // Display bonus: +${result.courseCompletionBonus} XP
    // Unlock new course enrollment
  }
}

// 6. Navigate to next lesson
const nextLesson = progress.currentLesson;
```

---

### 3. User Dashboard

```typescript
// Get all user data
const [stats, enrollment, progress] = await Promise.all([
  trpc.courses.getUserStats.query(),
  trpc.courses.getCurrentEnrollment.query(),
  trpc.courses.getProgress.query()
]);

// Display:
// - Level: stats.level
// - Total XP: stats.totalXp
// - Streak: stats.currentStreak 🔥
// - Current course: enrollment?.course.title
// - Progress: ${progress?.progressPercentage}%
// - Next lesson: progress?.currentLesson
```

---

## Error Handling

### Common Errors

```typescript
try {
  await trpc.courses.enroll.mutate({ courseId });
} catch (error) {
  if (error.message === "Already enrolled in another course. Complete it first.") {
    // Show message: "You can only take one course at a time"
  } else if (error.message === "Not enrolled in this course") {
    // Redirect to enrollment
  }
}
```

### Error Types
- `"Already enrolled in another course. Complete it first."` - One-course limit
- `"Not enrolled in this course"` - Access denied
- `"Lesson not found"` - Invalid lesson ID
- `"Course not found"` - Invalid course ID

---

## XP & Leveling System

### Formula
```typescript
// Level calculation (linear)
const level = Math.floor(totalXp / 100) + 1;

// Example:
// 0-99 XP = Level 1
// 100-199 XP = Level 2
// 200-299 XP = Level 3
```

### XP Sources
1. **Lesson Completion**: Defined in lesson frontmatter (`xpReward: 50`)
2. **Course Completion Bonus**: Defined in course.json (`gamification.xpReward: 500`)

### Progress Calculation
```typescript
const progressPercentage = (completedRequired / totalRequired) * 100;
// Only counts required lessons (isRequired: true)
```

---

## Streak System

### How It Works
- **Current Streak**: Days of consecutive activity
- **Activity**: Completing any lesson counts as daily activity
- **Reset**: If gap > 1 day, streak resets to 1
- **Same Day**: Multiple completions on same day don't increment

### Example
```
Day 1: Complete lesson → streak = 1
Day 2: Complete lesson → streak = 2
Day 3: Skip
Day 4: Complete lesson → streak = 1 (reset)
```

---

## Content Format

### Lesson Markdown
Lessons use standard Markdown with frontmatter:

```markdown
---
id: uvod-v-ai
title: Uvod v umetno inteligenco
slug: uvod-v-ai
order: 1
duration: 15
type: lesson
xpReward: 50
isRequired: true
---

# Uvod v umetno inteligenco

Lesson content here in **markdown**...

## Sections
- Lists
- Code blocks
- Images
```

### Rendering
Use markdown renderer (e.g., `react-markdown`, `marked`) to display `lesson.content`.

---

## One-Course-at-a-Time Rule

**Business Logic:** Users can only have ONE active enrollment at a time.

**Frontend Implications:**
1. Check `canEnroll()` before showing "Start Course" button
2. If `canEnroll === false`, show current course progress
3. After course completion, user can enroll in new course
4. "Browse Courses" shows all, but enrollment is gated

**User Flow:**
```
User has active course → Can't start new course
User completes course → Enrollment status = "completed"
User can now enroll → New course available
```

---

## Testing Endpoints

### With curl (requires auth token)

```bash
# Get all courses (public)
curl http://localhost:3000/trpc/courses.getAll

# Get course by ID (public)
curl "http://localhost:3000/trpc/courses.getById?input=%7B%22id%22%3A%22ai-za-zacetnike%22%7D"

# Get user stats (protected)
curl http://localhost:3000/trpc/courses.getUserStats \
  -H "Cookie: session=..."

# Mark lesson complete (protected)
curl -X POST http://localhost:3000/trpc/courses.markLessonComplete \
  -H "Cookie: session=..." \
  -H "Content-Type: application/json" \
  -d '{"courseId":"ai-za-zacetnike","lessonId":"uvod-v-ai"}'
```

---

## tRPC Client Setup (Frontend)

### Installation
```bash
npm install @trpc/client @trpc/react-query @tanstack/react-query
```

### Setup
```typescript
// lib/trpc.ts
import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '@my-app/api'; // Import type from backend

export const trpc = createTRPCReact<AppRouter>();

// app/providers.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';

const queryClient = new QueryClient();
const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: 'http://localhost:3000/trpc',
      credentials: 'include', // Important for cookies
    }),
  ],
});

export function Providers({ children }) {
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  );
}
```

### Usage in Components
```typescript
// components/CourseList.tsx
import { trpc } from '@/lib/trpc';

export function CourseList() {
  const { data: courses, isLoading } = trpc.courses.getAll.useQuery();

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      {courses?.map(course => (
        <CourseCard key={course.id} course={course} />
      ))}
    </div>
  );
}

// components/LessonViewer.tsx
export function LessonViewer({ courseId, lessonId }) {
  const { data: lesson } = trpc.courses.getLesson.useQuery({
    courseId,
    lessonId
  });

  const completeMutation = trpc.courses.markLessonComplete.useMutation();

  const handleComplete = async () => {
    const result = await completeMutation.mutateAsync({
      courseId,
      lessonId
    });

    // Show XP animation
    showXPToast(`+${result.xpAwarded} XP`);

    if (result.courseCompleted) {
      showCourseCompletionModal(result.courseCompletionBonus);
    }
  };

  return (
    <div>
      <ReactMarkdown>{lesson?.content}</ReactMarkdown>
      <button onClick={handleComplete}>Mark as Complete</button>
    </div>
  );
}
```

---

## Available Example Course

**Course ID:** `ai-za-zacetnike`
**Title:** AI za začetnike
**Lessons:** 3
1. Uvod v AI (uvod-v-ai) - 50 XP
2. ChatGPT osnove (chatgpt-osnove) - 50 XP
3. Prvi AI asistent (projekt-prvi-asistent) - 100 XP (project type)

**Total Course XP:** 200 XP (lessons) + 500 XP (completion bonus) = 700 XP

---

## Next Steps for Frontend

### MVP Features to Build
1. **Landing Page** - Display course catalog (`getAll`)
2. **Course Details** - Show course info + lessons (`getById`)
3. **Enrollment Flow** - "Start Course" button (`enroll`)
4. **Dashboard** - Show current course, progress, stats
5. **Lesson Viewer** - Display markdown content + completion
6. **Progress Tracking** - Show XP, level, progress bar
7. **Course Completion** - Modal/celebration on finish

### Nice-to-Have
- XP animations on lesson complete
- Level up notifications
- Streak tracking display (🔥 icon)
- Progress charts
- Course completion certificates

---

## Important Notes

1. **Session Management**: Use BetterAuth client library for auth
2. **Type Safety**: Import `AppRouter` type from backend for full tRPC type safety
3. **Error Handling**: Always handle enrollment errors (one-course rule)
4. **Markdown Rendering**: Use safe markdown renderer (sanitize HTML)
5. **Progressive Enhancement**: Check `canEnroll()` before showing UI
6. **Optimistic Updates**: Update UI before mutation completes for better UX

---

## Support

**Backend Status:** ✅ Fully implemented and tested
**Branch:** `feature/content-system`
**Server:** Running on `http://localhost:3000`

For questions or issues, check:
- `/Users/.../claude.md` - Architecture overview
- `/Users/.../Docs/05-11-2025/` - Implementation docs
- Test endpoints directly via curl to verify behavior

---

**Ready to start building the frontend!** 🚀
