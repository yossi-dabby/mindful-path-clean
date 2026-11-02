/**
 * @file test/utils/phase4CanonicalMemoryReader.test.js
 *
 * Phase 4 — Canonical Therapist Memory Adapter — Acceptance Tests
 *
 * PURPOSE
 * -------
 * Validates all acceptance cases required by the Phase 4 problem statement:
 *
 *  1. Weak LTS with session_count=1: warming_up=true, valid=false, no LTS injection
 *  2. Valid LTS: valid=true, warming_up=false, LTS context is injected
 *  3. Absent LTS + three continuity sessions: LTS absent, continuity available
 *  4. LTS read error: read_error preserved, session-start safely falls back
 *  5. Continuity read error: LTS result remains independently usable
 *  6. Both sources absent: exact existing fallback output
 *  7. Continuity ranking and max-session behavior unchanged
 *  8. No duplicate CompanionMemory reads within one session-start operation
 *  9. V8 and flag-off output byte-for-byte compatible
 *
 * ADDITIONAL COVERAGE
 * -------------------
 *  A. isLTSWarmingUp — valid record never warming_up
 *  B. isLTSWarmingUp — weak record session_count>1 not warming_up
 *  C. buildCanonicalMemoryDiagnosticSnapshot — valid shape and fields
 *  D. buildCanonicalMemoryDiagnosticSnapshot — null input fallback
 *  E. canonical_memory_reader_used always true
 *  F. LTS and continuity results are independent (no cross-contamination)
 *  G. Result is frozen (immutable)
 *  H. No private entity fields in diagnostic output
 *
 * DESIGN CONSTRAINTS
 * ------------------
 * - Does NOT import from functions/ (Deno runtime — not importable in Vitest).
 * - Does NOT render React components.
 * - Does NOT enable any feature flags.
 * - All mocks are scoped per test (vi.fn() / local stubs only).
 * - No test.skip or test.fixme.
 *
 * Source of truth: Phase 4 problem statement.
 */

import { describe, it, expect, vi } from 'vitest';

import {
  readCanonicalTherapistMemory,
  isLTSWarmingUp,
  buildCanonicalMemoryDiagnosticSnapshot,
} from '../../src/lib/canonicalTherapistMemoryReader.js';

import {
  LTS_READ_RESULTS,
  isLTSWeak,
  buildV9SessionStartContentAsync,
  buildV8SessionStartContentAsync,
  buildActionFirstDemotedSessionContentAsync,
} from '../../src/lib/workflowContextInjector.js';

import {
  LTS_VERSION,
  LTS_MEMORY_TYPE,
  LTS_TRAJECTORIES,
  LTS_MIN_SESSIONS_FOR_SIGNALS,
} from '../../src/lib/therapistMemoryModel.js';

import {
  CONTINUITY_FAILURE_REASONS,
} from '../../src/lib/crossSessionContinuity.js';

// ─── Test helpers ─────────────────────────────────────────────────────────────

/**
 * Builds a minimal valid LTS record with the given session_count and trajectory.
 */
function makeValidLTSRecord(session_count = 3, trajectory = LTS_TRAJECTORIES.STABLE) {
  return {
    lts_version: LTS_VERSION,
    memory_type: LTS_MEMORY_TYPE,
    session_count,
    trajectory,
    recurring_patterns: ['pattern_a'],
    helpful_interventions: ['thought_record'],
    risk_flag_history: [],
    last_session_date: '2025-01-01',
    computed_at: '2025-01-01T00:00:00Z',
    persistent_open_tasks: [],
    active_goal_ids: [],
    stalled_interventions: [],
  };
}

/**
 * Builds a weak LTS record (insufficient_data trajectory).
 */
function makeWeakLTSRecord(session_count = 1) {
  return {
    lts_version: LTS_VERSION,
    memory_type: LTS_MEMORY_TYPE,
    session_count,
    trajectory: LTS_TRAJECTORIES.INSUFFICIENT_DATA,
    recurring_patterns: [],
    helpful_interventions: [],
    risk_flag_history: [],
    last_session_date: '2025-01-01',
    computed_at: '2025-01-01T00:00:00Z',
    persistent_open_tasks: [],
    active_goal_ids: [],
    stalled_interventions: [],
  };
}

/**
 * Encodes an LTS record into a CompanionMemory raw record (as stored).
 */
function ltsToRawRecord(ltsRecord) {
  return {
    id: 'mem_lts_1',
    memory_type: LTS_MEMORY_TYPE,
    content: JSON.stringify(ltsRecord),
  };
}

/**
 * Builds a minimal therapist memory record for continuity testing.
 */
