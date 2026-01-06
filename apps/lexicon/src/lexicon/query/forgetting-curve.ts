export function forgettingCurve(daysSinceSeen: number) {
  const LAMBDA = 0.08;
  const FLOOR = 0.15;

  const decay = Math.exp(-LAMBDA * daysSinceSeen);
  return Math.max(FLOOR, decay);
}