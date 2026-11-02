/**
 * @file test/utils/v10ProductionReadinessWiring.test.js
 *
 * V10 Knowledge — Phase 5 production-readiness wiring.
 *
 * These tests prove the production-safe, fail-closed runtime wiring that
 * replaces the former Preview-only forced readiness bypass:
 *
 *   1. The L5 INTERVENTION_READINESS gate is DERIVED inside buildPlannerContext
 *      from the canonical intervention-readiness checklist (no opaque
 *      opts.intervention_ready passthrough). L2 (formulation_in_place) and L5
 *      (intervention_ready) are distinct precedence levels.
 *   2. cbt_domain alone cannot satisfy either readiness level — a real
 *      formulation (score >= FORMULATION_MIN_USEFUL_FIELDS) is required.
 *   3. Each bounded detector (readiness_signal, rationale_is_clear) is
 *      move-bound / treatment-target-bound and fail-closed when absent.
 *   4. Distress tier gates task engagement (distress_allows_task).
 *   5. High-protection case types require holding_complete.
 *   6. The exact-host readiness override has been removed from
 *      workflowContextInjector.js source.
 *   7. planCBTKnowledgeRetrieval is fail-closed (FLAG_OFF, NO_DOMAIN) and the
 *      retrieval executor's first-wave domain allowlist rejects invalid /
 *      deferred domains.
 *   8. Every production first-wave seed row conforms to the
 *      treatment_arc_position enum and first-wave domain / evidence / active
 *      contract.
 *   9. The feature-flag Preview activation is exact-host scoped and enables
 *      exactly the four V10 flags (no V11 / V12 escalation).
 *
 * No app publish, deploy, Production access, or data/config mutation is
 * performed by this file — pure unit / static source assertions only.
 */

import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';

import {
  scoreFormulationRecord,
  buildPlannerContext,
  FORMULATION_MIN_USEFUL_FIELDS,
} from '../../src/lib/workflowContextInjector.js';

import {
  planCBTKnowledgeRetrieval,
  checkInterventionReadiness,
  INTERVENTION_READINESS_CHECKLIST,
  CBT_KNOWLEDGE_SKIP_REASONS,
  CBT_KNOWLEDGE_RUNTIME_ALLOWED_DOMAINS_FIRST_WAVE,
  CBT_KNOWLEDGE_DEFERRED_DOMAINS,
  PROTECTED_CASE_TYPES,
} from '../../src/lib/cbtKnowledgePlanner.js';

import {
  THERAPIST_UPGRADE_FLAGS,
  isUpgradeEnabled,
  V10_KNOWLEDGE_PREVIEW_HOST,
  V10_KNOWLEDGE_PRODUCTION_HOST,
  V10_KNOWLEDGE_PREVIEW_OVERRIDES,
  _isPreviewStagingHost,
} from '../../src/lib/featureFlags.js';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const DISTRESS_LOW = 'tier_low';
const DISTRESS_MILD = 'tier_mild';
const DISTRESS_MODERATE = 'tier_moderate';
const DISTRESS_HIGH = 'tier_high';

// Canonical formulation that scores >= FORMULATION_MIN_USEFUL_FIELDS.
const CANONICAL_FULL = Object.freeze({
  presenting_themes: ['Workplace anxiety'],
  core_belief_hypotheses: [{ belief: 'I am not good enough' }],
  maintaining_behaviors: { avoidance: ['Procrastinating on reviews'] },
  goals: ['Build tolerance for uncertainty'],
});

// Domain-only record: cbt_domain set, no canonical content → score 0.
const DOMAIN_ONLY = Object.freeze({ cbt_domain: 'anxiety' });

const FULL_DETECTORS = Object.freeze({
  has_been_understood: true,
  readiness_signal: true,
  rationale_is_clear: true,
});

// ─── 1. Canonical intervention-readiness wiring ─────────────────────────────

