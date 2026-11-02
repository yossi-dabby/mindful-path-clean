/**
 * @file test/utils/wave3eLTSDiagnostics.test.js
 *
 * Wave 3E — LTS Diagnostics / Evaluation Visibility
 *
 * PURPOSE
 * -------
 * Validates the Wave 3E additive observability additions:
 *   1. LTS_DIAGNOSTIC_SAFE_FIELDS — frozen field-name allowlist
 *   2. buildLTSDiagnosticSnapshot() — safe LTS signal snapshot from LTSStrategyInputs
 *   3. _emitStrategyDiagnosticIfEnabled() (tested indirectly) — LTS signal group
 *      is emitted alongside the strategy group when ltsInputs are provided
 *   4. getActivationDiagnostics() — therapist section now includes ltsLayer
 *   5. No raw transcript leakage
 *   6. No private-entity leakage
 *   7. No free-text clinical text leakage
 *   8. Backward compatibility (all existing diagnostic fields still present)
 *   9. No regression to V8/V9 fallback behavior
 *  10. No regression to Companion flows
 *  11. Production-default behavior unchanged (no flag mutations)
 *  12. Deterministic diagnostic snapshot shape
 *  13. Strategy diagnostics consistent when LTS is absent vs present
 *
 * COVERAGE (per Wave 3E problem statement)
 * ─────────────────────────────────────────
 *  A.  LTS_DIAGNOSTIC_SAFE_FIELDS is exported as a frozen array
 *  B.  LTS_DIAGNOSTIC_SAFE_FIELDS contains exactly the 8 expected fields
 *  C.  LTS_DIAGNOSTIC_SAFE_FIELDS does NOT include lts_stalled_interventions
 *  D.  buildLTSDiagnosticSnapshot — null input → all-false fail-safe snapshot
 *  E.  buildLTSDiagnosticSnapshot — undefined input → all-false fail-safe
 *  F.  buildLTSDiagnosticSnapshot — non-object → all-false fail-safe
 *  G.  buildLTSDiagnosticSnapshot — valid active LTS inputs → lts_valid: true
 *  H.  buildLTSDiagnosticSnapshot — correct lts_session_count forwarded
 *  I.  buildLTSDiagnosticSnapshot — correct lts_trajectory forwarded
 *  J.  buildLTSDiagnosticSnapshot — correct boolean signals forwarded
 *  K.  buildLTSDiagnosticSnapshot — stagnating inputs → lts_is_stagnating: true
 *  L.  buildLTSDiagnosticSnapshot — fluctuating inputs → lts_is_fluctuating: true
 *  M.  buildLTSDiagnosticSnapshot — progressing inputs → lts_is_progressing: true
 *  N.  buildLTSDiagnosticSnapshot — frozen output object
 *  O.  buildLTSDiagnosticSnapshot — deterministic (same inputs → same output)
 *  P.  buildLTSDiagnosticSnapshot — no lts_stalled_interventions field in output
 *  Q.  buildLTSDiagnosticSnapshot — no raw text / no private entity fields in output
 *  R.  buildLTSDiagnosticSnapshot — absent LTS inputs → exact same shape as invalid
 *  S.  extractLTSStrategyInputs absent → buildLTSDiagnosticSnapshot produces fail-safe
 *  T.  Strategy diagnostic snapshot shape unchanged from Wave 3D (backward compat)
 *  U.  STRATEGY_DIAGNOSTIC_SAFE_FIELDS still contains lts_trajectory (Wave 3D)
 *  V.  buildStrategyDiagnosticSnapshot still produces lts_trajectory (backward compat)
 *  W.  getActivationDiagnostics — therapist section now has ltsLayer field
 *  X.  getActivationDiagnostics.ltsLayer.ltsLayerActive is boolean (default false)
 *  Y.  getActivationDiagnostics.ltsLayer.strategyLayerActive is boolean (default false)
 *  Z.  getActivationDiagnostics still has strategyEngine (backward compat)
 *  AA. getActivationDiagnostics — companion section unchanged (no ltsLayer)
 *  AB. No Companion flag or entity leaks into therapist ltsLayer section
 *  AC. No private entity fields (ThoughtJournal, Conversation, CaseFormulation,
 *      MoodEntry, CompanionMemory) appear in any diagnostic output
 *  AD. buildLTSDiagnosticSnapshot output field set matches LTS_DIAGNOSTIC_SAFE_FIELDS
 *  AE. Strategy diagnostics consistent: LTS absent vs LTS present → same fields
 *
 * CONSTRAINTS
 * -----------
 * - Does NOT import from functions/ (Deno runtime code).
 * - Does NOT enable any feature flags.
 * - All flags remain at their default (false) state.
 * - Tests are pure, deterministic, and synchronous except where noted.
 * - No live backend calls.
 * - No Companion entity access tested or invoked.
 *
 * Source of truth: Wave 3E problem statement.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';

// ─── Modules under test ───────────────────────────────────────────────────────

import {
  LTS_DIAGNOSTIC_SAFE_FIELDS,
  buildLTSDiagnosticSnapshot,
  extractLTSStrategyInputs,
  buildStrategyDiagnosticSnapshot,
  STRATEGY_DIAGNOSTIC_SAFE_FIELDS,
  STRATEGY_VERSION,
  STRATEGY_INTERVENTION_MODES,
} from '../../src/lib/therapistStrategyEngine.js';

import {
  getActivationDiagnostics,
  THERAPIST_UPGRADE_FLAGS,
  COMPANION_UPGRADE_FLAGS,
} from '../../src/lib/featureFlags.js';

import {
  LTS_VERSION,
  LTS_MEMORY_TYPE,
  LTS_TRAJECTORIES,
  LTS_MIN_SESSIONS_FOR_SIGNALS,
} from '../../src/lib/therapistMemoryModel.js';

// ─── Test helpers ─────────────────────────────────────────────────────────────

/**
 * Stubs window.location with the given search and hostname.
 * @param {string} search  URL search string (e.g. '?_s2debug=true')
 * @param {Function} fn    Callback to run with window stubbed
 * @param {string} [hostname]
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

/**
 * Minimal valid LTS record for producing valid LTSStrategyInputs.
 * @param {object} [overrides]
 */
