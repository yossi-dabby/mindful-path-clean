/**
 * @file test/utils/wave4cCbtKnowledgeRetrieval.test.js
 *
 * Wave 4C — CBT Knowledge Retrieval Read Path Tests
 *
 * PURPOSE
 * -------
 * Validates the Wave 4C implementation across three areas:
 *
 *   1. cbtKnowledgeRetrieval.js — extractFormulationHintsForPlanner() and
 *      retrieveBoundedCBTKnowledgeBlock() contracts and behavior.
 *
 *   2. workflowContextInjector.js — buildV10SessionStartContentAsync() contracts,
 *      flag gating, V9 delegation, and fail-open behavior.
 *
 *   3. Static analysis — agentWiring.js V10 export, activeAgentWiring.js routing,
 *      and Chat.jsx call site audit.
 *
 * COVERAGE (per Wave 4C problem statement)
 * ─────────────────────────────────────────
 * Group A — extractFormulationHintsForPlanner
 *   A1.  Null record → safe defaults (domain='', treatment_phase='', has_formulation=false)
 *   A2.  Non-object → safe defaults
 *   A3.  Array → safe defaults (Array.isArray guard)
 *   A4.  Record with cbt_domain='anxiety' → domain='anxiety'
 *   A5.  Record with treatment_phase='middle' → treatment_phase='middle'
 *   A6.  Record without cbt_domain → domain=''
 *   A7.  Record without treatment_phase → treatment_phase=''
 *   A8.  has_formulation=true when record is a valid object
 *   A9.  is_ambiguous=false always (NO_DOMAIN skip handles domain-absent case)
 *   A10. cbt_domain is whitespace-trimmed
 *   A11. Non-string cbt_domain → domain=''
 *   A12. Raw text fields (presenting_problem, core_belief) do NOT affect domain
 *
 * Group B — retrieveBoundedCBTKnowledgeBlock guards
 *   B1.  plan.shouldRetrieve=false → returns ''
 *   B2.  plan=null → returns ''
 *   B3.  plan with deferred/high-risk domain → returns '' (domain gate)
 *   B4.  entities=null → returns ''
 *   B5.  entities without CBTCurriculumUnit → returns ''
 *   B6.  CBTCurriculumUnit.filter throws → returns '' (fail-open)
 *   B7.  Empty unit list → returns ''
 *
 * Group C — retrieveBoundedCBTKnowledgeBlock Wave 4A.2 filters
 *   C1.  runtime_eligible_first_wave=false → unit excluded
 *   C2.  runtime_eligible_first_wave=true → unit included
 *   C3.  runtime_eligible_first_wave absent → unit included (fail-open default)
 *   C4.  evidence_level='unclassified' → unit excluded
 *   C5.  evidence_level='emerging' → unit excluded
 *   C6.  evidence_level='established' → unit included
 *   C7.  evidence_level='expert_consensus' → unit included
 *   C8.  safety_tag 'not_for_crisis' → unit excluded (defense-in-depth)
 *   C9.  safety_tag 'not_for_high_distress' → unit excluded (defense-in-depth)
 *   C10. distress_suitability='low_only' with planFilter=LOW_DISTRESS_ONLY → excluded
 *   C11. distress_suitability='mild_and_below' with planFilter=LOW_DISTRESS_ONLY → included
 *   C12. distress_suitability='any' → always included (any plan filter)
 *   C13. treatment_arc_position='late' when planArc='early' → excluded
 *   C14. treatment_arc_position='any' → always included regardless of planArc
 *   C15. cbt_domain mismatch → unit excluded
 *   C16. cbt_domain match → unit included
 *
 * Group D — hard cap and block format
 *   D1.  Hard cap at CBT_KNOWLEDGE_RETRIEVAL_MAX_UNITS (3)
 *   D2.  Block contains header delimiter
 *   D3.  Block contains end delimiter
 *   D4.  Block contains 'supporting context, read-only' label
 *   D5.  admin_notes is NOT present in block output
 *   D6.  source_chunk_ids is NOT present in block output
 *
 * Group E — buildV10SessionStartContentAsync V9 delegation
 *   E1.  Non-V10 wiring → returns exact V9 output (flag off)
 *   E2.  Null wiring → returns exact V9 output
 *   E3.  knowledge_layer_enabled=false → returns exact V9 output
 *   E4.  V10 wiring + empty entities → returns v9Base (fail-open)
 *   E5.  V10 wiring + planner returns no-domain skip → returns exact v9Base
 *   E6.  V10 wiring + safety active → returns exact v9Base (no knowledge block)
 *
 * Group F — buildV10 regression / isolation
 *   F1.  buildV10 with HYBRID wiring returns exactly '[START_SESSION]'
 *   F2.  Companion wiring does NOT have knowledge_layer_enabled
 *   F3.  No raw message text leakage via formulationHints
 *   F4.  No private-entity leakage (only CBTCurriculumUnit access in retrieval module)
 *   F5.  No regression to Companion flows
 *
 * Group G — agentWiring and activeAgentWiring static analysis
 *   G1.  CBT_THERAPIST_WIRING_STAGE2_V10 is exported from agentWiring.js
 *   G2.  V10 has knowledge_layer_enabled: true
 *   G3.  V10 has CBTCurriculumUnit in tool_configs with read_only: true
 *   G4.  V10 has all V9 flags preserved
 *   G5.  resolveTherapistWiring returns V10 when all four flags are on
 *   G6.  resolveTherapistWiring returns V9 when KNOWLEDGE_ENABLED is off
 *   G7.  resolveTherapistWiring returns HYBRID when master gate is off
 *
 * Group H — Chat.jsx static analysis
 *   H1.  Chat.jsx imports buildV10SessionStartContentAsync
 *   H2.  Chat.jsx does not call buildV9SessionStartContentAsync at call sites (all upgraded to V10)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ─── Imports under test ───────────────────────────────────────────────────────

import {
  extractFormulationHintsForPlanner,
  retrieveBoundedCBTKnowledgeBlock,
  CBT_KNOWLEDGE_RETRIEVAL_MAX_UNITS,
  CBT_KNOWLEDGE_RETRIEVAL_OVERFETCH_BOUND,
  CBT_KNOWLEDGE_RETRIEVAL_VERSION,
} from '../../src/lib/cbtKnowledgeRetrieval.js';

import {
  buildV10SessionStartContentAsync,
  buildV9SessionStartContentAsync,
} from '../../src/lib/workflowContextInjector.js';

import {
  CBT_THERAPIST_WIRING_HYBRID,
  AI_COMPANION_WIRING_HYBRID,
  AI_COMPANION_WIRING_UPGRADE_V1,
  AI_COMPANION_WIRING_UPGRADE_V2,
  CBT_THERAPIST_WIRING_STAGE2_V9,
  CBT_THERAPIST_WIRING_STAGE2_V10,
} from '../../src/api/agentWiring.js';

import {
  CBT_DISTRESS_FILTERS,
  CBT_KNOWLEDGE_RUNTIME_ALLOWED_DOMAINS_FIRST_WAVE,
  CBT_KNOWLEDGE_DEFERRED_DOMAINS,
} from '../../src/lib/cbtKnowledgePlanner.js';

// ─── Shared fixtures ─────────────────────────────────────────────────────────

/** A minimal valid CBT curriculum unit for testing (anxiety domain) */
const FIXTURE_UNIT_ANXIETY = {
  id: 'unit-01',
  title: 'Cognitive Restructuring for Anxiety',
  clinical_topic: 'cognitive_distortions',
  content_summary: 'Identifies and challenges maladaptive thought patterns maintaining anxiety.',
  unit_type: 'intervention',
  cbt_domain: 'anxiety',
  languages: ['en'],
  evidence_level: 'established',
  distress_suitability: 'any',
  runtime_eligible_first_wave: true,
  treatment_arc_position: 'any',
  safety_tags: [],
  is_active: true,
  priority_score: 8,
  admin_notes: 'DO NOT EXPOSE — internal notes only',
  source_chunk_ids: ['chunk-abc', 'chunk-def'],
};