describe('Phase 5 — canonical intervention-readiness wiring (buildPlannerContext)', () => {
  it('1. intervention_ready is false when any required criterion is missing', () => {
    for (const missing of ['has_been_understood', 'readiness_signal', 'rationale_is_clear']) {
      const opts = { ...FULL_DETECTORS, [missing]: false };
      const ctx = buildPlannerContext(CANONICAL_FULL, null, DISTRESS_LOW, opts);
      expect(ctx.intervention_ready).toBe(false);
    }
    // holding_complete missing on a high-protection case
    const ctxH = buildPlannerContext(CANONICAL_FULL, null, DISTRESS_LOW, {
      ...FULL_DETECTORS,
      case_type: 'grief_loss',
      holding_complete: false,
    });
    expect(ctxH.intervention_ready).toBe(false);
  });

  it('2. formulation readiness (L2) alone cannot satisfy intervention readiness (L5)', () => {
    const ctx = buildPlannerContext(CANONICAL_FULL, null, DISTRESS_LOW, {});
    expect(ctx.formulation_in_place).toBe(true);
    expect(ctx.has_been_understood).toBe(false); // Phase 6: producer-driven, no formulation fallback
    expect(ctx.intervention_ready).toBe(false); // L5 still fail-closed without structured signals
  });

  it('3. cbt_domain alone cannot satisfy either readiness level', () => {
    expect(scoreFormulationRecord(DOMAIN_ONLY)).toBe(0);
    const ctx = buildPlannerContext(DOMAIN_ONLY, null, DISTRESS_LOW, FULL_DETECTORS);
    expect(ctx.formulation_in_place).toBe(false); // L2 fail-closed
    expect(ctx.intervention_ready).toBe(false); // L5 fail-closed
  });

  it('4. low and mild distress satisfy distress_allows_task', () => {
    for (const tier of [DISTRESS_LOW, DISTRESS_MILD]) {
      const ctx = buildPlannerContext(CANONICAL_FULL, null, tier, FULL_DETECTORS);
      expect(ctx.intervention_ready).toBe(true);
    }
  });

  it('5. moderate and high distress cannot satisfy distress_allows_task', () => {
    for (const tier of [DISTRESS_MODERATE, DISTRESS_HIGH]) {
      const ctx = buildPlannerContext(CANONICAL_FULL, null, tier, FULL_DETECTORS);
      expect(ctx.intervention_ready).toBe(false);
    }
  });

  it('6. high-protection cases require holding_complete', () => {
    for (const caseType of ['grief_loss', 'trauma', 'first_disclosure']) {
      const without = buildPlannerContext(CANONICAL_FULL, null, DISTRESS_LOW, {
        ...FULL_DETECTORS,
        case_type: caseType,
        holding_complete: false,
      });
      expect(without.intervention_ready).toBe(false);
      const withHolding = buildPlannerContext(CANONICAL_FULL, null, DISTRESS_LOW, {
        ...FULL_DETECTORS,
        case_type: caseType,
        holding_complete: true,
      });
      expect(withHolding.intervention_ready).toBe(true);
    }
  });

  it('7. rationale_is_clear is move-bound (explicit opt only, never inferred)', () => {
    const without = buildPlannerContext(CANONICAL_FULL, null, DISTRESS_LOW, {
      has_been_understood: true,
      readiness_signal: true,
      rationale_is_clear: false,
    });
    expect(without.intervention_ready).toBe(false);
    const withRationale = buildPlannerContext(CANONICAL_FULL, null, DISTRESS_LOW, {
      has_been_understood: true,
      readiness_signal: true,
      rationale_is_clear: true,
    });
    expect(withRationale.intervention_ready).toBe(true);
  });

  it('7b. readiness_signal is move-bound (explicit opt only, never inferred)', () => {
    const without = buildPlannerContext(CANONICAL_FULL, null, DISTRESS_LOW, {
      has_been_understood: true,
      readiness_signal: false,
      rationale_is_clear: true,
    });
    expect(without.intervention_ready).toBe(false);
  });

  it('8. an opaque opts.intervention_ready is IGNORED', () => {
    const ctx = buildPlannerContext(CANONICAL_FULL, null, DISTRESS_LOW, {
      intervention_ready: true,
    });
    expect(ctx.intervention_ready).toBe(false);
  });

  it('L2 and L5 remain distinct: formulation_in_place != intervention_ready', () => {
    const ctx = buildPlannerContext(CANONICAL_FULL, null, DISTRESS_LOW, {});
    expect(ctx.formulation_in_place).toBe(true);
    expect(ctx.intervention_ready).toBe(false);
  });

  it('checkInterventionReadiness mirrors the gates wired into buildPlannerContext', () => {
    // The canonical checklist is the single source of truth for the L5 gate.
    expect(INTERVENTION_READINESS_CHECKLIST).toContain('readiness_signal');
    expect(INTERVENTION_READINESS_CHECKLIST).toContain('rationale_is_clear');
    expect(INTERVENTION_READINESS_CHECKLIST).toContain('distress_allows_task');
    expect(Array.isArray(PROTECTED_CASE_TYPES) && PROTECTED_CASE_TYPES.length > 0).toBe(true);
    expect(checkInterventionReadiness(null).ready).toBe(false);
  });
});

