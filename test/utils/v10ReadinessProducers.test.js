/**
 * @file test/utils/v10ReadinessProducers.test.js
 *
 * V10 Knowledge — Phase 6 — Structured runtime producers verification.
 *
 * Proves the 15 required properties of the new production-safe structured
 * runtime producers for the L5 intervention-readiness detectors and cbt_domain.
 *
 * No entity-record mutation, no publish, no deploy. Pure unit + source-assertion
 * tests only.
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

import {
  buildPlannerContext,
  scoreFormulationRecord,
  FORMULATION_MIN_USEFUL_FIELDS,
} from '../../src/lib/workflowContextInjector.js';
import {
  planCBTKnowledgeRetrieval,
  checkInterventionReadiness,
  CBT_KNOWLEDGE_SKIP_REASONS,
  CBT_KNOWLEDGE_RUNTIME_ALLOWED_DOMAINS_FIRST_WAVE,
} from '../../src/lib/cbtKnowledgePlanner.js';
import { extractFormulationHintsForPlanner } from '../../src/lib/cbtKnowledgeRetrieval.js';
import {
  extractReadinessSignals,
  targetRefBoundToFormulation,
} from '../../src/lib/readinessSignalReader.js';
import {
  validateCaseFormulationPayload,
  CASE_FORMULATION_DOMAIN_VALUES,
} from '../../src/lib/caseFormulationValidator.js';

const DISTRESS_LOW = 'tier_low';
const CONT = 'sess_prior_001';

// Canonical formulation that scores >= FORMULATION_MIN_USEFUL_FIELDS (score 4).
const CANONICAL_FULL = Object.freeze({
  conversation_id: 'c1',
  presenting_themes: ['Workplace anxiety'],
  core_belief_hypotheses: [{ belief: 'I am not good enough', status: 'working_hypothesis' }],
  maintaining_behaviors: { avoidance: ['Procrastinating on reviews'] },
  goals: ['Build tolerance for uncertainty', 'Reduce review avoidance'],
});

const ISO = '2026-08-20T10:00:00.000Z';
const ISO2 = '2026-08-25T10:00:00.000Z';

function pmRationaleClear(out) {
  return out.payload.pending_move && out.payload.pending_move.rationale_clear;
}

describe('Phase 6 — readiness producers (extractReadinessSignals)', () => {
  it('1. every signal has a real runtime producer and consumer', () => {
    // Producer: structured CaseFormulation fields. Consumer: buildPlannerContext.
    const rec = {
      ...CANONICAL_FULL,
      understanding_confirmed: { confirmed: true, session_id: CONT, confirmed_at: ISO },
      pending_move: {
        ready: true, rationale_clear: true, move_id: 'm1',
        target_ref: 'Build tolerance for uncertainty', rationale: 'Exposure ladder',
        session_id: CONT, set_at: ISO,
      },
      holding_complete: { complete: true, session_id: CONT, case_type: 'grief_loss', completed_at: ISO },
    };
    const signals = extractReadinessSignals(rec, { continuation_session_id: CONT });
    expect(signals.has_been_understood).toBe(true);
    expect(signals.readiness_signal).toBe(true);
    expect(signals.rationale_is_clear).toBe(true);
    expect(signals.holding_complete).toBe(true);
    // Consumer: buildPlannerContext feeds these into checkInterventionReadiness.
    const ctx = buildPlannerContext(rec, null, DISTRESS_LOW, { continuation_session_id: CONT });
    expect(ctx.intervention_ready).toBe(true);
  });

  it('2. missing producers remain false', () => {
    const signals = extractReadinessSignals(CANONICAL_FULL, { continuation_session_id: CONT });
    expect(signals.has_been_understood).toBe(false);
    expect(signals.readiness_signal).toBe(false);
    expect(signals.rationale_is_clear).toBe(false);
    expect(signals.holding_complete).toBe(false);
    const ctx = buildPlannerContext(CANONICAL_FULL, null, DISTRESS_LOW, { continuation_session_id: CONT });
    expect(ctx.intervention_ready).toBe(false);
  });

  it('3. stale or cross-session readiness evidence is rejected', () => {
    const rec = {
      ...CANONICAL_FULL,
      understanding_confirmed: { confirmed: true, session_id: 'OTHER_SESSION', confirmed_at: ISO },
      pending_move: {
        ready: true, rationale_clear: true, move_id: 'm1',
        target_ref: 'Build tolerance for uncertainty', rationale: 'x',
        session_id: 'OTHER_SESSION', set_at: ISO,
      },
      holding_complete: { complete: true, session_id: 'OTHER_SESSION', case_type: 'grief_loss', completed_at: ISO },
    };
    const signals = extractReadinessSignals(rec, { continuation_session_id: CONT });
    expect(signals.has_been_understood).toBe(false);
    expect(signals.readiness_signal).toBe(false);
    expect(signals.rationale_is_clear).toBe(false);
    expect(signals.holding_complete).toBe(false);
  });

  it('3b. a fresh opener with no continuation_session_id keeps every signal false', () => {
    const rec = {
      ...CANONICAL_FULL,
      understanding_confirmed: { confirmed: true, session_id: 'any', confirmed_at: ISO },
      pending_move: { ready: true, rationale_clear: true, move_id: 'm1', target_ref: 'Build tolerance for uncertainty', rationale: 'x', session_id: 'any', set_at: ISO },
      holding_complete: { complete: true, session_id: 'any', case_type: 'grief_loss', completed_at: ISO },
    };
    const signals = extractReadinessSignals(rec, {});
    expect(signals.has_been_understood).toBe(false);
    expect(signals.readiness_signal).toBe(false);
    expect(signals.rationale_is_clear).toBe(false);
    expect(signals.holding_complete).toBe(false);
    const ctx = buildPlannerContext(rec, null, DISTRESS_LOW, {});
    expect(ctx.intervention_ready).toBe(false);
  });

  it('4. a rich formulation does not imply understanding or readiness', () => {
    expect(scoreFormulationRecord(CANONICAL_FULL)).toBeGreaterThanOrEqual(FORMULATION_MIN_USEFUL_FIELDS);
    const ctx = buildPlannerContext(CANONICAL_FULL, null, DISTRESS_LOW, { continuation_session_id: CONT });
    expect(ctx.formulation_in_place).toBe(true);
    expect(ctx.has_been_understood).toBe(false);
    expect(ctx.intervention_ready).toBe(false);
  });

  it('5. rationale without a move/target binding is rejected', () => {
    const rec = {
      ...CANONICAL_FULL,
      pending_move: {
        ready: true, rationale_clear: true, move_id: '', target_ref: '', rationale: '',
        session_id: CONT, set_at: ISO,
      },
    };
    const signals = extractReadinessSignals(rec, { continuation_session_id: CONT });
    expect(signals.readiness_signal).toBe(true);
    expect(signals.rationale_is_clear).toBe(false);
  });

  it('6. a move bound to the wrong formulation target is rejected', () => {
    const rec = {
      ...CANONICAL_FULL,
      pending_move: {
        ready: true, rationale_clear: true, move_id: 'm1',
        target_ref: 'NOT_A_REAL_TARGET', rationale: 'x',
        session_id: CONT, set_at: ISO,
      },
    };
    const signals = extractReadinessSignals(rec, { continuation_session_id: CONT });
    expect(signals.readiness_signal).toBe(true);
    expect(signals.rationale_is_clear).toBe(false);
    expect(targetRefBoundToFormulation('NOT_A_REAL_TARGET', CANONICAL_FULL)).toBe(false);
    expect(targetRefBoundToFormulation('Build tolerance for uncertainty', CANONICAL_FULL)).toBe(true);
  });

  it('7. high-protection cases require a genuine holding-complete event', () => {
    for (const caseType of ['grief_loss', 'trauma', 'first_disclosure']) {
      const without = buildPlannerContext(CANONICAL_FULL, null, DISTRESS_LOW, {
        case_type: caseType, continuation_session_id: CONT,
      });
      expect(without.intervention_ready).toBe(false);
      const withHolding = buildPlannerContext(
        { ...CANONICAL_FULL, holding_complete: { complete: true, session_id: CONT, case_type: caseType, completed_at: ISO } },
        null, DISTRESS_LOW, { case_type: caseType, continuation_session_id: CONT },
      );
      // holding_complete now true via producer, but still needs understanding + ready + rationale.
      expect(withHolding.has_been_understood).toBe(false);
      expect(withHolding.intervention_ready).toBe(false);
    }
  });

  it('7b. holding_complete from a different session is rejected', () => {
    const rec = {
      ...CANONICAL_FULL,
      holding_complete: { complete: true, session_id: 'OTHER', case_type: 'grief_loss', completed_at: ISO },
    };
    expect(extractReadinessSignals(rec, { continuation_session_id: CONT }).holding_complete).toBe(false);
  });
});

describe('Phase 6 — cbt_domain producer (validator + planner)', () => {
  it('8. invalid cbt_domain values are rejected or omitted', () => {
    const out = validateCaseFormulationPayload({
      conversation_id: 'c1', cbt_domain: 'not_a_real_domain',
      presenting_themes: ['x'], goals: ['y'],
    });
    expect(out.payload.cbt_domain).toBeUndefined();
    expect(out.errors.some((e) => e.includes('cbt_domain omitted'))).toBe(true);
    // Invalid values never default to general.
    expect(out.payload.cbt_domain).not.toBe('general');
    // Out-of-enum-but-shaped values also omitted.
    const out2 = validateCaseFormulationPayload({ conversation_id: 'c1', cbt_domain: 42 });
    expect(out2.payload.cbt_domain).toBeUndefined();
  });

  it('9. missing cbt_domain returns NO_DOMAIN at the planner', () => {
    const hints = extractFormulationHintsForPlanner(CANONICAL_FULL);
    expect(hints.domain).toBe('');
    const plan = planCBTKnowledgeRetrieval({
      flagEnabled: true,
      strategyState: { intervention_mode: 'structured_exploration', safety_mode_active: false, distress_tier: 'tier_low' },
      formulationHints: { domain: '', is_ambiguous: false },
      distressTier: 'tier_low',
      safetyActive: false,
    });
    expect(plan.shouldRetrieve).toBe(false);
    expect(plan.skipReason).toBe(CBT_KNOWLEDGE_SKIP_REASONS.NO_DOMAIN);
  });

  it('10. valid structured domain persistence reaches the planner', () => {
    for (const d of ['anxiety', 'depression', 'social_anxiety']) {
      const out = validateCaseFormulationPayload({ conversation_id: 'c1', cbt_domain: d });
      expect(out.payload.cbt_domain).toBe(d);
      const hints = extractFormulationHintsForPlanner({ ...CANONICAL_FULL, cbt_domain: d });
      expect(hints.domain).toBe(d);
      expect(CBT_KNOWLEDGE_RUNTIME_ALLOWED_DOMAINS_FIRST_WAVE.has(d)).toBe(true);
    }
  });

  it('10b. the exact 12-value enum is the only accepted domain set', () => {
    expect(CASE_FORMULATION_DOMAIN_VALUES.length).toBe(12);
    expect(new Set(CASE_FORMULATION_DOMAIN_VALUES).size).toBe(12);
  });
});

describe('Phase 6 — runtime wiring + opaque override immunity', () => {
  const wciPath = path.resolve(process.cwd(), 'src/lib/workflowContextInjector.js');
  const wciSrc = fs.readFileSync(wciPath, 'utf8');

  it('11. an opaque opts.intervention_ready:true remains ignored', () => {
    const ctx = buildPlannerContext(CANONICAL_FULL, null, DISTRESS_LOW, {
      intervention_ready: true, continuation_session_id: CONT,
    });
    expect(ctx.intervention_ready).toBe(false);
    // Source still derives from the canonical checklist (no opaque passthrough).
    expect(wciSrc).toContain('intervention_ready: readinessResult.ready');
    expect(wciSrc).not.toContain('intervention_ready: opts.intervention_ready === true,');
  });

  it('12. the removed Preview readiness override remains absent', () => {
    expect(wciSrc).not.toContain('_isV10PreviewHost');
    expect(wciSrc).not.toContain('mindful-path-v10-preview');
    expect(wciSrc).not.toContain('formulation_in_place: true, has_been_understood: true, intervention_ready: true');
    expect(wciSrc).toContain("import { checkInterventionReadiness } from './cbtKnowledgePlanner.js'");
    expect(wciSrc).toContain("import { extractReadinessSignals } from './readinessSignalReader.js'");
  });

  it("13. checkInterventionReadiness remains the only readiness aggregator and ignores opaque intervention_ready", () => {
    // All real detectors pass (no high-protection case => holding not required) → ready.
    expect(checkInterventionReadiness({
      formulation_in_place: true, person_feels_understood: true, readiness_signal: true,
      rationale_is_clear: true, distress_allows_task: true,
    }).ready).toBe(true);
    // Opaque intervention_ready:true cannot satisfy the gate when a REAL detector
    // fails (holding_complete missing on a high-protection case_type).
    expect(checkInterventionReadiness({
      formulation_in_place: true, person_feels_understood: true, readiness_signal: true,
      rationale_is_clear: true, distress_allows_task: true, case_type: 'grief_loss',
      intervention_ready: true,
    }).ready).toBe(false);
  });

  it('14. V11/V12 remain disabled (preview override set is exactly the four V10 flags)', async () => {
    const mod = await import('../../src/lib/featureFlags.js');
    const {
      V10_KNOWLEDGE_PREVIEW_OVERRIDES,
      V10_KNOWLEDGE_PREVIEW_HOST,
      V10_KNOWLEDGE_PRODUCTION_HOST,
      _isPreviewStagingHost,
    } = mod;
    expect(Object.isFrozen(V10_KNOWLEDGE_PREVIEW_OVERRIDES)).toBe(true);
    const keys = Object.keys(V10_KNOWLEDGE_PREVIEW_OVERRIDES).sort();
    expect(keys).toEqual([
      'THERAPIST_UPGRADE_ENABLED',
      'THERAPIST_UPGRADE_KNOWLEDGE_ENABLED',
      'THERAPIST_UPGRADE_LONGITUDINAL_ENABLED',
      'THERAPIST_UPGRADE_STRATEGY_ENABLED',
    ].sort());
    expect(keys).not.toContain('THERAPIST_UPGRADE_COMPETENCE_ENABLED');
    expect(keys).not.toContain('THERAPIST_UPGRADE_PLANNER_FIRST_ENABLED');
    // Production & lookalike hosts receive no Preview activation.
    expect(_isPreviewStagingHost('mindful-path-75aeaf7d.base44.app')).toBe(false);
    expect(_isPreviewStagingHost('mindfulpath.com')).toBe(false);
    expect(_isPreviewStagingHost(V10_KNOWLEDGE_PRODUCTION_HOST)).toBe(false);
    expect(_isPreviewStagingHost(`${V10_KNOWLEDGE_PREVIEW_HOST}.evil.com`)).toBe(false);
  });

  it('15. existing records without the new optional structured fields remain valid', () => {
    // An old record carrying only conversation_id (the sole required field) validates.
    const out = validateCaseFormulationPayload({ conversation_id: 'legacy-1' });
    expect(out.valid).toBe(true);
    expect(out.payload).toEqual({ conversation_id: 'legacy-1' });
    // And the reader returns all-false for it.
    const signals = extractReadinessSignals({ conversation_id: 'legacy-1' }, { continuation_session_id: CONT });
    expect(signals.has_been_understood).toBe(false);
    expect(signals.readiness_signal).toBe(false);
    expect(signals.rationale_is_clear).toBe(false);
    expect(signals.holding_complete).toBe(false);
    // And buildPlannerContext keeps intervention_ready false with no opts overrides.
    const ctx = buildPlannerContext({ conversation_id: 'legacy-1' }, null, DISTRESS_LOW, { continuation_session_id: CONT });
    expect(ctx.intervention_ready).toBe(false);
  });
});

describe('Phase 6 — validator refuses readiness producers without canonical evidence', () => {
  it('refuses understanding_confirmed and pending_move and holding_complete on a domain-only record', () => {
    const out = validateCaseFormulationPayload({
      conversation_id: 'c1', cbt_domain: 'anxiety',
      understanding_confirmed: { confirmed: true, session_id: 's1', confirmed_at: ISO },
      pending_move: { ready: true, rationale_clear: true, move_id: 'm', target_ref: 'g', rationale: 'r', session_id: 's1', set_at: ISO },
      holding_complete: { complete: true, session_id: 's1', case_type: 'grief_loss', completed_at: ISO },
    });
    expect(out.valid).toBe(true);
    expect(out.payload.cbt_domain).toBe('anxiety');
    expect(out.payload.understanding_confirmed).toBeUndefined();
    expect(out.payload.pending_move).toBeUndefined();
    expect(out.payload.holding_complete).toBeUndefined();
    expect(out.errors.some((e) => e.includes('refused: insufficient canonical'))).toBe(true);
  });

  it('persists producers on a canonical-evidence record and omits invalid cbt_domain', () => {
    const out = validateCaseFormulationPayload({
      conversation_id: 'c1',
      cbt_domain: 'bogus_domain',
      presenting_themes: ['Workplace anxiety'], goals: ['Build tolerance for uncertainty'],
      understanding_confirmed: { confirmed: true, session_id: 's1', confirmed_at: ISO },
      pending_move: { ready: true, rationale_clear: true, move_id: 'm', target_ref: 'Build tolerance for uncertainty', rationale: 'r', session_id: 's1', set_at: ISO },
      holding_complete: { complete: true, session_id: 's1', case_type: 'grief_loss', completed_at: ISO2 },
    });
    expect(out.valid).toBe(true);
    expect(out.payload.cbt_domain).toBeUndefined();
    expect(out.payload.understanding_confirmed).toBeDefined();
    expect(out.payload.pending_move).toBeDefined();
    expect(out.payload.holding_complete).toBeDefined();
    // rationale_clear is true at write time (strings present); the runtime reader
    // re-checks the goal/target binding at read time (test #6).
    expect(pmRationaleClear(out)).toBe(true);
  });

  it('refuses rationale_clear when move_id/target_ref/rationale are missing', () => {
    const out = validateCaseFormulationPayload({
      conversation_id: 'c1',
      presenting_themes: ['x'], goals: ['y'],
      pending_move: { ready: true, rationale_clear: true, move_id: '', target_ref: '', rationale: '', session_id: 's1', set_at: ISO },
    });
    expect(pmRationaleClear(out)).toBe(false);
    expect(out.errors.some((e) => e.includes('rationale_clear refused'))).toBe(true);
  });

  it('refuses holding_complete for a non-high-protection case_type', () => {
    const out = validateCaseFormulationPayload({
      conversation_id: 'c1',
      presenting_themes: ['x'], goals: ['y'],
      holding_complete: { complete: true, session_id: 's1', case_type: 'social_anxiety', completed_at: ISO },
    });
    expect(out.payload.holding_complete).toBeUndefined();
    expect(out.errors.some((e) => e.includes('not a HIGH-protection type'))).toBe(true);
  });
});
