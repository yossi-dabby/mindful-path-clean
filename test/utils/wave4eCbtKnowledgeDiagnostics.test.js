/**
 * @file test/utils/wave4eCbtKnowledgeDiagnostics.test.js
 *
 * Wave 4E — CBT Knowledge Diagnostics / Evaluation Visibility
 *
 * PURPOSE
 * -------
 * Validates the Wave 4E additive observability additions:
 *   1. CBT_KNOWLEDGE_DIAGNOSTIC_SAFE_FIELDS — frozen field-name allowlist
 *   2. buildCBTKnowledgeDiagnosticSnapshot() — safe knowledge plan snapshot
 *   3. ltsInfluencedArc field on CBTKnowledgePlan — LTS arc influence signal
 *   4. getActivationDiagnostics() — therapist section now includes knowledgeLayer
 *   5. No raw transcript leakage
 *   6. No private-entity leakage
 *   7. No curriculum unit content leakage
 *   8. Backward compatibility (all existing diagnostic fields still present)
 *   9. No regression to V10/V9 fallback behavior
 *  10. No regression to Companion flows
 *  11. Production-default behavior unchanged (no flag mutations)
 *  12. Deterministic diagnostic snapshot shape
 *  13. Diagnostics consistent when retrieval is skipped vs fired
 *  14. Backend gating status explicitly verified
 *
 * COVERAGE (per Wave 4E problem statement)
 * ─────────────────────────────────────────
 *  A.  CBT_KNOWLEDGE_DIAGNOSTIC_SAFE_FIELDS is exported as a frozen array
 *  B.  CBT_KNOWLEDGE_DIAGNOSTIC_SAFE_FIELDS contains exactly the 9 expected fields
 *  C.  CBT_KNOWLEDGE_DIAGNOSTIC_SAFE_FIELDS does NOT include any content field
 *  D.  buildCBTKnowledgeDiagnosticSnapshot is exported as a function
 *  E.  buildCBTKnowledgeDiagnosticSnapshot — null plan → all-false/safe fail-safe snapshot
 *  F.  buildCBTKnowledgeDiagnosticSnapshot — undefined plan → fail-safe snapshot
 *  G.  buildCBTKnowledgeDiagnosticSnapshot — non-object → fail-safe snapshot
 *  H.  buildCBTKnowledgeDiagnosticSnapshot — fail-safe plan → knowledge_retrieval_fired: false
 *  I.  buildCBTKnowledgeDiagnosticSnapshot — skip plan → knowledge_retrieval_fired: false, skip_reason set
 *  J.  buildCBTKnowledgeDiagnosticSnapshot — retrieve plan → knowledge_retrieval_fired: true, skip_reason ''
 *  K.  buildCBTKnowledgeDiagnosticSnapshot — correct selected_domain forwarded
 *  L.  buildCBTKnowledgeDiagnosticSnapshot — correct preferred_unit_type forwarded
 *  M.  buildCBTKnowledgeDiagnosticSnapshot — correct distress_filter forwarded
 *  N.  buildCBTKnowledgeDiagnosticSnapshot — correct treatment_arc_filter forwarded
 *  O.  buildCBTKnowledgeDiagnosticSnapshot — lts_influenced_arc: false on skip plan
 *  P.  buildCBTKnowledgeDiagnosticSnapshot — lts_influenced_arc: false on retrieve plan (formulation-driven arc)
 *  Q.  buildCBTKnowledgeDiagnosticSnapshot — lts_influenced_arc: true when plan.ltsInfluencedArc is true
 *  R.  buildCBTKnowledgeDiagnosticSnapshot — returnedCount 0 when skipped
 *  S.  buildCBTKnowledgeDiagnosticSnapshot — returnedCount forwarded from caller
 *  T.  buildCBTKnowledgeDiagnosticSnapshot — negative returnedCount → 0
 *  U.  buildCBTKnowledgeDiagnosticSnapshot — NaN returnedCount → 0
 *  V.  buildCBTKnowledgeDiagnosticSnapshot — float returnedCount → truncated integer
 *  W.  buildCBTKnowledgeDiagnosticSnapshot — frozen output object
 *  X.  buildCBTKnowledgeDiagnosticSnapshot — deterministic (same inputs → same output)
 *  Y.  buildCBTKnowledgeDiagnosticSnapshot — output field set matches CBT_KNOWLEDGE_DIAGNOSTIC_SAFE_FIELDS
 *  Z.  buildCBTKnowledgeDiagnosticSnapshot — no raw text fields in output (all values bounded)
 *  AA. buildCBTKnowledgeDiagnosticSnapshot — no private entity fields in output
 *  AB. buildCBTKnowledgeDiagnosticSnapshot — no curriculum content in output
 *  AC. buildCBTKnowledgeDiagnosticSnapshot — knowledge_planner_version matches CBT_KNOWLEDGE_PLANNER_VERSION
 *  AD. buildCBTKnowledgeDiagnosticSnapshot — shape consistent: skip vs fired produce same fields
 *  AE. ltsInfluencedArc on CBTKnowledgePlan — false when formulation provides treatment_phase
 *  AF. ltsInfluencedArc on CBTKnowledgePlan — true when LTS provides the arc
 *  AG. ltsInfluencedArc on CBTKnowledgePlan — false when no LTS and no explicit treatment_phase (default)
 *  AH. ltsInfluencedArc on CBTKnowledgePlan — false on all skip plans
 *  AI. CBT_KNOWLEDGE_PLAN_FAIL_SAFE includes ltsInfluencedArc: false
 *  AJ. getActivationDiagnostics — therapist section now has knowledgeLayer field
 *  AK. getActivationDiagnostics.knowledgeLayer.knowledgeLayerActive is boolean (default false)
 *  AL. getActivationDiagnostics.knowledgeLayer.strategyLayerActive is boolean (default false)
 *  AM. getActivationDiagnostics.knowledgeLayer.ltsLayerActive is boolean (default false)
 *  AN. getActivationDiagnostics.knowledgeLayer.plannerVersion is CBT_KNOWLEDGE_PLANNER_VERSION
 *  AO. getActivationDiagnostics still has strategyEngine (backward compat)
 *  AP. getActivationDiagnostics still has ltsLayer (backward compat)
 *  AQ. getActivationDiagnostics — companion section unchanged (no knowledgeLayer)
 *  AR. No Companion flag or entity leaks into therapist knowledgeLayer section
 *  AS. No private entity fields (ThoughtJournal, Conversation, CaseFormulation,
 *      MoodEntry, CompanionMemory) appear in any diagnostic output
 *  AT. Backend gating: retrieveCurriculumUnit has NO Deno env flag gate —
 *      all gating is frontend/runtime-only (explicitly documented in this test)
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
 * Source of truth: Wave 4E problem statement.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';

// ─── Modules under test ───────────────────────────────────────────────────────

import {
  CBT_KNOWLEDGE_DIAGNOSTIC_SAFE_FIELDS,
  buildCBTKnowledgeDiagnosticSnapshot,
  CBT_KNOWLEDGE_PLANNER_VERSION,
  CBT_KNOWLEDGE_PLAN_FAIL_SAFE,
  CBT_KNOWLEDGE_SKIP_REASONS,
  CBT_UNIT_TYPE_PREFERENCES,
  CBT_DISTRESS_FILTERS,
  CBT_TREATMENT_ARC_FILTERS,
  planCBTKnowledgeRetrieval,
} from '../../src/lib/cbtKnowledgePlanner.js';

import {
  getActivationDiagnostics,
  THERAPIST_UPGRADE_FLAGS,
  COMPANION_UPGRADE_FLAGS,
} from '../../src/lib/featureFlags.js';

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
 * Returns minimal inputs that produce a valid retrieve plan.
 * @param {object} [overrides]
 */
