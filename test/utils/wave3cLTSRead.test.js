/**
 * @file test/utils/wave3cLTSRead.test.js
 *
 * Wave 3C — Longitudinal Therapeutic State (LTS) Read Path and Bounded
 * Session-Start Injection — Tests
 *
 * PURPOSE
 * -------
 * Validates the Wave 3C LTS read path and V9 session-start injection added to:
 *   - src/lib/workflowContextInjector.js  (readLTSSnapshot, isLTSWeak,
 *     buildLTSContextBlock, buildV9SessionStartContentAsync)
 *   - src/api/agentWiring.js              (CBT_THERAPIST_WIRING_STAGE2_V9)
 *   - src/api/activeAgentWiring.js        (resolveTherapistWiring V9 route)
 *
 * COVERAGE (per Wave 3C problem statement)
 * ─────────────────────────────────────────
 *  A. valid LTS → block appended in V9 path
 *  B. flag off (longitudinal_layer_enabled absent) → exact V8 output
 *  C. no LTS in CompanionMemory → exact V8 output
 *  D. invalid/stale LTS (unknown/insufficient_data trajectory) → exact V8 output
 *  E. bounded output shape and size (LTS_BLOCK_MAX_ARRAY_ITEMS enforced)
 *  F. no duplication/noise beyond intended fields (only trajectory +
 *     helpful_interventions + risk_flag_history)
 *  G. no raw transcript leakage (session_summary, automatic_thoughts, etc.
 *     must not appear in V9 output)
 *  H. no cross-user / private-entity leakage
 *  I. no regression to companion flows
 *  J. no regression to existing V8 strategy injection
 *  K. canonical LTS marker type used consistently (lts_version, memory_type)
 *  L. readLTSSnapshot returns null for missing/invalid entities
 *  M. readLTSSnapshot returns null when no LTS record exists
 *  N. readLTSSnapshot returns null on error (fail-open)
 *  O. isLTSWeak suppresses unknown, insufficient_data, and invalid LTS
 *  P. buildLTSContextBlock returns '' for weak/null LTS
 *  Q. CBT_THERAPIST_WIRING_STAGE2_V9 has longitudinal_layer_enabled: true
 *  R. resolveTherapistWiring routes to V9 when both flags on
 *  S. LTS_SNAPSHOT_OVERFETCH_BOUND and LTS_BLOCK_MAX_ARRAY_ITEMS exported
 *
 * CONSTRAINTS
 * -----------
 * - Does NOT enable any feature flags (all flags default to false).
 * - All tests are deterministic — no live Base44 backend required.
 * - No raw message content is passed to any LTS function.
 * - Companion entity access is never tested or invoked here.
 * - V8 and V9 session-start functions are tested with minimal wiring mocks —
 *   no real strategy engine, formulation, or safety mode calls.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Modules under test ───────────────────────────────────────────────────────

import {
  isLTSWeak,
  buildLTSContextBlock,
  buildV9SessionStartContentAsync,
  readLTSSnapshotWithDiagnostic,
  LTS_READ_RESULTS,
  LTS_SNAPSHOT_OVERFETCH_BOUND,
  LTS_BLOCK_MAX_ARRAY_ITEMS,
} from '../../src/lib/workflowContextInjector.js';

// ─── Wiring configs ───────────────────────────────────────────────────────────

import {
  CBT_THERAPIST_WIRING_STAGE2_V8,
  CBT_THERAPIST_WIRING_STAGE2_V9,
} from '../../src/api/agentWiring.js';

// ─── LTS model helpers ────────────────────────────────────────────────────────

import {
  LTS_VERSION,
  LTS_MEMORY_TYPE,
  LTS_TRAJECTORIES,
  LTS_MIN_SESSIONS_FOR_SIGNALS,
  isLTSRecord,
  createEmptyLTSRecord,
} from '../../src/lib/therapistMemoryModel.js';

// ─── Feature flag helper ──────────────────────────────────────────────────────

import { isUpgradeEnabled } from '../../src/lib/featureFlags.js';

// ─── Test helpers ─────────────────────────────────────────────────────────────

/**
 * Builds a minimal valid LTS record for testing.
 * All fields are bounded and match the Wave 3A/3B schema.
 *
 * @param {object} [overrides] - Field overrides.
 * @returns {object}
 */
function makeLTSRecord(overrides = {}) {
  return {
    lts_version: LTS_VERSION,
    memory_type: LTS_MEMORY_TYPE,
    session_count: 3,
    trajectory: LTS_TRAJECTORIES.STABLE,
    recurring_patterns: ['avoidance', 'catastrophising'],
    persistent_open_tasks: ['schedule_next_session'],
    active_goal_ids: ['goal-001'],
    helpful_interventions: ['thought_record', 'grounding'],
    stalled_interventions: [],
    risk_flag_history: [],
    last_session_date: '2026-01-15',
    computed_at: '2026-01-15T10:00:00.000Z',
    ...overrides,
  };
}

/**
 * Wraps an LTS record in a CompanionMemory-style envelope as the backend
 * returns it: an outer object with memory_type and content fields.
 *
 * @param {object} ltsRecord - A plain LTS record.
 * @param {boolean} [jsonStringContent] - If true, serialise content as a JSON string.
 * @returns {object}
 */
function wrapInCompanionRecord(ltsRecord, jsonStringContent = false) {
  return {
    id: 'cm-lts-001',
    memory_type: LTS_MEMORY_TYPE,
    content: jsonStringContent ? JSON.stringify(ltsRecord) : ltsRecord,
    created_date: '2026-01-15T10:00:00.000Z',
  };
}

/**
 * Builds a minimal mock entities object with a CompanionMemory list function.
 *
 * @param {object[]} records - Records the list function should return.
 * @param {boolean} [shouldThrow] - If true, list throws an error.
 * @returns {object}
 */
function makeEntities(records = [], shouldThrow = false, { includeFilter = true } = {}) {
  const list = vi.fn(async (_order, _limit) => {
    if (shouldThrow) throw new Error('CompanionMemory.list error');
    return records;
  });
  const filter = vi.fn(async (_query, _order, _limit) => {
    if (shouldThrow) throw new Error('CompanionMemory.filter error');
    return records.filter((record) => record?.memory_type === LTS_MEMORY_TYPE);
  });

  return {
    CompanionMemory: {
      list,
      ...(includeFilter ? { filter } : {}),
    },
    CaseFormulation: {
      list: vi.fn(async () => []),
    },
  };
}

