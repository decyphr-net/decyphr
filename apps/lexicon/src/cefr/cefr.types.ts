export type CefrLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1';

export interface CefrCoverage {
  total: number;
  mastered: number;
  coverage: number;
}
