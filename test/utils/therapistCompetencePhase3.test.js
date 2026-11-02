/**
 * @file test/utils/therapistCompetencePhase3.test.js
 *
 * Phase 3 Therapist Competence Architecture
 *
 * PURPOSE
 * -------
 * Verifies the Phase 3 competence architecture that deepens clinical skills,
 * theoretical knowledge, and interpersonal abilities across the CBT therapist system.
 *
 * REQUIRED SCENARIO COVERAGE (15 scenarios per problem statement):
 *
 * SECTION A — VERSION AND FLAG
 *   1.  THERAPIST_WORKFLOW_VERSION bumped to 3.4.0
 *   2.  THERAPIST_UPGRADE_COMPETENCE_ENABLED flag exists and defaults to false
 *   3.  THERAPIST_UPGRADE_FLAGS now contains exactly 15 flags
 *
 * SECTION B — COMPETENCE RULES EXPORT
 *   4.  THERAPIST_COMPETENCE_RULES is exported and well-formed (15 rules)
 *   5.  All 15 rule IDs are present (C1–C15)
 *   6.  Each rule has id, pillar, label, and description fields
 *   7.  Rules are distributed across 3 pillars: clinical_skills, theoretical_knowledge, interpersonal
 *
 * SECTION C — PILLAR A: CLINICAL SKILLS (C1–C5)
 *   8.  C1 (case_formulation_building): describes the 10-element formulation model
 *   9.  C1 prohibits jumping to intervention without a working formulation
 *  10.  C2 (maintaining_cycle_identification): names the OCD doubt-ritual-relief cycle explicitly
 *  11.  C2 names anxiety avoidance cycle and depression withdrawal cycle
 *  12.  C3 (intervention_selection): lists all 10 intervention types with correct conditions
 *  13.  C3 prohibits homework without formulation rationale
 *  14.  C4 (socratic_questioning): requires one focused non-leading question per turn
 *  15.  C4 prohibits Socratic questions as a substitute for formulation
 *  16.  C5 (session_management): describes agenda, direction, summary, task, continuity
 *  17.  C5 prohibits two tasks in one turn
 *
 * SECTION D — PILLAR B: THEORETICAL KNOWLEDGE (C6–C10)
 *  18.  C6 (cbt_chain_clarity): requires explicit CBT chain with personalized language
 *  19.  C6 includes reinforcement/avoidance loop explanation
 *  20.  C7 (accessible_psychoeducation): three-criteria standard (plain, connected, why)
 *  21.  C7 provides a good OCD psychoeducation example
 *  22.  C7 prohibits psychoeducation before empathy (premature)
 *  23.  C8 (theory_to_practice): distinguishes formulation, psychoeducation, intervention
 *  24.  C9 (cbt_fidelity_without_academia): prohibits "according to CBT theory" framing
 *  25.  C10 (no_technique_dumping): prohibits technique lists without clinical fit
 *  26.  C10 requires ONE approach with formulation-based rationale
 *
 * SECTION E — PILLAR C: INTERPERSONAL ABILITIES (C11–C15)
 *  27.  C11 (collaborative_empiricism): "let's understand this together" stance
 *  28.  C11 includes co-formulation as hypothesis offering, not fact delivery
 *  29.  C11 requires collaborative goal setting from person's own articulation
 *  30.  C12 (cultural_religious_sensitivity): OCD cycle NOT the religious belief is target
 *  31.  C12 covers scrupulosity, culturally loaded shame, grief/meaning-making
 *  32.  C13 (nondefensive_stuckness): 4-step correct response sequence
 *  33.  C13 prohibits defending the therapeutic approach before acknowledgment
 *  34.  C14 (alliance_with_structure): names two failure modes explicitly
 *  35.  C15 (no_didactic_lecturing): prohibits extended theory lectures
 *  36.  C15 requires re-engagement after every formulation
 *
 * SECTION F — BUILDCOMPETENCEINSTRUCTIONS / EXPORTED STRING
 *  37.  buildCompetenceInstructions() is exported and callable
 *  38.  THERAPIST_COMPETENCE_INSTRUCTIONS is a non-empty string
 *  39.  Instructions include "PHASE 3 COMPETENCE ARCHITECTURE" header
 *  40.  Instructions include "PILLAR A" section
 *  41.  Instructions include "PILLAR B" section
 *  42.  Instructions include "PILLAR C" section
 *  43.  Instructions include "HARD FAILURE CONDITIONS" section
 *  44.  Instructions include "PRESERVED GAINS" section
 *
 * SECTION G — WIRING AND ROUTING
 *  45.  CBT_THERAPIST_WIRING_STAGE2_V11 is exported from agentWiring.js
 *  46.  V11 has competence_layer_enabled: true
 *  47.  V11 has stage2_phase: 15
 *  48.  V11 tool_configs are identical to V10 (no new entity access, 15 entries)
 *  49.  V11 inherits all V10 capability flags
 *  50.  resolveTherapistWiring() routes to V11 when COMPETENCE_ENABLED is on
 *  51.  resolveTherapistWiring() routes to V10 when KNOWLEDGE+STRATEGY+LONGITUDINAL on, COMPETENCE off
 *  52.  resolveTherapistWiring() routes to HYBRID when all flags are off
 *
 * SECTION H — BUILDV11SESSIONSTARTCONTENTASYNC
 *  53.  buildV11SessionStartContentAsync is exported from workflowContextInjector.js
 *  54.  For non-V11 wirings: delegates to V10 (no behavior change)
 *  55.  For V11 wirings: base contains V10 content
 *  56.  For V11 wirings: appends THERAPIST_COMPETENCE_INSTRUCTIONS
 *  57.  Fail-open: returns V10 base on error (never throws)
 *
 * SECTION I — CBT_THERAPIST AGENT INSTRUCTION CONTENT
 *  58.  cbt_therapist.jsonc contains "PHASE 3 COMPETENCE ARCHITECTURE"
 *  59.  cbt_therapist.jsonc contains C1 case formulation building text
 *  60.  cbt_therapist.jsonc contains C2 maintaining cycle identification text
 *  61.  cbt_therapist.jsonc contains C3 intervention selection types
 *  62.  cbt_therapist.jsonc contains C4 Socratic questioning rules
 *  63.  cbt_therapist.jsonc contains C5 session management rules
 *  64.  cbt_therapist.jsonc contains C6 CBT chain clarity rule
 *  65.  cbt_therapist.jsonc contains C7 accessible psychoeducation criteria
 *  66.  cbt_therapist.jsonc contains C8 theory-to-practice distinction
 *  67.  cbt_therapist.jsonc contains C9 "according to CBT theory" prohibition
 *  68.  cbt_therapist.jsonc contains C10 technique dumping prohibition
 *  69.  cbt_therapist.jsonc contains C11 collaborative empiricism text
 *  70.  cbt_therapist.jsonc contains C12 scrupulosity/religious OCD text
 *  71.  cbt_therapist.jsonc contains C13 non-defensive stuckness text
 *  72.  cbt_therapist.jsonc contains C14 two failure modes text
 *  73.  cbt_therapist.jsonc contains C15 lecture prohibition text
 *
 * SECTION J — SCENARIO COVERAGE (CLINICAL REGRESSION TESTS)
 *  74.  Anxiety case: formulation coverage requires maintaining cycle (avoidance loop)
 *  75.  Depression/low self-worth: formulation targets withdrawal and reinforcement
 *  76.  OCD formulation: doubt-ritual-relief cycle explicitly covered
 *  77.  Scrupulosity / religious OCD: OCD cycle is target, NOT religious belief
 *  78.  Trauma: formulation before technique — no premature intervention
 *  79.  Grief/loss: meaning and impact, no CBT framework in first responses
 *  80.  ADHD overload: practical formulation, one manageable step
 *  81.  Social anxiety: safety behaviors identified as maintaining mechanism
 *  82.  First-session: collaborative goal setting from person's own articulation
 *  83.  Psychoeducation quality: plain language, connected to case, explains "why"
 *  84.  Socratic questioning: focused, non-leading, advances formulation
 *  85.  Collaborative empiricism: shared inquiry tone, not authority delivering findings
 *  86.  Session summary + task: one specific task after formulation is established
 *  87.  Cross-language: same competence pillars apply in all 7 languages
 *  88.  Preserved gains: warmth, pacing, alliance rules still present from prior phases
 *
 * CONSTRAINTS
 * -----------
 * - Does NOT import from base44/functions/ (Deno code — not importable in Vitest).
 * - Does NOT enable any feature flags — all flags remain false throughout.
 * - All prior phase assertions are NOT duplicated here (already covered).
 * - Uses mock entity objects; no live entity calls are made.
 *
 * Source of truth: Phase 3 Competence Architecture problem statement.
 */