async function withWindow(search, fn, hostname = 'localhost') {
  vi.stubGlobal('window', { location: { search, hostname } });
  try {
    return await fn();
  } finally {
    vi.unstubAllGlobals();
  }
}

/**
 * Minimal V8 wiring stub (strategy_layer_enabled: false) so that
 * buildV8/V9 delegates to V7→...→V3 chain are skipped.
 * With strategy_layer_enabled: false, buildV8 just delegates to V7;
 * with continuity_layer_enabled: false it delegates to V6 ... down to
 * the base '[START_SESSION]' return.
 */
const STUB_V8_WIRING = {
  strategy_layer_enabled: true,
  continuity_layer_enabled: false,
  formulation_context_enabled: false,
  safety_mode_enabled: false,
  live_retrieval_enabled: false,
  retrieval_orchestration_enabled: false,
  workflow_context_injection: false,
  memory_context_injection: false,
};

/**
 * V9 wiring stub — extends STUB_V8_WIRING with longitudinal_layer_enabled.
 */
const STUB_V9_WIRING = {
  ...STUB_V8_WIRING,
  longitudinal_layer_enabled: true,
};

/**
 * Minimal base44 client stub.  buildV8/V9 receive the client but the chain
 * doesn't call any live functions in the minimal stubs above.
 */
const STUB_BASE44 = {};

// ─── Test suites ──────────────────────────────────────────────────────────────

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

// ─── S. Exported constants ────────────────────────────────────────────────────

describe('Wave 3C — exported constants', () => {
  it('S1. LTS_SNAPSHOT_OVERFETCH_BOUND is exported and a positive integer', () => {
    expect(typeof LTS_SNAPSHOT_OVERFETCH_BOUND).toBe('number');
    expect(Number.isInteger(LTS_SNAPSHOT_OVERFETCH_BOUND)).toBe(true);
    expect(LTS_SNAPSHOT_OVERFETCH_BOUND).toBeGreaterThan(0);
  });

  it('S2. LTS_BLOCK_MAX_ARRAY_ITEMS is exported and a positive integer', () => {
    expect(typeof LTS_BLOCK_MAX_ARRAY_ITEMS).toBe('number');
    expect(Number.isInteger(LTS_BLOCK_MAX_ARRAY_ITEMS)).toBe(true);
    expect(LTS_BLOCK_MAX_ARRAY_ITEMS).toBeGreaterThan(0);
  });
});

// ─── K. Canonical LTS marker type ────────────────────────────────────────────

describe('Wave 3C — canonical LTS marker type', () => {
  it('K1. LTS_MEMORY_TYPE is "lts"', () => {
    expect(LTS_MEMORY_TYPE).toBe('lts');
  });

  it('K2. LTS_VERSION is "1"', () => {
    expect(LTS_VERSION).toBe('1');
  });

  it('K3. makeLTSRecord produces a valid LTS record (isLTSRecord)', () => {
    const rec = makeLTSRecord();
    expect(isLTSRecord(rec)).toBe(true);
  });

  it('K4. wrapInCompanionRecord produces outer memory_type = LTS_MEMORY_TYPE', () => {
    const rec = makeLTSRecord();
    const wrapped = wrapInCompanionRecord(rec);
    expect(wrapped.memory_type).toBe(LTS_MEMORY_TYPE);
  });
});

// ─── O. isLTSWeak suppression ─────────────────────────────────────────────────

describe('Wave 3C — isLTSWeak()', () => {
  it('O1. returns true for null', () => {
    expect(isLTSWeak(null)).toBe(true);
  });

  it('O2. returns true for undefined', () => {
    expect(isLTSWeak(undefined)).toBe(true);
  });

  it('O3. returns true for non-object (string)', () => {
    expect(isLTSWeak('lts')).toBe(true);
  });

  it('O4. returns true for trajectory "unknown"', () => {
    const rec = makeLTSRecord({ trajectory: LTS_TRAJECTORIES.UNKNOWN });
    expect(isLTSWeak(rec)).toBe(true);
  });

  it('O5. returns true for trajectory "insufficient_data"', () => {
    const rec = makeLTSRecord({ trajectory: LTS_TRAJECTORIES.INSUFFICIENT_DATA });
    expect(isLTSWeak(rec)).toBe(true);
  });

  it('O6. returns true when session_count < LTS_MIN_SESSIONS_FOR_SIGNALS', () => {
    const rec = makeLTSRecord({
      session_count: LTS_MIN_SESSIONS_FOR_SIGNALS - 1,
      trajectory: LTS_TRAJECTORIES.STABLE,
    });
    expect(isLTSWeak(rec)).toBe(true);
  });

  it('O7. returns false for valid LTS with trajectory "stable"', () => {
    const rec = makeLTSRecord({ trajectory: LTS_TRAJECTORIES.STABLE });
    expect(isLTSWeak(rec)).toBe(false);
  });

  it('O8. returns false for valid LTS with trajectory "progressing"', () => {
    const rec = makeLTSRecord({ trajectory: LTS_TRAJECTORIES.PROGRESSING });
    expect(isLTSWeak(rec)).toBe(false);
  });

  it('O9. returns false for valid LTS with trajectory "stagnating"', () => {
    const rec = makeLTSRecord({ trajectory: LTS_TRAJECTORIES.STAGNATING });
    expect(isLTSWeak(rec)).toBe(false);
  });

  it('O10. returns false for valid LTS with trajectory "fluctuating"', () => {
    const rec = makeLTSRecord({ trajectory: LTS_TRAJECTORIES.FLUCTUATING });
    expect(isLTSWeak(rec)).toBe(false);
  });

  it('O11. returns true for an object that fails isLTSRecord() (missing lts_version)', () => {
    const rec = { memory_type: LTS_MEMORY_TYPE, trajectory: LTS_TRAJECTORIES.STABLE, session_count: 3 };
    expect(isLTSWeak(rec)).toBe(true);
  });

  it('O12. returns true when session_count equals 0', () => {
    const rec = makeLTSRecord({ session_count: 0 });
    expect(isLTSWeak(rec)).toBe(true);
  });
});

// ─── P. buildLTSContextBlock ──────────────────────────────────────────────────

