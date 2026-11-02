/**
 * @file test/utils/wave2dStrategyDiagnostics.test.js
 *
 * Wave 2D — Strategy Diagnostics Observability
 *
 * PURPOSE
 * -------
 * Validates the Wave 2D additive observability additions:
 *   1. buildStrategyDiagnosticSnapshot() — safe, sanitized snapshot function
 *   2. getStage2DiagnosticPayload() — includes strategyEngine static metadata
 *   3. getActivationDiagnostics() — therapist section includes strategyEngine
 *   4. No raw transcript leakage in diagnostic output
 *   5. No private-entity leakage
 *   6. No regression to V7/V8 fallback behavior
 *   7. No Companion flow regression
 *   8. Backward compatibility of therapist memory records
 *   9. Production-default behavior unchanged (no flag mutations)
 *
 * CONSTRAINTS
 * -----------
 * - Does NOT import from functions/ (Deno runtime code).
 * - Does NOT enable any feature flags.
 * - All flags remain at their default (false) state.
 * - Tests are pure, deterministic, and synchronous except where noted.
 *
 * Source of truth: Wave 2D problem statement.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';

import {
  STRATEGY_VERSION,
  STRATEGY_INTERVENTION_MODES,
  DISTRESS_TIERS,
  MESSAGE_SIGNAL_KEYS,
  STRATEGY_FAIL_SAFE_STATE,
  STRATEGY_DIAGNOSTIC_SAFE_FIELDS,
  buildStrategyDiagnosticSnapshot,
  determineTherapistStrategy,
} from '../../src/lib/therapistStrategyEngine.js';

import {
  THERAPIST_UPGRADE_FLAGS,
  getStage2DiagnosticPayload,
  getActivationDiagnostics,
  logStage2Diagnostics,
  logActivationDiagnostics,
} from '../../src/lib/featureFlags.js';

import {
  THERAPIST_MEMORY_VERSION_KEY,
  THERAPIST_MEMORY_VERSION,
  THERAPIST_MEMORY_SCHEMA,
  createEmptyTherapistMemoryRecord,
} from '../../src/lib/therapistMemoryModel.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Stubs window.location with the given search and hostname.
 */
function withWindow(search, fn, hostname = 'localhost') {
  vi.stubGlobal('window', { location: { search, hostname } });
  try {
    return fn();
  } finally {
    vi.unstubAllGlobals();
  }
}

afterEach(() => {
  vi.unstubAllGlobals();
});

// ─── Section 1 — STRATEGY_DIAGNOSTIC_SAFE_FIELDS ─────────────────────────────

describe('Wave 2D — STRATEGY_DIAGNOSTIC_SAFE_FIELDS', () => {
  it('is exported as a frozen array', () => {
    expect(Array.isArray(STRATEGY_DIAGNOSTIC_SAFE_FIELDS)).toBe(true);
    expect(Object.isFrozen(STRATEGY_DIAGNOSTIC_SAFE_FIELDS)).toBe(true);
  });

  it('contains at least the core structural fields', () => {
    expect(STRATEGY_DIAGNOSTIC_SAFE_FIELDS).toContain('strategy_version');
    expect(STRATEGY_DIAGNOSTIC_SAFE_FIELDS).toContain('intervention_mode');
    expect(STRATEGY_DIAGNOSTIC_SAFE_FIELDS).toContain('distress_tier');
    expect(STRATEGY_DIAGNOSTIC_SAFE_FIELDS).toContain('rationale');
    expect(STRATEGY_DIAGNOSTIC_SAFE_FIELDS).toContain('fail_safe');
  });

  it('contains Wave 2C enrichment fields', () => {
    expect(STRATEGY_DIAGNOSTIC_SAFE_FIELDS).toContain('session_count');
    expect(STRATEGY_DIAGNOSTIC_SAFE_FIELDS).toContain('has_risk_flags');
    expect(STRATEGY_DIAGNOSTIC_SAFE_FIELDS).toContain('has_open_tasks');
    expect(STRATEGY_DIAGNOSTIC_SAFE_FIELDS).toContain('intervention_saturated');
    expect(STRATEGY_DIAGNOSTIC_SAFE_FIELDS).toContain('continuity_richness_score');
    expect(STRATEGY_DIAGNOSTIC_SAFE_FIELDS).toContain('formulation_strength_score');
  });

  it('does NOT include message_signals (raw-user-text inference field)', () => {
    expect(STRATEGY_DIAGNOSTIC_SAFE_FIELDS).not.toContain('message_signals');
  });
});