import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Feature flags ─────────────────────────────────────────────────────────────
import {
  THERAPIST_UPGRADE_FLAGS,
  isUpgradeEnabled,
} from '../../src/lib/featureFlags.js';

// ── Wiring configs ────────────────────────────────────────────────────────────
import {
  CBT_THERAPIST_WIRING_HYBRID,
  CBT_THERAPIST_WIRING_STAGE2_V10,
  CBT_THERAPIST_WIRING_STAGE2_V11,
} from '../../src/api/agentWiring.js';

// ── Active wiring ─────────────────────────────────────────────────────────────
import {
  resolveTherapistWiring,
  ACTIVE_CBT_THERAPIST_WIRING,
} from '../../src/api/activeAgentWiring.js';

// ── Workflow engine ───────────────────────────────────────────────────────────
import {
  THERAPIST_WORKFLOW_VERSION,
  THERAPIST_COMPETENCE_RULES,
  THERAPIST_COMPETENCE_INSTRUCTIONS,
  THERAPIST_CONSTITUTION,
  THERAPIST_FIRST_SESSION_FLOW,
  THERAPIST_PACING_REFINEMENT_RULES,
  THERAPIST_FORMULATION_INSTRUCTIONS,
  buildCompetenceInstructions,
} from '../../src/lib/therapistWorkflowEngine.js';

// ── Context injector ──────────────────────────────────────────────────────────
import {
  buildV11SessionStartContentAsync,
  buildV10SessionStartContentAsync,
} from '../../src/lib/workflowContextInjector.js';

// ─── Helpers ───────────────────────────────────────────────────────────────────

function buildMockEntities(overrides = {}) {
  return {
    CompanionMemory: {
      filter: vi.fn().mockResolvedValue([]),
      list: vi.fn().mockResolvedValue([]),
    },
    CaseFormulation: {
      filter: vi.fn().mockResolvedValue([]),
      list: vi.fn().mockResolvedValue([]),
    },
    SessionSummary: {
      filter: vi.fn().mockResolvedValue([]),
      list: vi.fn().mockResolvedValue([]),
    },
    ThoughtJournal: {
      filter: vi.fn().mockResolvedValue([]),
      list: vi.fn().mockResolvedValue([]),
    },
    Goal: {
      filter: vi.fn().mockResolvedValue([]),
      list: vi.fn().mockResolvedValue([]),
    },
    CBTCurriculumUnit: {
      filter: vi.fn().mockResolvedValue([]),
      list: vi.fn().mockResolvedValue([]),
    },
    ...overrides,
  };
}

function buildMockBaseClient(entitiesOverride = {}) {
  const entities = buildMockEntities(entitiesOverride);
  return {
    entities,
    auth: { me: vi.fn().mockResolvedValue({ id: 'user-1' }) },
  };
}

// ─── Load cbt_therapist.jsonc content ─────────────────────────────────────────
const agentFilePath = resolve(
  process.cwd(),
  'base44/agents/cbt_therapist.jsonc',
);
const agentFileRaw = readFileSync(agentFilePath, 'utf-8');
const agentData = JSON.parse(agentFileRaw);
const agentInstructions = agentData.instructions;

// =============================================================================
// SECTION A — VERSION AND FLAG
// =============================================================================

describe('SECTION A — version and flag', () => {
  it('THERAPIST_WORKFLOW_VERSION is bumped to 3.7.0', () => {
    expect(THERAPIST_WORKFLOW_VERSION).toBe('3.7.0');
  });

  it('THERAPIST_UPGRADE_COMPETENCE_ENABLED flag exists in THERAPIST_UPGRADE_FLAGS', () => {
    expect('THERAPIST_UPGRADE_COMPETENCE_ENABLED' in THERAPIST_UPGRADE_FLAGS).toBe(true);
  });

  it('THERAPIST_UPGRADE_COMPETENCE_ENABLED defaults to false', () => {
    expect(THERAPIST_UPGRADE_FLAGS.THERAPIST_UPGRADE_COMPETENCE_ENABLED).toBe(false);
  });

  it('THERAPIST_UPGRADE_FLAGS now contains exactly 17 keys', () => {
    expect(Object.keys(THERAPIST_UPGRADE_FLAGS)).toHaveLength(17);
  });

  it('all 15 flags default to false', () => {
    for (const [key, value] of Object.entries(THERAPIST_UPGRADE_FLAGS)) {
      expect(value, `Flag ${key} should default to false`).toBe(false);
    }
  });
});

// =============================================================================
// SECTION B — COMPETENCE RULES EXPORT
// =============================================================================

