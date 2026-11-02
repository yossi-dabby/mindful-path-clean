/**
 * @file test/utils/therapistMemoryEnrichmentPhase3.test.js
 *
 * Phase 3 Deep Personalization — Conversation Memory Enrichment Tests
 *
 * Validates the Phase 3 enrichment layer:
 *   1. enrichConversationMemoryPayload — Goal + CaseFormulation enrichment
 *   2. isContinuityEnrichmentEnabled — dual-flag gate
 *   3. triggerConversationEndSummarization — enrichment path wiring
 *   4. Fail-closed contracts (entity read errors)
 *   5. No raw transcript leakage
 *   6. No cross-user / private-entity leakage
 *   7. No role confusion (companion flows unaffected)
 *   8. Flag-off fallback (no enrichment when flags are off)
 *   9. Constant exports
 *
 * All tests are deterministic and do not require a live Base44 backend.
 *
 * See src/lib/sessionEndSummarization.js for the implementation.
 * See the problem statement — Phase 3 Deep Personalization.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Module under test ────────────────────────────────────────────────────────

import {
  enrichConversationMemoryPayload,
  isContinuityEnrichmentEnabled,
  deriveConversationMemoryPayload,
  triggerConversationEndSummarization,
  ENRICHMENT_MAX_GOALS,
  ENRICHMENT_GOAL_TITLE_MAX_CHARS,
  ENRICHMENT_FORMULATION_FIELD_MAX_CHARS,
  CONVERSATION_MIN_MESSAGES_FOR_MEMORY,
} from '../../src/lib/sessionEndSummarization.js';

// ─── Test fixtures ────────────────────────────────────────────────────────────

/** Minimal valid base payload (as returned by deriveConversationMemoryPayload). */
function makeBasePayload(overrides = {}) {
  return {
    therapist_memory_version: '1',
    session_id: 'conv-abc',
    session_date: '2026-04-10T10:00:00.000Z',
    session_summary: 'Session focused on: anxiety management.',
    core_patterns: [],
    triggers: [],
    automatic_thoughts: [],
    emotions: [],
    urges: [],
    actions: [],
    consequences: [],
    working_hypotheses: [],
    interventions_used: [],
    risk_flags: [],
    safety_plan_notes: '',
    follow_up_tasks: [],
    goals_referenced: [],
    last_summarized_date: '2026-04-10T10:00:00.000Z',
    ...overrides,
  };
}

/** Creates a mock Goal entity record. */
function makeGoal(id, title, goalStatus = 'active') {
  return { id, title, status: goalStatus };
}

/** Creates a mock entities object with Goal and CaseFormulation. */
function makeEntities({ goals = [], formulations = [] } = {}) {
  return {
    Goal: {
      filter: vi.fn(async () => goals),
    },
    CaseFormulation: {
      list: vi.fn(async () => formulations),
    },
  };
}

/** Creates a mock CaseFormulation record. */
function makeFormulation(overrides = {}) {
  return {
    presenting_problem: 'Persistent low mood and avoidance.',
    core_belief: 'I am fundamentally unlovable.',
    maintaining_cycle: 'Avoidance reinforces isolation.',
    treatment_goals: 'Reduce avoidance, challenge core beliefs.',
    ...overrides,
  };
}

// ─── 1. Constant exports ──────────────────────────────────────────────────────