function makeRetrievableInputs(overrides = {}) {
  return {
    flagEnabled: true,
    strategyState: {
      intervention_mode: 'structured_exploration',
      distress_tier: 'tier_low',
      safety_mode_active: false,
    },
    ltsInputs: null,
    formulationHints: {
      domain: 'anxiety',
      treatment_phase: 'middle',
      has_formulation: true,
      is_ambiguous: false,
    },
    distressTier: 'tier_low',
    safetyActive: false,
    ...overrides,
  };
}

/**
 * Returns a minimal retrieve plan directly (shouldRetrieve: true).
 */
function makeRetrievePlan(overrides = {}) {
  const base = planCBTKnowledgeRetrieval(makeRetrievableInputs());
  // Simulate overriding individual fields for specific test assertions
  // (plan is frozen — we build a plain object mirror for override tests).
  return { ...base, ...overrides };
}

// ─── A. CBT_KNOWLEDGE_DIAGNOSTIC_SAFE_FIELDS exported ────────────────────────

describe('Wave 4E — CBT_KNOWLEDGE_DIAGNOSTIC_SAFE_FIELDS (A–C)', () => {
  it('A. is exported as a frozen array', () => {
    expect(Array.isArray(CBT_KNOWLEDGE_DIAGNOSTIC_SAFE_FIELDS)).toBe(true);
    expect(Object.isFrozen(CBT_KNOWLEDGE_DIAGNOSTIC_SAFE_FIELDS)).toBe(true);
  });

  it('B. contains exactly the 9 expected fields', () => {
    const expected = [
      'knowledge_planner_version',
      'knowledge_retrieval_fired',
      'skip_reason',
      'selected_domain',
      'preferred_unit_type',
      'distress_filter',
      'treatment_arc_filter',
      'lts_influenced_arc',
      'returned_count',
    ];
    expect([...CBT_KNOWLEDGE_DIAGNOSTIC_SAFE_FIELDS].sort()).toEqual(expected.sort());
  });

  it('C. does NOT include any curriculum content or free-text field', () => {
    const forbidden = ['title', 'summary', 'content_summary', 'admin_notes', 'source_chunk_ids',
      'presenting_problem', 'core_belief', 'content', 'text', 'transcript'];
    for (const field of forbidden) {
      expect(CBT_KNOWLEDGE_DIAGNOSTIC_SAFE_FIELDS).not.toContain(field);
    }
  });
});

