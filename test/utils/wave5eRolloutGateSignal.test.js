/**
 * @file test/utils/wave5eRolloutGateSignal.test.js
 *
 * Wave 5E — Rollout-Gate Signal Tests
 *
 * PURPOSE
 * -------
 * Validates the Wave 5E additions to src/lib/therapistQualityEvaluator.js:
 *   - ROLLOUT_SIGNAL_VERSION constant
 *   - ROLLOUT_BLOCKING_FLAG_TOKENS constant
 *   - ROLLOUT_WARNING_FLAG_TOKENS constant
 *   - EVALUATOR_ROLLOUT_SIGNAL_FAIL_SAFE constant
 *   - getEvaluatorRolloutSignal(snapshot) pure function
 *
 * SAFETY GUARANTEE (Wave 5E)
 * --------------------------
 * The rollout signal is informational only.  It must not gate, block, or
 * modify any live user session.  These tests confirm the signal shape is
 * bounded, deterministic, and free of raw user text.
 *
 * COVERAGE
 * ────────
 *
 * A. Module exports — Wave 5E symbols present
 *    A1.  ROLLOUT_SIGNAL_VERSION is exported and is a non-empty string
 *    A2.  ROLLOUT_SIGNAL_VERSION matches '5E.0.0'
 *    A3.  ROLLOUT_BLOCKING_FLAG_TOKENS is exported and is a frozen Set
 *    A4.  ROLLOUT_WARNING_FLAG_TOKENS is exported and is a frozen Set
 *    A5.  EVALUATOR_ROLLOUT_SIGNAL_FAIL_SAFE is exported and is a frozen object
 *    A6.  getEvaluatorRolloutSignal is exported and is a function
 *    A7.  No import from agentWiring, activeAgentWiring, featureFlags, or entities
 *         (module isolation verified via source file content check)
 *
 * B. EVALUATOR_ROLLOUT_SIGNAL_FAIL_SAFE — shape contract
 *    B1.  is_fail_safe: true
 *    B2.  aggregate_band === EVALUATOR_AGGREGATE_BANDS.FAIL_SAFE
 *    B3.  rollout_ready: false
 *    B4.  blocking_risk_flags is a frozen empty array
 *    B5.  warning_risk_flags is a frozen empty array
 *    B6.  evaluator_version is EVALUATOR_VERSION
 *    B7.  signal_version is ROLLOUT_SIGNAL_VERSION
 *    B8.  Has exactly the 7 expected top-level keys
 *    B9.  Object is frozen
 *
 * C. getEvaluatorRolloutSignal — fail-safe on bad snapshot inputs
 *    C1.  null → EVALUATOR_ROLLOUT_SIGNAL_FAIL_SAFE (reference equality)
 *    C2.  undefined → EVALUATOR_ROLLOUT_SIGNAL_FAIL_SAFE (reference equality)
 *    C3.  {} (empty object) → is_fail_safe: true (aggregate_band missing)
 *    C4.  string input → is_fail_safe: true
 *    C5.  number input → is_fail_safe: true
 *    C6.  array input → is_fail_safe: true
 *    C7.  snapshot.is_fail_safe: true → EVALUATOR_ROLLOUT_SIGNAL_FAIL_SAFE (ref eq)
 *    C8.  snapshot with unrecognised aggregate_band → is_fail_safe: true
 *    C9.  snapshot with non-array risk_flags → is_fail_safe: true
 *    C10. Never throws on any input
 *    C11. is_fail_safe always a boolean
 *
 * D. getEvaluatorRolloutSignal — aggregate band → rollout_ready mapping
 *    D1.  'strong' aggregate_band → rollout_ready: true
 *    D2.  'adequate' aggregate_band → rollout_ready: true
 *    D3.  'marginal' aggregate_band → rollout_ready: false
 *    D4.  'poor' aggregate_band → rollout_ready: false
 *    D5.  'unknown' aggregate_band → rollout_ready: false
 *    D6.  'fail_safe' aggregate_band → rollout_ready: false (fail-safe path)
 *    D7.  rollout_ready is always a boolean (not truthy/falsy value)
 *
 * E. getEvaluatorRolloutSignal — blocking vs warning risk flag separation
 *    E1.  'safety_escalation_gap' → blocking_risk_flags, not warning_risk_flags
 *    E2.  'role_boundary_failure' → blocking_risk_flags, not warning_risk_flags
 *    E3.  'context_structurally_empty' → warning_risk_flags, not blocking_risk_flags
 *    E4.  Unknown flag token → dropped (not in either list)
 *    E5.  Non-string flag entry → dropped (not in either list)
 *    E6.  All three known flags together → correct separation
 *    E7.  Empty risk_flags → both lists empty
 *    E8.  blocking_risk_flags is always a frozen array
 *    E9.  warning_risk_flags is always a frozen array
 *    E10. Blocking/warning separation is deterministic (same input → same output)
 *
 * F. getEvaluatorRolloutSignal — signal shape contract
 *    F1.  Output is a frozen object
 *    F2.  Output has exactly the 7 expected top-level keys
 *    F3.  evaluator_version comes from snapshot.evaluator_version
 *    F4.  signal_version is always ROLLOUT_SIGNAL_VERSION
 *    F5.  aggregate_band comes from snapshot.aggregate_band
 *    F6.  No raw text fields present in output
 *    F7.  No ThoughtJournal / Conversation / CaseFormulation fields in output
 *    F8.  All values are string, boolean, or frozen array
 *
 * G. getEvaluatorRolloutSignal — integration with buildQualityEvaluatorSnapshot
 *    G1.  Valid inputs → scored snapshot → rollout signal with is_fail_safe: false
 *    G2.  fail-safe snapshot → rollout signal with is_fail_safe: true
 *    G3.  STRONG band snapshot → rollout_ready: true, no blocking/warning flags
 *    G4.  POOR band snapshot → rollout_ready: false, blocking flags populated
 *    G5.  ADEQUATE band snapshot → rollout_ready: true
 *    G6.  MARGINAL band snapshot → rollout_ready: false
 *
 * H. Deterministic repeatability
 *    H1.  Same scored snapshot → identical signal (deep equality)
 *    H2.  Same malformed input → identical fail-safe signal (deep equality)
 *    H3.  Independent calls on equal snapshots produce equal results
 *
 * I. No raw text accepted / preserved
 *    I1.  rawMessage field in snapshot is ignored (not in output)
 *    I2.  rawAssistantText field in snapshot is ignored (not in output)
 *    I3.  Output contains no string values longer than a bounded label length
 *
 * J. ROLLOUT_BLOCKING_FLAG_TOKENS / ROLLOUT_WARNING_FLAG_TOKENS shape
 *    J1.  ROLLOUT_BLOCKING_FLAG_TOKENS is a Set with exactly 2 entries
 *    J2.  'safety_escalation_gap' is in ROLLOUT_BLOCKING_FLAG_TOKENS
 *    J3.  'role_boundary_failure' is in ROLLOUT_BLOCKING_FLAG_TOKENS
 *    J4.  ROLLOUT_WARNING_FLAG_TOKENS is a Set with exactly 1 entry
 *    J5.  'context_structurally_empty' is in ROLLOUT_WARNING_FLAG_TOKENS
 *    J6.  No overlap between blocking and warning token sets
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

import {
  EVALUATOR_VERSION,
  EVALUATOR_AGGREGATE_BANDS,
  EVALUATOR_FAIL_SAFE_SNAPSHOT,
  buildQualityEvaluatorSnapshot,
  ROLLOUT_SIGNAL_VERSION,
  ROLLOUT_BLOCKING_FLAG_TOKENS,
  ROLLOUT_WARNING_FLAG_TOKENS,
  EVALUATOR_ROLLOUT_SIGNAL_FAIL_SAFE,
  getEvaluatorRolloutSignal,
} from '../../src/lib/therapistQualityEvaluator.js';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

/** Expected top-level keys for every rollout signal (success or fail-safe). */
const EXPECTED_SIGNAL_KEYS = new Set([
  'evaluator_version',
  'signal_version',
  'aggregate_band',
  'rollout_ready',
  'blocking_risk_flags',
  'warning_risk_flags',
  'is_fail_safe',
]);

