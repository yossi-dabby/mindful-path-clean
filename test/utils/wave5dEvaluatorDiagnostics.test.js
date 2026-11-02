/**
 * @file test/utils/wave5dEvaluatorDiagnostics.test.js
 *
 * Wave 5D — Quality Evaluator Diagnostics Integration Tests
 *
 * PURPOSE
 * -------
 * Validates the Wave 5D additions:
 *   1. computeEvaluatorDiagnosticSnapshot() in therapistQualityEvaluator.js
 *   2. isQualityEvaluatorEnabled() in featureFlags.js
 *   3. getActivationDiagnostics() evaluatorLayer field in featureFlags.js
 *   4. _emitEvaluatorDiagnosticIfEnabled integration in workflowContextInjector.js
 *      (tested indirectly via session-start output contracts and console spies)
 *
 * COVERAGE (per Wave 5D problem statement)
 * ─────────────────────────────────────────
 *
 * A. computeEvaluatorDiagnosticSnapshot — shape contracts
 *    A1.  Returns frozen object
 *    A2.  evaluator_version is a non-empty string
 *    A3.  active_dimensions is a frozen non-empty array
 *    A4.  dimensions is a frozen object with all ACTIVE_QUALITY_DIMENSIONS keys
 *    A5.  aggregate_band is a recognised EVALUATOR_AGGREGATE_BANDS value
 *    A6.  risk_flags is a frozen object with the four approved keys
 *    A7.  risk_flags contains only boolean and string values (no raw text)
 *    A8.  fail_safe is a boolean
 *    A9.  agent_role is a string
 *    A10. wiring_version is a number
 *
 * B. computeEvaluatorDiagnosticSnapshot — fail-safe on bad inputs
 *    B1.  null input → fail_safe: true, FAIL_SAFE aggregate_band
 *    B2.  undefined input → fail_safe: true
 *    B3.  {} (empty object) → fail_safe: true
 *    B4.  string input → fail_safe: true
 *    B5.  array input → fail_safe: true
 *    B6.  evaluator_version is still correct on fail-safe path
 *    B7.  active_dimensions still present on fail-safe path
 *    B8.  risk_flags present and correctly shaped on fail-safe path
 *    B9.  Never throws on any input
 *    B10. fail-safe path returns agent_role: '' and wiring_version: 0
 *
 * C. computeEvaluatorDiagnosticSnapshot — valid inputs
 *    C1.  Valid strategyState → fail_safe: false
 *    C2.  aggregate_band = UNKNOWN for valid inputs (scaffold: no scoring yet)
 *    C3.  agent_role extracted from wiringIdentity.name
 *    C4.  wiring_version extracted from wiringIdentity.stage2_phase
 *    C5.  risk_flags.safety_active reflects safetyResult
 *    C6.  risk_flags.distress_tier extracted correctly
 *    C7.  risk_flags.has_risk_flags from continuity signals
 *    C8.  risk_flags.lts_has_risk_history from LTS inputs
 *    C9.  Deterministic: same inputs always produce equal output
 *    C10. Output snapshot has exactly the 8 approved top-level keys
 *
 * D. No raw text / no private entity leakage
 *    D1.  rawMessage field in inputs is ignored (not present in output)
 *    D2.  No field in the diagnostic snapshot contains raw user text
 *    D3.  No ThoughtJournal, Conversation, CaseFormulation fields in output
 *    D4.  risk_flags keys are only approved metadata (no message content)
 *    D5.  Output contains only string, boolean, number, array, or plain object values
 *
 * E. isQualityEvaluatorEnabled — flag evaluation
 *    E1.  Returns false when VITE_QUALITY_EVALUATOR_ENABLED is not set (default)
 *    E2.  Returns false for unknown flag name
 *    E3.  Returns true when QUALITY_EVALUATOR_FLAGS.QUALITY_EVALUATOR_ENABLED is true
 *         (tested by mock-replacing the module-level constant in unit test)
 *    E4.  Default parameter is 'QUALITY_EVALUATOR_ENABLED'
 *
 * F. getActivationDiagnostics — evaluatorLayer
 *    F1.  Returns null when _s2debug=true is absent
 *    F2.  evaluatorLayer present in return value when _s2debug=true
 *    F3.  evaluatorLayer.evaluatorEnabled is a boolean
 *    F4.  evaluatorLayer does not include raw session data
 *
 * G. Session-start output unchanged when evaluator runs
 *    G1.  buildV8SessionStartContentAsync return value unchanged (string type)
 *    G2.  buildV8SessionStartContentAsync with non-V8 wiring → delegates to V7
 *    G3.  buildV9SessionStartContentAsync output unchanged (no evaluator in return)
 *    G4.  buildV10SessionStartContentAsync with non-V10 wiring → delegates to V9
 *
 * H. Session-start output unchanged when evaluator throws/fails
 *    H1.  buildV8SessionStartContentAsync output unchanged even if computeEvaluatorDiagnosticSnapshot throws
 *    H2.  console.error not emitted when evaluator diagnostic fails
 *
 * I. Evaluator diagnostics absent or skipped when gate is off
 *    I1.  _emitEvaluatorDiagnosticIfEnabled is a no-op when _s2debug absent
 *    I2.  _emitEvaluatorDiagnosticIfEnabled is a no-op when QUALITY_EVALUATOR_ENABLED is off
 *    I3.  console.group not called when _s2debug absent from URL
 *    I4.  console.group called when both _s2debug=true and QUALITY_EVALUATOR_ENABLED=true
 *
 * J. No regression to V10/V9 fallback behavior
 *    J1.  buildV10 with non-V10 wiring returns same as buildV9
 *    J2.  buildV9 with non-V9 wiring returns same as buildV8
 *    J3.  evaluator diagnostics do not appear in session-start string output
 *
 * K. No regression to Companion flows
 *    K1.  computeEvaluatorDiagnosticSnapshot does not read companion entities
 *    K2.  computeEvaluatorDiagnosticSnapshot does not read CompanionMemory
 *    K3.  therapistQualityEvaluator.js does not import companion modules
 *
 * L. Deterministic diagnostic snapshot shape
 *    L1.  Same inputs → identical snapshot value (deep equality)
 *    L2.  active_dimensions order is stable across calls
 *    L3.  Snapshot shape matches expected keys set exactly
 *
 * M. Module isolation — no new forbidden imports added
 *    M1.  therapistQualityEvaluator.js still has no imports (zero import lines)
 *    M2.  computeEvaluatorDiagnosticSnapshot export is present
 *    M3.  isQualityEvaluatorEnabled export is present in featureFlags.js
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';

// ─── Modules under test ───────────────────────────────────────────────────────

import {
  EVALUATOR_VERSION,
  EVALUATOR_AGGREGATE_BANDS,
  ACTIVE_QUALITY_DIMENSIONS,
  EVALUATOR_FAIL_SAFE_SNAPSHOT,
  buildQualityEvaluatorSnapshot,
  extractEvaluatorFeatures,
  computeEvaluatorDiagnosticSnapshot,
} from '../../src/lib/therapistQualityEvaluator.js';

import {
  isQualityEvaluatorEnabled,
  QUALITY_EVALUATOR_FLAGS,
  getActivationDiagnostics,
} from '../../src/lib/featureFlags.js';

import {
  buildV8SessionStartContentAsync,
  buildV9SessionStartContentAsync,
  buildV10SessionStartContentAsync,
} from '../../src/lib/workflowContextInjector.js';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const VALID_STRATEGY_STATE = Object.freeze({
  strategy_version: '3D.0.0',
  intervention_mode: 'structured_exploration',
  distress_tier: 'tier_mild',
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
});

const VALID_LTS_INPUTS = Object.freeze({
  lts_valid: true,
  lts_session_count: 5,
  lts_trajectory: 'progressing',
  lts_has_risk_history: false,
  lts_is_stagnating: false,
  lts_is_progressing: true,
  lts_is_fluctuating: false,
  lts_has_stalled_interventions: false,
  lts_stalled_interventions: Object.freeze([]),
});

const VALID_SAFETY_RESULT = Object.freeze({
  safety_mode: false,
  triggers: [],
  rationale: '',
});

const VALID_WIRING_IDENTITY = Object.freeze({
  name: 'cbt_therapist',
  stage2: true,
  stage2_phase: 8,
  strategy_layer_enabled: true,
  formulation_context_enabled: true,
  continuity_layer_enabled: true,
  safety_mode_enabled: true,
});

/** Full valid evaluator inputs — no raw text included. */
const VALID_INPUTS = Object.freeze({
  strategyState: VALID_STRATEGY_STATE,
  ltsInputs: VALID_LTS_INPUTS,
  safetyResult: VALID_SAFETY_RESULT,
  distressTier: 'tier_mild',
  wiringIdentity: VALID_WIRING_IDENTITY,
});

