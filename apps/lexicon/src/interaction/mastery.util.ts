/**
 * Enum representing different types of mastery curves.
 * Used to adjust how quickly a user's evidence translates into a mastery score.
 */
export enum MasteryCurve {
  /** Default curve, standard weighting */
  DEFAULT = 'default',

  /** Function word curve, slower mastery accumulation */
  FUNCTION_WORD = 'function_word',
}

/** Mapping of curves to K-values used in the exponential mastery formula */
const K_VALUES: Record<MasteryCurve, number> = {
  [MasteryCurve.DEFAULT]: 10,
  [MasteryCurve.FUNCTION_WORD]: 5,
};

/**
 * Computes the mastery score based on accumulated evidence and a mastery curve.
 * The score is in the range [0,1] and uses an exponential decay formula:
 *
 * score = 1 - exp(-evidence / K)
 *
 * @param {number} evidence - The accumulated weighted interactions or evidence for the word
 * @param {MasteryCurve} [curve=MasteryCurve.DEFAULT] - The curve type to use for calculation
 * @returns {number} The computed mastery score (0 = no mastery, 1 = full mastery)
 */
export function computeMastery(
  evidence: number,
  curve: MasteryCurve = MasteryCurve.DEFAULT,
): number {
  if (evidence <= 0) return 0;
  return 1 - Math.exp(-evidence / K_VALUES[curve]);
}