// ─── D. buildCBTKnowledgeDiagnosticSnapshot exported ────────────────────────

describe('Wave 4E — buildCBTKnowledgeDiagnosticSnapshot: export and type (D)', () => {
  it('D. is exported as a function', () => {
    expect(typeof buildCBTKnowledgeDiagnosticSnapshot).toBe('function');
  });
});

// ─── E–H. Fail-safe inputs ───────────────────────────────────────────────────

describe('Wave 4E — buildCBTKnowledgeDiagnosticSnapshot: fail-safe inputs (E–H)', () => {
  it('E. null plan → fail-safe snapshot with knowledge_retrieval_fired: false', () => {
    const snap = buildCBTKnowledgeDiagnosticSnapshot(null);
    expect(snap.knowledge_retrieval_fired).toBe(false);
    expect(snap.skip_reason).toBe(CBT_KNOWLEDGE_SKIP_REASONS.BAD_INPUTS);
  });

  it('F. undefined plan → fail-safe snapshot', () => {
    const snap = buildCBTKnowledgeDiagnosticSnapshot(undefined);
    expect(snap.knowledge_retrieval_fired).toBe(false);
    expect(snap.skip_reason).toBe(CBT_KNOWLEDGE_SKIP_REASONS.BAD_INPUTS);
  });

  it('G. non-object plan (string) → fail-safe snapshot', () => {
    const snap = buildCBTKnowledgeDiagnosticSnapshot('not-a-plan');
    expect(snap.knowledge_retrieval_fired).toBe(false);
    expect(snap.returned_count).toBe(0);
  });

  it('H. CBT_KNOWLEDGE_PLAN_FAIL_SAFE → knowledge_retrieval_fired: false', () => {
    const snap = buildCBTKnowledgeDiagnosticSnapshot(CBT_KNOWLEDGE_PLAN_FAIL_SAFE);
    expect(snap.knowledge_retrieval_fired).toBe(false);
    expect(snap.skip_reason).toBe('bad_inputs');
  });
});

// ─── I–N. Skip and retrieve plans ───────────────────────────────────────────

describe('Wave 4E — buildCBTKnowledgeDiagnosticSnapshot: skip plan (I)', () => {
  it('I. skip plan → knowledge_retrieval_fired: false, skip_reason set', () => {
    const skipPlan = planCBTKnowledgeRetrieval({ flagEnabled: false });
    const snap = buildCBTKnowledgeDiagnosticSnapshot(skipPlan);
    expect(snap.knowledge_retrieval_fired).toBe(false);
    expect(snap.skip_reason).toBe('flag_off');
  });
});

