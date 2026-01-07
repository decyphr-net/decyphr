import { CefrLevel } from './cefr.types';

export const MASTERY_THRESHOLD = 0.75;

export const PROMOTION_THRESHOLDS: Record<string, number> = {
  A1: 0.8,
  A2: 0.7,
  B1: 0.6,
  B2: 0.5,
  C1: 0.4,
};

// ---------------- POS weights ----------------
export const POS_WEIGHT: Record<string, number> = {
  VERB: 1.3,
  AUX: 1.2,
  PART: 1.5,
  PRON: 1.2,
  NOUN: 1.0,
  ADJ: 1.0,
  ADV: 1.0,
  DEFAULT: 1.0,
};

// CEFR level order
export const LEVEL_ORDER: CefrLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1'];