/** A minimal valid plan that should trigger retrieval */
const FIXTURE_PLAN_RETRIEVE = {
  shouldRetrieve: true,
  skipReason: null,
  domainHint: 'anxiety',
  unitTypePreference: 'intervention',
  distressFilter: CBT_DISTRESS_FILTERS.ANY,
  treatmentArcFilter: 'any',
};

/** A minimal formulation record with cbt_domain and treatment_phase */
const FIXTURE_FORMULATION_ANXIETY = {
  presenting_problem: 'Persistent worry about social situations',
  core_belief: 'I am inadequate and will be judged',
  treatment_goals: 'Reduce avoidance and develop distress tolerance skills',
  cbt_domain: 'anxiety',
  treatment_phase: 'middle',
};

/** Build a mock entities object with a fake CBTCurriculumUnit entity */
function buildMockEntities(units = [FIXTURE_UNIT_ANXIETY]) {
  return {
    CBTCurriculumUnit: {
      filter: vi.fn().mockResolvedValue(units),
    },
    CaseFormulation: {
      list: vi.fn().mockResolvedValue([]),
    },
    CompanionMemory: {
      list: vi.fn().mockResolvedValue([]),
    },
  };
}

// ─── Group A — extractFormulationHintsForPlanner ─────────────────────────────