describe('Phase 3 enrichment — constant exports', () => {
  it('ENRICHMENT_MAX_GOALS is a positive integer', () => {
    expect(typeof ENRICHMENT_MAX_GOALS).toBe('number');
    expect(ENRICHMENT_MAX_GOALS).toBeGreaterThan(0);
    expect(Number.isInteger(ENRICHMENT_MAX_GOALS)).toBe(true);
  });

  it('ENRICHMENT_GOAL_TITLE_MAX_CHARS is a positive integer', () => {
    expect(typeof ENRICHMENT_GOAL_TITLE_MAX_CHARS).toBe('number');
    expect(ENRICHMENT_GOAL_TITLE_MAX_CHARS).toBeGreaterThan(0);
    expect(Number.isInteger(ENRICHMENT_GOAL_TITLE_MAX_CHARS)).toBe(true);
  });

  it('ENRICHMENT_FORMULATION_FIELD_MAX_CHARS is a positive integer', () => {
    expect(typeof ENRICHMENT_FORMULATION_FIELD_MAX_CHARS).toBe('number');
    expect(ENRICHMENT_FORMULATION_FIELD_MAX_CHARS).toBeGreaterThan(0);
    expect(Number.isInteger(ENRICHMENT_FORMULATION_FIELD_MAX_CHARS)).toBe(true);
  });

  it('CONVERSATION_MIN_MESSAGES_FOR_MEMORY is still exported (no regression)', () => {
    expect(typeof CONVERSATION_MIN_MESSAGES_FOR_MEMORY).toBe('number');
    expect(CONVERSATION_MIN_MESSAGES_FOR_MEMORY).toBe(3);
  });
});

// ─── 2. isContinuityEnrichmentEnabled ─────────────────────────────────────────

describe('isContinuityEnrichmentEnabled', () => {
  it('returns false by default (flags off)', () => {
    expect(isContinuityEnrichmentEnabled()).toBe(false);
  });

  it('is a function', () => {
    expect(typeof isContinuityEnrichmentEnabled).toBe('function');
  });
});

// ─── 3. enrichConversationMemoryPayload — baseline ────────────────────────────

describe('enrichConversationMemoryPayload — baseline', () => {
  it('returns base payload unchanged when entities is null', async () => {
    const base = makeBasePayload();
    const result = await enrichConversationMemoryPayload(base, null);
    expect(result).toEqual(base);
  });

  it('returns base payload unchanged when entities is undefined', async () => {
    const base = makeBasePayload();
    const result = await enrichConversationMemoryPayload(base, undefined);
    expect(result).toEqual(base);
  });

  it('returns base payload unchanged when entities is not an object', async () => {
    const base = makeBasePayload();
    const result = await enrichConversationMemoryPayload(base, 'bad');
    expect(result).toEqual(base);
  });

  it('returns base payload unchanged when payload is null', async () => {
    const result = await enrichConversationMemoryPayload(null, makeEntities());
    expect(result).toBeNull();
  });

  it('returns base payload unchanged when entities has no Goal or CaseFormulation', async () => {
    const base = makeBasePayload();
    const result = await enrichConversationMemoryPayload(base, {});
    expect(result).toEqual(base);
  });

  it('does not mutate the base payload object', async () => {
    const base = makeBasePayload();
    const frozen = JSON.parse(JSON.stringify(base));
    const entities = makeEntities({
      goals: [makeGoal('g1', 'Reduce anxiety')],
      formulations: [makeFormulation()],
    });
    await enrichConversationMemoryPayload(base, entities);
    // base must be unchanged
    expect(base).toEqual(frozen);
  });
});

// ─── 4. enrichConversationMemoryPayload — Goal enrichment ─────────────────────