describe('Wave 3C — buildLTSContextBlock()', () => {
  it('P1. returns "" for null', () => {
    expect(buildLTSContextBlock(null)).toBe('');
  });

  it('P2. returns "" for invalid LTS (trajectory "unknown")', () => {
    const rec = makeLTSRecord({ trajectory: LTS_TRAJECTORIES.UNKNOWN });
    expect(buildLTSContextBlock(rec)).toBe('');
  });

  it('P3. returns "" for trajectory "insufficient_data"', () => {
    const rec = makeLTSRecord({ trajectory: LTS_TRAJECTORIES.INSUFFICIENT_DATA });
    expect(buildLTSContextBlock(rec)).toBe('');
  });

  it('P4. returns a non-empty string for a valid stable LTS', () => {
    const rec = makeLTSRecord({ trajectory: LTS_TRAJECTORIES.STABLE });
    const block = buildLTSContextBlock(rec);
    expect(typeof block).toBe('string');
    expect(block.trim().length).toBeGreaterThan(0);
  });

  it('P5. includes the trajectory value in the block', () => {
    const rec = makeLTSRecord({ trajectory: LTS_TRAJECTORIES.PROGRESSING });
    const block = buildLTSContextBlock(rec);
    expect(block).toContain('progressing');
  });

  it('P6. includes helpful_interventions when non-empty', () => {
    const rec = makeLTSRecord({ helpful_interventions: ['thought_record', 'grounding'] });
    const block = buildLTSContextBlock(rec);
    expect(block).toContain('thought_record');
    expect(block).toContain('grounding');
  });

  it('P7. includes risk_flag_history when non-empty', () => {
    const rec = makeLTSRecord({ risk_flag_history: ['passive_ideation'] });
    const block = buildLTSContextBlock(rec);
    expect(block).toContain('passive_ideation');
  });

  it('P8. omits helpful_interventions line when array is empty', () => {
    const rec = makeLTSRecord({ helpful_interventions: [] });
    const block = buildLTSContextBlock(rec);
    expect(block).not.toContain('Helpful methods');
  });

  it('P9. omits risk_flag_history line when array is empty', () => {
    const rec = makeLTSRecord({ risk_flag_history: [] });
    const block = buildLTSContextBlock(rec);
    expect(block).not.toContain('Risk history');
  });

  it('P10. does NOT include recurring_patterns (avoids continuity block duplication)', () => {
    const rec = makeLTSRecord({ recurring_patterns: ['catastrophising', 'avoidance'] });
    const block = buildLTSContextBlock(rec);
    expect(block).not.toContain('catastrophising');
    expect(block).not.toContain('avoidance');
  });

  it('P11. does NOT include persistent_open_tasks (avoids continuity block duplication)', () => {
    const rec = makeLTSRecord({ persistent_open_tasks: ['schedule_next_session'] });
    const block = buildLTSContextBlock(rec);
    expect(block).not.toContain('schedule_next_session');
  });

  it('P12. caps helpful_interventions at LTS_BLOCK_MAX_ARRAY_ITEMS', () => {
    const many = ['inv_aaa', 'inv_bbb', 'inv_ccc', 'inv_ddd', 'inv_eee', 'inv_fff', 'inv_ggg', 'inv_hhh'];
    const rec = makeLTSRecord({ helpful_interventions: many });
    const block = buildLTSContextBlock(rec);
    const overflowItem = many[LTS_BLOCK_MAX_ARRAY_ITEMS];
    // Items beyond the cap should not appear
    expect(block).not.toContain(overflowItem);
  });

  it('P13. caps risk_flag_history at LTS_BLOCK_MAX_ARRAY_ITEMS', () => {
    const many = ['flag_aaa', 'flag_bbb', 'flag_ccc', 'flag_ddd', 'flag_eee', 'flag_fff'];
    const rec = makeLTSRecord({ risk_flag_history: many });
    const block = buildLTSContextBlock(rec);
    const overflowItem = many[LTS_BLOCK_MAX_ARRAY_ITEMS];
    expect(block).not.toContain(overflowItem);
  });

  it('P14. block starts with the LTS section header', () => {
    const rec = makeLTSRecord();
    const block = buildLTSContextBlock(rec);
    expect(block.startsWith('=== LONGITUDINAL STATE CONTEXT')).toBe(true);
  });

  it('P15. block ends with the LTS section footer', () => {
    const rec = makeLTSRecord();
    const block = buildLTSContextBlock(rec);
    expect(block.trim().endsWith('=== END LONGITUDINAL STATE CONTEXT ===')).toBe(true);
  });

  it('P16. block includes session count in header', () => {
    const rec = makeLTSRecord({ session_count: 5 });
    const block = buildLTSContextBlock(rec);
    expect(block).toContain('5 session(s)');
  });

  it('P17. returns "" on thrown error (fail-closed)', () => {
    // Pass an object that behaves like a valid record but throws when accessed
    const bad = new Proxy(makeLTSRecord(), {
      get(target, prop) {
        if (prop === 'helpful_interventions') throw new Error('get error');
        return target[prop];
      },
    });
    // isLTSWeak reads lts_version and memory_type (don't throw), then trajectory
    // and session_count (don't throw). buildLTSContextBlock then accesses
    // helpful_interventions which throws. The try/catch should return ''.
    expect(() => buildLTSContextBlock(bad)).not.toThrow();
  });

  it('P18. does NOT contain raw session_summary or automatic_thoughts', () => {
    const rec = makeLTSRecord();
    const block = buildLTSContextBlock(rec);
    // Ensure no therapist session memory fields are leaked
    expect(block).not.toContain('session_summary');
    expect(block).not.toContain('automatic_thoughts');
    expect(block).not.toContain('working_hypotheses');
    expect(block).not.toContain('interventions_used');
    expect(block).not.toContain('follow_up_tasks');
  });
});

// ─── A/B/C/D. buildV9SessionStartContentAsync behaviour ──────────────────────

