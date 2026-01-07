import { Inject, Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS } from 'src/common/redis.provider';

/**
 * Service for managing user and word-related data in Redis.
 *
 * This includes storing words, tracking user scores for words,
 * and recording when a user has seen a word. Uses Redis hashes
 * and sorted sets for efficient lookups and scoring.
 */
@Injectable()
export class RedisProfileService {
  private readonly logger = new Logger(RedisProfileService.name);

  private static readonly SLOW_REDIS_MS = 50;

  constructor(
    @Inject(REDIS) private readonly redis: Redis,
  ) { }

  /**
   * Store a word in Redis.
   *
   * @param wordId - The ID of the word.
   * @param word - The word string.
   */
  async setWord(wordId: number, word: string) {
    if (!Number.isInteger(wordId) || wordId <= 0) {
      this.logger.warn('Invalid wordId passed to setWord', { wordId });
      return;
    }

    if (!word) {
      this.logger.warn('Empty word passed to setWord', { wordId });
      return;
    }

    const start = Date.now();
    await this.redis.hset(
      'lexicon:words',
      wordId.toString(),
      word,
    );

    this.logSlow('hset lexicon:words', start, { wordId });
  }

  /**
   * Increment or update the score of a word for a specific user in a given language.
   *
   * @param userId - The ID of the user.
   * @param language - The language code (e.g., 'en', 'fr').
   * @param wordId - The ID of the word.
   * @param scoreDelta - The amount to increment (or decrement) the score.
   */
  async addOrUpdateUserWordScore(
    userId: string,
    language: string,
    wordId: number,
    scoreDelta: number,
  ) {
    if (!userId || !language) {
      this.logger.warn('Missing userId or language in addOrUpdateUserWordScore', {
        userId,
        language,
        wordId,
        scoreDelta,
      });
      return;
    }

    if (!Number.isFinite(scoreDelta)) {
      this.logger.warn('Invalid scoreDelta', {
        userId,
        language,
        wordId,
        scoreDelta,
      });
      return;
    }
    const key = `user:${userId}:priority:${language}`;

    const start = Date.now();
    await this.redis.zincrby(
      key,
      scoreDelta,
      wordId.toString(),
    );

    this.logSlow('zincrby priority', start, {
      key,
      wordId,
      scoreDelta,
    });
  }

  /**
   * Retrieve a user's top words for a given language, sorted by score descending.
   *
   * @param userId - The ID of the user.
   * @param language - The language code.
   * @param limit - Maximum number of words to retrieve (default 1000).
   * @returns Array of objects containing wordId and score.
   */
  async getUserTopWords(
    userId: string,
    language: string,
    limit = 1000,
  ): Promise<{ wordId: number; score: number }[]> {
    const key = `user:${userId}:priority:${language}`;

    const start = Date.now();
    const zrange = await this.redis.zrevrange(
      key,
      0,
      limit - 1,
      'WITHSCORES',
    );
    this.logSlow('zrevrange priority', start, { key, limit });

    if (zrange.length === 0) {
      this.logger.debug('No priority words found', {
        userId,
        language,
      });
      return [];
    }

    const result: { wordId: number; score: number }[] = [];

    for (let i = 0; i < zrange.length; i += 2) {
      result.push({
        wordId: Number(zrange[i]),
        score: Number(zrange[i + 1]),
      });
    }

    return result;
  }

  /**
   * Record that a user has seen a word at the current timestamp.
   *
   * @param userId - The ID of the user.
   * @param language - The language code.
   * @param wordId - The ID of the word.
   */
  async markWordSeen(
    userId: string,
    language: string,
    wordId: number,
  ) {
    if (!userId || !language || !Number.isInteger(wordId)) {
      this.logger.warn('Invalid input to markWordSeen', {
        userId,
        language,
        wordId,
      });
      return;
    }
    const key = `user:${userId}:seen:${language}`;

    const start = Date.now()
    await this.redis.hset(
      key,
      wordId.toString(),
      Date.now().toString(),
    );
    this.logSlow('hset seen', start, { key, wordId });
  }

  /**
   * Retrieve the timestamps when a user last saw a set of words.
   *
   * @param userId - The ID of the user.
   * @param language - The language code.
   * @param wordIds - Array of word IDs to check.
   * @returns Map of wordId -> timestamp (in milliseconds).
   */
  async getUserWordSeen(
    userId: string,
    language: string,
    wordIds: number[],
  ): Promise<Map<number, number>> {
    const key = `user:${userId}:seen:${language}`;

    if (!wordIds.length) {
      return new Map();
    }

    const start = Date.now();
    const values = await this.redis.hmget(
      key,
      ...wordIds.map(id => id.toString()),
    );

    this.logSlow('hmget seen', start, {
      key,
      count: wordIds.length,
    });

    const map = new Map<number, number>();

    wordIds.forEach((id, idx) => {
      const v = values[idx];
      if (v) map.set(id, Number(v));
    });

    if (map.size === 0) {
      this.logger.debug('No seen timestamps found', {
        userId,
        language,
        requested: wordIds.length,
      });
    }

    return map;
  }

  private logSlow(
    operation: string,
    start: number,
    context: Record<string, unknown>,
  ): void {
    const duration = Date.now() - start;

    if (duration > RedisProfileService.SLOW_REDIS_MS) {
      this.logger.warn('Slow Redis operation', {
        operation,
        duration,
        ...context,
      });
    }
  }
}