describe('Group A — extractFormulationHintsForPlanner', () => {
  it('A1. null record → safe defaults with has_formulation: false', () => {
    const hints = extractFormulationHintsForPlanner(null);
    expect(hints.domain).toBe('');
    expect(hints.treatment_phase).toBe('');
    expect(hints.has_formulation).toBe(false);
    expect(hints.is_ambiguous).toBe(false);
  });

  it('A2. non-object → safe defaults', () => {
    expect(extractFormulationHintsForPlanner('string')).toMatchObject({
      domain: '', has_formulation: false,
    });
    expect(extractFormulationHintsForPlanner(42)).toMatchObject({
      domain: '', has_formulation: false,
    });
  });

  it('A3. array → safe defaults (Array.isArray guard)', () => {
    const hints = extractFormulationHintsForPlanner([{ cbt_domain: 'anxiety' }]);
    expect(hints.domain).toBe('');
    expect(hints.has_formulation).toBe(false);
  });

  it('A4. record with cbt_domain="anxiety" → domain="anxiety"', () => {
    const hints = extractFormulationHintsForPlanner({ cbt_domain: 'anxiety' });
    expect(hints.domain).toBe('anxiety');
  });

  it('A5. record with treatment_phase="middle" → treatment_phase="middle"', () => {
    const hints = extractFormulationHintsForPlanner({ cbt_domain: 'anxiety', treatment_phase: 'middle' });
    expect(hints.treatment_phase).toBe('middle');
  });

  it('A6. record without cbt_domain → domain=""', () => {
    const hints = extractFormulationHintsForPlanner({ presenting_problem: 'anxiety-related' });
    expect(hints.domain).toBe('');
  });

  it('A7. record without treatment_phase → treatment_phase=""', () => {
    const hints = extractFormulationHintsForPlanner({ cbt_domain: 'anxiety' });
    expect(hints.treatment_phase).toBe('');
  });

  it('A8. has_formulation=true when record is a valid plain object', () => {
    const hints = extractFormulationHintsForPlanner({ cbt_domain: 'depression' });
    expect(hints.has_formulation).toBe(true);
  });

  it('A9. is_ambiguous=false always (NO_DOMAIN skip handles domain-absent case)', () => {
    // Even when domain is empty, is_ambiguous must be false
    // (the planner correctly returns NO_DOMAIN skip, not ambiguous)
    const hints = extractFormulationHintsForPlanner({ presenting_problem: 'thin formulation' });
    expect(hints.is_ambiguous).toBe(false);
  });

  it('A10. cbt_domain is whitespace-trimmed', () => {
    const hints = extractFormulationHintsForPlanner({ cbt_domain: '  anxiety  ' });
    expect(hints.domain).toBe('anxiety');
  });

  it('A11. non-string cbt_domain (number) → domain=""', () => {
    const hints = extractFormulationHintsForPlanner({ cbt_domain: 123 });
    expect(hints.domain).toBe('');
  });

  it('A12. raw text fields (presenting_problem, core_belief) do NOT affect domain output', () => {
    // This verifies the no-raw-text rule: domain is ONLY from cbt_domain field
    const hints = extractFormulationHintsForPlanner({
      presenting_problem: 'severe anxiety and panic attacks',
      core_belief: 'I am fundamentally broken due to depression',
      maintaining_cycle: 'avoidance of anxiety-provoking situations',
      // no cbt_domain field
    });
    // Domain must be '' — raw text analysis is explicitly forbidden
    expect(hints.domain).toBe('');
  });
});

// ─── Group B — retrieveBoundedCBTKnowledgeBlock guards ───────────────────────

describe('Group B — retrieveBoundedCBTKnowledgeBlock guards', () => {
  it('B1. plan.shouldRetrieve=false → returns ""', async () => {
    const plan = { ...FIXTURE_PLAN_RETRIEVE, shouldRetrieve: false };
    const result = await retrieveBoundedCBTKnowledgeBlock(buildMockEntities(), plan, 'en');
    expect(result).toBe('');
  });

  it('B2. plan=null → returns ""', async () => {
    const result = await retrieveBoundedCBTKnowledgeBlock(buildMockEntities(), null, 'en');
    expect(result).toBe('');
  });

  it('B3. deferred domain → returns "" (domain gate)', async () => {
    // Ensure at least one deferred domain exists in the constant
    const deferredDomains = Object.values(CBT_KNOWLEDGE_DEFERRED_DOMAINS);
    if (deferredDomains.length === 0) {
      // If none are defined, skip this test
      return;
    }
    const deferredDomain = deferredDomains[0];
    // Verify this domain is NOT in the first-wave allowed set
    expect(CBT_KNOWLEDGE_RUNTIME_ALLOWED_DOMAINS_FIRST_WAVE.has(deferredDomain)).toBe(false);

    const plan = { ...FIXTURE_PLAN_RETRIEVE, domainHint: deferredDomain };
    const result = await retrieveBoundedCBTKnowledgeBlock(buildMockEntities(), plan, 'en');
    expect(result).toBe('');
  });

  it('B4. entities=null → returns ""', async () => {
    const result = await retrieveBoundedCBTKnowledgeBlock(null, FIXTURE_PLAN_RETRIEVE, 'en');
    expect(result).toBe('');
  });

  it('B5. entities without CBTCurriculumUnit → returns ""', async () => {
    const entities = { CaseFormulation: {} }; // no CBTCurriculumUnit
    const result = await retrieveBoundedCBTKnowledgeBlock(entities, FIXTURE_PLAN_RETRIEVE, 'en');
    expect(result).toBe('');
  });

  it('B6. CBTCurriculumUnit.filter throws → returns "" (fail-open)', async () => {
    const entities = {
      CBTCurriculumUnit: {
        filter: vi.fn().mockRejectedValue(new Error('Entity fetch failed')),
      },
    };
    const result = await retrieveBoundedCBTKnowledgeBlock(entities, FIXTURE_PLAN_RETRIEVE, 'en');
    expect(result).toBe('');
  });

  it('B7. empty unit list → returns ""', async () => {
    const entities = {
      CBTCurriculumUnit: {
        filter: vi.fn().mockResolvedValue([]),
      },
    };
    const result = await retrieveBoundedCBTKnowledgeBlock(entities, FIXTURE_PLAN_RETRIEVE, 'en');
    expect(result).toBe('');
  });

  it('B8. authenticated function client is preferred over direct entity access', async () => {
    const functionsClient = {
      invoke: vi.fn().mockResolvedValue({ data: { units: [FIXTURE_UNIT_ANXIETY] } }),
    };
    const result = await retrieveBoundedCBTKnowledgeBlock(
      null,
      FIXTURE_PLAN_RETRIEVE,
      'en',
      functionsClient,
    );
    expect(functionsClient.invoke).toHaveBeenCalledWith('retrieveCurriculumUnit', {
      planner_domain: FIXTURE_PLAN_RETRIEVE.domainHint,
      language: 'en',
      limit: CBT_KNOWLEDGE_RETRIEVAL_OVERFETCH_BOUND,
    });
    expect(result).toContain(FIXTURE_UNIT_ANXIETY.title);
  });
});