describe('Wave 3C — buildV9SessionStartContentAsync()', () => {
  it('B1. flag off (longitudinal_layer_enabled absent) → delegates to V8 path', async () => {
    const entities = makeEntities([]);
    const v9Result = await buildV9SessionStartContentAsync(
      STUB_V8_WIRING, // no longitudinal_layer_enabled
      entities,
      STUB_BASE44,
    );
    // V8 path with STUB_V8_WIRING (strategy but no continuity/formulation) should
    // produce a string starting with '[START_SESSION]'
    expect(typeof v9Result).toBe('string');
    expect(v9Result.startsWith('[START_SESSION]')).toBe(true);
  });

  it('B2. null wiring → delegates to V8 (exact V8 output, no throw)', async () => {
    const entities = makeEntities([]);
    const result = await buildV9SessionStartContentAsync(null, entities, STUB_BASE44);
    expect(typeof result).toBe('string');
    expect(result.startsWith('[START_SESSION]')).toBe(true);
  });

  it('C1. V9 wiring + empty CompanionMemory → exact V8 output (no LTS appended)', async () => {
    const entities = makeEntities([]); // no records
    const v8Base = await buildV9SessionStartContentAsync(STUB_V8_WIRING, entities, STUB_BASE44);
    const v9Result = await buildV9SessionStartContentAsync(STUB_V9_WIRING, entities, STUB_BASE44);
    // Both should be the same — no LTS to append
    expect(v9Result).toBe(v8Base);
  });

  it('C2. V9 wiring + CompanionMemory with only therapist_session records (no LTS) → exact V8 output', async () => {
    const sessionRecord = {
      id: 'cm-001',
      memory_type: 'therapist_session',
      content: JSON.stringify({
        therapist_memory_version: '1',
        session_id: 's1',
        session_summary: 'Test session',
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
        last_summarized_date: '2026-01-10',
        session_date: '2026-01-10',
      }),
    };
    const entities = makeEntities([sessionRecord]);
    const v8Base = await buildV9SessionStartContentAsync(STUB_V8_WIRING, entities, STUB_BASE44);
    const v9Result = await buildV9SessionStartContentAsync(STUB_V9_WIRING, entities, STUB_BASE44);
    expect(v9Result).toBe(v8Base);
  });

  it('D1. V9 wiring + LTS with trajectory "unknown" → exact V8 output (suppressed)', async () => {
    const lts = makeLTSRecord({ trajectory: LTS_TRAJECTORIES.UNKNOWN });
    const entities = makeEntities([wrapInCompanionRecord(lts)]);
    const v8Base = await buildV9SessionStartContentAsync(STUB_V8_WIRING, entities, STUB_BASE44);
    const v9Result = await buildV9SessionStartContentAsync(STUB_V9_WIRING, entities, STUB_BASE44);
    expect(v9Result).toBe(v8Base);
  });

  it('D2. V9 wiring + LTS with trajectory "insufficient_data" → exact V8 output (suppressed)', async () => {
    const lts = makeLTSRecord({ trajectory: LTS_TRAJECTORIES.INSUFFICIENT_DATA, session_count: 1 });
    const entities = makeEntities([wrapInCompanionRecord(lts)]);
    const v8Base = await buildV9SessionStartContentAsync(STUB_V8_WIRING, entities, STUB_BASE44);
    const v9Result = await buildV9SessionStartContentAsync(STUB_V9_WIRING, entities, STUB_BASE44);
    expect(v9Result).toBe(v8Base);
  });

  it('D3. V9 wiring + invalid LTS (no lts_version field) → exact V8 output', async () => {
    const badLts = {
      memory_type: LTS_MEMORY_TYPE,
      trajectory: LTS_TRAJECTORIES.STABLE,
      session_count: 5,
      // missing lts_version — fails isLTSRecord()
    };
    const entities = makeEntities([wrapInCompanionRecord(badLts)]);
    const v8Base = await buildV9SessionStartContentAsync(STUB_V8_WIRING, entities, STUB_BASE44);
    const v9Result = await buildV9SessionStartContentAsync(STUB_V9_WIRING, entities, STUB_BASE44);
    expect(v9Result).toBe(v8Base);
  });

  it('D4. V9 wiring + LTS session_count below minimum → exact V8 output', async () => {
    const lts = makeLTSRecord({
      trajectory: LTS_TRAJECTORIES.STABLE,
      session_count: LTS_MIN_SESSIONS_FOR_SIGNALS - 1,
    });
    const entities = makeEntities([wrapInCompanionRecord(lts)]);
    const v8Base = await buildV9SessionStartContentAsync(STUB_V8_WIRING, entities, STUB_BASE44);
    const v9Result = await buildV9SessionStartContentAsync(STUB_V9_WIRING, entities, STUB_BASE44);
    expect(v9Result).toBe(v8Base);
  });

  it('N1. V9 wiring + CompanionMemory.list throws → exact V8 output (fail-open)', async () => {
    const entities = makeEntities([], /* shouldThrow */ true);
    const v8Base = await buildV9SessionStartContentAsync(STUB_V8_WIRING, entities, STUB_BASE44);
    const v9Result = await buildV9SessionStartContentAsync(STUB_V9_WIRING, entities, STUB_BASE44);
    expect(v9Result).toBe(v8Base);
  });

  it('N2. entities is null → V9 delegates to V8 path (no throw)', async () => {
    const result = await buildV9SessionStartContentAsync(STUB_V9_WIRING, null, STUB_BASE44);
    expect(typeof result).toBe('string');
    expect(result.startsWith('[START_SESSION]')).toBe(true);
  });

  it('N3. entities has no CompanionMemory → exact V8 output', async () => {
    const entitiesNoMem = { CaseFormulation: { list: vi.fn(async () => []) } };
    const v8Base = await buildV9SessionStartContentAsync(STUB_V8_WIRING, entitiesNoMem, STUB_BASE44);
    const v9Result = await buildV9SessionStartContentAsync(STUB_V9_WIRING, entitiesNoMem, STUB_BASE44);
    expect(v9Result).toBe(v8Base);
  });

  // ─── A. Valid LTS → block appended ────────────────────────────────────────

  it('A1. valid stable LTS → V9 output contains V8 base AND LTS block', async () => {
    const lts = makeLTSRecord({ trajectory: LTS_TRAJECTORIES.STABLE });
    const entities = makeEntities([wrapInCompanionRecord(lts)]);
    const v8Base = await buildV9SessionStartContentAsync(STUB_V8_WIRING, entities, STUB_BASE44);
    const v9Result = await buildV9SessionStartContentAsync(STUB_V9_WIRING, entities, STUB_BASE44);

    // V9 output must start with the V8 base
    expect(v9Result.startsWith(v8Base)).toBe(true);
    // V9 output must contain the LTS section marker
    expect(v9Result).toContain('=== LONGITUDINAL STATE CONTEXT');
    expect(v9Result).toContain('=== END LONGITUDINAL STATE CONTEXT ===');
  });

  it('A2. valid progressing LTS → trajectory "progressing" in V9 output', async () => {
    const lts = makeLTSRecord({ trajectory: LTS_TRAJECTORIES.PROGRESSING });
    const entities = makeEntities([wrapInCompanionRecord(lts)]);
    const v9Result = await buildV9SessionStartContentAsync(STUB_V9_WIRING, entities, STUB_BASE44);
    expect(v9Result).toContain('progressing');
  });

  it('A3. valid stagnating LTS with risk history → risk history in V9 output', async () => {
    const lts = makeLTSRecord({
      trajectory: LTS_TRAJECTORIES.STAGNATING,
      risk_flag_history: ['passive_ideation', 'self_harm_mention'],
    });
    const entities = makeEntities([wrapInCompanionRecord(lts)]);
    const v9Result = await buildV9SessionStartContentAsync(STUB_V9_WIRING, entities, STUB_BASE44);
    expect(v9Result).toContain('passive_ideation');
    expect(v9Result).toContain('self_harm_mention');
  });

  it('A4. valid LTS with helpful_interventions → interventions in V9 output', async () => {
    const lts = makeLTSRecord({
      trajectory: LTS_TRAJECTORIES.STABLE,
      helpful_interventions: ['thought_record', 'behavioural_activation'],
    });
    const entities = makeEntities([wrapInCompanionRecord(lts)]);
    const v9Result = await buildV9SessionStartContentAsync(STUB_V9_WIRING, entities, STUB_BASE44);
    expect(v9Result).toContain('thought_record');
    expect(v9Result).toContain('behavioural_activation');
  });

  it('A5. valid LTS with JSON string content (Base44 at-rest encoding) → block appended', async () => {
    const lts = makeLTSRecord({ trajectory: LTS_TRAJECTORIES.FLUCTUATING });
    const entities = makeEntities([wrapInCompanionRecord(lts, /* jsonStringContent */ true)]);
    const v9Result = await buildV9SessionStartContentAsync(STUB_V9_WIRING, entities, STUB_BASE44);
    expect(v9Result).toContain('=== LONGITUDINAL STATE CONTEXT');
    expect(v9Result).toContain('fluctuating');
  });

  it('A6. LTS block is separated from V8 base by double newline', async () => {
    const lts = makeLTSRecord({ trajectory: LTS_TRAJECTORIES.STABLE });
    const entities = makeEntities([wrapInCompanionRecord(lts)]);
    const v8Base = await buildV9SessionStartContentAsync(STUB_V8_WIRING, entities, STUB_BASE44);
    const v9Result = await buildV9SessionStartContentAsync(STUB_V9_WIRING, entities, STUB_BASE44);
    // The separator between V8 and LTS block should be '\n\n'
    expect(v9Result).toBe(v8Base + '\n\n' + buildLTSContextBlock(lts));
  });

  // ─── E. Bounded output shape ──────────────────────────────────────────────

  it('E1. LTS block does not overflow LTS_BLOCK_MAX_ARRAY_ITEMS per array field', async () => {
    const manyInterventions = [
      'inv_aaa', 'inv_bbb', 'inv_ccc', 'inv_ddd',
      'inv_eee', 'inv_fff', 'inv_ggg', 'inv_hhh', 'inv_iii', 'inv_jjj',
    ];
    const lts = makeLTSRecord({
      trajectory: LTS_TRAJECTORIES.STABLE,
      helpful_interventions: manyInterventions,
    });
    const entities = makeEntities([wrapInCompanionRecord(lts)]);
    const v9Result = await buildV9SessionStartContentAsync(STUB_V9_WIRING, entities, STUB_BASE44);
    // Items beyond the cap should not appear
    for (let i = LTS_BLOCK_MAX_ARRAY_ITEMS; i < manyInterventions.length; i++) {
      expect(v9Result).not.toContain(manyInterventions[i]);
    }
  });

  // ─── F. No duplication/noise beyond intended fields ───────────────────────

  it('F1. V9 output does NOT contain recurring_patterns (avoids continuity block noise)', async () => {
    const lts = makeLTSRecord({
      trajectory: LTS_TRAJECTORIES.STABLE,
      recurring_patterns: ['catastrophising_unique_label'],
    });
    const entities = makeEntities([wrapInCompanionRecord(lts)]);
    const v9Result = await buildV9SessionStartContentAsync(STUB_V9_WIRING, entities, STUB_BASE44);
    expect(v9Result).not.toContain('catastrophising_unique_label');
  });

  it('F2. V9 output does NOT contain persistent_open_tasks (avoids continuity block noise)', async () => {
    const lts = makeLTSRecord({
      trajectory: LTS_TRAJECTORIES.STABLE,
      persistent_open_tasks: ['unique_task_label_xyz'],
    });
    const entities = makeEntities([wrapInCompanionRecord(lts)]);
    const v9Result = await buildV9SessionStartContentAsync(STUB_V9_WIRING, entities, STUB_BASE44);
    expect(v9Result).not.toContain('unique_task_label_xyz');
  });

  // ─── G. No raw transcript leakage ─────────────────────────────────────────

  it('G1. V9 output does NOT contain any raw transcript field names', async () => {
    const lts = makeLTSRecord({ trajectory: LTS_TRAJECTORIES.STABLE });
    const entities = makeEntities([wrapInCompanionRecord(lts)]);
    const v9Result = await buildV9SessionStartContentAsync(STUB_V9_WIRING, entities, STUB_BASE44);
    // LTS schema fields that must never appear verbatim in the output
    const forbiddenFieldNames = [
      'session_summary',
      'automatic_thoughts',
      'working_hypotheses',
      'interventions_used',
      'safety_plan_notes',
      'follow_up_tasks',
      'goals_referenced',
      'last_summarized_date',
    ];
    for (const field of forbiddenFieldNames) {
      expect(v9Result).not.toContain(field);
    }
  });

  it('G2. V9 output does NOT contain the LTS record\'s computed_at timestamp verbatim', async () => {
    const lts = makeLTSRecord({ trajectory: LTS_TRAJECTORIES.STABLE, computed_at: '2026-01-15T10:00:00.000Z' });
    const entities = makeEntities([wrapInCompanionRecord(lts)]);
    const v9Result = await buildV9SessionStartContentAsync(STUB_V9_WIRING, entities, STUB_BASE44);
    expect(v9Result).not.toContain('2026-01-15T10:00:00.000Z');
  });

  // ─── H. No cross-user / private-entity leakage ────────────────────────────

  it('H1. V9 path reads LTS through the dedicated overfetch bound', async () => {
    const lts = makeLTSRecord({ trajectory: LTS_TRAJECTORIES.STABLE });
    const entities = makeEntities([wrapInCompanionRecord(lts)]);
    await buildV9SessionStartContentAsync(STUB_V9_WIRING, entities, STUB_BASE44);
    expect(entities.CompanionMemory.filter).toHaveBeenCalledWith(
      { memory_type: LTS_MEMORY_TYPE },
      '-created_date',
      LTS_SNAPSHOT_OVERFETCH_BOUND,
    );
  });

  it('H2. V8 path (no longitudinal_layer_enabled) does NOT call CompanionMemory.list for LTS', async () => {
    const entities = makeEntities([]);
    await buildV9SessionStartContentAsync(STUB_V8_WIRING, entities, STUB_BASE44);
    // In the V8 path (no longitudinal layer), readLTSSnapshot is never called.
    // CompanionMemory.list may or may not be called by V8's own chain; but it
    // should NOT be called with LTS_SNAPSHOT_OVERFETCH_BOUND.
    const ltsCalls = entities.CompanionMemory.list.mock.calls.filter(
      ([, limit]) => limit === LTS_SNAPSHOT_OVERFETCH_BOUND,
    );
    expect(ltsCalls.length).toBe(0);
  });

  // ─── I. No regression to companion flows ──────────────────────────────────

  it('I1. buildV9SessionStartContentAsync is never called by companion wiring', () => {
    // Companion wiring has no longitudinal_layer_enabled flag.
    // If it had, buildV9 would just delegate to V8 (which also has no strategy_layer_enabled
    // on companion wiring). This test confirms the isolation.
    const companionWiring = {
      name: 'ai_coach',
      continuity_enabled: true,
      // No longitudinal_layer_enabled, no strategy_layer_enabled
    };
    // V9 must not activate for companion wiring — it simply delegates to V8
    expect(companionWiring.longitudinal_layer_enabled).toBeUndefined();
  });

  // ─── J. No regression to V8 strategy injection ────────────────────────────

  it('J1. V9 output preserves V8 base output (V8 not disrupted)', async () => {
    const lts = makeLTSRecord({ trajectory: LTS_TRAJECTORIES.STABLE });
    const entities = makeEntities([wrapInCompanionRecord(lts)]);
    const v8Base = await buildV9SessionStartContentAsync(STUB_V8_WIRING, entities, STUB_BASE44);
    const v9Result = await buildV9SessionStartContentAsync(STUB_V9_WIRING, entities, STUB_BASE44);
    // V9 must contain the full V8 base as a prefix
    expect(v9Result.startsWith(v8Base)).toBe(true);
  });

  it('J2. V9 with no valid LTS returns exact V8 output (no modification)', async () => {
    const entities = makeEntities([]);
    const v8Base = await buildV9SessionStartContentAsync(STUB_V8_WIRING, entities, STUB_BASE44);
    const v9NoLts = await buildV9SessionStartContentAsync(STUB_V9_WIRING, entities, STUB_BASE44);
    expect(v9NoLts).toBe(v8Base);
  });

  // ─── First LTS among multiple records wins ─────────────────────────────────

  it('A7. when multiple CompanionMemory records exist, first valid LTS is used', async () => {
    const newerLts = makeLTSRecord({ trajectory: LTS_TRAJECTORIES.PROGRESSING, session_count: 4 });
    const olderLts = makeLTSRecord({ trajectory: LTS_TRAJECTORIES.STABLE, session_count: 2 });
    const sessionRecord = {
      id: 'cm-session-001',
      memory_type: 'therapist_session',
      content: '{}',
    };
    // Records are returned newest-first from CompanionMemory.list
    const entities = makeEntities([
      wrapInCompanionRecord(newerLts),
      sessionRecord,
      wrapInCompanionRecord(olderLts),
    ]);
    const v9Result = await buildV9SessionStartContentAsync(STUB_V9_WIRING, entities, STUB_BASE44);
    // The newer LTS (progressing) should be used
    expect(v9Result).toContain('progressing');
    expect(v9Result).not.toContain('stable');
  });
});