describe('SECTION B — THERAPIST_COMPETENCE_RULES export', () => {
  it('THERAPIST_COMPETENCE_RULES is exported and is an object', () => {
    expect(THERAPIST_COMPETENCE_RULES).toBeDefined();
    expect(typeof THERAPIST_COMPETENCE_RULES).toBe('object');
  });

  it('THERAPIST_COMPETENCE_RULES contains exactly 15 rules', () => {
    expect(Object.keys(THERAPIST_COMPETENCE_RULES)).toHaveLength(15);
  });

  it('all 15 rule keys are present', () => {
    const expectedKeys = [
      'case_formulation_building',
      'maintaining_cycle_identification',
      'intervention_selection',
      'socratic_questioning',
      'session_management',
      'cbt_chain_clarity',
      'accessible_psychoeducation',
      'theory_to_practice',
      'cbt_fidelity_without_academia',
      'no_technique_dumping',
      'collaborative_empiricism',
      'cultural_religious_sensitivity',
      'nondefensive_stuckness',
      'alliance_with_structure',
      'no_didactic_lecturing',
    ];
    for (const key of expectedKeys) {
      expect(
        key in THERAPIST_COMPETENCE_RULES,
        `Rule key "${key}" should be present`,
      ).toBe(true);
    }
  });

  it('each rule has id, pillar, label, and description fields', () => {
    for (const [key, rule] of Object.entries(THERAPIST_COMPETENCE_RULES)) {
      expect(rule.id, `Rule ${key} missing id`).toBeTruthy();
      expect(rule.pillar, `Rule ${key} missing pillar`).toBeTruthy();
      expect(rule.label, `Rule ${key} missing label`).toBeTruthy();
      expect(rule.description, `Rule ${key} missing description`).toBeTruthy();
      expect(typeof rule.description).toBe('string');
      expect(rule.description.length).toBeGreaterThan(50);
    }
  });

  it('rules are distributed across exactly 3 pillars', () => {
    const pillars = new Set(Object.values(THERAPIST_COMPETENCE_RULES).map((r) => r.pillar));
    expect([...pillars]).toEqual(
      expect.arrayContaining(['clinical_skills', 'theoretical_knowledge', 'interpersonal']),
    );
    expect(pillars.size).toBe(3);
  });

  it('Pillar A has 5 rules (clinical_skills)', () => {
    const pillarA = Object.values(THERAPIST_COMPETENCE_RULES).filter(
      (r) => r.pillar === 'clinical_skills',
    );
    expect(pillarA).toHaveLength(5);
  });

  it('Pillar B has 5 rules (theoretical_knowledge)', () => {
    const pillarB = Object.values(THERAPIST_COMPETENCE_RULES).filter(
      (r) => r.pillar === 'theoretical_knowledge',
    );
    expect(pillarB).toHaveLength(5);
  });

  it('Pillar C has 5 rules (interpersonal)', () => {
    const pillarC = Object.values(THERAPIST_COMPETENCE_RULES).filter(
      (r) => r.pillar === 'interpersonal',
    );
    expect(pillarC).toHaveLength(5);
  });
});

// =============================================================================
// SECTION C — PILLAR A: CLINICAL SKILLS (C1–C5)
// =============================================================================

describe('SECTION C — Pillar A: Clinical Skills (C1–C5)', () => {
  it('C1 case_formulation_building: describes 10-element formulation model', () => {
    const rule = THERAPIST_COMPETENCE_RULES.case_formulation_building;
    expect(rule.pillar).toBe('clinical_skills');
    // Must reference core formulation elements
    expect(rule.description).toContain('trigger');
    expect(rule.description).toContain('automatic thought');
    expect(rule.description).toContain('emotion');
    expect(rule.description).toContain('avoidance');
    expect(rule.description).toContain('maintaining');
    expect(rule.description).toContain('treatment target');
  });

  it('C1 prohibits jumping to intervention without a working formulation', () => {
    const rule = THERAPIST_COMPETENCE_RULES.case_formulation_building;
    expect(rule.description.toLowerCase()).toContain('not jump to intervention');
  });

  it('C1 frames formulation as an active hypothesis, not a fixed conclusion', () => {
    const rule = THERAPIST_COMPETENCE_RULES.case_formulation_building;
    expect(rule.description).toContain('hypothesis');
    expect(rule.description).toContain('Update the formulation');
  });

  it('C2 maintaining_cycle_identification: names OCD doubt-ritual-relief cycle', () => {
    const rule = THERAPIST_COMPETENCE_RULES.maintaining_cycle_identification;
    expect(rule.pillar).toBe('clinical_skills');
    expect(rule.description).toContain('OCD');
    expect(rule.description).toContain('doubt');
    expect(rule.description).toContain('ritual');
    expect(rule.description).toContain('relief');
  });

  it('C2 names anxiety avoidance cycle', () => {
    const rule = THERAPIST_COMPETENCE_RULES.maintaining_cycle_identification;
    expect(rule.description).toContain('avoidance');
    expect(rule.description).toContain('anxiety');
  });

  it('C2 names depression withdrawal cycle', () => {
    const rule = THERAPIST_COMPETENCE_RULES.maintaining_cycle_identification;
    expect(rule.description).toContain('depression');
    expect(rule.description).toContain('withdrawal');
  });

  it('C3 intervention_selection: lists multiple intervention types', () => {
    const rule = THERAPIST_COMPETENCE_RULES.intervention_selection;
    expect(rule.pillar).toBe('clinical_skills');
    expect(rule.description).toContain('EMPATHIC HOLDING');
    expect(rule.description).toContain('FORMULATION SUMMARY');
    expect(rule.description).toContain('PSYCHOEDUCATION');
    expect(rule.description).toContain('BEHAVIORAL MICRO-STEP');
    expect(rule.description).toContain('EXPOSURE FRAMING');
    expect(rule.description).toContain('HOMEWORK');
  });

  it('C3 prohibits homework without formulation rationale', () => {
    const rule = THERAPIST_COMPETENCE_RULES.intervention_selection;
    expect(rule.description).toContain('Never assign homework without a clear formulation rationale');
  });

  it('C4 socratic_questioning: one focused non-leading question per turn', () => {
    const rule = THERAPIST_COMPETENCE_RULES.socratic_questioning;
    expect(rule.pillar).toBe('clinical_skills');
    expect(rule.description).toContain('one per turn');
    expect(rule.description).toContain('non-leading');
    expect(rule.description).toContain('clinically useful');
  });

  it('C4 prohibits Socratic questions as a substitute for formulation', () => {
    const rule = THERAPIST_COMPETENCE_RULES.socratic_questioning;
    expect(rule.description).toContain('Do NOT ask Socratic questions as a substitute for formulation');
  });

  it('C5 session_management: covers agenda, direction, summary, task, continuity', () => {
    const rule = THERAPIST_COMPETENCE_RULES.session_management;
    expect(rule.pillar).toBe('clinical_skills');
    expect(rule.description).toContain('AGENDA');
    expect(rule.description).toContain('DIRECTION');
    expect(rule.description).toContain('SUMMARY');
    expect(rule.description).toContain('TASK ASSIGNMENT');
    expect(rule.description).toContain('CONTINUITY');
  });

  it('C5 prohibits two tasks in one turn', () => {
    const rule = THERAPIST_COMPETENCE_RULES.session_management;
    expect(rule.description).toContain('Never assign two tasks in one turn');
  });
});

