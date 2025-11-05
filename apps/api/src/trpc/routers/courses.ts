import { router, publicProcedure, protectedProcedure } from '../middleware';
import { z } from 'zod';
import {
  db,
  courses,
  lessons,
  userEnrollments,
  userLessonProgress,
  userStats,
} from '@my-app/db';
import { eq, and } from 'drizzle-orm';
import {
  awardXP,
  updateStreak,
  calculateProgress,
  checkCourseCompletion,
} from '@my-app/content';

export const coursesRouter = router({
  /**
   * Get all published courses (for course selection)
   */
  getAll: publicProcedure.query(async () => {
    return await db.query.courses.findMany({
      where: eq(courses.status, 'published'),
      orderBy: (courses, { asc }) => [asc(courses.order)],
    });
  }),

  /**
   * Get single course with lessons
   */
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const course = await db.query.courses.findFirst({
        where: eq(courses.id, input.id),
        with: {
          lessons: {
            orderBy: (lessons, { asc }) => [asc(lessons.order)],
          },
        },
      });

      if (!course) {
        throw new Error('Course not found');
      }

      return course;
    }),

  /**
   * Get single lesson content (requires enrollment)
   */
  getLesson: protectedProcedure
    .input(
      z.object({
        courseId: z.string(),
        lessonId: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
      // Check if user is enrolled
      const enrollment = await db.query.userEnrollments.findFirst({
        where: and(
          eq(userEnrollments.userId, ctx.user.id),
          eq(userEnrollments.courseId, input.courseId),
          eq(userEnrollments.status, 'active')
        ),
      });

      if (!enrollment) {
        throw new Error('Not enrolled in this course');
      }

      // Get lesson
      const lesson = await db.query.lessons.findFirst({
        where: and(
          eq(lessons.id, input.lessonId),
          eq(lessons.courseId, input.courseId)
        ),
      });

      if (!lesson) {
        throw new Error('Lesson not found');
      }

      return lesson;
    }),

  /**
   * Enroll in a course
   */
  enroll: protectedProcedure
    .input(z.object({ courseId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      // Check if already enrolled in another active course
      const activeEnrollment = await db.query.userEnrollments.findFirst({
        where: and(
          eq(userEnrollments.userId, ctx.user.id),
          eq(userEnrollments.status, 'active')
        ),
      });

      if (activeEnrollment) {
        throw new Error('Already enrolled in another course. Complete it first.');
      }

      // Create enrollment
      const enrollmentId = crypto.randomUUID();

      await db.insert(userEnrollments).values({
        id: enrollmentId,
        userId: ctx.user.id,
        courseId: input.courseId,
        status: 'active',
        progress: 0,
        enrolledAt: new Date(),
        lastAccessedAt: new Date(),
        totalXpEarned: 0,
        streak: 0,
        longestStreak: 0,
      });

      console.log(`[Courses] User ${ctx.user.email} enrolled in course ${input.courseId}`);

      return { success: true, enrollmentId };
    }),

  /**
   * Get user's current enrollment
   */
  getCurrentEnrollment: protectedProcedure.query(async ({ ctx }) => {
    const enrollment = await db.query.userEnrollments.findFirst({
      where: and(
        eq(userEnrollments.userId, ctx.user.id),
        eq(userEnrollments.status, 'active')
      ),
      with: {
        course: {
          with: {
            lessons: {
              orderBy: (lessons, { asc }) => [asc(lessons.order)],
            },
          },
        },
      },
    });

    return enrollment || null;
  }),

  /**
   * Mark a lesson as complete
   */
  markLessonComplete: protectedProcedure
    .input(
      z.object({
        courseId: z.string(),
        lessonId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // 1. Verify user is enrolled
      const enrollment = await db.query.userEnrollments.findFirst({
        where: and(
          eq(userEnrollments.userId, ctx.user.id),
          eq(userEnrollments.courseId, input.courseId),
          eq(userEnrollments.status, 'active')
        ),
      });

      if (!enrollment) {
        throw new Error('Not enrolled in this course');
      }

      // 2. Verify lesson exists and belongs to course
      const lesson = await db.query.lessons.findFirst({
        where: and(
          eq(lessons.id, input.lessonId),
          eq(lessons.courseId, input.courseId)
        ),
      });

      if (!lesson) {
        throw new Error('Lesson not found');
      }

      // 3. Check if already completed (don't award XP twice)
      const existingProgress = await db.query.userLessonProgress.findFirst({
        where: and(
          eq(userLessonProgress.userId, ctx.user.id),
          eq(userLessonProgress.lessonId, input.lessonId),
          eq(userLessonProgress.status, 'completed')
        ),
      });

      if (existingProgress) {
        // Already completed, don't award XP again
        const progress = await calculateProgress(enrollment.id);
        const courseCompleted = await checkCourseCompletion(enrollment.id);

        return {
          success: true,
          alreadyCompleted: true,
          xpAwarded: 0,
          totalXp: 0,
          progressPercentage: progress,
          courseCompleted,
        };
      }

      // 4. Create or update lesson progress
      const progressId = crypto.randomUUID();
      const now = new Date();

      await db.insert(userLessonProgress).values({
        id: progressId,
        userId: ctx.user.id,
        lessonId: input.lessonId,
        courseId: input.courseId,
        status: 'completed',
        timeSpent: 0,
        completedAt: now,
        createdAt: now,
        updatedAt: now,
      });

      // 5. Award XP
      const xpResult = await awardXP(ctx.user.id, lesson.xpReward);

      // 6. Update enrollment XP
      await db
        .update(userEnrollments)
        .set({
          totalXpEarned: enrollment.totalXpEarned + lesson.xpReward,
          lastAccessedAt: now,
        })
        .where(eq(userEnrollments.id, enrollment.id));

      // 7. Update streak
      await updateStreak(ctx.user.id);

      // 8. Calculate progress
      const progress = await calculateProgress(enrollment.id);

      // 9. Update enrollment progress
      await db
        .update(userEnrollments)
        .set({ progress })
        .where(eq(userEnrollments.id, enrollment.id));

      // 10. Check if course is complete
      const courseCompleted = await checkCourseCompletion(enrollment.id);

      let courseCompletionBonus = 0;

      if (courseCompleted) {
        // Award course completion bonus
        const course = await db.query.courses.findFirst({
          where: eq(courses.id, input.courseId),
        });

        if (course && course.xpReward > 0) {
          await awardXP(ctx.user.id, course.xpReward);
          courseCompletionBonus = course.xpReward;
        }

        // Mark enrollment as completed
        await db
          .update(userEnrollments)
          .set({
            status: 'completed',
            completedAt: now,
          })
          .where(eq(userEnrollments.id, enrollment.id));

        console.log(
          `[Courses] User ${ctx.user.email} completed course ${input.courseId}!`
        );
      }

      console.log(
        `[Courses] User ${ctx.user.email} completed lesson ${input.lessonId} (+${lesson.xpReward} XP)`
      );

      return {
        success: true,
        alreadyCompleted: false,
        xpAwarded: lesson.xpReward,
        totalXp: xpResult.totalXp,
        level: xpResult.level,
        progressPercentage: progress,
        courseCompleted,
        courseCompletionBonus,
      };
    }),

  /**
   * Get user stats (total XP, level, streaks)
   */
  getUserStats: protectedProcedure.query(async ({ ctx }) => {
    const stats = await db.query.userStats.findFirst({
      where: eq(userStats.userId, ctx.user.id),
    });

    if (!stats) {
      // Return default stats if not found
      return {
        totalXp: 0,
        level: 1,
        currentStreak: 0,
        longestStreak: 0,
        lastActivityDate: null,
      };
    }

    return stats;
  }),

  /**
   * Get progress for current enrollment
   */
  getProgress: protectedProcedure.query(async ({ ctx }) => {
    const enrollment = await db.query.userEnrollments.findFirst({
      where: and(
        eq(userEnrollments.userId, ctx.user.id),
        eq(userEnrollments.status, 'active')
      ),
      with: {
        course: {
          with: {
            lessons: true,
          },
        },
      },
    });

    if (!enrollment) {
      return null;
    }

    // Get completed lessons
    const completedLessons = await db.query.userLessonProgress.findMany({
      where: and(
        eq(userLessonProgress.userId, ctx.user.id),
        eq(userLessonProgress.courseId, enrollment.courseId),
        eq(userLessonProgress.status, 'completed')
      ),
    });

    const totalLessons = enrollment.course.lessons.filter((l) => l.isRequired).length;
    const lessonsCompleted = completedLessons.filter((progress) =>
      enrollment.course.lessons.some(
        (lesson) => lesson.id === progress.lessonId && lesson.isRequired
      )
    ).length;

    // Find current lesson (first incomplete required lesson)
    const currentLesson = enrollment.course.lessons
      .filter((l) => l.isRequired)
      .find(
        (lesson) =>
          !completedLessons.some((progress) => progress.lessonId === lesson.id)
      );

    return {
      enrollmentId: enrollment.id,
      courseId: enrollment.courseId,
      courseName: enrollment.course.title,
      progressPercentage: enrollment.progress,
      lessonsCompleted,
      totalLessons,
      currentLesson: currentLesson
        ? {
            id: currentLesson.id,
            title: currentLesson.title,
            slug: currentLesson.slug,
            order: currentLesson.order,
          }
        : null,
      totalXpEarned: enrollment.totalXpEarned,
      streak: enrollment.streak,
    };
  }),

  /**
   * Check if user can enroll in a new course
   */
  canEnroll: protectedProcedure.query(async ({ ctx }) => {
    const activeEnrollment = await db.query.userEnrollments.findFirst({
      where: and(
        eq(userEnrollments.userId, ctx.user.id),
        eq(userEnrollments.status, 'active')
      ),
    });

    if (activeEnrollment) {
      return {
        canEnroll: false,
        reason: 'Already enrolled in an active course. Complete it first.',
        activeEnrollmentId: activeEnrollment.id,
      };
    }

    return {
      canEnroll: true,
      reason: null,
      activeEnrollmentId: null,
    };
  }),
});
