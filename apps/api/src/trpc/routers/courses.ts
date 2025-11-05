import { router, publicProcedure, protectedProcedure } from '../middleware';
import { z } from 'zod';
import { db, courses, lessons, userEnrollments } from '@my-app/db';
import { eq, and } from 'drizzle-orm';

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
});