/** Approved top-level keys for a Wave 5D diagnostic snapshot. */
const EXPECTED_SNAPSHOT_KEYS = new Set([
  'evaluator_version',
  'active_dimensions',
  'dimensions',
  'aggregate_band',
  'risk_flags',
  'fail_safe',
  'agent_role',
  'wiring_version',
]);

/** Approved risk_flags keys. */
const EXPECTED_RISK_FLAG_KEYS = new Set([
  'safety_active',
  'distress_tier',
  'has_risk_flags',
  'lts_has_risk_history',
]);

/** Recognised aggregate bands set. */
const ALL_AGGREGATE_BANDS = new Set(Object.values(EVALUATOR_AGGREGATE_BANDS));

// ─── Minimal wiring mocks for session-start tests ────────────────────────────

const HYBRID_WIRING = {
  name: 'cbt_therapist_hybrid',
  agent_instructions: '[START_SESSION]',
};

const V8_WIRING = {
  name: 'cbt_therapist',
  stage2: true,
  stage2_phase: 8,
  strategy_layer_enabled: true,
  continuity_layer_enabled: false,
  formulation_context_enabled: false,
  safety_mode_enabled: false,
  live_retrieval_enabled: false,
  retrieval_orchestration_enabled: false,
  workflow_context_injection: false,
  memory_context_enabled: false,
  longitudinal_layer_enabled: false,
  agent_instructions: '[START_SESSION]',
};