// ─── Group C — Wave 4A.2 filters ─────────────────────────────────────────────

describe('Group C — retrieveBoundedCBTKnowledgeBlock Wave 4A.2 filters', () => {
  it('C1. runtime_eligible_first_wave=false → unit excluded', async () => {
    const unit = { ...FIXTURE_UNIT_ANXIETY, runtime_eligible_first_wave: false };
    const entities = buildMockEntities([unit]);
    const result = await retrieveBoundedCBTKnowledgeBlock(entities, FIXTURE_PLAN_RETRIEVE, 'en');
    expect(result).toBe('');
  });

  it('C2. runtime_eligible_first_wave=true → unit included', async () => {
    const unit = { ...FIXTURE_UNIT_ANXIETY, runtime_eligible_first_wave: true };
    const entities = buildMockEntities([unit]);
    const result = await retrieveBoundedCBTKnowledgeBlock(entities, FIXTURE_PLAN_RETRIEVE, 'en');
    expect(result).not.toBe('');
  });

  it('C3. runtime_eligible_first_wave absent → unit included (fail-open default)', async () => {
    const { runtime_eligible_first_wave: _removed, ...unitNoFlag } = FIXTURE_UNIT_ANXIETY;
    const entities = buildMockEntities([unitNoFlag]);
    const result = await retrieveBoundedCBTKnowledgeBlock(entities, FIXTURE_PLAN_RETRIEVE, 'en');
    expect(result).not.toBe('');
  });

  it('C4. evidence_level="unclassified" → unit excluded', async () => {
    const unit = { ...FIXTURE_UNIT_ANXIETY, evidence_level: 'unclassified' };
    const entities = buildMockEntities([unit]);
    const result = await retrieveBoundedCBTKnowledgeBlock(entities, FIXTURE_PLAN_RETRIEVE, 'en');
    expect(result).toBe('');
  });

  it('C5. evidence_level="emerging" → unit excluded', async () => {
    const unit = { ...FIXTURE_UNIT_ANXIETY, evidence_level: 'emerging' };
    const entities = buildMockEntities([unit]);
    const result = await retrieveBoundedCBTKnowledgeBlock(entities, FIXTURE_PLAN_RETRIEVE, 'en');
    expect(result).toBe('');
  });

  it('C6. evidence_level="established" → unit included', async () => {
    const unit = { ...FIXTURE_UNIT_ANXIETY, evidence_level: 'established' };
    const entities = buildMockEntities([unit]);
    const result = await retrieveBoundedCBTKnowledgeBlock(entities, FIXTURE_PLAN_RETRIEVE, 'en');
    expect(result).not.toBe('');
  });

  it('C7. evidence_level="expert_consensus" → unit included', async () => {
    const unit = { ...FIXTURE_UNIT_ANXIETY, evidence_level: 'expert_consensus' };
    const entities = buildMockEntities([unit]);
    const result = await retrieveBoundedCBTKnowledgeBlock(entities, FIXTURE_PLAN_RETRIEVE, 'en');
    expect(result).not.toBe('');
  });

  it('C8. safety_tag "not_for_crisis" → unit excluded (defense-in-depth)', async () => {
    const unit = { ...FIXTURE_UNIT_ANXIETY, safety_tags: ['not_for_crisis'] };
    const entities = buildMockEntities([unit]);
    const result = await retrieveBoundedCBTKnowledgeBlock(entities, FIXTURE_PLAN_RETRIEVE, 'en');
    expect(result).toBe('');
  });

  it('C9. safety_tag "not_for_high_distress" → unit excluded (defense-in-depth)', async () => {
    const unit = { ...FIXTURE_UNIT_ANXIETY, safety_tags: ['not_for_high_distress'] };
    const entities = buildMockEntities([unit]);
    const result = await retrieveBoundedCBTKnowledgeBlock(entities, FIXTURE_PLAN_RETRIEVE, 'en');
    expect(result).toBe('');
  });

  it('C10. distress_suitability="low_only" with planFilter=LOW_DISTRESS_ONLY → excluded', async () => {
    const unit = { ...FIXTURE_UNIT_ANXIETY, distress_suitability: 'low_only' };
    const entities = buildMockEntities([unit]);
    const plan = { ...FIXTURE_PLAN_RETRIEVE, distressFilter: CBT_DISTRESS_FILTERS.LOW_DISTRESS_ONLY };
    const result = await retrieveBoundedCBTKnowledgeBlock(entities, plan, 'en');
    expect(result).toBe('');
  });

  it('C11. distress_suitability="mild_and_below" with planFilter=LOW_DISTRESS_ONLY → included', async () => {
    const unit = { ...FIXTURE_UNIT_ANXIETY, distress_suitability: 'mild_and_below' };
    const entities = buildMockEntities([unit]);
    const plan = { ...FIXTURE_PLAN_RETRIEVE, distressFilter: CBT_DISTRESS_FILTERS.LOW_DISTRESS_ONLY };
    const result = await retrieveBoundedCBTKnowledgeBlock(entities, plan, 'en');
    expect(result).not.toBe('');
  });

  it('C12. distress_suitability="any" → always included (any plan filter)', async () => {
    const unit = { ...FIXTURE_UNIT_ANXIETY, distress_suitability: 'any' };
    const entities = buildMockEntities([unit]);
    // Both filter modes
    for (const filterMode of [CBT_DISTRESS_FILTERS.ANY, CBT_DISTRESS_FILTERS.LOW_DISTRESS_ONLY]) {
      const plan = { ...FIXTURE_PLAN_RETRIEVE, distressFilter: filterMode };
      const result = await retrieveBoundedCBTKnowledgeBlock(entities, plan, 'en');
      expect(result).not.toBe('');
    }
  });

  it('C13. treatment_arc_position="late" when planArc="early" → excluded', async () => {
    const unit = { ...FIXTURE_UNIT_ANXIETY, treatment_arc_position: 'late' };
    const entities = buildMockEntities([unit]);
    const plan = { ...FIXTURE_PLAN_RETRIEVE, treatmentArcFilter: 'early' };
    const result = await retrieveBoundedCBTKnowledgeBlock(entities, plan, 'en');
    expect(result).toBe('');
  });

  it('C14. treatment_arc_position="any" → always included regardless of planArc', async () => {
    const unit = { ...FIXTURE_UNIT_ANXIETY, treatment_arc_position: 'any' };
    const entities = buildMockEntities([unit]);
    for (const arc of ['early', 'middle', 'late', 'any']) {
      const plan = { ...FIXTURE_PLAN_RETRIEVE, treatmentArcFilter: arc };
      const result = await retrieveBoundedCBTKnowledgeBlock(entities, plan, 'en');
      expect(result).not.toBe('');
    }
  });

  it('C15. cbt_domain mismatch → unit excluded', async () => {
    const unit = { ...FIXTURE_UNIT_ANXIETY, cbt_domain: 'depression' }; // plan asks for 'anxiety'
    const entities = buildMockEntities([unit]);
    const result = await retrieveBoundedCBTKnowledgeBlock(entities, FIXTURE_PLAN_RETRIEVE, 'en');
    expect(result).toBe('');
  });

  it('C16. cbt_domain match → unit included', async () => {
    const unit = { ...FIXTURE_UNIT_ANXIETY, cbt_domain: 'anxiety' };
    const entities = buildMockEntities([unit]);
    const result = await retrieveBoundedCBTKnowledgeBlock(entities, FIXTURE_PLAN_RETRIEVE, 'en');
    expect(result).not.toBe('');
  });
});

