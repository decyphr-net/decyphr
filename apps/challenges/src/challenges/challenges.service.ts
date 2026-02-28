import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Challenge, ChallengeType } from './challenge.entity';

type CatalogLesson = {
  lessonSlug: string;
  lessonTitle: string;
  tags?: string[];
  progress?: {
    status?: 'not_started' | 'in_progress' | 'completed';
  };
};

type CatalogCourse = {
  courseSlug: string;
  courseTitle: string;
  lessons?: CatalogLesson[];
};

type CatalogPayload = {
  courses?: CatalogCourse[];
};

type ChallengeSeed = {
  challengeKey: string;
  challengeType: ChallengeType;
  title: string;
  description: string;
  sourceCourseSlug: string;
  sourceCourseTitle: string;
  sourceLessonSlug: string;
  sourceLessonTitle: string;
};

@Injectable()
export class ChallengesService {
  private readonly logger = new Logger(ChallengesService.name);
  private readonly challengeType: ChallengeType = 'real_world_phrase_use';
  private readonly coursesUrl = process.env.COURSES_SERVICE_URL || 'http://courses:3015';

  constructor(
    @InjectRepository(Challenge)
    private readonly challengeRepo: Repository<Challenge>,
  ) {}

  private normalizeClientId(clientId: string): string {
    const normalized = String(clientId || '').trim();
    if (!normalized) {
      throw new BadRequestException('clientId is required');
    }
    return normalized;
  }

  private async parseCoursesResponse(res: Response) {
    const contentType = res.headers.get('content-type') || '';
    if (!res.ok) {
      const body = contentType.includes('application/json')
        ? JSON.stringify(await res.json())
        : await res.text();
      throw new Error(`Courses service error (${res.status}): ${body}`);
    }

    if (!contentType.includes('application/json')) {
      throw new Error('Courses service returned a non-JSON response');
    }

    return res.json();
  }