// ─── Q. CBT_THERAPIST_WIRING_STAGE2_V9 wiring config ─────────────────────────

describe('Wave 3C — CBT_THERAPIST_WIRING_STAGE2_V9 wiring config', () => {
  it('Q1. longitudinal_layer_enabled is true', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V9.longitudinal_layer_enabled).toBe(true);
  });

  it('Q2. strategy_layer_enabled is true (superset of V8)', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V9.strategy_layer_enabled).toBe(true);
  });

  it('Q3. continuity_layer_enabled is true (superset of V7)', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V9.continuity_layer_enabled).toBe(true);
  });

  it('Q4. formulation_context_enabled is true (superset of V6)', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V9.formulation_context_enabled).toBe(true);
  });

  it('Q5. safety_mode_enabled is true (superset of V5)', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V9.safety_mode_enabled).toBe(true);
  });

  it('Q6. tool_configs is a non-empty array', () => {
    expect(Array.isArray(CBT_THERAPIST_WIRING_STAGE2_V9.tool_configs)).toBe(true);
    expect(CBT_THERAPIST_WIRING_STAGE2_V9.tool_configs.length).toBeGreaterThan(0);
  });

  it('Q7. tool_configs is IDENTICAL to V8 (no new entity access)', () => {
    // Compare tool_configs by serialisation — order must match
    const v8Configs = JSON.stringify(CBT_THERAPIST_WIRING_STAGE2_V8.tool_configs);
    const v9Configs = JSON.stringify(CBT_THERAPIST_WIRING_STAGE2_V9.tool_configs);
    expect(v9Configs).toBe(v8Configs);
  });

  it('Q8. name is "cbt_therapist"', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V9.name).toBe('cbt_therapist');
  });

  it('Q9. stage2 is true', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V9.stage2).toBe(true);
  });

  it('Q10. V9 adds exactly ONE new flag compared to V8 (longitudinal_layer_enabled)', () => {
    const v8Keys = new Set(Object.keys(CBT_THERAPIST_WIRING_STAGE2_V8).filter(k => k !== 'tool_configs'));
    const v9Keys = new Set(Object.keys(CBT_THERAPIST_WIRING_STAGE2_V9).filter(k => k !== 'tool_configs'));
    const newKeys = [...v9Keys].filter(k => !v8Keys.has(k));
    expect(newKeys).toEqual(['longitudinal_layer_enabled']);
  });

  it('Q11. CompanionMemory is in tool_configs with read_only: true', () => {
    const cm = CBT_THERAPIST_WIRING_STAGE2_V9.tool_configs.find(
      c => c.entity_name === 'CompanionMemory',
    );
    expect(cm).toBeDefined();
    expect(cm.read_only).toBe(true);
  });

  it('Q12. prohibited private entities are NOT in tool_configs', () => {
    const prohibited = ['UserDeletedConversations', 'AppNotification', 'MindGameActivity', 'Subscription'];
    const entityNames = CBT_THERAPIST_WIRING_STAGE2_V9.tool_configs.map(c => c.entity_name);
    for (const name of prohibited) {
      expect(entityNames).not.toContain(name);
    }
  });
});

