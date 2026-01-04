export enum MasteryCurve {
  DEFAULT = 'default',
  FUNCTION_WORD = 'function_word',
}

const K_VALUES: Record<MasteryCurve, number> = {
  [MasteryCurve.DEFAULT]: 10,
  [MasteryCurve.FUNCTION_WORD]: 5,
};

export function computeMastery(
  evidence: number,
  curve: MasteryCurve = MasteryCurve.DEFAULT,
): number {
  if (evidence <= 0) return 0;
  return 1 - Math.exp(-evidence / K_VALUES[curve]);
}