  private async fetchWithRetry(url: string, init?: RequestInit, retries = 2) {
    let lastError: unknown;

    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        return await fetch(url, init);
      } catch (error) {
        lastError = error;
        if (attempt < retries) {
          await new Promise((resolve) => setTimeout(resolve, 150 * (attempt + 1)));
        }
      }
    }

    throw lastError;
  }

  private async getCourseCatalog(clientId: string): Promise<CatalogPayload> {
    const url = new URL(`${this.coursesUrl}/courses/catalog`);
    url.searchParams.set('clientId', clientId);

    let res: Response;
    try {
      res = await this.fetchWithRetry(url.toString(), undefined, 2);
    } catch (error) {
      throw new Error(
        `Courses service unreachable: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    return (await this.parseCoursesResponse(res)) as CatalogPayload;
  }

  private isRealWorldLesson(lesson: CatalogLesson): boolean {
    const slug = String(lesson.lessonSlug || '').toLowerCase();
    const title = String(lesson.lessonTitle || '').toLowerCase();
    const tags = Array.isArray(lesson.tags)
      ? lesson.tags.map((tag) => String(tag || '').toLowerCase())
      : [];

    if (slug.includes('real-world-challenge')) return true;
    if (title.includes('real world challenge')) return true;
    if (tags.includes('real-world-challenge') || tags.includes('real_world_challenge')) return true;

    return false;
  }

  private isUnlockedLessonChallenge(lesson: CatalogLesson): boolean {
    const status = lesson.progress?.status;
    return status === 'in_progress' || status === 'completed';
  }

  private buildChallengeSeed(course: CatalogCourse, lesson: CatalogLesson): ChallengeSeed {
    return {
      challengeKey: `${this.challengeType}:${course.courseSlug}:${lesson.lessonSlug}`,
      challengeType: this.challengeType,
      title: `Use one phrase from ${course.courseTitle} in real life`,
      description: `Try one phrase from "${lesson.lessonTitle}" in a live interaction, then tick this off.`,
      sourceCourseSlug: course.courseSlug,
      sourceCourseTitle: course.courseTitle,
      sourceLessonSlug: lesson.lessonSlug,
      sourceLessonTitle: lesson.lessonTitle,
    };
  }

  private realWorldChallengeSeedsFromCatalog(catalog: CatalogPayload): ChallengeSeed[] {
    const courses = Array.isArray(catalog?.courses) ? catalog.courses : [];
    const seeds: ChallengeSeed[] = [];

    for (const course of courses) {
      const lessons = Array.isArray(course.lessons) ? course.lessons : [];

      for (const lesson of lessons) {
        if (!this.isRealWorldLesson(lesson)) continue;
        if (!this.isUnlockedLessonChallenge(lesson)) continue;
        seeds.push(this.buildChallengeSeed(course, lesson));
      }
    }

    const deduped = new Map<string, ChallengeSeed>();
    for (const seed of seeds) {
      deduped.set(seed.challengeKey, seed);
    }

    return Array.from(deduped.values());
  }

  private async syncGeneratedChallenges(clientId: string, seeds: ChallengeSeed[]) {
    if (seeds.length === 0) return;

    const challengeKeys = seeds.map((seed) => seed.challengeKey);
    const existing = await this.challengeRepo.find({
      where: {
        clientId,
        challengeKey: In(challengeKeys),
      },
    });
    const existingByKey = new Map(existing.map((row) => [row.challengeKey, row]));

    const toCreate: Challenge[] = [];
    const toUpdate: Challenge[] = [];

    for (const seed of seeds) {
      const row = existingByKey.get(seed.challengeKey);
      if (!row) {
        toCreate.push(
          this.challengeRepo.create({
            clientId,
            challengeKey: seed.challengeKey,
            challengeType: seed.challengeType,
            title: seed.title,
            description: seed.description,
            sourceCourseSlug: seed.sourceCourseSlug,
            sourceCourseTitle: seed.sourceCourseTitle,
            sourceLessonSlug: seed.sourceLessonSlug,
            sourceLessonTitle: seed.sourceLessonTitle,
            status: 'active',
          }),
        );
        continue;
      }

      let changed = false;

      if (row.title !== seed.title) {
        row.title = seed.title;
        changed = true;
      }
      if (row.description !== seed.description) {
        row.description = seed.description;
        changed = true;
      }
      if (row.sourceCourseSlug !== seed.sourceCourseSlug) {
        row.sourceCourseSlug = seed.sourceCourseSlug;
        changed = true;
      }
      if (row.sourceCourseTitle !== seed.sourceCourseTitle) {
        row.sourceCourseTitle = seed.sourceCourseTitle;
        changed = true;
      }
      if (row.sourceLessonSlug !== seed.sourceLessonSlug) {
        row.sourceLessonSlug = seed.sourceLessonSlug;
        changed = true;
      }
      if (row.sourceLessonTitle !== seed.sourceLessonTitle) {
        row.sourceLessonTitle = seed.sourceLessonTitle;
        changed = true;
      }

      if (changed) {
        toUpdate.push(row);
      }
    }

    if (toCreate.length > 0) {
      await this.challengeRepo.save(toCreate);
    }
    if (toUpdate.length > 0) {
      await this.challengeRepo.save(toUpdate);
    }
  }

  private async generateFromCourseProgress(clientId: string) {
    try {
      const catalog = await this.getCourseCatalog(clientId);
      const seeds = this.realWorldChallengeSeedsFromCatalog(catalog);
      await this.syncGeneratedChallenges(clientId, seeds);
    } catch (error) {
      this.logger.warn(
        `Could not generate challenges from course progress for clientId=${clientId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private serialize(row: Challenge) {
    return {
      id: row.id,
      key: row.challengeKey,
      type: row.challengeType,
      title: row.title,
      description: row.description,
      status: row.status,
      completedAt: row.completedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      source:
        row.sourceCourseSlug && row.sourceLessonSlug
          ? {
              courseSlug: row.sourceCourseSlug,
              courseTitle: row.sourceCourseTitle,
              lessonSlug: row.sourceLessonSlug,
              lessonTitle: row.sourceLessonTitle,
            }
          : null,
    };
  }

  async listForClient(rawClientId: string) {
    const clientId = this.normalizeClientId(rawClientId);
    await this.generateFromCourseProgress(clientId);

    const items = await this.challengeRepo.find({
      where: { clientId },
      order: {
        status: 'ASC',
        createdAt: 'DESC',
      },
    });

    const payloadItems = items.map((row) => this.serialize(row));
    const activeCount = payloadItems.filter((item) => item.status === 'active').length;

    return {
      items: payloadItems,
      summary: {
        activeCount,
        completedCount: payloadItems.length - activeCount,
        total: payloadItems.length,
      },
    };
  }

  async setCompletion(rawClientId: string, id: string, completed: boolean) {
    const clientId = this.normalizeClientId(rawClientId);
    const row = await this.challengeRepo.findOne({
      where: {
        id,
        clientId,
      },
    });

    if (!row) {
      throw new NotFoundException('Challenge not found');
    }

    row.status = completed ? 'completed' : 'active';
    row.completedAt = completed ? new Date() : null;
    await this.challengeRepo.save(row);

    return this.serialize(row);
  }
}
