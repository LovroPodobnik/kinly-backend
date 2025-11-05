import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import matter from 'gray-matter';

// Look for content directory from project root (works in monorepo)
const findProjectRoot = (): string => {
  let currentDir = process.cwd();

  // Keep going up until we find the content directory or reach filesystem root
  while (currentDir !== '/') {
    const contentPath = path.join(currentDir, 'content/courses');
    if (fsSync.existsSync(contentPath)) {
      return contentPath;
    }
    currentDir = path.dirname(currentDir);
  }

  // Fallback to relative from cwd
  return path.join(process.cwd(), '../../content/courses');
};

const CONTENT_DIR = findProjectRoot();

export interface CourseMetadata {
  id: string;
  title: string;
  slug: string;
  shortDescription: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  category: string;
  estimatedHours: number;
  order: number;
  status: 'draft' | 'published' | 'archived';
  gamification: {
    xpReward: number;
    badgeId?: string;
  };
  prerequisites: string[];
  unlocks: string[];
  published: boolean;
  publishedAt?: string;
  updatedAt: string;
}

export interface LessonFrontmatter {
  id: string;
  title: string;
  slug: string;
  order: number;
  duration: number;
  type: 'lesson' | 'quiz' | 'project' | 'checkpoint';
  xpReward: number;
  isRequired: boolean;
}

export interface Lesson extends LessonFrontmatter {
  content: string;
  courseId: string;
}

export interface Course extends CourseMetadata {
  lessons: Lesson[];
}

/**
 * Load all courses from filesystem
 */
export async function loadAllCourses(): Promise<Course[]> {
  try {
    const courseDirs = await fs.readdir(CONTENT_DIR);
    const courses: Course[] = [];

    for (const dir of courseDirs) {
      const coursePath = path.join(CONTENT_DIR, dir);
      const stat = await fs.stat(coursePath);

      if (!stat.isDirectory()) continue;

      try {
        const course = await loadCourse(dir);
        courses.push(course);
      } catch (err) {
        console.error(`Failed to load course ${dir}:`, err);
      }
    }

    return courses.sort((a, b) => a.order - b.order);
  } catch (err) {
    console.error('Failed to read content directory:', err);
    return [];
  }
}

/**
 * Load single course
 */
export async function loadCourse(courseDir: string): Promise<Course> {
  const coursePath = path.join(CONTENT_DIR, courseDir);

  // Load course.json
  const metadataPath = path.join(coursePath, 'course.json');
  const metadataRaw = await fs.readFile(metadataPath, 'utf-8');
  const metadata: CourseMetadata = JSON.parse(metadataRaw);

  // Load all markdown files (lessons)
  const files = await fs.readdir(coursePath);
  const lessonFiles = files.filter((f) => f.endsWith('.md'));

  const lessons: Lesson[] = [];

  for (const file of lessonFiles) {
    const lessonPath = path.join(coursePath, file);
    const raw = await fs.readFile(lessonPath, 'utf-8');

    // Parse frontmatter
    const { data, content } = matter(raw);

    lessons.push({
      ...(data as LessonFrontmatter),
      content,
      courseId: metadata.id,
    });
  }

  // Sort lessons by order
  lessons.sort((a, b) => a.order - b.order);

  return {
    ...metadata,
    lessons,
  };
}

/**
 * Load single lesson
 */
export async function loadLesson(
  courseId: string,
  lessonSlug: string
): Promise<Lesson | null> {
  const courses = await loadAllCourses();
  const course = courses.find((c) => c.id === courseId);

  if (!course) return null;

  return course.lessons.find((l) => l.slug === lessonSlug) || null;
}

/**
 * Get published courses only
 */
export async function getPublishedCourses(): Promise<Course[]> {
  const all = await loadAllCourses();
  return all.filter((c) => c.published && c.status === 'published');
}