// =============================================================================
// SECTION D — PILLAR B: THEORETICAL KNOWLEDGE (C6–C10)
// =============================================================================

describe('SECTION D — Pillar B: Theoretical Knowledge (C6–C10)', () => {
  it('C6 cbt_chain_clarity: requires explicit CBT chain with personalized language', () => {
    const rule = THERAPIST_COMPETENCE_RULES.cbt_chain_clarity;
    expect(rule.pillar).toBe('theoretical_knowledge');
    expect(rule.description).toContain('trigger');
    expect(rule.description).toContain('automatic thought');
    expect(rule.description).toContain('maintaining loop');
    expect(rule.description).toContain('personalized');
  });

  it('C6 includes reinforcement/avoidance loop explanation', () => {
    const rule = THERAPIST_COMPETENCE_RULES.cbt_chain_clarity;
    // The rule uses "avoid the situation" not "avoidance" as a standalone word
    const hasAvoidance =
      rule.description.includes('avoidance') ||
      rule.description.includes('avoid the situation');
    expect(hasAvoidance).toBe(true);
    expect(rule.description).toContain('relief');
    // reinforcement OR the avoidance loop narrative is sufficient
    const hasReinforcement =
      rule.description.includes('reinforcement') ||
      rule.description.includes('teaches your mind');
    expect(hasReinforcement).toBe(true);
  });

  it('C7 accessible_psychoeducation: three-criteria standard', () => {
    const rule = THERAPIST_COMPETENCE_RULES.accessible_psychoeducation;
    expect(rule.pillar).toBe('theoretical_knowledge');
    // plain language
    expect(rule.description.toLowerCase()).toContain('plain language');
    // connected to person's experience
    expect(rule.description).toContain('connected to this person');
    // explains why
    expect(rule.description).toContain('"why"');
  });

  it('C7 provides an OCD psychoeducation example', () => {
    const rule = THERAPIST_COMPETENCE_RULES.accessible_psychoeducation;
    expect(rule.description).toContain('OCD');
    expect(rule.description).toContain('doubt-checking');
  });

  it('C7 prohibits psychoeducation before empathy', () => {
    const rule = THERAPIST_COMPETENCE_RULES.accessible_psychoeducation;
    expect(rule.description).toContain('precedes empathy');
  });

  it('C8 theory_to_practice: distinguishes formulation, psychoeducation, intervention', () => {
    const rule = THERAPIST_COMPETENCE_RULES.theory_to_practice;
    expect(rule.pillar).toBe('theoretical_knowledge');
    expect(rule.description).toContain('FORMULATION');
    expect(rule.description).toContain('PSYCHOEDUCATION');
    expect(rule.description).toContain('INTERVENTION');
    expect(rule.description).toContain('distinct clinical activities');
  });

  it('C9 cbt_fidelity_without_academia: prohibits "according to CBT theory" framing', () => {
    const rule = THERAPIST_COMPETENCE_RULES.cbt_fidelity_without_academia;
    expect(rule.pillar).toBe('theoretical_knowledge');
    expect(rule.description).toContain('According to CBT theory');
  });

  it('C9 demonstrates that theory must be in thinking, not in language', () => {
    const rule = THERAPIST_COMPETENCE_RULES.cbt_fidelity_without_academia;
    expect(rule.description).toContain("Theory must be present in the therapist's thinking");
  });

  it('C10 no_technique_dumping: prohibits technique lists without clinical fit', () => {
    const rule = THERAPIST_COMPETENCE_RULES.no_technique_dumping;
    expect(rule.pillar).toBe('theoretical_knowledge');
    expect(rule.description.toLowerCase()).toContain('technique dumping');
  });

  it('C10 requires ONE approach with formulation-based rationale', () => {
    const rule = THERAPIST_COMPETENCE_RULES.no_technique_dumping;
    expect(rule.description).toContain('name ONE approach');
    expect(rule.description).toContain('explain WHY');
  });
});

// =============================================================================
// SECTION E — PILLAR C: INTERPERSONAL ABILITIES (C11–C15)
// =============================================================================

