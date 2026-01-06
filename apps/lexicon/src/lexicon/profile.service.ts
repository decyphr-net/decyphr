import { Inject, Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS } from 'src/common/redis.provider';

@Injectable()
export class RedisProfileService {
  private readonly logger = new Logger(RedisProfileService.name);

  constructor(
    @Inject(REDIS) private readonly redis: Redis,
  ) { }

  // ---------------- Words ----------------

  async setWord(wordId: number, word: string) {
    await this.redis.hset(
      'lexicon:words',
      wordId.toString(),
      word,
    );
  }

  // ---------------- Scores ----------------

  async addOrUpdateUserWordScore(
    userId: string,
    language: string,
    wordId: number,
    scoreDelta: number,
  ) {
    const key = `user:${userId}:priority:${language}`;
    await this.redis.zincrby(
      key,
      scoreDelta,
      wordId.toString(),
    );
  }

  async getUserTopWords(
    userId: string,
    language: string,
    limit = 1000,
  ): Promise<{ wordId: number; score: number }[]> {
    const key = `user:${userId}:priority:${language}`;

    const zrange = await this.redis.zrevrange(
      key,
      0,
      limit - 1,
      'WITHSCORES',
    );

    const result: { wordId: number; score: number }[] = [];

    for (let i = 0; i < zrange.length; i += 2) {
      result.push({
        wordId: Number(zrange[i]),
        score: Number(zrange[i + 1]),
      });
    }

    return result;
  }

  // ---------------- Seen timestamps ----------------

  async markWordSeen(
    userId: string,
    language: string,
    wordId: number,
  ) {
    const key = `user:${userId}:seen:${language}`;
    await this.redis.hset(
      key,
      wordId.toString(),
      Date.now().toString(),
    );
  }

  async getUserWordSeen(
    userId: string,
    language: string,
    wordIds: number[],
  ): Promise<Map<number, number>> {
    const key = `user:${userId}:seen:${language}`;

    const values = await this.redis.hmget(
      key,
      ...wordIds.map(id => id.toString()),
    );

    const map = new Map<number, number>();

    wordIds.forEach((id, idx) => {
      const v = values[idx];
      if (v) map.set(id, Number(v));
    });

    return map;
  }
}