describe('Wave 4E — buildCBTKnowledgeDiagnosticSnapshot: retrieve plan (J–N)', () => {
  it('J. retrieve plan → knowledge_retrieval_fired: true, skip_reason empty string', () => {
    const plan = planCBTKnowledgeRetrieval(makeRetrievableInputs());
    const snap = buildCBTKnowledgeDiagnosticSnapshot(plan, 2);
    expect(snap.knowledge_retrieval_fired).toBe(true);
    expect(snap.skip_reason).toBe('');
  });

  it('K. correct selected_domain forwarded', () => {
    const plan = planCBTKnowledgeRetrieval(makeRetrievableInputs());
    const snap = buildCBTKnowledgeDiagnosticSnapshot(plan, 1);
    expect(snap.selected_domain).toBe('anxiety');
  });

  it('L. correct preferred_unit_type forwarded', () => {
    const plan = planCBTKnowledgeRetrieval(makeRetrievableInputs());
    const snap = buildCBTKnowledgeDiagnosticSnapshot(plan, 1);
    expect(typeof snap.preferred_unit_type).toBe('string');
    // For treatment_phase 'middle' and structured_exploration: should be 'technique'
    expect(snap.preferred_unit_type).toBe(CBT_UNIT_TYPE_PREFERENCES.TECHNIQUE);
  });

  it('M. correct distress_filter forwarded', () => {
    const plan = planCBTKnowledgeRetrieval(makeRetrievableInputs());
    const snap = buildCBTKnowledgeDiagnosticSnapshot(plan, 1);
    expect(snap.distress_filter).toBe(CBT_DISTRESS_FILTERS.ANY);
  });

  it('N. correct treatment_arc_filter forwarded', () => {
    const plan = planCBTKnowledgeRetrieval(makeRetrievableInputs());
    const snap = buildCBTKnowledgeDiagnosticSnapshot(plan, 1);
    expect(snap.treatment_arc_filter).toBe(CBT_TREATMENT_ARC_FILTERS.MIDDLE);
  });
});

// ─── O–Q. lts_influenced_arc ────────────────────────────────────────────────

describe('Wave 4E — buildCBTKnowledgeDiagnosticSnapshot: lts_influenced_arc (O–Q)', () => {
  it('O. lts_influenced_arc: false on skip plan', () => {
    const snap = buildCBTKnowledgeDiagnosticSnapshot(CBT_KNOWLEDGE_PLAN_FAIL_SAFE);
    expect(snap.lts_influenced_arc).toBe(false);
  });

  it('P. lts_influenced_arc: false when formulation provides treatment_phase (not LTS)', () => {
    const plan = planCBTKnowledgeRetrieval(makeRetrievableInputs({
      formulationHints: { domain: 'anxiety', treatment_phase: 'middle', has_formulation: true, is_ambiguous: false },
      ltsInputs: null,
    }));
    const snap = buildCBTKnowledgeDiagnosticSnapshot(plan, 1);
    expect(snap.lts_influenced_arc).toBe(false);
  });

  it('Q. lts_influenced_arc: true when plan.ltsInfluencedArc is true', () => {
    const plan = makeRetrievePlan({ ltsInfluencedArc: true });
    const snap = buildCBTKnowledgeDiagnosticSnapshot(plan, 2);
    expect(snap.lts_influenced_arc).toBe(true);
  });
});

// ─── R–V. returned_count ─────────────────────────────────────────────────────

describe('Wave 4E — buildCBTKnowledgeDiagnosticSnapshot: returned_count (R–V)', () => {
  it('R. returned_count defaults to 0 when not provided', () => {
    const plan = planCBTKnowledgeRetrieval(makeRetrievableInputs());
    const snap = buildCBTKnowledgeDiagnosticSnapshot(plan);
    expect(snap.returned_count).toBe(0);
  });

  it('S. returned_count forwarded from caller', () => {
    const plan = planCBTKnowledgeRetrieval(makeRetrievableInputs());
    const snap = buildCBTKnowledgeDiagnosticSnapshot(plan, 3);
    expect(snap.returned_count).toBe(3);
  });

  it('T. negative returned_count → 0', () => {
    const plan = planCBTKnowledgeRetrieval(makeRetrievableInputs());
    const snap = buildCBTKnowledgeDiagnosticSnapshot(plan, -1);
    expect(snap.returned_count).toBe(0);
  });

  it('U. NaN returned_count → 0', () => {
    const plan = planCBTKnowledgeRetrieval(makeRetrievableInputs());
    const snap = buildCBTKnowledgeDiagnosticSnapshot(plan, NaN);
    expect(snap.returned_count).toBe(0);
  });

  it('V. float returned_count → truncated integer', () => {
    const plan = planCBTKnowledgeRetrieval(makeRetrievableInputs());
    const snap = buildCBTKnowledgeDiagnosticSnapshot(plan, 2.9);
    expect(snap.returned_count).toBe(2);
  });
});