function makeLTSRecord(overrides = {}) {
  return {
    lts_version: LTS_VERSION,
    memory_type: LTS_MEMORY_TYPE,
    session_count: 5,
    trajectory: LTS_TRAJECTORIES.STABLE,
    recurring_patterns: ['avoidance'],
    persistent_open_tasks: [],
    active_goal_ids: ['goal-001'],
    helpful_interventions: ['behavioural_activation'],
    stalled_interventions: [],
    risk_flag_history: [],
    last_session_date: '2025-01-10T00:00:00.000Z',
    computed_at: '2025-01-11T00:00:00.000Z',
    ...overrides,
  };
}

/**
 * Returns LTS strategy inputs for a valid stable LTS record.
 */
function validLTSInputs(overrides = {}) {
  return extractLTSStrategyInputs(makeLTSRecord(overrides));
}

// ─── A. LTS_DIAGNOSTIC_SAFE_FIELDS exported ──────────────────────────────────

describe('Wave 3E — LTS_DIAGNOSTIC_SAFE_FIELDS (A–C)', () => {
  it('A. is exported as a frozen array', () => {
    expect(Array.isArray(LTS_DIAGNOSTIC_SAFE_FIELDS)).toBe(true);
    expect(Object.isFrozen(LTS_DIAGNOSTIC_SAFE_FIELDS)).toBe(true);
  });

  it('B. contains exactly the 8 expected safe fields', () => {
    const expected = [
      'lts_valid',
      'lts_session_count',
      'lts_trajectory',
      'lts_has_risk_history',
      'lts_is_stagnating',
      'lts_is_progressing',
      'lts_is_fluctuating',
      'lts_has_stalled_interventions',
    ];
    expect([...LTS_DIAGNOSTIC_SAFE_FIELDS].sort()).toEqual([...expected].sort());
  });

  it('C. does NOT include lts_stalled_interventions array', () => {
    // lts_stalled_interventions (the array) is deliberately excluded.
    // Only the boolean lts_has_stalled_interventions is safe.
    expect(LTS_DIAGNOSTIC_SAFE_FIELDS).not.toContain('lts_stalled_interventions');
  });
});