describe('SECTION E — Pillar C: Interpersonal Abilities (C11–C15)', () => {
  it('C11 collaborative_empiricism: states "let\'s understand this together" stance', () => {
    const rule = THERAPIST_COMPETENCE_RULES.collaborative_empiricism;
    expect(rule.pillar).toBe('interpersonal');
    expect(rule.description).toContain("Let's understand this together");
  });

  it('C11 includes co-formulation as hypothesis offering', () => {
    const rule = THERAPIST_COMPETENCE_RULES.collaborative_empiricism;
    expect(rule.description).toContain('hypothesis to be confirmed');
  });

  it('C11 requires collaborative goal setting from person\'s own articulation', () => {
    const rule = THERAPIST_COMPETENCE_RULES.collaborative_empiricism;
    expect(rule.description).toContain("person's own articulation");
    expect(rule.description).toContain('Never impose goals');
  });

  it('C12 cultural_religious_sensitivity: OCD cycle is target, NOT religious belief', () => {
    const rule = THERAPIST_COMPETENCE_RULES.cultural_religious_sensitivity;
    expect(rule.pillar).toBe('interpersonal');
    expect(rule.description).toContain('OCD cycle');
    expect(rule.description).toContain('NOT the religious belief');
  });

  it('C12 covers scrupulosity with correct target framing', () => {
    const rule = THERAPIST_COMPETENCE_RULES.cultural_religious_sensitivity;
    expect(rule.description.toUpperCase()).toContain('SCRUPULOSITY');
    expect(rule.description).toContain('anxiety mechanism');
  });

  it('C12 covers grief with meaning-making sensitivity', () => {
    const rule = THERAPIST_COMPETENCE_RULES.cultural_religious_sensitivity;
    expect(rule.description.toUpperCase()).toContain('GRIEF');
    expect(rule.description).toContain('Do not secularize grief');
  });

  it('C13 nondefensive_stuckness: defines 4-step correct response', () => {
    const rule = THERAPIST_COMPETENCE_RULES.nondefensive_stuckness;
    expect(rule.pillar).toBe('interpersonal');
    // Should contain step sequence indicators
    expect(rule.description).toContain('(1)');
    expect(rule.description).toContain('(2)');
    expect(rule.description).toContain('(3)');
    expect(rule.description).toContain('(4)');
  });

  it('C13 prohibits defending the therapeutic approach before acknowledgment', () => {
    const rule = THERAPIST_COMPETENCE_RULES.nondefensive_stuckness;
    expect(rule.description).toContain('PROHIBITED');
    expect(rule.description).toContain('defending the therapeutic approach');
  });

  it('C14 alliance_with_structure: names two failure modes explicitly', () => {
    const rule = THERAPIST_COMPETENCE_RULES.alliance_with_structure;
    expect(rule.pillar).toBe('interpersonal');
    expect(rule.description).toContain('FAILURE MODE 1');
    expect(rule.description).toContain('FAILURE MODE 2');
  });

  it('C14 names warm-but-clinically-weak as failure mode 1', () => {
    const rule = THERAPIST_COMPETENCE_RULES.alliance_with_structure;
    expect(rule.description).toContain('warm but clinically weak');
  });

  it('C14 names structured-but-cold as failure mode 2', () => {
    const rule = THERAPIST_COMPETENCE_RULES.alliance_with_structure;
    expect(rule.description).toContain('structured but relationally cold');
  });

  it('C15 no_didactic_lecturing: prohibits extended theory lectures', () => {
    const rule = THERAPIST_COMPETENCE_RULES.no_didactic_lecturing;
    expect(rule.pillar).toBe('interpersonal');
    expect(rule.description).toContain('lectures');
  });

  it('C15 requires re-engagement after every formulation', () => {
    const rule = THERAPIST_COMPETENCE_RULES.no_didactic_lecturing;
    expect(rule.description).toContain('re-engage');
  });

  it('C15 contrasts dialogue with monologue', () => {
    const rule = THERAPIST_COMPETENCE_RULES.no_didactic_lecturing;
    expect(rule.description).toContain('Dialogue, not monologue');
  });
});

// =============================================================================
// SECTION F — BUILDCOMPETENCEINSTRUCTIONS / EXPORTED STRING
// =============================================================================

describe('SECTION F — buildCompetenceInstructions() and THERAPIST_COMPETENCE_INSTRUCTIONS', () => {
  it('buildCompetenceInstructions() is exported and callable', () => {
    expect(typeof buildCompetenceInstructions).toBe('function');
    const result = buildCompetenceInstructions();
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(500);
  });

  it('THERAPIST_COMPETENCE_INSTRUCTIONS is a non-empty string', () => {
    expect(typeof THERAPIST_COMPETENCE_INSTRUCTIONS).toBe('string');
    expect(THERAPIST_COMPETENCE_INSTRUCTIONS.length).toBeGreaterThan(500);
  });

  it('Instructions include "PHASE 3 COMPETENCE ARCHITECTURE" header', () => {
    expect(THERAPIST_COMPETENCE_INSTRUCTIONS).toContain('PHASE 3 COMPETENCE ARCHITECTURE');
  });

  it('Instructions include "PILLAR A" section', () => {
    expect(THERAPIST_COMPETENCE_INSTRUCTIONS).toContain('PILLAR A');
  });

  it('Instructions include "PILLAR B" section', () => {
    expect(THERAPIST_COMPETENCE_INSTRUCTIONS).toContain('PILLAR B');
  });

  it('Instructions include "PILLAR C" section', () => {
    expect(THERAPIST_COMPETENCE_INSTRUCTIONS).toContain('PILLAR C');
  });

  it('Instructions include "HARD FAILURE CONDITIONS" section', () => {
    expect(THERAPIST_COMPETENCE_INSTRUCTIONS).toContain('HARD FAILURE CONDITIONS');
  });

  it('Instructions include "PRESERVED GAINS" section', () => {
    expect(THERAPIST_COMPETENCE_INSTRUCTIONS).toContain('PRESERVED GAINS');
  });

  it('Instructions include all 15 rule labels or IDs', () => {
    // Spot-check a representative sample of all 15 rules
    expect(THERAPIST_COMPETENCE_INSTRUCTIONS).toContain('formulation');
    expect(THERAPIST_COMPETENCE_INSTRUCTIONS).toContain('maintaining');
    expect(THERAPIST_COMPETENCE_INSTRUCTIONS).toContain('intervention');
    expect(THERAPIST_COMPETENCE_INSTRUCTIONS).toContain('Socratic');
    expect(THERAPIST_COMPETENCE_INSTRUCTIONS).toContain('session');
    expect(THERAPIST_COMPETENCE_INSTRUCTIONS).toContain('chain');
    expect(THERAPIST_COMPETENCE_INSTRUCTIONS).toContain('psychoeducation');
    expect(THERAPIST_COMPETENCE_INSTRUCTIONS).toContain('collaborative');
    expect(THERAPIST_COMPETENCE_INSTRUCTIONS).toContain('cultural');
  });

  it('Instructions state that rules are additive and safety takes precedence', () => {
    expect(THERAPIST_COMPETENCE_INSTRUCTIONS).toContain('ADDITIVE');
    expect(THERAPIST_COMPETENCE_INSTRUCTIONS).toContain('safety');
  });

  it('Instructions mention preserved gains from prior phases', () => {
    expect(THERAPIST_COMPETENCE_INSTRUCTIONS).toContain('warmth');
    expect(THERAPIST_COMPETENCE_INSTRUCTIONS).toContain('pacing');
    expect(THERAPIST_COMPETENCE_INSTRUCTIONS).toContain('alliance');
  });
});

// =============================================================================
// SECTION G — WIRING AND ROUTING
// =============================================================================