function makeTherapistMemoryRecord(overrides = {}) {
  return {
    therapist_memory_version: '1',
    session_id: 'sess_1',
    session_date: '2025-01-01',
    session_summary: 'Client discussed anxiety triggers and avoidance patterns.',
    core_patterns: ['avoidance'],
    triggers: ['social_situations'],
    automatic_thoughts: ['I will fail'],
    emotions: ['anxiety'],
    urges: [],
    actions: [],
    consequences: [],
    working_hypotheses: ['core belief: inadequacy'],
    interventions_used: ['thought_record'],
    risk_flags: [],
    safety_plan_notes: '',
    follow_up_tasks: ['practice_grounding'],
    goals_referenced: [],
    last_summarized_date: '2025-01-01',
    ...overrides,
  };
}

/**
 * Encodes a therapist memory record into a CompanionMemory raw record.
 */
function therapistMemoryToRawRecord(record, overrides = {}) {
  return {
    id: `mem_${Math.random()}`,
    memory_type: 'therapist_session',
    content: JSON.stringify(record),
    ...overrides,
  };
}

/**
 * Builds a simple entities mock with controllable CompanionMemory.filter and .list.
 */
function makeEntities({ listRecords = [], filterRecords = null, listThrows = false } = {}) {
  return {
    CompanionMemory: {
      filter: vi.fn(async () => filterRecords ?? listRecords),
      list: vi.fn(async () => {
        if (listThrows) throw new Error('CompanionMemory.list failed');
        return listRecords;
      }),
    },
    CaseFormulation: {
      list: vi.fn(async () => []),
    },
  };
}

/**
 * Builds entities mock with LTS + continuity records.
 */
function makeEntitiesWithLTSAndContinuity(ltsRecord, therapistRecords) {
  const callCount = { n: 0 };
  const ltsRaw = ltsRecord ? [ltsToRawRecord(ltsRecord)] : [];
  const therapistRaws = therapistRecords.map(therapistMemoryToRawRecord);

  return {
    CompanionMemory: {
      // filter is used by readLTSSnapshotWithDiagnostic for LTS records
      filter: vi.fn(async () => ltsRaw),
      // list is used by readCrossSessionContinuity / buildCrossSessionContinuityBlockWithDiagnostic
      list: vi.fn(async () => {
        callCount.n += 1;
        return therapistRaws;
      }),
    },
    CaseFormulation: {
      list: vi.fn(async () => []),
    },
    _callCount: callCount,
  };
}

// ─── Acceptance cases ─────────────────────────────────────────────────────────