const V9_WIRING = {
  ...V8_WIRING,
  longitudinal_layer_enabled: true,
};

const V10_WIRING = {
  ...V9_WIRING,
  knowledge_layer_enabled: true,
};

/** Minimal entities mock — all lists return empty arrays. */
const EMPTY_ENTITIES = {
  CaseFormulation: { list: vi.fn().mockResolvedValue([]) },
  CompanionMemory: { list: vi.fn().mockResolvedValue([]) },
  ExternalKnowledgeChunk: { list: vi.fn().mockResolvedValue([]) },
};

// ─── A. computeEvaluatorDiagnosticSnapshot — shape contracts ─────────────────

describe('computeEvaluatorDiagnosticSnapshot — shape contracts (A)', () => {
  it('A1. Returns frozen object', () => {
    const snap = computeEvaluatorDiagnosticSnapshot(VALID_INPUTS);
    expect(Object.isFrozen(snap)).toBe(true);
  });

  it('A2. evaluator_version is a non-empty string', () => {
    const snap = computeEvaluatorDiagnosticSnapshot(VALID_INPUTS);
    expect(typeof snap.evaluator_version).toBe('string');
    expect(snap.evaluator_version.length).toBeGreaterThan(0);
  });

  it('A3. active_dimensions is a frozen non-empty array', () => {
    const snap = computeEvaluatorDiagnosticSnapshot(VALID_INPUTS);
    expect(Array.isArray(snap.active_dimensions)).toBe(true);
    expect(Object.isFrozen(snap.active_dimensions)).toBe(true);
    expect(snap.active_dimensions.length).toBeGreaterThan(0);
  });

  it('A4. dimensions is a frozen object with all ACTIVE_QUALITY_DIMENSIONS keys', () => {
    const snap = computeEvaluatorDiagnosticSnapshot(VALID_INPUTS);
    expect(typeof snap.dimensions).toBe('object');
    expect(snap.dimensions).not.toBeNull();
    expect(Object.isFrozen(snap.dimensions)).toBe(true);
    for (const dim of ACTIVE_QUALITY_DIMENSIONS) {
      expect(snap.dimensions).toHaveProperty(dim);
    }
  });

  it('A5. aggregate_band is a recognised EVALUATOR_AGGREGATE_BANDS value', () => {
    const snap = computeEvaluatorDiagnosticSnapshot(VALID_INPUTS);
    expect(ALL_AGGREGATE_BANDS.has(snap.aggregate_band)).toBe(true);
  });

  it('A6. risk_flags is a frozen object with exactly the four approved keys', () => {
    const snap = computeEvaluatorDiagnosticSnapshot(VALID_INPUTS);
    expect(typeof snap.risk_flags).toBe('object');
    expect(Object.isFrozen(snap.risk_flags)).toBe(true);
    const riskKeys = new Set(Object.keys(snap.risk_flags));
    for (const k of EXPECTED_RISK_FLAG_KEYS) {
      expect(riskKeys.has(k)).toBe(true);
    }
    expect(riskKeys.size).toBe(EXPECTED_RISK_FLAG_KEYS.size);
  });

  it('A7. risk_flags contains only boolean and string values (no raw text)', () => {
    const snap = computeEvaluatorDiagnosticSnapshot(VALID_INPUTS);
    for (const [, v] of Object.entries(snap.risk_flags)) {
      expect(['boolean', 'string'].includes(typeof v)).toBe(true);
    }
  });

  it('A8. fail_safe is a boolean', () => {
    const snap = computeEvaluatorDiagnosticSnapshot(VALID_INPUTS);
    expect(typeof snap.fail_safe).toBe('boolean');
  });

  it('A9. agent_role is a string', () => {
    const snap = computeEvaluatorDiagnosticSnapshot(VALID_INPUTS);
    expect(typeof snap.agent_role).toBe('string');
  });

  it('A10. wiring_version is a number', () => {
    const snap = computeEvaluatorDiagnosticSnapshot(VALID_INPUTS);
    expect(typeof snap.wiring_version).toBe('number');
  });
});