// ─── 6. Forced readiness override removed from source ───────────────────────

describe('Phase 5 — exact-host readiness bypass removed from source', () => {
  const wciPath = path.resolve(process.cwd(), 'src/lib/workflowContextInjector.js');
  const src = fs.readFileSync(wciPath, 'utf8');

  it('workflowContextInjector no longer contains the planner readiness bypass', () => {
    expect(src).not.toContain('_isV10PreviewHost');
    expect(src).not.toContain(
      'formulation_in_place: true, has_been_understood: true, intervention_ready: true'
    );
  });

  it('workflowContextInjector does not hardcode the preview hostname', () => {
    expect(src).not.toContain('mindful-path-v10-preview.base44.app');
  });

  it('buildPlannerContext derives intervention_ready from the checklist import', () => {
    expect(src).toContain("import { checkInterventionReadiness } from './cbtKnowledgePlanner.js'");
    expect(src).toContain('intervention_ready: readinessResult.ready');
    // The opaque passthrough must be gone.
    expect(src).not.toContain('intervention_ready: opts.intervention_ready === true,');
  });
});

// ─── 9. V10 planner fail-closed ──────────────────────────────────────────────

describe('Phase 5 — V10 fail-closed at the planner + executor allowlist', () => {
  const RETRIEVABLE_STRATEGY = Object.freeze({
    intervention_mode: 'structured_exploration',
    safety_mode_active: false,
    distress_tier: DISTRESS_LOW,
  });

  it('9a. planCBTKnowledgeRetrieval skips when the knowledge flag is off (FLAG_OFF)', () => {
    const plan = planCBTKnowledgeRetrieval({
      flagEnabled: false,
      strategyState: RETRIEVABLE_STRATEGY,
      ltsInputs: {},
      formulationHints: { domain: 'anxiety', is_ambiguous: false },
      distressTier: DISTRESS_LOW,
      safetyActive: false,
    });
    expect(plan.shouldRetrieve).toBe(false);
    expect(plan.skipReason).toBe(CBT_KNOWLEDGE_SKIP_REASONS.FLAG_OFF);
  });

  it('9b. planCBTKnowledgeRetrieval is fail-closed when cbt_domain is absent (NO_DOMAIN)', () => {
    const plan = planCBTKnowledgeRetrieval({
      flagEnabled: true,
      strategyState: RETRIEVABLE_STRATEGY,
      ltsInputs: {},
      formulationHints: { domain: '', is_ambiguous: false },
      distressTier: DISTRESS_LOW,
      safetyActive: false,
    });
    expect(plan.shouldRetrieve).toBe(false);
    expect(plan.skipReason).toBe(CBT_KNOWLEDGE_SKIP_REASONS.NO_DOMAIN);
  });

  it('9c. the retrieval executor first-wave allowlist rejects invalid / deferred domains', () => {
    // cbtKnowledgeRetrieval.js returns '' when plan.domainHint is not in this set
    // (line: `if (!CBT_KNOWLEDGE_RUNTIME_ALLOWED_DOMAINS_FIRST_WAVE.has(plan.domainHint)) return ''`).
    const firstWave = CBT_KNOWLEDGE_RUNTIME_ALLOWED_DOMAINS_FIRST_WAVE;
    expect(firstWave.has('anxiety')).toBe(true);
    expect(firstWave.has('depression')).toBe(true);
    expect(firstWave.has('social_anxiety')).toBe(true);
    expect(firstWave.has('grief')).toBe(true);
    // Deferred / invalid domains must NOT be retrievable at runtime.
    for (const d of ['trauma', 'ocd', 'relationship', 'anger', 'not_a_real_domain', '']) {
      expect(firstWave.has(d)).toBe(false);
    }
    // The deferred set must remain disjoint from the first-wave set.
    for (const d of CBT_KNOWLEDGE_DEFERRED_DOMAINS) {
      expect(firstWave.has(d)).toBe(false);
    }
  });
});

// ─── 11. Production seed validation ──────────────────────────────────────────