// ─── Section 2 — buildStrategyDiagnosticSnapshot: shape and values ────────────

describe('Wave 2D — buildStrategyDiagnosticSnapshot: output shape', () => {
  it('is exported and is a function', () => {
    expect(typeof buildStrategyDiagnosticSnapshot).toBe('function');
  });

  it('returns a frozen plain object', () => {
    const snap = buildStrategyDiagnosticSnapshot(STRATEGY_FAIL_SAFE_STATE);
    expect(snap && typeof snap === 'object').toBe(true);
    expect(Object.isFrozen(snap)).toBe(true);
  });

  it('includes all STRATEGY_DIAGNOSTIC_SAFE_FIELDS keys', () => {
    const snap = buildStrategyDiagnosticSnapshot(STRATEGY_FAIL_SAFE_STATE);
    for (const field of STRATEGY_DIAGNOSTIC_SAFE_FIELDS) {
      expect(snap, `snapshot must include field "${field}"`).toHaveProperty(field);
    }
  });

  it('does NOT include message_signals', () => {
    const snap = buildStrategyDiagnosticSnapshot(STRATEGY_FAIL_SAFE_STATE);
    expect(snap).not.toHaveProperty('message_signals');
    expect(Object.keys(snap)).not.toContain('message_signals');
  });

  it('does NOT include any raw text field', () => {
    const snap = buildStrategyDiagnosticSnapshot(STRATEGY_FAIL_SAFE_STATE);
    for (const key of Object.keys(snap)) {
      const val = snap[key];
      if (typeof val === 'string') {
        // Values must be short classification labels, not free-form text
        expect(val.length, `field "${key}" value length must be bounded`).toBeLessThan(100);
      }
    }
  });
});

describe('Wave 2D — buildStrategyDiagnosticSnapshot: value correctness', () => {
  it('reflects strategy_version from STRATEGY_FAIL_SAFE_STATE', () => {
    const snap = buildStrategyDiagnosticSnapshot(STRATEGY_FAIL_SAFE_STATE);
    expect(snap.strategy_version).toBe(STRATEGY_VERSION);
  });

  it('reflects intervention_mode from STRATEGY_FAIL_SAFE_STATE', () => {
    const snap = buildStrategyDiagnosticSnapshot(STRATEGY_FAIL_SAFE_STATE);
    expect(snap.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.STABILISATION);
  });

  it('reflects distress_tier from STRATEGY_FAIL_SAFE_STATE', () => {
    const snap = buildStrategyDiagnosticSnapshot(STRATEGY_FAIL_SAFE_STATE);
    expect(snap.distress_tier).toBe(DISTRESS_TIERS.TIER_LOW);
  });

  it('reflects fail_safe=true from STRATEGY_FAIL_SAFE_STATE', () => {
    const snap = buildStrategyDiagnosticSnapshot(STRATEGY_FAIL_SAFE_STATE);
    expect(snap.fail_safe).toBe(true);
  });

  it('reflects numeric enrichment fields from STRATEGY_FAIL_SAFE_STATE', () => {
    const snap = buildStrategyDiagnosticSnapshot(STRATEGY_FAIL_SAFE_STATE);
    expect(snap.session_count).toBe(0);
    expect(snap.continuity_richness_score).toBe(0);
    expect(snap.formulation_strength_score).toBe(0);
  });

  it('reflects boolean enrichment fields from STRATEGY_FAIL_SAFE_STATE', () => {
    const snap = buildStrategyDiagnosticSnapshot(STRATEGY_FAIL_SAFE_STATE);
    expect(snap.has_risk_flags).toBe(false);
    expect(snap.has_open_tasks).toBe(false);
    expect(snap.intervention_saturated).toBe(false);
  });

  it('correctly snapshots a CONTAINMENT strategy state', () => {
    const state = determineTherapistStrategy(
      null,
      null,
      DISTRESS_TIERS.TIER_HIGH,
      null,
    );
    const snap = buildStrategyDiagnosticSnapshot(state);
    expect(snap.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.CONTAINMENT);
    expect(snap.distress_tier).toBe(DISTRESS_TIERS.TIER_HIGH);
    expect(snap.fail_safe).toBe(false);
    expect(snap).not.toHaveProperty('message_signals');
  });

  it('correctly snapshots a FORMULATION_DEEPENING strategy state', () => {
    const continuity = { records: [{ core_patterns: ['pattern-a'], interventions_used: ['thought_record'] }] };
    const formulation = { presenting_problem: 'overthinking', core_belief: 'I am not good enough', maintaining_cycle: 'avoidance' };
    const state = determineTherapistStrategy(
      continuity,
      formulation,
      DISTRESS_TIERS.TIER_LOW,
      null,
    );
    const snap = buildStrategyDiagnosticSnapshot(state);
    expect(snap.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.FORMULATION_DEEPENING);
    expect(snap.continuity_present).toBe(true);
    expect(snap.formulation_present).toBe(true);
    expect(snap).not.toHaveProperty('message_signals');
  });

  it('correctly snapshots a PSYCHOEDUCATION strategy state (first session)', () => {
    const state = determineTherapistStrategy(null, null, DISTRESS_TIERS.TIER_LOW, null);
    const snap = buildStrategyDiagnosticSnapshot(state);
    expect(snap.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.PSYCHOEDUCATION);
    expect(snap.continuity_present).toBe(false);
    expect(snap.formulation_present).toBe(false);
    expect(snap).not.toHaveProperty('message_signals');
  });
});

