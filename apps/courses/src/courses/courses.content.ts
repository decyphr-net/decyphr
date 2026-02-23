import { readFile } from 'fs/promises';
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

  constructor(private readonly contentDir = process.env.COURSES_CONTENT_DIR || DEFAULT_CONTENT_DIR) {}

  getContentDir() {
    return this.contentDir;
  }

  async getManifest(forceReload = false): Promise<ContentManifest> {
    if (!this.manifestCache || forceReload) {
      const manifestPath = path.join(this.contentDir, 'manifest.json');
      const raw = await readFile(manifestPath, 'utf-8');
      this.manifestCache = JSON.parse(raw) as ContentManifest;
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