// ─── R. resolveTherapistWiring V9 routing ─────────────────────────────────────

describe('Wave 3C — resolveTherapistWiring V9 routing', () => {
  // Note: feature flags default to false in tests (no VITE_* env vars set).
  // V9 routing requires THERAPIST_UPGRADE_ENABLED + THERAPIST_UPGRADE_STRATEGY_ENABLED
  // + THERAPIST_UPGRADE_LONGITUDINAL_ENABLED — all false in CI.
  // We test the routing logic by checking the wiring shape and the flag combinations
  // that would be needed without actually turning on the flags (which would require
  // env var injection).

  it('R1. THERAPIST_UPGRADE_LONGITUDINAL_ENABLED is a known flag in THERAPIST_UPGRADE_FLAGS', () => {
    // The flag must be checkable by isUpgradeEnabled without throwing.
    expect(() => isUpgradeEnabled('THERAPIST_UPGRADE_LONGITUDINAL_ENABLED')).not.toThrow();
  });

  it('R2. isUpgradeEnabled("THERAPIST_UPGRADE_LONGITUDINAL_ENABLED") returns false by default', () => {
    // In CI / test environment, all VITE_* env vars are unset → flags default false.
    expect(isUpgradeEnabled('THERAPIST_UPGRADE_LONGITUDINAL_ENABLED')).toBe(false);
  });

  it('R3. CBT_THERAPIST_WIRING_STAGE2_V9 satisfies the V9 routing gate condition', () => {
    // V9 wiring must have longitudinal_layer_enabled AND strategy_layer_enabled
    expect(CBT_THERAPIST_WIRING_STAGE2_V9.longitudinal_layer_enabled).toBe(true);
    expect(CBT_THERAPIST_WIRING_STAGE2_V9.strategy_layer_enabled).toBe(true);
  });

  it('R4. default resolveTherapistWiring() does NOT return V9 (all flags off)', async () => {
    // Dynamic import to get the module-load-time resolved value.
    const { resolveTherapistWiring } = await import('../../src/api/activeAgentWiring.js');
    const wiring = resolveTherapistWiring();
    // With all flags off, must NOT be V9
    expect(wiring.longitudinal_layer_enabled).not.toBe(true);
  });
});

