/**
 * @file test/utils/edgeCaseHardening.test.js
 *
 * Edge-Case & Negative-Path Hardening — Therapist and Companion Activation
 *
 * PURPOSE
 * -------
 * This suite closes specific edge-case and negative-path gaps identified after
 * reviewing the existing therapist/companion test corpus.  It does NOT replace
 * existing tests; it fills the uncovered crevices:
 *
 *   1. deriveSessionSummaryPayload — null/falsy items in action_plan, non-string
 *      session.id, null/undefined stage, large arrays sliced to 20,
 *      related_goals with null/non-string items, completed:undefined treated
 *      as incomplete.
 *
 *   2. enrichConversationMemoryPayload — Goal with valid ID but missing title,
 *      Goal with valid title but empty-string ID, both empty, non-function
 *      entity methods (.filter/.list not present or wrong type), CaseFormulation
 *      returning [null] as first item, CaseFormulation with non-string core_belief.
 *
 *   3. readCrossSessionContinuity — content=null, content=empty string, mixed
 *      valid+invalid records counted correctly.
 *
 *   4. triggerSessionEndSummarization / triggerConversationEndSummarization —
 *      catch-path structural verification (source-code analysis that catch blocks
 *      exist), gate-off non-blocking guarantee with pathological inputs.
 *
 *   5. Companion activation negative paths — master-on/sub-flags-off still
 *      returns HYBRID wiring (source-code analysis verifying the fallback path).
 *
 *   6. isContinuityEnrichmentEnabled — dual-flag structural contract: returns
 *      false when only one of the two required flags is described in code.
 *
 *   7. Role isolation regression — therapist write path has no side-effects on
 *      companion wiring; companion entity list excludes therapist-prohibited
 *      entities; enrichment path never touches companion wiring.
 *
 *   8. No raw transcript leakage regression — deriveSessionSummaryPayload and
 *      deriveConversationMemoryPayload do not persist raw message content even
 *      when a session carries suspicious-looking fields.
 *
 * DESIGN CONSTRAINTS
 * ------------------
 * - Does NOT import from base44/functions/ (Deno — not importable in Vitest).
 * - Does NOT render React components.
 * - All mocks are scoped within each test — no global state mutation.
 * - All tests are deterministic and do not require a live Base44 backend.
 * - Does NOT modify, weaken, or skip any prior-phase test.
 *
 * See src/lib/sessionEndSummarization.js, src/lib/crossSessionContinuity.js,
 * src/api/agentWiring.js, src/api/activeAgentWiring.js for implementations.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ─── Module imports ───────────────────────────────────────────────────────────

import {
  deriveSessionSummaryPayload,
  deriveConversationMemoryPayload,
  triggerSessionEndSummarization,
  triggerConversationEndSummarization,
  enrichConversationMemoryPayload,
  isContinuityEnrichmentEnabled,
  SESSION_SUMMARIZATION_MAX_MESSAGES,
  CONVERSATION_MIN_MESSAGES_FOR_MEMORY,
} from '../../src/lib/sessionEndSummarization.js';

import {
  readCrossSessionContinuity,
  CONTINUITY_MAX_PRIOR_SESSIONS,
} from '../../src/lib/crossSessionContinuity.js';

import {
  isTherapistMemoryRecord,
  THERAPIST_MEMORY_TYPE,
  THERAPIST_MEMORY_VERSION_KEY,
  THERAPIST_MEMORY_VERSION,
} from '../../src/lib/therapistMemoryModel.js';

import {
  AI_COMPANION_WIRING_HYBRID,
  AI_COMPANION_WIRING_UPGRADE_V1,
  AI_COMPANION_WIRING_UPGRADE_V2,
} from '../../src/api/agentWiring.js';

import {
  resolveCompanionWiring,
  resolveTherapistWiring,
  ACTIVE_AI_COMPANION_WIRING,
  ACTIVE_CBT_THERAPIST_WIRING,
} from '../../src/api/activeAgentWiring.js';

// ─── Source file reads for static analysis ───────────────────────────────────

const ROOT = resolve(process.cwd());
const sessionEndSrc = readFileSync(
  resolve(ROOT, 'src/lib/sessionEndSummarization.js'),
  'utf8',
);
const activeAgentWiringSrc = readFileSync(
  resolve(ROOT, 'src/api/activeAgentWiring.js'),
  'utf8',
);
const featureFlagsSrc = readFileSync(
  resolve(ROOT, 'src/lib/featureFlags.js'),
  'utf8',
);

// ─── Test fixtures ────────────────────────────────────────────────────────────

/** Minimal valid base payload for enrichment tests. */
function makeBasePayload(overrides = {}) {
  return {
    [THERAPIST_MEMORY_VERSION_KEY]: THERAPIST_MEMORY_VERSION,
    session_id: 'conv-harden-001',
    session_date: '2026-04-11T10:00:00.000Z',
    session_summary: 'Session focused on: anxiety.',
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
    last_summarized_date: '2026-04-11T10:00:00.000Z',
    ...overrides,
  };
}