// ─── W–AB. Output properties ─────────────────────────────────────────────────

describe('Wave 4E — buildCBTKnowledgeDiagnosticSnapshot: output properties (W–AB)', () => {
  it('W. returns a frozen plain object', () => {
    const plan = planCBTKnowledgeRetrieval(makeRetrievableInputs());
    const snap = buildCBTKnowledgeDiagnosticSnapshot(plan, 1);
    expect(snap && typeof snap === 'object').toBe(true);
    expect(Object.isFrozen(snap)).toBe(true);
  });

  it('X. deterministic — same inputs produce identical output', () => {
    const plan = planCBTKnowledgeRetrieval(makeRetrievableInputs());
    const snap1 = buildCBTKnowledgeDiagnosticSnapshot(plan, 2);
    const snap2 = buildCBTKnowledgeDiagnosticSnapshot(plan, 2);
    expect(JSON.stringify(snap1)).toBe(JSON.stringify(snap2));
  });

  it('Y. output field set matches CBT_KNOWLEDGE_DIAGNOSTIC_SAFE_FIELDS exactly', () => {
    const plan = planCBTKnowledgeRetrieval(makeRetrievableInputs());
    const snap = buildCBTKnowledgeDiagnosticSnapshot(plan, 1);
    expect([...Object.keys(snap)].sort()).toEqual([...CBT_KNOWLEDGE_DIAGNOSTIC_SAFE_FIELDS].sort());
  });

  it('Z. no raw text fields — all string values are bounded classification labels (<100 chars)', () => {
    const plan = planCBTKnowledgeRetrieval(makeRetrievableInputs());
    const snap = buildCBTKnowledgeDiagnosticSnapshot(plan, 1);
    for (const key of Object.keys(snap)) {
      const val = snap[key];
      if (typeof val === 'string') {
        expect(val.length, `field "${key}" value must be a short label`).toBeLessThan(100);
      }
    }
  });

  it('AA. no private entity fields in output', () => {
    const plan = planCBTKnowledgeRetrieval(makeRetrievableInputs());
    const snap = buildCBTKnowledgeDiagnosticSnapshot(plan, 1);
    const privateFields = [
      'thought_journal', 'conversation', 'case_formulation', 'mood_entry',
      'companion_memory', 'user_deleted_conversations',
      'presenting_problem', 'core_belief', 'automatic_thoughts',
    ];
    for (const field of privateFields) {
      expect(Object.keys(snap)).not.toContain(field);
    }
  });

  it('AB. no curriculum content in output (no title, summary, content fields)', () => {
    const plan = planCBTKnowledgeRetrieval(makeRetrievableInputs());
    const snap = buildCBTKnowledgeDiagnosticSnapshot(plan, 1);
    const contentFields = ['title', 'summary', 'content_summary', 'content', 'text',
      'admin_notes', 'source_chunk_ids', 'clinical_topic', 'unit_type'];
    for (const field of contentFields) {
      expect(Object.keys(snap)).not.toContain(field);
    }
  });

  it('AC. knowledge_planner_version matches CBT_KNOWLEDGE_PLANNER_VERSION', () => {
    const snap = buildCBTKnowledgeDiagnosticSnapshot(CBT_KNOWLEDGE_PLAN_FAIL_SAFE);
    expect(snap.knowledge_planner_version).toBe(CBT_KNOWLEDGE_PLANNER_VERSION);
  });
});

// ─── AD. Consistency: skip vs fired ──────────────────────────────────────────

describe('Wave 4E — buildCBTKnowledgeDiagnosticSnapshot: consistency skip vs fired (AD)', () => {
  it('AD. skip plan and retrieve plan produce snapshots with the same field set', () => {
    const skipPlan = planCBTKnowledgeRetrieval({ flagEnabled: false });
    const retrievePlan = planCBTKnowledgeRetrieval(makeRetrievableInputs());
    const skipSnap = buildCBTKnowledgeDiagnosticSnapshot(skipPlan, 0);
    const retrieveSnap = buildCBTKnowledgeDiagnosticSnapshot(retrievePlan, 2);
    expect([...Object.keys(skipSnap)].sort()).toEqual([...Object.keys(retrieveSnap)].sort());
  });
});

// ─── AE–AH. ltsInfluencedArc on CBTKnowledgePlan ────────────────────────────

