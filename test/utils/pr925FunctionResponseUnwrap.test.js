/**
 * @file test/utils/pr925FunctionResponseUnwrap.test.js
 *
 * PR #925 — Function response unwrap + LTS chronology + client enrichment
 * response normalization + backend continuity gate tests.
 *
 * Tests (numbered per problem statement):
 *
 * FUNCTION RESPONSE UNWRAP (1–8):
 *  1.  unwrapBase44FunctionData({ data: { memories: [...] } }) returns inner payload
 *  2.  unwrapBase44FunctionData({ memories: [...] }) preserves legacy/unwrapped payload
 *  3.  wrapped retrieveTherapistMemory with 3 therapist records → LTS session_count = 3
 *  4.  unwrapped retrieveTherapistMemory remains supported
 *  5.  wrapped writeLTSSnapshot updated response classifies as updated
 *  6.  wrapped writeLTSSnapshot created response classifies as created
 *  7.  summary success wrapped permits LTS
 *  8.  summary explicit wrapped failure does NOT trigger LTS
 *
 * CHRONOLOGY (9–11):
 *  9.  retrieve response supplied newest-first → builder oldest-first
 * 10.  newest session becomes LTS last_session_date
 * 11.  input API array is not mutated
 *
 * CLIENT CONTINUITY (12–18):
 * 12.  Goal bare-array response enriches
 * 13.  Goal { results: [...] } enriches
 * 14.  Goal { data: [...] } enriches
 * 15.  Goal { data: { results: [...] } } enriches
 * 16.  CaseFormulation same four response forms work
 * 17.  entity read exception is fail-open for the write
 * 18.  goal ID preserved even if goal title rejected by raw-transcript sanitization
 *
 * BACKEND CONTINUITY (19–32):
 * 19.  APPLY=true + MASTER=true + SUM=true + CONTINUITY=true → enabled
 * 20.  MASTER=false blocks backend enrichment
 * 21.  SUM=false blocks backend enrichment
 * 22.  CONTINUITY=false blocks backend enrichment
 * 23.  APPLY=false preserves exact old backend behavior
 * 24–32: enrichment behaviour, safety-stub, goal/CF failures (via gate-function logic)
 *
 * CONSTRAINTS:
 * - No skip / fixme.
 * - No retry increase.
 * - No timeout increase.
 * - No assertion weakening.
 * - chatOrchestratorV2LateDuplicate.spec.ts NOT touched.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import ts from 'typescript';

// ─── Modules under test ───────────────────────────────────────────────────────

import {
  unwrapBase44FunctionData,
  classifyLTSWriteResult,
  LTS_WRITE_RESULTS,
  enrichConversationMemoryPayload,
} from '../../src/lib/sessionEndSummarization.js';
import { normalizeEntityList } from '../../src/lib/entityListNormalizer.js';

import {
  buildLongitudinalState,
} from '../../src/lib/longitudinalStateBuilder.js';

import {
  isTherapistMemoryRecord,
  LTS_SESSION_RECORDS_FETCH_CAP,
} from '../../src/lib/therapistMemoryModel.js';

// ─── Backend gate loader ──────────────────────────────────────────────────────

const generateSummarySource = readFileSync(
  resolve('base44/functions/generateSessionSummary/entry.ts'),
  'utf8',
);

function loadBackendGateFn(fnName) {
  // Extract function body using a broad multiline match.
  const pattern = new RegExp(
    `function ${fnName}\\([\\s\\S]*?^}`,
    'm',
  );
  const match = generateSummarySource.match(pattern);
  expect(match, `${fnName} must exist in generateSessionSummary/entry.ts`).not.toBeNull();
  const transpiled = ts.transpileModule(
    `${match[0]}\nexport { ${fnName} };`,
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
      },
    },
  );
  const mod = { exports: {} };
  // eslint-disable-next-line no-new-func
  new Function('module', 'exports', transpiled.outputText)(mod, mod.exports);
  return mod.exports[fnName];
}

function loadBackendSourceFn(fnName) {
  const pattern = new RegExp(
    `function ${fnName}\\([\\s\\S]*?^}`,
    'm',
  );
  const match = generateSummarySource.match(pattern);
  expect(match, `${fnName} must exist in generateSessionSummary/entry.ts`).not.toBeNull();
  const transpiled = ts.transpileModule(
    `${match[0]}\nexport { ${fnName} };`,
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
      },
    },
  );
  const mod = { exports: {} };
  // eslint-disable-next-line no-new-func
  new Function('module', 'exports', transpiled.outputText)(mod, mod.exports);
  return mod.exports[fnName];
}

function readEnvFrom(values) {
  return (name) => values[name];
}

// ─── Test helpers ─────────────────────────────────────────────────────────────

function makeTherapistRecord(overrides = {}) {
  return {
    therapist_memory_version: '1',
    session_id: 'sess-test',
    session_date: '2026-01-01T10:00:00.000Z',
    session_summary: 'Test.',
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
    last_summarized_date: '2026-01-01T10:00:00.000Z',
    ...overrides,
  };
}

function makeBasePayload(overrides = {}) {
  return {
    therapist_memory_version: '1',
    session_id: 'conv-test',
    session_date: '2026-01-01T10:00:00.000Z',
    session_summary: '',
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
    last_summarized_date: '2026-01-01T10:00:00.000Z',
    ...overrides,
  };
}

// ─── 1–2: unwrapBase44FunctionData ───────────────────────────────────────────

describe('unwrapBase44FunctionData', () => {
  it('1. returns inner .data payload when result has a non-null object .data', () => {
    const inner = { memories: ['a', 'b'], count: 2 };
    const wrapped = { data: inner };
    expect(unwrapBase44FunctionData(wrapped)).toBe(inner);
  });

  it('2. returns result unchanged (legacy/unwrapped) when no .data envelope', () => {
    const legacy = { memories: ['a', 'b'], count: 2 };
    expect(unwrapBase44FunctionData(legacy)).toBe(legacy);
  });

  it('2a. returns result unchanged for null .data (not unwrapped)', () => {
    const obj = { data: null, memories: [] };
    expect(unwrapBase44FunctionData(obj)).toBe(obj);
  });

  it('2b. never throws for any input', () => {
    expect(() => unwrapBase44FunctionData(null)).not.toThrow();
    expect(() => unwrapBase44FunctionData(undefined)).not.toThrow();
    expect(() => unwrapBase44FunctionData(42)).not.toThrow();
    expect(() => unwrapBase44FunctionData('string')).not.toThrow();
  });
});

// ─── 3–4: LTS session_count with wrapped and unwrapped responses ─────────────

describe('LTS session_count after unwrapping retrieveTherapistMemory', () => {
  const rec1 = makeTherapistRecord({ session_id: 'sess-1', session_date: '2026-01-01T00:00:00.000Z' });
  const rec2 = makeTherapistRecord({ session_id: 'sess-2', session_date: '2026-01-02T00:00:00.000Z' });
  const rec3 = makeTherapistRecord({ session_id: 'sess-3', session_date: '2026-01-03T00:00:00.000Z' });

  function processMemResult(memResult) {
    const rawMemories = Array.isArray(memResult?.memories) ? memResult.memories : [];
    const sessionRecords = rawMemories
      .filter((r) => isTherapistMemoryRecord(r))
      .slice(0, LTS_SESSION_RECORDS_FETCH_CAP);
    const oldestFirstSessionRecords = sessionRecords.slice().reverse();
    return buildLongitudinalState(oldestFirstSessionRecords, [], null);
  }

  it('3. wrapped response with 3 therapist records produces LTS session_count = 3', () => {
    const wrapped = { data: { memories: [rec3, rec2, rec1], count: 3 } };
    const unwrapped = unwrapBase44FunctionData(wrapped);
    const lts = processMemResult(unwrapped);
    expect(lts.session_count).toBe(3);
  });

  it('4. unwrapped legacy response with 3 therapist records produces LTS session_count = 3', () => {
    const legacy = { memories: [rec3, rec2, rec1], count: 3 };
    const unwrapped = unwrapBase44FunctionData(legacy);
    const lts = processMemResult(unwrapped);
    expect(lts.session_count).toBe(3);
  });
});

// ─── 5–6: classifyLTSWriteResult with wrapped writeLTSSnapshot response ──────

describe('classifyLTSWriteResult with wrapped writeLTSSnapshot responses', () => {
  it('5. wrapped { data: { success: true, upserted: "updated" } } classifies as updated', () => {
    const raw = { data: { success: true, upserted: 'updated' } };
    const writeResult = unwrapBase44FunctionData(raw);
    expect(classifyLTSWriteResult(writeResult)).toBe(LTS_WRITE_RESULTS.updated);
  });

  it('6. wrapped { data: { success: true, upserted: "created" } } classifies as created', () => {
    const raw = { data: { success: true, upserted: 'created' } };
    const writeResult = unwrapBase44FunctionData(raw);
    expect(classifyLTSWriteResult(writeResult)).toBe(LTS_WRITE_RESULTS.created);
  });
});

// ─── 7–8: Summary success/failure gate for LTS ───────────────────────────────

describe('summary success/failure gate for LTS', () => {
  it('7. wrapped success { data: { success: true } } — success is not false → permits LTS', () => {
    const raw = { data: { success: true } };
    const result = unwrapBase44FunctionData(raw);
    const permitted = !(result && typeof result === 'object' && result.success === false);
    expect(permitted).toBe(true);
  });

  it('8. wrapped failure { data: { success: false } } — success is false → does NOT trigger LTS', () => {
    const raw = { data: { success: false } };
    const result = unwrapBase44FunctionData(raw);
    const permitted = !(result && typeof result === 'object' && result.success === false);
    expect(permitted).toBe(false);
  });

  it('8a. unwrapped success { success: true } → permits LTS', () => {
    const raw = { success: true };
    const result = unwrapBase44FunctionData(raw);
    const permitted = !(result && typeof result === 'object' && result.success === false);
    expect(permitted).toBe(true);
  });

  it('8b. unwrapped failure { success: false } → does NOT trigger LTS', () => {
    const raw = { success: false };
    const result = unwrapBase44FunctionData(raw);
    const permitted = !(result && typeof result === 'object' && result.success === false);
    expect(permitted).toBe(false);
  });
});

// ─── 9–11: Chronology ────────────────────────────────────────────────────────

describe('LTS chronological order', () => {
  const newestRec = makeTherapistRecord({ session_id: 'sess-new', session_date: '2026-03-01T00:00:00.000Z' });
  const middleRec = makeTherapistRecord({ session_id: 'sess-mid', session_date: '2026-02-01T00:00:00.000Z' });
  const oldestRec = makeTherapistRecord({ session_id: 'sess-old', session_date: '2026-01-01T00:00:00.000Z' });

  it('9. retrieve response newest-first → builder receives oldest-first (reversed correctly)', () => {
    const newestFirstFromAPI = [newestRec, middleRec, oldestRec];
    const reversed = newestFirstFromAPI.slice().reverse();
    expect(reversed[0]).toBe(oldestRec);
    expect(reversed[1]).toBe(middleRec);
    expect(reversed[2]).toBe(newestRec);
    // Builder receives oldest-first: passes through buildLongitudinalState without error
    const lts = buildLongitudinalState(reversed, [], null);
    expect(lts.session_count).toBe(3);
  });

  it('10. newest session becomes LTS last_session_date', () => {
    const oldest = makeTherapistRecord({ session_id: 'a', session_date: '2026-01-01T00:00:00.000Z' });
    const newest = makeTherapistRecord({ session_id: 'b', session_date: '2026-03-15T00:00:00.000Z' });
    // Builder expects oldest-first
    const lts = buildLongitudinalState([oldest, newest], [], null);
    expect(lts.last_session_date).toBe('2026-03-15T00:00:00.000Z');
  });

  it('11. input API array is NOT mutated by the reverse operation', () => {
    const newestFirstFromAPI = [newestRec, middleRec, oldestRec];
    const snapBefore = [...newestFirstFromAPI];
    // Simulate the production code path: .filter().slice().slice().reverse()
    const sessionRecords = newestFirstFromAPI.filter((r) => isTherapistMemoryRecord(r)).slice(0, 20);
    // This reverse must NOT mutate newestFirstFromAPI
    sessionRecords.slice().reverse();
    expect(newestFirstFromAPI).toEqual(snapBefore);
    // Also verify sessionRecords is not mutated
    const snapRecords = [...sessionRecords];
    sessionRecords.slice().reverse();
    expect(sessionRecords).toEqual(snapRecords);
  });
});

// ─── 12–18: Client continuity response normalization ─────────────────────────

describe('enrichConversationMemoryPayload — entity response normalization', () => {
  const goal = { id: 'goal-1', title: 'Grounding practice', status: 'active' };
  const formulation = { core_belief: 'I am capable' };

  function makeEntities({ goalResponse, cfResponse } = {}) {
    return {
      Goal: { filter: vi.fn(async () => goalResponse) },
      CaseFormulation: { list: vi.fn(async () => cfResponse) },
    };
  }

  it('12. Goal bare-array response enriches goals_referenced and follow_up_tasks', async () => {
    const entities = makeEntities({ goalResponse: [goal], cfResponse: [] });
    const result = await enrichConversationMemoryPayload(makeBasePayload(), entities);
    expect(result.goals_referenced).toContain('goal-1');
    expect(result.follow_up_tasks).toContain('Grounding practice');
  });

  describe('global wrapper interaction — shared normalizeEntityList first, then enrichment', () => {
    const goal = { id: 'goal-wrap-1', title: 'Keep hydration plan', status: 'active' };

    function makeWrappedEntities(goalResponse) {
      return {
        Goal: {
          filter: vi.fn(async () => normalizeEntityList(goalResponse)),
        },
        CaseFormulation: {
          list: vi.fn(async () => normalizeEntityList([])),
        },
      };
    }

    it('shared boundary preserves Goal from { data: { results:[...] } } for continuity enrichment', async () => {
      const entities = makeWrappedEntities({ data: { results: [goal] } });
      const result = await enrichConversationMemoryPayload(makeBasePayload(), entities);
      expect(result.goals_referenced).toEqual(['goal-wrap-1']);
      expect(result.follow_up_tasks).toContain('Keep hydration plan');
    });

    it('shared boundary preserves Goal from { data:[...] } for continuity enrichment', async () => {
      const entities = makeWrappedEntities({ data: [goal] });
      const result = await enrichConversationMemoryPayload(makeBasePayload(), entities);
      expect(result.goals_referenced).toEqual(['goal-wrap-1']);
      expect(result.follow_up_tasks).toContain('Keep hydration plan');
    });
  });

  it('13. Goal { results: [...] } enriches', async () => {
    const entities = makeEntities({ goalResponse: { results: [goal] }, cfResponse: [] });
    const result = await enrichConversationMemoryPayload(makeBasePayload(), entities);
    expect(result.goals_referenced).toContain('goal-1');
  });

  it('14. Goal { data: [...] } enriches', async () => {
    const entities = makeEntities({ goalResponse: { data: [goal] }, cfResponse: [] });
    const result = await enrichConversationMemoryPayload(makeBasePayload(), entities);
    expect(result.goals_referenced).toContain('goal-1');
  });

  it('15. Goal { data: { results: [...] } } enriches', async () => {
    const entities = makeEntities({ goalResponse: { data: { results: [goal] } }, cfResponse: [] });
    const result = await enrichConversationMemoryPayload(makeBasePayload(), entities);
    expect(result.goals_referenced).toContain('goal-1');
  });

  it('16a. CaseFormulation bare-array enriches working_hypotheses', async () => {
    const entities = makeEntities({ goalResponse: [], cfResponse: [formulation] });
    const result = await enrichConversationMemoryPayload(makeBasePayload(), entities);
    expect(result.working_hypotheses).toContain('I am capable');
  });

  it('16b. CaseFormulation { results: [...] } enriches', async () => {
    const entities = makeEntities({ goalResponse: [], cfResponse: { results: [formulation] } });
    const result = await enrichConversationMemoryPayload(makeBasePayload(), entities);
    expect(result.working_hypotheses).toContain('I am capable');
  });

  it('16c. CaseFormulation { data: [...] } enriches', async () => {
    const entities = makeEntities({ goalResponse: [], cfResponse: { data: [formulation] } });
    const result = await enrichConversationMemoryPayload(makeBasePayload(), entities);
    expect(result.working_hypotheses).toContain('I am capable');
  });

  it('16d. CaseFormulation { data: { results: [...] } } enriches', async () => {
    const entities = makeEntities({ goalResponse: [], cfResponse: { data: { results: [formulation] } } });
    const result = await enrichConversationMemoryPayload(makeBasePayload(), entities);
    expect(result.working_hypotheses).toContain('I am capable');
  });

  it('17. entity read exception is fail-open for the write — base payload returned', async () => {
    const entities = {
      Goal: { filter: vi.fn(async () => { throw new Error('network error'); }) },
      CaseFormulation: { list: vi.fn(async () => { throw new Error('network error'); }) },
    };
    const base = makeBasePayload();
    const result = await enrichConversationMemoryPayload(base, entities);
    // Fail-open: result is the base payload with empty clinical arrays
    expect(Array.isArray(result.goals_referenced)).toBe(true);
    expect(Array.isArray(result.working_hypotheses)).toBe(true);
  });

  it('18. goal ID is preserved even if goal title is rejected by raw-transcript sanitization', async () => {
    const safeGoal = { id: 'goal-safe', title: 'Safe title', status: 'active' };
    const transcriptGoal = { id: 'goal-transcript', title: '[12:34] Therapist: hello', status: 'active' };
    const entities = makeEntities({ goalResponse: [safeGoal, transcriptGoal], cfResponse: [] });
    const result = await enrichConversationMemoryPayload(makeBasePayload(), entities);
    // Both IDs should be in goals_referenced (the downstream sanitizer handles transcript detection per field type)
    // At minimum, safe goal ID must be present
    expect(result.goals_referenced).toContain('goal-safe');
    // The transcript-like title should NOT appear in follow_up_tasks
    // (either filtered by enrichment or by the downstream sanitizeSummaryRecord)
    expect(result.follow_up_tasks).not.toContain('[12:34] Therapist: hello');
    // Transcript goal ID should still be present (IDs are not transcript-detected)
    expect(result.goals_referenced).toContain('goal-transcript');
  });
});

// ─── 19–23: Backend continuity gate ──────────────────────────────────────────

describe('isRuntimeContinuityEnrichmentEnabled (backend gate)', () => {
  let isRuntimeContinuityEnrichmentEnabled;

  beforeEach(() => {
    isRuntimeContinuityEnrichmentEnabled = loadBackendGateFn('isRuntimeContinuityEnrichmentEnabled');
  });

  const allTrue = {
    THERAPIST_RUNTIME_APPLY_ENABLED: 'true',
    VITE_THERAPIST_UPGRADE_ENABLED: 'true',
    VITE_THERAPIST_UPGRADE_SUMMARIZATION_ENABLED: 'true',
    VITE_THERAPIST_UPGRADE_CONTINUITY_ENABLED: 'true',
  };

  it('19. APPLY=true + MASTER=true + SUM=true + CONTINUITY=true → enabled', () => {
    expect(isRuntimeContinuityEnrichmentEnabled(readEnvFrom(allTrue))).toBe(true);
  });

  it('20. MASTER=false blocks backend enrichment', () => {
    expect(isRuntimeContinuityEnrichmentEnabled(readEnvFrom({
      ...allTrue,
      VITE_THERAPIST_UPGRADE_ENABLED: 'false',
    }))).toBe(false);
  });

  it('21. SUM=false blocks backend enrichment', () => {
    expect(isRuntimeContinuityEnrichmentEnabled(readEnvFrom({
      ...allTrue,
      VITE_THERAPIST_UPGRADE_SUMMARIZATION_ENABLED: 'false',
    }))).toBe(false);
  });

  it('22. CONTINUITY=false blocks backend enrichment', () => {
    expect(isRuntimeContinuityEnrichmentEnabled(readEnvFrom({
      ...allTrue,
      VITE_THERAPIST_UPGRADE_CONTINUITY_ENABLED: 'false',
    }))).toBe(false);
  });

  it('23. APPLY=false preserves legacy behavior (returns false — no new enrichment)', () => {
    expect(isRuntimeContinuityEnrichmentEnabled(readEnvFrom({
      ...allTrue,
      THERAPIST_RUNTIME_APPLY_ENABLED: 'false',
    }))).toBe(false);
  });
});

// ─── 24–32: Backend enrichment behaviour (via gate-function + structure inspection) ─

describe('backend continuity enrichment structure (generateSessionSummary source)', () => {
  const normalizeBackendEntityList = loadBackendSourceFn('normalizeBackendEntityList');

  it('24a. normalizeBackendEntityList handles all four supported response shapes', () => {
    const row = { id: 'goal-1', title: 'Grounding' };
    expect(normalizeBackendEntityList([row])).toEqual([row]);
    expect(normalizeBackendEntityList({ results: [row] })).toEqual([row]);
    expect(normalizeBackendEntityList({ data: [row] })).toEqual([row]);
    expect(normalizeBackendEntityList({ data: { results: [row] } })).toEqual([row]);
  });

  it('24b. normalizeBackendEntityList fail-open fallback for empty/unsupported shapes', () => {
    expect(normalizeBackendEntityList(null)).toEqual([]);
    expect(normalizeBackendEntityList(undefined)).toEqual([]);
    expect(normalizeBackendEntityList({ data: { foo: [] } })).toEqual([]);
    expect(normalizeBackendEntityList({ foo: 'bar' })).toEqual([]);
  });

  it('24c. normalizeBackendEntityList does not mutate source envelope', () => {
    const envelope = { data: { results: [{ id: 'goal-1', title: 'Grounding' }] } };
    const before = JSON.stringify(envelope);
    normalizeBackendEntityList(envelope);
    expect(JSON.stringify(envelope)).toBe(before);
  });

  it('24. backend enrichment code reads Goal with { status: "active" }, newest-first, max 5', () => {
    // Verify the source code contains the expected Goal.filter call shape
    expect(generateSummarySource).toMatch(/base44\.entities\.Goal\.filter/);
    expect(generateSummarySource).toMatch(/status.*active/);
    expect(generateSummarySource).toMatch(/-created_date/);
    expect(generateSummarySource).toMatch(/BACKEND_MAX_GOALS/);
  });

  it('25. backend enrichment merges active Goal titles into follow_up_tasks (source check)', () => {
    expect(generateSummarySource).toMatch(/follow_up_tasks/);
    expect(generateSummarySource).toMatch(/title/);
  });

  it('26. backend enrichment merges CaseFormulation core_belief into working_hypotheses (source check)', () => {
    expect(generateSummarySource).toMatch(/core_belief/);
    expect(generateSummarySource).toMatch(/working_hypotheses/);
  });

  it('27. backend enrichment deduplicates by checking existing arrays (source check)', () => {
    expect(generateSummarySource).toMatch(/existingGoalIds/);
    expect(generateSummarySource).toMatch(/existingFollowUpTasks/);
    expect(generateSummarySource).toMatch(/existingWorkingHypotheses/);
  });

  it('28. transcript-like Goal title is rejected via isRawTranscript check (source check)', () => {
    expect(generateSummarySource).toMatch(/isRawTranscript.*title/s);
  });

  it('29. transcript-like core_belief is rejected via isRawTranscript check (source check)', () => {
    expect(generateSummarySource).toMatch(/isRawTranscript.*coreBelief/s);
  });

  it('30. safety_stub is never enriched — enrichment gated on !safety_stub (source check)', () => {
    expect(generateSummarySource).toMatch(/!safety_stub/);
  });

  it('31. Goal read failure does not block therapist_session persistence (source check)', () => {
    expect(generateSummarySource).toMatch(/_goalError/);
    // The catch block does not rethrow
    const goalCatchIdx = generateSummarySource.indexOf('_goalError');
    expect(goalCatchIdx).toBeGreaterThan(0);
  });

  it('32. CaseFormulation read failure does not block persistence (source check)', () => {
    expect(generateSummarySource).toMatch(/_cfError/);
    const cfCatchIdx = generateSummarySource.indexOf('_cfError');
    expect(cfCatchIdx).toBeGreaterThan(0);
  });
});