describe('Phase 4/5 — production seed first-wave contract', () => {
  const seedPath = path.resolve(process.cwd(), 'src/data/cbt-curriculum-seed-wave4.json');
  const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
  const ALLOWED_ARC = new Set(['early', 'middle', 'late', 'any']);
  const eligible = seed.filter((u) => u.runtime_eligible_first_wave === true);

  it('11a. every first-wave row has a valid (or absent) treatment_arc_position', () => {
    expect(eligible.length).toBe(8);
    for (const unit of eligible) {
      if (Object.prototype.hasOwnProperty.call(unit, 'treatment_arc_position')) {
        expect(ALLOWED_ARC.has(unit.treatment_arc_position)).toBe(true);
      }
      // Absent → entity default "any" applies → valid.
    }
  });

  it('11b. no first-wave row carries non-empty safety_tags', () => {
    const nonEmpty = eligible.filter(
      (u) => Array.isArray(u.safety_tags) && u.safety_tags.length > 0,
    );
    expect(nonEmpty).toHaveLength(0);
  });

  it('11c. every first-wave row has an allowlisted planner_domain, evidence_level, and is_active', () => {
    const FW = CBT_KNOWLEDGE_RUNTIME_ALLOWED_DOMAINS_FIRST_WAVE;
    const EVIDENCE = new Set(['established', 'expert_consensus', 'gold_standard']);
    for (const unit of eligible) {
      expect(FW.has(unit.planner_domain)).toBe(true);
      expect(EVIDENCE.has(unit.evidence_level)).toBe(true);
      expect(unit.is_active).toBe(true);
    }
  });

  it('11d. safety-tagged and trauma reference rows are explicitly excluded from first-wave retrieval', () => {
    expect(seed.length).toBe(11);
    const excluded = seed.filter((u) => u.runtime_eligible_first_wave !== true);
    expect(excluded).toHaveLength(3);
    expect(excluded.map((u) => u.title).sort()).toEqual([
      'Panic Disorder: Interoceptive Exposure Introduction',
      'Phobia: Graded Exposure Hierarchy',
      'Trauma-Focused CBT: Overview of CPT Approach',
    ]);
  });

  it('11e. every first-wave row declares all seven supported languages with six explicit variants', () => {
    const SUPPORTED = ['en', 'he', 'es', 'fr', 'de', 'it', 'pt'];
    const VARIANT_LANGUAGES = SUPPORTED.filter((language) => language !== 'en');

    for (const unit of eligible) {
      expect([...unit.languages].sort()).toEqual([...SUPPORTED].sort());
      expect(unit.languages).not.toContain('all');
      expect(unit.language_variants).toBeTruthy();
      expect(Object.keys(unit.language_variants).sort()).toEqual(
        [...VARIANT_LANGUAGES].sort(),
      );
      for (const language of VARIANT_LANGUAGES) {
        expect(typeof unit.language_variants[language]).toBe('string');
        expect(unit.language_variants[language].trim().length).toBeGreaterThan(120);
      }
    }
  });

  it('11f. excluded high-guard rows remain English-only and carry no runtime translation variants', () => {
    const excluded = seed.filter((u) => u.runtime_eligible_first_wave !== true);
    for (const unit of excluded) {
      expect(unit.languages).toEqual(['en']);
      expect(unit.language_variants).toBeUndefined();
    }
  });
});

// ─── 12/13. Feature-flag Preview activation is exact-host scoped ──────────────

