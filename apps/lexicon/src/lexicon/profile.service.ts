import { Inject, Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS } from 'src/common/redis.provider';

@Injectable()
export class RedisProfileService {
  private readonly logger = new Logger(RedisProfileService.name);

  constructor(
    @Inject(REDIS) private readonly redis: Redis,
  ) { }

  /**
   * Store a word in the global lexicon hash
   */
  async setWord(wordId: number, word: string) {
    try {
      await this.redis.hset('lexicon:words', wordId.toString(), word);
    } catch (err) {
      this.logger.error(`Failed to set word ${wordId}`, err);
    }
  }

  /**
   * Increment or set a user's word score in the ZSET
   */
  async addOrUpdateUserWordScore(
    userId: string,
    language: string,
    wordId: number,
    scoreDelta: number,
  ) {
    const key = `user:${userId}:priority:${language}`;
    try {
      await this.redis.zincrby(key, scoreDelta, wordId.toString());
    } catch (err) {
      this.logger.error(
        `Failed to update priority score for user=${userId} word=${wordId}`,
        err,
      );
    }
  }

  /**
   * Get a user's top-N words by score
   */
  async getUserTopWords(
    userId: string,
    language: string,
    topN = 50,
  ): Promise<{ wordId: number; word: string; score: number }[]> {
    const zsetKey = `user:${userId}:priority:${language}`;
    try {
      // get wordIds and scores
      const zrange = await this.redis.zrevrange(zsetKey, 0, topN - 1, 'WITHSCORES');

      const result: { wordId: number; word: string; score: number }[] = [];
      for (let i = 0; i < zrange.length; i += 2) {
        const wordId = parseInt(zrange[i], 10);
        const score = parseFloat(zrange[i + 1]);
        result.push({ wordId, word: '', score }); // word will be fetched below
      }

      if (result.length === 0) return [];

      // fetch actual words from hash
      const wordIds = result.map(r => r.wordId.toString());
      const words = await this.redis.hmget('lexicon:words', ...wordIds);

      result.forEach((r, idx) => {
        r.word = words[idx] ?? '';
      });

      return result;
    } catch (err) {
      this.logger.error(`Failed to fetch top words for user=${userId}`, err);
      return [];
    }
  }
}