// ─── Section 3 — buildStrategyDiagnosticSnapshot: fail-safe behavior ──────────

describe('Wave 2D — buildStrategyDiagnosticSnapshot: fail-safe defaults', () => {
  it('handles null input safely', () => {
    const snap = buildStrategyDiagnosticSnapshot(null);
    expect(snap).toBeDefined();
    expect(typeof snap.intervention_mode).toBe('string');
    expect(typeof snap.distress_tier).toBe('string');
  });

  it('handles undefined input safely', () => {
    const snap = buildStrategyDiagnosticSnapshot(undefined);
    expect(snap).toBeDefined();
    expect(typeof snap.strategy_version).toBe('string');
  });

  it('handles an empty object safely', () => {
    const snap = buildStrategyDiagnosticSnapshot({});
    expect(snap).toBeDefined();
    expect(snap.strategy_version).toBe(STRATEGY_VERSION);
    expect(snap.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.STABILISATION);
    expect(snap.distress_tier).toBe(DISTRESS_TIERS.TIER_LOW);
    expect(snap.fail_safe).toBe(false); // empty object → not explicitly fail_safe
  });

  it('handles a string input safely (wrong type)', () => {
    const snap = buildStrategyDiagnosticSnapshot('bad input');
    expect(snap).toBeDefined();
    expect(typeof snap.intervention_mode).toBe('string');
  });

  it('always returns a frozen object regardless of input', () => {
    expect(Object.isFrozen(buildStrategyDiagnosticSnapshot(null))).toBe(true);
    expect(Object.isFrozen(buildStrategyDiagnosticSnapshot({}))).toBe(true);
    expect(Object.isFrozen(buildStrategyDiagnosticSnapshot(STRATEGY_FAIL_SAFE_STATE))).toBe(true);
  });

  it('does not throw on any input type', () => {
    expect(() => buildStrategyDiagnosticSnapshot(null)).not.toThrow();
    expect(() => buildStrategyDiagnosticSnapshot(undefined)).not.toThrow();
    expect(() => buildStrategyDiagnosticSnapshot(42)).not.toThrow();
    expect(() => buildStrategyDiagnosticSnapshot([])).not.toThrow();
    expect(() => buildStrategyDiagnosticSnapshot('string')).not.toThrow();
  });
});

