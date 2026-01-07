/**
 * mastery.util.spec.ts
 *
 * Unit tests for the mastery utility (enum + computeMastery).
 * ---------------------------------------------------------
 * Run with:  npm run test   (or `yarn test`)
 */

import { MasteryCurve, computeMastery } from './mastery.util';

describe('mastery.util', () => {
  /* --------------------------------------------------------------
     MasteryCurve enum
     -------------------------------------------------------------- */
  describe('MasteryCurve enum', () => {
    it('exposes the expected members with correct string values', () => {
      expect(MasteryCurve.DEFAULT).toBe('default');
      expect(MasteryCurve.FUNCTION_WORD).toBe('function_word');
    });
  });

  /* --------------------------------------------------------------
     computeMastery()
     -------------------------------------------------------------- */
  describe('computeMastery()', () => {
    const EPS = 1e-12; // tolerance for floating‑point comparisons

    it('returns 0 when evidence is zero or negative', () => {
      expect(computeMastery(0)).toBe(0);
      expect(computeMastery(-5)).toBe(0);
    });

    it('uses the DEFAULT curve when none is supplied', () => {
      const ev = 5;
      const expected = 1 - Math.exp(-ev / 10); // K = 10 for DEFAULT
      expect(Math.abs(computeMastery(ev) - expected)).toBeLessThan(EPS);
    });

    it('computes correctly for the FUNCTION_WORD curve', () => {
      const ev = 5;
      const expected = 1 - Math.exp(-ev / 5); // K = 5 for FUNCTION_WORD
      expect(
        Math.abs(computeMastery(ev, MasteryCurve.FUNCTION_WORD) - expected),
      ).toBeLessThan(EPS);
    });

    it('approaches 1 as evidence grows large (any curve)', () => {
      const huge = 1_000_000;
      const resultDefault = computeMastery(huge, MasteryCurve.DEFAULT);
      const resultFunc = computeMastery(huge, MasteryCurve.FUNCTION_WORD);
      expect(resultDefault).toBeCloseTo(1, 12);
      expect(resultFunc).toBeCloseTo(1, 12);
    });

    it('is monotonic increasing with evidence for a fixed curve', () => {
      const curve = MasteryCurve.DEFAULT;
      const values = [0, 0.5, 1, 2, 5, 10].map((e) => computeMastery(e, curve));
      for (let i = 1; i < values.length; i++) {
        expect(values[i]).toBeGreaterThanOrEqual(values[i - 1]);
      }
    });

    it('handles non‑integer evidence gracefully', () => {
      const ev = 3.14159;
      const expected = 1 - Math.exp(-ev / 10);
      expect(Math.abs(computeMastery(ev) - expected)).toBeLessThan(EPS);
    });
  });
});