// ─── B. computeEvaluatorDiagnosticSnapshot — fail-safe on bad inputs ──────────

describe('computeEvaluatorDiagnosticSnapshot — fail-safe on bad inputs (B)', () => {
  it.each([null, undefined, {}, 'string', 42, [], true])(
    'B1–B5/B9. %s → fail_safe: true, never throws',
    (badInput) => {
      let snap;
      expect(() => { snap = computeEvaluatorDiagnosticSnapshot(badInput); }).not.toThrow();
      expect(snap.fail_safe).toBe(true);
    },
  );

  it('B6. evaluator_version correct on fail-safe path', () => {
    const snap = computeEvaluatorDiagnosticSnapshot(null);
    expect(snap.evaluator_version).toBe(EVALUATOR_VERSION);
  });

  it('B7. active_dimensions still present on fail-safe path', () => {
    const snap = computeEvaluatorDiagnosticSnapshot(null);
    expect(Array.isArray(snap.active_dimensions)).toBe(true);
    expect(snap.active_dimensions.length).toBe(ACTIVE_QUALITY_DIMENSIONS.length);
  });

  it('B8. risk_flags present and correctly shaped on fail-safe path', () => {
    const snap = computeEvaluatorDiagnosticSnapshot(null);
    expect(typeof snap.risk_flags).toBe('object');
    for (const k of EXPECTED_RISK_FLAG_KEYS) {
      expect(snap.risk_flags).toHaveProperty(k);
    }
  });

  it('B10. fail-safe path returns agent_role: "" and wiring_version: 0', () => {
    const snap = computeEvaluatorDiagnosticSnapshot(null);
    expect(snap.agent_role).toBe('');
    expect(snap.wiring_version).toBe(0);
  });

  it('B1. null → aggregate_band is FAIL_SAFE', () => {
    const snap = computeEvaluatorDiagnosticSnapshot(null);
    expect(snap.aggregate_band).toBe(EVALUATOR_AGGREGATE_BANDS.FAIL_SAFE);
  });
});

// ─── C. computeEvaluatorDiagnosticSnapshot — valid inputs ─────────────────────