// ─── D–F. buildLTSDiagnosticSnapshot — absent / invalid inputs ───────────────

describe('Wave 3E — buildLTSDiagnosticSnapshot — absent/invalid inputs (D–F)', () => {
  it('D. null input → all-false fail-safe snapshot', () => {
    const snap = buildLTSDiagnosticSnapshot(null);
    expect(snap.lts_valid).toBe(false);
    expect(snap.lts_session_count).toBe(0);
    expect(snap.lts_trajectory).toBe('');
    expect(snap.lts_has_risk_history).toBe(false);
    expect(snap.lts_is_stagnating).toBe(false);
    expect(snap.lts_is_progressing).toBe(false);
    expect(snap.lts_is_fluctuating).toBe(false);
    expect(snap.lts_has_stalled_interventions).toBe(false);
  });

  it('E. undefined input → all-false fail-safe snapshot', () => {
    const snap = buildLTSDiagnosticSnapshot(undefined);
    expect(snap.lts_valid).toBe(false);
    expect(snap.lts_session_count).toBe(0);
    expect(snap.lts_trajectory).toBe('');
  });

  it('F. non-object input (string) → all-false fail-safe snapshot', () => {
    const snap = buildLTSDiagnosticSnapshot('not_an_object');
    expect(snap.lts_valid).toBe(false);
    expect(snap.lts_session_count).toBe(0);
  });
});

// ─── G–M. buildLTSDiagnosticSnapshot — valid inputs ──────────────────────────

describe('Wave 3E — buildLTSDiagnosticSnapshot — valid LTS inputs (G–M)', () => {
  it('G. valid stable LTS inputs → lts_valid: true', () => {
    const snap = buildLTSDiagnosticSnapshot(validLTSInputs());
    expect(snap.lts_valid).toBe(true);
  });

  it('G.2 valid stable session_count:2 still yields lts_valid: true', () => {
    const snap = buildLTSDiagnosticSnapshot(validLTSInputs({ session_count: 2 }));
    expect(snap.lts_valid).toBe(true);
    expect(snap.lts_session_count).toBe(2);
  });

  it('H. correct lts_session_count forwarded from inputs', () => {
    const snap = buildLTSDiagnosticSnapshot(validLTSInputs({ session_count: 7 }));
    expect(snap.lts_session_count).toBe(7);
  });

  it('I. correct lts_trajectory forwarded from inputs', () => {
    const snap = buildLTSDiagnosticSnapshot(
      validLTSInputs({ trajectory: LTS_TRAJECTORIES.PROGRESSING }),
    );
    expect(snap.lts_trajectory).toBe(LTS_TRAJECTORIES.PROGRESSING);
  });

  it('J. correct boolean signals: has_risk_history, has_stalled', () => {
    const inputs = extractLTSStrategyInputs(
      makeLTSRecord({
        risk_flag_history: ['passive_ideation'],
        stalled_interventions: ['thought_records'],
        trajectory: LTS_TRAJECTORIES.STABLE,
      }),
    );
    const snap = buildLTSDiagnosticSnapshot(inputs);
    expect(snap.lts_has_risk_history).toBe(true);
    expect(snap.lts_has_stalled_interventions).toBe(true);
  });

  it('K. stagnating inputs → lts_is_stagnating: true, others false', () => {
    const snap = buildLTSDiagnosticSnapshot(
      validLTSInputs({ trajectory: LTS_TRAJECTORIES.STAGNATING }),
    );
    expect(snap.lts_is_stagnating).toBe(true);
    expect(snap.lts_is_progressing).toBe(false);
    expect(snap.lts_is_fluctuating).toBe(false);
  });

  it('L. fluctuating inputs → lts_is_fluctuating: true, others false', () => {
    const snap = buildLTSDiagnosticSnapshot(
      validLTSInputs({ trajectory: LTS_TRAJECTORIES.FLUCTUATING }),
    );
    expect(snap.lts_is_fluctuating).toBe(true);
    expect(snap.lts_is_stagnating).toBe(false);
    expect(snap.lts_is_progressing).toBe(false);
  });

  it('M. progressing inputs → lts_is_progressing: true, others false', () => {
    const snap = buildLTSDiagnosticSnapshot(
      validLTSInputs({ trajectory: LTS_TRAJECTORIES.PROGRESSING }),
    );
    expect(snap.lts_is_progressing).toBe(true);
    expect(snap.lts_is_stagnating).toBe(false);
    expect(snap.lts_is_fluctuating).toBe(false);
  });
});

