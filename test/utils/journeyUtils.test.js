import { describe, expect, it } from 'vitest';
import {
  buildJourneyProgressMap,
  getJourneyProgressPercentage,
  groupJourneysByProgress,
} from '../../src/components/journeys/journeyUtils.js';

describe('journey progress utilities', () => {
  it('returns a safe, clamped percentage and ignores duplicate step records', () => {
    expect(getJourneyProgressPercentage(null, 0)).toBe(0);
    expect(getJourneyProgressPercentage({ total_steps: 0, completed_steps: [] }, 0)).toBe(0);
    expect(getJourneyProgressPercentage({
      total_steps: 4,
      completed_steps: [{ step_index: 0 }, { step_index: 0 }, { step_index: 1 }],
    })).toBe(50);
    expect(getJourneyProgressPercentage({
      total_steps: 1,
      completed_steps: [{ step_index: 0 }, { step_index: 1 }],
    })).toBe(100);
  });

  it('uses the latest progress record when duplicate journey records exist', () => {
    const older = { id: 'old', journey_id: 'j1', status: 'in_progress', updated_date: '2026-01-01' };
    const newer = { id: 'new', journey_id: 'j1', status: 'completed', updated_date: '2026-02-01' };
    expect(buildJourneyProgressMap([newer, older]).j1.id).toBe('new');
    expect(buildJourneyProgressMap([older, newer]).j1.id).toBe('new');
  });

  it('keeps paused journeys visible in the in-progress group', () => {
    const journeys = [{ id: 'available' }, { id: 'paused' }, { id: 'done' }];
    const grouped = groupJourneysByProgress(journeys, [
      { journey_id: 'paused', status: 'paused' },
      { journey_id: 'done', status: 'completed' },
    ]);
    expect(grouped.available.map((item) => item.id)).toEqual(['available']);
    expect(grouped.inProgress.map((item) => item.id)).toEqual(['paused']);
    expect(grouped.completed.map((item) => item.id)).toEqual(['done']);
  });
});
