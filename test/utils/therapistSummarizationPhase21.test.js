/**
 * @file test/utils/therapistSummarizationPhase21.test.js
 *
 * Phase 2.1 — Real Session-End Invocation Path & Actual Summarization Step
 *
 * PURPOSE
 * -------
 * 1. Verify that there is now a real session-end invocation path
 *    (triggerSessionEndSummarization).
 * 2. Verify that the invocation path is gated and inert in default mode.
 * 3. Verify that there is now an actual summarization step that derives
 *    structured output FROM session/conversation input
 *    (deriveSessionSummaryPayload).
 * 4. Verify that the summarization step does NOT accept only pre-shaped payloads
 *    — it derives the record from raw session entity fields.
 * 5. Verify that the bounded input window is respected.
 * 6. Verify that transcript dumping does not occur.
 * 7. Verify that output matches the Phase 1 therapist-memory contract.
 * 8. Verify that malformed / missing input is handled safely.
 * 9. Verify that summarization failure does not break the existing flow.
 * 10. Verify that flag-off preserves the current therapist path (additive check).
 * 11. Verify that rollback remains safe.
 *
 * CONSTRAINTS
 * -----------
 * - Does NOT import from base44/functions/ (Deno code — not importable in Vitest).
 * - Does NOT import from CoachingChat.jsx (React component — not unit-testable here).
 * - Does NOT modify Phase 0, 0.1, 1, or 2 test files.
 * - Additive only — all prior phase tests remain unchanged.
 *
 * Source of truth: docs/therapist-upgrade-stage2-plan.md — Phase 2.1
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  SESSION_SUMMARIZATION_MAX_MESSAGES,
  deriveSessionSummaryPayload,
  triggerSessionEndSummarization,
} from '../../src/lib/sessionEndSummarization.js';

import {
  isSummarizationEnabled,
  buildSafeStubRecord,
  sanitizeSummaryRecord,
  isRawTranscriptContent,
  SUMMARIZATION_FORBIDDEN_INPUT_FIELDS,
} from '../../src/lib/summarizationGate.js';

import {
  THERAPIST_MEMORY_VERSION_KEY,
  THERAPIST_MEMORY_VERSION,
  THERAPIST_MEMORY_ARRAY_FIELDS,
  THERAPIST_MEMORY_STRING_FIELDS,
} from '../../src/lib/therapistMemoryModel.js';

import {
  THERAPIST_UPGRADE_FLAGS,
  isUpgradeEnabled,
} from '../../src/lib/featureFlags.js';

// ─── Section 1 — Invocation path exports exist ────────────────────────────────

describe('Phase 2.1 — Session-end invocation path is exported', () => {
  it('triggerSessionEndSummarization is exported as a function', () => {
    expect(typeof triggerSessionEndSummarization).toBe('function');
  });

  it('deriveSessionSummaryPayload is exported as a function', () => {
    expect(typeof deriveSessionSummaryPayload).toBe('function');
  });

  it('SESSION_SUMMARIZATION_MAX_MESSAGES is exported as a positive integer', () => {
    expect(typeof SESSION_SUMMARIZATION_MAX_MESSAGES).toBe('number');
    expect(SESSION_SUMMARIZATION_MAX_MESSAGES).toBeGreaterThan(0);
    expect(Number.isInteger(SESSION_SUMMARIZATION_MAX_MESSAGES)).toBe(true);
  });
});

// ─── Section 2 — Invocation path is gated and inert in default mode ───────────

describe('Phase 2.1 — Invocation path is gated (flag-off isolation)', () => {
  it('isSummarizationEnabled() returns false in default mode', () => {
    expect(isSummarizationEnabled()).toBe(false);
  });

  it('triggerSessionEndSummarization returns without side effects when gate is off', () => {
    // Should not throw, should return undefined (synchronously inert)
    const session = { id: 'test-session-1', stage: 'completed' };
    const messages = [];
    expect(() => triggerSessionEndSummarization(session, messages)).not.toThrow();
  });

  it('triggerSessionEndSummarization returns void when gate is off', () => {
    const session = { id: 'test-session-2', stage: 'completed' };
    const result = triggerSessionEndSummarization(session, []);
    expect(result).toBeUndefined();
  });

  it('triggerSessionEndSummarization is inert with null session when gate is off', () => {
    expect(() => triggerSessionEndSummarization(null, [])).not.toThrow();
  });

  it('triggerSessionEndSummarization is inert with no args when gate is off', () => {
    expect(() => triggerSessionEndSummarization()).not.toThrow();
  });

  it('THERAPIST_UPGRADE_SUMMARIZATION_ENABLED flag is false in default mode', () => {
    expect(THERAPIST_UPGRADE_FLAGS.THERAPIST_UPGRADE_SUMMARIZATION_ENABLED).toBe(false);
  });

  it('THERAPIST_UPGRADE_ENABLED master gate is false in default mode', () => {
    expect(THERAPIST_UPGRADE_FLAGS.THERAPIST_UPGRADE_ENABLED).toBe(false);
  });

  it('gate check happens before any side-effect code in triggerSessionEndSummarization', () => {
    // Calling with deliberately bad session args that would blow up
    // if the function didn't gate-check first.
    const badSession = Object.create(null); // no prototype, unusual object
    expect(() => triggerSessionEndSummarization(badSession, null, 'test')).not.toThrow();
  });
});

// ─── Section 3 — deriveSessionSummaryPayload: actual summarization from input ──

describe('Phase 2.1 — deriveSessionSummaryPayload: summarizes from real session input', () => {
  it('returns a record (not an empty stub) given a well-formed session', () => {
    const session = {
      id: 'session-abc',
      stage: 'review',
      focus_area: 'stress_management',
      current_challenge: 'Overwhelmed at work',
      desired_outcome: 'Reduce daily stress',
      action_plan: [],
      related_goals: [],
    };
    const record = deriveSessionSummaryPayload(session, []);
    expect(record).toBeDefined();
    expect(typeof record).toBe('object');
  });

  it('derives session_summary from focus_area and current_challenge (not from messages)', () => {
    const session = {
      id: 's1',
      stage: 'action',
      focus_area: 'mood_improvement',
      current_challenge: 'Feeling low energy',
      desired_outcome: 'Feel energized',
    };
    const record = deriveSessionSummaryPayload(session, []);
    expect(typeof record.session_summary).toBe('string');
    expect(record.session_summary.length).toBeGreaterThan(0);
    // Must reference structured metadata, not raw message content
    expect(record.session_summary).toContain('mood_improvement');
    expect(record.session_summary).toContain('Feeling low energy');
  });

  it('includes desired_outcome in session_summary when present', () => {
    const session = {
      id: 's2',
      stage: 'planning',
      focus_area: 'goal_achievement',
      current_challenge: 'Struggling to plan',
      desired_outcome: 'Have a clear 30-day plan',
    };
    const record = deriveSessionSummaryPayload(session, []);
    expect(record.session_summary).toContain('Have a clear 30-day plan');
  });

  it('produces a session_summary even when focus_area is absent', () => {
    const session = {
      id: 's3',
      stage: 'discovery',
      current_challenge: 'Anxiety about presentations',
    };
    const record = deriveSessionSummaryPayload(session, []);
    expect(typeof record.session_summary).toBe('string');
    expect(record.session_summary).toContain('Anxiety about presentations');
  });

  it('extracts follow_up_tasks from incomplete action_plan items', () => {
    const session = {
      id: 's4',
      stage: 'action',
      action_plan: [
        { title: 'Practice breathing daily', completed: false },
        { title: 'Write journal entry', completed: false },
        { title: 'Completed task', completed: true },
      ],
    };
    const record = deriveSessionSummaryPayload(session, []);
    expect(Array.isArray(record.follow_up_tasks)).toBe(true);
    expect(record.follow_up_tasks).toContain('Practice breathing daily');
    expect(record.follow_up_tasks).toContain('Write journal entry');
    expect(record.follow_up_tasks).not.toContain('Completed task');
  });

  it('extracts actions from completed action_plan items', () => {
    const session = {
      id: 's5',
      stage: 'review',
      action_plan: [
        { title: 'Done: meditated', completed: true },
        { title: 'Not done yet', completed: false },
      ],
    };
    const record = deriveSessionSummaryPayload(session, []);
    expect(Array.isArray(record.actions)).toBe(true);
    expect(record.actions).toContain('Done: meditated');
    expect(record.actions).not.toContain('Not done yet');
  });

  it('extracts goals_referenced from related_goals', () => {
    const session = {
      id: 's6',
      stage: 'planning',
      related_goals: ['goal-id-001', 'goal-id-002'],
    };
    const record = deriveSessionSummaryPayload(session, []);
    expect(Array.isArray(record.goals_referenced)).toBe(true);
    expect(record.goals_referenced).toContain('goal-id-001');
    expect(record.goals_referenced).toContain('goal-id-002');
  });

  it('derives interventions_used from session stage', () => {
    const session = { id: 's7', stage: 'discovery' };
    const record = deriveSessionSummaryPayload(session, []);
    expect(Array.isArray(record.interventions_used)).toBe(true);
    expect(record.interventions_used).toContain('discovery');
  });

  it('does NOT include stage in interventions_used when stage is "completed"', () => {
    const session = { id: 's8', stage: 'completed' };
    const record = deriveSessionSummaryPayload(session, []);
    expect(Array.isArray(record.interventions_used)).toBe(true);
    expect(record.interventions_used).not.toContain('completed');
  });

  it('sets session_id from session.id', () => {
    const session = { id: 'known-id-xyz', stage: 'review' };
    const record = deriveSessionSummaryPayload(session, []);
    expect(record.session_id).toBe('known-id-xyz');
  });

  it('uses session.created_date as session_date when available', () => {
    const dateStr = '2024-06-15T10:00:00.000Z';
    const session = { id: 's9', stage: 'review', created_date: dateStr };
    const record = deriveSessionSummaryPayload(session, []);
    expect(record.session_date).toBe(dateStr);
  });

  it('falls back to a valid ISO date for session_date when created_date is absent', () => {
    const session = { id: 's10', stage: 'action' };
    const record = deriveSessionSummaryPayload(session, []);
    expect(typeof record.session_date).toBe('string');
    // Should be a valid ISO date string
    expect(() => new Date(record.session_date)).not.toThrow();
    expect(new Date(record.session_date).getTime()).not.toBeNaN();
  });

  it('sets last_summarized_date to a valid ISO date', () => {
    const session = { id: 's11', stage: 'review' };
    const record = deriveSessionSummaryPayload(session, []);
    expect(typeof record.last_summarized_date).toBe('string');
    expect(() => new Date(record.last_summarized_date)).not.toThrow();
    expect(new Date(record.last_summarized_date).getTime()).not.toBeNaN();
  });
});

// ─── Section 4 — Output contract matches Phase 1 memory schema ───────────────

describe('Phase 2.1 — Output matches Phase 1 therapist-memory contract', () => {
  const exampleSession = {
    id: 'contract-session',
    stage: 'review',
    focus_area: 'stress_management',
    current_challenge: 'Work pressure',
    desired_outcome: 'Better work-life balance',
    action_plan: [
      { title: 'Meditate 5 mins', completed: false },
    ],
    related_goals: ['goal-001'],
  };

  it('record has therapist_memory_version key', () => {
    const record = deriveSessionSummaryPayload(exampleSession, []);
    expect(THERAPIST_MEMORY_VERSION_KEY in record).toBe(true);
  });

  it('record version marker equals THERAPIST_MEMORY_VERSION', () => {
    const record = deriveSessionSummaryPayload(exampleSession, []);
    expect(record[THERAPIST_MEMORY_VERSION_KEY]).toBe(THERAPIST_MEMORY_VERSION);
  });

  it('record has all string fields from Phase 1 schema', () => {
    const record = deriveSessionSummaryPayload(exampleSession, []);
    for (const field of THERAPIST_MEMORY_STRING_FIELDS) {
      expect(field in record, `record should have string field "${field}"`).toBe(true);
      expect(typeof record[field], `field "${field}" should be a string`).toBe('string');
    }
  });

  it('record has all array fields from Phase 1 schema', () => {
    const record = deriveSessionSummaryPayload(exampleSession, []);
    for (const field of THERAPIST_MEMORY_ARRAY_FIELDS) {
      expect(field in record, `record should have array field "${field}"`).toBe(true);
      expect(Array.isArray(record[field]), `field "${field}" should be an array`).toBe(true);
    }
  });

  it('all array field items are strings', () => {
    const record = deriveSessionSummaryPayload(exampleSession, []);
    for (const field of THERAPIST_MEMORY_ARRAY_FIELDS) {
      for (const item of record[field]) {
        expect(typeof item, `item in ${field} should be a string`).toBe('string');
      }
    }
  });

  it('record passes sanitizeSummaryRecord without triggering safety_stub', () => {
    const record = deriveSessionSummaryPayload(exampleSession, []);
    const { safety_stub, rejected_fields } = sanitizeSummaryRecord(record);
    expect(safety_stub).toBe(false);
    expect(rejected_fields).toHaveLength(0);
  });

  it('record does not contain any forbidden input fields', () => {
    const record = deriveSessionSummaryPayload(exampleSession, []);
    for (const forbidden of SUMMARIZATION_FORBIDDEN_INPUT_FIELDS) {
      expect(forbidden in record).toBe(false);
    }
  });
});

// ─── Section 5 — Bounded input window ────────────────────────────────────────

describe('Phase 2.1 — Bounded input window is enforced', () => {
  it('accepts an empty messages array', () => {
    const session = { id: 's-bound-1', stage: 'review' };
    expect(() => deriveSessionSummaryPayload(session, [])).not.toThrow();
  });

  it('accepts undefined messages (defaults to [])', () => {
    const session = { id: 's-bound-2', stage: 'review' };
    expect(() => deriveSessionSummaryPayload(session)).not.toThrow();
  });

  it('accepts a messages array within the window', () => {
    const session = { id: 's-bound-3', stage: 'action' };
    const messages = Array.from({ length: 10 }, (_, i) => ({
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: `Message ${i}`,
    }));
    expect(() => deriveSessionSummaryPayload(session, messages)).not.toThrow();
  });

  it('accepts a messages array larger than the window (not rejected, just bounded)', () => {
    const session = { id: 's-bound-4', stage: 'action' };
    const messages = Array.from({ length: SESSION_SUMMARIZATION_MAX_MESSAGES + 20 }, (_, i) => ({
      role: 'user',
      content: `Message ${i}`,
    }));
    // Must not throw — large input is bounded, not rejected
    expect(() => deriveSessionSummaryPayload(session, messages)).not.toThrow();
  });

  it('SESSION_SUMMARIZATION_MAX_MESSAGES is at most 100 (hard upper limit on window)', () => {
    // Enforce that the window stays conservative
    expect(SESSION_SUMMARIZATION_MAX_MESSAGES).toBeLessThanOrEqual(100);
  });

  it('does not store raw message content in the output', () => {
    const session = { id: 's-bound-5', stage: 'review' };
    const sensitiveContent = 'User: I feel terrible today. Therapist: I hear you.';
    const messages = [{ role: 'user', content: sensitiveContent }];
    const record = deriveSessionSummaryPayload(session, messages);
    // Raw message content must not appear in any string field
    for (const field of THERAPIST_MEMORY_STRING_FIELDS) {
      expect(record[field]).not.toContain(sensitiveContent);
    }
    // And must not appear in any array field items
    for (const field of THERAPIST_MEMORY_ARRAY_FIELDS) {
      for (const item of record[field]) {
        expect(item).not.toContain(sensitiveContent);
      }
    }
  });
});

// ─── Section 6 — Transcript dumping prevention ───────────────────────────────

describe('Phase 2.1 — Transcript dumping is prevented', () => {
  it('session_summary is not a raw transcript string', () => {
    const session = {
      id: 's-transcript-1',
      stage: 'review',
      focus_area: 'mood_improvement',
      current_challenge: 'User: I feel stressed. Therapist: Let us explore that.',
    };
    // Even if current_challenge looks transcript-like, the sanitizer clears it
    const record = deriveSessionSummaryPayload(session, []);
    expect(isRawTranscriptContent(record.session_summary)).toBe(false);
  });

  it('all string fields pass the raw-transcript-content check', () => {
    const session = {
      id: 's-transcript-2',
      stage: 'discovery',
      focus_area: 'behavior_change',
      current_challenge: 'Breaking habits',
    };
    const record = deriveSessionSummaryPayload(session, []);
    for (const field of THERAPIST_MEMORY_STRING_FIELDS) {
      if (typeof record[field] === 'string' && record[field].length > 0) {
        expect(
          isRawTranscriptContent(record[field]),
          `field "${field}" should not contain raw transcript content`,
        ).toBe(false);
      }
    }
  });

  it('array fields do not contain items that look like raw transcript lines', () => {
    const session = {
      id: 's-transcript-3',
      stage: 'action',
      action_plan: [
        { title: 'User: I will meditate daily', completed: false },
        { title: 'Practice mindfulness', completed: false },
      ],
    };
    // "User: I will meditate daily" matches the transcript pattern — must be dropped
    const record = deriveSessionSummaryPayload(session, []);
    for (const field of THERAPIST_MEMORY_ARRAY_FIELDS) {
      for (const item of record[field]) {
        expect(
          isRawTranscriptContent(item),
          `item "${item}" in ${field} should not contain raw transcript content`,
        ).toBe(false);
      }
    }
  });
});

// ─── Section 7 — Malformed / missing input is handled safely ─────────────────

describe('Phase 2.1 — Malformed input is handled safely', () => {
  it('handles null session → returns safe stub record', () => {
    const result = deriveSessionSummaryPayload(null, []);
    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
    expect(result[THERAPIST_MEMORY_VERSION_KEY]).toBe(THERAPIST_MEMORY_VERSION);
  });

  it('handles undefined session → returns safe stub record', () => {
    const result = deriveSessionSummaryPayload(undefined, []);
    expect(result).toBeDefined();
    expect(result[THERAPIST_MEMORY_VERSION_KEY]).toBe(THERAPIST_MEMORY_VERSION);
  });

  it('handles session with no id → session_id defaults to empty string', () => {
    const session = { stage: 'review' };
    const record = deriveSessionSummaryPayload(session, []);
    expect(record.session_id).toBe('');
  });

  it('handles session with null action_plan → follow_up_tasks is empty array', () => {
    const session = { id: 's-null-ap', stage: 'action', action_plan: null };
    const record = deriveSessionSummaryPayload(session, []);
    expect(Array.isArray(record.follow_up_tasks)).toBe(true);
    expect(record.follow_up_tasks).toHaveLength(0);
  });

  it('handles session with non-array action_plan → follow_up_tasks is empty array', () => {
    const session = { id: 's-bad-ap', stage: 'action', action_plan: 'not-an-array' };
    const record = deriveSessionSummaryPayload(session, []);
    expect(Array.isArray(record.follow_up_tasks)).toBe(true);
  });

  it('handles session with null related_goals → goals_referenced is empty array', () => {
    const session = { id: 's-null-goals', stage: 'review', related_goals: null };
    const record = deriveSessionSummaryPayload(session, []);
    expect(Array.isArray(record.goals_referenced)).toBe(true);
    expect(record.goals_referenced).toHaveLength(0);
  });

  it('handles non-array messages argument → no throw', () => {
    const session = { id: 's-bad-msgs', stage: 'review' };
    expect(() => deriveSessionSummaryPayload(session, 'not-an-array')).not.toThrow();
  });

  it('handles action_plan items with non-string title → skipped gracefully', () => {
    const session = {
      id: 's-bad-title',
      stage: 'action',
      action_plan: [
        { title: 123, completed: false },
        { title: null, completed: false },
        { title: 'Valid task', completed: false },
      ],
    };
    const record = deriveSessionSummaryPayload(session, []);
    expect(record.follow_up_tasks).toContain('Valid task');
    expect(record.follow_up_tasks).not.toContain(123);
    expect(record.follow_up_tasks).not.toContain(null);
  });

  it('handles action_plan items with empty title → skipped gracefully', () => {
    const session = {
      id: 's-empty-title',
      stage: 'review',
      action_plan: [{ title: '   ', completed: false }, { title: 'Real task', completed: false }],
    };
    const record = deriveSessionSummaryPayload(session, []);
    expect(record.follow_up_tasks).toContain('Real task');
    expect(record.follow_up_tasks).not.toContain('   ');
    expect(record.follow_up_tasks).not.toContain('');
  });
});

// ─── Section 8 — Summarization failure does not break the existing flow ───────

describe('Phase 2.1 — Summarization failure is safe and non-blocking', () => {
  it('triggerSessionEndSummarization never throws even with pathological input', () => {
    // Even with completely broken input, this must not throw synchronously
    expect(() => triggerSessionEndSummarization(null)).not.toThrow();
    expect(() => triggerSessionEndSummarization(undefined, undefined)).not.toThrow();
    expect(() => triggerSessionEndSummarization({}, null, '')).not.toThrow();
    expect(() => triggerSessionEndSummarization(42, 'bad', null)).not.toThrow();
  });

  it('deriveSessionSummaryPayload never throws with any input shape', () => {
    const badInputs = [
      [null, []],
      [undefined, undefined],
      [{}, 'not-array'],
      [{ id: 1 }, []],
      [{ id: 'ok', action_plan: 'bad' }, []],
    ];
    for (const [session, msgs] of badInputs) {
      expect(() => deriveSessionSummaryPayload(session, msgs)).not.toThrow();
    }
  });

  it('session close is not dependent on summarization (gates are independent)', () => {
    // The invocation path is non-blocking (fire-and-forget).
    // This test confirms that when the gate is off, calling triggerSessionEndSummarization
    // returns synchronously — it does not block or change observable state.
    const before = Date.now();
    triggerSessionEndSummarization({ id: 'x', stage: 'completed' }, [], 'test');
    const after = Date.now();
    // Should return in << 1 second (synchronous gate check path)
    expect(after - before).toBeLessThan(50);
  });
});

// ─── Section 9 — Flag-off preserves the current therapist path ────────────────

describe('Phase 2.1 — Flag-off preserves the current therapist path', () => {
  it('all Stage 2 flags remain false in default mode', () => {
    for (const [flag, value] of Object.entries(THERAPIST_UPGRADE_FLAGS)) {
      expect(value, `Flag ${flag} should be false in default mode`).toBe(false);
    }
  });

  it('isUpgradeEnabled returns false for all flags in default mode', () => {
    for (const flag of Object.keys(THERAPIST_UPGRADE_FLAGS)) {
      if (flag === 'THERAPIST_UPGRADE_ENABLED') continue;
      expect(isUpgradeEnabled(flag), `isUpgradeEnabled("${flag}") should be false`).toBe(false);
    }
  });

  it('isSummarizationEnabled() is false (no summarization in default mode)', () => {
    expect(isSummarizationEnabled()).toBe(false);
  });

  it('triggerSessionEndSummarization is a no-op in default mode (no async side effects)', () => {
    // Spy on console.warn to confirm no warning fires in default mode
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    triggerSessionEndSummarization({ id: 'default-test', stage: 'completed' }, []);
    // No console.warn from Phase 2.1 (only fires on actual failure, which won't happen here)
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});

// ─── Section 10 — Rollback safety ────────────────────────────────────────────

describe('Phase 2.1 — Rollback remains safe', () => {
  it('THERAPIST_UPGRADE_FLAGS is frozen (cannot be mutated at runtime)', () => {
    expect(Object.isFrozen(THERAPIST_UPGRADE_FLAGS)).toBe(true);
  });

  it('disabling THERAPIST_UPGRADE_ENABLED disables all per-phase flags (single rollback)', () => {
    // With master flag false, all per-phase flags return false
    expect(isUpgradeEnabled('THERAPIST_UPGRADE_MEMORY_ENABLED')).toBe(false);
    expect(isUpgradeEnabled('THERAPIST_UPGRADE_SUMMARIZATION_ENABLED')).toBe(false);
    expect(isUpgradeEnabled('THERAPIST_UPGRADE_WORKFLOW_ENABLED')).toBe(false);
  });

  it('deriveSessionSummaryPayload is pure and deterministic (safe to call repeatedly)', () => {
    const session = {
      id: 'rollback-session',
      stage: 'review',
      focus_area: 'stress_management',
      current_challenge: 'Work stress',
      action_plan: [{ title: 'Meditate', completed: false }],
      related_goals: ['goal-1'],
    };
    const record1 = deriveSessionSummaryPayload(session, []);
    const record2 = deriveSessionSummaryPayload(session, []);
    // Both should have the same structure and field types
    expect(record1[THERAPIST_MEMORY_VERSION_KEY]).toBe(record2[THERAPIST_MEMORY_VERSION_KEY]);
    expect(record1.session_id).toBe(record2.session_id);
    expect(record1.follow_up_tasks).toEqual(record2.follow_up_tasks);
    expect(record1.goals_referenced).toEqual(record2.goals_referenced);
  });

  it('safe stub from buildSafeStubRecord passes the Phase 1 schema check', () => {
    const stub = buildSafeStubRecord('stub-id', '2024-01-01');
    expect(stub[THERAPIST_MEMORY_VERSION_KEY]).toBe(THERAPIST_MEMORY_VERSION);
    for (const field of THERAPIST_MEMORY_ARRAY_FIELDS) {
      expect(Array.isArray(stub[field])).toBe(true);
    }
    for (const field of THERAPIST_MEMORY_STRING_FIELDS) {
      if (
        field !== 'session_id' &&
        field !== 'session_date' &&
        field !== 'last_summarized_date' &&
        field !== THERAPIST_MEMORY_VERSION_KEY
      ) {
        expect(stub[field]).toBe('');
      }
    }
  });
});

// ─── Section 11 — Prior phase baselines still preserved (additive check) ──────

describe('Phase 2.1 — Prior phase baselines are preserved', () => {
  it('Phase 0: THERAPIST_UPGRADE_ENABLED is false', () => {
    expect(THERAPIST_UPGRADE_FLAGS.THERAPIST_UPGRADE_ENABLED).toBe(false);
  });

  it('Phase 1: THERAPIST_UPGRADE_MEMORY_ENABLED is false', () => {
    expect(THERAPIST_UPGRADE_FLAGS.THERAPIST_UPGRADE_MEMORY_ENABLED).toBe(false);
  });

  it('Phase 2: THERAPIST_UPGRADE_SUMMARIZATION_ENABLED is false', () => {
    expect(THERAPIST_UPGRADE_FLAGS.THERAPIST_UPGRADE_SUMMARIZATION_ENABLED).toBe(false);
  });

  it('Phase 2: isSummarizationEnabled() still returns false (Phase 2 gate still works)', () => {
    expect(isSummarizationEnabled()).toBe(false);
  });

  it('Phase 2: sanitizeSummaryRecord still works correctly (additive check)', () => {
    const { record, safety_stub } = sanitizeSummaryRecord({
      session_id: 'check-1',
      session_summary: 'Clean summary text',
      follow_up_tasks: ['task 1', 'task 2'],
    });
    expect(safety_stub).toBe(false);
    expect(record.session_id).toBe('check-1');
    expect(record.session_summary).toBe('Clean summary text');
    expect(record.follow_up_tasks).toContain('task 1');
  });

  it('Phase 2: buildSafeStubRecord still returns a valid stub (additive check)', () => {
    const stub = buildSafeStubRecord('sid', '2024-01-01');
    expect(stub[THERAPIST_MEMORY_VERSION_KEY]).toBe(THERAPIST_MEMORY_VERSION);
    expect(stub.session_summary).toBe('');
  });
});