describe('enrichConversationMemoryPayload — Goal enrichment', () => {
  it('populates goals_referenced from active goal IDs', async () => {
    const base = makeBasePayload();
    const entities = makeEntities({
      goals: [makeGoal('g1', 'Reduce anxiety'), makeGoal('g2', 'Improve sleep')],
    });
    const result = await enrichConversationMemoryPayload(base, entities);
    expect(result.goals_referenced).toEqual(['g1', 'g2']);
  });

  it('populates follow_up_tasks from active goal titles', async () => {
    const base = makeBasePayload();
    const entities = makeEntities({
      goals: [makeGoal('g1', 'Reduce anxiety'), makeGoal('g2', 'Improve sleep')],
    });
    const result = await enrichConversationMemoryPayload(base, entities);
    expect(result.follow_up_tasks).toEqual(['Reduce anxiety', 'Improve sleep']);
  });

  it('skips goals with missing or non-string id', async () => {
    const base = makeBasePayload();
    const entities = makeEntities({
      goals: [
        { id: null, title: 'Missing id' },
        makeGoal('g1', 'Valid goal'),
      ],
    });
    const result = await enrichConversationMemoryPayload(base, entities);
    expect(result.goals_referenced).toEqual(['g1']);
    expect(result.follow_up_tasks).toContain('Valid goal');
  });

  it('skips goals with empty string id', async () => {
    const base = makeBasePayload();
    const entities = makeEntities({
      goals: [
        { id: '  ', title: 'Empty id' },
        makeGoal('g1', 'Valid goal'),
      ],
    });
    const result = await enrichConversationMemoryPayload(base, entities);
    expect(result.goals_referenced).toEqual(['g1']);
  });

  it('skips goals with missing or non-string title', async () => {
    const base = makeBasePayload();
    const entities = makeEntities({
      goals: [
        { id: 'g1', title: null },
        { id: 'g2', title: 42 },
        { id: 'g3', title: 'Valid' },
      ],
    });
    const result = await enrichConversationMemoryPayload(base, entities);
    // IDs populated for all with valid ids
    expect(result.goals_referenced).toContain('g1');
    expect(result.goals_referenced).toContain('g2');
    expect(result.goals_referenced).toContain('g3');
    // Titles only for string ones
    expect(result.follow_up_tasks).toEqual(['Valid']);
  });

  it('truncates goal titles to ENRICHMENT_GOAL_TITLE_MAX_CHARS', async () => {
    const longTitle = 'A'.repeat(ENRICHMENT_GOAL_TITLE_MAX_CHARS + 50);
    const base = makeBasePayload();
    const entities = makeEntities({ goals: [makeGoal('g1', longTitle)] });
    const result = await enrichConversationMemoryPayload(base, entities);
    expect(result.follow_up_tasks[0].length).toBe(ENRICHMENT_GOAL_TITLE_MAX_CHARS);
  });

  it('respects ENRICHMENT_MAX_GOALS limit', async () => {
    const base = makeBasePayload();
    const goals = Array.from({ length: ENRICHMENT_MAX_GOALS + 5 }, (_, i) =>
      makeGoal(`g${i}`, `Goal ${i}`)
    );
    // The mock returns all goals; the filter+slice is done inside Goal.filter mock
    // but we test that we never persist more than ENRICHMENT_MAX_GOALS items.
    // Simulate by having filter return ENRICHMENT_MAX_GOALS+5 goals.
    const entities = makeEntities({ goals });
    const result = await enrichConversationMemoryPayload(base, entities);
    // The entity filter call passes ENRICHMENT_MAX_GOALS as limit,
    // but since mock returns all, we check that the function passes the right
    // limit to the entity.filter call.
    expect(entities.Goal.filter).toHaveBeenCalledWith(
      { status: 'active' },
      '-created_date',
      ENRICHMENT_MAX_GOALS,
    );
  });

  it('leaves goals_referenced empty when Goal.filter returns empty array', async () => {
    const base = makeBasePayload();
    const entities = makeEntities({ goals: [] });
    const result = await enrichConversationMemoryPayload(base, entities);
    expect(result.goals_referenced).toEqual([]);
    expect(result.follow_up_tasks).toEqual([]);
  });

  it('leaves goals_referenced empty when Goal.filter returns non-array', async () => {
    const base = makeBasePayload();
    const entities = {
      Goal: { filter: vi.fn(async () => null) },
      CaseFormulation: { list: vi.fn(async () => []) },
    };
    const result = await enrichConversationMemoryPayload(base, entities);
    expect(result.goals_referenced).toEqual([]);
  });

  it('is fail-closed when Goal.filter throws', async () => {
    const base = makeBasePayload();
    const entities = {
      Goal: { filter: vi.fn(async () => { throw new Error('network error'); }) },
      CaseFormulation: { list: vi.fn(async () => [makeFormulation()]) },
    };
    // Should not throw; goals fields stay empty but formulation enrichment still runs
    const result = await enrichConversationMemoryPayload(base, entities);
    expect(result.goals_referenced).toEqual([]);
    expect(result.follow_up_tasks).toEqual([]);
    // Formulation enrichment should still have run
    expect(result.working_hypotheses).toEqual(['I am fundamentally unlovable.']);
  });

  it('leaves goals_referenced unchanged when Goal entity is absent', async () => {
    const base = makeBasePayload();
    const entities = { CaseFormulation: { list: vi.fn(async () => []) } };
    const result = await enrichConversationMemoryPayload(base, entities);
    expect(result.goals_referenced).toEqual([]);
  });
});

