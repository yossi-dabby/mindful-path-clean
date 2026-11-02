import { describe, it, expect } from 'vitest';
import { isGoalDateOverdue } from '../../src/components/goals/goalDatePresentation.js';

describe('goal deadline labels use calendar dates', () => {
  const evening = new Date(2026, 9, 28, 22, 30);
  it('keeps today separate from overdue, including timestamp-shaped dates', () => {
    expect(isGoalDateOverdue('2026-10-28', evening)).toBe(false);
    expect(isGoalDateOverdue('2026-10-28T00:00:00Z', evening)).toBe(false);
    expect(isGoalDateOverdue('2026-10-27', evening)).toBe(true);
    expect(isGoalDateOverdue('2026-10-29', evening)).toBe(false);
  });
  it('handles a year boundary and missing or invalid partial records', () => {
    expect(isGoalDateOverdue('2025-12-31', new Date(2026, 0, 1, 0, 1))).toBe(true);
    for (const value of [undefined, null, '', 'invalid', '2026-02-31']) expect(isGoalDateOverdue(value, evening)).toBe(false);
  });
});