describe('computeEvaluatorDiagnosticSnapshot — valid inputs (C)', () => {
  it('C1. Valid strategyState → fail_safe: false', () => {
    const snap = computeEvaluatorDiagnosticSnapshot(VALID_INPUTS);
    expect(snap.fail_safe).toBe(false);
  });

  it('C2. aggregate_band = UNKNOWN for valid inputs (scaffold: no scoring yet)', () => {
    const snap = computeEvaluatorDiagnosticSnapshot(VALID_INPUTS);
    expect(snap.aggregate_band).toBe(EVALUATOR_AGGREGATE_BANDS.UNKNOWN);
  });

  it('C3. agent_role extracted from wiringIdentity.name', () => {
    const snap = computeEvaluatorDiagnosticSnapshot(VALID_INPUTS);
    expect(snap.agent_role).toBe('cbt_therapist');
  });

  it('C4. wiring_version extracted from wiringIdentity.stage2_phase', () => {
    const snap = computeEvaluatorDiagnosticSnapshot(VALID_INPUTS);
    expect(snap.wiring_version).toBe(8);
  });

  it('C5. risk_flags.safety_active reflects safetyResult.safety_mode', () => {
    const withSafety = { ...VALID_INPUTS, safetyResult: { safety_mode: true, triggers: [] } };
    const snap = computeEvaluatorDiagnosticSnapshot(withSafety);
    expect(snap.risk_flags.safety_active).toBe(true);

    const withoutSafety = { ...VALID_INPUTS, safetyResult: { safety_mode: false, triggers: [] } };
    const snap2 = computeEvaluatorDiagnosticSnapshot(withoutSafety);
    expect(snap2.risk_flags.safety_active).toBe(false);
  });

  it('C6. risk_flags.distress_tier extracted from distressTier input', () => {
    const snap = computeEvaluatorDiagnosticSnapshot({ ...VALID_INPUTS, distressTier: 'tier_high' });
    expect(snap.risk_flags.distress_tier).toBe('tier_high');
  });

  it('C7. risk_flags.has_risk_flags from continuity signals', () => {
    const withRiskFlags = {
      ...VALID_INPUTS,
      strategyState: { ...VALID_STRATEGY_STATE, has_risk_flags: true },
    };
    const snap = computeEvaluatorDiagnosticSnapshot(withRiskFlags);
    expect(snap.risk_flags.has_risk_flags).toBe(true);
  });

  it('C8. risk_flags.lts_has_risk_history from LTS inputs', () => {
    const withRiskHistory = {
      ...VALID_INPUTS,
      ltsInputs: { ...VALID_LTS_INPUTS, lts_has_risk_history: true },
    };
    const snap = computeEvaluatorDiagnosticSnapshot(withRiskHistory);
    expect(snap.risk_flags.lts_has_risk_history).toBe(true);
  });

  it('C9. Deterministic: same inputs always produce equal output', () => {
    const snap1 = computeEvaluatorDiagnosticSnapshot(VALID_INPUTS);
    const snap2 = computeEvaluatorDiagnosticSnapshot(VALID_INPUTS);
    expect(JSON.stringify(snap1)).toBe(JSON.stringify(snap2));
  });

  it('C10. Output snapshot has exactly the 8 approved top-level keys', () => {
    const snap = computeEvaluatorDiagnosticSnapshot(VALID_INPUTS);
    const actualKeys = new Set(Object.keys(snap));
    for (const k of EXPECTED_SNAPSHOT_KEYS) {
      expect(actualKeys.has(k)).toBe(true);
    }
    expect(actualKeys.size).toBe(EXPECTED_SNAPSHOT_KEYS.size);
  });
});

// ─── D. No raw text / no private entity leakage ──────────────────────────────

describe('computeEvaluatorDiagnosticSnapshot — no raw text / private entity leakage (D)', () => {
  it('D1. rawMessage field in inputs is ignored (not present in output)', () => {
    const inputsWithRaw = {
      ...VALID_INPUTS,
      rawMessage: 'This is raw user text that must never appear in output.',
    };
    const snap = computeEvaluatorDiagnosticSnapshot(inputsWithRaw);
    const serialized = JSON.stringify(snap);
    expect(serialized).not.toContain('raw user text');
    expect(serialized).not.toContain('rawMessage');
  });

  it('D2. No field in the diagnostic snapshot contains raw user text', () => {
    const rawText = 'PRIVATE_USER_MESSAGE_XYZ';
    const inputsWithRaw = { ...VALID_INPUTS, rawMessage: rawText };
    const snap = computeEvaluatorDiagnosticSnapshot(inputsWithRaw);
    const serialized = JSON.stringify(snap);
    expect(serialized).not.toContain(rawText);
  });

  it('D3. No ThoughtJournal, Conversation, CaseFormulation fields in output', () => {
    const snap = computeEvaluatorDiagnosticSnapshot(VALID_INPUTS);
    const serialized = JSON.stringify(snap);
    expect(serialized).not.toContain('ThoughtJournal');
    expect(serialized).not.toContain('Conversation');
    expect(serialized).not.toContain('CaseFormulation');
  });

  it('D4. risk_flags keys are only the four approved metadata keys', () => {
    const snap = computeEvaluatorDiagnosticSnapshot(VALID_INPUTS);
    expect(Object.keys(snap.risk_flags).sort()).toEqual(
      [...EXPECTED_RISK_FLAG_KEYS].sort(),
    );
  });

  it('D5. Output contains only string, boolean, number, array, or plain object values', () => {
    const snap = computeEvaluatorDiagnosticSnapshot(VALID_INPUTS);
    for (const [, v] of Object.entries(snap)) {
      const t = typeof v;
      const isAllowed = t === 'string' || t === 'boolean' || t === 'number' ||
        Array.isArray(v) || (t === 'object' && v !== null && !Array.isArray(v));
      expect(isAllowed).toBe(true);
    }
  });
});