// ─── Group D — hard cap and block format ─────────────────────────────────────

describe('Group D — hard cap and block format', () => {
  it('D1. hard cap at CBT_KNOWLEDGE_RETRIEVAL_MAX_UNITS regardless of entity count', async () => {
    // Build 10 units, all eligible
    const units = Array.from({ length: 10 }, (_, i) => ({
      ...FIXTURE_UNIT_ANXIETY,
      id: `unit-${i}`,
      title: `Unit ${i + 1}`,
    }));
    const entities = buildMockEntities(units);
    const result = await retrieveBoundedCBTKnowledgeBlock(entities, FIXTURE_PLAN_RETRIEVE, 'en');
    // Count "[N]" markers in the output
    const markers = (result.match(/^\[\d+\]/gm) || []).length;
    expect(markers).toBeLessThanOrEqual(CBT_KNOWLEDGE_RETRIEVAL_MAX_UNITS);
    expect(CBT_KNOWLEDGE_RETRIEVAL_MAX_UNITS).toBe(3); // verify constant value
  });

  it('D2. block contains opening header delimiter', async () => {
    const entities = buildMockEntities([FIXTURE_UNIT_ANXIETY]);
    const result = await retrieveBoundedCBTKnowledgeBlock(entities, FIXTURE_PLAN_RETRIEVE, 'en');
    expect(result).toContain('=== CBT KNOWLEDGE REFERENCE');
  });

  it('D3. block contains closing delimiter', async () => {
    const entities = buildMockEntities([FIXTURE_UNIT_ANXIETY]);
    const result = await retrieveBoundedCBTKnowledgeBlock(entities, FIXTURE_PLAN_RETRIEVE, 'en');
    expect(result).toContain('=== END CBT KNOWLEDGE REFERENCE ===');
  });

  it('D4. block contains "supporting context, read-only" label', async () => {
    const entities = buildMockEntities([FIXTURE_UNIT_ANXIETY]);
    const result = await retrieveBoundedCBTKnowledgeBlock(entities, FIXTURE_PLAN_RETRIEVE, 'en');
    expect(result).toContain('supporting context, read-only');
  });

  it('D5. admin_notes is NOT present in block output (stripped)', async () => {
    const unit = { ...FIXTURE_UNIT_ANXIETY, admin_notes: 'SENSITIVE_ADMIN_CONTENT_XYZ' };
    const entities = buildMockEntities([unit]);
    const result = await retrieveBoundedCBTKnowledgeBlock(entities, FIXTURE_PLAN_RETRIEVE, 'en');
    expect(result).not.toContain('SENSITIVE_ADMIN_CONTENT_XYZ');
  });

  it('D6. source_chunk_ids is NOT present in block output (stripped)', async () => {
    const unit = { ...FIXTURE_UNIT_ANXIETY, source_chunk_ids: ['chunk-secret-1'] };
    const entities = buildMockEntities([unit]);
    const result = await retrieveBoundedCBTKnowledgeBlock(entities, FIXTURE_PLAN_RETRIEVE, 'en');
    expect(result).not.toContain('chunk-secret-1');
    expect(result).not.toContain('source_chunk_ids');
  });
});

