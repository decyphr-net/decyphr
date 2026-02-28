import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { CourseLexiconEvent, CourseProgress } from './courses.entity';
import { ContentStore } from './courses.content';
import {
  CourseGlossLookupDto,
  CourseLexiconExposureDto,
  CourseProgressUpdateDto,
} from './courses.dto';
import {
  buildPedagogyView,
  buildGlossIndex,
  buildMicroChunks,
  nextMicroChunkId,
  resolveGloss,
  resolveGlossWithContext,
  type GlossEntry,
  type MicroChunk,
} from './courses.micro';
import { LessonContent, LessonManifestRef } from './courses.types';
import { CoursesKafkaService } from './courses.kafka.service';
import { interactionTypeForExposure, sanitizeExposureTokens } from './courses.lexicon';

type SwapQuizStatus = 'idle' | 'empty' | 'incorrect' | 'correct';
type SwapQuizStateRow = {
  answer: string;
  status: SwapQuizStatus;
  attempts: number;
  solvedOptionKeys: string[];
};
type SwapQuizStatePayload = Record<string, SwapQuizStateRow>;

@Injectable()
export class CoursesService {
  private readonly logger = new Logger(CoursesService.name);
  private readonly content = new ContentStore();
  private readonly defaultTargetLanguage = process.env.COURSES_TARGET_LANGUAGE || 'ga';
  private readonly microChunkCache = new Map<string, MicroChunk[]>();
  private readonly glossIndexCache = new Map<string, Map<string, GlossEntry>>();
  private static readonly MAX_EVENT_ID_LENGTH = 128;

  constructor(
    @InjectRepository(CourseProgress)
    private readonly progressRepo: Repository<CourseProgress>,
    @InjectRepository(CourseLexiconEvent)
    private readonly lexiconEventsRepo: Repository<CourseLexiconEvent>,
    private readonly kafka: CoursesKafkaService,
  ) {}

  private cacheKeyForLesson(lesson: LessonContent): string {
    return `${lesson.courseSlug}:${lesson.lessonSlug}:${lesson.contentVersion}`;
  }

