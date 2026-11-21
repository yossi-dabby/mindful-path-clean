import { describe, it, expect } from 'vitest';
import { createPageTransitionVariants, pageTransitionDirection } from '../../src/lib/pageTransitions.js';

describe('route transition direction', () => {
  it.each([false, true])('reverses back navigation for RTL=%s', (isRtl) => {
    const variants = createPageTransitionVariants(false);
    const forward = pageTransitionDirection(isRtl, 'PUSH');
    const back = pageTransitionDirection(isRtl, 'POP');
    expect(back).toBe(-forward);
    expect(variants.initial(back).x).toBe(`${-forward * 100}%`);
    expect(variants.exit(back).x).toBe(`${forward * 30}%`);
  });
  it('keeps reduced-motion navigation stationary and immediate', () => {
    const variants = createPageTransitionVariants(true);
    for (const phase of Object.values(variants)) {
      expect(phase).toEqual({ x: 0, opacity: 1, transition: { duration: 0 } });
    }
  });
});
