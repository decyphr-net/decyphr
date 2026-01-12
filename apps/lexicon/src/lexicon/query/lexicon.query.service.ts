import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { User, Word } from 'src/bank/bank.entity';
import { UserWordStatistics } from 'src/interaction/interaction.entity';
import { RedisProfileService } from '../profile.service';
import { WordScoringService } from '../scoring.service';
import { WordSnapshot } from './lexicon.query.types';

@Injectable()
export class LexiconQueryService {
  private readonly logger = new Logger(LexiconQueryService.name);

  constructor(
    private readonly profile: RedisProfileService,
    private readonly scoringService: WordScoringService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Word)
    private readonly wordRepository: Repository<Word>,
    @InjectRepository(UserWordStatistics)
    private readonly userWordRepository: Repository<UserWordStatistics>,
  ) { }

  async getUserWordSnapshot(
    clientId: string,
    language: string,
  ): Promise<WordSnapshot[]> {
    const user = await this.getOrCreateUser(clientId);

    // ---------------------------------------------------------------------
    // 1. Load DB stats (language-scoped)
    // ---------------------------------------------------------------------
    const statsEntities = await this.userWordRepository.find({
      where: {
        user: { id: user.id },
        word: { language },
      },
      relations: ['word'],
    });

    if (!statsEntities.length) return [];

    // ---------------------------------------------------------------------
    // 2. Deduplicate stats by word (pick most recently updated)
    // ---------------------------------------------------------------------
    const statsByWord = new Map<number, UserWordStatistics>();

    for (const stat of statsEntities) {
      const wordId = stat.word.id;
      const existing = statsByWord.get(wordId);

      if (!existing || stat.lastUpdated > existing.lastUpdated) {
        statsByWord.set(wordId, stat);
      }
    }

    const wordIds = [...statsByWord.keys()];

    // ---------------------------------------------------------------------
    // 3. Load word metadata
    // ---------------------------------------------------------------------
    const wordEntities = await this.wordRepository.find({
      where: {
        id: In(wordIds),
        language,
      },
    });

    const wordMap = new Map(wordEntities.map((w) => [w.id, w]));

    // ---------------------------------------------------------------------
    // 4. Seen timestamps (Redis)
    // ---------------------------------------------------------------------
    const seenMap = await this.profile.getUserWordSeen(
      user.clientId,
      language,
      wordIds,
    );

    // ---------------------------------------------------------------------
    // 5. Compute decayed scores
    // ---------------------------------------------------------------------
    const snapshots: WordSnapshot[] = [];
    const statsToUpdate: UserWordStatistics[] = [];

    for (const [wordId, stat] of statsByWord.entries()) {
      const word = wordMap.get(wordId);
      if (!word) continue;

      const seenAt = seenMap.get(wordId);
      const daysSinceSeen = seenAt
        ? (Date.now() - seenAt) / (1000 * 60 * 60 * 24)
        : 365;

      const decayedScore = this.scoringService.decayScore(
        stat.score,
        daysSinceSeen,
      );

      snapshots.push({
        id: stat.id,
        word: word.word,
        lemma: word.lemma,
        pos: word.pos,
        stats: {
          score: Number(decayedScore.toFixed(2)),
          rawScore: stat.score,
          lastSeenAt: seenAt ? new Date(seenAt).toISOString() : null,
        },
      });

      if (Math.abs(stat.score - decayedScore) > 0.01) {
        stat.score = decayedScore;
        stat.lastUpdated = new Date();
        statsToUpdate.push(stat);
      }
    }

    // ---------------------------------------------------------------------
    // 6. Persist decay updates (optional but explicit)
    // ---------------------------------------------------------------------
    if (statsToUpdate.length) {
      await this.userWordRepository.save(statsToUpdate);
    }

    // ---------------------------------------------------------------------
    // 7. Sort (stable for pagination)
    // ---------------------------------------------------------------------
    snapshots.sort((a, b) => b.stats.score - a.stats.score);

    // ---------------------------------------------------------------------
    // 8. Safety check (can remove later)
    // ---------------------------------------------------------------------
    const ids = snapshots.map((s) => s.id);
    if (new Set(ids).size !== ids.length) {
      this.logger.error('Duplicate snapshot IDs detected', ids);
    }

    return snapshots;
  }

  // -------------------------------------------------------------------------
  // User resolution
  // -------------------------------------------------------------------------
  private async getOrCreateUser(clientId: string): Promise<User> {
    await this.userRepository
      .createQueryBuilder()
      .insert()
      .into(User)
      .values({ clientId })
      .orIgnore()
      .execute();

    return this.userRepository.findOneOrFail({
      where: { clientId },
    });
  }
}