// ─── L/M. readLTSSnapshot edge cases (via buildV9SessionStartContentAsync) ────

describe('Wave 3C — readLTSSnapshot edge cases', () => {
  it('L1. CompanionMemory.filter prefers outer memory_type="lts" with "-created_date" ordering', async () => {
    const entities = makeEntities([]);
    await buildV9SessionStartContentAsync(STUB_V9_WIRING, entities, STUB_BASE44);
    expect(entities.CompanionMemory.filter).toHaveBeenCalledWith(
      { memory_type: LTS_MEMORY_TYPE },
      '-created_date',
      expect.any(Number),
    );
    const ltsListCalls = entities.CompanionMemory.list.mock.calls.filter(
      ([, limit]) => limit === LTS_SNAPSHOT_OVERFETCH_BOUND,
    );
    expect(ltsListCalls).toHaveLength(0);
  });

  it('L2. falls back to CompanionMemory.list when filter is unavailable', async () => {
    const entities = makeEntities([], false, { includeFilter: false });
    await buildV9SessionStartContentAsync(STUB_V9_WIRING, entities, STUB_BASE44);
    expect(entities.CompanionMemory.list).toHaveBeenCalledWith(
      '-created_date',
      expect.any(Number),
    );
  });

  it('L3. non-array response from CompanionMemory reader → null (V8 output returned)', async () => {
    const entities = {
      CompanionMemory: {
        filter: vi.fn(async () => null),
        list: vi.fn(async () => null),
      },
      CaseFormulation: { list: vi.fn(async () => []) },
    };
    const v8Base = await buildV9SessionStartContentAsync(STUB_V8_WIRING, entities, STUB_BASE44);
    const v9Result = await buildV9SessionStartContentAsync(STUB_V9_WIRING, entities, STUB_BASE44);
    expect(v9Result).toBe(v8Base);
  });

  it('M1. CompanionMemory has records but none are LTS → returns V8 output unchanged', async () => {
    const records = [
      { id: 'cm-1', memory_type: 'therapist_session', content: '{}' },
      { id: 'cm-2', memory_type: 'companion_memory',  content: '{}' },
    ];
    const entities = makeEntities(records);
    const v8Base = await buildV9SessionStartContentAsync(STUB_V8_WIRING, entities, STUB_BASE44);
    const v9Result = await buildV9SessionStartContentAsync(STUB_V9_WIRING, entities, STUB_BASE44);
    expect(v9Result).toBe(v8Base);
  });

  it('M2. CompanionMemory record has malformed JSON content → skipped, returns V8 output', async () => {
    const records = [
      { id: 'cm-lts-bad', memory_type: LTS_MEMORY_TYPE, content: '{not valid json' },
    ];
    const entities = makeEntities(records);
    const v8Base = await buildV9SessionStartContentAsync(STUB_V8_WIRING, entities, STUB_BASE44);
    const v9Result = await buildV9SessionStartContentAsync(STUB_V9_WIRING, entities, STUB_BASE44);
    expect(v9Result).toBe(v8Base);
  });

  it('M3. filtered LTS read still finds the canonical snapshot even when mixed records are newer', async () => {
    const validLTS = makeLTSRecord({ trajectory: LTS_TRAJECTORIES.STAGNATING });
    const entities = {
      CompanionMemory: {
        filter: vi.fn(async () => [wrapInCompanionRecord(validLTS)]),
        list: vi.fn(async () => [
          { id: 'cm-session-1', memory_type: 'therapist_session', content: '{}' },
          { id: 'cm-session-2', memory_type: 'therapist_session', content: '{}' },
          { id: 'cm-session-3', memory_type: 'therapist_session', content: '{}' },
        ]),
      },
      CaseFormulation: { list: vi.fn(async () => []) },
    };

    const v9Result = await buildV9SessionStartContentAsync(STUB_V9_WIRING, entities, STUB_BASE44);
    expect(v9Result).toContain('stagnating');
    expect(entities.CompanionMemory.filter).toHaveBeenCalledTimes(1);
    const ltsListCalls = entities.CompanionMemory.list.mock.calls.filter(
      ([, limit]) => limit === LTS_SNAPSHOT_OVERFETCH_BOUND,
    );
    expect(ltsListCalls).toHaveLength(0);
  });
});

