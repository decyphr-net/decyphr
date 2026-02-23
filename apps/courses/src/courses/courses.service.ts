import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { CourseLexiconEvent, CourseProgress } from './courses.entity';
import { ContentStore } from './courses.content';
import { CourseLexiconExposureDto, CourseProgressUpdateDto } from './courses.dto';
import { LessonContent, LessonManifestRef } from './courses.types';
import { CoursesKafkaService } from './courses.kafka.service';
import { interactionTypeForExposure, sanitizeExposureTokens } from './courses.lexicon';

@Injectable()
export class CoursesService {
  private readonly logger = new Logger(CoursesService.name);
  private readonly content = new ContentStore();
  private readonly defaultTargetLanguage = process.env.COURSES_TARGET_LANGUAGE || 'ga';

  constructor(
    @InjectRepository(CourseProgress)
    private readonly progressRepo: Repository<CourseProgress>,
    @InjectRepository(CourseLexiconEvent)
    private readonly lexiconEventsRepo: Repository<CourseLexiconEvent>,
    private readonly kafka: CoursesKafkaService,
  ) {}

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

  private resolveBlockId(lesson: LessonContent, candidate?: string | null): string | null {
    if (!candidate) return lesson.blocks[0]?.id ?? null;
    const exists = lesson.blocks.some((block) => block.id === candidate);
    return exists ? candidate : lesson.blocks[0]?.id ?? null;
  }

  async getCatalog(clientId: string) {
    const manifest = await this.content.getManifest();
    const progressRows = await this.progressRepo.find({ where: { clientId } });

    const courses = manifest.courses.map((course) => {
      const lessons = course.lessons
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((lesson) => {
          const progress =
            progressRows.find(
              (row) => row.courseSlug === course.courseSlug && row.lessonSlug === lesson.lessonSlug,
            ) ?? null;

          return this.progressForLesson(lesson, progress);
        });

      const completedLessons = lessons.filter((lesson) => lesson.progress.status === 'completed').length;
      const resumeLesson =
        lessons.find((lesson) => lesson.progress.status === 'in_progress') ??
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
          percent: lessons.length ? Math.round((completedLessons / lessons.length) * 100) : 0,
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
      },
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
        startedAt: null,
        lastSeenAt: new Date(),
        completedAt: null,
      });
    }

    const now = new Date();

    if (dto.lastBlockId !== undefined) {
      row.lastBlockId = this.resolveBlockId(lesson, dto.lastBlockId);
    }

    if (dto.progressPercent !== undefined) {
      row.progressPercent = Math.min(100, Math.max(0, Math.round(dto.progressPercent)));
    }

    if (dto.timeSpentDeltaSec !== undefined) {
      row.timeSpentSec += Math.max(0, dto.timeSpentDeltaSec);
    }

    if (dto.completed === true) {
      row.status = 'completed';
      row.completedAt = now;
      row.progressPercent = 100;
    } else if (row.status !== 'completed') {
      if (row.progressPercent > 0 || row.lastBlockId || (dto.timeSpentDeltaSec ?? 0) > 0) {
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
      },
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

    const existing = await this.lexiconEventsRepo.findOne({
      where: { clientId, eventId: dto.eventId },
    });

    if (existing) {
      return { ok: true, deduped: true };
    }

    const tokens = sanitizeExposureTokens(dto.tokens, 120);
    if (tokens.length === 0) {
      throw new BadRequestException('No valid tokens provided');
    }

    const record = this.lexiconEventsRepo.create({
      clientId,
      courseSlug,
      lessonSlug,
      source: dto.source,
      eventId: dto.eventId,
      contentVersion: lesson.contentVersion,
    });
    await this.lexiconEventsRepo.save(record);

    const interactionType = interactionTypeForExposure(dto.source);

    try {
      await this.kafka.emit('lexicon.import', {
        requestId: randomUUID(),
        clientId,
        targetLanguage: this.defaultTargetLanguage,
        words: tokens,
        interaction: {
          type: interactionType,
          timestamp: Date.now(),
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to emit lexicon exposure event for clientId=${clientId}, source=${dto.source}`,
        error instanceof Error ? error.stack : String(error),
      );
    }

    return {
      ok: true,
      deduped: false,
      emittedTokens: tokens.length,
      interactionType,
    };
  }
}