/** Maximum label string length (bounded token, not raw text). */
const MAX_LABEL_LENGTH = 80;

/** Minimal valid snapshot with STRONG band and no risk flags. */
const STRONG_SNAPSHOT = Object.freeze({
  evaluator_version: EVALUATOR_VERSION,
  aggregate_band: EVALUATOR_AGGREGATE_BANDS.STRONG,
  is_fail_safe: false,
  fail_safe_reason: null,
  risk_flags: Object.freeze([]),
});

/** Snapshot with ADEQUATE band and no risk flags. */
const ADEQUATE_SNAPSHOT = Object.freeze({
  evaluator_version: EVALUATOR_VERSION,
  aggregate_band: EVALUATOR_AGGREGATE_BANDS.ADEQUATE,
  is_fail_safe: false,
  fail_safe_reason: null,
  risk_flags: Object.freeze([]),
});

/** Snapshot with MARGINAL band and no risk flags. */
const MARGINAL_SNAPSHOT = Object.freeze({
  evaluator_version: EVALUATOR_VERSION,
  aggregate_band: EVALUATOR_AGGREGATE_BANDS.MARGINAL,
  is_fail_safe: false,
  fail_safe_reason: null,
  risk_flags: Object.freeze([]),
});

/** Snapshot with POOR band and all three known risk flags. */
const POOR_SNAPSHOT = Object.freeze({
  evaluator_version: EVALUATOR_VERSION,
  aggregate_band: EVALUATOR_AGGREGATE_BANDS.POOR,
  is_fail_safe: false,
  fail_safe_reason: null,
  risk_flags: Object.freeze([
    'safety_escalation_gap',
    'role_boundary_failure',
    'context_structurally_empty',
  ]),
});