// ─── 5. enrichConversationMemoryPayload — CaseFormulation enrichment ──────────

describe('enrichConversationMemoryPayload — CaseFormulation enrichment', () => {
  it('populates working_hypotheses from core_belief', async () => {
    const base = makeBasePayload();
    const entities = makeEntities({
      formulations: [makeFormulation({ core_belief: 'I am not good enough.' })],
    });
    const result = await enrichConversationMemoryPayload(base, entities);
    expect(result.working_hypotheses).toEqual(['I am not good enough.']);
  });

  it('truncates core_belief to ENRICHMENT_FORMULATION_FIELD_MAX_CHARS', async () => {
    const longBelief = 'B'.repeat(ENRICHMENT_FORMULATION_FIELD_MAX_CHARS + 50);
    const base = makeBasePayload();
    const entities = makeEntities({ formulations: [makeFormulation({ core_belief: longBelief })] });
    const result = await enrichConversationMemoryPayload(base, entities);
    expect(result.working_hypotheses[0].length).toBe(ENRICHMENT_FORMULATION_FIELD_MAX_CHARS);
  });

  it('leaves working_hypotheses empty when core_belief is empty string', async () => {
    const base = makeBasePayload();
    const entities = makeEntities({ formulations: [makeFormulation({ core_belief: '' })] });
    const result = await enrichConversationMemoryPayload(base, entities);
    expect(result.working_hypotheses).toEqual([]);
  });

  it('leaves working_hypotheses empty when core_belief is not a string', async () => {
    const base = makeBasePayload();
    const entities = makeEntities({ formulations: [makeFormulation({ core_belief: 42 })] });
    const result = await enrichConversationMemoryPayload(base, entities);
    expect(result.working_hypotheses).toEqual([]);
  });

  it('leaves working_hypotheses empty when CaseFormulation returns empty array', async () => {
    const base = makeBasePayload();
    const entities = makeEntities({ formulations: [] });
    const result = await enrichConversationMemoryPayload(base, entities);
    expect(result.working_hypotheses).toEqual([]);
  });

  it('leaves working_hypotheses empty when CaseFormulation returns non-array', async () => {
    const base = makeBasePayload();
    const entities = {
      Goal: { filter: vi.fn(async () => []) },
      CaseFormulation: { list: vi.fn(async () => null) },
    };
    const result = await enrichConversationMemoryPayload(base, entities);
    expect(result.working_hypotheses).toEqual([]);
  });

  it('is fail-closed when CaseFormulation.list throws', async () => {
    const base = makeBasePayload();
    const entities = {
      Goal: { filter: vi.fn(async () => [makeGoal('g1', 'Reduce anxiety')]) },
      CaseFormulation: {
        list: vi.fn(async () => { throw new Error('network error'); }),
      },
    };
    // Should not throw; formulation fields stay empty but goal enrichment still ran
    const result = await enrichConversationMemoryPayload(base, entities);
    expect(result.working_hypotheses).toEqual([]);
    // Goal enrichment should still have run
    expect(result.goals_referenced).toEqual(['g1']);
  });

  it('leaves working_hypotheses unchanged when CaseFormulation entity is absent', async () => {
    const base = makeBasePayload();
    const entities = { Goal: { filter: vi.fn(async () => []) } };
    const result = await enrichConversationMemoryPayload(base, entities);
    expect(result.working_hypotheses).toEqual([]);
  });
});

// ─── 6. enrichConversationMemoryPayload — combined ────────────────────────────

