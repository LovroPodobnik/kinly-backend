import { Course, loadAllCourses } from './loader';

class ContentCache {
  private courses: Course[] | null = null;
  private lastUpdated: number = 0;
  private readonly TTL = 60 * 1000; // 1 minute cache in dev, can be longer in prod

  async getCourses(): Promise<Course[]> {
    const now = Date.now();

    // Cache miss or expired
    if (!this.courses || now - this.lastUpdated > this.TTL) {
      console.log('[ContentCache] Refreshing course cache...');
      this.courses = await loadAllCourses();
      this.lastUpdated = now;
    }

    return this.courses;
  }

  /**
   * Force refresh cache (call when content changes)
   */
  async refresh(): Promise<void> {
    console.log('[ContentCache] Force refresh');
    this.courses = await loadAllCourses();
    this.lastUpdated = Date.now();
  }

  /**
   * Invalidate cache
   */
  clear(): void {
    this.courses = null;
    this.lastUpdated = 0;
  }
}

export const contentCache = new ContentCache();
