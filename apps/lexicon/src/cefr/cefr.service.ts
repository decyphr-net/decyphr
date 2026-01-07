import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User } from 'src/bank/bank.entity';
import { UserWordStatistics } from 'src/interaction/interaction.entity';
import {
  LEVEL_ORDER,
  MASTERY_THRESHOLD,
  POS_WEIGHT,
  PROMOTION_THRESHOLDS
} from './cefr.constants';
import { CefrCoverage, CefrLevel } from './cefr.types';


/**
 * Service for assessing a user's language proficiency based on CEFR levels.
 * Uses weighted word statistics and part-of-speech weighting to compute coverage.
 */
@Injectable()
export class CefrAssessmentService {
  private readonly logger = new Logger(CefrAssessmentService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    @InjectRepository(UserWordStatistics)
    private readonly statsRepository: Repository<UserWordStatistics>,
  ) { }

  /**
   * Fetches an existing user by clientId, or creates one if not present.
   *
   * TODO: Create separate user service with this
   *
   * @param clientId - The unique identifier for the user.
   * @returns A Promise that resolves to the User entity.
   */
  private async getOrCreateUser(clientId: string) {
    this.logger.debug(`Fetching or creating user for clientId=${clientId}`);

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

  // -------------------------------
  // Public API
  // -------------------------------
  /**
   * Assess a user's CEFR level in a given language.
   * Computes coverage per level, infers the CEFR level, and provides explanatory signals.
   *
   * @param clientId - The client/user ID.
   * @param language - The language code (e.g., 'en', 'fr').
   * @returns A Promise resolving to an object containing:
   *   - `language` (string): language code.
   *   - `cefr` (CefrLevel): inferred CEFR level.
   *   - `confidence` (number): coverage ratio for the inferred level.
   *   - `coverage` (Record<CefrLevel, CefrCoverage>): coverage for all levels.
   *   - `signals` (string[]): descriptive signals of user performance.
   */
  async assess(clientId: string, language: string) {
    this.logger.log(`Starting CEFR assessment for user=${clientId}, language=${language}`);
    const user = await this.getOrCreateUser(clientId);

    const stats = await this.statsRepository
      .createQueryBuilder('uws')
      .innerJoinAndSelect('uws.word', 'word')
      .where('uws.userId = :uid', { uid: user.id })
      .andWhere('word.language = :lang', { lang: language })
      .andWhere('word.cefr IS NOT NULL')
      .getMany();

    const coverageByLevel = this.computeCoverage(stats);
    const cefr = this.inferCefrLevel(coverageByLevel);

    this.logger.debug(`Assessment complete for user=${clientId}, cefr=${cefr}`);

    return {
      language,
      cefr,
      confidence: coverageByLevel[cefr]?.coverage ?? 0,
      coverage: coverageByLevel,
      signals: this.explainSignals(stats),
    };
  }

  // -------------------------------
  // Core logic
  // -------------------------------
  /**
   * Compute mastery coverage for each CEFR level.
   *
   * @param stats - Array of UserWordStatistics for the user.
   * @returns Record mapping each CefrLevel to its coverage summary.
   */
  private computeCoverage(
    stats: UserWordStatistics[],
  ): Record<CefrLevel, CefrCoverage> {
    const result = {} as Record<CefrLevel, CefrCoverage>;

    for (const level of LEVEL_ORDER) {
      const words = stats.filter(s => s.word.cefr === level);

      let mastered = 0;
      let total = 0;

      for (const s of words) {
        const weight = this.posWeight(s.word.pos);
        total += weight;

        if ((s.score ?? 0) >= MASTERY_THRESHOLD) {
          mastered += weight;
        }
      }

      result[level] = {
        total,
        mastered,
        coverage: total === 0 ? 0 : mastered / total,
      };

      this.logger.debug(
        `CEFR ${level}: mastered=${result[level].mastered}, total=${result[level].total}, coverage=${result[level].coverage}`,
      );
    }

    return result;
  }

  /**
   * Infer the user's CEFR level from coverage and promotion thresholds.
   *
   * @param coverage - Coverage per CEFR level.
   * @returns The inferred CEFR level.
   */
  private inferCefrLevel(
    coverage: Record<CefrLevel, CefrCoverage>,
  ): CefrLevel {
    let current: CefrLevel = 'A1';

    for (const level of LEVEL_ORDER) {
      const threshold = PROMOTION_THRESHOLDS[level];
      if ((coverage[level]?.coverage ?? 0) >= threshold) {
        current = level;
      } else {
        break;
      }
    }

    this.logger.debug(`Inferred CEFR level: ${current}`);
    return current;
  }

  // -------------------------------
  // Explanation layer
  // -------------------------------
  /**
   * Generate explanatory signals for user's mastery of function words and verbs.
   *
   * @param stats - Array of UserWordStatistics for the user.
   * @returns Array of descriptive strings highlighting user strengths/weaknesses.
   */
  private explainSignals(stats: UserWordStatistics[]): string[] {
    const signals: string[] = [];

    const verbs = stats.filter(s => s.word.pos === 'VERB');
    const functionWords = stats.filter(s =>
      ['PART', 'PRON', 'AUX'].includes(s.word.pos),
    );

    const verbMastery =
      verbs.filter(v => (v.score ?? 0) >= MASTERY_THRESHOLD).length /
      Math.max(verbs.length, 1);

    const functionMastery =
      functionWords.filter(f => (f.score ?? 0) >= MASTERY_THRESHOLD).length /
      Math.max(functionWords.length, 1);

    if (functionMastery > 0.7) {
      signals.push('Strong function-word control');
    }

    if (verbMastery > 0.6) {
      signals.push('Reliable verb usage');
    } else {
      signals.push('Verb morphology still developing');
    }

    this.logger.debug(`Signals: ${signals.join('; ')}`);
    return signals;
  }

  /**
   * Return the weight for a part-of-speech tag.
   *
   * @param tag - The POS tag (e.g., 'VERB', 'NOUN').
   * @returns Weight factor to be applied in coverage calculation.
   */
  private posWeight(tag?: string) {
    if (!tag) return POS_WEIGHT.DEFAULT;
    return POS_WEIGHT[tag] ?? POS_WEIGHT.DEFAULT;
  }
}