// ─── Section 4 — No private-entity or transcript leakage ─────────────────────

describe('Wave 2D — No private-entity or transcript leakage in diagnostic snapshot', () => {
  it('snapshot contains no entity IDs', () => {
    const continuity = {
      records: [{
        id: 'private-session-id-001',
        core_patterns: ['pattern-a'],
        risk_flags: ['passive_ideation'],
      }],
    };
    const formulation = {
      id: 'private-form-id-002',
      presenting_problem: 'test problem',
      core_belief: 'test belief',
    };
    const state = determineTherapistStrategy(continuity, formulation, DISTRESS_TIERS.TIER_MILD, null);
    const snap = buildStrategyDiagnosticSnapshot(state);

    // No entity ID should appear in any field
    const snapStr = JSON.stringify(snap);
    expect(snapStr).not.toContain('private-session-id-001');
    expect(snapStr).not.toContain('private-form-id-002');
  });

  it('snapshot contains no presenting_problem or clinical text', () => {
    const formulation = {
      presenting_problem: 'I have severe anxiety about failure',
      core_belief: 'I am fundamentally broken',
    };
    const state = determineTherapistStrategy(null, formulation, DISTRESS_TIERS.TIER_LOW, null);
    const snap = buildStrategyDiagnosticSnapshot(state);

    const snapStr = JSON.stringify(snap);
    expect(snapStr).not.toContain('severe anxiety');
    expect(snapStr).not.toContain('fundamentally broken');
  });

  it('snapshot contains no session_summary or raw session content', () => {
    const continuity = {
      records: [{
        session_summary: 'Client discussed work stress at length.',
        core_patterns: ['rumination'],
      }],
    };
    const state = determineTherapistStrategy(continuity, null, DISTRESS_TIERS.TIER_LOW, null);
    const snap = buildStrategyDiagnosticSnapshot(state);

    const snapStr = JSON.stringify(snap);
    expect(snapStr).not.toContain('Client discussed');
    expect(snapStr).not.toContain('work stress at length');
  });

  it('snapshot does not contain message_signals (inferred from raw message text)', () => {
    const state = determineTherapistStrategy(null, null, DISTRESS_TIERS.TIER_HIGH, null);
    // state.message_signals exists on the TherapistStrategyState
    expect(state).toHaveProperty('message_signals');
    const snap = buildStrategyDiagnosticSnapshot(state);
    // snapshot must not expose it
    expect(snap).not.toHaveProperty('message_signals');
    expect(Object.keys(snap)).not.toContain('message_signals');
    // and none of the signal keys should appear as top-level keys
    for (const sigKey of Object.values(MESSAGE_SIGNAL_KEYS)) {
      expect(Object.keys(snap)).not.toContain(sigKey);
    }
  });
});

// ─── Section 5 — getStage2DiagnosticPayload includes strategyEngine ───────────

