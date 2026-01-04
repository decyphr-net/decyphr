import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User } from 'src/bank/bank.entity';
import { UserWordStatistics } from 'src/interaction/interaction.entity';

export type CefrLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1';

interface CefrCoverage {
  total: number;
  mastered: number;
  coverage: number;
}

@Injectable()
export class CefrAssessmentService {
  // ---- tuning knobs ----
  private readonly MASTERY_THRESHOLD = 0.75;

  private readonly PROMOTION_THRESHOLDS: Record<CefrLevel, number> = {
    A1: 0.8,
    A2: 0.7,
    B1: 0.6,
    B2: 0.5,
    C1: 0.4,
  };

  private readonly POS_WEIGHT: Record<string, number> = {
    VERB: 1.3,
    AUX: 1.2,
    PART: 1.5,
    PRON: 1.2,
    NOUN: 1.0,
    ADJ: 1.0,
    ADV: 1.0,
    DEFAULT: 1.0,
  };

  private readonly LEVEL_ORDER: CefrLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1'];

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    @InjectRepository(UserWordStatistics)
    private readonly statsRepository: Repository<UserWordStatistics>,
  ) { }

  // -------------------------------
  // Public API
  // -------------------------------
  async assess(clientId: string, language: string) {
    const user = await this.userRepository.findOne({
      where: { clientId },
    });
    if (!user) throw new Error(`User not found: ${clientId}`);

    const stats = await this.statsRepository
      .createQueryBuilder('uws')
      .innerJoinAndSelect('uws.word', 'word')
      .where('uws.userId = :uid', { uid: user.id })
      .andWhere('word.language = :lang', { lang: language })
      .andWhere('word.cefr IS NOT NULL')
      .getMany();

    const coverageByLevel = this.computeCoverage(stats);
    const cefr = this.inferCefrLevel(coverageByLevel);

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
  private computeCoverage(
    stats: UserWordStatistics[],
  ): Record<CefrLevel, CefrCoverage> {
    const result = {} as Record<CefrLevel, CefrCoverage>;

    for (const level of this.LEVEL_ORDER) {
      const words = stats.filter(s => s.word.cefr === level);

      let mastered = 0;
      let total = 0;

      for (const s of words) {
        const weight = this.posWeight(s.word.tag);
        total += weight;

        if ((s.score ?? 0) >= this.MASTERY_THRESHOLD) {
          mastered += weight;
        }
      }

      result[level] = {
        total,
        mastered,
        coverage: total === 0 ? 0 : mastered / total,
      };
    }

    return result;
  }

  private inferCefrLevel(
    coverage: Record<CefrLevel, CefrCoverage>,
  ): CefrLevel {
    let current: CefrLevel = 'A1';

    for (const level of this.LEVEL_ORDER) {
      const threshold = this.PROMOTION_THRESHOLDS[level];
      if ((coverage[level]?.coverage ?? 0) >= threshold) {
        current = level;
      } else {
        break;
      }
    }

    return current;
  }

  // -------------------------------
  // Explanation layer
  // -------------------------------
  private explainSignals(stats: UserWordStatistics[]): string[] {
    const signals: string[] = [];

    const verbs = stats.filter(s => s.word.tag === 'VERB');
    const functionWords = stats.filter(s =>
      ['PART', 'PRON', 'AUX'].includes(s.word.tag),
    );

    const verbMastery =
      verbs.filter(v => (v.score ?? 0) >= this.MASTERY_THRESHOLD).length /
      Math.max(verbs.length, 1);

    const functionMastery =
      functionWords.filter(f => (f.score ?? 0) >= this.MASTERY_THRESHOLD).length /
      Math.max(functionWords.length, 1);

    if (functionMastery > 0.7) {
      signals.push('Strong function-word control');
    }

    if (verbMastery > 0.6) {
      signals.push('Reliable verb usage');
    } else {
      signals.push('Verb morphology still developing');
    }

    return signals;
  }

  private posWeight(tag?: string) {
    if (!tag) return this.POS_WEIGHT.DEFAULT;
    return this.POS_WEIGHT[tag] ?? this.POS_WEIGHT.DEFAULT;
  }
}