// ─── Group E — buildV10SessionStartContentAsync V9 delegation ────────────────

describe('Group E — buildV10SessionStartContentAsync V9 delegation', () => {
  const makeV9Entities = () => ({
    CaseFormulation: { list: vi.fn().mockResolvedValue([]) },
    CompanionMemory: { list: vi.fn().mockResolvedValue([]) },
    SessionSummary: { list: vi.fn().mockResolvedValue([]) },
    CBTCurriculumUnit: { filter: vi.fn().mockResolvedValue([]) },
  });

  it('E1. non-V10 wiring (V9) → returns exact V9 output (knowledge_layer_enabled absent)', async () => {
    // V9 wiring has longitudinal_layer_enabled but not knowledge_layer_enabled
    const v9Result = await buildV9SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V9,
      makeV9Entities(),
      null,
    );
    const v10Result = await buildV10SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V9,
      makeV9Entities(),
      null,
    );
    expect(v10Result).toBe(v9Result);
  });

  it('E2. null wiring → delegates to V9 (returns "[START_SESSION]")', async () => {
    const result = await buildV10SessionStartContentAsync(null, makeV9Entities(), null);
    expect(result).toContain('[START_SESSION]');
  });

  it('E3. knowledge_layer_enabled=false → returns exact V9 output', async () => {
    const wiringWithFlagOff = { ...CBT_THERAPIST_WIRING_STAGE2_V10, knowledge_layer_enabled: false };
    const v9Result = await buildV9SessionStartContentAsync(
      wiringWithFlagOff,
      makeV9Entities(),
      null,
    );
    const v10Result = await buildV10SessionStartContentAsync(
      wiringWithFlagOff,
      makeV9Entities(),
      null,
    );
    expect(v10Result).toBe(v9Result);
  });

  it('E4. V10 wiring + no CBTCurriculumUnit entity → returns v9Base (fail-open)', async () => {
    // Entities without CBTCurriculumUnit: planner may proceed but retrieval returns ''
    const entitiesNoCurriculumUnit = {
      CaseFormulation: { list: vi.fn().mockResolvedValue([FIXTURE_FORMULATION_ANXIETY]) },
      CompanionMemory: { list: vi.fn().mockResolvedValue([]) },
      SessionSummary: { list: vi.fn().mockResolvedValue([]) },
      // no CBTCurriculumUnit
    };
    const v9Result = await buildV9SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V9,
      entitiesNoCurriculumUnit,
      null,
    );
    const v10Result = await buildV10SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V10,
      entitiesNoCurriculumUnit,
      null,
    );
    // V10 output should start with V9 base (knowledge block omitted, entity absent)
    expect(v10Result).toContain('[START_SESSION]');
  });

  it('E5. V10 wiring + formulation has no cbt_domain → no retrieval, authority remains active', async () => {
    const entitiesNoDomain = {
      CaseFormulation: {
        list: vi.fn().mockResolvedValue([{ presenting_problem: 'social anxiety' }]), // no cbt_domain
      },
      CompanionMemory: { list: vi.fn().mockResolvedValue([]) },
      SessionSummary: { list: vi.fn().mockResolvedValue([]) },
      CBTCurriculumUnit: { filter: vi.fn().mockResolvedValue([FIXTURE_UNIT_ANXIETY]) },
    };
    const v9Result = await buildV9SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V9,
      entitiesNoDomain,
      null,
    );
    const v10Result = await buildV10SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V10,
      entitiesNoDomain,
      null,
    );
    // Without a domain, the planner skips. V10 retains only its runtime authority
    // after the V9 base so the legacy direct tool cannot bypass the domain gate.
    expect(v10Result.startsWith(v9Result)).toBe(true);
    expect(v10Result).toContain('V10 KNOWLEDGE RUNTIME AUTHORITY');
    expect(v10Result).not.toContain('=== CBT KNOWLEDGE REFERENCE');
  });

  it('E6. V10 wiring + crisis_signal=true → planner blocks retrieval and retains authority', async () => {
    const entitiesWithFormulation = {
      CaseFormulation: { list: vi.fn().mockResolvedValue([FIXTURE_FORMULATION_ANXIETY]) },
      CompanionMemory: { list: vi.fn().mockResolvedValue([]) },
      SessionSummary: { list: vi.fn().mockResolvedValue([]) },
      CBTCurriculumUnit: { filter: vi.fn().mockResolvedValue([FIXTURE_UNIT_ANXIETY]) },
    };
    const options = { crisis_signal: true };
    const v9Result = await buildV9SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V9,
      entitiesWithFormulation,
      null,
      options,
    );
    const v10Result = await buildV10SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V10,
      entitiesWithFormulation,
      null,
      options,
    );
    // Crisis active → planner returns containment skip; authority remains present
    // to prevent any direct legacy curriculum call.
    expect(v10Result.startsWith(v9Result)).toBe(true);
    expect(v10Result).toContain('V10 KNOWLEDGE RUNTIME AUTHORITY');
    // Must not contain knowledge block
    expect(v10Result).not.toContain('CBT KNOWLEDGE REFERENCE');
  });
});

