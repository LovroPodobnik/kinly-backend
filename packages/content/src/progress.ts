import { db, userStats, userEnrollments, lessons, userLessonProgress } from '@my-app/db';
import { eq, and, sql } from 'drizzle-orm';

/**
 * Calculate level from total XP
 * Simple linear formula: Every 100 XP = 1 level
 */
export function calculateLevel(totalXp: number): number {
  return Math.floor(totalXp / 100) + 1;
}

/**
 * Award XP to a user and update their stats
 */
export async function awardXP(userId: string, amount: number): Promise<{
  totalXp: number;
  level: number;
  xpAwarded: number;
}> {
  // Get or create user stats
  let stats = await db.query.userStats.findFirst({
    where: eq(userStats.userId, userId),
  });

  const now = new Date();

  if (!stats) {
    // Create new stats record
    await db.insert(userStats).values({
      userId,
      totalXp: amount,
      level: calculateLevel(amount),
      currentStreak: 1,
      longestStreak: 1,
      lastActivityDate: now,
      createdAt: now,
      updatedAt: now,
    });

    return {
      totalXp: amount,
      level: calculateLevel(amount),
      xpAwarded: amount,
    };
  }

  // Update existing stats
  const newTotalXp = stats.totalXp + amount;
  const newLevel = calculateLevel(newTotalXp);

  await db
    .update(userStats)
    .set({
      totalXp: newTotalXp,
      level: newLevel,
      updatedAt: now,
    })
    .where(eq(userStats.userId, userId));

  return {
    totalXp: newTotalXp,
    level: newLevel,
    xpAwarded: amount,
  };
}

/**
 * Update user's streak
 */
export async function updateStreak(userId: string): Promise<void> {
  const stats = await db.query.userStats.findFirst({
    where: eq(userStats.userId, userId),
  });

  if (!stats) {
    // Will be created by awardXP
    return;
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let newStreak = stats.currentStreak;
  let newLongestStreak = stats.longestStreak;

  if (stats.lastActivityDate) {
    const lastActivity = new Date(stats.lastActivityDate);
    const lastActivityDay = new Date(
      lastActivity.getFullYear(),
      lastActivity.getMonth(),
      lastActivity.getDate()
    );

    const dayDifference = Math.floor(
      (today.getTime() - lastActivityDay.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (dayDifference === 0) {
      // Same day, no change
      return;
    } else if (dayDifference === 1) {
      // Yesterday, increment streak
      newStreak = stats.currentStreak + 1;
    } else {
      // Gap > 1 day, reset streak
      newStreak = 1;
    }
  } else {
    // First time
    newStreak = 1;
  }

  // Update longest streak if needed
  if (newStreak > stats.longestStreak) {
    newLongestStreak = newStreak;
  }

  await db
    .update(userStats)
    .set({
      currentStreak: newStreak,
      longestStreak: newLongestStreak,
      lastActivityDate: now,
      updatedAt: now,
    })
    .where(eq(userStats.userId, userId));
}

/**
 * Calculate progress percentage for an enrollment
 */
export async function calculateProgress(enrollmentId: string): Promise<number> {
  // Get enrollment to find course
  const enrollment = await db.query.userEnrollments.findFirst({
    where: eq(userEnrollments.id, enrollmentId),
  });

  if (!enrollment) {
    throw new Error('Enrollment not found');
  }

  // Get all required lessons for the course
  const courseLessons = await db.query.lessons.findMany({
    where: and(
      eq(lessons.courseId, enrollment.courseId),
      eq(lessons.isRequired, true)
    ),
  });

  const totalRequired = courseLessons.length;

  if (totalRequired === 0) {
    return 100; // No required lessons = complete
  }

  // Get completed lessons for this user and course
  const completedLessons = await db.query.userLessonProgress.findMany({
    where: and(
      eq(userLessonProgress.userId, enrollment.userId),
      eq(userLessonProgress.courseId, enrollment.courseId),
      eq(userLessonProgress.status, 'completed')
    ),
  });

  const completedRequired = courseLessons.filter((lesson) =>
    completedLessons.some((progress) => progress.lessonId === lesson.id)
  ).length;

  return Math.floor((completedRequired / totalRequired) * 100);
}

/**
 * Check if course is complete
 */
export async function checkCourseCompletion(enrollmentId: string): Promise<boolean> {
  const progress = await calculateProgress(enrollmentId);
  return progress === 100;
}