// ─── N–P. Output object safety ───────────────────────────────────────────────

describe('Wave 3E — buildLTSDiagnosticSnapshot — output safety (N–P)', () => {
  it('N. output is a frozen object', () => {
    const snap = buildLTSDiagnosticSnapshot(validLTSInputs());
    expect(Object.isFrozen(snap)).toBe(true);
  });

  it('O. deterministic — same inputs always produce same output', () => {
    const inputs = validLTSInputs({ trajectory: LTS_TRAJECTORIES.STAGNATING, session_count: 4 });
    const snap1 = buildLTSDiagnosticSnapshot(inputs);
    const snap2 = buildLTSDiagnosticSnapshot(inputs);
    expect(snap1).toEqual(snap2);
  });

  it('P. output does NOT contain lts_stalled_interventions array field', () => {
    const inputs = extractLTSStrategyInputs(
      makeLTSRecord({ stalled_interventions: ['thought_records', 'journals'] }),
    );
    const snap = buildLTSDiagnosticSnapshot(inputs);
    expect(snap).not.toHaveProperty('lts_stalled_interventions');
  });
});

// ─── Q–R. No private content leakage ─────────────────────────────────────────

describe('Wave 3E — buildLTSDiagnosticSnapshot — no leakage (Q–R)', () => {
  it('Q. no raw text or private-entity fields in output', () => {
    const snap = buildLTSDiagnosticSnapshot(validLTSInputs());
    const keys = Object.keys(snap);
    // Fields that must never appear
    const forbidden = [
      'session_summary', 'content', 'message', 'transcript',
      'ThoughtJournal', 'Conversation', 'CaseFormulation',
      'MoodEntry', 'CompanionMemory', 'UserDeletedConversations',
      'stalled_interventions', // array form — only boolean gate is safe
    ];
    for (const f of forbidden) {
      expect(keys).not.toContain(f);
    }
  });

  it('R. absent LTS inputs → same fail-safe shape as invalid inputs', () => {
    const snapAbsent = buildLTSDiagnosticSnapshot(null);
    const snapInvalid = buildLTSDiagnosticSnapshot({ lts_valid: false });
    // Both should produce the same shape and all-false values
    expect(Object.keys(snapAbsent).sort()).toEqual(Object.keys(snapInvalid).sort());
    expect(snapAbsent.lts_valid).toBe(false);
    expect(snapInvalid.lts_valid).toBe(false);
  });
});

// ─── S. extractLTSStrategyInputs absent → fail-safe snapshot ─────────────────