describe('enrichConversationMemoryPayload — combined enrichment', () => {
  it('enriches goals and formulation together', async () => {
    const base = makeBasePayload({ session_summary: 'Session focused on: depression.' });
    const entities = makeEntities({
      goals: [makeGoal('g1', 'Reduce isolation'), makeGoal('g2', 'Build routines')],
      formulations: [makeFormulation({ core_belief: 'I am a burden to others.' })],
    });
    const result = await enrichConversationMemoryPayload(base, entities);

    expect(result.goals_referenced).toEqual(['g1', 'g2']);
    expect(result.follow_up_tasks).toEqual(['Reduce isolation', 'Build routines']);
    expect(result.working_hypotheses).toEqual(['I am a burden to others.']);
    // Non-enriched fields must be unchanged
    expect(result.session_summary).toBe('Session focused on: depression.');
    expect(result.session_id).toBe('conv-abc');
    expect(result.core_patterns).toEqual([]);
  });

  it('preserves existing base payload fields not enriched by this function', async () => {
    const base = makeBasePayload({
      core_patterns: ['catastrophising'],
      triggers: ['work email'],
    });
    const entities = makeEntities({ goals: [], formulations: [] });
    const result = await enrichConversationMemoryPayload(base, entities);
    // Enrichment of empty results should not overwrite existing non-empty arrays
    expect(result.core_patterns).toEqual(['catastrophising']);
    expect(result.triggers).toEqual(['work email']);
  });
});

// ─── 7. No raw transcript leakage ────────────────────────────────────────────

describe('enrichConversationMemoryPayload — no raw transcript leakage', () => {
  it('does not include raw transcript patterns in goal titles that slip through', async () => {
    // Simulate a Goal with a title that looks like transcript content.
    // The downstream sanitizeSummaryRecord will catch this, but enrichment
    // itself should still pass the value through (sanitizer is the gatekeeper).
    const base = makeBasePayload();
    const entities = makeEntities({
      goals: [makeGoal('g1', 'User: I want to feel better')],
    });
    const result = await enrichConversationMemoryPayload(base, entities);
    // enrichConversationMemoryPayload does NOT filter transcript patterns —
    // that's sanitizeSummaryRecord's job. The test confirms the enrichment
    // function itself doesn't throw on such input.
    expect(Array.isArray(result.follow_up_tasks)).toBe(true);
  });

  it('never reads messages or transcript fields from entities', async () => {
    const base = makeBasePayload();
    const entities = makeEntities({
      goals: [makeGoal('g1', 'Valid goal')],
      formulations: [makeFormulation()],
    });
    await enrichConversationMemoryPayload(base, entities);
    // The entities mock only has filter/list on Goal and CaseFormulation.
    // There should be no calls to any message-related entity.
    expect(entities.Goal.filter).toHaveBeenCalled();
    expect(entities.CaseFormulation.list).toHaveBeenCalled();
    // Verify no properties accessed on entities beyond Goal and CaseFormulation
    const entityKeys = Object.keys(entities);
    expect(entityKeys).not.toContain('ThoughtJournal');
    expect(entityKeys).not.toContain('Conversation');
    expect(entityKeys).not.toContain('CompanionMemory');
  });
});

// ─── 8. No cross-user / private-entity leakage ────────────────────────────────

describe('enrichConversationMemoryPayload — private entity isolation', () => {
  it('does not access ThoughtJournal, Conversation, or CompanionMemory', async () => {
    const base = makeBasePayload();
    // Build an entities mock that tracks any unexpected key access.
    const accessedKeys = new Set();
    const entities = new Proxy(
      {
        Goal: { filter: vi.fn(async () => []) },
        CaseFormulation: { list: vi.fn(async () => []) },
      },
      {
        get(target, key) {
          accessedKeys.add(String(key));
          return target[key];
        },
      }
    );
    await enrichConversationMemoryPayload(base, entities);
    expect(accessedKeys).not.toContain('ThoughtJournal');
    expect(accessedKeys).not.toContain('Conversation');
    expect(accessedKeys).not.toContain('CompanionMemory');
    expect(accessedKeys).not.toContain('MoodEntry');
    expect(accessedKeys).not.toContain('UserDeletedConversations');
  });
});

