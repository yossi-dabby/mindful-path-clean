import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { NumericSafety } from '../../src/utils/numericSafety.js';

describe('NumericSafety', () => {
  it('safeParseNumber always returns a finite number', () => {
    fc.assert(
      fc.property(fc.anything(), (value) => {
        const result = NumericSafety.safeParseNumber(value, 0);
        expect(Number.isFinite(result)).toBe(true);
      })
    );
  });

  it('clamp always keeps values within range', () => {
    fc.assert(
      fc.property(
        fc.double({ noNaN: true }),
        fc.double({ noNaN: true }),
        fc.double({ noNaN: true }),
        (value, a, b) => {
          const min = Math.min(a, b);
          const max = Math.max(a, b);
          const result = NumericSafety.clamp(value, min, max);
          expect(result).toBeGreaterThanOrEqual(min);
          expect(result).toBeLessThanOrEqual(max);
        }
      )
    );
  });
});
