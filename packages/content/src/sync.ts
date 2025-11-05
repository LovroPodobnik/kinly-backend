import { contentCache } from './cache';

/**
 * Sync filesystem courses to database
 * Call this on app startup or via endpoint
 */
export async function syncContentToDatabase() {
  // Dynamic import to avoid circular dependency
  const { db, courses: coursesTable, lessons: lessonsTable } = await import('@my-app/db');

  console.log('[Content Sync] Starting...');

  const fileCourses = await contentCache.getCourses();

  for (const fileCourse of fileCourses) {
    try {
      // Upsert course
      await db
        .insert(coursesTable)
        .values({
          id: fileCourse.id,
          title: fileCourse.title,
          slug: fileCourse.slug,
          description: fileCourse.description,
          shortDescription: fileCourse.shortDescription,
          difficulty: fileCourse.difficulty,
          estimatedHours: fileCourse.estimatedHours,
          order: fileCourse.order,
          status: fileCourse.status,
          category: fileCourse.category,
          xpReward: fileCourse.gamification.xpReward,
          badgeId: fileCourse.gamification.badgeId || null,
          createdAt: new Date(),
          updatedAt: new Date(fileCourse.updatedAt),
          publishedAt: fileCourse.publishedAt ? new Date(fileCourse.publishedAt) : null,
        })
        .onConflictDoUpdate({
          target: coursesTable.id,
          set: {
            title: fileCourse.title,
            slug: fileCourse.slug,
            description: fileCourse.description,
            shortDescription: fileCourse.shortDescription,
            difficulty: fileCourse.difficulty,
            estimatedHours: fileCourse.estimatedHours,
            order: fileCourse.order,
            status: fileCourse.status,
            category: fileCourse.category,
            xpReward: fileCourse.gamification.xpReward,
            badgeId: fileCourse.gamification.badgeId || null,
            updatedAt: new Date(fileCourse.updatedAt),
            publishedAt: fileCourse.publishedAt ? new Date(fileCourse.publishedAt) : null,
          },
        });

      // Upsert lessons
      for (const lesson of fileCourse.lessons) {
        await db
          .insert(lessonsTable)
          .values({
            id: lesson.id,
            courseId: fileCourse.id,
            title: lesson.title,
            slug: lesson.slug,
            content: lesson.content,
            summary: lesson.content.split('\n')[0].replace(/^#+ /, '').substring(0, 200),
            order: lesson.order,
            duration: lesson.duration,
            type: lesson.type,
            xpReward: lesson.xpReward,
            isRequired: lesson.isRequired,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: lessonsTable.id,
            set: {
              title: lesson.title,
              slug: lesson.slug,
              content: lesson.content,
              summary: lesson.content.split('\n')[0].replace(/^#+ /, '').substring(0, 200),
              order: lesson.order,
              duration: lesson.duration,
              type: lesson.type,
              xpReward: lesson.xpReward,
              isRequired: lesson.isRequired,
              updatedAt: new Date(),
            },
          });
      }

      console.log(`[Content Sync] ✅ Synced course: ${fileCourse.title} (${fileCourse.lessons.length} lessons)`);
    } catch (err) {
      console.error(`[Content Sync] ❌ Failed to sync course ${fileCourse.id}:`, err);
    }
  }

  console.log(`[Content Sync] Complete! Synced ${fileCourses.length} courses`);
}