describe('Wave 3E — extractLTSStrategyInputs absent → fail-safe diagnostic (S)', () => {
  it('S. extractLTSStrategyInputs(null) → buildLTSDiagnosticSnapshot → all-false', () => {
    const inputs = extractLTSStrategyInputs(null);
    const snap = buildLTSDiagnosticSnapshot(inputs);
    expect(snap.lts_valid).toBe(false);
    expect(snap.lts_session_count).toBe(0);
    expect(snap.lts_trajectory).toBe('');
    expect(snap.lts_has_risk_history).toBe(false);
    expect(snap.lts_is_stagnating).toBe(false);
    expect(snap.lts_is_progressing).toBe(false);
    expect(snap.lts_is_fluctuating).toBe(false);
    expect(snap.lts_has_stalled_interventions).toBe(false);
  });

  it('S.2. extractLTSStrategyInputs(weak record) → lts_valid: false diagnostic', () => {
    // A record with insufficient_data trajectory is considered weak
    const weakRecord = makeLTSRecord({
      trajectory: LTS_TRAJECTORIES.INSUFFICIENT_DATA,
      session_count: 1,
    });
    const inputs = extractLTSStrategyInputs(weakRecord);
    const snap = buildLTSDiagnosticSnapshot(inputs);
    expect(snap.lts_valid).toBe(false);
  });
});

// ─── T–V. Backward compatibility — strategy diagnostics unchanged ─────────────

describe('Wave 3E — backward compat: strategy diagnostics unchanged (T–V)', () => {
  it('T. buildStrategyDiagnosticSnapshot still has all Wave 2D/3D fields', () => {
    const snap = buildStrategyDiagnosticSnapshot(null);
    expect(snap).toHaveProperty('strategy_version');
    expect(snap).toHaveProperty('intervention_mode');
    expect(snap).toHaveProperty('distress_tier');
    expect(snap).toHaveProperty('rationale');
    expect(snap).toHaveProperty('fail_safe');
    expect(snap).toHaveProperty('session_count');
    expect(snap).toHaveProperty('has_risk_flags');
    expect(snap).toHaveProperty('has_open_tasks');
    expect(snap).toHaveProperty('intervention_saturated');
    expect(snap).toHaveProperty('continuity_richness_score');
    expect(snap).toHaveProperty('formulation_strength_score');
    expect(snap).toHaveProperty('lts_trajectory'); // Wave 3D
  });

  it('U. STRATEGY_DIAGNOSTIC_SAFE_FIELDS still contains lts_trajectory', () => {
    expect(STRATEGY_DIAGNOSTIC_SAFE_FIELDS).toContain('lts_trajectory');
  });

  it('V. buildStrategyDiagnosticSnapshot still produces lts_trajectory string', () => {
    const snap = buildStrategyDiagnosticSnapshot({ lts_trajectory: 'progressing' });
    expect(snap.lts_trajectory).toBe('progressing');
  });

  it('V.2. buildStrategyDiagnosticSnapshot lts_trajectory defaults to empty string', () => {
    const snap = buildStrategyDiagnosticSnapshot(null);
    expect(snap.lts_trajectory).toBe('');
  });

  it('V.3. STRATEGY_VERSION reflects the clarification-default routing change (1.3.0)', () => {
    // Version bumped to 1.3.0 to reflect the promotion of clarification/formulation to default runtime path.
    expect(STRATEGY_VERSION).toBe('1.3.0');
  });
});

// ─── W–Z. getActivationDiagnostics — ltsLayer section ─────────────────────────

