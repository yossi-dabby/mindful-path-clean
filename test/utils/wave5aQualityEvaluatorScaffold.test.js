/**
 * @file test/utils/wave5aQualityEvaluatorScaffold.test.js
 *
 * Wave 5A — Quality Evaluator Scaffold Tests
 *
 * PURPOSE
 * -------
 * Validates the Wave 5A scaffold additions:
 *   - src/lib/therapistQualityEvaluator.js
 *   - QUALITY_EVALUATOR_FLAGS in src/lib/featureFlags.js
 *
 * Verifies the full evaluator contract: exports, dimension stability, score
 * band bounds, aggregate band bounds, fail-safe snapshot shape, deterministic
 * repeatability, bad-input handling, and module isolation.
 *
 * COVERAGE (per Wave 5A problem statement)
 * ────────────────────────────────────────
 *
 * A. Module export existence
 *    A1.  EVALUATOR_VERSION is exported
 *    A2.  QUALITY_DIMENSIONS is exported
 *    A3.  EVALUATOR_SCORE_BANDS is exported
 *    A4.  EVALUATOR_AGGREGATE_BANDS is exported
 *    A5.  EVALUATOR_FAIL_SAFE_SNAPSHOT is exported
 *    A6.  buildQualityEvaluatorSnapshot is exported and is a function
 *    A7.  ACTIVE_QUALITY_DIMENSIONS is exported and is an array
 *
 * B. EVALUATOR_VERSION
 *    B1.  Is a non-empty string
 *    B2.  Matches '5B.0.0' (version stability)
 *
 * C. QUALITY_DIMENSIONS
 *    C1.  Is a frozen object
 *    C2.  Contains all 7 active dimension keys
 *    C3.  strategy_alignment key present
 *    C4.  formulation_alignment key present
 *    C5.  continuity_alignment key present
 *    C6.  knowledge_alignment key present
 *    C7.  safety_escalation_consistency key present
 *    C8.  role_boundary_integrity key present
 *    C9.  context_completeness key present
 *    C10. Contains deferred placeholder keys (not scored in Wave 5A)
 *    C11. genericness_risk placeholder present
 *    C12. over_directiveness_risk placeholder present
 *    C13. All values are non-empty strings
 *    C14. All values are unique (no accidental duplicates)
 *
 * D. ACTIVE_QUALITY_DIMENSIONS
 *    D1.  Is a frozen array
 *    D2.  Contains exactly 7 entries
 *    D3.  Does NOT include deferred dimension values
 *    D4.  All entries match values in QUALITY_DIMENSIONS
 *
 * E. EVALUATOR_SCORE_BANDS
 *    E1.  Is a frozen object
 *    E2.  Contains exactly 5 bands
 *    E3.  PASS → 'pass'
 *    E4.  WEAK → 'weak'
 *    E5.  FAIL → 'fail'
 *    E6.  SKIP → 'skip'
 *    E7.  UNKNOWN → 'unknown'
 *    E8.  All values are non-empty strings
 *    E9.  All values are unique
 *
 * F. EVALUATOR_AGGREGATE_BANDS
 *    F1.  Is a frozen object
 *    F2.  Contains exactly 6 bands
 *    F3.  STRONG → 'strong'
 *    F4.  ADEQUATE → 'adequate'
 *    F5.  MARGINAL → 'marginal'
 *    F6.  POOR → 'poor'
 *    F7.  UNKNOWN → 'unknown'
 *    F8.  FAIL_SAFE → 'fail_safe'
 *    F9.  All values are non-empty strings
 *    F10. All values are unique
 *
 * G. EVALUATOR_FAIL_SAFE_SNAPSHOT — shape stability
 *    G1.  Is a frozen object
 *    G2.  evaluator_version === EVALUATOR_VERSION
 *    G3.  aggregate_band === EVALUATOR_AGGREGATE_BANDS.FAIL_SAFE
 *    G4.  is_fail_safe === true
 *    G5.  fail_safe_reason is a non-empty string
 *    G6.  scored_at === null
 *    G7.  dimensions is a frozen object
 *    G8.  dimensions has exactly 7 keys (active dimensions only)
 *    G9.  All dimension values in fail-safe === EVALUATOR_SCORE_BANDS.UNKNOWN
 *    G10. deferred_dimensions is a frozen array
 *    G11. deferred_dimensions contains the 2 deferred placeholder values
 *    G12. deferred_dimensions does NOT contain any active dimension values
 *
 * H. buildQualityEvaluatorSnapshot — fail-safe on bad inputs
 *    H1.  null → EVALUATOR_FAIL_SAFE_SNAPSHOT (reference equality)
 *    H2.  undefined → EVALUATOR_FAIL_SAFE_SNAPSHOT (reference equality)
 *    H3.  {} (empty object) → EVALUATOR_FAIL_SAFE_SNAPSHOT (reference equality)
 *    H4.  null returns is_fail_safe: true
 *    H5.  undefined returns is_fail_safe: true
 *    H6.  {} returns is_fail_safe: true
 *    H7.  number input → fail-safe
 *    H8.  string input → fail-safe
 *    H9.  array input → fail-safe
 *    H10. boolean true input → fail-safe
 *
 * I. buildQualityEvaluatorSnapshot — valid inputs produce UNKNOWN scaffold snapshot
 *    I1.  Valid inputs object → is_fail_safe: false
 *    I2.  Valid inputs object → aggregate_band: UNKNOWN
 *    I3.  Valid inputs object → all 7 dimension scores are UNKNOWN
 *    I4.  Valid inputs object → evaluator_version === EVALUATOR_VERSION
 *    I5.  Valid inputs object → scored_at === null (no scoring in Wave 5A)
 *    I6.  Valid inputs object → fail_safe_reason === null
 *    I7.  Valid inputs object → deferred_dimensions is correct frozen array
 *    I8.  Valid inputs object → snapshot is frozen
 *    I9.  Valid inputs object → dimensions sub-object is frozen
 *    I10. Valid inputs with only one recognised key still produces UNKNOWN (not fail-safe)
 *
 * J. buildQualityEvaluatorSnapshot — deterministic repeatability
 *    J1.  Same inputs called twice → identical aggregate_band
 *    J2.  Same inputs called twice → identical dimension values
 *    J3.  Same null called twice → identical fail-safe object (reference equality)
 *    J4.  Different valid inputs produce structurally identical UNKNOWN snapshots
 *
 * K. QUALITY_EVALUATOR_FLAGS in featureFlags.js
 *    K1.  QUALITY_EVALUATOR_FLAGS is exported from featureFlags.js
 *    K2.  QUALITY_EVALUATOR_FLAGS is a frozen object
 *    K3.  QUALITY_EVALUATOR_FLAGS.QUALITY_EVALUATOR_ENABLED exists
 *    K4.  QUALITY_EVALUATOR_FLAGS.QUALITY_EVALUATOR_ENABLED defaults to false
 *    K5.  QUALITY_EVALUATOR_FLAGS has exactly 1 key
 *    K6.  QUALITY_EVALUATOR_FLAGS is NOT a key in THERAPIST_UPGRADE_FLAGS
 *    K7.  QUALITY_EVALUATOR_FLAGS is NOT a key in COMPANION_UPGRADE_FLAGS
 *
 * L. Module isolation — no runtime wiring imports
 *    L1.  therapistQualityEvaluator.js source does not import from agentWiring
 *    L2.  therapistQualityEvaluator.js source does not import from activeAgentWiring
 *    L3.  therapistQualityEvaluator.js source does not import from featureFlags
 *    L4.  therapistQualityEvaluator.js source does not import from workflowContextInjector
 *    L5.  therapistQualityEvaluator.js source does not import from entities/
 *    L6.  therapistQualityEvaluator.js source does not import from base44Client
 *    L7.  therapistQualityEvaluator.js source does not import from Chat
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

import {
  EVALUATOR_VERSION,
  QUALITY_DIMENSIONS,
  ACTIVE_QUALITY_DIMENSIONS,
  EVALUATOR_SCORE_BANDS,
  EVALUATOR_AGGREGATE_BANDS,
  EVALUATOR_FAIL_SAFE_SNAPSHOT,
  buildQualityEvaluatorSnapshot,
} from '../../src/lib/therapistQualityEvaluator.js';

import {
  QUALITY_EVALUATOR_FLAGS,
  THERAPIST_UPGRADE_FLAGS,
  COMPANION_UPGRADE_FLAGS,
} from '../../src/lib/featureFlags.js';

// ─── A. Module export existence ────────────────────────────────────────────────

describe('A. Module export existence', () => {
  it('A1. EVALUATOR_VERSION is exported', () => {
    expect(EVALUATOR_VERSION).toBeDefined();
  });

  it('A2. QUALITY_DIMENSIONS is exported', () => {
    expect(QUALITY_DIMENSIONS).toBeDefined();
  });

  it('A3. EVALUATOR_SCORE_BANDS is exported', () => {
    expect(EVALUATOR_SCORE_BANDS).toBeDefined();
  });

  it('A4. EVALUATOR_AGGREGATE_BANDS is exported', () => {
    expect(EVALUATOR_AGGREGATE_BANDS).toBeDefined();
  });

  it('A5. EVALUATOR_FAIL_SAFE_SNAPSHOT is exported', () => {
    expect(EVALUATOR_FAIL_SAFE_SNAPSHOT).toBeDefined();
  });

  it('A6. buildQualityEvaluatorSnapshot is exported and is a function', () => {
    expect(typeof buildQualityEvaluatorSnapshot).toBe('function');
  });

  it('A7. ACTIVE_QUALITY_DIMENSIONS is exported and is an array', () => {
    expect(Array.isArray(ACTIVE_QUALITY_DIMENSIONS)).toBe(true);
  });
});

// ─── B. EVALUATOR_VERSION ──────────────────────────────────────────────────────

describe('B. EVALUATOR_VERSION', () => {
  it('B1. Is a non-empty string', () => {
    expect(typeof EVALUATOR_VERSION).toBe('string');
    expect(EVALUATOR_VERSION.length).toBeGreaterThan(0);
  });

  it("B2. Matches '5C.0.0' (version stability)", () => {
    expect(EVALUATOR_VERSION).toBe('5C.0.0');
  });
});

// ─── C. QUALITY_DIMENSIONS ────────────────────────────────────────────────────

describe('C. QUALITY_DIMENSIONS', () => {
  it('C1. Is a frozen object', () => {
    expect(Object.isFrozen(QUALITY_DIMENSIONS)).toBe(true);
  });

  it('C2. Contains all 7 active dimension keys', () => {
    const activeKeys = [
      'STRATEGY_ALIGNMENT',
      'FORMULATION_ALIGNMENT',
      'CONTINUITY_ALIGNMENT',
      'KNOWLEDGE_ALIGNMENT',
      'SAFETY_ESCALATION_CONSISTENCY',
      'ROLE_BOUNDARY_INTEGRITY',
      'CONTEXT_COMPLETENESS',
    ];
    for (const key of activeKeys) {
      expect(QUALITY_DIMENSIONS).toHaveProperty(key);
    }
  });

  it('C3. strategy_alignment key present', () => {
    expect(QUALITY_DIMENSIONS.STRATEGY_ALIGNMENT).toBe('strategy_alignment');
  });

  it('C4. formulation_alignment key present', () => {
    expect(QUALITY_DIMENSIONS.FORMULATION_ALIGNMENT).toBe('formulation_alignment');
  });

  it('C5. continuity_alignment key present', () => {
    expect(QUALITY_DIMENSIONS.CONTINUITY_ALIGNMENT).toBe('continuity_alignment');
  });

  it('C6. knowledge_alignment key present', () => {
    expect(QUALITY_DIMENSIONS.KNOWLEDGE_ALIGNMENT).toBe('knowledge_alignment');
  });

  it('C7. safety_escalation_consistency key present', () => {
    expect(QUALITY_DIMENSIONS.SAFETY_ESCALATION_CONSISTENCY).toBe('safety_escalation_consistency');
  });

  it('C8. role_boundary_integrity key present', () => {
    expect(QUALITY_DIMENSIONS.ROLE_BOUNDARY_INTEGRITY).toBe('role_boundary_integrity');
  });

  it('C9. context_completeness key present', () => {
    expect(QUALITY_DIMENSIONS.CONTEXT_COMPLETENESS).toBe('context_completeness');
  });

  it('C10. Contains deferred placeholder keys (not scored in Wave 5A)', () => {
    expect(QUALITY_DIMENSIONS).toHaveProperty('DEFERRED_GENERICNESS_RISK');
    expect(QUALITY_DIMENSIONS).toHaveProperty('DEFERRED_OVER_DIRECTIVENESS_RISK');
  });

  it('C11. genericness_risk placeholder present', () => {
    expect(QUALITY_DIMENSIONS.DEFERRED_GENERICNESS_RISK).toBe('genericness_risk');
  });

  it('C12. over_directiveness_risk placeholder present', () => {
    expect(QUALITY_DIMENSIONS.DEFERRED_OVER_DIRECTIVENESS_RISK).toBe('over_directiveness_risk');
  });

  it('C13. All values are non-empty strings', () => {
    for (const [key, value] of Object.entries(QUALITY_DIMENSIONS)) {
      expect(typeof value, `key: ${key}`).toBe('string');
      expect(value.length, `key: ${key}`).toBeGreaterThan(0);
    }
  });

  it('C14. All values are unique (no accidental duplicates)', () => {
    const values = Object.values(QUALITY_DIMENSIONS);
    const unique = new Set(values);
    expect(unique.size).toBe(values.length);
  });
});

// ─── D. ACTIVE_QUALITY_DIMENSIONS ────────────────────────────────────────────

describe('D. ACTIVE_QUALITY_DIMENSIONS', () => {
  it('D1. Is a frozen array', () => {
    expect(Object.isFrozen(ACTIVE_QUALITY_DIMENSIONS)).toBe(true);
    expect(Array.isArray(ACTIVE_QUALITY_DIMENSIONS)).toBe(true);
  });

  it('D2. Contains exactly 7 entries', () => {
    expect(ACTIVE_QUALITY_DIMENSIONS).toHaveLength(7);
  });

  it('D3. Does NOT include deferred dimension values', () => {
    expect(ACTIVE_QUALITY_DIMENSIONS).not.toContain(QUALITY_DIMENSIONS.DEFERRED_GENERICNESS_RISK);
    expect(ACTIVE_QUALITY_DIMENSIONS).not.toContain(QUALITY_DIMENSIONS.DEFERRED_OVER_DIRECTIVENESS_RISK);
  });

  it('D4. All entries match values in QUALITY_DIMENSIONS', () => {
    const allValues = new Set(Object.values(QUALITY_DIMENSIONS));
    for (const entry of ACTIVE_QUALITY_DIMENSIONS) {
      expect(allValues.has(entry), `entry not in QUALITY_DIMENSIONS: ${entry}`).toBe(true);
    }
  });
});

// ─── E. EVALUATOR_SCORE_BANDS ─────────────────────────────────────────────────

describe('E. EVALUATOR_SCORE_BANDS', () => {
  it('E1. Is a frozen object', () => {
    expect(Object.isFrozen(EVALUATOR_SCORE_BANDS)).toBe(true);
  });

  it('E2. Contains exactly 5 bands', () => {
    expect(Object.keys(EVALUATOR_SCORE_BANDS)).toHaveLength(5);
  });

  it("E3. PASS → 'pass'", () => {
    expect(EVALUATOR_SCORE_BANDS.PASS).toBe('pass');
  });

  it("E4. WEAK → 'weak'", () => {
    expect(EVALUATOR_SCORE_BANDS.WEAK).toBe('weak');
  });

  it("E5. FAIL → 'fail'", () => {
    expect(EVALUATOR_SCORE_BANDS.FAIL).toBe('fail');
  });

  it("E6. SKIP → 'skip'", () => {
    expect(EVALUATOR_SCORE_BANDS.SKIP).toBe('skip');
  });

  it("E7. UNKNOWN → 'unknown'", () => {
    expect(EVALUATOR_SCORE_BANDS.UNKNOWN).toBe('unknown');
  });

  it('E8. All values are non-empty strings', () => {
    for (const [key, value] of Object.entries(EVALUATOR_SCORE_BANDS)) {
      expect(typeof value, `key: ${key}`).toBe('string');
      expect(value.length, `key: ${key}`).toBeGreaterThan(0);
    }
  });

  it('E9. All values are unique', () => {
    const values = Object.values(EVALUATOR_SCORE_BANDS);
    const unique = new Set(values);
    expect(unique.size).toBe(values.length);
  });
});

// ─── F. EVALUATOR_AGGREGATE_BANDS ─────────────────────────────────────────────

describe('F. EVALUATOR_AGGREGATE_BANDS', () => {
  it('F1. Is a frozen object', () => {
    expect(Object.isFrozen(EVALUATOR_AGGREGATE_BANDS)).toBe(true);
  });

  it('F2. Contains exactly 6 bands', () => {
    expect(Object.keys(EVALUATOR_AGGREGATE_BANDS)).toHaveLength(6);
  });

  it("F3. STRONG → 'strong'", () => {
    expect(EVALUATOR_AGGREGATE_BANDS.STRONG).toBe('strong');
  });

  it("F4. ADEQUATE → 'adequate'", () => {
    expect(EVALUATOR_AGGREGATE_BANDS.ADEQUATE).toBe('adequate');
  });

  it("F5. MARGINAL → 'marginal'", () => {
    expect(EVALUATOR_AGGREGATE_BANDS.MARGINAL).toBe('marginal');
  });

  it("F6. POOR → 'poor'", () => {
    expect(EVALUATOR_AGGREGATE_BANDS.POOR).toBe('poor');
  });

  it("F7. UNKNOWN → 'unknown'", () => {
    expect(EVALUATOR_AGGREGATE_BANDS.UNKNOWN).toBe('unknown');
  });

  it("F8. FAIL_SAFE → 'fail_safe'", () => {
    expect(EVALUATOR_AGGREGATE_BANDS.FAIL_SAFE).toBe('fail_safe');
  });

  it('F9. All values are non-empty strings', () => {
    for (const [key, value] of Object.entries(EVALUATOR_AGGREGATE_BANDS)) {
      expect(typeof value, `key: ${key}`).toBe('string');
      expect(value.length, `key: ${key}`).toBeGreaterThan(0);
    }
  });

  it('F10. All values are unique', () => {
    const values = Object.values(EVALUATOR_AGGREGATE_BANDS);
    const unique = new Set(values);
    expect(unique.size).toBe(values.length);
  });
});

// ─── G. EVALUATOR_FAIL_SAFE_SNAPSHOT — shape stability ────────────────────────

describe('G. EVALUATOR_FAIL_SAFE_SNAPSHOT — shape stability', () => {
  it('G1. Is a frozen object', () => {
    expect(Object.isFrozen(EVALUATOR_FAIL_SAFE_SNAPSHOT)).toBe(true);
  });

  it('G2. evaluator_version === EVALUATOR_VERSION', () => {
    expect(EVALUATOR_FAIL_SAFE_SNAPSHOT.evaluator_version).toBe(EVALUATOR_VERSION);
  });

  it('G3. aggregate_band === EVALUATOR_AGGREGATE_BANDS.FAIL_SAFE', () => {
    expect(EVALUATOR_FAIL_SAFE_SNAPSHOT.aggregate_band).toBe(EVALUATOR_AGGREGATE_BANDS.FAIL_SAFE);
  });

  it('G4. is_fail_safe === true', () => {
    expect(EVALUATOR_FAIL_SAFE_SNAPSHOT.is_fail_safe).toBe(true);
  });

  it('G5. fail_safe_reason is a non-empty string', () => {
    expect(typeof EVALUATOR_FAIL_SAFE_SNAPSHOT.fail_safe_reason).toBe('string');
    expect(EVALUATOR_FAIL_SAFE_SNAPSHOT.fail_safe_reason.length).toBeGreaterThan(0);
  });

  it('G6. scored_at === null', () => {
    expect(EVALUATOR_FAIL_SAFE_SNAPSHOT.scored_at).toBeNull();
  });

  it('G7. dimensions is a frozen object', () => {
    expect(Object.isFrozen(EVALUATOR_FAIL_SAFE_SNAPSHOT.dimensions)).toBe(true);
  });

  it('G8. dimensions has exactly 7 keys (active dimensions only)', () => {
    expect(Object.keys(EVALUATOR_FAIL_SAFE_SNAPSHOT.dimensions)).toHaveLength(7);
  });

  it('G9. All dimension values in fail-safe === EVALUATOR_SCORE_BANDS.UNKNOWN', () => {
    for (const [dim, score] of Object.entries(EVALUATOR_FAIL_SAFE_SNAPSHOT.dimensions)) {
      expect(score, `dimension: ${dim}`).toBe(EVALUATOR_SCORE_BANDS.UNKNOWN);
    }
  });

  it('G10. deferred_dimensions is a frozen array', () => {
    expect(Object.isFrozen(EVALUATOR_FAIL_SAFE_SNAPSHOT.deferred_dimensions)).toBe(true);
    expect(Array.isArray(EVALUATOR_FAIL_SAFE_SNAPSHOT.deferred_dimensions)).toBe(true);
  });

  it('G11. deferred_dimensions contains the 2 deferred placeholder values', () => {
    expect(EVALUATOR_FAIL_SAFE_SNAPSHOT.deferred_dimensions).toContain(
      QUALITY_DIMENSIONS.DEFERRED_GENERICNESS_RISK
    );
    expect(EVALUATOR_FAIL_SAFE_SNAPSHOT.deferred_dimensions).toContain(
      QUALITY_DIMENSIONS.DEFERRED_OVER_DIRECTIVENESS_RISK
    );
    expect(EVALUATOR_FAIL_SAFE_SNAPSHOT.deferred_dimensions).toHaveLength(2);
  });

  it('G12. deferred_dimensions does NOT contain any active dimension values', () => {
    for (const activeDim of ACTIVE_QUALITY_DIMENSIONS) {
      expect(EVALUATOR_FAIL_SAFE_SNAPSHOT.deferred_dimensions).not.toContain(activeDim);
    }
  });
});

// ─── H. buildQualityEvaluatorSnapshot — fail-safe on bad inputs ───────────────

describe('H. buildQualityEvaluatorSnapshot — fail-safe on bad inputs', () => {
  it('H1. null → EVALUATOR_FAIL_SAFE_SNAPSHOT (reference equality)', () => {
    expect(buildQualityEvaluatorSnapshot(null)).toBe(EVALUATOR_FAIL_SAFE_SNAPSHOT);
  });

  it('H2. undefined → EVALUATOR_FAIL_SAFE_SNAPSHOT (reference equality)', () => {
    expect(buildQualityEvaluatorSnapshot(undefined)).toBe(EVALUATOR_FAIL_SAFE_SNAPSHOT);
  });

  it('H3. {} (empty object) → EVALUATOR_FAIL_SAFE_SNAPSHOT (reference equality)', () => {
    expect(buildQualityEvaluatorSnapshot({})).toBe(EVALUATOR_FAIL_SAFE_SNAPSHOT);
  });

  it('H4. null returns is_fail_safe: true', () => {
    expect(buildQualityEvaluatorSnapshot(null).is_fail_safe).toBe(true);
  });

  it('H5. undefined returns is_fail_safe: true', () => {
    expect(buildQualityEvaluatorSnapshot(undefined).is_fail_safe).toBe(true);
  });

  it('H6. {} returns is_fail_safe: true', () => {
    expect(buildQualityEvaluatorSnapshot({}).is_fail_safe).toBe(true);
  });

  it('H7. number input → fail-safe', () => {
    expect(buildQualityEvaluatorSnapshot(42)).toBe(EVALUATOR_FAIL_SAFE_SNAPSHOT);
  });

  it('H8. string input → fail-safe', () => {
    expect(buildQualityEvaluatorSnapshot('hello')).toBe(EVALUATOR_FAIL_SAFE_SNAPSHOT);
  });

  it('H9. array input → fail-safe', () => {
    expect(buildQualityEvaluatorSnapshot([1, 2, 3])).toBe(EVALUATOR_FAIL_SAFE_SNAPSHOT);
  });

  it('H10. boolean true input → fail-safe', () => {
    expect(buildQualityEvaluatorSnapshot(true)).toBe(EVALUATOR_FAIL_SAFE_SNAPSHOT);
  });
});

// ─── I. buildQualityEvaluatorSnapshot — valid inputs produce scored snapshot ──

describe('I. buildQualityEvaluatorSnapshot — valid inputs produce scored snapshot', () => {
  const validInputs = {
    strategyState: { intervention_mode: 'exploration', distress_tier: 'tier_low' },
    formulationHints: { domain: 'anxiety', has_formulation: true },
    safetyActive: false,
  };

  it('I1. Valid inputs object → is_fail_safe: false', () => {
    const snapshot = buildQualityEvaluatorSnapshot(validInputs);
    expect(snapshot.is_fail_safe).toBe(false);
  });

  it('I2. Valid inputs object → aggregate_band is a scored band (not fail_safe, not unknown)', () => {
    const snapshot = buildQualityEvaluatorSnapshot(validInputs);
    expect(snapshot.aggregate_band).not.toBe(EVALUATOR_AGGREGATE_BANDS.FAIL_SAFE);
    expect(snapshot.aggregate_band).not.toBe(EVALUATOR_AGGREGATE_BANDS.UNKNOWN);
    expect(Object.values(EVALUATOR_AGGREGATE_BANDS)).toContain(snapshot.aggregate_band);
  });

  it('I3. Valid inputs object → all 7 dimensions have bounded score bands', () => {
    const snapshot = buildQualityEvaluatorSnapshot(validInputs);
    expect(Object.keys(snapshot.dimensions)).toHaveLength(7);
    const knownBands = Object.values(EVALUATOR_SCORE_BANDS);
    for (const [dim, score] of Object.entries(snapshot.dimensions)) {
      expect(knownBands, `dimension: ${dim}`).toContain(score);
    }
  });

  it('I4. Valid inputs object → evaluator_version === EVALUATOR_VERSION', () => {
    const snapshot = buildQualityEvaluatorSnapshot(validInputs);
    expect(snapshot.evaluator_version).toBe(EVALUATOR_VERSION);
  });

  it('I5. Valid inputs object → scored_at === null (inert evaluator — no timestamp)', () => {
    const snapshot = buildQualityEvaluatorSnapshot(validInputs);
    expect(snapshot.scored_at).toBeNull();
  });

  it('I6. Valid inputs object → fail_safe_reason === null', () => {
    const snapshot = buildQualityEvaluatorSnapshot(validInputs);
    expect(snapshot.fail_safe_reason).toBeNull();
  });

  it('I7. Valid inputs object → deferred_dimensions is correct frozen array', () => {
    const snapshot = buildQualityEvaluatorSnapshot(validInputs);
    expect(Object.isFrozen(snapshot.deferred_dimensions)).toBe(true);
    expect(snapshot.deferred_dimensions).toContain(QUALITY_DIMENSIONS.DEFERRED_GENERICNESS_RISK);
    expect(snapshot.deferred_dimensions).toContain(QUALITY_DIMENSIONS.DEFERRED_OVER_DIRECTIVENESS_RISK);
    expect(snapshot.deferred_dimensions).toHaveLength(2);
  });

  it('I8. Valid inputs object → snapshot is frozen', () => {
    const snapshot = buildQualityEvaluatorSnapshot(validInputs);
    expect(Object.isFrozen(snapshot)).toBe(true);
  });

  it('I9. Valid inputs object → dimensions sub-object is frozen', () => {
    const snapshot = buildQualityEvaluatorSnapshot(validInputs);
    expect(Object.isFrozen(snapshot.dimensions)).toBe(true);
  });

  it('I10. Valid inputs with only one recognised key produce a scored (not fail-safe) snapshot', () => {
    const minimalInputs = { safetyActive: false };
    const snapshot = buildQualityEvaluatorSnapshot(minimalInputs);
    expect(snapshot.is_fail_safe).toBe(false);
    expect(snapshot.aggregate_band).not.toBe(EVALUATOR_AGGREGATE_BANDS.FAIL_SAFE);
    expect(snapshot.aggregate_band).not.toBe(EVALUATOR_AGGREGATE_BANDS.UNKNOWN);
  });
});

// ─── J. buildQualityEvaluatorSnapshot — deterministic repeatability ────────────

describe('J. buildQualityEvaluatorSnapshot — deterministic repeatability', () => {
  const inputs = {
    strategyState: { intervention_mode: 'deepening', distress_tier: 'tier_mild' },
    formulationHints: { domain: 'depression', has_formulation: true },
    continuitySignals: { sessions_found: 2 },
    safetyActive: false,
  };

  it('J1. Same inputs called twice → identical aggregate_band', () => {
    const s1 = buildQualityEvaluatorSnapshot(inputs);
    const s2 = buildQualityEvaluatorSnapshot(inputs);
    expect(s1.aggregate_band).toBe(s2.aggregate_band);
  });

  it('J2. Same inputs called twice → identical dimension values', () => {
    const s1 = buildQualityEvaluatorSnapshot(inputs);
    const s2 = buildQualityEvaluatorSnapshot(inputs);
    expect(JSON.stringify(s1.dimensions)).toBe(JSON.stringify(s2.dimensions));
  });

  it('J3. Same null called twice → identical fail-safe object (reference equality)', () => {
    const r1 = buildQualityEvaluatorSnapshot(null);
    const r2 = buildQualityEvaluatorSnapshot(null);
    expect(r1).toBe(r2);
  });

  it('J4. buildQualityEvaluatorSnapshot is deterministic for the same valid inputs', () => {
    const inputsA = { strategyState: { intervention_mode: 'exploration' } };
    const s1 = buildQualityEvaluatorSnapshot(inputsA);
    const s2 = buildQualityEvaluatorSnapshot(inputsA);
    expect(s1.aggregate_band).toBe(s2.aggregate_band);
    expect(JSON.stringify(s1.dimensions)).toBe(JSON.stringify(s2.dimensions));
    expect(s1.is_fail_safe).toBe(s2.is_fail_safe);
  });
});

// ─── K. QUALITY_EVALUATOR_FLAGS in featureFlags.js ────────────────────────────

describe('K. QUALITY_EVALUATOR_FLAGS in featureFlags.js', () => {
  it('K1. QUALITY_EVALUATOR_FLAGS is exported from featureFlags.js', () => {
    expect(QUALITY_EVALUATOR_FLAGS).toBeDefined();
  });

  it('K2. QUALITY_EVALUATOR_FLAGS is a frozen object', () => {
    expect(Object.isFrozen(QUALITY_EVALUATOR_FLAGS)).toBe(true);
  });

  it('K3. QUALITY_EVALUATOR_FLAGS.QUALITY_EVALUATOR_ENABLED exists', () => {
    expect(QUALITY_EVALUATOR_FLAGS).toHaveProperty('QUALITY_EVALUATOR_ENABLED');
  });

  it('K4. QUALITY_EVALUATOR_FLAGS.QUALITY_EVALUATOR_ENABLED defaults to false', () => {
    expect(QUALITY_EVALUATOR_FLAGS.QUALITY_EVALUATOR_ENABLED).toBe(false);
  });

  it('K5. QUALITY_EVALUATOR_FLAGS has exactly 1 key', () => {
    expect(Object.keys(QUALITY_EVALUATOR_FLAGS)).toHaveLength(1);
  });

  it('K6. QUALITY_EVALUATOR_ENABLED is NOT a key in THERAPIST_UPGRADE_FLAGS', () => {
    expect(THERAPIST_UPGRADE_FLAGS).not.toHaveProperty('QUALITY_EVALUATOR_ENABLED');
  });

  it('K7. QUALITY_EVALUATOR_ENABLED is NOT a key in COMPANION_UPGRADE_FLAGS', () => {
    expect(COMPANION_UPGRADE_FLAGS).not.toHaveProperty('QUALITY_EVALUATOR_ENABLED');
  });
});

// ─── L. Module isolation — no runtime wiring imports ──────────────────────────

describe('L. Module isolation — no runtime wiring imports', () => {
  const srcPath = resolve(
    new URL('.', import.meta.url).pathname,
    '../../src/lib/therapistQualityEvaluator.js'
  );
  const src = readFileSync(srcPath, 'utf-8');

  it('L1. therapistQualityEvaluator.js source does not import from agentWiring', () => {
    expect(src).not.toMatch(/from ['"].*agentWiring/);
  });

  it('L2. therapistQualityEvaluator.js source does not import from activeAgentWiring', () => {
    expect(src).not.toMatch(/from ['"].*activeAgentWiring/);
  });

  it('L3. therapistQualityEvaluator.js source does not import from featureFlags', () => {
    expect(src).not.toMatch(/from ['"].*featureFlags/);
  });

  it('L4. therapistQualityEvaluator.js source does not import from workflowContextInjector', () => {
    expect(src).not.toMatch(/from ['"].*workflowContextInjector/);
  });

  it('L5. therapistQualityEvaluator.js source does not import from entities/', () => {
    expect(src).not.toMatch(/from ['"].*entities\//);
  });

  it('L6. therapistQualityEvaluator.js source does not import from base44Client', () => {
    expect(src).not.toMatch(/from ['"].*base44Client/);
  });

  it('L7. therapistQualityEvaluator.js source does not import from Chat', () => {
    expect(src).not.toMatch(/from ['"].*Chat/);
  });
});