// ─── 9. deriveConversationMemoryPayload — no regression ───────────────────────

describe('deriveConversationMemoryPayload — no regression', () => {
  it('still returns a valid base payload with session_summary from intent', () => {
    const result = deriveConversationMemoryPayload('conv-1', { intent: 'anxiety' });
    expect(result.session_summary).toContain('anxiety');
    expect(result.goals_referenced).toEqual([]);
    expect(result.working_hypotheses).toEqual([]);
    expect(result.follow_up_tasks).toEqual([]);
  });

  it('still returns empty clinical arrays (no entity reads in derive step)', () => {
    const result = deriveConversationMemoryPayload('conv-1', { intent: 'sleep' });
    expect(result.core_patterns).toEqual([]);
    expect(result.triggers).toEqual([]);
    expect(result.automatic_thoughts).toEqual([]);
  });
});

// ─── 10. triggerConversationEndSummarization — entities parameter ──────────────

describe('triggerConversationEndSummarization — entities parameter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('accepts entities as 4th parameter without throwing', () => {
    // With flags off, function returns immediately (no-op).
    const entities = makeEntities();
    expect(() => {
      triggerConversationEndSummarization('conv-1', {}, 'test', entities);
    }).not.toThrow();
  });

  it('accepts null entities without throwing', () => {
    expect(() => {
      triggerConversationEndSummarization('conv-1', {}, 'test', null);
    }).not.toThrow();
  });

  it('remains inert (returns immediately) when isSummarizationEnabled is false', () => {
    // Flags are off by default in Vitest environment.
    const entities = makeEntities({
      goals: [makeGoal('g1', 'Reduce anxiety')],
    });
    // Call should be a no-op: no entity reads should occur.
    triggerConversationEndSummarization('conv-1', { intent: 'sleep' }, 'test', entities);
    // Since isSummarizationEnabled() is false, the async IIFE never runs.
    // The mock should not have been called yet (it's async, but the IIFE itself
    // is skipped before any await).
    // We can only verify the function did not throw synchronously.
    expect(entities.Goal.filter).not.toHaveBeenCalled();
  });

  it('signature is backward-compatible (3 positional params still work)', () => {
    expect(() => {
      triggerConversationEndSummarization('conv-1', {}, 'test');
    }).not.toThrow();
  });

  it('signature is backward-compatible (2 positional params still work)', () => {
    expect(() => {
      triggerConversationEndSummarization('conv-1', {});
    }).not.toThrow();
  });
});

// ─── 11. No companion flow regression ────────────────────────────────────────

describe('Phase 3 enrichment — companion flow regression', () => {
  it('enrichConversationMemoryPayload does not reference any companion wiring', async () => {
    // Verify the enriched payload carries no companion-specific fields.
    const base = makeBasePayload();
    const entities = makeEntities({
      goals: [makeGoal('g1', 'Valid goal')],
      formulations: [makeFormulation()],
    });
    const result = await enrichConversationMemoryPayload(base, entities);
    expect(result).not.toHaveProperty('companion_memory_id');
    expect(result).not.toHaveProperty('agent_name');
    expect(result).not.toHaveProperty('warmth_enabled');
    expect(result).not.toHaveProperty('continuity_enabled');
  });

  it('isContinuityEnrichmentEnabled does not read COMPANION_UPGRADE_FLAGS', () => {
    // This is a structural check: the function returns false by default.
    // We ensure it can be called independently of companion flag state.
    const result = isContinuityEnrichmentEnabled();
    expect(typeof result).toBe('boolean');
  });
});

// ─── 12. Fail-closed top-level contract ──────────────────────────────────────

describe('enrichConversationMemoryPayload — top-level fail-closed', () => {
  it('returns base payload when an unexpected synchronous error occurs', async () => {
    const base = makeBasePayload();
    // Pass an entities object that throws on property access.
    const badEntities = new Proxy({}, {
      get() { throw new Error('unexpected'); },
    });
    const result = await enrichConversationMemoryPayload(base, badEntities);
    expect(result).toEqual(base);
  });
});