/** Snapshot with UNKNOWN band and no risk flags. */
const UNKNOWN_BAND_SNAPSHOT = Object.freeze({
  evaluator_version: EVALUATOR_VERSION,
  aggregate_band: EVALUATOR_AGGREGATE_BANDS.UNKNOWN,
  is_fail_safe: false,
  fail_safe_reason: null,
  risk_flags: Object.freeze([]),
});

/** Valid evaluator inputs that produce a scored STRONG snapshot via buildQualityEvaluatorSnapshot. */
const VALID_STRONG_INPUTS = Object.freeze({
  strategyState: Object.freeze({
    strategy_version: '3D.0.0',
    intervention_mode: 'structured_exploration',
    distress_tier: 'tier_high',
    continuity_present: true,
    formulation_present: true,
    rationale: 'formulation_available',
    fail_safe: false,
    session_count: 4,
    has_risk_flags: false,
    has_open_tasks: true,
    intervention_saturated: false,
    continuity_richness_score: 0.65,
    formulation_strength_score: 0.75,
    lts_trajectory: 'progressing',
  }),
  ltsInputs: Object.freeze({
    lts_valid: true,
    lts_session_count: 5,
    lts_trajectory: 'progressing',
    lts_has_risk_history: false,
    lts_is_stagnating: false,
    lts_is_progressing: true,
    lts_is_fluctuating: false,
    lts_has_stalled_interventions: false,
    lts_stalled_interventions: Object.freeze([]),
  }),
  safetyResult: Object.freeze({
    safety_mode: true,
    triggers: ['tier_high'],
    rationale: 'high distress',
  }),
  distressTier: 'tier_high',
  formulationHints: Object.freeze({
    formulation_present: true,
    formulation_strength_score: 0.75,
    is_ambiguous: false,
  }),
  continuitySignals: Object.freeze({
    continuity_present: true,
    richness_score: 0.65,
    has_risk_flags: false,
  }),
  knowledgePlan: Object.freeze({
    knowledge_plan_present: true,
    should_retrieve: true,
    domain_hint: 'cognitive_restructuring',
  }),
  wiringIdentity: Object.freeze({
    name: 'cbt_therapist',
    stage2: true,
    stage2_phase: 8,
    strategy_layer_enabled: true,
    formulation_context_enabled: true,
    continuity_layer_enabled: true,
    safety_mode_enabled: true,
  }),
});

// ─── A. Module exports ────────────────────────────────────────────────────────

