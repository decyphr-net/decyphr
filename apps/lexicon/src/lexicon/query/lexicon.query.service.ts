import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User, Word } from 'src/bank/bank.entity';
import { In, Repository } from 'typeorm';
import { RedisProfileService } from '../profile.service';
import { WordSnapshot } from './lexicon.query.types';

/**
 * Lexicon query service.
 *
 * Provides read-only access to a user's lexical state by
 * combining Redis-backed profile statistics with relational
 * Word metadata.
 *
 * This service is optimized for:
 * - fast reads
 * - ranking and decay logic
 * - UI-facing word snapshot generation
 */
@Injectable()
export class LexiconQueryService {
  private readonly logger = new Logger(LexiconQueryService.name);

  constructor(
    private readonly profile: RedisProfileService,
    @InjectRepository(Word)
    private readonly wordRepository: Repository<Word>,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
  ) { }

  /**
   * Returns a ranked snapshot of a user's known words.
   *
   * This method:
   * - fetches raw word scores from Redis
   * - joins relational Word metadata
   * - applies time-based score decay
   * - sorts results by final score
   *
   * Missing words or unseen timestamps are handled defensively.
   *
   * @param {string} clientId
   *  External client identifier.
   *
   * @param {string} language
   *  ISO language code used to scope the query.
   *
   * @returns {Promise<WordSnapshot[]>}
   *  Sorted list of word snapshots, highest score first.
   */
  async getUserWordSnapshot(
    clientId: string,
    language: string,
  ): Promise<WordSnapshot[]> {
    this.logger.debug(
      `Fetching word snapshot for clientId=${clientId}, language=${language}`,
    );
    const user = await this.getOrCreateUser(clientId);

    const raw = await this.profile.getUserTopWords(
      user.clientId,
      language,
      1000,
    );

    if (!raw.length) {
      this.logger.debug(`No word data found for clientId=${clientId}`);
      return [];
    }

    const wordEntities = await this.wordRepository.find({
      where: { id: In(raw.map((r) => r.wordId)) },
    });

    const wordMap = new Map(wordEntities.map((w) => [w.id, w]));

    const seenMap = await this.profile.getUserWordSeen(
      user.clientId,
      language,
      raw.map((r) => r.wordId),
    );

    const snapshots = raw
      .map((r) => {
        const word = wordMap.get(r.wordId);
        if (!word) return null;

        const seenAt = seenMap.get(r.wordId);

        const daysSinceSeen = seenAt
          ? (Date.now() - seenAt) / (1000 * 60 * 60 * 24)
          : 365; // IMPORTANT: unseen = very old

        const score = this.computeDecayedScore(r.score, daysSinceSeen);

        return {
          id: word.id,
          word: word.word,
          lemma: word.lemma,
          pos: word.pos,
          language: word.language,
          stats: {
            score: Number(score.toFixed(2)),
            rawScore: r.score,
            lastSeen: seenAt ?? null,
          },
        };
      })
      .filter(Boolean)
      .sort((a, b) => b!.stats.score - a!.stats.score) as WordSnapshot[];

    this.logger.debug(
      `Returning ${snapshots.length} word snapshots for clientId=${clientId}`,
    );

    return snapshots;
  }

  // ---------------------------------------------------------------------------
  // Scoring
  // ---------------------------------------------------------------------------

  /**
   * Computes a time-decayed score for a word.
   *
   * The decay curve:
   * - scales with the logarithmic strength of the word
   * - penalizes long periods without exposure
   *
   * @param {number} rawScore
   *  Base score accumulated for the word.
   *
   * @param {number} daysSinceSeen
   *  Number of days since the word was last observed.
   *
   * @returns {number}
   *  Decayed score value.
   */
  private computeDecayedScore(rawScore: number, daysSinceSeen: number): number {
    const strength = Math.log1p(rawScore);
    const lambda = 0.15;

    return rawScore * Math.exp((-lambda * daysSinceSeen) / strength);
  }

  // ---------------------------------------------------------------------------
  // User resolution
  // ---------------------------------------------------------------------------

  /**
   * Ensures a User entity exists for the given clientId.
   *
   * Uses an insert-or-ignore strategy to avoid race conditions
   * under concurrent access.
   *
   * @param {string} clientId
   *  External client identifier.
   *
   * @returns {Promise<User>}
   *  Resolved User entity.
   *
   * TODO: Move to a UserService
   */
  private async getOrCreateUser(clientId: string) {
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