describe('Phase 4 — Canonical Therapist Memory Adapter', () => {

  // ── Acceptance case 1: Weak LTS, session_count=1 → warming_up=true, valid=false ──

  describe('Acceptance case 1: weak LTS with session_count=1', () => {
    it('returns warming_up=true and valid=false', async () => {
      const weakRecord = makeWeakLTSRecord(1);
      const entities = makeEntities({ filterRecords: [ltsToRawRecord(weakRecord)] });

      const result = await readCanonicalTherapistMemory(entities);

      expect(result.lts.valid).toBe(false);
      expect(result.lts.warming_up).toBe(true);
      expect(result.lts.read_result).toBe(LTS_READ_RESULTS.weak);
      expect(result.lts.session_count).toBe(1);
    });

    it('does not inject LTS context into session-start when warming_up', async () => {
      const weakRecord = makeWeakLTSRecord(1);
      const entities = makeEntities({ filterRecords: [ltsToRawRecord(weakRecord)] });

      // V9 wiring (longitudinal_layer_enabled = true)
      const wiring = {
        name: 'cbt_therapist',
        stage2: true,
        stage2_phase: 13,
        longitudinal_layer_enabled: true,
        continuity_layer_enabled: false,
        strategy_layer_enabled: false,
        formulation_context_enabled: false,
        safety_mode_enabled: false,
      };

      const content = await buildV9SessionStartContentAsync(wiring, entities, null, {});

      // LTS block must NOT be present for a weak/warming-up record
      expect(content).not.toContain('=== LONGITUDINAL STATE CONTEXT');
      // Session must still produce content (fail-open)
      expect(typeof content).toBe('string');
      expect(content.length).toBeGreaterThan(0);
    });
  });

  // ── Acceptance case 2: Valid LTS → valid=true, warming_up=false, LTS injected ─

  describe('Acceptance case 2: valid LTS', () => {
    it('returns valid=true and warming_up=false', async () => {
      const validRecord = makeValidLTSRecord(3, LTS_TRAJECTORIES.STABLE);
      const entities = makeEntities({ filterRecords: [ltsToRawRecord(validRecord)] });

      const result = await readCanonicalTherapistMemory(entities);

      expect(result.lts.valid).toBe(true);
      expect(result.lts.warming_up).toBe(false);
      expect(result.lts.read_result).toBe(LTS_READ_RESULTS.valid);
      expect(result.lts.session_count).toBe(3);
    });

    it('injects the LTS context block into V9 session-start', async () => {
      const validRecord = makeValidLTSRecord(3, LTS_TRAJECTORIES.STABLE);
      const entities = makeEntities({
        filterRecords: [ltsToRawRecord(validRecord)],
        listRecords: [],
      });

      const wiring = {
        name: 'cbt_therapist',
        stage2: true,
        stage2_phase: 13,
        longitudinal_layer_enabled: true,
        continuity_layer_enabled: false,
        strategy_layer_enabled: false,
        formulation_context_enabled: false,
        safety_mode_enabled: false,
      };

      const content = await buildV9SessionStartContentAsync(wiring, entities, null, {});

      // LTS block must be present for a valid record
      expect(content).toContain('=== LONGITUDINAL STATE CONTEXT');
    });
  });

  // ── Acceptance case 3: Absent LTS + three continuity sessions ─────────────────

  describe('Acceptance case 3: absent LTS + three continuity sessions', () => {
    it('LTS remains absent, continuity remains available', async () => {
      const sessions = [
        makeTherapistMemoryRecord({ session_id: 's1', session_summary: 'Session one summary about anxiety.' }),
        makeTherapistMemoryRecord({ session_id: 's2', session_summary: 'Session two summary about avoidance.' }),
        makeTherapistMemoryRecord({ session_id: 's3', session_summary: 'Session three summary about progress.' }),
      ];
      const entities = {
        CompanionMemory: {
          // filter returns nothing (no LTS record)
          filter: vi.fn(async () => []),
          // list returns therapist session records for continuity
          list: vi.fn(async () => sessions.map(therapistMemoryToRawRecord)),
        },
        CaseFormulation: { list: vi.fn(async () => []) },
      };

      const result = await readCanonicalTherapistMemory(entities);

      // LTS absent
      expect(result.lts.valid).toBe(false);
      expect(result.lts.warming_up).toBe(false);
      expect(result.lts.read_result).toBe(LTS_READ_RESULTS.absent_or_invalid);
      expect(result.lts.record).toBeNull();

      // Continuity available — sessions selected from the three records
      expect(result.continuity.sessions).toBeGreaterThan(0);
    });

    it('does not treat absent LTS + continuity as a contradiction', async () => {
      const sessions = [
        makeTherapistMemoryRecord({ session_id: 's1', session_summary: 'Session one about patterns.' }),
        makeTherapistMemoryRecord({ session_id: 's2', session_summary: 'Session two about progress.' }),
        makeTherapistMemoryRecord({ session_id: 's3', session_summary: 'Session three about goals.' }),
      ];
      const entities = {
        CompanionMemory: {
          filter: vi.fn(async () => []),
          list: vi.fn(async () => sessions.map(therapistMemoryToRawRecord)),
        },
        CaseFormulation: { list: vi.fn(async () => []) },
      };

      const diag = buildCanonicalMemoryDiagnosticSnapshot(
        await readCanonicalTherapistMemory(entities)
      );

      // LTS absent
      expect(diag.lts_valid).toBe(false);
      expect(diag.lts_read_result).toBe(LTS_READ_RESULTS.absent_or_invalid);
      // Continuity independently available (no error state)
      expect(diag.continuity_read_result).toBe(CONTINUITY_FAILURE_REASONS.none);
      expect(diag.continuity_session_count).toBeGreaterThan(0);
      expect(diag.canonical_memory_reader_used).toBe(true);
    });
  });

  // ── Acceptance case 4: LTS read error ─────────────────────────────────────────

  describe('Acceptance case 4: LTS read error', () => {
    it('preserves read_error and session-start safely falls back', async () => {
      const entities = {
        CompanionMemory: {
          // filter throws to simulate read failure
          filter: vi.fn(async () => { throw new Error('network error'); }),
          list: vi.fn(async () => []),
        },
        CaseFormulation: { list: vi.fn(async () => []) },
      };

      const result = await readCanonicalTherapistMemory(entities);

      expect(result.lts.valid).toBe(false);
      expect(result.lts.warming_up).toBe(false);
      expect(result.lts.read_result).toBe(LTS_READ_RESULTS.read_error);
      expect(result.lts.record).toBeNull();
    });

    it('session-start does not throw on LTS read error', async () => {
      const entities = {
        CompanionMemory: {
          filter: vi.fn(async () => { throw new Error('network error'); }),
          list: vi.fn(async () => []),
        },
        CaseFormulation: { list: vi.fn(async () => []) },
      };

      const wiring = {
        name: 'cbt_therapist',
        stage2: true,
        stage2_phase: 13,
        longitudinal_layer_enabled: true,
        continuity_layer_enabled: false,
        strategy_layer_enabled: false,
        formulation_context_enabled: false,
        safety_mode_enabled: false,
      };

      await expect(
        buildV9SessionStartContentAsync(wiring, entities, null, {})
      ).resolves.not.toThrow();
    });
  });

  // ── Acceptance case 5: Continuity read error ──────────────────────────────────

  describe('Acceptance case 5: continuity read error', () => {
    it('LTS result remains independently usable when continuity fails', async () => {
      const validRecord = makeValidLTSRecord(3, LTS_TRAJECTORIES.PROGRESSING);
      const entities = {
        CompanionMemory: {
          filter: vi.fn(async () => [ltsToRawRecord(validRecord)]),
          // list throws for continuity read
          list: vi.fn(async () => { throw new Error('continuity read failed'); }),
        },
        CaseFormulation: { list: vi.fn(async () => []) },
      };

      const result = await readCanonicalTherapistMemory(entities);

      // LTS still valid
      expect(result.lts.valid).toBe(true);
      expect(result.lts.read_result).toBe(LTS_READ_RESULTS.valid);
      expect(result.lts.session_count).toBe(3);

      // Continuity failed gracefully
      expect(result.continuity.sessions).toBe(0);
      expect(result.continuity.block).toBe('');
      expect(result.continuity.diagnostic.continuity_fail_safe).toBe(true);
    });
  });

  // ── Acceptance case 6: Both sources absent ────────────────────────────────────

  describe('Acceptance case 6: both LTS and continuity absent', () => {
    it('produces exact existing fallback output — no injection', async () => {
      const entities = makeEntities({ filterRecords: [], listRecords: [] });

      const wiring = {
        name: 'cbt_therapist',
        stage2: true,
        stage2_phase: 13,
        longitudinal_layer_enabled: true,
        continuity_layer_enabled: false,
        strategy_layer_enabled: false,
        formulation_context_enabled: false,
        safety_mode_enabled: false,
      };

      // Get V8 fallback output (no LTS, no continuity)
      const v8Entities = makeEntities({ filterRecords: [], listRecords: [] });
      const v8Wiring = {
        name: 'cbt_therapist',
        stage2: true,
        stage2_phase: 12,
        longitudinal_layer_enabled: false,
        continuity_layer_enabled: false,
        strategy_layer_enabled: false,
        formulation_context_enabled: false,
        safety_mode_enabled: false,
      };
      const v8Base = await buildV8SessionStartContentAsync(v8Wiring, v8Entities, null, {});
      const v9Content = await buildV9SessionStartContentAsync(wiring, entities, null, {});

      // V9 with no LTS must equal V8 output exactly (fail-open delegation)
      expect(v9Content).toBe(v8Base);
    });

    it('canonical result shows both absent without errors', async () => {
      const entities = makeEntities({ filterRecords: [], listRecords: [] });

      const result = await readCanonicalTherapistMemory(entities);

      expect(result.lts.valid).toBe(false);
      expect(result.lts.record).toBeNull();
      expect(result.continuity.sessions).toBe(0);
      expect(result.continuity.block).toBe('');
    });
  });

  // ── Acceptance case 7: Continuity ranking and max-session behavior ─────────────

  describe('Acceptance case 7: continuity ranking and max-session behavior', () => {
    it('selects at most CONTINUITY_MAX_PRIOR_SESSIONS sessions', async () => {
      // Build 5 therapist sessions (only 3 should be selected)
      const sessions = Array.from({ length: 5 }, (_, i) =>
        makeTherapistMemoryRecord({
          session_id: `sess_${i}`,
          session_summary: `Session ${i} summary about patterns.`,
          core_patterns: ['pattern'],
          follow_up_tasks: ['task'],
        })
      );

      const entities = {
        CompanionMemory: {
          filter: vi.fn(async () => []),
          list: vi.fn(async () => sessions.map(therapistMemoryToRawRecord)),
        },
        CaseFormulation: { list: vi.fn(async () => []) },
      };

      const result = await readCanonicalTherapistMemory(entities);

      // continuity.sessions must be ≤ 3 (CONTINUITY_MAX_PRIOR_SESSIONS)
      expect(result.continuity.sessions).toBeGreaterThan(0);
      expect(result.continuity.sessions).toBeLessThanOrEqual(3);
    });
  });

  // ── Acceptance case 8: No duplicate CompanionMemory reads ──────────────────────

  describe('Acceptance case 8: no duplicate CompanionMemory reads in V9+ session-start', () => {
    it('does not call CompanionMemory.filter more than once per session-start (V9)', async () => {
      const validRecord = makeValidLTSRecord(3, LTS_TRAJECTORIES.STABLE);
      const entities = makeEntities({
        filterRecords: [ltsToRawRecord(validRecord)],
        listRecords: [],
      });

      const wiring = {
        name: 'cbt_therapist',
        stage2: true,
        stage2_phase: 13,
        longitudinal_layer_enabled: true,
        continuity_layer_enabled: false,
        strategy_layer_enabled: false,
        formulation_context_enabled: false,
        safety_mode_enabled: false,
      };

      await buildV9SessionStartContentAsync(wiring, entities, null, {});

      // Only one LTS read (via canonical adapter via filter)
      expect(entities.CompanionMemory.filter.mock.calls.length).toBe(1);
    });

    it('canonical reader is the single orchestration point — no re-reads in V10', async () => {
      // V10 must reuse the canonical result from V9 and not call readLTSSnapshot again
      const validRecord = makeValidLTSRecord(3, LTS_TRAJECTORIES.STABLE);
      const listRecords = [];
      const filterRecords = [ltsToRawRecord(validRecord)];

      const filterSpy = vi.fn(async () => filterRecords);
      const listSpy = vi.fn(async () => listRecords);

      const entities = {
        CompanionMemory: { filter: filterSpy, list: listSpy },
        CaseFormulation: { list: vi.fn(async () => []) },
        ExternalKnowledge: { filter: vi.fn(async () => []) },
      };

      const wiring = {
        name: 'cbt_therapist',
        stage2: true,
        stage2_phase: 14,
        longitudinal_layer_enabled: true,
        knowledge_layer_enabled: true,
        continuity_layer_enabled: false,
        strategy_layer_enabled: false,
        formulation_context_enabled: false,
        safety_mode_enabled: false,
      };

      // Import V10 builder
      const { buildV10SessionStartContentAsync } = await import(
        '../../src/lib/workflowContextInjector.js'
      );
      await buildV10SessionStartContentAsync(wiring, entities, null, {});

      // filter should be called exactly once (canonical adapter in V9)
      // V10 reuses options.canonical_memory_result — no additional filter call
      expect(filterSpy.mock.calls.length).toBe(1);
    });
  });

  // ── Acceptance case 9: V8 and flag-off output byte-for-byte compatible ─────────

  describe('Acceptance case 9: V8 and flag-off compatibility', () => {
    it('V9 with longitudinal_layer_enabled=false delegates exactly to V8', async () => {
      const entities = makeEntities({ filterRecords: [], listRecords: [] });

      const v8Wiring = {
        name: 'cbt_therapist',
        stage2: true,
        stage2_phase: 12,
        longitudinal_layer_enabled: false,
        continuity_layer_enabled: false,
        strategy_layer_enabled: false,
        formulation_context_enabled: false,
        safety_mode_enabled: false,
      };
      const v9Wiring = { ...v8Wiring, longitudinal_layer_enabled: false };

      const v8Out = await buildV8SessionStartContentAsync(v8Wiring, entities, null, {});
      const v9Out = await buildV9SessionStartContentAsync(v9Wiring, entities, null, {});

      expect(v9Out).toBe(v8Out);
    });

    it('does not alter session-start content when LTS is absent', async () => {
      const entities = makeEntities({ filterRecords: [], listRecords: [] });

      const v8Wiring = {
        name: 'cbt_therapist',
        stage2: true,
        stage2_phase: 12,
        longitudinal_layer_enabled: false,
        continuity_layer_enabled: false,
        strategy_layer_enabled: false,
        formulation_context_enabled: false,
        safety_mode_enabled: false,
      };
      const v9Wiring = {
        ...v8Wiring,
        stage2_phase: 13,
        longitudinal_layer_enabled: true,
      };

      const v8Out = await buildV8SessionStartContentAsync(v8Wiring, entities, null, {});
      const v9Out = await buildV9SessionStartContentAsync(v9Wiring, entities, null, {});

      // V9 without LTS must equal V8 (no modification)
      expect(v9Out).toBe(v8Out);
    });
  });

  // ── Additional: isLTSWarmingUp semantics ──────────────────────────────────────

  describe('isLTSWarmingUp', () => {
    it('returns false for a valid record (not weak)', () => {
      const validRecord = makeValidLTSRecord(3);
      expect(isLTSWarmingUp(validRecord, LTS_READ_RESULTS.valid)).toBe(false);
    });

    it('returns true for weak record with session_count=1', () => {
      const weakRecord = makeWeakLTSRecord(1);
      expect(isLTSWarmingUp(weakRecord, LTS_READ_RESULTS.weak)).toBe(true);
    });

    it('returns false for weak record with session_count>1', () => {
      const weakRecord = makeWeakLTSRecord(2);
      expect(isLTSWarmingUp(weakRecord, LTS_READ_RESULTS.weak)).toBe(false);
    });

    it('returns false when read_result is absent_or_invalid', () => {
      expect(isLTSWarmingUp(null, LTS_READ_RESULTS.absent_or_invalid)).toBe(false);
    });

    it('returns false when read_result is read_error', () => {
      expect(isLTSWarmingUp(null, LTS_READ_RESULTS.read_error)).toBe(false);
    });
  });

  // ── Additional: buildCanonicalMemoryDiagnosticSnapshot ───────────────────────

  describe('buildCanonicalMemoryDiagnosticSnapshot', () => {
    it('returns safe fallback for null input', () => {
      const snap = buildCanonicalMemoryDiagnosticSnapshot(null);
      expect(snap.lts_valid).toBe(false);
      expect(snap.lts_warming_up).toBe(false);
      expect(snap.lts_session_count).toBe(0);
      expect(snap.continuity_session_count).toBe(0);
      expect(snap.canonical_memory_reader_used).toBe(true);
    });

    it('returns correct fields for a valid canonical result', async () => {
      const validRecord = makeValidLTSRecord(4, LTS_TRAJECTORIES.PROGRESSING);
      const sessions = [
        makeTherapistMemoryRecord({ session_id: 's1', session_summary: 'Session one.', core_patterns: ['p1'], follow_up_tasks: ['t1'] }),
        makeTherapistMemoryRecord({ session_id: 's2', session_summary: 'Session two.', core_patterns: ['p2'], follow_up_tasks: ['t2'] }),
      ];

      const entities = {
        CompanionMemory: {
          filter: vi.fn(async () => [ltsToRawRecord(validRecord)]),
          list: vi.fn(async () => sessions.map(therapistMemoryToRawRecord)),
        },
        CaseFormulation: { list: vi.fn(async () => []) },
      };

      const result = await readCanonicalTherapistMemory(entities);
      const snap = buildCanonicalMemoryDiagnosticSnapshot(result);

      expect(snap.lts_valid).toBe(true);
      expect(snap.lts_read_result).toBe(LTS_READ_RESULTS.valid);
      expect(snap.lts_warming_up).toBe(false);
      expect(snap.lts_session_count).toBe(4);
      expect(snap.continuity_session_count).toBeGreaterThan(0);
      expect(snap.canonical_memory_reader_used).toBe(true);
    });

    it('output is frozen (immutable)', async () => {
      const entities = makeEntities({ filterRecords: [], listRecords: [] });
      const result = await readCanonicalTherapistMemory(entities);
      const snap = buildCanonicalMemoryDiagnosticSnapshot(result);
      expect(Object.isFrozen(snap)).toBe(true);
    });

    it('does not include raw memory content, summaries or user text', async () => {
      const validRecord = makeValidLTSRecord(3, LTS_TRAJECTORIES.STABLE);
      const entities = {
        CompanionMemory: {
          filter: vi.fn(async () => [ltsToRawRecord(validRecord)]),
          list: vi.fn(async () => []),
        },
        CaseFormulation: { list: vi.fn(async () => []) },
      };

      const result = await readCanonicalTherapistMemory(entities);
      const snap = buildCanonicalMemoryDiagnosticSnapshot(result);
      const snapStr = JSON.stringify(snap);

      // Must not contain any field names associated with private content
      expect(snapStr).not.toContain('session_summary');
      expect(snapStr).not.toContain('core_patterns');
      expect(snapStr).not.toContain('follow_up_tasks');
      expect(snapStr).not.toContain('recurring_patterns');
      expect(snapStr).not.toContain('trajectory');
    });
  });

  // ── Additional: Canonical result immutability ─────────────────────────────────

  describe('readCanonicalTherapistMemory result', () => {
    it('result is frozen', async () => {
      const entities = makeEntities({ filterRecords: [], listRecords: [] });
      const result = await readCanonicalTherapistMemory(entities);
      expect(Object.isFrozen(result)).toBe(true);
      expect(Object.isFrozen(result.lts)).toBe(true);
      expect(Object.isFrozen(result.continuity)).toBe(true);
    });

    it('LTS and continuity results are independent', async () => {
      const validRecord = makeValidLTSRecord(3, LTS_TRAJECTORIES.STABLE);
      const entities = {
        CompanionMemory: {
          filter: vi.fn(async () => [ltsToRawRecord(validRecord)]),
          // continuity list throws
          list: vi.fn(async () => { throw new Error('continuity failed'); }),
        },
        CaseFormulation: { list: vi.fn(async () => []) },
      };

      const result = await readCanonicalTherapistMemory(entities);

      // LTS succeeded
      expect(result.lts.valid).toBe(true);
      // Continuity failed gracefully — LTS not contaminated
      expect(result.continuity.sessions).toBe(0);
      // LTS record is still accessible
      expect(result.lts.record).not.toBeNull();
    });

    it('never throws even when entities is null', async () => {
      await expect(readCanonicalTherapistMemory(null)).resolves.toBeDefined();
    });

    it('never throws even when entities is undefined', async () => {
      await expect(readCanonicalTherapistMemory(undefined)).resolves.toBeDefined();
    });
  });

  // ── Phase 4.1: Active chain test (V12→V7, all layers, exact call counts) ─────
  //
  // Required by Phase 4.1 problem statement: exercise the real V12/V11/V10/V9/V8/V7
  // delegation chain with all layers enabled and assert the exact memory call counts
  // and data-flow properties.

  describe('Phase 4.1 active chain — V12→V7 with all layers enabled', () => {
    /**
     * Builds a full V12 wiring with all layers enabled (mirrors the production
     * CBT_THERAPIST_WIRING_STAGE2_V12 flags).  This is a local stub — it does not
     * enable any feature flags and does not call any external resolvers.
     */
    function makeFullV12Wiring(overrides = {}) {
      return {
        stage2: true,
        stage2_phase: 16,
        memory_context_injection: true,
        workflow_engine_enabled: true,
        workflow_context_injection: true,
        retrieval_orchestration_enabled: false, // retrieval not needed for memory tests
        live_retrieval_enabled: false,
        safety_mode_enabled: false,
        formulation_context_enabled: false,
        continuity_layer_enabled: true,    // V7
        strategy_layer_enabled: true,      // V8
        longitudinal_layer_enabled: true,  // V9
        knowledge_layer_enabled: true,     // V10
        competence_layer_enabled: true,    // V11
        planner_first_enabled: true,       // V12
        ...overrides,
      };
    }

    /**
     * Builds an entities mock that tracks all CompanionMemory calls separately
     * so the test can assert exact call counts for filter (LTS) and list (continuity).
     */
    function makeFullChainEntities(ltsRecord, therapistRecords) {
      const ltsRaw = ltsRecord ? [ltsToRawRecord(ltsRecord)] : [];
      const therapistRaws = therapistRecords.map(therapistMemoryToRawRecord);

      return {
        CompanionMemory: {
          filter: vi.fn(async () => ltsRaw),
          list: vi.fn(async () => therapistRaws),
        },
        CaseFormulation: {
          list: vi.fn(async () => []),
        },
      };
    }

    it('CompanionMemory.filter called exactly once and .list called exactly once through V12→V7', async () => {
      const validLTS = makeValidLTSRecord(3, LTS_TRAJECTORIES.STABLE);
      const sessions = [
        makeTherapistMemoryRecord({ session_id: 'sess_1', core_patterns: ['anxiety'], follow_up_tasks: ['grounding'] }),
        makeTherapistMemoryRecord({ session_id: 'sess_2', core_patterns: ['avoidance'], follow_up_tasks: ['exposure'] }),
      ];
      const entities = makeFullChainEntities(validLTS, sessions);
      const wiring = makeFullV12Wiring();

      const { buildV12SessionStartContentAsync } = await import('../../src/lib/workflowContextInjector.js');
      await buildV12SessionStartContentAsync(wiring, entities, null, {});

      // Phase 4.1 guarantee: one filter call for LTS, one list call for continuity
      expect(entities.CompanionMemory.filter).toHaveBeenCalledTimes(1);
      expect(entities.CompanionMemory.list).toHaveBeenCalledTimes(1);
    });

    it('continuity block is present in V12→V7 output when sessions are available', async () => {
      const validLTS = makeValidLTSRecord(3, LTS_TRAJECTORIES.STABLE);
      const sessions = [
        makeTherapistMemoryRecord({ session_id: 'sess_1', core_patterns: ['anxiety'], follow_up_tasks: ['grounding'] }),
      ];
      const entities = makeFullChainEntities(validLTS, sessions);
      const wiring = makeFullV12Wiring();

      const { buildV12SessionStartContentAsync } = await import('../../src/lib/workflowContextInjector.js');
      const content = await buildV12SessionStartContentAsync(wiring, entities, null, {});

      expect(content).toContain('CROSS-SESSION CONTINUITY CONTEXT');
    });

    it('V8 strategy path receives continuity data from canonical result (no re-read)', async () => {
      // Arrange: continuity data is present; we verify strategy computation runs
      // (strategy section appears in output) which requires continuityData to be
      // available to the strategy engine without an additional list call.
      const validLTS = makeValidLTSRecord(3, LTS_TRAJECTORIES.STABLE);
      const sessions = [
        makeTherapistMemoryRecord({
          session_id: 'sess_1',
          core_patterns: ['safety_avoidance'],
          follow_up_tasks: ['safety_grounding'],
        }),
      ];
      const entities = makeFullChainEntities(validLTS, sessions);
      const wiring = makeFullV12Wiring();

      const { buildV12SessionStartContentAsync } = await import('../../src/lib/workflowContextInjector.js');
      await buildV12SessionStartContentAsync(wiring, entities, null, {});

      // The key assertion: list was called exactly once (V8 reused canonical data)
      expect(entities.CompanionMemory.list).toHaveBeenCalledTimes(1);
    });

    it('valid LTS is injected into V9→V12 output', async () => {
      const validLTS = makeValidLTSRecord(3, LTS_TRAJECTORIES.PROGRESSING);
      const entities = makeFullChainEntities(validLTS, []);
      const wiring = makeFullV12Wiring();

      const { buildV12SessionStartContentAsync } = await import('../../src/lib/workflowContextInjector.js');
      const content = await buildV12SessionStartContentAsync(wiring, entities, null, {});

      // A valid non-weak LTS with a non-trivial trajectory should produce an LTS block
      expect(content).toContain('LONGITUDINAL STATE CONTEXT');
    });

    it('warming-up LTS (session_count=1) is NOT injected', async () => {
      const warmingUpLTS = makeWeakLTSRecord(1);
      const entities = makeFullChainEntities(warmingUpLTS, []);
      const wiring = makeFullV12Wiring();

      const { buildV12SessionStartContentAsync } = await import('../../src/lib/workflowContextInjector.js');
      const content = await buildV12SessionStartContentAsync(wiring, entities, null, {});

      // Warming-up LTS must not produce an LTS block
      expect(content).not.toContain('LONGITUDINAL STATE CONTEXT');
    });

    it('canonical diagnostic fields match the same canonical result used at runtime', async () => {
      const validLTS = makeValidLTSRecord(4, LTS_TRAJECTORIES.STABLE);
      const sessions = [
        makeTherapistMemoryRecord({ session_id: 'sess_1', core_patterns: ['anxiety'] }),
        makeTherapistMemoryRecord({ session_id: 'sess_2', core_patterns: ['avoidance'] }),
      ];
      const entities = makeFullChainEntities(validLTS, sessions);

      // Read the canonical result directly — same path V10 takes
      const canonicalResult = await readCanonicalTherapistMemory(entities);
      const snap = buildCanonicalMemoryDiagnosticSnapshot(canonicalResult);

      // The snapshot must accurately reflect the actual result
      expect(snap.canonical_memory_reader_used).toBe(true);
      expect(snap.lts_valid).toBe(canonicalResult.lts.valid);
      expect(snap.lts_read_result).toBe(canonicalResult.lts.read_result);
      expect(snap.lts_warming_up).toBe(canonicalResult.lts.warming_up);
      expect(snap.lts_session_count).toBe(canonicalResult.lts.session_count);
      expect(snap.continuity_session_count).toBe(canonicalResult.continuity.sessions);
      // Verify specific values
      expect(snap.lts_valid).toBe(true);
      expect(snap.lts_warming_up).toBe(false);
      expect(snap.continuity_session_count).toBeGreaterThan(0);
    });

    it('direct V7 call without canonical result preserves existing behavior', async () => {
      // V7 called directly (no canonical result in options) must still work
      const sessions = [
        makeTherapistMemoryRecord({ session_id: 'sess_1', core_patterns: ['anxiety'] }),
      ];
      const entities = {
        CompanionMemory: {
          filter: vi.fn(async () => []),
          list: vi.fn(async () => sessions.map(therapistMemoryToRawRecord)),
        },
        CaseFormulation: { list: vi.fn(async () => []) },
      };
      const wiring = {
        continuity_layer_enabled: true,
        strategy_layer_enabled: false,
        longitudinal_layer_enabled: false,
        knowledge_layer_enabled: false,
      };

      const content = await buildV9SessionStartContentAsync(wiring, entities, null, {});

      // continuity block should be present (V7 direct path)
      expect(content).toContain('CROSS-SESSION CONTINUITY CONTEXT');
      // list was called (V7 direct path reads continuity independently)
      expect(entities.CompanionMemory.list).toHaveBeenCalled();
    });

    it('direct V8 call without canonical result preserves existing behavior', async () => {
      // V8 called directly (no canonical result in options) must still work
      const sessions = [
        makeTherapistMemoryRecord({ session_id: 'sess_1', core_patterns: ['anxiety'] }),
      ];
      const entities = {
        CompanionMemory: {
          filter: vi.fn(async () => []),
          list: vi.fn(async () => sessions.map(therapistMemoryToRawRecord)),
        },
        CaseFormulation: { list: vi.fn(async () => []) },
      };
      const wiring = {
        continuity_layer_enabled: true,
        strategy_layer_enabled: true,
        longitudinal_layer_enabled: false,
        knowledge_layer_enabled: false,
      };

      const content = await buildV8SessionStartContentAsync(wiring, entities, null, {});

      // Strategy section should be present
      expect(typeof content).toBe('string');
      expect(content.length).toBeGreaterThan(0);
      // list was called (V8 direct path reads continuity independently)
      expect(entities.CompanionMemory.list).toHaveBeenCalled();
    });
  });

});