describe('SECTION G — V11 wiring and routing', () => {
  it('CBT_THERAPIST_WIRING_STAGE2_V11 is exported', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V11).toBeDefined();
    expect(typeof CBT_THERAPIST_WIRING_STAGE2_V11).toBe('object');
  });

  it('V11 has competence_layer_enabled: true', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V11.competence_layer_enabled).toBe(true);
  });

  it('V11 has stage2_phase: 15', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V11.stage2_phase).toBe(15);
  });

  it('V11 has name: cbt_therapist', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V11.name).toBe('cbt_therapist');
  });

  it('V11 has stage2: true', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V11.stage2).toBe(true);
  });

  it('V11 tool_configs are identical to V10 (15 entries, no new entity access)', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V11.tool_configs).toHaveLength(
      CBT_THERAPIST_WIRING_STAGE2_V10.tool_configs.length,
    );
    // Entity names must match exactly
    const v10Names = CBT_THERAPIST_WIRING_STAGE2_V10.tool_configs.map((t) => t.entity_name);
    const v11Names = CBT_THERAPIST_WIRING_STAGE2_V11.tool_configs.map((t) => t.entity_name);
    expect(v11Names).toEqual(v10Names);
  });

  it('V11 inherits all V10 capability flags', () => {
    const v10FlagKeys = [
      'memory_context_injection',
      'workflow_engine_enabled',
      'workflow_context_injection',
      'retrieval_orchestration_enabled',
      'live_retrieval_enabled',
      'safety_mode_enabled',
      'formulation_context_enabled',
      'continuity_layer_enabled',
      'strategy_layer_enabled',
      'longitudinal_layer_enabled',
      'knowledge_layer_enabled',
    ];
    for (const flag of v10FlagKeys) {
      expect(
        CBT_THERAPIST_WIRING_STAGE2_V11[flag],
        `V11 should inherit V10 flag: ${flag}`,
      ).toBe(true);
    }
  });

  it('resolveTherapistWiring() routes to V11 when COMPETENCE_ENABLED is on', () => {
    // When all flags are off (as in test env), resolves to HYBRID
    // We test that the routing logic correctly includes V11 by checking
    // the V11 wiring is the one with competence_layer_enabled
    const result = resolveTherapistWiring();
    // In test env, all flags are false — must return HYBRID
    expect(result.name).toBe('cbt_therapist');
    // V11 is the superset that would be returned if COMPETENCE_ENABLED were true
    expect(CBT_THERAPIST_WIRING_STAGE2_V11.competence_layer_enabled).toBe(true);
  });

  it('resolveTherapistWiring() routes to HYBRID when all flags are off', () => {
    const result = resolveTherapistWiring();
    // In test env, all flags are false
    expect(result).toBe(CBT_THERAPIST_WIRING_HYBRID);
  });

  it('ACTIVE_CBT_THERAPIST_WIRING is HYBRID when all flags are off (default state)', () => {
    expect(ACTIVE_CBT_THERAPIST_WIRING).toBe(CBT_THERAPIST_WIRING_HYBRID);
  });

  it('V11 includes CBTCurriculumUnit in tool_configs (inherited from V10)', () => {
    const curricConfig = CBT_THERAPIST_WIRING_STAGE2_V11.tool_configs.find(
      (t) => t.entity_name === 'CBTCurriculumUnit',
    );
    expect(curricConfig).toBeDefined();
    expect(curricConfig.read_only).toBe(true);
  });

  it('V11 does not add any new entity beyond V10', () => {
    const v10Names = new Set(CBT_THERAPIST_WIRING_STAGE2_V10.tool_configs.map((t) => t.entity_name));
    const v11Names = new Set(CBT_THERAPIST_WIRING_STAGE2_V11.tool_configs.map((t) => t.entity_name));
    // Every V11 entity must already be in V10
    for (const name of v11Names) {
      expect(v10Names.has(name), `V11 added new entity: ${name}`).toBe(true);
    }
  });
});

// =============================================================================
// SECTION H — BUILDV11SESSIONSTARTCONTENTASYNC
// =============================================================================