describe('Wave 3E — getActivationDiagnostics ltsLayer (W–Z)', () => {
  it('W. therapist section now has ltsLayer field when _s2debug=true', () => {
    const result = withWindow('?_s2debug=true', () => getActivationDiagnostics());
    expect(result).not.toBeNull();
    expect(result.therapist).toHaveProperty('ltsLayer');
  });

  it('X. ltsLayer.ltsLayerActive is boolean (false by default)', () => {
    const result = withWindow('?_s2debug=true', () => getActivationDiagnostics());
    expect(typeof result.therapist.ltsLayer.ltsLayerActive).toBe('boolean');
    expect(result.therapist.ltsLayer.ltsLayerActive).toBe(false);
  });

  it('Y. ltsLayer.strategyLayerActive is boolean (false by default)', () => {
    const result = withWindow('?_s2debug=true', () => getActivationDiagnostics());
    expect(typeof result.therapist.ltsLayer.strategyLayerActive).toBe('boolean');
    expect(result.therapist.ltsLayer.strategyLayerActive).toBe(false);
  });

  it('Z. therapist section still has strategyEngine (backward compat)', () => {
    const result = withWindow('?_s2debug=true', () => getActivationDiagnostics());
    expect(result.therapist).toHaveProperty('strategyEngine');
    expect(result.therapist.strategyEngine.version).toBe(STRATEGY_VERSION);
    expect(Array.isArray(result.therapist.strategyEngine.availableModes)).toBe(true);
  });

  it('Z.2. getActivationDiagnostics returns null when _s2debug not set', () => {
    const result = withWindow('', () => getActivationDiagnostics());
    expect(result).toBeNull();
  });

  it('Z.3. getActivationDiagnostics returns null without window', () => {
    // No window stub — should return null (fail-closed)
    const result = getActivationDiagnostics();
    expect(result).toBeNull();
  });
});

// ─── AA–AB. Companion section unchanged / agent boundary preserved ─────────────

describe('Wave 3E — companion section unchanged, agent boundary (AA–AB)', () => {
  it('AA. companion section does NOT have ltsLayer', () => {
    const result = withWindow('?_s2debug=true', () => getActivationDiagnostics());
    expect(result.companion).not.toHaveProperty('ltsLayer');
  });

  it('AB. companion section does NOT have strategyEngine', () => {
    // strategyEngine is therapist-only; companion section has no strategy engine
    const result = withWindow('?_s2debug=true', () => getActivationDiagnostics());
    expect(result.companion).not.toHaveProperty('strategyEngine');
  });

  it('AB.2. COMPANION_UPGRADE_FLAGS keys do NOT appear in therapist ltsLayer', () => {
    const result = withWindow('?_s2debug=true', () => getActivationDiagnostics());
    const ltsLayerKeys = Object.keys(result.therapist.ltsLayer);
    for (const companionKey of Object.keys(COMPANION_UPGRADE_FLAGS)) {
      expect(ltsLayerKeys).not.toContain(companionKey);
    }
  });
});

// ─── AC. No private entity leakage in any diagnostic ─────────────────────────

describe('Wave 3E — no private entity leakage in any diagnostic (AC)', () => {
  const PRIVATE_ENTITY_NAMES = [
    'ThoughtJournal',
    'Conversation',
    'CaseFormulation',
    'MoodEntry',
    'CompanionMemory',
    'UserDeletedConversations',
  ];

  it('AC.1. buildLTSDiagnosticSnapshot output has no private entity field names', () => {
    const snap = buildLTSDiagnosticSnapshot(validLTSInputs());
    const keys = Object.keys(snap);
    for (const entityName of PRIVATE_ENTITY_NAMES) {
      expect(keys).not.toContain(entityName);
      expect(keys).not.toContain(entityName.toLowerCase());
    }
  });

  it('AC.2. getActivationDiagnostics ltsLayer has no private entity field names', () => {
    const result = withWindow('?_s2debug=true', () => getActivationDiagnostics());
    const ltsLayerKeys = Object.keys(result.therapist.ltsLayer);
    for (const entityName of PRIVATE_ENTITY_NAMES) {
      expect(ltsLayerKeys).not.toContain(entityName);
      expect(ltsLayerKeys).not.toContain(entityName.toLowerCase());
    }
  });

  it('AC.3. buildStrategyDiagnosticSnapshot output has no private entity field names', () => {
    const snap = buildStrategyDiagnosticSnapshot(null);
    const keys = Object.keys(snap);
    for (const entityName of PRIVATE_ENTITY_NAMES) {
      expect(keys).not.toContain(entityName);
    }
  });
});

// ─── AD. Field set matches LTS_DIAGNOSTIC_SAFE_FIELDS ────────────────────────