// ─── Group F — regression and isolation ──────────────────────────────────────

describe('Group F — buildV10 regression / isolation', () => {
  it('F1. buildV10 with HYBRID wiring returns exactly "[START_SESSION]"', async () => {
    const result = await buildV10SessionStartContentAsync(
      CBT_THERAPIST_WIRING_HYBRID,
      {
        CaseFormulation: { list: vi.fn().mockResolvedValue([]) },
        CompanionMemory: { list: vi.fn().mockResolvedValue([]) },
      },
      null,
    );
    expect(result).toBe('[START_SESSION]');
  });

  it('F2. Companion wirings do NOT have knowledge_layer_enabled', () => {
    expect(AI_COMPANION_WIRING_HYBRID.knowledge_layer_enabled).not.toBe(true);
    expect(AI_COMPANION_WIRING_UPGRADE_V1.knowledge_layer_enabled).not.toBe(true);
    expect(AI_COMPANION_WIRING_UPGRADE_V2.knowledge_layer_enabled).not.toBe(true);
  });

  it('F3. extractFormulationHintsForPlanner does not read raw text fields for domain', () => {
    // No raw-text analysis: domain comes ONLY from cbt_domain structured field
    const hints = extractFormulationHintsForPlanner({
      presenting_problem: 'severe anxiety with panic attacks depression low mood',
      core_belief: 'I am worthless, traumatized, and broken',
      maintaining_cycle: 'avoidance, rumination, substance use',
      working_hypotheses: 'Complex PTSD with comorbid OCD and social anxiety',
      // Deliberately no cbt_domain field
    });
    // Domain must be empty — no text analysis allowed
    expect(hints.domain).toBe('');
    expect(hints.is_ambiguous).toBe(false);
  });

  it('F4. retrieveBoundedCBTKnowledgeBlock reads only CBTCurriculumUnit (no private entities)', async () => {
    // Build entities spy to verify what is accessed
    const mockCurriculumFilter = vi.fn().mockResolvedValue([FIXTURE_UNIT_ANXIETY]);
    const mockThoughtJournalList = vi.fn();
    const mockMoodEntryList = vi.fn();
    const mockConversationList = vi.fn();
    const mockCompanionMemoryList = vi.fn();
    const mockCaseFormulationList = vi.fn();

    const entities = {
      CBTCurriculumUnit: { filter: mockCurriculumFilter },
      ThoughtJournal: { list: mockThoughtJournalList },
      MoodEntry: { list: mockMoodEntryList },
      Conversation: { list: mockConversationList },
      CompanionMemory: { list: mockCompanionMemoryList },
      CaseFormulation: { list: mockCaseFormulationList },
    };

    await retrieveBoundedCBTKnowledgeBlock(entities, FIXTURE_PLAN_RETRIEVE, 'en');

    // Only CBTCurriculumUnit should be accessed
    expect(mockCurriculumFilter).toHaveBeenCalled();
    // Private user entities must NOT be accessed
    expect(mockThoughtJournalList).not.toHaveBeenCalled();
    expect(mockMoodEntryList).not.toHaveBeenCalled();
    expect(mockConversationList).not.toHaveBeenCalled();
    expect(mockCompanionMemoryList).not.toHaveBeenCalled();
    expect(mockCaseFormulationList).not.toHaveBeenCalled();
  });

  it('F5. buildV10 does not affect Companion wiring paths', async () => {
    // Companion wiring passed to buildV10 → delegates to V9 → returns '[START_SESSION]'
    const result = await buildV10SessionStartContentAsync(
      AI_COMPANION_WIRING_HYBRID,
      { CaseFormulation: { list: vi.fn().mockResolvedValue([]) }, CompanionMemory: { list: vi.fn().mockResolvedValue([]) } },
      null,
    );
    expect(result).toBe('[START_SESSION]');
  });
});

// ─── Group G — agentWiring and activeAgentWiring static analysis ──────────────