describe('Wave 2D — getStage2DiagnosticPayload includes strategyEngine', () => {
  it('returns null when _s2debug is absent (unchanged gate behavior)', () => {
    withWindow('', () => {
      expect(getStage2DiagnosticPayload()).toBeNull();
    });
  });

  it('returns non-null payload when _s2debug=true (unchanged gate behavior)', () => {
    withWindow('?_s2debug=true', () => {
      expect(getStage2DiagnosticPayload()).not.toBeNull();
    });
  });

  it('payload includes strategyEngine field', () => {
    withWindow('?_s2debug=true', () => {
      const p = getStage2DiagnosticPayload();
      expect(p).toHaveProperty('strategyEngine');
    });
  });

  it('strategyEngine.version matches STRATEGY_VERSION', () => {
    withWindow('?_s2debug=true', () => {
      const p = getStage2DiagnosticPayload();
      expect(p.strategyEngine.version).toBe(STRATEGY_VERSION);
    });
  });

  it('strategyEngine.availableModes is an array', () => {
    withWindow('?_s2debug=true', () => {
      const p = getStage2DiagnosticPayload();
      expect(Array.isArray(p.strategyEngine.availableModes)).toBe(true);
    });
  });

  it('strategyEngine.availableModes contains all STRATEGY_INTERVENTION_MODES values', () => {
    withWindow('?_s2debug=true', () => {
      const p = getStage2DiagnosticPayload();
      for (const mode of Object.values(STRATEGY_INTERVENTION_MODES)) {
        expect(p.strategyEngine.availableModes).toContain(mode);
      }
    });
  });

  it('strategyEngine is NOT present when _s2debug is absent (fails closed)', () => {
    withWindow('?foo=bar', () => {
      const p = getStage2DiagnosticPayload();
      expect(p).toBeNull();
    });
  });

  it('existing payload fields (hostname, search, computedFlags) are still present', () => {
    withWindow('?_s2debug=true', () => {
      const p = getStage2DiagnosticPayload();
      expect(p).toHaveProperty('hostname');
      expect(p).toHaveProperty('search');
      expect(p).toHaveProperty('computedFlags');
      expect(p).toHaveProperty('routeHint');
      expect(p).toHaveProperty('masterGateOn');
    });
  });

  it('computedFlags still contains every THERAPIST_UPGRADE_FLAGS key (no regression)', () => {
    withWindow('?_s2debug=true', () => {
      const p = getStage2DiagnosticPayload();
      for (const flagName of Object.keys(THERAPIST_UPGRADE_FLAGS)) {
        expect(p.computedFlags).toHaveProperty(flagName);
      }
    });
  });

  it('THERAPIST_UPGRADE_FLAGS remains frozen after payload is fetched', () => {
    withWindow('?_s2debug=true', () => {
      getStage2DiagnosticPayload();
      expect(Object.isFrozen(THERAPIST_UPGRADE_FLAGS)).toBe(true);
    });
  });
});

// ─── Section 6 — getActivationDiagnostics therapist.strategyEngine ────────────

describe('Wave 2D — getActivationDiagnostics includes therapist.strategyEngine', () => {
  it('returns null when _s2debug is absent (unchanged gate behavior)', () => {
    withWindow('?foo=bar', () => {
      expect(getActivationDiagnostics()).toBeNull();
    });
  });

  it('returns non-null payload when _s2debug=true', () => {
    withWindow('?_s2debug=true', () => {
      expect(getActivationDiagnostics()).not.toBeNull();
    });
  });

  it('therapist section includes strategyEngine', () => {
    withWindow('?_s2debug=true', () => {
      const p = getActivationDiagnostics();
      expect(p.therapist).toHaveProperty('strategyEngine');
    });
  });

  it('therapist.strategyEngine.version matches STRATEGY_VERSION', () => {
    withWindow('?_s2debug=true', () => {
      const p = getActivationDiagnostics();
      expect(p.therapist.strategyEngine.version).toBe(STRATEGY_VERSION);
    });
  });

  it('therapist.strategyEngine.availableModes contains all intervention modes', () => {
    withWindow('?_s2debug=true', () => {
      const p = getActivationDiagnostics();
      for (const mode of Object.values(STRATEGY_INTERVENTION_MODES)) {
        expect(p.therapist.strategyEngine.availableModes).toContain(mode);
      }
    });
  });

  it('companion section does NOT include strategyEngine (correct agent separation)', () => {
    withWindow('?_s2debug=true', () => {
      const p = getActivationDiagnostics();
      // Companion is not the strategy agent — no cross-contamination.
      expect(p.companion).not.toHaveProperty('strategyEngine');
    });
  });

  it('existing activation diagnostic fields remain present (backward compat)', () => {
    withWindow('?_s2debug=true', () => {
      const p = getActivationDiagnostics();
      expect(p).toHaveProperty('hostname');
      expect(p).toHaveProperty('snapshotTimestamp');
      expect(p).toHaveProperty('isPreviewStagingHost');
      expect(p.therapist).toHaveProperty('parsedS2Flags');
      expect(p.therapist).toHaveProperty('computedFlags');
      expect(p.therapist).toHaveProperty('masterGateOn');
      expect(p.therapist).toHaveProperty('routeHint');
      expect(p.companion).toHaveProperty('parsedC2Flags');
      expect(p.companion).toHaveProperty('computedFlags');
      expect(p.companion).toHaveProperty('masterGateOn');
      expect(p.companion).toHaveProperty('routeHint');
    });
  });

  it('strategyEngine contains only safe static metadata — no runtime state', () => {
    withWindow('?_s2debug=true', () => {
      const p = getActivationDiagnostics();
      const se = p.therapist.strategyEngine;
      expect(Object.keys(se).sort()).toEqual(['availableModes', 'version'].sort());
    });
  });
});