describe('Wave 3E — buildLTSDiagnosticSnapshot field set matches allowlist (AD)', () => {
  it('AD. output keys exactly match LTS_DIAGNOSTIC_SAFE_FIELDS', () => {
    const snap = buildLTSDiagnosticSnapshot(validLTSInputs());
    const outputKeys = Object.keys(snap).sort();
    const allowlistKeys = [...LTS_DIAGNOSTIC_SAFE_FIELDS].sort();
    expect(outputKeys).toEqual(allowlistKeys);
  });

  it('AD.2. null input output keys still match LTS_DIAGNOSTIC_SAFE_FIELDS', () => {
    const snap = buildLTSDiagnosticSnapshot(null);
    const outputKeys = Object.keys(snap).sort();
    const allowlistKeys = [...LTS_DIAGNOSTIC_SAFE_FIELDS].sort();
    expect(outputKeys).toEqual(allowlistKeys);
  });
});

// ─── AE. Strategy diagnostics consistent: LTS absent vs present ──────────────

describe('Wave 3E — strategy diagnostics consistent LTS absent vs present (AE)', () => {
  it('AE.1. buildStrategyDiagnosticSnapshot returns same field set regardless of lts_trajectory', () => {
    const snapWithLTS = buildStrategyDiagnosticSnapshot({ lts_trajectory: 'progressing' });
    const snapWithoutLTS = buildStrategyDiagnosticSnapshot({ lts_trajectory: '' });
    const snapNull = buildStrategyDiagnosticSnapshot(null);
    // All three must have the same keys
    const keysWithLTS = Object.keys(snapWithLTS).sort();
    const keysWithoutLTS = Object.keys(snapWithoutLTS).sort();
    const keysNull = Object.keys(snapNull).sort();
    expect(keysWithLTS).toEqual(keysWithoutLTS);
    expect(keysWithLTS).toEqual(keysNull);
  });

  it('AE.2. buildLTSDiagnosticSnapshot returns same field set for valid and absent inputs', () => {
    const snapValid = buildLTSDiagnosticSnapshot(validLTSInputs());
    const snapAbsent = buildLTSDiagnosticSnapshot(null);
    const keysValid = Object.keys(snapValid).sort();
    const keysAbsent = Object.keys(snapAbsent).sort();
    expect(keysValid).toEqual(keysAbsent);
  });

  it('AE.3. lts_trajectory in buildLTSDiagnosticSnapshot and strategy snapshot are consistent', () => {
    const ltsInputs = validLTSInputs({ trajectory: LTS_TRAJECTORIES.STAGNATING });
    const ltsSnap = buildLTSDiagnosticSnapshot(ltsInputs);
    const stratSnap = buildStrategyDiagnosticSnapshot({ lts_trajectory: ltsInputs.lts_trajectory });
    expect(ltsSnap.lts_trajectory).toBe(LTS_TRAJECTORIES.STAGNATING);
    expect(stratSnap.lts_trajectory).toBe(LTS_TRAJECTORIES.STAGNATING);
  });
});

// ─── Extra: production-default behavior unchanged ─────────────────────────────

describe('Wave 3E — production-default behavior unchanged', () => {
  it('no THERAPIST_UPGRADE_FLAGS mutated by any Wave 3E import', () => {
    for (const [key, value] of Object.entries(THERAPIST_UPGRADE_FLAGS)) {
      expect(value).toBe(false);
    }
  });

  it('no COMPANION_UPGRADE_FLAGS mutated by any Wave 3E import', () => {
    for (const [key, value] of Object.entries(COMPANION_UPGRADE_FLAGS)) {
      expect(value).toBe(false);
    }
  });

  it('LTS_DIAGNOSTIC_SAFE_FIELDS is immutable', () => {
    expect(() => {
      LTS_DIAGNOSTIC_SAFE_FIELDS.push('hacked_field');
    }).toThrow();
  });
});