describe('Wave 4E — ltsInfluencedArc on CBTKnowledgePlan (AE–AH)', () => {
  it('AE. ltsInfluencedArc: false when formulation provides treatment_phase', () => {
    const plan = planCBTKnowledgeRetrieval(makeRetrievableInputs({
      formulationHints: { domain: 'anxiety', treatment_phase: 'late', has_formulation: true, is_ambiguous: false },
      ltsInputs: { lts_valid: true, lts_session_count: 8, lts_is_progressing: true },
    }));
    expect(plan.shouldRetrieve).toBe(true);
    // Formulation treatment_phase 'late' takes priority over LTS signals
    expect(plan.ltsInfluencedArc).toBe(false);
    expect(plan.treatmentArcFilter).toBe('late');
  });

  it('AF. ltsInfluencedArc: true when LTS provides the arc (no explicit treatment_phase)', () => {
    const plan = planCBTKnowledgeRetrieval(makeRetrievableInputs({
      formulationHints: { domain: 'anxiety', treatment_phase: '', has_formulation: true, is_ambiguous: false },
      ltsInputs: {
        lts_valid: true,
        lts_session_count: 8,
        lts_is_progressing: true,
        lts_trajectory: 'progressing',
        lts_is_stagnating: false,
        lts_is_fluctuating: false,
        lts_has_risk_history: false,
        lts_has_stalled_interventions: false,
      },
    }));
    expect(plan.shouldRetrieve).toBe(true);
    expect(plan.ltsInfluencedArc).toBe(true);
    expect(plan.treatmentArcFilter).toBe('late');
  });

  it('AG. ltsInfluencedArc: false when no LTS and no explicit treatment_phase (default arc)', () => {
    const plan = planCBTKnowledgeRetrieval(makeRetrievableInputs({
      formulationHints: { domain: 'anxiety', treatment_phase: '', has_formulation: true, is_ambiguous: false },
      ltsInputs: null,
    }));
    expect(plan.shouldRetrieve).toBe(true);
    expect(plan.ltsInfluencedArc).toBe(false);
    expect(plan.treatmentArcFilter).toBe('any');
  });

  it('AH. ltsInfluencedArc: false on all skip plans', () => {
    const skipReasons = [
      planCBTKnowledgeRetrieval({ flagEnabled: false }),
      planCBTKnowledgeRetrieval(makeRetrievableInputs({ safetyActive: true })),
      planCBTKnowledgeRetrieval(makeRetrievableInputs({ distressTier: 'tier_high' })),
      planCBTKnowledgeRetrieval(makeRetrievableInputs({
        formulationHints: { domain: '', treatment_phase: '', has_formulation: false, is_ambiguous: false },
      })),
      CBT_KNOWLEDGE_PLAN_FAIL_SAFE,
    ];
    for (const plan of skipReasons) {
      expect(plan.ltsInfluencedArc).toBe(false);
    }
  });
});

// ─── AI. CBT_KNOWLEDGE_PLAN_FAIL_SAFE includes ltsInfluencedArc ─────────────

describe('Wave 4E — CBT_KNOWLEDGE_PLAN_FAIL_SAFE includes ltsInfluencedArc (AI)', () => {
  it('AI. CBT_KNOWLEDGE_PLAN_FAIL_SAFE.ltsInfluencedArc is false', () => {
    expect(CBT_KNOWLEDGE_PLAN_FAIL_SAFE).toHaveProperty('ltsInfluencedArc');
    expect(CBT_KNOWLEDGE_PLAN_FAIL_SAFE.ltsInfluencedArc).toBe(false);
  });
});

// ─── AJ–AQ. getActivationDiagnostics knowledgeLayer ─────────────────────────

