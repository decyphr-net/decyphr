export type LessonBlock = {
  id: string;
  type: 'heading' | 'paragraph' | 'list';
  level?: number;
  text?: string;
  items?: string[];
};

export type LessonContent = {
  courseSlug: string;
  courseTitle: string;
  lessonSlug: string;
  lessonTitle: string;
  order: number;
  lang: string;
  estimatedMinutes: number;
  summary?: string;
  tags?: string[];
  resumeBlocks?: string[];
  lexicon_include?: string[];
  lexicon_exclude?: string[];
  markdown: string;
  blocks: LessonBlock[];
  contentVersion: string;
};

export type LessonManifestRef = {
  lessonSlug: string;
  lessonTitle: string;
  order: number;
  estimatedMinutes: number;
  summary?: string;
  tags?: string[];
  contentVersion: string;
  file: string;
};

export type CourseManifest = {
  courseSlug: string;
  courseTitle: string;
  lang: string;
  summary?: string;
  lessons: LessonManifestRef[];
};

export type ContentManifest = {
  generatedAt: string;
  contentVersion: string;
  courses: CourseManifest[];
};