describe('Phase 5 — feature-flag preview activation is exact-host scoped', () => {
  it('12. V10 preview override enables exactly the four V10 flags (no V11/V12)', () => {
    expect(Object.isFrozen(V10_KNOWLEDGE_PREVIEW_OVERRIDES)).toBe(true);
    const keys = Object.keys(V10_KNOWLEDGE_PREVIEW_OVERRIDES).sort();
    expect(keys).toEqual(
      [
        'THERAPIST_UPGRADE_ENABLED',
        'THERAPIST_UPGRADE_KNOWLEDGE_ENABLED',
        'THERAPIST_UPGRADE_LONGITUDINAL_ENABLED',
        'THERAPIST_UPGRADE_STRATEGY_ENABLED',
      ].sort(),
    );
    // No competence / planner-first escalation flag is in the override set.
    expect(keys).not.toContain('THERAPIST_UPGRADE_COMPETENCE_ENABLED');
    expect(keys).not.toContain('THERAPIST_UPGRADE_PLANNER_FIRST_ENABLED');
    for (const k of keys) expect(V10_KNOWLEDGE_PREVIEW_OVERRIDES[k]).toBe(true);
  });

  it('13. _isPreviewStagingHost is exact-host scoped (production & lookalikes rejected)', () => {
    expect(_isPreviewStagingHost(V10_KNOWLEDGE_PREVIEW_HOST)).toBe(true);
    // case-insensitive + trimmed
    expect(_isPreviewStagingHost(` ${V10_KNOWLEDGE_PREVIEW_HOST.toUpperCase()} `)).toBe(true);
    // lookalike subdomain
    expect(_isPreviewStagingHost('mindful-path-v10-preview.base44.app.evil.com')).toBe(false);
    // production app host (different subdomain)
    expect(_isPreviewStagingHost('mindful-path-75aeaf7d.base44.app')).toBe(false);
    // custom production domain
    expect(_isPreviewStagingHost('mindfulpath.com')).toBe(false);
    expect(_isPreviewStagingHost(V10_KNOWLEDGE_PRODUCTION_HOST)).toBe(false);
    // empties / non-strings
    expect(_isPreviewStagingHost('')).toBe(false);
    expect(_isPreviewStagingHost(null)).toBe(false);
    expect(_isPreviewStagingHost(undefined)).toBe(false);
  });

  it('13a. Base44 Production is pinned to V10 only and ignores URL escalation', () => {
    vi.stubGlobal('window', {
      location: {
        hostname: V10_KNOWLEDGE_PRODUCTION_HOST,
        search: '?_s2=THERAPIST_UPGRADE_COMPETENCE_ENABLED,THERAPIST_UPGRADE_PLANNER_FIRST_ENABLED',
      },
    });

    try {
      expect(isUpgradeEnabled('THERAPIST_UPGRADE_ENABLED')).toBe(true);
      expect(isUpgradeEnabled('THERAPIST_UPGRADE_STRATEGY_ENABLED')).toBe(true);
      expect(isUpgradeEnabled('THERAPIST_UPGRADE_LONGITUDINAL_ENABLED')).toBe(true);
      expect(isUpgradeEnabled('THERAPIST_UPGRADE_KNOWLEDGE_ENABLED')).toBe(true);
      expect(isUpgradeEnabled('THERAPIST_UPGRADE_COMPETENCE_ENABLED')).toBe(false);
      expect(isUpgradeEnabled('THERAPIST_UPGRADE_PLANNER_FIRST_ENABLED')).toBe(false);
      expect(isUpgradeEnabled('THERAPIST_UPGRADE_MEMORY_ENABLED')).toBe(false);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('13aa. Base44 Production pin is exact-host and case-insensitive', () => {
    vi.stubGlobal('window', {
      location: {
        hostname: ` ${V10_KNOWLEDGE_PRODUCTION_HOST.toUpperCase()} `,
        search: '',
      },
    });

    try {
      expect(isUpgradeEnabled('THERAPIST_UPGRADE_ENABLED')).toBe(true);
    } finally {
      vi.unstubAllGlobals();
    }

    vi.stubGlobal('window', {
      location: {
        hostname: `${V10_KNOWLEDGE_PRODUCTION_HOST}.evil.com`,
        search: '',
      },
    });

    try {
      expect(isUpgradeEnabled('THERAPIST_UPGRADE_ENABLED')).toBe(false);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('13b. in a non-browser (test) environment isUpgradeEnabled is fail-closed', () => {
    // No env vars set + no window → build-time false + no URL override.
    expect(isUpgradeEnabled('THERAPIST_UPGRADE_KNOWLEDGE_ENABLED')).toBe(false);
    expect(isUpgradeEnabled('THERAPIST_UPGRADE_ENABLED')).toBe(false);
    // Unknown flag names are rejected (flag isolation).
    expect(isUpgradeEnabled('NOT_A_REAL_FLAG')).toBe(false);
  });

  it('13c. THERAPIST_UPGRADE_FLAGS is frozen and contains the four V10 flag keys', () => {
    expect(Object.isFrozen(THERAPIST_UPGRADE_FLAGS)).toBe(true);
    expect('THERAPIST_UPGRADE_KNOWLEDGE_ENABLED' in THERAPIST_UPGRADE_FLAGS).toBe(true);
    expect('THERAPIST_UPGRADE_STRATEGY_ENABLED' in THERAPIST_UPGRADE_FLAGS).toBe(true);
    expect('THERAPIST_UPGRADE_LONGITUDINAL_ENABLED' in THERAPIST_UPGRADE_FLAGS).toBe(true);
    expect('THERAPIST_UPGRADE_ENABLED' in THERAPIST_UPGRADE_FLAGS).toBe(true);
  });
});