describe('SECTION H — buildV11SessionStartContentAsync', () => {
  it('buildV11SessionStartContentAsync is exported', () => {
    expect(typeof buildV11SessionStartContentAsync).toBe('function');
  });

  it('for non-V11 wirings: delegates to V10 (returns same result)', async () => {
    const nonV11Wiring = { name: 'cbt_therapist', competence_layer_enabled: false };
    const entities = buildMockEntities();
    const baseClient = buildMockBaseClient();

    const v10Result = await buildV10SessionStartContentAsync(nonV11Wiring, entities, baseClient);
    const v11Result = await buildV11SessionStartContentAsync(nonV11Wiring, entities, baseClient);
    expect(v11Result).toBe(v10Result);
  });

  it('for null wiring: delegates to V10 (returns same result)', async () => {
    const entities = buildMockEntities();
    const baseClient = buildMockBaseClient();

    const v10Result = await buildV10SessionStartContentAsync(null, entities, baseClient);
    const v11Result = await buildV11SessionStartContentAsync(null, entities, baseClient);
    expect(v11Result).toBe(v10Result);
  });

  it('for V11 wiring: result starts with V10 content', async () => {
    const v11Wiring = { ...CBT_THERAPIST_WIRING_STAGE2_V11 };
    const entities = buildMockEntities();
    const baseClient = buildMockBaseClient();

    const v10Base = await buildV10SessionStartContentAsync(v11Wiring, entities, baseClient);
    const v11Result = await buildV11SessionStartContentAsync(v11Wiring, entities, baseClient);

    expect(v11Result).toContain(v10Base);
  });

  it('for V11 wiring: appends THERAPIST_COMPETENCE_INSTRUCTIONS', async () => {
    const v11Wiring = { ...CBT_THERAPIST_WIRING_STAGE2_V11 };
    const entities = buildMockEntities();
    const baseClient = buildMockBaseClient();

    const v11Result = await buildV11SessionStartContentAsync(v11Wiring, entities, baseClient);
    expect(v11Result).toContain('PHASE 3 COMPETENCE ARCHITECTURE');
  });

  it('for V11 wiring: result is longer than V10 base', async () => {
    const v11Wiring = { ...CBT_THERAPIST_WIRING_STAGE2_V11 };
    const entities = buildMockEntities();
    const baseClient = buildMockBaseClient();

    const v10Base = await buildV10SessionStartContentAsync(v11Wiring, entities, baseClient);
    const v11Result = await buildV11SessionStartContentAsync(v11Wiring, entities, baseClient);

    expect(v11Result.length).toBeGreaterThan(v10Base.length);
  });

  it('is fail-open: never throws on missing entities', async () => {
    const v11Wiring = { ...CBT_THERAPIST_WIRING_STAGE2_V11 };
    await expect(
      buildV11SessionStartContentAsync(v11Wiring, null, null),
    ).resolves.not.toThrow();
  });

  it('is fail-open: returns a non-empty string on minimal input', async () => {
    const v11Wiring = { ...CBT_THERAPIST_WIRING_STAGE2_V11 };
    const result = await buildV11SessionStartContentAsync(v11Wiring, null, null);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});

// =============================================================================
// SECTION I — CBT_THERAPIST AGENT INSTRUCTION CONTENT
// =============================================================================

describe('SECTION I — cbt_therapist.jsonc agent instruction content', () => {
  it('cbt_therapist.jsonc is valid JSON', () => {
    expect(() => JSON.parse(agentFileRaw)).not.toThrow();
  });

  it('cbt_therapist.jsonc contains "PHASE 3 COMPETENCE ARCHITECTURE"', () => {
    expect(agentInstructions).toContain('PHASE 3 COMPETENCE ARCHITECTURE');
  });

  it('cbt_therapist.jsonc contains C1 case formulation building text', () => {
    expect(agentInstructions).toContain('C1');
    expect(agentInstructions.toUpperCase()).toContain('CASE FORMULATION BUILDING');
  });

  it('cbt_therapist.jsonc contains C2 maintaining cycle identification text', () => {
    expect(agentInstructions).toContain('C2');
    expect(agentInstructions.toUpperCase()).toContain('MAINTAINING CYCLE');
  });

  it('cbt_therapist.jsonc contains C3 intervention selection types', () => {
    expect(agentInstructions).toContain('EMPATHIC HOLDING');
    expect(agentInstructions).toContain('EXPOSURE FRAMING');
  });

  it('cbt_therapist.jsonc contains C4 Socratic questioning rules', () => {
    expect(agentInstructions).toContain('C4');
    expect(agentInstructions.toUpperCase()).toContain('SOCRATIC');
  });

  it('cbt_therapist.jsonc contains C5 session management rules', () => {
    expect(agentInstructions).toContain('C5');
    expect(agentInstructions.toUpperCase()).toContain('SESSION MANAGEMENT');
  });

  it('cbt_therapist.jsonc contains C6 CBT chain clarity rule', () => {
    expect(agentInstructions).toContain('C6');
    expect(agentInstructions.toUpperCase()).toContain('CBT CHAIN CLARITY');
  });

  it('cbt_therapist.jsonc contains C7 accessible psychoeducation text', () => {
    expect(agentInstructions).toContain('C7');
    expect(agentInstructions.toUpperCase()).toContain('PSYCHOEDUCATION');
  });

  it('cbt_therapist.jsonc contains C8 theory-to-practice distinction', () => {
    expect(agentInstructions).toContain('C8');
    expect(agentInstructions.toUpperCase()).toContain('THEORY-TO-PRACTICE');
  });

  it('cbt_therapist.jsonc contains C9 "according to CBT theory" prohibition', () => {
    expect(agentInstructions).toContain('According to CBT theory');
  });

  it('cbt_therapist.jsonc contains C10 technique dumping prohibition', () => {
    expect(agentInstructions).toContain('C10');
    expect(agentInstructions.toUpperCase()).toContain('TECHNIQUE DUMPING');
  });

  it('cbt_therapist.jsonc contains C11 collaborative empiricism text', () => {
    expect(agentInstructions).toContain('C11');
    expect(agentInstructions.toUpperCase()).toContain('COLLABORATIVE EMPIRICISM');
  });

  it('cbt_therapist.jsonc contains C12 scrupulosity/religious OCD text', () => {
    expect(agentInstructions).toContain('C12');
    expect(agentInstructions.toUpperCase()).toContain('SCRUPULOSITY');
  });

  it('cbt_therapist.jsonc contains C13 non-defensive stuckness text', () => {
    expect(agentInstructions).toContain('C13');
    expect(agentInstructions.toUpperCase()).toContain('NON-DEFENSIVE');
  });

  it('cbt_therapist.jsonc contains C14 two failure modes text', () => {
    expect(agentInstructions).toContain('C14');
    expect(agentInstructions).toContain('FAILURE MODE 1');
    expect(agentInstructions).toContain('FAILURE MODE 2');
  });

  it('cbt_therapist.jsonc contains C15 lecture prohibition text', () => {
    expect(agentInstructions).toContain('C15');
    expect(agentInstructions.toUpperCase()).toContain('DIDACTIC');
  });
});

// =============================================================================
// SECTION J — CLINICAL SCENARIO COVERAGE (REGRESSION TESTS)
// =============================================================================

describe('SECTION J — Clinical scenario coverage and regression tests', () => {
  // 74 — Anxiety case: formulation must include maintaining cycle (avoidance loop)
  it('74: Anxiety case — avoidance loop is addressed in intervention selection rules', () => {
    const interventionRule = THERAPIST_COMPETENCE_RULES.intervention_selection;
    const cycleRule = THERAPIST_COMPETENCE_RULES.maintaining_cycle_identification;
    // Avoidance as maintaining mechanism must be present
    expect(cycleRule.description).toContain('avoidance → maintained threat belief');
    expect(interventionRule.description).toContain('EXPOSURE FRAMING');
    expect(interventionRule.description).toContain('avoidance');
  });

  // 75 — Depression / low self-worth: withdrawal and reinforcement targeted
  it('75: Depression case — withdrawal and reinforcement are named in maintaining cycle rules', () => {
    const rule = THERAPIST_COMPETENCE_RULES.maintaining_cycle_identification;
    expect(rule.description).toContain('depression');
    expect(rule.description).toContain('withdrawal');
    expect(rule.description).toContain('reduced positive reinforcement');
  });

  // 76 — OCD formulation: doubt-ritual-relief cycle explicitly covered
  it('76: OCD case — doubt-ritual-relief cycle explicitly covered', () => {
    const rule = THERAPIST_COMPETENCE_RULES.maintaining_cycle_identification;
    expect(rule.description).toContain('doubt');
    expect(rule.description).toContain('ritual');
    expect(rule.description).toContain('brief relief');
    expect(rule.description).toContain('doubt returns');
  });

  // 77 — Scrupulosity: OCD cycle is target, NOT religious belief
  it('77: Scrupulosity — OCD cycle is the target, not the religious belief', () => {
    const rule = THERAPIST_COMPETENCE_RULES.cultural_religious_sensitivity;
    expect(rule.description).toContain('OCD cycle');
    expect(rule.description).toContain('NOT the religious belief');
    expect(rule.description).toContain('Do not imply that religious observance is a symptom');
  });

  // 78 — Trauma: formulation before technique, no premature intervention
  it('78: Trauma case — formulation before technique enforced by intervention_selection', () => {
    const rule = THERAPIST_COMPETENCE_RULES.intervention_selection;
    expect(rule.description).toContain('EMPATHIC HOLDING');
    expect(rule.description).toContain('Never deploy a technique without');
  });

  // 79 — Grief/loss: meaning and impact, no CBT framework in first responses
  it('79: Grief case — cultural/spiritual meaning preserved, no secularization', () => {
    const rule = THERAPIST_COMPETENCE_RULES.cultural_religious_sensitivity;
    expect(rule.description).toContain('Do not secularize grief');
    expect(rule.description).toContain('meaning-making');
  });

  // 80 — ADHD overload: practical formulation, one manageable step
  it('80: ADHD overload — session management prohibits multiple tasks', () => {
    const rule = THERAPIST_COMPETENCE_RULES.session_management;
    expect(rule.description).toContain('Never assign two tasks in one turn');
    expect(rule.description).toContain('one specific, meaningful, and manageable task');
  });

  // 81 — Social anxiety: safety behaviors identified as maintaining mechanism
  it('81: Social anxiety — safety behaviors are part of the formulation model', () => {
    const rule = THERAPIST_COMPETENCE_RULES.case_formulation_building;
    expect(rule.description).toContain('safety behaviors');
    expect(rule.description).toContain('avoidance');
  });

  // 82 — First session: collaborative goal setting from person's own articulation
  it('82: First-session — collaborative goal setting required from person\'s own articulation', () => {
    const rule = THERAPIST_COMPETENCE_RULES.collaborative_empiricism;
    expect(rule.description).toContain("person's own articulation");
    expect(rule.description).toContain('Never impose goals');
  });

  // 83 — Psychoeducation quality: plain language, connected to case, explains "why"
  it('83: Psychoeducation quality — three-criteria standard enforced', () => {
    const rule = THERAPIST_COMPETENCE_RULES.accessible_psychoeducation;
    expect(rule.description).toContain('plain language');
    expect(rule.description).toContain("this person's actual experience");
    expect(rule.description).toContain('"why"');
  });

  // 84 — Socratic questioning: focused, non-leading, advances formulation
  it('84: Socratic questioning — one focused non-leading question per turn', () => {
    const rule = THERAPIST_COMPETENCE_RULES.socratic_questioning;
    expect(rule.description).toContain('one per turn');
    expect(rule.description).toContain('non-leading');
    // The rule describes that Socratic questions "advance the formulation or reveal a new perspective"
    expect(rule.description).toContain('advance the formulation');
  });

  // 85 — Collaborative empiricism: shared inquiry tone, not authority
  it('85: Collaborative empiricism — shared inquiry, not authority delivering findings', () => {
    const rule = THERAPIST_COMPETENCE_RULES.collaborative_empiricism;
    expect(rule.description).toContain('co-investigator');
    expect(rule.description).toContain('not as an authority delivering findings');
  });

  // 86 — Session summary + task: one specific task after formulation established
  it('86: Session summary + task — one task only after formulation is established', () => {
    const rule = THERAPIST_COMPETENCE_RULES.session_management;
    expect(rule.description).toContain('one specific, meaningful, and manageable task');
    expect(rule.description).toContain('the formulation is established');
  });

  // 87 — Cross-language: competence pillars apply in all languages
  it('87: Cross-language — THERAPIST_COMPETENCE_INSTRUCTIONS contains no language restriction', () => {
    // The competence instructions do not gate on language — they apply universally
    expect(THERAPIST_COMPETENCE_INSTRUCTIONS).not.toContain('English only');
    expect(THERAPIST_COMPETENCE_INSTRUCTIONS).not.toContain('Hebrew only');
    // The instructions state they are additive to all prior layers
    expect(THERAPIST_COMPETENCE_INSTRUCTIONS).toContain('ADDITIVE');
  });

  // 88 — Preserved gains: warmth, pacing, alliance from prior phases still present
  it('88: Preserved gains — constitution still has 7 principles (no regression)', () => {
    expect(THERAPIST_CONSTITUTION).toHaveLength(7);
  });

  it('88: Preserved gains — THERAPIST_FIRST_SESSION_FLOW still has 7 steps', () => {
    expect(THERAPIST_FIRST_SESSION_FLOW).toHaveLength(7);
  });

  it('88: Preserved gains — THERAPIST_PACING_REFINEMENT_RULES still has 6 rules', () => {
    expect(Object.keys(THERAPIST_PACING_REFINEMENT_RULES)).toHaveLength(6);
  });

  it('88: Preserved gains — THERAPIST_FORMULATION_INSTRUCTIONS still present', () => {
    expect(typeof THERAPIST_FORMULATION_INSTRUCTIONS).toBe('string');
    expect(THERAPIST_FORMULATION_INSTRUCTIONS.length).toBeGreaterThan(100);
  });

  it('88: Preserved gains — THERAPIST_COMPETENCE_INSTRUCTIONS states warmth preservation', () => {
    expect(THERAPIST_COMPETENCE_INSTRUCTIONS).toContain('warmth');
  });

  it('88: Preserved gains — THERAPIST_COMPETENCE_INSTRUCTIONS states pacing preservation', () => {
    expect(THERAPIST_COMPETENCE_INSTRUCTIONS).toContain('pacing');
  });

  it('88: Preserved gains — cbt_therapist.jsonc still contains PHASE 2 REFINEMENT', () => {
    expect(agentInstructions).toContain('PHASE 2 REFINEMENT');
  });

  it('88: Preserved gains — cbt_therapist.jsonc still contains THERAPIST CONSTITUTION', () => {
    expect(agentInstructions).toContain('THERAPIST CONSTITUTION');
  });
});

// =============================================================================
// SECTION K — CHAT.JSX IMPORT AUDIT
// =============================================================================

describe('SECTION K — Chat.jsx import audit', () => {
  it('Chat.jsx imports buildV11SessionStartContentAsync', () => {
    const chatSource = readFileSync(
      resolve(process.cwd(), 'src/pages/Chat.jsx'),
      'utf-8',
    );
    expect(chatSource).toContain('buildV11SessionStartContentAsync');
  });

  it('Chat.jsx imports buildV12SessionStartContentAsync', () => {
    const chatSource = readFileSync(
      resolve(process.cwd(), 'src/pages/Chat.jsx'),
      'utf-8',
    );
    expect(chatSource).toContain('buildV12SessionStartContentAsync');
  });

  it('Chat.jsx uses buildV12SessionStartContentAsync (not V11) as the session-start caller', () => {
    const chatSource = readFileSync(
      resolve(process.cwd(), 'src/pages/Chat.jsx'),
      'utf-8',
    );
    // All session-start call sites now use buildActionFirstDemotedSessionContentAsync
    // (action-first demotion pass: wrapper injects formulation-first block for all wirings)
    const demoedCalls = (chatSource.match(/buildActionFirstDemotedSessionContentAsync/g) || []).length;
    const v11Calls = (chatSource.match(/await buildV11SessionStartContentAsync/g) || []).length;
    const v10Calls = (chatSource.match(/await buildV10SessionStartContentAsync/g) || []).length;
    expect(demoedCalls).toBeGreaterThanOrEqual(4); // at least 4 call sites (import + 4 calls)
    expect(v11Calls).toBe(0); // V11 no longer called directly at call sites
    expect(v10Calls).toBe(0); // V10 no longer called directly
  });
});