// ─── Section 7 — logStage2Diagnostics logs strategyEngine when active ─────────

describe('Wave 2D — logStage2Diagnostics logs strategyEngine', () => {
  it('logs strategyEngine when _s2debug=true', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'group').mockImplementation(() => {});
    vi.spyOn(console, 'groupEnd').mockImplementation(() => {});

    withWindow('?_s2debug=true', () => {
      logStage2Diagnostics();
    });

    const calls = logSpy.mock.calls.map(c => c[0]);
    expect(calls.some(c => typeof c === 'string' && c.includes('strategyEngine'))).toBe(true);

    logSpy.mockRestore();
    console.group.mockRestore?.();
    console.groupEnd.mockRestore?.();
  });

  it('is a no-op (no console.group calls) when _s2debug is absent', () => {
    const groupSpy = vi.spyOn(console, 'group').mockImplementation(() => {});
    withWindow('?foo=bar', () => {
      logStage2Diagnostics();
    });
    expect(groupSpy).not.toHaveBeenCalled();
    groupSpy.mockRestore();
  });
});

// ─── Section 8 — logActivationDiagnostics logs strategyEngine ────────────────

describe('Wave 2D — logActivationDiagnostics logs strategyEngine', () => {
  it('logs strategyEngine in therapist group when _s2debug=true', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'group').mockImplementation(() => {});
    vi.spyOn(console, 'groupEnd').mockImplementation(() => {});

    withWindow('?_s2debug=true', () => {
      logActivationDiagnostics();
    });

    const calls = logSpy.mock.calls.map(c => c[0]);
    expect(calls.some(c => typeof c === 'string' && c.includes('strategyEngine'))).toBe(true);

    logSpy.mockRestore();
    console.group.mockRestore?.();
    console.groupEnd.mockRestore?.();
  });
});

// ─── Section 9 — Backward compatibility: therapist memory records ─────────────

describe('Wave 2D — therapist memory record backward compatibility', () => {
  it('THERAPIST_MEMORY_SCHEMA does not include strategy_used (additive field not yet added)', () => {
    // Wave 2D does NOT add strategy_used to memory records — this is a pure
    // diagnostics PR.  Memory record schema is unchanged.
    expect(THERAPIST_MEMORY_SCHEMA).not.toHaveProperty('strategy_used');
  });

  it('createEmptyTherapistMemoryRecord() still returns a record with the version marker', () => {
    const rec = createEmptyTherapistMemoryRecord();
    expect(rec[THERAPIST_MEMORY_VERSION_KEY]).toBe(THERAPIST_MEMORY_VERSION);
  });

  it('existing therapist memory records without strategy_used are valid (no regression)', () => {
    const rec = createEmptyTherapistMemoryRecord();
    rec.session_id = 'sess-001';
    rec.interventions_used = ['thought_record'];
    // Must not throw or fail
    expect(rec.interventions_used).toContain('thought_record');
    expect(rec[THERAPIST_MEMORY_VERSION_KEY]).toBe(THERAPIST_MEMORY_VERSION);
  });
});

// ─── Section 10 — No regression: V7/V8 fallback behavior ─────────────────────