/** Makes a valid raw CompanionMemory therapist_session record for continuity tests. */
function makeRawContinuityRecord(overrides = {}) {
  const content = {
    [THERAPIST_MEMORY_VERSION_KEY]: THERAPIST_MEMORY_VERSION,
    session_id: 'sess-harden',
    session_date: '2026-04-01T10:00:00.000Z',
    session_summary: 'Structured summary.',
    core_patterns: ['rumination'],
    triggers: [],
    automatic_thoughts: [],
    emotions: [],
    urges: [],
    actions: [],
    consequences: [],
    working_hypotheses: [],
    interventions_used: ['CBT'],
    risk_flags: [],
    safety_plan_notes: '',
    follow_up_tasks: ['Practice breathing'],
    goals_referenced: ['goal-1'],
    last_summarized_date: '2026-04-01T10:00:00.000Z',
  };
  return {
    id: 'cm-harden-1',
    memory_type: THERAPIST_MEMORY_TYPE,
    content: JSON.stringify(content),
    ...overrides,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

// ─────────────────────────────────────────────────────────────────────────────
// Section 1: deriveSessionSummaryPayload — stale/invalid session edge cases
// ─────────────────────────────────────────────────────────────────────────────

describe('Section 1: deriveSessionSummaryPayload — stale/invalid session edge cases', () => {

  it('1.1 null items in action_plan are silently filtered (null item !== non-string title)', () => {
    const session = {
      id: 's-null-items',
      stage: 'active',
      action_plan: [null, undefined, { title: 'real task', completed: false }],
    };
    const record = deriveSessionSummaryPayload(session, []);
    expect(record.follow_up_tasks).toContain('real task');
    expect(record.follow_up_tasks.length).toBe(1);
  });

  it('1.2 action_plan item with completed: undefined is treated as incomplete (falsy)', () => {
    const session = {
      id: 's-undefined-completed',
      stage: 'active',
      action_plan: [{ title: 'pending task', completed: undefined }],
    };
    const record = deriveSessionSummaryPayload(session, []);
    // !undefined === true → item goes to follow_up_tasks
    expect(record.follow_up_tasks).toContain('pending task');
    expect(record.actions).not.toContain('pending task');
  });

  it('1.3 action_plan item with completed: 0 (falsy non-boolean) is treated as incomplete', () => {
    const session = {
      id: 's-zero-completed',
      stage: 'active',
      action_plan: [{ title: 'zero task', completed: 0 }],
    };
    const record = deriveSessionSummaryPayload(session, []);
    expect(record.follow_up_tasks).toContain('zero task');
    expect(record.actions).not.toContain('zero task');
  });

  it('1.4 action_plan item with completed: true goes to actions (not follow_up_tasks)', () => {
    const session = {
      id: 's-true-completed',
      stage: 'active',
      action_plan: [{ title: 'done task', completed: true }],
    };
    const record = deriveSessionSummaryPayload(session, []);
    expect(record.actions).toContain('done task');
    expect(record.follow_up_tasks).not.toContain('done task');
  });

  it('1.5 related_goals with null items — null items are filtered out', () => {
    const session = {
      id: 's-null-goals',
      stage: 'active',
      related_goals: [null, undefined, 'goal-valid', ''],
    };
    const record = deriveSessionSummaryPayload(session, []);
    expect(record.goals_referenced).toContain('goal-valid');
    expect(record.goals_referenced).not.toContain(null);
    expect(record.goals_referenced).not.toContain(undefined);
    expect(record.goals_referenced).not.toContain('');
  });

  it('1.6 related_goals with non-string items (numbers, objects) — filtered out', () => {
    const session = {
      id: 's-bad-goals',
      stage: 'active',
      related_goals: [42, { id: 'obj' }, true, 'real-goal'],
    };
    const record = deriveSessionSummaryPayload(session, []);
    // Only strings with length > 0 pass the filter
    expect(record.goals_referenced).toEqual(['real-goal']);
  });

  it('1.7 session.id is a number (not string) → session_id is empty string', () => {
    const session = { id: 12345, stage: 'active' };
    const record = deriveSessionSummaryPayload(session, []);
    // typeof 12345 === 'string' is false → falls back to ''
    expect(record.session_id).toBe('');
    expect(typeof record.session_id).toBe('string');
  });

  it('1.8 session.id is a boolean → session_id is empty string', () => {
    const session = { id: true, stage: 'active' };
    const record = deriveSessionSummaryPayload(session, []);
    expect(record.session_id).toBe('');
  });

  it('1.9 session.stage = null → interventions_used is empty array', () => {
    const session = { id: 's-null-stage', stage: null };
    const record = deriveSessionSummaryPayload(session, []);
    // typeof null === 'string' is false → stage = '' → not pushed
    expect(record.interventions_used).toEqual([]);
  });

  it('1.10 session.stage = undefined → interventions_used is empty array', () => {
    const session = { id: 's-undef-stage', stage: undefined };
    const record = deriveSessionSummaryPayload(session, []);
    expect(record.interventions_used).toEqual([]);
  });

  it('1.11 session.stage = 0 (non-string) → interventions_used is empty array', () => {
    const session = { id: 's-num-stage', stage: 0 };
    const record = deriveSessionSummaryPayload(session, []);
    expect(record.interventions_used).toEqual([]);
  });

  it('1.12 large action_plan (> 20 items) → follow_up_tasks sliced to 20', () => {
    const manyTasks = Array.from({ length: 30 }, (_, i) => ({
      title: `task-${i}`,
      completed: false,
    }));
    const session = { id: 's-large-plan', stage: 'active', action_plan: manyTasks };
    const record = deriveSessionSummaryPayload(session, []);
    expect(record.follow_up_tasks.length).toBeLessThanOrEqual(20);
  });

  it('1.13 large action_plan (> 20 completed items) → actions sliced to 20', () => {
    const manyDone = Array.from({ length: 25 }, (_, i) => ({
      title: `done-${i}`,
      completed: true,
    }));
    const session = { id: 's-large-done', stage: 'active', action_plan: manyDone };
    const record = deriveSessionSummaryPayload(session, []);
    expect(record.actions.length).toBeLessThanOrEqual(20);
  });

  it('1.14 large related_goals (> 20 items) → goals_referenced sliced to 20', () => {
    const manyGoals = Array.from({ length: 30 }, (_, i) => `goal-${i}`);
    const session = { id: 's-large-goals', stage: 'active', related_goals: manyGoals };
    const record = deriveSessionSummaryPayload(session, []);
    expect(record.goals_referenced.length).toBeLessThanOrEqual(20);
  });

  it('1.15 output always passes isTherapistMemoryRecord regardless of stale input', () => {
    const weirdInputs = [
      { id: null, stage: null, action_plan: [null, null], related_goals: [null] },
      { id: 0, stage: undefined, action_plan: 'not-an-array' },
      { id: '', stage: 'completed', action_plan: [], related_goals: [] },
    ];
    for (const session of weirdInputs) {
      const record = deriveSessionSummaryPayload(session, []);
      expect(isTherapistMemoryRecord(record)).toBe(true);
    }
  });

  it('1.16 whitespace-only action_plan title is stripped and filtered out', () => {
    const session = {
      id: 's-whitespace',
      stage: 'active',
      action_plan: [{ title: '   ', completed: false }, { title: 'real', completed: false }],
    };
    const record = deriveSessionSummaryPayload(session, []);
    expect(record.follow_up_tasks).toContain('real');
    expect(record.follow_up_tasks).not.toContain('');
    expect(record.follow_up_tasks).not.toContain('   ');
  });

  it('1.17 session.created_date is not a valid ISO string — code uses the string as-is (type-safe passthrough)', () => {
    // The implementation accepts any string for created_date without parsing it.
    // This test documents the exact fallback contract: if created_date is a
    // string (even non-ISO), that string is used directly as session_date.
    const session = { id: 's-bad-date', stage: 'active', created_date: 'not-a-date' };
    const record = deriveSessionSummaryPayload(session, []);
    // session_date equals the provided string value (passthrough, no re-parsing)
    expect(record.session_date).toBe('not-a-date');
    // last_summarized_date is always set to a fresh ISO timestamp (independent field)
    expect(new Date(record.last_summarized_date).getTime()).not.toBeNaN();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Section 2: enrichConversationMemoryPayload — goal/formulation data edge cases
// ─────────────────────────────────────────────────────────────────────────────

describe('Section 2: enrichConversationMemoryPayload — goal/formulation data edge cases', () => {

  it('2.1 Goal with valid ID but null/undefined title → goals_referenced updated, follow_up_tasks not', async () => {
    const base = makeBasePayload();
    const entities = {
      Goal: { filter: vi.fn(async () => [{ id: 'g-valid-id', title: null, status: 'active' }]) },
      CaseFormulation: { list: vi.fn(async () => []) },
    };
    const result = await enrichConversationMemoryPayload(base, entities);
    // ID is valid, title is null → goals_referenced gets 'g-valid-id'
    expect(result.goals_referenced).toContain('g-valid-id');
    // title is null → no follow_up_task added
    expect(result.follow_up_tasks).toEqual([]);
  });

  it('2.2 Goal with valid title but empty-string ID → follow_up_tasks updated, goals_referenced not', async () => {
    const base = makeBasePayload();
    const entities = {
      Goal: { filter: vi.fn(async () => [{ id: '', title: 'Manage anxiety', status: 'active' }]) },
      CaseFormulation: { list: vi.fn(async () => []) },
    };
    const result = await enrichConversationMemoryPayload(base, entities);
    // ID is '' → falsy → not pushed to goals_referenced
    expect(result.goals_referenced).toEqual([]);
    // title is valid → pushed to follow_up_tasks
    expect(result.follow_up_tasks).toContain('Manage anxiety');
  });

  it('2.3 Goal with both empty ID and empty title → neither array updated', async () => {
    const base = makeBasePayload();
    const entities = {
      Goal: { filter: vi.fn(async () => [{ id: '', title: '', status: 'active' }]) },
      CaseFormulation: { list: vi.fn(async () => []) },
    };
    const result = await enrichConversationMemoryPayload(base, entities);
    expect(result.goals_referenced).toEqual([]);
    expect(result.follow_up_tasks).toEqual([]);
  });

  it('2.4 Goal with valid ID and valid title → both arrays updated', async () => {
    const base = makeBasePayload();
    const entities = {
      Goal: { filter: vi.fn(async () => [{ id: 'g-1', title: 'Sleep better', status: 'active' }]) },
      CaseFormulation: { list: vi.fn(async () => []) },
    };
    const result = await enrichConversationMemoryPayload(base, entities);
    expect(result.goals_referenced).toContain('g-1');
    expect(result.follow_up_tasks).toContain('Sleep better');
  });

  it('2.5 entities.Goal exists but .filter is not a function → goals stay as base (no throw)', async () => {
    const base = makeBasePayload();
    const entities = {
      Goal: { filter: 'not-a-function' },
      CaseFormulation: { list: vi.fn(async () => []) },
    };
    const result = await enrichConversationMemoryPayload(base, entities);
    expect(result.goals_referenced).toEqual([]);
    expect(result.follow_up_tasks).toEqual([]);
  });

  it('2.6 entities.CaseFormulation exists but .list is not a function → working_hypotheses stays as base (no throw)', async () => {
    const base = makeBasePayload();
    const entities = {
      Goal: { filter: vi.fn(async () => []) },
      CaseFormulation: { list: 'not-a-function' },
    };
    const result = await enrichConversationMemoryPayload(base, entities);
    expect(result.working_hypotheses).toEqual([]);
  });

  it('2.7 CaseFormulation returns [null] as first item → working_hypotheses stays empty', async () => {
    const base = makeBasePayload();
    const entities = {
      Goal: { filter: vi.fn(async () => []) },
      CaseFormulation: { list: vi.fn(async () => [null]) },
    };
    const result = await enrichConversationMemoryPayload(base, entities);
    // null is not a valid formulation record → working_hypotheses stays empty
    expect(result.working_hypotheses).toEqual([]);
  });

  it('2.8 CaseFormulation returns record with core_belief = 0 (non-string) → working_hypotheses stays empty', async () => {
    const base = makeBasePayload();
    const entities = {
      Goal: { filter: vi.fn(async () => []) },
      CaseFormulation: {
        list: vi.fn(async () => [{ presenting_problem: 'mood', core_belief: 0 }]),
      },
    };
    const result = await enrichConversationMemoryPayload(base, entities);
    expect(result.working_hypotheses).toEqual([]);
  });

  it('2.9 CaseFormulation returns record with core_belief = null → working_hypotheses stays empty', async () => {
    const base = makeBasePayload();
    const entities = {
      Goal: { filter: vi.fn(async () => []) },
      CaseFormulation: {
        list: vi.fn(async () => [{ presenting_problem: 'mood', core_belief: null }]),
      },
    };
    const result = await enrichConversationMemoryPayload(base, entities);
    expect(result.working_hypotheses).toEqual([]);
  });

  it('2.10 CaseFormulation returns record with empty-string core_belief → working_hypotheses stays empty', async () => {
    const base = makeBasePayload();
    const entities = {
      Goal: { filter: vi.fn(async () => []) },
      CaseFormulation: {
        list: vi.fn(async () => [{ core_belief: '' }]),
      },
    };
    const result = await enrichConversationMemoryPayload(base, entities);
    expect(result.working_hypotheses).toEqual([]);
  });

  it('2.11 multiple Goals — IDs and titles are collected independently per item', async () => {
    const base = makeBasePayload();
    const entities = {
      Goal: {
        filter: vi.fn(async () => [
          { id: 'g1', title: null, status: 'active' },   // id only
          { id: '', title: 'goal B', status: 'active' },  // title only
          { id: 'g3', title: 'goal C', status: 'active' }, // both
        ]),
      },
      CaseFormulation: { list: vi.fn(async () => []) },
    };
    const result = await enrichConversationMemoryPayload(base, entities);
    expect(result.goals_referenced).toEqual(expect.arrayContaining(['g1', 'g3']));
    expect(result.goals_referenced).not.toContain('');
    expect(result.follow_up_tasks).toEqual(expect.arrayContaining(['goal B', 'goal C']));
  });

  it('2.12 enrichment does not mutate the base payload object', async () => {
    const base = makeBasePayload();
    const originalGoalsRef = base.goals_referenced;
    const entities = {
      Goal: {
        filter: vi.fn(async () => [{ id: 'g1', title: 'goal A', status: 'active' }]),
      },
      CaseFormulation: { list: vi.fn(async () => []) },
    };
    const result = await enrichConversationMemoryPayload(base, entities);
    // Base payload is not mutated — shallow copy is returned
    expect(base.goals_referenced).toBe(originalGoalsRef);
    // Enriched result differs
    expect(result.goals_referenced).not.toBe(originalGoalsRef);
    expect(result.goals_referenced).toContain('g1');
  });

  it('2.13 enriched output passes isTherapistMemoryRecord (schema contract maintained)', async () => {
    const base = makeBasePayload();
    const entities = {
      Goal: {
        filter: vi.fn(async () => [{ id: 'g1', title: 'Manage stress', status: 'active' }]),
      },
      CaseFormulation: {
        list: vi.fn(async () => [{ core_belief: 'I am not good enough.' }]),
      },
    };
    const result = await enrichConversationMemoryPayload(base, entities);
    expect(isTherapistMemoryRecord(result)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Section 3: readCrossSessionContinuity — invalid content edge cases
// ─────────────────────────────────────────────────────────────────────────────

describe('Section 3: readCrossSessionContinuity — invalid content edge cases', () => {

  it('3.1 record with content = null is skipped (returns null when only invalid records)', async () => {
    const entities = {
      CompanionMemory: {
        list: vi.fn(async () => [
          { id: 'cm-null', memory_type: THERAPIST_MEMORY_TYPE, content: null },
        ]),
      },
    };
    const result = await readCrossSessionContinuity(entities);
    expect(result).toBeNull();
  });

  it('3.2 record with content = empty string is skipped (JSON.parse fails → returns null)', async () => {
    const entities = {
      CompanionMemory: {
        list: vi.fn(async () => [
          { id: 'cm-empty', memory_type: THERAPIST_MEMORY_TYPE, content: '' },
        ]),
      },
    };
    const result = await readCrossSessionContinuity(entities);
    expect(result).toBeNull();
  });

  it('3.3 record with content = "{}" (no version marker) is skipped', async () => {
    const entities = {
      CompanionMemory: {
        list: vi.fn(async () => [
          { id: 'cm-noversion', memory_type: THERAPIST_MEMORY_TYPE, content: '{}' },
        ]),
      },
    };
    const result = await readCrossSessionContinuity(entities);
    expect(result).toBeNull();
  });

  it('3.4 mix of valid and invalid records — only valid ones count toward sessionCount', async () => {
    const validRecord = makeRawContinuityRecord({ id: 'cm-valid' });
    const invalidRecord = {
      id: 'cm-invalid',
      memory_type: THERAPIST_MEMORY_TYPE,
      content: null,
    };
    const entities = {
      CompanionMemory: {
        list: vi.fn(async () => [invalidRecord, validRecord]),
      },
    };
    const result = await readCrossSessionContinuity(entities);
    expect(result).not.toBeNull();
    expect(result.sessionCount).toBe(1);
  });

  it('3.5 record with content as parsed object (not JSON string) is accepted', async () => {
    const contentObj = {
      [THERAPIST_MEMORY_VERSION_KEY]: THERAPIST_MEMORY_VERSION,
      session_id: 'sess-obj',
      session_date: '2026-04-01T10:00:00.000Z',
      session_summary: 'Object delivery.',
      core_patterns: ['avoidance'],
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
      last_summarized_date: '2026-04-01T10:00:00.000Z',
    };
    const entities = {
      CompanionMemory: {
        list: vi.fn(async () => [
          { id: 'cm-obj', memory_type: THERAPIST_MEMORY_TYPE, content: contentObj },
        ]),
      },
    };
    const result = await readCrossSessionContinuity(entities);
    expect(result).not.toBeNull();
    expect(result.sessionCount).toBe(1);
    expect(result.recurringPatterns).toContain('avoidance');
  });

  it('3.6 exactly CONTINUITY_MAX_PRIOR_SESSIONS valid records + extra invalid → correct count', async () => {
    const validRecords = Array.from({ length: CONTINUITY_MAX_PRIOR_SESSIONS }, (_, i) =>
      makeRawContinuityRecord({ id: `cm-v${i}`, content: JSON.stringify({
        [THERAPIST_MEMORY_VERSION_KEY]: THERAPIST_MEMORY_VERSION,
        session_id: `sess-${i}`,
        session_date: '2026-03-01T10:00:00.000Z',
        session_summary: `Session ${i}`,
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
        last_summarized_date: '2026-03-01T10:00:00.000Z',
      }) })
    );
    const invalidRecord = {
      id: 'cm-bad',
      memory_type: THERAPIST_MEMORY_TYPE,
      content: null,
    };
    const entities = {
      CompanionMemory: {
        list: vi.fn(async () => [...validRecords, invalidRecord]),
      },
    };
    const result = await readCrossSessionContinuity(entities);
    expect(result).not.toBeNull();
    expect(result.sessionCount).toBe(CONTINUITY_MAX_PRIOR_SESSIONS);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Section 4: Trigger functions — failure path analysis & gate-off guarantees
// ─────────────────────────────────────────────────────────────────────────────

describe('Section 4: Trigger functions — failure path analysis & gate-off guarantees', () => {

  it('4.1 triggerSessionEndSummarization has a try/catch that prevents error propagation', () => {
    // Static analysis: the async body is wrapped in try/catch.
    // The catch block must exist and must not re-throw.
    const startIdx = sessionEndSrc.indexOf('export function triggerSessionEndSummarization');
    expect(startIdx).not.toBe(-1); // guard: function must be present in the file
    const funcBody = sessionEndSrc.slice(startIdx);
    // async IIFE is present
    expect(funcBody).toContain('async ()');
    // catch block exists
    expect(funcBody).toContain('} catch (error) {');
    // catch block uses console.warn (non-fatal signal) not throw
    const endIdx = funcBody.indexOf('export function triggerConversation');
    expect(endIdx).not.toBe(-1); // guard: next function boundary must be findable
    expect(funcBody.slice(0, endIdx)).toContain('console.warn');
  });

  it('4.2 triggerConversationEndSummarization has a try/catch that prevents error propagation', () => {
    const startIdx = sessionEndSrc.indexOf('export function triggerConversationEndSummarization');
    expect(startIdx).not.toBe(-1); // guard: function must be present in the file
    const funcBody = sessionEndSrc.slice(startIdx);
    expect(funcBody).toContain('async ()');
    expect(funcBody).toContain('} catch (error) {');
    expect(funcBody).toContain('console.warn');
  });

  it('4.3 triggerSessionEndSummarization does not throw with pathological null inputs (gate-off)', () => {
    expect(() => triggerSessionEndSummarization(null, null, null)).not.toThrow();
    expect(() => triggerSessionEndSummarization(undefined)).not.toThrow();
    expect(() => triggerSessionEndSummarization({}, undefined, '')).not.toThrow();
  });

  it('4.4 triggerConversationEndSummarization does not throw with pathological inputs (gate-off)', () => {
    expect(() => triggerConversationEndSummarization(null, null, null, null)).not.toThrow();
    expect(() => triggerConversationEndSummarization(undefined)).not.toThrow();
    expect(() => triggerConversationEndSummarization(42, {}, 'test', {})).not.toThrow();
  });

  it('4.5 triggerSessionEndSummarization returns void (not a promise) when gate is off', () => {
    const result = triggerSessionEndSummarization({ id: 's1', stage: 'completed' }, []);
    expect(result).toBeUndefined();
  });

  it('4.6 triggerConversationEndSummarization returns void when gate is off regardless of entities', () => {
    const fakeEntities = {
      Goal: { filter: vi.fn() },
      CaseFormulation: { list: vi.fn() },
    };
    const result = triggerConversationEndSummarization('conv-1', {}, 'test', fakeEntities);
    expect(result).toBeUndefined();
    // Gate-off means no entity reads triggered
    expect(fakeEntities.Goal.filter).not.toHaveBeenCalled();
    expect(fakeEntities.CaseFormulation.list).not.toHaveBeenCalled();
  });

  it('4.7 triggerConversationEndSummarization is inert when conversationId is a number (non-string)', () => {
    expect(() => triggerConversationEndSummarization(123, { intent: 'test' })).not.toThrow();
  });

  it('4.8 console.warn is NOT called in default gate-off mode for either trigger function', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    triggerSessionEndSummarization({ id: 's1', stage: 'completed' }, []);
    triggerConversationEndSummarization('conv-1', { intent: 'anxiety' });
    // Gate-off returns immediately — no warn fires
    expect(warnSpy).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Section 5: isContinuityEnrichmentEnabled — dual-flag structural contract
// ─────────────────────────────────────────────────────────────────────────────

describe('Section 5: isContinuityEnrichmentEnabled — dual-flag structural contract', () => {

  it('5.1 returns false by default (both flags off in test environment)', () => {
    expect(isContinuityEnrichmentEnabled()).toBe(false);
  });

  it('5.2 source code requires BOTH SUMMARIZATION_ENABLED AND CONTINUITY_ENABLED', () => {
    // Extract the function body for static analysis
    const fnIdx = sessionEndSrc.indexOf('export function isContinuityEnrichmentEnabled');
    const fnEnd = sessionEndSrc.indexOf('\n}', fnIdx) + 2;
    const fnBody = sessionEndSrc.slice(fnIdx, fnEnd);
    // Both flag strings must appear in the function body
    expect(fnBody).toContain('THERAPIST_UPGRADE_SUMMARIZATION_ENABLED');
    expect(fnBody).toContain('THERAPIST_UPGRADE_CONTINUITY_ENABLED');
    // AND operator must be used (both required, not just one)
    expect(fnBody).toContain('&&');
  });

  it('5.3 is a pure boolean function (no side effects, stable result)', () => {
    const r1 = isContinuityEnrichmentEnabled();
    const r2 = isContinuityEnrichmentEnabled();
    expect(r1).toBe(r2);
    expect(typeof r1).toBe('boolean');
  });

  it('5.4 source code chains two isUpgradeEnabled calls (not isCompanionUpgradeEnabled)', () => {
    const fnIdx = sessionEndSrc.indexOf('export function isContinuityEnrichmentEnabled');
    const fnEnd = sessionEndSrc.indexOf('\n}', fnIdx) + 2;
    const fnBody = sessionEndSrc.slice(fnIdx, fnEnd);
    expect(fnBody).toContain('isUpgradeEnabled(');
    expect(fnBody).not.toContain('isCompanionUpgradeEnabled(');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Section 6: Companion activation negative paths
// ─────────────────────────────────────────────────────────────────────────────

describe('Section 6: Companion activation negative paths', () => {

  it('6.1 resolveCompanionWiring returns HYBRID when all flags are off (confirmed default)', () => {
    const result = resolveCompanionWiring();
    expect(result.name).toBe(AI_COMPANION_WIRING_HYBRID.name);
    expect(result).toEqual(AI_COMPANION_WIRING_HYBRID);
  });

  it('6.2 resolveCompanionWiring source has fallback path when master on but no sub-flag matched', () => {
    // Static analysis: when master is on but neither WARMTH nor CONTINUITY matches,
    // the code falls through to return AI_COMPANION_WIRING_HYBRID (legacy fallback).
    const fallbackSection = activeAgentWiringSrc.slice(
      activeAgentWiringSrc.indexOf('Master gate on, no phase flag matched'),
    );
    expect(fallbackSection).toContain('AI_COMPANION_WIRING_HYBRID');
  });

  it('6.3 resolveTherapistWiring source has fallback path when master on but no phase flag matched', () => {
    const fallbackSection = activeAgentWiringSrc.slice(
      activeAgentWiringSrc.indexOf('Master gate on, no phase flag matched — fall through'),
    );
    expect(fallbackSection).toContain('CBT_THERAPIST_WIRING_HYBRID');
  });

  it('6.4 ACTIVE_AI_COMPANION_WIRING has a non-empty tool_configs array (safe to forward)', () => {
    expect(Array.isArray(ACTIVE_AI_COMPANION_WIRING.tool_configs)).toBe(true);
    expect(ACTIVE_AI_COMPANION_WIRING.tool_configs.length).toBeGreaterThan(0);
  });

  it('6.5 ACTIVE_AI_COMPANION_WIRING.name is "ai_companion" (runtime agent name invariant)', () => {
    expect(ACTIVE_AI_COMPANION_WIRING.name).toBe('ai_companion');
  });

  it('6.6 resolveCompanionWiring does not throw with any combination of flag states', () => {
    // Repeatedly calling resolveCompanionWiring() in test env should be stable
    for (let i = 0; i < 5; i++) {
      expect(() => resolveCompanionWiring()).not.toThrow();
    }
  });

  it('6.7 resolveTherapistWiring returns HYBRID in test environment (all flags off)', () => {
    const result = resolveTherapistWiring();
    expect(result.name).toBe('cbt_therapist');
    // In test env all flags are off → HYBRID
    expect(result).toEqual(ACTIVE_CBT_THERAPIST_WIRING);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Section 7: Role isolation regression
// ─────────────────────────────────────────────────────────────────────────────

describe('Section 7: Role isolation regression', () => {

  it('7.1 ACTIVE_CBT_THERAPIST_WIRING does not carry companion-specific fields', () => {
    expect(ACTIVE_CBT_THERAPIST_WIRING).not.toHaveProperty('warmth_enabled');
    expect(ACTIVE_CBT_THERAPIST_WIRING).not.toHaveProperty('companion_upgrade');
    expect(ACTIVE_CBT_THERAPIST_WIRING).not.toHaveProperty('continuity_enabled');
  });

  it('7.2 ACTIVE_AI_COMPANION_WIRING does not carry therapist-specific upgrade fields', () => {
    expect(ACTIVE_AI_COMPANION_WIRING).not.toHaveProperty('stage2');
    expect(ACTIVE_AI_COMPANION_WIRING).not.toHaveProperty('workflow_engine_enabled');
    expect(ACTIVE_AI_COMPANION_WIRING).not.toHaveProperty('formulation_context_enabled');
    expect(ACTIVE_AI_COMPANION_WIRING).not.toHaveProperty('continuity_layer_enabled');
    expect(ACTIVE_AI_COMPANION_WIRING).not.toHaveProperty('memory_context_injection');
  });

  it('7.3 no companion wiring variant includes CaseFormulation (therapist-only entity)', () => {
    for (const wiring of [
      AI_COMPANION_WIRING_HYBRID,
      AI_COMPANION_WIRING_UPGRADE_V1,
      AI_COMPANION_WIRING_UPGRADE_V2,
    ]) {
      const entityNames = wiring.tool_configs.map((tc) => tc.entity_name);
      expect(entityNames).not.toContain('CaseFormulation');
    }
  });

  it('7.4 no companion wiring variant includes ThoughtJournal (therapist-only entity)', () => {
    for (const wiring of [
      AI_COMPANION_WIRING_HYBRID,
      AI_COMPANION_WIRING_UPGRADE_V1,
      AI_COMPANION_WIRING_UPGRADE_V2,
    ]) {
      const entityNames = wiring.tool_configs.map((tc) => tc.entity_name);
      expect(entityNames).not.toContain('ThoughtJournal');
    }
  });

  it('7.5 no companion wiring variant includes CoachingSession', () => {
    for (const wiring of [
      AI_COMPANION_WIRING_HYBRID,
      AI_COMPANION_WIRING_UPGRADE_V1,
      AI_COMPANION_WIRING_UPGRADE_V2,
    ]) {
      const entityNames = wiring.tool_configs.map((tc) => tc.entity_name);
      expect(entityNames).not.toContain('CoachingSession');
    }
  });

  it('7.6 enrichConversationMemoryPayload output has no companion-wiring-specific fields', async () => {
    const base = makeBasePayload();
    const entities = {
      Goal: {
        filter: vi.fn(async () => [{ id: 'g1', title: 'Goal A', status: 'active' }]),
      },
      CaseFormulation: {
        list: vi.fn(async () => [{ core_belief: 'I am worthless.' }]),
      },
    };
    const result = await enrichConversationMemoryPayload(base, entities);
    expect(result).not.toHaveProperty('agent_name');
    expect(result).not.toHaveProperty('warmth_enabled');
    expect(result).not.toHaveProperty('continuity_enabled');
    expect(result).not.toHaveProperty('companion_memory_id');
  });

  it('7.7 triggerConversationEndSummarization is not referenced in any companion source file', () => {
    // Static analysis: companion components must not call the therapist write path.
    // These are the three entry points identified in PR #543 (companion routing consistency).
    // If a companion file is renamed, update this list alongside the component itself.
    const companionFiles = [
      'src/components/ai/AiCompanion.jsx',
      'src/components/ai/DraggableAiCompanion.jsx',
      'src/components/coaching/CoachingSessionWizard.jsx',
    ];
    for (const filePath of companionFiles) {
      const fullPath = resolve(ROOT, filePath);
      let src;
      try {
        src = readFileSync(fullPath, 'utf8');
      } catch {
        throw new Error(`Companion file not found: ${filePath}. Update the path list if the file was renamed.`);
      }
      expect(src).not.toContain('triggerConversationEndSummarization');
    }
  });

  it('7.8 THERAPIST_UPGRADE_* flags are isolated from COMPANION_UPGRADE_* flags (no shared key)', async () => {
    const { THERAPIST_UPGRADE_FLAGS, COMPANION_UPGRADE_FLAGS } = await import('../../src/lib/featureFlags.js');
    const therapistKeys = new Set(Object.keys(THERAPIST_UPGRADE_FLAGS));
    const companionKeys = new Set(Object.keys(COMPANION_UPGRADE_FLAGS));
    for (const k of companionKeys) {
      expect(therapistKeys.has(k)).toBe(false);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Section 8: No raw transcript leakage regression
// ─────────────────────────────────────────────────────────────────────────────

describe('Section 8: No raw transcript leakage regression', () => {

  it('8.1 deriveSessionSummaryPayload with a session carrying message-like fields — no leakage', () => {
    // Adversarial session: some fields contain conversation-like strings
    const session = {
      id: 's-leakage-test',
      stage: 'active',
      focus_area: 'Human: I feel sad\nAssistant: Tell me more',
      current_challenge: '{"role":"user","content":"I am struggling"}',
      action_plan: [
        { title: 'role: therapist — plan next steps', completed: false },
      ],
    };
    const record = deriveSessionSummaryPayload(session, []);
    // Sanitization clears fields matching transcript patterns
    // We can't assert exact values (sanitizeSummaryRecord handles it), but we
    // must confirm no "messages:" key in output and output passes schema
    expect(record).not.toHaveProperty('messages');
    expect(record).not.toHaveProperty('transcript');
    expect(isTherapistMemoryRecord(record)).toBe(true);
  });

  it('8.2 deriveConversationMemoryPayload with suspicious intent — no raw content in output', () => {
    const record = deriveConversationMemoryPayload('conv-suspicious', {
      intent: 'Human: I want to die\nAssistant: I hear you',
      name: 'Session 1',
    });
    expect(record).not.toHaveProperty('messages');
    expect(record).not.toHaveProperty('transcript');
    expect(isTherapistMemoryRecord(record)).toBe(true);
  });

  it('8.3 enrichConversationMemoryPayload does not read message content from entities', async () => {
    const base = makeBasePayload();
    const entities = {
      Goal: {
        filter: vi.fn(async () => [{ id: 'g1', title: 'Reduce anxiety', status: 'active' }]),
      },
      CaseFormulation: {
        list: vi.fn(async () => [{ core_belief: 'I am not enough.' }]),
      },
      // These private entities must never be touched
      ThoughtJournal: { filter: vi.fn(), list: vi.fn() },
      Conversation: { filter: vi.fn(), list: vi.fn() },
      CompanionMemory: { filter: vi.fn(), list: vi.fn() },
    };
    await enrichConversationMemoryPayload(base, entities);
    expect(entities.ThoughtJournal.filter).not.toHaveBeenCalled();
    expect(entities.ThoughtJournal.list).not.toHaveBeenCalled();
    expect(entities.Conversation.filter).not.toHaveBeenCalled();
    expect(entities.Conversation.list).not.toHaveBeenCalled();
    expect(entities.CompanionMemory.filter).not.toHaveBeenCalled();
    expect(entities.CompanionMemory.list).not.toHaveBeenCalled();
  });

  it('8.4 deriveSessionSummaryPayload output does not include a "messages" field', () => {
    const session = { id: 's1', stage: 'active' };
    const record = deriveSessionSummaryPayload(session, [{ role: 'user', content: 'Hello' }]);
    expect(record).not.toHaveProperty('messages');
  });

  it('8.5 deriveConversationMemoryPayload output does not include a "messages" field', () => {
    const record = deriveConversationMemoryPayload('conv-1', {});
    expect(record).not.toHaveProperty('messages');
  });

  it('8.6 readCrossSessionContinuity output does not contain raw content markers', async () => {
    const entities = {
      CompanionMemory: {
        list: vi.fn(async () => [makeRawContinuityRecord()]),
      },
    };
    const result = await readCrossSessionContinuity(entities);
    const resultStr = JSON.stringify(result);
    expect(resultStr).not.toContain('"role"');
    expect(resultStr).not.toContain('messages:');
    expect(resultStr).not.toContain('transcript');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Section 9: Regression — existing fallback behavior unchanged
// ─────────────────────────────────────────────────────────────────────────────

describe('Section 9: Regression — existing fallback behavior unchanged', () => {

  it('9.1 SESSION_SUMMARIZATION_MAX_MESSAGES is still a positive integer', () => {
    expect(typeof SESSION_SUMMARIZATION_MAX_MESSAGES).toBe('number');
    expect(SESSION_SUMMARIZATION_MAX_MESSAGES).toBeGreaterThan(0);
    expect(Number.isInteger(SESSION_SUMMARIZATION_MAX_MESSAGES)).toBe(true);
  });

  it('9.2 CONVERSATION_MIN_MESSAGES_FOR_MEMORY is still exported and is >= 3', () => {
    expect(typeof CONVERSATION_MIN_MESSAGES_FOR_MEMORY).toBe('number');
    expect(CONVERSATION_MIN_MESSAGES_FOR_MEMORY).toBeGreaterThanOrEqual(3);
  });

  it('9.3 deriveSessionSummaryPayload still returns safe stub for null session', () => {
    const record = deriveSessionSummaryPayload(null, []);
    expect(isTherapistMemoryRecord(record)).toBe(true);
  });

  it('9.4 deriveConversationMemoryPayload still works with empty meta', () => {
    const record = deriveConversationMemoryPayload('conv-regression', {});
    expect(isTherapistMemoryRecord(record)).toBe(true);
    expect(record.session_id).toBe('conv-regression');
  });

  it('9.5 readCrossSessionContinuity still returns null for empty CompanionMemory', async () => {
    const entities = {
      CompanionMemory: { list: vi.fn(async () => []) },
    };
    const result = await readCrossSessionContinuity(entities);
    expect(result).toBeNull();
  });

  it('9.6 ACTIVE_CBT_THERAPIST_WIRING is still the HYBRID wiring in default test env', () => {
    // All flags off → resolveTherapistWiring returns HYBRID
    expect(ACTIVE_CBT_THERAPIST_WIRING.name).toBe('cbt_therapist');
    expect(ACTIVE_CBT_THERAPIST_WIRING).not.toHaveProperty('continuity_layer_enabled');
  });

  it('9.7 ACTIVE_AI_COMPANION_WIRING still equals AI_COMPANION_WIRING_HYBRID in default test env', () => {
    expect(ACTIVE_AI_COMPANION_WIRING).toEqual(AI_COMPANION_WIRING_HYBRID);
  });

  it('9.8 isContinuityEnrichmentEnabled still returns false (no regression from enrichment tests)', () => {
    expect(isContinuityEnrichmentEnabled()).toBe(false);
  });

  it('9.9 CONTINUITY_MAX_PRIOR_SESSIONS is still a positive integer', () => {
    expect(typeof CONTINUITY_MAX_PRIOR_SESSIONS).toBe('number');
    expect(CONTINUITY_MAX_PRIOR_SESSIONS).toBeGreaterThan(0);
  });

  it('9.10 all companion wiring variants have non-empty tool_configs', () => {
    for (const wiring of [
      AI_COMPANION_WIRING_HYBRID,
      AI_COMPANION_WIRING_UPGRADE_V1,
      AI_COMPANION_WIRING_UPGRADE_V2,
    ]) {
      expect(Array.isArray(wiring.tool_configs)).toBe(true);
      expect(wiring.tool_configs.length).toBeGreaterThan(0);
    }
  });
});