  private toChunkIds(raw: string | null): string[] {
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.map((item) => String(item).trim()).filter(Boolean);
    } catch {
      return [];
    }
  }

  private serializeChunkIds(chunkIds: string[]): string {
    return JSON.stringify(Array.from(new Set(chunkIds)));
  }

  private sanitizeSwapQuizState(raw: unknown): SwapQuizStatePayload {
    if (!raw || typeof raw !== 'object') return {};
    const state: SwapQuizStatePayload = {};

    for (const [rawKey, rawValue] of Object.entries(raw as Record<string, unknown>)) {
      const key = String(rawKey || '').trim().slice(0, 128);
      if (!key || !rawValue || typeof rawValue !== 'object') continue;
      const row = rawValue as Record<string, unknown>;
      const statusValue = row.status;
      const status: SwapQuizStatus =
        statusValue === 'idle' ||
        statusValue === 'empty' ||
        statusValue === 'incorrect' ||
        statusValue === 'correct'
          ? statusValue
          : 'idle';

      const attempts = Number(row.attempts);
      const solvedOptionKeys = Array.isArray(row.solvedOptionKeys)
        ? Array.from(
            new Set(
              row.solvedOptionKeys
                .map((item) => String(item || '').trim().slice(0, 128))
                .filter(Boolean),
            ),
          ).slice(0, 256)
        : [];

      state[key] = {
        answer: typeof row.answer === 'string' ? row.answer.slice(0, 180) : '',
        status,
        attempts: Number.isFinite(attempts) && attempts > 0 ? Math.floor(attempts) : 0,
        solvedOptionKeys,
      };
    }

    return state;
  }

  private parseSwapQuizState(raw: string | null | undefined): SwapQuizStatePayload {
    if (!raw) return {};
    try {
      const parsed = JSON.parse(raw);
      return this.sanitizeSwapQuizState(parsed);
    } catch {
      return {};
    }
  }

  private serializeSwapQuizState(raw: unknown): string | null {
    const state = this.sanitizeSwapQuizState(raw);
    if (Object.keys(state).length === 0) return null;
    return JSON.stringify(state);
  }

  private chunksForLesson(lesson: LessonContent): MicroChunk[] {
    const key = this.cacheKeyForLesson(lesson);
    const cached = this.microChunkCache.get(key);
    if (cached) return cached;
    const chunks = buildMicroChunks(lesson.blocks, lesson.resumeBlocks || []);
    this.microChunkCache.set(key, chunks);
    return chunks;
  }

  private glossaryForLesson(lesson: LessonContent): Map<string, GlossEntry> {
    const key = this.cacheKeyForLesson(lesson);
    const cached = this.glossIndexCache.get(key);
    if (cached) return cached;
    const glossary = buildGlossIndex(lesson);
    this.glossIndexCache.set(key, glossary);
    return glossary;
  }

  private microProgressForLesson(lesson: LessonContent, progress: CourseProgress | null) {
    const chunks = this.chunksForLesson(lesson);
    const completedChunkIds = progress ? this.toChunkIds(progress.microCompletedChunkIds) : [];
    const nextChunk = nextMicroChunkId(chunks, completedChunkIds);
    const lastChunkId = progress?.microLastChunkId ?? nextChunk;

    return {
      enabled: true,
      chunks,
      nextChunkId: nextChunk,
      completedChunkIds,
      lastChunkId,
    };
  }

  private async emitLexiconTokens(
    clientId: string,
    courseSlug: string,
    lessonSlug: string,
    contentVersion: string,
    source: 'render' | 'hover' | 'gloss' | 'swap_correct' | 'swap_incorrect',
    eventId: string,
    tokens: string[],
  ) {
    const normalizedEventId = this.normalizeEventId(eventId);
    const existing = await this.lexiconEventsRepo.findOne({
      where: { clientId, eventId: normalizedEventId },
    });
    if (existing) {
      return { deduped: true, emittedTokens: 0, interactionType: interactionTypeForExposure(source) };
    }

    const sanitized = sanitizeExposureTokens(tokens, 120);
    if (sanitized.length === 0) {
      return { deduped: false, emittedTokens: 0, interactionType: interactionTypeForExposure(source) };
    }

    const record = this.lexiconEventsRepo.create({
      clientId,
      courseSlug,
      lessonSlug,
      source,
      eventId: normalizedEventId,
      contentVersion,
    });
    await this.lexiconEventsRepo.save(record);

    const interactionType = interactionTypeForExposure(source);
    try {
      await this.kafka.emit('lexicon.import', {
        requestId: randomUUID(),
        clientId,
        targetLanguage: this.defaultTargetLanguage,
        words: sanitized,
        interaction: {
          type: interactionType,
          timestamp: Date.now(),
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to emit lexicon exposure for clientId=${clientId}, source=${source}`,
        error instanceof Error ? error.stack : String(error),
      );
    }

    return {
      deduped: false,
      emittedTokens: sanitized.length,
      interactionType,
    };
  }

  private normalizeEventId(eventId: string): string {
    const trimmed = String(eventId || '').trim();
    if (!trimmed) return randomUUID();
    if (trimmed.length <= CoursesService.MAX_EVENT_ID_LENGTH) return trimmed;

    const hash = createHash('sha256').update(trimmed).digest('hex').slice(0, 24);
    const prefixMax = CoursesService.MAX_EVENT_ID_LENGTH - hash.length - 3;
    const prefix = trimmed.slice(0, Math.max(0, prefixMax)).replace(/[^a-zA-Z0-9:_-]/g, '_');
    return `${prefix}::${hash}`;
  }

  private progressForLesson(
    lesson: LessonManifestRef,
    progress: CourseProgress | null,
  ) {
    return {
      lessonSlug: lesson.lessonSlug,
      lessonTitle: lesson.lessonTitle,
      order: lesson.order,
      estimatedMinutes: lesson.estimatedMinutes,
      summary: lesson.summary,
      tags: lesson.tags ?? [],
      contentVersion: lesson.contentVersion,
      progress: {
        status: progress?.status ?? 'not_started',
        progressPercent: progress?.progressPercent ?? 0,
        lastBlockId: progress?.lastBlockId ?? null,
        completedAt: progress?.completedAt ?? null,
        timeSpentSec: progress?.timeSpentSec ?? 0,
        lastSeenAt: progress?.lastSeenAt ?? null,
      },
    };
  }

  private progressStatusScore(status: CourseProgress['status'] | null | undefined): number {
    if (status === 'completed') return 2;
    if (status === 'in_progress') return 1;
    return 0;
  }

  private progressTimestamp(value: Date | string | null | undefined): number {
    if (!value) return 0;
    const timestamp = value instanceof Date ? value.getTime() : new Date(value).getTime();
    return Number.isFinite(timestamp) ? timestamp : 0;
  }

  private shouldPreferProgressRow(candidate: CourseProgress, current: CourseProgress): boolean {
    const candidateStatus = this.progressStatusScore(candidate.status);
    const currentStatus = this.progressStatusScore(current.status);
    if (candidateStatus !== currentStatus) return candidateStatus > currentStatus;

    const candidatePercent = Math.min(100, Math.max(0, Math.round(candidate.progressPercent || 0)));
    const currentPercent = Math.min(100, Math.max(0, Math.round(current.progressPercent || 0)));
    if (candidatePercent !== currentPercent) return candidatePercent > currentPercent;

    const candidateSeen = this.progressTimestamp(candidate.lastSeenAt);
    const currentSeen = this.progressTimestamp(current.lastSeenAt);
    if (candidateSeen !== currentSeen) return candidateSeen > currentSeen;

    const candidateUpdated = this.progressTimestamp(candidate.updatedAt);
    const currentUpdated = this.progressTimestamp(current.updatedAt);
    if (candidateUpdated !== currentUpdated) return candidateUpdated > currentUpdated;

    return Number(candidate.id || 0) > Number(current.id || 0);
  }

  private resolveBlockId(lesson: LessonContent, candidate?: string | null): string | null {
    if (!candidate) return lesson.blocks[0]?.id ?? null;
    const exists = lesson.blocks.some((block) => block.id === candidate);
    return exists ? candidate : lesson.blocks[0]?.id ?? null;
  }

  private blockOrderIndex(lesson: LessonContent, blockId: string | null | undefined): number {
    if (!blockId) return -1;
    return lesson.blocks.findIndex((block) => block.id === blockId);
  }

  private furthestBlockId(
    lesson: LessonContent,
    existing: string | null | undefined,
    incoming: string | null | undefined,
  ): string | null {
    const existingId = this.resolveBlockId(lesson, existing ?? null);
    const incomingId = this.resolveBlockId(lesson, incoming ?? null);

    const existingIdx = this.blockOrderIndex(lesson, existingId);
    const incomingIdx = this.blockOrderIndex(lesson, incomingId);

    if (incomingIdx >= existingIdx) return incomingId;
    return existingId;
  }

  async getCatalog(clientId: string) {
    const manifest = await this.content.getManifest();
    const progressRows = await this.progressRepo.find({ where: { clientId } });
    const progressByLessonKey = new Map<string, CourseProgress>();

    for (const row of progressRows) {
      const key = `${row.courseSlug}::${row.lessonSlug}`;
      const current = progressByLessonKey.get(key);
      if (!current || this.shouldPreferProgressRow(row, current)) {
        progressByLessonKey.set(key, row);
      }
    }

    const courses = manifest.courses.map((course) => {
      const lessons = course.lessons
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((lesson) => {
          const key = `${course.courseSlug}::${lesson.lessonSlug}`;
          const progress = progressByLessonKey.get(key) ?? null;

          return this.progressForLesson(lesson, progress);
        });

      const completedLessons = lessons.filter((lesson) => lesson.progress.status === 'completed').length;
      const aggregateProgressPercent = lessons.length
        ? Math.round((completedLessons / lessons.length) * 100)
        : 0;
      const startedLessons = lessons
        .filter(
          (lesson) =>
            lesson.progress.status !== 'not_started' ||
            lesson.progress.progressPercent > 0 ||
            Boolean(lesson.progress.lastSeenAt),
        )
        .sort((a, b) => {
          const seenA = a.progress.lastSeenAt ? new Date(a.progress.lastSeenAt).getTime() : 0;
          const seenB = b.progress.lastSeenAt ? new Date(b.progress.lastSeenAt).getTime() : 0;
          if (seenB !== seenA) return seenB - seenA;
          if (b.progress.progressPercent !== a.progress.progressPercent) {
            return b.progress.progressPercent - a.progress.progressPercent;
          }
          return a.order - b.order;
        });

      const resumeLesson =
        startedLessons[0] ??
        lessons.find((lesson) => lesson.progress.status === 'not_started') ??
        null;

      return {
        courseSlug: course.courseSlug,
        courseTitle: course.courseTitle,
        lang: course.lang,
        summary: course.summary,
        contentVersion: manifest.contentVersion,
        lessons,
        summaryProgress: {
          completedLessons,
          totalLessons: lessons.length,
          percent: aggregateProgressPercent,
        },
        resumeTarget: resumeLesson
          ? {
              courseSlug: course.courseSlug,
              lessonSlug: resumeLesson.lessonSlug,
              lastBlockId: resumeLesson.progress.lastBlockId,
            }
          : null,
      };
    });

    return {
      generatedAt: manifest.generatedAt,
      contentVersion: manifest.contentVersion,
      courses,
    };
  }

  async getLesson(clientId: string, courseSlug: string, lessonSlug: string) {
    const lesson = await this.content.getLesson(courseSlug, lessonSlug);
    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    const progress = await this.progressRepo.findOne({
      where: {
        clientId,
        courseSlug,
        lessonSlug,
      },
    });

    const resolvedBlockId = this.resolveBlockId(lesson, progress?.lastBlockId ?? null);
    const micro = this.microProgressForLesson(lesson, progress);
    const pedagogy = buildPedagogyView(lesson);
    const swapQuizState =
      progress?.contentVersion === lesson.contentVersion
        ? this.parseSwapQuizState(progress?.swapQuizState)
        : {};

    return {
      lesson,
      progress: {
        status: progress?.status ?? 'not_started',
        progressPercent: progress?.progressPercent ?? 0,
        lastBlockId: resolvedBlockId,
        completedAt: progress?.completedAt ?? null,
        timeSpentSec: progress?.timeSpentSec ?? 0,
        lastSeenAt: progress?.lastSeenAt ?? null,
        contentVersion: lesson.contentVersion,
        swapQuizState,
      },
      micro,
      pedagogy,
    };
  }

  async updateProgress(
    clientId: string,
    courseSlug: string,
    lessonSlug: string,
    dto: CourseProgressUpdateDto,
  ) {
    const lesson = await this.content.getLesson(courseSlug, lessonSlug);
    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    let row = await this.progressRepo.findOne({
      where: { clientId, courseSlug, lessonSlug },
    });

    if (!row) {
      row = this.progressRepo.create({
        clientId,
        courseSlug,
        lessonSlug,
        contentVersion: lesson.contentVersion,
        status: 'not_started',
        progressPercent: 0,
        lastBlockId: null,
        timeSpentSec: 0,
        microCompletedChunkIds: null,
        microLastChunkId: null,
        microUpdatedAt: null,
        swapQuizState: null,
        startedAt: null,
        lastSeenAt: new Date(),
        completedAt: null,
      });
    }

    const now = new Date();
    const contentVersionChanged = row.contentVersion && row.contentVersion !== lesson.contentVersion;
    if (contentVersionChanged) {
      row.swapQuizState = null;
    }
    const chunks = this.chunksForLesson(lesson);
    const validChunkIds = new Set(chunks.map((chunk) => chunk.id));
    const existingCompleted = this.toChunkIds(row.microCompletedChunkIds);
    const completed = new Set(existingCompleted);

    if (dto.lastBlockId !== undefined) {
      row.lastBlockId = this.furthestBlockId(lesson, row.lastBlockId, dto.lastBlockId);
    }

    if (dto.progressPercent !== undefined) {
      const incomingPercent = Math.min(100, Math.max(0, Math.round(dto.progressPercent)));
      row.progressPercent = Math.max(row.progressPercent || 0, incomingPercent);
    }

    if (dto.timeSpentDeltaSec !== undefined) {
      row.timeSpentSec += Math.max(0, dto.timeSpentDeltaSec);
    }

    if (dto.swapQuizState !== undefined) {
      row.swapQuizState = this.serializeSwapQuizState(dto.swapQuizState);
    }

    if (dto.micro?.completedChunkIds?.length) {
      for (const chunkId of dto.micro.completedChunkIds) {
        if (validChunkIds.has(chunkId)) {
          completed.add(chunkId);
        }
      }
      row.microCompletedChunkIds = this.serializeChunkIds(Array.from(completed));
      row.microUpdatedAt = now;
    } else if (existingCompleted.length && !row.microCompletedChunkIds) {
      row.microCompletedChunkIds = this.serializeChunkIds(existingCompleted);
    }

    if (dto.micro?.lastChunkId !== undefined) {
      row.microLastChunkId =
        dto.micro.lastChunkId && validChunkIds.has(dto.micro.lastChunkId) ? dto.micro.lastChunkId : null;
      row.microUpdatedAt = now;
    }

    const allMicroChunksCompleted = chunks.length > 0 && completed.size >= chunks.length;

    if (dto.completed === true) {
      row.status = 'completed';
      row.completedAt = now;
      row.progressPercent = 100;
    } else if (allMicroChunksCompleted) {
      row.status = 'completed';
      row.completedAt = now;
      row.progressPercent = 100;
    } else if (row.status !== 'completed') {
      if (row.progressPercent > 0 || row.lastBlockId || (dto.timeSpentDeltaSec ?? 0) > 0) {
        row.status = 'in_progress';
      }
      if (completed.size > 0) {
        row.status = 'in_progress';
      }
    }

    if (!row.startedAt && row.status !== 'not_started') {
      row.startedAt = now;
    }

    row.contentVersion = lesson.contentVersion;
    row.lastSeenAt = now;

    const saved = await this.progressRepo.save(row);

    return {
      ok: true,
      progress: {
        status: saved.status,
        progressPercent: saved.progressPercent,
        lastBlockId: this.resolveBlockId(lesson, saved.lastBlockId),
        completedAt: saved.completedAt,
        timeSpentSec: saved.timeSpentSec,
        lastSeenAt: saved.lastSeenAt,
        contentVersion: lesson.contentVersion,
        swapQuizState: this.parseSwapQuizState(saved.swapQuizState),
      },
      micro: this.microProgressForLesson(lesson, saved),
    };
  }

  async recordLexiconExposure(
    clientId: string,
    courseSlug: string,
    lessonSlug: string,
    dto: CourseLexiconExposureDto,
  ) {
    const lesson = await this.content.getLesson(courseSlug, lessonSlug);
    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    const result = await this.emitLexiconTokens(
      clientId,
      courseSlug,
      lessonSlug,
      lesson.contentVersion,
      dto.source,
      dto.eventId,
      dto.tokens,
    );
    return { ok: true, ...result };
  }

  async lookupGloss(clientId: string, courseSlug: string, lessonSlug: string, dto: CourseGlossLookupDto) {
    const lesson = await this.content.getLesson(courseSlug, lessonSlug);
    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    const glossary = this.glossaryForLesson(lesson);
    const gloss = resolveGlossWithContext(lesson.blocks, glossary, dto.token, dto.context, dto.blockId);
    const eventId = `gloss:${lesson.courseSlug}:${lesson.lessonSlug}:${gloss.token}`;

    try {
      await this.emitLexiconTokens(
        clientId,
        courseSlug,
        lessonSlug,
        lesson.contentVersion,
        'gloss',
        eventId,
        [gloss.token],
      );
    } catch (error) {
      this.logger.warn(
        `Gloss lookup token emit failed for clientId=${clientId}`,
        error instanceof Error ? error.message : String(error),
      );
    }

    return {
      token: gloss.token,
      lemma: gloss.lemma,
      pronunciation: gloss.pronunciation,
      translation: gloss.translation,
      pos: gloss.pos,
      shortNote: gloss.shortNote ?? 'No gloss yet for this token.',
      examples: gloss.examples,
    };
  }
}
