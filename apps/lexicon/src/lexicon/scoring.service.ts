import { Injectable } from '@nestjs/common';
import { Interaction } from 'src/interaction/interaction.entity';
import { computeMastery, MasteryCurve } from 'src/interaction/mastery.util';

@Injectable()
export class WordScoringService {
  // type weights for interaction types
  private readonly typeWeights: Record<string, number> = {
    lexicon_import: 0.25,
    translate_text: 0.4,
    chat_message: 0.6,
    chat_message_bot: 0.3,
    passive_read: 0.1,
    default: 0.3,
  };

  constructor() { }

  /**
   * Compute weighted interactions for a set of interactions, optionally filtered by time window
   */
  computeWeightedInteractions(
    interactions: Interaction[],
    days: number,
  ): number {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return interactions
      .filter((i) => i.timestamp >= cutoff)
      .reduce((sum, i) => sum + (this.typeWeights[i.type] ?? 0), 0);
  }

  /**
   * Compute mastery score using weighted interactions and mastery curve
   */
  computeScore(weightedInteractions: number, curve: MasteryCurve): number {
    return computeMastery(weightedInteractions, curve);
  }

  /**
   * Full calculation from interactions
   */
  scoreWord(
    interactions: Interaction[],
    curve: MasteryCurve,
  ): { score: number; weighted30Days: number } {
    const weighted30Days = this.computeWeightedInteractions(interactions, 30);
    const score = this.computeScore(weighted30Days, curve);
    return { score, weighted30Days };
  }

  decayScore(score: number, daysSinceSeen: number): number {
    if (score <= 0) return 0;

    const strength = Math.log1p(score);
    const lambda = 0.15;

    return score * Math.exp((-lambda * daysSinceSeen) / strength);
  }
}
