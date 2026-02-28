export type LessonBlock = {
  id: string;
  type: 'heading' | 'paragraph' | 'list' | 'dialogue';
  level?: number;
  text?: string;
  items?: string[];
  turns?: Array<{
    speaker: string;
    text: string;
    pronunciation?: string;
    translation?: string;
  }>;
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
  tokenGlosses?: LessonTokenGloss[];
  markdown: string;
  blocks: LessonBlock[];
  pedagogy?: LessonPedagogyMeta;
  contentVersion: string;
};

export type LessonPedagogyMeta = {
  defaultMode?: 'full';
  pedagogyFocus?: 'spoken_survival' | string;
  unitDeckSlug?: string;
  autoTrackPhrasebook?: boolean;
  autoTrackLexicon?: boolean;
};

export type LessonPhraseToken = {
  token: string;
  lemma?: string;
  pronunciation?: string;
  translation?: string;
  usageHint?: string;
};

export type LessonTokenGloss = {
  token: string;
  baseWord?: string;
  translation?: string;
  pronunciation?: string;
  usage?: string;
  examples?: string[];
};

export type LessonCorePhrase = {
  phraseId: string;
  blockId: string;
  speaker: string;
  text: string;
  translation?: string;
  pronunciation?: string;
  hint: string;
  deepExplanation?: string;
  tokens: LessonPhraseToken[];
  alternates?: string[];
  retrievalPrompt?: {
    type: 'translate_to_irish';
    prompt: string;
    expected: string;
  };
  tier: 'core';
};

export type LessonSupportNote = {
  id: string;
  text: string;
  tier: 'support' | 'deep';
};

export type LessonPedagogyView = {
  defaultMode: 'full';
  pedagogyFocus: 'spoken_survival';
  unitDeckSlug: string;
  autoTrackPhrasebook: boolean;
  autoTrackLexicon: boolean;
  core_flow: LessonCorePhrase[];
  micro_notes: LessonSupportNote[];
  deep_notes: LessonSupportNote[];
};

export type LessonMicroChunk = {
  id: string;
  blockIds: string[];
  estimatedSeconds: number;
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