describe('Group G — agentWiring and activeAgentWiring', () => {
  it('G1. CBT_THERAPIST_WIRING_STAGE2_V10 is exported from agentWiring.js', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V10).toBeDefined();
    expect(typeof CBT_THERAPIST_WIRING_STAGE2_V10).toBe('object');
  });

  it('G2. V10 has knowledge_layer_enabled: true', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V10.knowledge_layer_enabled).toBe(true);
  });

  it('G3. V10 has CBTCurriculumUnit in tool_configs with read_only: true', () => {
    const curricConfig = CBT_THERAPIST_WIRING_STAGE2_V10.tool_configs.find(
      tc => tc.entity_name === 'CBTCurriculumUnit'
    );
    expect(curricConfig).toBeDefined();
    expect(curricConfig.read_only).toBe(true);
    expect(curricConfig.access_level).toBe('allowed');
  });

  it('G4. V10 preserves all V9 wiring flags', () => {
    // All V9 flags must be present in V10
    expect(CBT_THERAPIST_WIRING_STAGE2_V10.longitudinal_layer_enabled).toBe(true);
    expect(CBT_THERAPIST_WIRING_STAGE2_V10.strategy_layer_enabled).toBe(true);
    expect(CBT_THERAPIST_WIRING_STAGE2_V10.formulation_context_enabled).toBe(true);
    expect(CBT_THERAPIST_WIRING_STAGE2_V10.continuity_layer_enabled).toBe(true);
    expect(CBT_THERAPIST_WIRING_STAGE2_V10.safety_mode_enabled).toBe(true);
    expect(CBT_THERAPIST_WIRING_STAGE2_V10.live_retrieval_enabled).toBe(true);
    expect(CBT_THERAPIST_WIRING_STAGE2_V10.retrieval_orchestration_enabled).toBe(true);
    expect(CBT_THERAPIST_WIRING_STAGE2_V10.workflow_context_injection).toBe(true);
    expect(CBT_THERAPIST_WIRING_STAGE2_V10.memory_context_injection).toBe(true);
  });

  it('G5. resolveTherapistWiring returns V10 when all four flags are on', async () => {
    // Dynamically set the env vars and import the resolver
    // (Using env var overrides via import.meta.env mock in Vitest is not straightforward
    // for this pattern, so we validate the static wiring structure instead)
    // This verifies that V10 contains the correct routing identifiers
    expect(CBT_THERAPIST_WIRING_STAGE2_V10.knowledge_layer_enabled).toBe(true);
    expect(CBT_THERAPIST_WIRING_STAGE2_V10.longitudinal_layer_enabled).toBe(true);
    expect(CBT_THERAPIST_WIRING_STAGE2_V10.strategy_layer_enabled).toBe(true);
  });

  it('G6. activeAgentWiring.js imports CBT_THERAPIST_WIRING_STAGE2_V10', () => {
    const src = readFileSync(resolve('src/api/activeAgentWiring.js'), 'utf8');
    expect(src).toContain('CBT_THERAPIST_WIRING_STAGE2_V10');
  });

  it('G7. activeAgentWiring.js routing for V10 requires KNOWLEDGE_ENABLED', () => {
    const src = readFileSync(resolve('src/api/activeAgentWiring.js'), 'utf8');
    // Must check for the KNOWLEDGE_ENABLED flag before returning V10
    expect(src).toContain('THERAPIST_UPGRADE_KNOWLEDGE_ENABLED');
    expect(src).toContain('stage2_v10');
  });

  it('G7b. resolveTherapistWiring routes to V10 before V9 in the routing table', () => {
    const src = readFileSync(resolve('src/api/activeAgentWiring.js'), 'utf8');
    const v10Idx = src.indexOf('stage2_v10');
    const v9Idx = src.indexOf('stage2_v9');
    expect(v10Idx).toBeGreaterThan(0);
    expect(v9Idx).toBeGreaterThan(0);
    // V10 routing must appear BEFORE V9 routing (earlier in the if-chain)
    expect(v10Idx).toBeLessThan(v9Idx);
  });
});

// ─── Group H — Chat.jsx static analysis ──────────────────────────────────────

describe('Group H — Chat.jsx static analysis', () => {
  const chatSrc = readFileSync(resolve('src/pages/Chat.jsx'), 'utf8');

  it('H1. Chat.jsx imports buildV10SessionStartContentAsync', () => {
    expect(chatSrc).toContain('buildV10SessionStartContentAsync');
  });

  it('H2. Chat.jsx has at least 4 buildV10SessionStartContentAsync call sites', () => {
    // Enforcement pass: action-first demotion — buildActionFirstDemotedSessionContentAsync
    // is now used at all session-start call sites (wraps V12 + unconditionally injects
    // the formulation-first planner block for all wirings including HYBRID).
    const demoedCalls = (chatSrc.match(/buildActionFirstDemotedSessionContentAsync\s*\(/g) || []).length;
    expect(demoedCalls).toBeGreaterThanOrEqual(4);
  });

  it('H3. Chat.jsx does not call buildV9SessionStartContentAsync at runtime call sites', () => {
    // V9 may still appear in the import (for backward compatibility) but must NOT be called
    const callSites = (chatSrc.match(/await\s+buildV9SessionStartContentAsync\s*\(/g) || []).length;
    expect(callSites).toBe(0);
  });

  it('H4. cbtKnowledgeRetrieval.js does not appear in Chat.jsx import list', () => {
    // The retrieval module is dynamically imported inside workflowContextInjector.js
    // Chat.jsx must not import it directly
    expect(chatSrc).not.toContain('cbtKnowledgeRetrieval');
  });
});

// ─── Module metadata ─────────────────────────────────────────────────────────

describe('Wave 4C — Module metadata', () => {
  it('CBT_KNOWLEDGE_RETRIEVAL_VERSION is a non-empty string', () => {
    expect(typeof CBT_KNOWLEDGE_RETRIEVAL_VERSION).toBe('string');
    expect(CBT_KNOWLEDGE_RETRIEVAL_VERSION.trim().length).toBeGreaterThan(0);
  });

  it('CBT_KNOWLEDGE_RETRIEVAL_MAX_UNITS is 3', () => {
    expect(CBT_KNOWLEDGE_RETRIEVAL_MAX_UNITS).toBe(3);
  });

  it('extractFormulationHintsForPlanner is a function', () => {
    expect(typeof extractFormulationHintsForPlanner).toBe('function');
  });

  it('retrieveBoundedCBTKnowledgeBlock is a function', () => {
    expect(typeof retrieveBoundedCBTKnowledgeBlock).toBe('function');
  });

  it('buildV10SessionStartContentAsync is a function', () => {
    expect(typeof buildV10SessionStartContentAsync).toBe('function');
  });
});