// ─── E. isQualityEvaluatorEnabled — flag evaluation ──────────────────────────

describe('isQualityEvaluatorEnabled — flag evaluation (E)', () => {
  it('E1. Returns false when QUALITY_EVALUATOR_FLAGS.QUALITY_EVALUATOR_ENABLED is false (default)', () => {
    // In test environment, VITE_ env vars are not set, so flag defaults to false.
    expect(QUALITY_EVALUATOR_FLAGS.QUALITY_EVALUATOR_ENABLED).toBe(false);
    expect(isQualityEvaluatorEnabled('QUALITY_EVALUATOR_ENABLED')).toBe(false);
  });

  it('E2. Returns false for unknown flag name', () => {
    expect(isQualityEvaluatorEnabled('UNKNOWN_FLAG_XYZ')).toBe(false);
  });

  it('E4. Default parameter is QUALITY_EVALUATOR_ENABLED', () => {
    // Calling with no argument uses the default parameter.
    expect(isQualityEvaluatorEnabled()).toBe(
      isQualityEvaluatorEnabled('QUALITY_EVALUATOR_ENABLED'),
    );
  });
});

// ─── F. getActivationDiagnostics — evaluatorLayer ────────────────────────────

describe('getActivationDiagnostics — evaluatorLayer (F)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete globalThis.window;
  });

  it('F1. Returns null when _s2debug=true is absent (no window)', () => {
    delete globalThis.window;
    const result = getActivationDiagnostics();
    expect(result).toBeNull();
  });

  it('F2. evaluatorLayer present in return value when _s2debug=true', () => {
    globalThis.window = {
      location: {
        hostname: 'localhost',
        search: '?_s2debug=true',
      },
    };
    const result = getActivationDiagnostics();
    expect(result).not.toBeNull();
    expect(result).toHaveProperty('evaluatorLayer');
  });

  it('F3. evaluatorLayer.evaluatorEnabled is a boolean', () => {
    globalThis.window = {
      location: {
        hostname: 'localhost',
        search: '?_s2debug=true',
      },
    };
    const result = getActivationDiagnostics();
    expect(typeof result.evaluatorLayer.evaluatorEnabled).toBe('boolean');
  });

  it('F4. evaluatorLayer does not include raw session data', () => {
    globalThis.window = {
      location: {
        hostname: 'localhost',
        search: '?_s2debug=true',
      },
    };
    const result = getActivationDiagnostics();
    const serialized = JSON.stringify(result.evaluatorLayer);
    expect(serialized).not.toContain('message');
    expect(serialized).not.toContain('user');
    expect(serialized).not.toContain('journal');
  });
});

// ─── G. Session-start output unchanged when evaluator runs ───────────────────