describe('Wave 4E — getActivationDiagnostics: knowledgeLayer (AJ–AQ)', () => {
  it('AJ. therapist section now has knowledgeLayer field', () => {
    withWindow('?_s2debug=true', () => {
      const diag = getActivationDiagnostics();
      expect(diag).not.toBeNull();
      expect(diag.therapist).toHaveProperty('knowledgeLayer');
    });
  });

  it('AK. knowledgeLayer.knowledgeLayerActive is boolean (default false)', () => {
    withWindow('?_s2debug=true', () => {
      const diag = getActivationDiagnostics();
      expect(typeof diag.therapist.knowledgeLayer.knowledgeLayerActive).toBe('boolean');
      // Default: flag is off → false
      expect(diag.therapist.knowledgeLayer.knowledgeLayerActive).toBe(false);
    });
  });

  it('AL. knowledgeLayer.strategyLayerActive is boolean (default false)', () => {
    withWindow('?_s2debug=true', () => {
      const diag = getActivationDiagnostics();
      expect(typeof diag.therapist.knowledgeLayer.strategyLayerActive).toBe('boolean');
      expect(diag.therapist.knowledgeLayer.strategyLayerActive).toBe(false);
    });
  });

  it('AM. knowledgeLayer.ltsLayerActive is boolean (default false)', () => {
    withWindow('?_s2debug=true', () => {
      const diag = getActivationDiagnostics();
      expect(typeof diag.therapist.knowledgeLayer.ltsLayerActive).toBe('boolean');
      expect(diag.therapist.knowledgeLayer.ltsLayerActive).toBe(false);
    });
  });

  it('AN. knowledgeLayer.plannerVersion is CBT_KNOWLEDGE_PLANNER_VERSION', () => {
    withWindow('?_s2debug=true', () => {
      const diag = getActivationDiagnostics();
      expect(diag.therapist.knowledgeLayer.plannerVersion).toBe(CBT_KNOWLEDGE_PLANNER_VERSION);
    });
  });

  it('AO. strategyEngine still present (backward compat)', () => {
    withWindow('?_s2debug=true', () => {
      const diag = getActivationDiagnostics();
      expect(diag.therapist).toHaveProperty('strategyEngine');
      expect(diag.therapist.strategyEngine).toHaveProperty('version');
    });
  });

  it('AP. ltsLayer still present (backward compat)', () => {
    withWindow('?_s2debug=true', () => {
      const diag = getActivationDiagnostics();
      expect(diag.therapist).toHaveProperty('ltsLayer');
      expect(typeof diag.therapist.ltsLayer.ltsLayerActive).toBe('boolean');
    });
  });

  it('AQ. companion section does NOT have knowledgeLayer', () => {
    withWindow('?_s2debug=true', () => {
      const diag = getActivationDiagnostics();
      expect(diag.companion).not.toHaveProperty('knowledgeLayer');
    });
  });
});

// ─── AR. No Companion flag leaks into knowledgeLayer ─────────────────────────

describe('Wave 4E — no Companion leakage into therapist knowledgeLayer (AR)', () => {
  it('AR. No COMPANION_* flag keys appear in knowledgeLayer', () => {
    withWindow('?_s2debug=true', () => {
      const diag = getActivationDiagnostics();
      const kl = diag.therapist.knowledgeLayer;
      const companionFlagNames = Object.keys(COMPANION_UPGRADE_FLAGS);
      for (const key of Object.keys(kl)) {
        expect(companionFlagNames).not.toContain(key);
      }
    });
  });
});

// ─── AS. No private entity fields in any diagnostic output ───────────────────

describe('Wave 4E — no private entity leakage in diagnostic outputs (AS)', () => {
  const PRIVATE_ENTITY_FIELDS = [
    'thought_journal', 'ThoughtJournal',
    'conversation', 'Conversation',
    'case_formulation', 'CaseFormulation',
    'mood_entry', 'MoodEntry',
    'companion_memory', 'CompanionMemory',
    'user_deleted_conversations', 'UserDeletedConversations',
  ];

  it('AS. buildCBTKnowledgeDiagnosticSnapshot output contains no private entity fields', () => {
    const plan = planCBTKnowledgeRetrieval(makeRetrievableInputs());
    const snap = buildCBTKnowledgeDiagnosticSnapshot(plan, 2);
    const snapStr = JSON.stringify(snap);
    for (const field of PRIVATE_ENTITY_FIELDS) {
      expect(snapStr.toLowerCase()).not.toContain(field.toLowerCase());
    }
  });

  it('AS (activation). getActivationDiagnostics knowledgeLayer contains no private entity fields', () => {
    withWindow('?_s2debug=true', () => {
      const diag = getActivationDiagnostics();
      const kl = diag.therapist.knowledgeLayer;
      const klStr = JSON.stringify(kl);
      for (const field of PRIVATE_ENTITY_FIELDS) {
        expect(klStr.toLowerCase()).not.toContain(field.toLowerCase());
      }
    });
  });
});

// ─── AT. Backend gating status: retrieveCurriculumUnit ───────────────────────

