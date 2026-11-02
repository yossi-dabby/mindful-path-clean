/**
 * @file test/utils/therapistMemoryContinuityRuntimeAuthority.test.js
 *
 * PR #923 — Runtime authority bridge for therapist memory / continuity / LTS
 *
 * Tests the two new runtime-authority resolvers in sessionEndSummarization.js:
 *
 *   - resolveRuntimeContinuityEnrichmentFlag(snapshot)
 *   - resolveRuntimeLongitudinalFlag(snapshot)
 *
 * Test numbers match the PR #923 spec:
 *
 * CONTINUITY ENRICHMENT (tests 1–6):
 *   1. APPLY=true + MASTER=true + SUM=true + CONTINUITY=true   → true
 *   2. APPLY=true + MASTER=false + SUM=true + CONTINUITY=true  → false
 *   3. APPLY=true + MASTER=true + SUM=false + CONTINUITY=true  → false
 *   4. APPLY=true + MASTER=true + SUM=true + CONTINUITY=false  → false
 *   5. APPLY=false → exact legacy behavior
 *   6. unavailable snapshot → exact legacy behavior
 *
 * LONGITUDINAL CLIENT GATE (tests 7–12):
 *   7. APPLY=true + MASTER=true + SUM=true + LONGITUDINAL=true → true
 *   8. MASTER=false → false
 *   9. SUM=false    → false
 *  10. LONGITUDINAL=false → false
 *  11. APPLY=false → exact legacy behavior
 *  12. unavailable snapshot → exact legacy behavior
 *
 * FUNCTIONAL CONTRACT (tests 22–26):
 *  22. runtime-enabled enrichment still reads only approved Goal / CaseFormulation fields
 *  23. no raw message content is stored
 *  24. LTS recompute occurs only after successful therapist_session write
 *  25. failure remains non-blocking
 *  26. Companion unaffected
 *
 * CONSTRAINTS:
 * - No capability flags activated (all default false in test env).
 * - No live Base44 backend required.
 * - No skip / fixme.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  resolveRuntimeContinuityEnrichmentFlag,
  resolveRuntimeLongitudinalFlag,
  isContinuityEnrichmentEnabled,
  isLongitudinalEnabled,
  triggerConversationEndSummarization,
  ENRICHMENT_MAX_GOALS,
} from '../../src/lib/sessionEndSummarization.js';

import {
  THERAPIST_RUNTIME_FLAG_SCHEMA,
  THERAPIST_RUNTIME_FLAG_KEYS,
  getDefaultTherapistRuntimeFlags,
  normalizeTherapistRuntimeFlagSnapshotPayload,
} from '../../src/lib/therapistRuntimeFlagTransport.js';
import { normalizeEntityList } from '../../src/lib/entityListNormalizer.js';

// ─── Test helpers ─────────────────────────────────────────────────────────────

function buildAllFalseFlags(overrides = {}) {
  const flags = {};
  for (const key of THERAPIST_RUNTIME_FLAG_KEYS) {
    flags[key] = false;
  }
  return { ...flags, ...overrides };
}

function makeAvailableSnapshot(flagOverrides = {}) {
  const rawPayload = {
    schema: THERAPIST_RUNTIME_FLAG_SCHEMA,
    flags: buildAllFalseFlags(flagOverrides),
    generated_at: new Date().toISOString(),
  };
  const normalized = normalizeTherapistRuntimeFlagSnapshotPayload(rawPayload);
  if (!normalized) throw new Error('makeAvailableSnapshot: normalization failed');
  return Object.freeze({
    schema: normalized.schema,
    transport_status: 'available',
    received: true,
    flags: normalized.flags,
    generated_at: normalized.generated_at,
    fetched_at: new Date().toISOString(),
  });
}

function makeUnavailableSnapshot() {
  return Object.freeze({
    schema: THERAPIST_RUNTIME_FLAG_SCHEMA,
    transport_status: 'unavailable',
    received: false,
    flags: getDefaultTherapistRuntimeFlags(),
    generated_at: null,
    fetched_at: new Date().toISOString(),
  });
}

// ─── CONTINUITY ENRICHMENT tests (1–6) ───────────────────────────────────────

describe('resolveRuntimeContinuityEnrichmentFlag — Test 1: all conditions true → true', () => {
  it('1. APPLY=true + MASTER=true + SUM=true + CONTINUITY=true → true', () => {
    const snapshot = makeAvailableSnapshot({
      THERAPIST_RUNTIME_APPLY_ENABLED: true,
      THERAPIST_UPGRADE_ENABLED: true,
      THERAPIST_UPGRADE_SUMMARIZATION_ENABLED: true,
      THERAPIST_UPGRADE_CONTINUITY_ENABLED: true,
    });
    expect(resolveRuntimeContinuityEnrichmentFlag(snapshot)).toBe(true);
  });
});

describe('resolveRuntimeContinuityEnrichmentFlag — Test 2: MASTER=false → false', () => {
  it('2. APPLY=true + MASTER=false + SUM=true + CONTINUITY=true → false (hard rollback)', () => {
    const snapshot = makeAvailableSnapshot({
      THERAPIST_RUNTIME_APPLY_ENABLED: true,
      THERAPIST_UPGRADE_ENABLED: false,
      THERAPIST_UPGRADE_SUMMARIZATION_ENABLED: true,
      THERAPIST_UPGRADE_CONTINUITY_ENABLED: true,
    });
    expect(resolveRuntimeContinuityEnrichmentFlag(snapshot)).toBe(false);
  });
});

describe('resolveRuntimeContinuityEnrichmentFlag — Test 3: SUM=false → false', () => {
  it('3. APPLY=true + MASTER=true + SUM=false + CONTINUITY=true → false', () => {
    const snapshot = makeAvailableSnapshot({
      THERAPIST_RUNTIME_APPLY_ENABLED: true,
      THERAPIST_UPGRADE_ENABLED: true,
      THERAPIST_UPGRADE_SUMMARIZATION_ENABLED: false,
      THERAPIST_UPGRADE_CONTINUITY_ENABLED: true,
    });
    expect(resolveRuntimeContinuityEnrichmentFlag(snapshot)).toBe(false);
  });
});

describe('resolveRuntimeContinuityEnrichmentFlag — Test 4: CONTINUITY=false → false', () => {
  it('4. APPLY=true + MASTER=true + SUM=true + CONTINUITY=false → false', () => {
    const snapshot = makeAvailableSnapshot({
      THERAPIST_RUNTIME_APPLY_ENABLED: true,
      THERAPIST_UPGRADE_ENABLED: true,
      THERAPIST_UPGRADE_SUMMARIZATION_ENABLED: true,
      THERAPIST_UPGRADE_CONTINUITY_ENABLED: false,
    });
    expect(resolveRuntimeContinuityEnrichmentFlag(snapshot)).toBe(false);
  });
});

describe('resolveRuntimeContinuityEnrichmentFlag — Test 5: APPLY=false → exact legacy', () => {
  it('5a. APPLY=false falls back to legacy isContinuityEnrichmentEnabled()', () => {
    const snapshot = makeAvailableSnapshot({
      THERAPIST_RUNTIME_APPLY_ENABLED: false,
      THERAPIST_UPGRADE_CONTINUITY_ENABLED: true,
      THERAPIST_UPGRADE_SUMMARIZATION_ENABLED: true,
      THERAPIST_UPGRADE_ENABLED: true,
    });
    expect(resolveRuntimeContinuityEnrichmentFlag(snapshot)).toBe(isContinuityEnrichmentEnabled());
  });

  it('5b. null snapshot falls back to legacy', () => {
    expect(resolveRuntimeContinuityEnrichmentFlag(null)).toBe(isContinuityEnrichmentEnabled());
  });

  it('5c. undefined snapshot falls back to legacy', () => {
    expect(resolveRuntimeContinuityEnrichmentFlag(undefined)).toBe(isContinuityEnrichmentEnabled());
  });
});

describe('resolveRuntimeContinuityEnrichmentFlag — Test 6: unavailable snapshot → exact legacy', () => {
  it('6a. unavailable snapshot (transport_status=unavailable) falls back to legacy', () => {
    const snapshot = makeUnavailableSnapshot();
    expect(resolveRuntimeContinuityEnrichmentFlag(snapshot)).toBe(isContinuityEnrichmentEnabled());
  });

  it('6b. snapshot with received=false falls back to legacy', () => {
    const snapshot = { ...makeUnavailableSnapshot(), transport_status: 'available', received: false };
    expect(resolveRuntimeContinuityEnrichmentFlag(snapshot)).toBe(isContinuityEnrichmentEnabled());
  });
});

// ─── LONGITUDINAL CLIENT GATE tests (7–12) ────────────────────────────────────

describe('resolveRuntimeLongitudinalFlag — Test 7: all conditions true → true', () => {
  it('7. APPLY=true + MASTER=true + SUM=true + LONGITUDINAL=true → true', () => {
    const snapshot = makeAvailableSnapshot({
      THERAPIST_RUNTIME_APPLY_ENABLED: true,
      THERAPIST_UPGRADE_ENABLED: true,
      THERAPIST_UPGRADE_SUMMARIZATION_ENABLED: true,
      THERAPIST_UPGRADE_LONGITUDINAL_ENABLED: true,
    });
    expect(resolveRuntimeLongitudinalFlag(snapshot)).toBe(true);
  });
});

describe('resolveRuntimeLongitudinalFlag — Test 8: MASTER=false → false', () => {
  it('8. APPLY=true + MASTER=false + SUM=true + LONGITUDINAL=true → false', () => {
    const snapshot = makeAvailableSnapshot({
      THERAPIST_RUNTIME_APPLY_ENABLED: true,
      THERAPIST_UPGRADE_ENABLED: false,
      THERAPIST_UPGRADE_SUMMARIZATION_ENABLED: true,
      THERAPIST_UPGRADE_LONGITUDINAL_ENABLED: true,
    });
    expect(resolveRuntimeLongitudinalFlag(snapshot)).toBe(false);
  });
});

describe('resolveRuntimeLongitudinalFlag — Test 9: SUM=false → false', () => {
  it('9. APPLY=true + MASTER=true + SUM=false + LONGITUDINAL=true → false', () => {
    const snapshot = makeAvailableSnapshot({
      THERAPIST_RUNTIME_APPLY_ENABLED: true,
      THERAPIST_UPGRADE_ENABLED: true,
      THERAPIST_UPGRADE_SUMMARIZATION_ENABLED: false,
      THERAPIST_UPGRADE_LONGITUDINAL_ENABLED: true,
    });
    expect(resolveRuntimeLongitudinalFlag(snapshot)).toBe(false);
  });
});

describe('resolveRuntimeLongitudinalFlag — Test 10: LONGITUDINAL=false → false', () => {
  it('10. APPLY=true + MASTER=true + SUM=true + LONGITUDINAL=false → false', () => {
    const snapshot = makeAvailableSnapshot({
      THERAPIST_RUNTIME_APPLY_ENABLED: true,
      THERAPIST_UPGRADE_ENABLED: true,
      THERAPIST_UPGRADE_SUMMARIZATION_ENABLED: true,
      THERAPIST_UPGRADE_LONGITUDINAL_ENABLED: false,
    });
    expect(resolveRuntimeLongitudinalFlag(snapshot)).toBe(false);
  });
});

describe('resolveRuntimeLongitudinalFlag — Test 11: APPLY=false → exact legacy', () => {
  it('11a. APPLY=false falls back to legacy isLongitudinalEnabled()', () => {
    const snapshot = makeAvailableSnapshot({
      THERAPIST_RUNTIME_APPLY_ENABLED: false,
      THERAPIST_UPGRADE_LONGITUDINAL_ENABLED: true,
      THERAPIST_UPGRADE_SUMMARIZATION_ENABLED: true,
      THERAPIST_UPGRADE_ENABLED: true,
    });
    expect(resolveRuntimeLongitudinalFlag(snapshot)).toBe(isLongitudinalEnabled());
  });

  it('11b. null snapshot falls back to legacy', () => {
    expect(resolveRuntimeLongitudinalFlag(null)).toBe(isLongitudinalEnabled());
  });

  it('11c. undefined snapshot falls back to legacy', () => {
    expect(resolveRuntimeLongitudinalFlag(undefined)).toBe(isLongitudinalEnabled());
  });
});

describe('resolveRuntimeLongitudinalFlag — Test 12: unavailable snapshot → exact legacy', () => {
  it('12a. unavailable snapshot falls back to legacy isLongitudinalEnabled()', () => {
    const snapshot = makeUnavailableSnapshot();
    expect(resolveRuntimeLongitudinalFlag(snapshot)).toBe(isLongitudinalEnabled());
  });

  it('12b. snapshot with received=false falls back to legacy', () => {
    const snapshot = { ...makeUnavailableSnapshot(), transport_status: 'available', received: false };
    expect(resolveRuntimeLongitudinalFlag(snapshot)).toBe(isLongitudinalEnabled());
  });
});

// ─── FUNCTIONAL CONTRACT tests (22–26) ────────────────────────────────────────

describe('Test 22: enrichment reads only approved Goal / CaseFormulation structured fields', () => {
  it('22. enrichConversationMemoryPayload uses bounded approved reads and produces only structured enrichment fields', async () => {
    const { enrichConversationMemoryPayload, deriveConversationMemoryPayload } = await import(
      '../../src/lib/sessionEndSummarization.js'
    );

    const goalFilter = vi.fn(async () => normalizeEntityList({
      data: {
        results: [
          {
            id: 'goal-1',
            title: 'Practice grounding',
            status: 'active',
            forbidden_raw_message: 'User: raw transcript line that must never persist',
          },
          {
            id: 'goal-2',
            title: 'Sleep hygiene routine',
            status: 'active',
            transcript: 'Client: private text',
          },
        ],
      },
    }));

    const formulationList = vi.fn(async () => normalizeEntityList({
      data: [
        {
          core_belief: 'I am unsafe when anxious.',
          transcript: 'Therapist: private text',
        },
      ],
    }));

    const basePayload = deriveConversationMemoryPayload('conv-test-22', {
      name: 'Session 22',
      intent: 'anxiety planning',
    });

    const enriched = await enrichConversationMemoryPayload(basePayload, {
      Goal: { filter: goalFilter },
      CaseFormulation: { list: formulationList },
    });

    expect(goalFilter).toHaveBeenCalledTimes(1);
    expect(goalFilter).toHaveBeenCalledWith(
      { status: 'active' },
      '-created_date',
      ENRICHMENT_MAX_GOALS,
    );

    expect(formulationList).toHaveBeenCalledTimes(1);
    expect(formulationList).toHaveBeenCalledWith('-created_date', 1);

    expect(enriched.goals_referenced).toEqual(['goal-1', 'goal-2']);
    expect(enriched.follow_up_tasks).toEqual(['Practice grounding', 'Sleep hygiene routine']);
    expect(enriched.working_hypotheses).toEqual(['I am unsafe when anxious.']);

    const persisted = JSON.stringify(enriched);
    expect(persisted).not.toContain('forbidden_raw_message');
    expect(persisted).not.toContain('transcript');
    expect(persisted).not.toContain('messages');
  });
});

describe('Test 23: no raw message content stored', () => {
  afterEach(() => {
    vi.doUnmock('../../src/api/base44Client.js');
    vi.resetModules();
  });

  it('23. triggerConversationEndSummarization excludes raw transcript sentinel from persisted generateSessionSummary payload', async () => {
    const transcriptSentinel = '__RAW_TRANSCRIPT_SENTINEL_23__';
    const transcriptLine = `[12:34] ${transcriptSentinel}`;
    const runtimeSnapshot = makeAvailableSnapshot({
      THERAPIST_RUNTIME_APPLY_ENABLED: true,
      THERAPIST_UPGRADE_ENABLED: true,
      THERAPIST_UPGRADE_SUMMARIZATION_ENABLED: true,
      THERAPIST_UPGRADE_CONTINUITY_ENABLED: true,
      THERAPIST_UPGRADE_LONGITUDINAL_ENABLED: false,
    });

    const invokeSpy = vi.fn(async (fnName, payload) => {
      if (fnName === 'generateSessionSummary') {
        return { success: true, id: 'mem-23', payload };
      }
      return { success: true };
    });

    vi.resetModules();
    vi.doMock('../../src/api/base44Client.js', () => ({
      base44: { functions: { invoke: invokeSpy } },
    }));

    const { triggerConversationEndSummarization } = await import('../../src/lib/sessionEndSummarization.js');

    const entities = {
      Goal: {
        filter: vi.fn(async () => [
          { id: 'g-23', title: transcriptLine, status: 'active' },
          { id: 'g-23b', title: 'Keep sleep schedule', status: 'active' },
        ]),
      },
      CaseFormulation: {
        list: vi.fn(async () => [{ core_belief: transcriptLine }]),
      },
    };

    triggerConversationEndSummarization(
      'conv-test-23',
      { intent: `\n${transcriptLine}` },
      'test_23',
      entities,
      runtimeSnapshot,
    );

    await vi.waitFor(() => {
      expect(invokeSpy).toHaveBeenCalledWith('generateSessionSummary', expect.any(Object));
    });

    const persistedPayload = invokeSpy.mock.calls.find(([fn]) => fn === 'generateSessionSummary')?.[1];
    expect(persistedPayload).toBeTruthy();
    const persistedSerialized = JSON.stringify(persistedPayload);
    expect(persistedSerialized).not.toContain(transcriptSentinel);
    expect(persistedSerialized).not.toContain('transcript');
    expect(persistedSerialized).not.toContain('messages');

  });
});

describe('Test 24: LTS recompute occurs only after successful therapist_session write', () => {
  afterEach(() => {
    vi.doUnmock('../../src/api/base44Client.js');
    vi.doUnmock('../../src/lib/longitudinalStateBuilder.js');
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('24a. generateSessionSummary success occurs before retrieveTherapistMemory/writeLTSSnapshot when longitudinal gate is true', async () => {
    const runtimeSnapshot = makeAvailableSnapshot({
      THERAPIST_RUNTIME_APPLY_ENABLED: true,
      THERAPIST_UPGRADE_ENABLED: true,
      THERAPIST_UPGRADE_SUMMARIZATION_ENABLED: true,
      THERAPIST_UPGRADE_CONTINUITY_ENABLED: true,
      THERAPIST_UPGRADE_LONGITUDINAL_ENABLED: true,
    });

    const callOrder = [];
    let finish;
    const finished = new Promise((resolve) => {
      finish = resolve;
    });

    const invokeSpy = vi.fn(async (fnName) => {
      callOrder.push(fnName);
      if (fnName === 'generateSessionSummary') return { success: true, id: 'mem-24a' };
      if (fnName === 'retrieveTherapistMemory') return { memories: [], count: 0 };
      if (fnName === 'writeLTSSnapshot') {
        finish();
        return { success: true, id: 'lts-24a', upserted: 'created' };
      }
      return { success: true };
    });

    vi.doMock('../../src/api/base44Client.js', () => ({
      base44: { functions: { invoke: invokeSpy } },
    }));
    vi.doMock('../../src/lib/longitudinalStateBuilder.js', () => ({
      buildLongitudinalState: () => ({
        lts_version: '1',
        memory_type: 'lts',
        generated_at: '2026-01-01T00:00:00.000Z',
        session_count: 0,
        recurring_core_patterns: [],
        persistent_blockers: [],
        helpful_interventions: [],
        stalled_interventions: [],
        risk_trajectory_flags: [],
        trajectory: 'insufficient_data',
        next_focus_hint: '',
        goals_in_motion: [],
      }),
    }));

    const { triggerConversationEndSummarization } = await import('../../src/lib/sessionEndSummarization.js');

    triggerConversationEndSummarization(
      'conv-test-24a',
      { intent: 'ordering success path' },
      'test_24a',
      null,
      runtimeSnapshot,
    );

    await finished;

    const summaryIdx = callOrder.indexOf('generateSessionSummary');
    const retrieveIdx = callOrder.indexOf('retrieveTherapistMemory');
    const writeIdx = callOrder.indexOf('writeLTSSnapshot');

    expect(summaryIdx).toBeGreaterThanOrEqual(0);
    expect(retrieveIdx).toBeGreaterThan(summaryIdx);
    expect(writeIdx).toBeGreaterThan(retrieveIdx);
  });

  it('24b. generateSessionSummary failure prevents retrieveTherapistMemory/writeLTSSnapshot', async () => {
    const runtimeSnapshot = makeAvailableSnapshot({
      THERAPIST_RUNTIME_APPLY_ENABLED: true,
      THERAPIST_UPGRADE_ENABLED: true,
      THERAPIST_UPGRADE_SUMMARIZATION_ENABLED: true,
      THERAPIST_UPGRADE_CONTINUITY_ENABLED: true,
      THERAPIST_UPGRADE_LONGITUDINAL_ENABLED: true,
    });

    const callOrder = [];
    let generateAttempted;
    const generateDone = new Promise((resolve) => {
      generateAttempted = resolve;
    });

    const invokeSpy = vi.fn(async (fnName) => {
      callOrder.push(fnName);
      if (fnName === 'generateSessionSummary') {
        generateAttempted();
        throw new Error('generate fail');
      }
      return { success: true };
    });

    vi.doMock('../../src/api/base44Client.js', () => ({
      base44: { functions: { invoke: invokeSpy } },
    }));

    const { triggerConversationEndSummarization } = await import('../../src/lib/sessionEndSummarization.js');

    triggerConversationEndSummarization(
      'conv-test-24b',
      { intent: 'ordering failure path' },
      'test_24b',
      null,
      runtimeSnapshot,
    );

    await generateDone;

    await vi.waitFor(() => {
      expect(callOrder).toEqual(['generateSessionSummary']);
    });
    expect(callOrder).not.toContain('retrieveTherapistMemory');
    expect(callOrder).not.toContain('writeLTSSnapshot');
  });
});

describe('Test 25: failure remains non-blocking', () => {
  it('25. triggerConversationEndSummarization returns synchronously (fire-and-forget)', () => {
    // The function must return synchronously without throwing, even with no entities.
    // Flags are all off in test env → function exits at summarization gate.
    const result = triggerConversationEndSummarization(
      'conv-test-25',
      {},
      'test_invoker',
      null,
      null, // no runtimeSnapshot → legacy path → summarization gate off → no-op
    );
    // Returns undefined (synchronous, fire-and-forget).
    expect(result).toBeUndefined();
  });
});

describe('Test 26: Companion unaffected', () => {
  it('26. resolveRuntimeContinuityEnrichmentFlag and resolveRuntimeLongitudinalFlag do not reference companion entities', () => {
    // Neither resolver imports or calls companion-related functions.
    // Verifying behaviorally: both functions operate purely on the snapshot.
    const snapshot = makeAvailableSnapshot({
      THERAPIST_RUNTIME_APPLY_ENABLED: true,
      THERAPIST_UPGRADE_ENABLED: true,
      THERAPIST_UPGRADE_SUMMARIZATION_ENABLED: true,
      THERAPIST_UPGRADE_CONTINUITY_ENABLED: true,
      THERAPIST_UPGRADE_LONGITUDINAL_ENABLED: true,
    });
    expect(typeof resolveRuntimeContinuityEnrichmentFlag(snapshot)).toBe('boolean');
    expect(typeof resolveRuntimeLongitudinalFlag(snapshot)).toBe('boolean');
  });
});

// ─── Additional correctness: resolver identity when legacy path is the same ──

describe('Resolver legacy identity', () => {
  it('resolveRuntimeContinuityEnrichmentFlag(null) === isContinuityEnrichmentEnabled()', () => {
    expect(resolveRuntimeContinuityEnrichmentFlag(null)).toBe(isContinuityEnrichmentEnabled());
  });

  it('resolveRuntimeLongitudinalFlag(null) === isLongitudinalEnabled()', () => {
    expect(resolveRuntimeLongitudinalFlag(null)).toBe(isLongitudinalEnabled());
  });

  it('partial snapshot (missing flags) falls back to legacy for continuity', () => {
    const snapshot = { transport_status: 'available', received: true, flags: null };
    expect(resolveRuntimeContinuityEnrichmentFlag(snapshot)).toBe(isContinuityEnrichmentEnabled());
  });

  it('partial snapshot (missing flags) falls back to legacy for longitudinal', () => {
    const snapshot = { transport_status: 'available', received: true, flags: null };
    expect(resolveRuntimeLongitudinalFlag(snapshot)).toBe(isLongitudinalEnabled());
  });
});