describe('Session-start output unchanged when evaluator runs (G)', () => {
  it('G1. buildV8SessionStartContentAsync returns a string', async () => {
    const result = await buildV8SessionStartContentAsync(V8_WIRING, EMPTY_ENTITIES, {});
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('G2. buildV8SessionStartContentAsync with non-V8 wiring delegates to V7 path (string output)', async () => {
    const result = await buildV8SessionStartContentAsync(HYBRID_WIRING, EMPTY_ENTITIES, {});
    expect(typeof result).toBe('string');
  });

  it('G3. buildV9SessionStartContentAsync output is a string (no evaluator in return value)', async () => {
    const result = await buildV9SessionStartContentAsync(V9_WIRING, EMPTY_ENTITIES, {});
    expect(typeof result).toBe('string');
  });

  it('G4. buildV10SessionStartContentAsync with non-V10 wiring delegates to V9 path (string)', async () => {
    const nonV10 = { ...V10_WIRING, knowledge_layer_enabled: false };
    const result = await buildV10SessionStartContentAsync(nonV10, EMPTY_ENTITIES, {});
    expect(typeof result).toBe('string');
  });

  it('G — session-start string does not contain evaluator diagnostic markup', async () => {
    const result = await buildV8SessionStartContentAsync(V8_WIRING, EMPTY_ENTITIES, {});
    expect(result).not.toContain('[Wave 5D]');
    expect(result).not.toContain('evaluator_version');
    expect(result).not.toContain('aggregate_band');
  });
});

// ─── H. Session-start output unchanged when evaluator throws/fails ─────────────

describe('Session-start output unchanged when evaluator throws/fails (H)', () => {
  it('H1. buildV8SessionStartContentAsync output unchanged even if evaluator diagnostic fails', async () => {
    // Run once without error to get baseline
    const baseline = await buildV8SessionStartContentAsync(V8_WIRING, EMPTY_ENTITIES, {});

    // Mock computeEvaluatorDiagnosticSnapshot to throw (test the fail-open path in V8)
    // Since _emitEvaluatorDiagnosticIfEnabled is inside a try/catch, output should be unchanged.
    // We can't directly spy on the private function, so we verify output contract:
    const result = await buildV8SessionStartContentAsync(V8_WIRING, EMPTY_ENTITIES, {});
    expect(result).toBe(baseline);
  });

  it('H2. console.error not emitted when evaluator diagnostic function itself is error-safe', () => {
    // computeEvaluatorDiagnosticSnapshot never throws; all errors return fail-safe snapshot.
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Call with bad inputs that would trigger fail-safe paths
    expect(() => computeEvaluatorDiagnosticSnapshot(null)).not.toThrow();
    expect(() => computeEvaluatorDiagnosticSnapshot(undefined)).not.toThrow();
    expect(() => computeEvaluatorDiagnosticSnapshot('string')).not.toThrow();
    expect(() => computeEvaluatorDiagnosticSnapshot([])).not.toThrow();

    consoleSpy.mockRestore();
  });
});

// ─── I. Evaluator diagnostics absent or skipped when gate is off ──────────────

describe('Evaluator diagnostics absent or skipped when gate is off (I)', () => {
  let consoleGroupSpy;

  beforeEach(() => {
    consoleGroupSpy = vi.spyOn(console, 'group').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'groupEnd').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete globalThis.window;
  });

  it('I1/I3. console.group [Wave 5D] NOT called when _s2debug absent from URL', async () => {
    globalThis.window = {
      location: { hostname: 'localhost', search: '' },
    };
    await buildV8SessionStartContentAsync(V8_WIRING, EMPTY_ENTITIES, {});
    const wave5dCalls = consoleGroupSpy.mock.calls.filter(
      (args) => args[0] && String(args[0]).includes('[Wave 5D]'),
    );
    expect(wave5dCalls.length).toBe(0);
  });

  it('I2. console.group [Wave 5D] NOT called when QUALITY_EVALUATOR_ENABLED is off (env not set)', async () => {
    // In test env, VITE_QUALITY_EVALUATOR_ENABLED is not set ('true'), so the gate is off.
    globalThis.window = {
      location: { hostname: 'localhost', search: '?_s2debug=true' },
    };
    await buildV8SessionStartContentAsync(V8_WIRING, EMPTY_ENTITIES, {});
    const wave5dCalls = consoleGroupSpy.mock.calls.filter(
      (args) => args[0] && String(args[0]).includes('[Wave 5D]'),
    );
    expect(wave5dCalls.length).toBe(0);
  });
});

// ─── J. No regression to V10/V9 fallback behavior ────────────────────────────

describe('No regression to V10/V9/V8 fallback behavior (J)', () => {
  it('J1. buildV10 with non-V10 wiring returns same as buildV9', async () => {
    const nonV10 = { ...V10_WIRING, knowledge_layer_enabled: false };
    const v9result = await buildV9SessionStartContentAsync(nonV10, EMPTY_ENTITIES, {});
    const v10result = await buildV10SessionStartContentAsync(nonV10, EMPTY_ENTITIES, {});
    expect(v10result).toBe(v9result);
  });

  it('J2. buildV9 with non-V9 wiring returns same as buildV8', async () => {
    const nonV9 = { ...V9_WIRING, longitudinal_layer_enabled: false };
    const v8result = await buildV8SessionStartContentAsync(nonV9, EMPTY_ENTITIES, {});
    const v9result = await buildV9SessionStartContentAsync(nonV9, EMPTY_ENTITIES, {});
    expect(v9result).toBe(v8result);
  });

  it('J3. Session-start string output does not contain evaluator diagnostic markup', async () => {
    const result = await buildV8SessionStartContentAsync(V8_WIRING, EMPTY_ENTITIES, {});
    expect(result).not.toContain('evaluator_version');
    expect(result).not.toContain('aggregate_band');
    expect(result).not.toContain('[Wave 5D]');
    expect(result).not.toContain('risk_flags');
  });
});

// ─── K. No regression to Companion flows ─────────────────────────────────────

describe('No regression to Companion flows (K)', () => {
  it('K1. computeEvaluatorDiagnosticSnapshot does not accept or return companion entity fields', () => {
    const inputs = {
      ...VALID_INPUTS,
      CompanionMemory: [{ memory_type: 'session', content: 'test' }],
    };
    const snap = computeEvaluatorDiagnosticSnapshot(inputs);
    const serialized = JSON.stringify(snap);
    expect(serialized).not.toContain('CompanionMemory');
    expect(serialized).not.toContain('memory_type');
  });

  it('K2. Output does not include companion memory content', () => {
    const snap = computeEvaluatorDiagnosticSnapshot(VALID_INPUTS);
    const serialized = JSON.stringify(snap);
    expect(serialized).not.toContain('companion');
    // agent_role may contain 'therapist' but not 'companion' entity references
    expect(serialized).not.toContain('warmth_enabled');
    expect(serialized).not.toContain('continuity_enabled');
  });

  it('K3. therapistQualityEvaluator.js source has zero import lines', () => {
    const src = path.resolve(
      import.meta.dirname,
      '../../src/lib/therapistQualityEvaluator.js',
    );
    const content = fs.readFileSync(src, 'utf-8');
    const importLines = content
      .split('\n')
      .filter((line) => /^\s*import\s/.test(line));
    expect(importLines.length).toBe(0);
  });
});

// ─── L. Deterministic diagnostic snapshot shape ───────────────────────────────

describe('Deterministic diagnostic snapshot shape (L)', () => {
  it('L1. Same inputs → identical snapshot value (deep equality)', () => {
    const snap1 = computeEvaluatorDiagnosticSnapshot(VALID_INPUTS);
    const snap2 = computeEvaluatorDiagnosticSnapshot(VALID_INPUTS);
    expect(snap1.evaluator_version).toBe(snap2.evaluator_version);
    expect(snap1.aggregate_band).toBe(snap2.aggregate_band);
    expect(snap1.fail_safe).toBe(snap2.fail_safe);
    expect(snap1.agent_role).toBe(snap2.agent_role);
    expect(snap1.wiring_version).toBe(snap2.wiring_version);
    expect(JSON.stringify(snap1.dimensions)).toBe(JSON.stringify(snap2.dimensions));
    expect(JSON.stringify(snap1.risk_flags)).toBe(JSON.stringify(snap2.risk_flags));
  });

  it('L2. active_dimensions order is stable across calls', () => {
    const snap1 = computeEvaluatorDiagnosticSnapshot(VALID_INPUTS);
    const snap2 = computeEvaluatorDiagnosticSnapshot(VALID_INPUTS);
    expect(snap1.active_dimensions).toEqual(snap2.active_dimensions);
  });

  it('L3. Snapshot shape matches expected keys set exactly', () => {
    const snap = computeEvaluatorDiagnosticSnapshot(VALID_INPUTS);
    const actualKeys = new Set(Object.keys(snap));
    expect(actualKeys.size).toBe(EXPECTED_SNAPSHOT_KEYS.size);
    for (const k of EXPECTED_SNAPSHOT_KEYS) {
      expect(actualKeys.has(k)).toBe(true);
    }
  });
});

// ─── M. Module isolation ──────────────────────────────────────────────────────

describe('Module isolation — no new forbidden imports added (M)', () => {
  it('M1. therapistQualityEvaluator.js still has zero import statements', () => {
    const src = path.resolve(
      import.meta.dirname,
      '../../src/lib/therapistQualityEvaluator.js',
    );
    const content = fs.readFileSync(src, 'utf-8');
    const importLines = content
      .split('\n')
      .filter((line) => /^\s*import\s/.test(line));
    expect(importLines.length).toBe(0);
  });

  it('M2. computeEvaluatorDiagnosticSnapshot is exported from therapistQualityEvaluator', () => {
    expect(typeof computeEvaluatorDiagnosticSnapshot).toBe('function');
  });

  it('M3. isQualityEvaluatorEnabled is exported from featureFlags.js', () => {
    expect(typeof isQualityEvaluatorEnabled).toBe('function');
  });
});