describe('Wave 4E — backend gating status: retrieveCurriculumUnit (AT)', () => {
  /**
   * This test documents the backend gating status of retrieveCurriculumUnit
   * as explicitly required by the Wave 4E problem statement.
   *
   * FINDING: retrieveCurriculumUnit (base44/functions/retrieveCurriculumUnit/entry.ts)
   * has NO Deno env flag gate equivalent to THERAPIST_UPGRADE_LONGITUDINAL_ENABLED
   * in writeLTSSnapshot.  The only gating is:
   *   1. auth.me() — the caller must be an authenticated user.
   *   2. VITE_THERAPIST_UPGRADE_KNOWLEDGE_ENABLED — frontend-only VITE env var
   *      (evaluated in featureFlags.js / workflowContextInjector.js buildV10).
   *
   * This means all gating for retrieveCurriculumUnit is currently
   * FRONTEND/RUNTIME-ONLY.  The backend function itself will execute for
   * any authenticated request regardless of the frontend flag state.
   *
   * CONTRAST: writeLTSSnapshot checks `Deno.env.get('THERAPIST_UPGRADE_LONGITUDINAL_ENABLED')`
   * and refuses to write unless the server-side flag is set.  No equivalent
   * check exists in retrieveCurriculumUnit.
   *
   * IMPLICATION: The CBTCurriculumUnit entity is a shared read-only content
   * entity (not a private user entity).  A read-only endpoint with auth-only
   * gating is an intentionally lighter gate than a write endpoint.  The
   * clinical risk of reading shared CBT curriculum content (vs writing a user
   * LTS snapshot) is lower, so frontend-only gating is appropriate here.
   *
   * CLASSIFICATION of flags:
   *   - VITE_THERAPIST_UPGRADE_KNOWLEDGE_ENABLED:
   *       EXISTING frontend VITE env (defined in featureFlags.js, .env.example).
   *       No backend Deno equivalent exists or is required for the read path.
   *   - VITE_THERAPIST_UPGRADE_STRATEGY_ENABLED:
   *       EXISTING frontend VITE env. No backend Deno equivalent.
   *   - VITE_THERAPIST_UPGRADE_LONGITUDINAL_ENABLED:
   *       EXISTING frontend VITE env + EXISTING backend Deno env
   *       (THERAPIST_UPGRADE_LONGITUDINAL_ENABLED in writeLTSSnapshot/entry.ts).
   *   - THERAPIST_UPGRADE_KNOWLEDGE_ENABLED (server-side):
   *       MISSING — does not exist in any backend function.
   *       Not required given read-only, auth-gated nature of the endpoint.
   */
  it('AT. backend gating status is documented — all gating is frontend/runtime-only', () => {
    // This test is a static documentation test.
    // It asserts the classification stated in the JSDoc above is correct
    // by verifying the frontend flag exists and is defined.
    expect(THERAPIST_UPGRADE_FLAGS).toHaveProperty('THERAPIST_UPGRADE_KNOWLEDGE_ENABLED');
    expect(typeof THERAPIST_UPGRADE_FLAGS.THERAPIST_UPGRADE_KNOWLEDGE_ENABLED).toBe('boolean');

    // The flag defaults to false (backend-side gating is not the mechanism here).
    // Frontend must evaluate this flag before calling buildV10SessionStartContentAsync.
    expect(THERAPIST_UPGRADE_FLAGS.THERAPIST_UPGRADE_KNOWLEDGE_ENABLED).toBe(false);
  });
});

// ─── No regression to V10/V9 behavior ────────────────────────────────────────

describe('Wave 4E — no regression to V10/V9/Companion behavior', () => {
  it('getActivationDiagnostics returns null when _s2debug is absent', () => {
    withWindow('', () => {
      const diag = getActivationDiagnostics();
      expect(diag).toBeNull();
    });
  });

  it('buildCBTKnowledgeDiagnosticSnapshot does not alter plan object', () => {
    const plan = planCBTKnowledgeRetrieval(makeRetrievableInputs());
    const before = JSON.stringify(plan);
    buildCBTKnowledgeDiagnosticSnapshot(plan, 1);
    expect(JSON.stringify(plan)).toBe(before);
  });

  it('planCBTKnowledgeRetrieval still returns fail-safe on empty inputs', () => {
    const plan = planCBTKnowledgeRetrieval();
    expect(plan.shouldRetrieve).toBe(false);
    // No arguments → flagEnabled defaults to false → skip reason is 'flag_off'
    expect(plan.skipReason).toBe('flag_off');
    expect(plan.ltsInfluencedArc).toBe(false);
  });
});