describe('Wave 2D — No regression to V7/V8 fallback behavior', () => {
  it('THERAPIST_UPGRADE_FLAGS.THERAPIST_UPGRADE_STRATEGY_ENABLED defaults to false', () => {
    expect(THERAPIST_UPGRADE_FLAGS.THERAPIST_UPGRADE_STRATEGY_ENABLED).toBe(false);
  });

  it('THERAPIST_UPGRADE_FLAGS remains frozen (no mutation from Wave 2D imports)', () => {
    expect(Object.isFrozen(THERAPIST_UPGRADE_FLAGS)).toBe(true);
  });

  it('all THERAPIST_UPGRADE_FLAGS default to false (no accidental enablement)', () => {
    for (const [name, value] of Object.entries(THERAPIST_UPGRADE_FLAGS)) {
      expect(value, `${name} must default to false`).toBe(false);
    }
  });

  it('STRATEGY_FAIL_SAFE_STATE is still frozen and unchanged', () => {
    expect(Object.isFrozen(STRATEGY_FAIL_SAFE_STATE)).toBe(true);
    expect(STRATEGY_FAIL_SAFE_STATE.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.STABILISATION);
    expect(STRATEGY_FAIL_SAFE_STATE.distress_tier).toBe(DISTRESS_TIERS.TIER_LOW);
    expect(STRATEGY_FAIL_SAFE_STATE.fail_safe).toBe(true);
  });

  it('buildStrategyDiagnosticSnapshot on STRATEGY_FAIL_SAFE_STATE matches expected fail-safe output', () => {
    const snap = buildStrategyDiagnosticSnapshot(STRATEGY_FAIL_SAFE_STATE);
    expect(snap.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.STABILISATION);
    expect(snap.fail_safe).toBe(true);
    expect(snap.distress_tier).toBe(DISTRESS_TIERS.TIER_LOW);
    expect(snap.continuity_present).toBe(false);
    expect(snap.formulation_present).toBe(false);
    expect(snap.session_count).toBe(0);
  });
});

// ─── Section 11 — Production-default behavior unchanged ───────────────────────

describe('Wave 2D — Production-default behavior unchanged', () => {
  it('getStage2DiagnosticPayload() returns null without _s2debug (production default)', () => {
    // No window → always null
    expect(getStage2DiagnosticPayload()).toBeNull();
  });

  it('getActivationDiagnostics() returns null without _s2debug (production default)', () => {
    expect(getActivationDiagnostics()).toBeNull();
  });

  it('strategyEngine metadata is never exposed in production (no window context)', () => {
    // In Node.js / production SSR contexts, diagnostics fail-closed to null.
    const p = getStage2DiagnosticPayload();
    expect(p).toBeNull();
    // No strategyEngine leaked
  });

  it('buildStrategyDiagnosticSnapshot does not mutate its input', () => {
    const state = determineTherapistStrategy(null, null, DISTRESS_TIERS.TIER_LOW, null);
    const beforeStr = JSON.stringify(state);
    buildStrategyDiagnosticSnapshot(state);
    expect(JSON.stringify(state)).toBe(beforeStr);
  });

  it('buildStrategyDiagnosticSnapshot is deterministic for the same input', () => {
    const state = determineTherapistStrategy(
      { records: [{ core_patterns: ['p1'] }] },
      { presenting_problem: 'test', core_belief: 'belief' },
      DISTRESS_TIERS.TIER_MILD,
      null,
    );
    const snap1 = buildStrategyDiagnosticSnapshot(state);
    const snap2 = buildStrategyDiagnosticSnapshot(state);
    expect(snap1.intervention_mode).toBe(snap2.intervention_mode);
    expect(snap1.distress_tier).toBe(snap2.distress_tier);
    expect(snap1.rationale).toBe(snap2.rationale);
    expect(snap1.session_count).toBe(snap2.session_count);
  });
});

// ─── Section 12 — Companion flow not affected ────────────────────────────────

describe('Wave 2D — Companion flows not affected', () => {
  it('companion section in getActivationDiagnostics has no strategyEngine field', () => {
    withWindow('?_s2debug=true', () => {
      const p = getActivationDiagnostics();
      if (!p) return; // node env guard
      expect(p.companion).not.toHaveProperty('strategyEngine');
    });
  });

  it('COMPANION_UPGRADE_FLAGS are not referenced or mutated by Wave 2D additions', () => {
    // Import companion flags via activation diagnostics call — they must be unchanged
    withWindow('?_s2debug=true', () => {
      const p = getActivationDiagnostics();
      if (!p) return;
      // Companion master gate must still be false by default
      expect(p.companion.masterGateOn).toBe(false);
    });
  });
});
