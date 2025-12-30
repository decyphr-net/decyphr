import { Inject, Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class LexiconService {
  private readonly logger = new Logger(LexiconService.name);

  constructor(@Inject('REDIS') private readonly redis: Redis) { }

  /**
   * Get a user's lexicon with words and scores
   */
  async getUserLexicon(clientId: string, lang: string) {
    try {
      const priorityKey = `user:${clientId}:priority:${lang}`;

      // ioredis returns a flat array for WITHSCORES: [id1, score1, id2, score2, ...]
      const flat = await this.redis.zrange(priorityKey, 0, -1, 'WITHSCORES');

      if (!flat.length) return [];

      // Convert flat array to array of { id, score }
      const wordIdsWithScores = [];
      for (let i = 0; i < flat.length; i += 2) {
        wordIdsWithScores.push({
          id: flat[i],
          score: parseFloat(flat[i + 1]),
        });
      }

      const wordIds = wordIdsWithScores.map(item => item.id);

      // Fetch words from lexicon:words hash
      const pipeline = this.redis.pipeline();
      wordIds.forEach(id => pipeline.hget('lexicon:words', id));
      const wordResults = await pipeline.exec(); // [ [err, result], [err, result], ... ]

      return wordIdsWithScores.map((item, idx) => ({
        id: item.id,
        score: item.score,
        word: wordResults[idx][1] || null,
      }));
    } catch (err) {
      this.logger.error(`Failed to fetch lexicon for ${clientId}`, err);
      return [];
    }
  }
}
