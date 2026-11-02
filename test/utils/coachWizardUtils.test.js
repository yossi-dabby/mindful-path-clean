import { describe, expect, it } from 'vitest';
import { buildGoalPayload, buildThoughtJournalPayload, formatLocalDate } from '../../src/components/coach/coachWizardUtils.js';

describe('premium coach wizard payloads', () => {
  it('trims and validates a thought journal entry', () => {
    expect(buildThoughtJournalPayload({
      thought_type: 'overthinking', situation: '  A meeting  ', automatic_thoughts: '  I will fail  ',
      emotions: ['anxious'], emotion_intensity: 8, balanced_thought: '  I can prepare  '
    })).toEqual({
      entry_type: 'cbt_standard', situation: 'A meeting', automatic_thoughts: 'I will fail',
      emotions: ['anxious'], emotion_intensity: 8, tags: ['overthinking'], balanced_thought: 'I can prepare'
    });
    expect(() => buildThoughtJournalPayload({ thought_type: 'other', situation: 'x', automatic_thoughts: '', emotions: [] })).toThrow('missing_required_thought_fields');
  });

  it('saves only meaningful goal fields and never stores UI metadata as SMART relevance', () => {
    const payload = buildGoalPayload({
      category: 'emotional', ui_category_key: 'emotional-emotions-stress', title: '  Pause before reacting  ',
      motivation: '  Feel calmer  ', description: ' ', target_date: '2026-09-30',
      milestones: [{ title: '  Practice once  ', description: '  This week  ', due_date: '2026-09-10' }, { title: ' ' }],
      smart_criteria: { specific: '  Pause  ', measurable: '', achievable: '', relevant: '  Supports my values  ', time_bound: '' },
      rewards: ['  Tea break  ', ' ']
    });
    expect(payload.smart_criteria).toEqual({ specific: 'Pause', relevant: 'Supports my values' });
    expect(JSON.stringify(payload)).not.toContain('UI Category');
    expect(payload.milestones).toHaveLength(1);
    expect(payload.rewards).toEqual(['Tea break']);
  });

  it('formats a date as a local calendar date instead of shifting time zones', () => {
    expect(formatLocalDate('2026-09-01', 'en-US')).toBe('9/1/2026');
    expect(formatLocalDate('', 'he')).toBe('');
  });
});