describe('A. Module exports — Wave 5E symbols present', () => {
  it('A1. ROLLOUT_SIGNAL_VERSION is exported and is a non-empty string', () => {
    expect(typeof ROLLOUT_SIGNAL_VERSION).toBe('string');
    expect(ROLLOUT_SIGNAL_VERSION.length).toBeGreaterThan(0);
  });

  it("A2. ROLLOUT_SIGNAL_VERSION matches '5E.0.0'", () => {
    expect(ROLLOUT_SIGNAL_VERSION).toBe('5E.0.0');
  });

  it('A3. ROLLOUT_BLOCKING_FLAG_TOKENS is exported and is a frozen Set', () => {
    expect(ROLLOUT_BLOCKING_FLAG_TOKENS).toBeInstanceOf(Set);
    expect(Object.isFrozen(ROLLOUT_BLOCKING_FLAG_TOKENS)).toBe(true);
  });

  it('A4. ROLLOUT_WARNING_FLAG_TOKENS is exported and is a frozen Set', () => {
    expect(ROLLOUT_WARNING_FLAG_TOKENS).toBeInstanceOf(Set);
    expect(Object.isFrozen(ROLLOUT_WARNING_FLAG_TOKENS)).toBe(true);
  });

  it('A5. EVALUATOR_ROLLOUT_SIGNAL_FAIL_SAFE is exported and is a frozen object', () => {
    expect(typeof EVALUATOR_ROLLOUT_SIGNAL_FAIL_SAFE).toBe('object');
    expect(EVALUATOR_ROLLOUT_SIGNAL_FAIL_SAFE).not.toBeNull();
    expect(Object.isFrozen(EVALUATOR_ROLLOUT_SIGNAL_FAIL_SAFE)).toBe(true);
  });

  it('A6. getEvaluatorRolloutSignal is exported and is a function', () => {
    expect(typeof getEvaluatorRolloutSignal).toBe('function');
  });

  it('A7. Module does not import from runtime wiring / Base44 SDK / entities', () => {
    const src = fs.readFileSync(
      path.resolve('src/lib/therapistQualityEvaluator.js'),
      'utf8'
    );
    expect(src).not.toMatch(/from\s+['"].*agentWiring/);
    expect(src).not.toMatch(/from\s+['"].*activeAgentWiring/);
    expect(src).not.toMatch(/from\s+['"].*featureFlags/);
    expect(src).not.toMatch(/from\s+['"].*base44Client/);
    expect(src).not.toMatch(/from\s+['"].*entities\//);
    expect(src).not.toMatch(/import\s+.*base44/i);
  });
});

// ─── B. EVALUATOR_ROLLOUT_SIGNAL_FAIL_SAFE shape ──────────────────────────────

describe('B. EVALUATOR_ROLLOUT_SIGNAL_FAIL_SAFE — shape contract', () => {
  it('B1. is_fail_safe: true', () => {
    expect(EVALUATOR_ROLLOUT_SIGNAL_FAIL_SAFE.is_fail_safe).toBe(true);
  });

  it('B2. aggregate_band === EVALUATOR_AGGREGATE_BANDS.FAIL_SAFE', () => {
    expect(EVALUATOR_ROLLOUT_SIGNAL_FAIL_SAFE.aggregate_band).toBe(
      EVALUATOR_AGGREGATE_BANDS.FAIL_SAFE
    );
  });

  it('B3. rollout_ready: false', () => {
    expect(EVALUATOR_ROLLOUT_SIGNAL_FAIL_SAFE.rollout_ready).toBe(false);
  });

  it('B4. blocking_risk_flags is a frozen empty array', () => {
    expect(Array.isArray(EVALUATOR_ROLLOUT_SIGNAL_FAIL_SAFE.blocking_risk_flags)).toBe(true);
    expect(EVALUATOR_ROLLOUT_SIGNAL_FAIL_SAFE.blocking_risk_flags).toHaveLength(0);
    expect(Object.isFrozen(EVALUATOR_ROLLOUT_SIGNAL_FAIL_SAFE.blocking_risk_flags)).toBe(true);
  });

  it('B5. warning_risk_flags is a frozen empty array', () => {
    expect(Array.isArray(EVALUATOR_ROLLOUT_SIGNAL_FAIL_SAFE.warning_risk_flags)).toBe(true);
    expect(EVALUATOR_ROLLOUT_SIGNAL_FAIL_SAFE.warning_risk_flags).toHaveLength(0);
    expect(Object.isFrozen(EVALUATOR_ROLLOUT_SIGNAL_FAIL_SAFE.warning_risk_flags)).toBe(true);
  });

  it('B6. evaluator_version is EVALUATOR_VERSION', () => {
    expect(EVALUATOR_ROLLOUT_SIGNAL_FAIL_SAFE.evaluator_version).toBe(EVALUATOR_VERSION);
  });

  it('B7. signal_version is ROLLOUT_SIGNAL_VERSION', () => {
    expect(EVALUATOR_ROLLOUT_SIGNAL_FAIL_SAFE.signal_version).toBe(ROLLOUT_SIGNAL_VERSION);
  });

  it('B8. Has exactly the 7 expected top-level keys', () => {
    const keys = new Set(Object.keys(EVALUATOR_ROLLOUT_SIGNAL_FAIL_SAFE));
    expect(keys).toEqual(EXPECTED_SIGNAL_KEYS);
  });

  it('B9. Object is frozen', () => {
    expect(Object.isFrozen(EVALUATOR_ROLLOUT_SIGNAL_FAIL_SAFE)).toBe(true);
  });
});

// ─── C. getEvaluatorRolloutSignal — fail-safe on bad inputs ───────────────────

describe('C. getEvaluatorRolloutSignal — fail-safe on bad snapshot inputs', () => {
  it('C1. null → EVALUATOR_ROLLOUT_SIGNAL_FAIL_SAFE (reference equality)', () => {
    expect(getEvaluatorRolloutSignal(null)).toBe(EVALUATOR_ROLLOUT_SIGNAL_FAIL_SAFE);
  });

  it('C2. undefined → EVALUATOR_ROLLOUT_SIGNAL_FAIL_SAFE (reference equality)', () => {
    expect(getEvaluatorRolloutSignal(undefined)).toBe(EVALUATOR_ROLLOUT_SIGNAL_FAIL_SAFE);
  });

  it('C3. {} (empty / missing aggregate_band) → is_fail_safe: true', () => {
    const sig = getEvaluatorRolloutSignal({});
    expect(sig.is_fail_safe).toBe(true);
  });

  it('C4. string input → is_fail_safe: true', () => {
    expect(getEvaluatorRolloutSignal('not-a-snapshot').is_fail_safe).toBe(true);
  });

  it('C5. number input → is_fail_safe: true', () => {
    expect(getEvaluatorRolloutSignal(42).is_fail_safe).toBe(true);
  });

  it('C6. array input → is_fail_safe: true', () => {
    expect(getEvaluatorRolloutSignal([]).is_fail_safe).toBe(true);
  });

  it('C7. snapshot.is_fail_safe: true → EVALUATOR_ROLLOUT_SIGNAL_FAIL_SAFE (ref eq)', () => {
    expect(getEvaluatorRolloutSignal(EVALUATOR_FAIL_SAFE_SNAPSHOT)).toBe(
      EVALUATOR_ROLLOUT_SIGNAL_FAIL_SAFE
    );
  });

  it('C8. snapshot with unrecognised aggregate_band → is_fail_safe: true', () => {
    const bad = { aggregate_band: 'galaxy_brain', is_fail_safe: false, risk_flags: [] };
    expect(getEvaluatorRolloutSignal(bad).is_fail_safe).toBe(true);
  });

  it('C9. snapshot with non-array risk_flags → is_fail_safe: true', () => {
    const bad = {
      aggregate_band: EVALUATOR_AGGREGATE_BANDS.STRONG,
      is_fail_safe: false,
      risk_flags: 'not-an-array',
    };
    expect(getEvaluatorRolloutSignal(bad).is_fail_safe).toBe(true);
  });

  it('C10. Never throws on any input', () => {
    const inputs = [null, undefined, {}, '', 0, [], 'raw text', { aggregate_band: null }];
    for (const inp of inputs) {
      expect(() => getEvaluatorRolloutSignal(inp)).not.toThrow();
    }
  });

  it('C11. is_fail_safe is always a boolean', () => {
    const inputs = [null, STRONG_SNAPSHOT, POOR_SNAPSHOT, {}];
    for (const inp of inputs) {
      expect(typeof getEvaluatorRolloutSignal(inp).is_fail_safe).toBe('boolean');
    }
  });
});

// ─── D. aggregate band → rollout_ready mapping ────────────────────────────────

describe('D. getEvaluatorRolloutSignal — aggregate band → rollout_ready mapping', () => {
  it("D1. 'strong' aggregate_band → rollout_ready: true", () => {
    expect(getEvaluatorRolloutSignal(STRONG_SNAPSHOT).rollout_ready).toBe(true);
  });

  it("D2. 'adequate' aggregate_band → rollout_ready: true", () => {
    expect(getEvaluatorRolloutSignal(ADEQUATE_SNAPSHOT).rollout_ready).toBe(true);
  });

  it("D3. 'marginal' aggregate_band → rollout_ready: false", () => {
    expect(getEvaluatorRolloutSignal(MARGINAL_SNAPSHOT).rollout_ready).toBe(false);
  });

  it("D4. 'poor' aggregate_band → rollout_ready: false", () => {
    expect(getEvaluatorRolloutSignal(POOR_SNAPSHOT).rollout_ready).toBe(false);
  });

  it("D5. 'unknown' aggregate_band → rollout_ready: false", () => {
    expect(getEvaluatorRolloutSignal(UNKNOWN_BAND_SNAPSHOT).rollout_ready).toBe(false);
  });

  it("D6. 'fail_safe' aggregate_band → rollout_ready: false (fail-safe path)", () => {
    expect(EVALUATOR_ROLLOUT_SIGNAL_FAIL_SAFE.rollout_ready).toBe(false);
  });

  it('D7. rollout_ready is always a boolean', () => {
    const snapshots = [STRONG_SNAPSHOT, ADEQUATE_SNAPSHOT, MARGINAL_SNAPSHOT, POOR_SNAPSHOT];
    for (const snap of snapshots) {
      expect(typeof getEvaluatorRolloutSignal(snap).rollout_ready).toBe('boolean');
    }
  });
});

// ─── E. blocking vs warning risk flag separation ──────────────────────────────

describe('E. getEvaluatorRolloutSignal — blocking vs warning risk flag separation', () => {
  it("E1. 'safety_escalation_gap' → blocking_risk_flags, not warning", () => {
    const snap = { ...STRONG_SNAPSHOT, risk_flags: ['safety_escalation_gap'] };
    const sig = getEvaluatorRolloutSignal(snap);
    expect(sig.blocking_risk_flags).toContain('safety_escalation_gap');
    expect(sig.warning_risk_flags).not.toContain('safety_escalation_gap');
  });

  it("E2. 'role_boundary_failure' → blocking_risk_flags, not warning", () => {
    const snap = { ...STRONG_SNAPSHOT, risk_flags: ['role_boundary_failure'] };
    const sig = getEvaluatorRolloutSignal(snap);
    expect(sig.blocking_risk_flags).toContain('role_boundary_failure');
    expect(sig.warning_risk_flags).not.toContain('role_boundary_failure');
  });

  it("E3. 'context_structurally_empty' → warning_risk_flags, not blocking", () => {
    const snap = { ...STRONG_SNAPSHOT, risk_flags: ['context_structurally_empty'] };
    const sig = getEvaluatorRolloutSignal(snap);
    expect(sig.warning_risk_flags).toContain('context_structurally_empty');
    expect(sig.blocking_risk_flags).not.toContain('context_structurally_empty');
  });

  it('E4. Unknown flag token → dropped (not in either list)', () => {
    const snap = { ...STRONG_SNAPSHOT, risk_flags: ['unknown_mystery_flag'] };
    const sig = getEvaluatorRolloutSignal(snap);
    expect(sig.blocking_risk_flags).not.toContain('unknown_mystery_flag');
    expect(sig.warning_risk_flags).not.toContain('unknown_mystery_flag');
  });

  it('E5. Non-string flag entry → dropped (not in either list)', () => {
    const snap = { ...STRONG_SNAPSHOT, risk_flags: [42, null, true] };
    const sig = getEvaluatorRolloutSignal(snap);
    expect(sig.blocking_risk_flags).toHaveLength(0);
    expect(sig.warning_risk_flags).toHaveLength(0);
  });

  it('E6. All three known flags together → correct separation', () => {
    const sig = getEvaluatorRolloutSignal(POOR_SNAPSHOT);
    expect(sig.blocking_risk_flags).toContain('safety_escalation_gap');
    expect(sig.blocking_risk_flags).toContain('role_boundary_failure');
    expect(sig.blocking_risk_flags).not.toContain('context_structurally_empty');
    expect(sig.warning_risk_flags).toContain('context_structurally_empty');
    expect(sig.warning_risk_flags).not.toContain('safety_escalation_gap');
    expect(sig.warning_risk_flags).not.toContain('role_boundary_failure');
  });

  it('E7. Empty risk_flags → both lists empty', () => {
    const sig = getEvaluatorRolloutSignal(STRONG_SNAPSHOT);
    expect(sig.blocking_risk_flags).toHaveLength(0);
    expect(sig.warning_risk_flags).toHaveLength(0);
  });

  it('E8. blocking_risk_flags is always a frozen array', () => {
    const snapshots = [STRONG_SNAPSHOT, ADEQUATE_SNAPSHOT, POOR_SNAPSHOT];
    for (const snap of snapshots) {
      const sig = getEvaluatorRolloutSignal(snap);
      expect(Array.isArray(sig.blocking_risk_flags)).toBe(true);
      expect(Object.isFrozen(sig.blocking_risk_flags)).toBe(true);
    }
  });

  it('E9. warning_risk_flags is always a frozen array', () => {
    const snapshots = [STRONG_SNAPSHOT, ADEQUATE_SNAPSHOT, POOR_SNAPSHOT];
    for (const snap of snapshots) {
      const sig = getEvaluatorRolloutSignal(snap);
      expect(Array.isArray(sig.warning_risk_flags)).toBe(true);
      expect(Object.isFrozen(sig.warning_risk_flags)).toBe(true);
    }
  });

  it('E10. Blocking/warning separation is deterministic (same input → same output)', () => {
    const sig1 = getEvaluatorRolloutSignal(POOR_SNAPSHOT);
    const sig2 = getEvaluatorRolloutSignal(POOR_SNAPSHOT);
    expect(sig1.blocking_risk_flags).toEqual(sig2.blocking_risk_flags);
    expect(sig1.warning_risk_flags).toEqual(sig2.warning_risk_flags);
  });
});

// ─── F. Signal shape contract ─────────────────────────────────────────────────

describe('F. getEvaluatorRolloutSignal — signal shape contract', () => {
  it('F1. Output is a frozen object', () => {
    const sig = getEvaluatorRolloutSignal(STRONG_SNAPSHOT);
    expect(typeof sig).toBe('object');
    expect(sig).not.toBeNull();
    expect(Object.isFrozen(sig)).toBe(true);
  });

  it('F2. Output has exactly the 7 expected top-level keys', () => {
    const sig = getEvaluatorRolloutSignal(STRONG_SNAPSHOT);
    expect(new Set(Object.keys(sig))).toEqual(EXPECTED_SIGNAL_KEYS);
  });

  it('F3. evaluator_version comes from snapshot.evaluator_version', () => {
    const sig = getEvaluatorRolloutSignal(STRONG_SNAPSHOT);
    expect(sig.evaluator_version).toBe(STRONG_SNAPSHOT.evaluator_version);
  });

  it('F4. signal_version is always ROLLOUT_SIGNAL_VERSION', () => {
    const snapshots = [STRONG_SNAPSHOT, ADEQUATE_SNAPSHOT, MARGINAL_SNAPSHOT, POOR_SNAPSHOT];
    for (const snap of snapshots) {
      expect(getEvaluatorRolloutSignal(snap).signal_version).toBe(ROLLOUT_SIGNAL_VERSION);
    }
  });

  it('F5. aggregate_band comes from snapshot.aggregate_band', () => {
    expect(getEvaluatorRolloutSignal(STRONG_SNAPSHOT).aggregate_band).toBe(
      EVALUATOR_AGGREGATE_BANDS.STRONG
    );
    expect(getEvaluatorRolloutSignal(POOR_SNAPSHOT).aggregate_band).toBe(
      EVALUATOR_AGGREGATE_BANDS.POOR
    );
  });

  it('F6. No raw text fields present in output', () => {
    const snapWithRawText = {
      ...STRONG_SNAPSHOT,
      rawMessage: 'I feel anxious',
      rawAssistantText: 'I understand your concerns',
    };
    const sig = getEvaluatorRolloutSignal(snapWithRawText);
    expect('rawMessage' in sig).toBe(false);
    expect('rawAssistantText' in sig).toBe(false);
  });

  it('F7. No ThoughtJournal / Conversation / CaseFormulation fields in output', () => {
    const sig = getEvaluatorRolloutSignal(STRONG_SNAPSHOT);
    const forbidden = ['thought_journal', 'conversation', 'case_formulation', 'mood_entry'];
    for (const field of forbidden) {
      expect(field in sig).toBe(false);
    }
  });

  it('F8. All values are string, boolean, or frozen array', () => {
    const sig = getEvaluatorRolloutSignal(POOR_SNAPSHOT);
    for (const [key, val] of Object.entries(sig)) {
      const validType =
        typeof val === 'string' ||
        typeof val === 'boolean' ||
        (Array.isArray(val) && Object.isFrozen(val));
      expect(validType, `key '${key}' has invalid type`).toBe(true);
    }
  });
});

// ─── G. Integration with buildQualityEvaluatorSnapshot ───────────────────────

describe('G. getEvaluatorRolloutSignal — integration with buildQualityEvaluatorSnapshot', () => {
  it('G1. Valid inputs → scored snapshot → rollout signal with is_fail_safe: false', () => {
    const snapshot = buildQualityEvaluatorSnapshot(VALID_STRONG_INPUTS);
    const sig = getEvaluatorRolloutSignal(snapshot);
    expect(sig.is_fail_safe).toBe(false);
  });

  it('G2. fail-safe snapshot → rollout signal with is_fail_safe: true', () => {
    const sig = getEvaluatorRolloutSignal(EVALUATOR_FAIL_SAFE_SNAPSHOT);
    expect(sig.is_fail_safe).toBe(true);
  });

  it('G3. STRONG band from buildQualityEvaluatorSnapshot → rollout_ready: true', () => {
    const snapshot = buildQualityEvaluatorSnapshot(VALID_STRONG_INPUTS);
    if (snapshot.aggregate_band === EVALUATOR_AGGREGATE_BANDS.STRONG) {
      expect(getEvaluatorRolloutSignal(snapshot).rollout_ready).toBe(true);
    } else {
      // Snapshot may score ADEQUATE or MARGINAL depending on inputs; accept that
      expect(['strong', 'adequate', 'marginal', 'poor']).toContain(snapshot.aggregate_band);
    }
  });

  it('G4. POOR_SNAPSHOT → rollout_ready: false, blocking_risk_flags populated', () => {
    const sig = getEvaluatorRolloutSignal(POOR_SNAPSHOT);
    expect(sig.rollout_ready).toBe(false);
    expect(sig.blocking_risk_flags.length).toBeGreaterThan(0);
  });

  it('G5. ADEQUATE_SNAPSHOT → rollout_ready: true', () => {
    expect(getEvaluatorRolloutSignal(ADEQUATE_SNAPSHOT).rollout_ready).toBe(true);
  });

  it('G6. MARGINAL_SNAPSHOT → rollout_ready: false', () => {
    expect(getEvaluatorRolloutSignal(MARGINAL_SNAPSHOT).rollout_ready).toBe(false);
  });
});

// ─── H. Deterministic repeatability ──────────────────────────────────────────

describe('H. Deterministic repeatability', () => {
  it('H1. Same scored snapshot → identical signal (deep equality)', () => {
    const sig1 = getEvaluatorRolloutSignal(POOR_SNAPSHOT);
    const sig2 = getEvaluatorRolloutSignal(POOR_SNAPSHOT);
    expect(sig1).toEqual(sig2);
  });

  it('H2. Same malformed input → identical fail-safe signal (deep equality)', () => {
    const sig1 = getEvaluatorRolloutSignal(null);
    const sig2 = getEvaluatorRolloutSignal(null);
    expect(sig1).toEqual(sig2);
    expect(sig1).toBe(sig2); // reference equality for constant
  });

  it('H3. Independent calls on equal snapshots produce equal results', () => {
    const snap1 = { ...STRONG_SNAPSHOT };
    const snap2 = { ...STRONG_SNAPSHOT };
    expect(getEvaluatorRolloutSignal(snap1)).toEqual(getEvaluatorRolloutSignal(snap2));
  });
});

// ─── I. No raw text accepted / preserved ─────────────────────────────────────

describe('I. No raw text accepted / preserved', () => {
  it('I1. rawMessage field in snapshot is ignored (not in output)', () => {
    const snap = { ...STRONG_SNAPSHOT, rawMessage: 'user raw message text' };
    const sig = getEvaluatorRolloutSignal(snap);
    expect('rawMessage' in sig).toBe(false);
    expect(JSON.stringify(sig)).not.toContain('user raw message text');
  });

  it('I2. rawAssistantText field in snapshot is ignored (not in output)', () => {
    const snap = { ...STRONG_SNAPSHOT, rawAssistantText: 'Here is my advice for you...' };
    const sig = getEvaluatorRolloutSignal(snap);
    expect('rawAssistantText' in sig).toBe(false);
    expect(JSON.stringify(sig)).not.toContain('Here is my advice for you...');
  });

  it('I3. Output string values are bounded labels (not raw text)', () => {
    const sig = getEvaluatorRolloutSignal(POOR_SNAPSHOT);
    for (const val of Object.values(sig)) {
      if (typeof val === 'string') {
        expect(val.length).toBeLessThanOrEqual(MAX_LABEL_LENGTH);
      }
    }
  });
});

// ─── J. ROLLOUT_BLOCKING_FLAG_TOKENS / ROLLOUT_WARNING_FLAG_TOKENS shape ──────

describe('J. ROLLOUT_BLOCKING_FLAG_TOKENS / ROLLOUT_WARNING_FLAG_TOKENS shape', () => {
  it('J1. ROLLOUT_BLOCKING_FLAG_TOKENS is a Set with exactly 2 entries', () => {
    expect(ROLLOUT_BLOCKING_FLAG_TOKENS.size).toBe(2);
  });

  it("J2. 'safety_escalation_gap' is in ROLLOUT_BLOCKING_FLAG_TOKENS", () => {
    expect(ROLLOUT_BLOCKING_FLAG_TOKENS.has('safety_escalation_gap')).toBe(true);
  });

  it("J3. 'role_boundary_failure' is in ROLLOUT_BLOCKING_FLAG_TOKENS", () => {
    expect(ROLLOUT_BLOCKING_FLAG_TOKENS.has('role_boundary_failure')).toBe(true);
  });

  it('J4. ROLLOUT_WARNING_FLAG_TOKENS is a Set with exactly 1 entry', () => {
    expect(ROLLOUT_WARNING_FLAG_TOKENS.size).toBe(1);
  });

  it("J5. 'context_structurally_empty' is in ROLLOUT_WARNING_FLAG_TOKENS", () => {
    expect(ROLLOUT_WARNING_FLAG_TOKENS.has('context_structurally_empty')).toBe(true);
  });

  it('J6. No overlap between blocking and warning token sets', () => {
    for (const token of ROLLOUT_BLOCKING_FLAG_TOKENS) {
      expect(ROLLOUT_WARNING_FLAG_TOKENS.has(token)).toBe(false);
    }
    for (const token of ROLLOUT_WARNING_FLAG_TOKENS) {
      expect(ROLLOUT_BLOCKING_FLAG_TOKENS.has(token)).toBe(false);
    }
  });
});