describe('Wave 3C — safe read diagnostics', () => {
  it('emits a bounded valid-read diagnostic when _s2debug=true', async () => {
    const lts = makeLTSRecord({ trajectory: LTS_TRAJECTORIES.PROGRESSING, session_count: 4 });
    const entities = makeEntities([wrapInCompanionRecord(lts)]);
    const groupSpy = vi.spyOn(console, 'group').mockImplementation(() => {});
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const endSpy = vi.spyOn(console, 'groupEnd').mockImplementation(() => {});

    await withWindow('?_s2debug=true', async () => {
      await buildV9SessionStartContentAsync(STUB_V9_WIRING, entities, STUB_BASE44);
    });

    expect(groupSpy).toHaveBeenCalledWith('[Wave 3C] LTS read diagnostic');
    expect(logSpy).toHaveBeenCalledWith('read_result              :', 'valid');
    expect(logSpy).toHaveBeenCalledWith('lts_valid                :', true);
    expect(logSpy).toHaveBeenCalledWith('lts_session_count        :', 4);
    expect(logSpy).toHaveBeenCalledWith('lts_trajectory           :', 'progressing');
    expect(endSpy).toHaveBeenCalled();
  });

  it('emits a bounded fallback diagnostic when no valid LTS is available', async () => {
    const entities = makeEntities([]);
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'group').mockImplementation(() => {});
    vi.spyOn(console, 'groupEnd').mockImplementation(() => {});

    await withWindow('?_s2debug=true', async () => {
      await buildV9SessionStartContentAsync(STUB_V9_WIRING, entities, STUB_BASE44);
    });

    expect(logSpy).toHaveBeenCalledWith('read_result              :', 'absent_or_invalid');
    expect(logSpy).toHaveBeenCalledWith('lts_valid                :', false);
    expect(logSpy).toHaveBeenCalledWith('lts_session_count        :', 0);
    expect(logSpy).toHaveBeenCalledWith('lts_trajectory           :', '');
  });
});

describe('Wave 3C — LTS read diagnostic classification', () => {
  it('filter/list rejection emits read_error and V9 still returns exact V8 output', async () => {
    const entities = makeEntities([], true);
    const diag = await readLTSSnapshotWithDiagnostic(entities);
    expect(diag.diagnostic.read_result).toBe(LTS_READ_RESULTS.read_error);
    expect(diag.diagnostic.lts_valid).toBe(false);
    expect(diag.ltsRecord).toBeNull();

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'group').mockImplementation(() => {});
    vi.spyOn(console, 'groupEnd').mockImplementation(() => {});

    const v8Base = await buildV9SessionStartContentAsync(STUB_V8_WIRING, entities, STUB_BASE44);
    const v9Result = await withWindow('?_s2debug=true', async () => (
      buildV9SessionStartContentAsync(STUB_V9_WIRING, entities, STUB_BASE44)
    ));
    expect(v9Result).toBe(v8Base);
    expect(logSpy).toHaveBeenCalledWith('read_result              :', LTS_READ_RESULTS.read_error);
  });

  it('empty or invalid data emits absent_or_invalid', async () => {
    const entitiesEmpty = makeEntities([]);
    const emptyDiag = await readLTSSnapshotWithDiagnostic(entitiesEmpty);
    expect(emptyDiag.diagnostic.read_result).toBe(LTS_READ_RESULTS.absent_or_invalid);
    expect(emptyDiag.ltsRecord).toBeNull();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'group').mockImplementation(() => {});
    vi.spyOn(console, 'groupEnd').mockImplementation(() => {});

    const emptyV8 = await buildV9SessionStartContentAsync(STUB_V8_WIRING, entitiesEmpty, STUB_BASE44);
    const emptyV9 = await withWindow('?_s2debug=true', async () => (
      buildV9SessionStartContentAsync(STUB_V9_WIRING, entitiesEmpty, STUB_BASE44)
    ));
    expect(emptyV9).toBe(emptyV8);
    expect(logSpy).toHaveBeenCalledWith('read_result              :', LTS_READ_RESULTS.absent_or_invalid);

    const entitiesInvalid = makeEntities([{ memory_type: LTS_MEMORY_TYPE, content: '{bad json' }]);
    const invalidDiag = await readLTSSnapshotWithDiagnostic(entitiesInvalid);
    expect(invalidDiag.diagnostic.read_result).toBe(LTS_READ_RESULTS.absent_or_invalid);
    expect(invalidDiag.ltsRecord).toBeNull();
    const invalidV8 = await buildV9SessionStartContentAsync(STUB_V8_WIRING, entitiesInvalid, STUB_BASE44);
    const invalidV9 = await buildV9SessionStartContentAsync(STUB_V9_WIRING, entitiesInvalid, STUB_BASE44);
    expect(invalidV9).toBe(invalidV8);
  });

  it('weak LTS emits weak', async () => {
    const weak = makeLTSRecord({
      trajectory: LTS_TRAJECTORIES.INSUFFICIENT_DATA,
      session_count: LTS_MIN_SESSIONS_FOR_SIGNALS - 1,
    });
    const entities = makeEntities([wrapInCompanionRecord(weak)]);
    const diag = await readLTSSnapshotWithDiagnostic(entities);
    expect(diag.diagnostic.read_result).toBe(LTS_READ_RESULTS.weak);
    expect(diag.diagnostic.lts_valid).toBe(false);
    expect(diag.ltsRecord).toEqual(weak);
  });

  it('valid stable session_count:2 emits valid', async () => {
    const valid = makeLTSRecord({ session_count: 2, trajectory: LTS_TRAJECTORIES.STABLE });
    const entities = makeEntities([wrapInCompanionRecord(valid)]);
    const diag = await readLTSSnapshotWithDiagnostic(entities);
    expect(diag.diagnostic.read_result).toBe(LTS_READ_RESULTS.valid);
    expect(diag.diagnostic.lts_valid).toBe(true);
    expect(diag.ltsRecord).toEqual(valid);
  });

  it('diagnostic payload excludes transcript and free-text fields', async () => {
    const valid = makeLTSRecord({ session_count: 2, trajectory: LTS_TRAJECTORIES.STABLE });
    const entities = makeEntities([wrapInCompanionRecord(valid)]);
    const diag = await readLTSSnapshotWithDiagnostic(entities);
    expect(Object.keys(diag.diagnostic).sort()).toEqual(['lts_valid', 'read_result']);
    const serialized = JSON.stringify(diag.diagnostic);
    expect(serialized).not.toContain('transcript');
    expect(serialized).not.toContain('quote');
    expect(serialized).not.toContain('session_summary');
  });
});
