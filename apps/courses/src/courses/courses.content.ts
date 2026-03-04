import { readFile, stat } from 'fs/promises';
import path from 'path';
import { ContentManifest, LessonContent, LessonManifestRef } from './courses.types';

export type ResolvedLessonRef = LessonManifestRef & {
  courseSlug: string;
  courseTitle: string;
  lang: string;
};

const DEFAULT_CONTENT_DIR = path.resolve(process.cwd(), 'src/content');

export class ContentStore {
  private manifestCache: ContentManifest | null = null;
  private manifestCacheMtimeMs = 0;

  constructor(private readonly contentDir = process.env.COURSES_CONTENT_DIR || DEFAULT_CONTENT_DIR) {}

  getContentDir() {
    return this.contentDir;
  }

  async getManifest(forceReload = false): Promise<ContentManifest> {
    const manifestPath = path.join(this.contentDir, 'manifest.json');
    let shouldReload = forceReload || !this.manifestCache;

    if (!shouldReload) {
      const fileStat = await stat(manifestPath);
      shouldReload = fileStat.mtimeMs > this.manifestCacheMtimeMs;
    }

    if (shouldReload) {
      const raw = await readFile(manifestPath, 'utf-8');
      this.manifestCache = JSON.parse(raw) as ContentManifest;
      const fileStat = await stat(manifestPath);
      this.manifestCacheMtimeMs = fileStat.mtimeMs;
    }
    if (!this.manifestCache) {
      throw new Error(`Unable to load courses manifest at ${manifestPath}`);
    }
    return this.manifestCache;
  }

  async findLessonRef(courseSlug: string, lessonSlug: string): Promise<ResolvedLessonRef | null> {
    const manifest = await this.getManifest();
    const course = manifest.courses.find((item) => item.courseSlug === courseSlug);
    if (!course) return null;

    const lesson = course.lessons.find((item) => item.lessonSlug === lessonSlug);
    if (!lesson) return null;

    return {
      ...lesson,
      courseSlug,
      courseTitle: course.courseTitle,
      lang: course.lang,
    };
  }

  async getLesson(courseSlug: string, lessonSlug: string): Promise<LessonContent | null> {
    const ref = await this.findLessonRef(courseSlug, lessonSlug);
    if (!ref) return null;

    const lessonPath = path.join(this.contentDir, ref.file);
    const raw = await readFile(lessonPath, 'utf-8');
    return JSON.parse(raw) as LessonContent;
  }
}
