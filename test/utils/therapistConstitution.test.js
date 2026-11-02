/**
 * @file test/utils/therapistConstitution.test.js
 *
 * Therapist Constitution — Behavioral Architecture
 *
 * PURPOSE
 * -------
 * Verifies the therapist constitution implementation across all required
 * behavioral dimensions. Covers the 17 required test scenarios specified
 * in the therapist behavior architecture task:
 *
 * SECTION A — VERSION
 *   1.  Version bumped to 3.3.0
 *
 * SECTION B — THERAPIST CONSTITUTION
 *   2.  THERAPIST_CONSTITUTION is exported and well-formed (7 principles)
 *   3.  All 7 principle IDs are present
 *   4.  buildWorkflowContextInstructions includes constitution preamble
 *
 * SECTION C — FIRST-SESSION OPERATING MODEL
 *   5.  THERAPIST_FIRST_SESSION_FLOW is exported with 7 steps
 *   6.  All 7 step names are present
 *   7.  Steps are in correct order (1–7)
 *   8.  buildWorkflowContextInstructions includes first-session model
 *
 * SECTION D — CLINICAL SENSITIVITY RULES
 *   9.  THERAPIST_CLINICAL_SENSITIVITY_RULES is exported
 *   10. All required domain keys are present (9 domains)
 *   11. Each domain has a rules string and domain label
 *   12. buildWorkflowContextInstructions includes clinical sensitivity section
 *
 * SECTION E — CROSS-LANGUAGE CONSISTENCY RULES
 *   13. THERAPIST_CROSS_LANGUAGE_RULES is exported as a frozen array
 *   14. Cross-language rules address: language parity, language switch, refusal parity
 *   15. buildWorkflowContextInstructions includes cross-language section
 *
 * SECTION F — CBT_THERAPIST AGENT INSTRUCTION CONTENT
 *   (These verify cbt_therapist.jsonc contains the required sections)
 *   16. cbt_therapist.jsonc contains THERAPIST CONSTITUTION section
 *   17. cbt_therapist.jsonc contains FIRST-SESSION OPERATING MODEL section
 *   18. cbt_therapist.jsonc contains CLINICAL SENSITIVITY RULES section
 *   19. cbt_therapist.jsonc contains JOINING EXCEPTION in CP1
 *   20. cbt_therapist.jsonc contains CROSS-LANGUAGE CONSISTENCY RULES
 *   21. cbt_therapist.jsonc CLINICAL SENSITIVITY RULES covers OCD
 *   22. cbt_therapist.jsonc CLINICAL SENSITIVITY RULES covers religious OCD
 *   23. cbt_therapist.jsonc CLINICAL SENSITIVITY RULES covers teen cases
 *   24. cbt_therapist.jsonc CLINICAL SENSITIVITY RULES covers trauma
 *   25. cbt_therapist.jsonc CLINICAL SENSITIVITY RULES covers grief/loss
 *   26. cbt_therapist.jsonc CLINICAL SENSITIVITY RULES covers ADHD
 *   27. cbt_therapist.jsonc CLINICAL SENSITIVITY RULES covers sleep/insomnia
 *   28. cbt_therapist.jsonc CLINICAL SENSITIVITY RULES covers eating disorders
 *
 * SECTION G — BEHAVIORAL HARD-FAILURE PREVENTION
 *   29. JOINING EXCEPTION text prevents cold redirect on first turn
 *   30. Clinical sensitivity safeguard prevents domain-agnostic rigidity
 *   31. CONSTITUTION principles prevent template dumping without case connection
 *   32. First-session model step 7 prevents premature homework lists
 *
 * SECTION H — SCENARIO COVERAGE IN INJECTED INSTRUCTIONS
 *   33. Greeting + politeness exchange — early turn rule present
 *   34. "What can you help with?" — no intake menu rule present
 *   35. First-session framing — first-session model in instructions
 *   36. Structured 45-minute session — fixed 6-step sequence present
 *   37. Anxiety case — sensitivity rules in instructions
 *   38. Depression / low self-worth — constitution warmth principles present
 *   39. OCD case — ocd_compulsive sensitivity rule present
 *   40. Religious OCD / scrupulosity — religious_ocd sensitivity rule present
 *   41. Trauma-related case — trauma sensitivity rule present
 *   42. Grief/loss case — grief_loss sensitivity rule present
 *   43. ADHD / organization case — adhd_organization sensitivity rule present
 *   44. Sleep/insomnia case — insomnia_sleep sensitivity rule present
 *   45. Teen case — teen_cases sensitivity rule present
 *   46. Cross-language consistency — cross-language rules in instructions
 *   47. Mid-session language switch — language switch rule present
 *   48. Alliance preservation before intervention — joining rule present
 *   49. One-step default after understanding — one next step rule present
 *
 * CONSTRAINTS
 * -----------
 * - Does NOT import from base44/functions/ (Deno code — not importable in Vitest)
 * - Does NOT modify any existing test files
 * - All existing assertions in prior phase tests must still pass
 * - Does NOT enable any feature flags
 *
 * Source of truth: therapist behavior architecture task — constitution implementation
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

import {
  THERAPIST_WORKFLOW_VERSION,
  THERAPIST_CONSTITUTION,
  THERAPIST_FIRST_SESSION_FLOW,
  THERAPIST_CLINICAL_SENSITIVITY_RULES,
  THERAPIST_CROSS_LANGUAGE_RULES,
  THERAPIST_WORKFLOW_INSTRUCTIONS,
  THERAPIST_WORKFLOW_RESPONSE_RULES,
  THERAPIST_EARLY_TURN_SEQUENCE,
  buildWorkflowContextInstructions,
} from '../../src/lib/therapistWorkflowEngine.js';

// ─── Load cbt_therapist.jsonc ─────────────────────────────────────────────────

const CBT_THERAPIST_PATH = join(
  import.meta.dirname,
  '../../base44/agents/cbt_therapist.jsonc',
);

let agentInstructions = '';
try {
  const raw = readFileSync(CBT_THERAPIST_PATH, 'utf8');
  // Strip single-line comments before parsing
  const cleaned = raw.replace(/\/\/[^\n]*/g, '');
  const parsed = JSON.parse(cleaned);
  agentInstructions = parsed.instructions || '';
} catch (e) {
  // If parsing fails, leave agentInstructions empty; tests will fail with clear message
}

// ─── Section A — Version ──────────────────────────────────────────────────────

describe('Therapist Constitution — Section A: Version', () => {
  it('THERAPIST_WORKFLOW_VERSION is "3.7.0"', () => {
    expect(THERAPIST_WORKFLOW_VERSION).toBe('3.7.0');
  });
});

// ─── Section B — THERAPIST_CONSTITUTION ──────────────────────────────────────

describe('Therapist Constitution — Section B: THERAPIST_CONSTITUTION export', () => {
  it('is exported as a frozen array', () => {
    expect(Array.isArray(THERAPIST_CONSTITUTION)).toBe(true);
    expect(Object.isFrozen(THERAPIST_CONSTITUTION)).toBe(true);
  });

  it('has exactly 7 principles', () => {
    expect(THERAPIST_CONSTITUTION.length).toBe(7);
  });

  const REQUIRED_PRINCIPLE_IDS = [
    'containing_before_clinical',
    'brief_joining_before_guiding',
    'understand_before_intervening',
    'language_parity',
    'not_a_workflow_engine',
    'not_vague_or_passive',
    'coherent_identity',
  ];

  for (const id of REQUIRED_PRINCIPLE_IDS) {
    it(`includes principle: ${id}`, () => {
      const found = THERAPIST_CONSTITUTION.some((p) => p.id === id);
      expect(found).toBe(true);
    });
  }

  it('each principle has id, label, and description', () => {
    for (const principle of THERAPIST_CONSTITUTION) {
      expect(typeof principle.id).toBe('string');
      expect(principle.id.length).toBeGreaterThan(0);
      expect(typeof principle.label).toBe('string');
      expect(principle.label.length).toBeGreaterThan(0);
      expect(typeof principle.description).toBe('string');
      expect(principle.description.length).toBeGreaterThan(0);
    }
  });

  it('each principle object is frozen', () => {
    for (const principle of THERAPIST_CONSTITUTION) {
      expect(Object.isFrozen(principle)).toBe(true);
    }
  });

  it('buildWorkflowContextInstructions includes IDENTITY LAYER section', () => {
    const output = buildWorkflowContextInstructions();
    expect(output).toContain('THERAPIST CONSTITUTION (IDENTITY LAYER)');
  });

  it('buildWorkflowContextInstructions includes containing_before_clinical principle', () => {
    const output = buildWorkflowContextInstructions();
    expect(output).toContain('containing_before_clinical');
  });

  it('buildWorkflowContextInstructions includes coherent_identity principle', () => {
    const output = buildWorkflowContextInstructions();
    expect(output).toContain('coherent_identity');
  });
});

// ─── Section C — THERAPIST_FIRST_SESSION_FLOW ─────────────────────────────────

describe('Therapist Constitution — Section C: THERAPIST_FIRST_SESSION_FLOW', () => {
  it('is exported as a frozen array', () => {
    expect(Array.isArray(THERAPIST_FIRST_SESSION_FLOW)).toBe(true);
    expect(Object.isFrozen(THERAPIST_FIRST_SESSION_FLOW)).toBe(true);
  });

  it('has exactly 7 steps', () => {
    expect(THERAPIST_FIRST_SESSION_FLOW.length).toBe(7);
  });

  it('steps are numbered 1 through 7 in order', () => {
    for (let i = 0; i < 7; i++) {
      expect(THERAPIST_FIRST_SESSION_FLOW[i].step).toBe(i + 1);
    }
  });

  const REQUIRED_STEP_NAMES = [
    'rapport_and_emotional_safety',
    'brief_cbt_framing',
    'assessment_of_problem_and_why_now',
    'identification_of_maintaining_patterns',
    'translate_into_treatment_goal',
    'concise_summary',
    'one_realistic_first_task',
  ];

  for (const name of REQUIRED_STEP_NAMES) {
    it(`includes step: ${name}`, () => {
      const found = THERAPIST_FIRST_SESSION_FLOW.some((s) => s.name === name);
      expect(found).toBe(true);
    });
  }

  it('each step has step, name, and description', () => {
    for (const step of THERAPIST_FIRST_SESSION_FLOW) {
      expect(typeof step.step).toBe('number');
      expect(typeof step.name).toBe('string');
      expect(step.name.length).toBeGreaterThan(0);
      expect(typeof step.description).toBe('string');
      expect(step.description.length).toBeGreaterThan(0);
    }
  });

  it('each step object is frozen', () => {
    for (const step of THERAPIST_FIRST_SESSION_FLOW) {
      expect(Object.isFrozen(step)).toBe(true);
    }
  });

  it('buildWorkflowContextInstructions includes FIRST-SESSION OPERATING MODEL section', () => {
    const output = buildWorkflowContextInstructions();
    expect(output).toContain('FIRST-SESSION OPERATING MODEL');
  });

  it('buildWorkflowContextInstructions includes rapport_and_emotional_safety step', () => {
    const output = buildWorkflowContextInstructions();
    expect(output).toContain('rapport_and_emotional_safety');
  });

  it('buildWorkflowContextInstructions includes one_realistic_first_task step', () => {
    const output = buildWorkflowContextInstructions();
    expect(output).toContain('one_realistic_first_task');
  });
});

// ─── Section D — THERAPIST_CLINICAL_SENSITIVITY_RULES ────────────────────────

describe('Therapist Constitution — Section D: THERAPIST_CLINICAL_SENSITIVITY_RULES', () => {
  it('is exported as a frozen object', () => {
    expect(typeof THERAPIST_CLINICAL_SENSITIVITY_RULES).toBe('object');
    expect(Object.isFrozen(THERAPIST_CLINICAL_SENSITIVITY_RULES)).toBe(true);
  });

  const REQUIRED_DOMAIN_KEYS = [
    'ocd_compulsive',
    'religious_ocd',
    'teen_cases',
    'trauma',
    'grief_loss',
    'anger_relationship',
    'adhd_organization',
    'insomnia_sleep',
    'eating_body_image',
  ];

  it(`has all ${REQUIRED_DOMAIN_KEYS.length} required domain keys`, () => {
    const keys = Object.keys(THERAPIST_CLINICAL_SENSITIVITY_RULES);
    for (const key of REQUIRED_DOMAIN_KEYS) {
      expect(keys).toContain(key);
    }
  });

  for (const key of REQUIRED_DOMAIN_KEYS) {
    it(`${key} has domain and rules fields`, () => {
      const rule = THERAPIST_CLINICAL_SENSITIVITY_RULES[key];
      expect(typeof rule.domain).toBe('string');
      expect(rule.domain.length).toBeGreaterThan(0);
      expect(typeof rule.rules).toBe('string');
      expect(rule.rules.length).toBeGreaterThan(0);
    });

    it(`${key} entry is frozen`, () => {
      expect(Object.isFrozen(THERAPIST_CLINICAL_SENSITIVITY_RULES[key])).toBe(true);
    });
  }

  it('ocd_compulsive rules mention OCD cycle', () => {
    expect(THERAPIST_CLINICAL_SENSITIVITY_RULES.ocd_compulsive.rules).toContain('cycle');
  });

  it('religious_ocd rules contain CRITICAL warning about not arguing with religion', () => {
    const rules = THERAPIST_CLINICAL_SENSITIVITY_RULES.religious_ocd.rules;
    expect(rules.toUpperCase()).toContain('CRITICAL');
  });

  it('trauma rules mention stabilization', () => {
    expect(THERAPIST_CLINICAL_SENSITIVITY_RULES.trauma.rules).toContain('stabiliz');
  });

  it('grief_loss rules say do not rush to fix', () => {
    const rules = THERAPIST_CLINICAL_SENSITIVITY_RULES.grief_loss.rules;
    expect(rules.toLowerCase()).toContain('rush');
  });

  it('eating_body_image rules contain warning about not reinforcing harmful ideals', () => {
    const rules = THERAPIST_CLINICAL_SENSITIVITY_RULES.eating_body_image.rules;
    expect(rules.toUpperCase()).toContain('NOT');
  });

  it('buildWorkflowContextInstructions includes CLINICAL SENSITIVITY RULES section', () => {
    const output = buildWorkflowContextInstructions();
    expect(output).toContain('CLINICAL SENSITIVITY RULES');
  });

  it('buildWorkflowContextInstructions includes religious OCD / scrupulosity domain', () => {
    const output = buildWorkflowContextInstructions();
    expect(output).toContain('Religious OCD');
  });

  it('buildWorkflowContextInstructions includes teen cases domain', () => {
    const output = buildWorkflowContextInstructions();
    expect(output).toContain('Teen');
  });
});

// ─── Section E — THERAPIST_CROSS_LANGUAGE_RULES ──────────────────────────────

describe('Therapist Constitution — Section E: THERAPIST_CROSS_LANGUAGE_RULES', () => {
  it('is exported as a frozen array', () => {
    expect(Array.isArray(THERAPIST_CROSS_LANGUAGE_RULES)).toBe(true);
    expect(Object.isFrozen(THERAPIST_CROSS_LANGUAGE_RULES)).toBe(true);
  });

  it('has at least 5 rules', () => {
    expect(THERAPIST_CROSS_LANGUAGE_RULES.length).toBeGreaterThanOrEqual(5);
  });

  it('each rule is a non-empty string', () => {
    for (const rule of THERAPIST_CROSS_LANGUAGE_RULES) {
      expect(typeof rule).toBe('string');
      expect(rule.length).toBeGreaterThan(0);
    }
  });

  it('includes a rule about language parity / equivalent quality', () => {
    const hasParityRule = THERAPIST_CROSS_LANGUAGE_RULES.some(
      (r) =>
        r.toLowerCase().includes('equivalent') ||
        r.toLowerCase().includes('equal') ||
        r.toLowerCase().includes('parity'),
    );
    expect(hasParityRule).toBe(true);
  });

  it('includes a rule about mid-session language switch', () => {
    const hasSwitchRule = THERAPIST_CROSS_LANGUAGE_RULES.some(
      (r) =>
        r.toLowerCase().includes('switch') ||
        r.toLowerCase().includes('language change') ||
        r.toLowerCase().includes('changes language'),
    );
    expect(hasSwitchRule).toBe(true);
  });

  it('includes a rule preventing refusal based on language alone', () => {
    const hasRefusalRule = THERAPIST_CROSS_LANGUAGE_RULES.some(
      (r) =>
        r.toLowerCase().includes('refusal') ||
        r.toLowerCase().includes('refused') ||
        r.toLowerCase().includes('refused in one') ||
        r.toLowerCase().includes('not be refused'),
    );
    expect(hasRefusalRule).toBe(true);
  });

  it('buildWorkflowContextInstructions includes CROSS-LANGUAGE CONSISTENCY section', () => {
    const output = buildWorkflowContextInstructions();
    expect(output).toContain('CROSS-LANGUAGE CONSISTENCY');
  });
});

// ─── Section F — cbt_therapist.jsonc agent instruction content ────────────────

describe('Therapist Constitution — Section F: cbt_therapist.jsonc agent instruction content', () => {
  it('cbt_therapist.jsonc is parseable and has non-empty instructions', () => {
    expect(agentInstructions.length).toBeGreaterThan(1000);
  });

  // Scenario 1: Greeting + politeness (CP1 joining exception)
  it('Scenario 1 (greeting + politeness): JOINING EXCEPTION is present in CP1', () => {
    expect(agentInstructions).toContain('JOINING EXCEPTION');
  });

  it('Scenario 1 (greeting + politeness): joining exception covers first/second response', () => {
    expect(agentInstructions).toContain('first or second response');
  });

  // Scenario 2: "What can you help with?"
  it('Scenario 2 (what can you help with): THERAPIST CONSTITUTION section is present', () => {
    expect(agentInstructions).toContain('THERAPIST CONSTITUTION');
  });

  // Scenario 3: First-session framing
  it('Scenario 3 (first-session framing): FIRST-SESSION OPERATING MODEL section is present', () => {
    expect(agentInstructions).toContain('FIRST-SESSION OPERATING MODEL');
  });

  it('Scenario 3 (first-session framing): includes brief CBT framing step', () => {
    expect(agentInstructions).toContain('BRIEF CBT FRAMING');
  });

  it('Scenario 3 (first-session framing): includes rapport and emotional safety step', () => {
    expect(agentInstructions).toContain('RAPPORT AND EMOTIONAL SAFETY');
  });

  // Scenario 4: Structured 45-minute session
  it('Scenario 4 (structured session): HIERARCHY OF INTERVENTION PRIORITY is present', () => {
    expect(agentInstructions).toContain('HIERARCHY OF INTERVENTION PRIORITY');
  });

  // Scenario 5: Anxiety case
  it('Scenario 5 (anxiety): HIERARCHY has grounding/emotional regulation level', () => {
    expect(agentInstructions).toContain('EMOTIONAL REGULATION');
  });

  // Scenario 6: Depression / low self-worth
  it('Scenario 6 (depression): CONSTITUTION warmth principle is present', () => {
    expect(agentInstructions).toContain('humanly containing');
  });

  // Scenario 7: OCD case
  it('Scenario 7 (OCD): CLINICAL SENSITIVITY RULES covers OCD', () => {
    expect(agentInstructions).toContain('OCD AND COMPULSIVE RITUALS');
  });

  it('Scenario 7 (OCD): OCD rules mention not challenging intrusive thought content', () => {
    expect(agentInstructions.toLowerCase()).toContain('relationship to the thought');
  });

  // Scenario 8: Religious OCD / scrupulosity
  it('Scenario 8 (religious OCD): CLINICAL SENSITIVITY RULES covers religious OCD', () => {
    expect(agentInstructions).toContain('RELIGIOUS OCD');
  });

  it('Scenario 8 (religious OCD): rules explicitly say not to argue with religious content', () => {
    expect(agentInstructions).toContain('Do NOT argue with religious content');
  });

  // Scenario 9: Trauma-related case
  it('Scenario 9 (trauma): CLINICAL SENSITIVITY RULES covers trauma', () => {
    expect(agentInstructions).toContain('TRAUMA-RELATED DISTRESS');
  });

  it('Scenario 9 (trauma): trauma rules mention not forcing exposure early', () => {
    expect(agentInstructions).toContain('Do NOT force exposure');
  });

  // Scenario 10: Grief/loss case
  it('Scenario 10 (grief/loss): CLINICAL SENSITIVITY RULES covers grief', () => {
    expect(agentInstructions).toContain('GRIEF, LOSS');
  });

  it('Scenario 10 (grief/loss): grief rules say do not rush to fix the pain', () => {
    expect(agentInstructions).toContain('Do NOT rush to fix');
  });

  // Scenario 11: ADHD / organization case
  it('Scenario 11 (ADHD): CLINICAL SENSITIVITY RULES covers ADHD', () => {
    expect(agentInstructions).toContain('ADHD');
  });

  it('Scenario 11 (ADHD): ADHD rules mention micro-step ladders', () => {
    expect(agentInstructions).toContain('micro-step');
  });

  // Scenario 12: Sleep/insomnia case
  it('Scenario 12 (sleep/insomnia): CLINICAL SENSITIVITY RULES covers insomnia', () => {
    expect(agentInstructions).toContain('INSOMNIA');
  });

  it('Scenario 12 (sleep/insomnia): insomnia rules mention not catastrophizing', () => {
    expect(agentInstructions).toContain('NOT catastrophize');
  });

  // Scenario 13: Teen case
  it('Scenario 13 (teen): CLINICAL SENSITIVITY RULES covers teen cases', () => {
    expect(agentInstructions).toContain('TEEN CASES');
  });

  it('Scenario 13 (teen): teen rules mention trust-building before structure', () => {
    expect(agentInstructions).toContain('trust-building');
  });

  // Scenario 14: Cross-language consistency
  it('Scenario 14 (cross-language): CROSS-LANGUAGE CONSISTENCY RULES section is present', () => {
    expect(agentInstructions).toContain('CROSS-LANGUAGE CONSISTENCY RULES');
  });

  it('Scenario 14 (cross-language): rules prevent colder behavior in any language', () => {
    expect(agentInstructions).toContain('colder');
  });

  // Scenario 15: Mid-session language switch
  it('Scenario 15 (language switch): mid-session language switch rule is present', () => {
    expect(agentInstructions).toContain('Mid-session language switch');
  });

  // Scenario 16: Alliance preservation before intervention
  it('Scenario 16 (alliance): JOINING EXCEPTION prevents cold redirect on first turn', () => {
    const joiningIdx = agentInstructions.indexOf('JOINING EXCEPTION');
    expect(joiningIdx).toBeGreaterThan(-1);
    // Joining exception should reference warm acknowledgment
    const snippet = agentInstructions.substring(joiningIdx, joiningIdx + 400);
    expect(snippet.toLowerCase()).toMatch(/warm|contain|acknowledg/);
  });

  // Scenario 17: One-step default after understanding
  it('Scenario 17 (one step): constitution mentions defaulting to one clear next step', () => {
    expect(agentInstructions).toContain('one clear next step');
  });

  it('Scenario 17 (one step): first-session model ends with one realistic first task', () => {
    expect(agentInstructions).toContain('ONE REALISTIC FIRST TASK');
  });
});

// ─── Section G — Behavioral hard-failure prevention ──────────────────────────

describe('Therapist Constitution — Section G: Hard-failure prevention', () => {
  it('JOINING EXCEPTION prevents cold redirect on first turn (forward-looking check)', () => {
    // The joining exception allows ending with a warm open invitation instead
    // of a concrete action on the first turn when the user opens with a greeting
    expect(agentInstructions).toContain('JOINING EXCEPTION');
    expect(agentInstructions).toContain('warm open invitation');
  });

  it('CONSTITUTION principle 5 explicitly prevents becoming a workflow engine', () => {
    const found = THERAPIST_CONSTITUTION.find(
      (p) => p.id === 'not_a_workflow_engine',
    );
    expect(found).toBeDefined();
    expect(found.description.toLowerCase()).toContain('structure serves the person');
  });

  it('FIRST_SESSION_FLOW step 7 prevents premature homework lists (one task only)', () => {
    const step7 = THERAPIST_FIRST_SESSION_FLOW.find((s) => s.step === 7);
    expect(step7).toBeDefined();
    expect(step7.description.toLowerCase()).toContain('one');
    // Must explicitly state one action is more effective — therapeutic framing
    expect(step7.description.toLowerCase()).toContain('therapeutic');
  });

  it('CONSTITUTION principle brief_joining_before_guiding prevents robotic correction', () => {
    const found = THERAPIST_CONSTITUTION.find(
      (p) => p.id === 'brief_joining_before_guiding',
    );
    expect(found).toBeDefined();
    expect(found.description.toLowerCase()).toContain('robotically');
  });

  it('CLINICAL SENSITIVITY safeguard E handles multi-domain presentation', () => {
    // Clinical sensitivity section should mention handling multiple domains
    expect(agentInstructions).toContain('multiple domains');
  });

  it('THERAPIST CONSTITUTION prevents template dumping — mentions case connection', () => {
    // "not_a_workflow_engine" principle explicitly states structure serves the person
    const principle = THERAPIST_CONSTITUTION.find(
      (p) => p.id === 'not_a_workflow_engine',
    );
    expect(principle.description.toLowerCase()).toContain('person');
  });
});

// ─── Section H — Scenario coverage in injected instructions ──────────────────

describe('Therapist Constitution — Section H: Injected instruction scenario coverage', () => {
  // All scenarios via buildWorkflowContextInstructions()
  const injected = buildWorkflowContextInstructions();

  // Scenario 1: Greeting + politeness exchange
  it('Scenario 1: injected instructions include early turn behavior for greetings', () => {
    expect(injected).toContain('EARLY TURN BEHAVIOR');
    expect(injected).toContain('reflect_what_is_already_known');
  });

  // Scenario 2: "What can you help with?"
  it('Scenario 2: injected instructions include no_intake_menu rule (category menu)', () => {
    expect(injected).toContain('category menu');
  });

  // Scenario 3: First-session framing
  it('Scenario 3: injected instructions include FIRST-SESSION OPERATING MODEL', () => {
    expect(injected).toContain('FIRST-SESSION OPERATING MODEL');
  });

  // Scenario 4: Structured 45-minute session
  it('Scenario 4: injected instructions include FIXED RESPONSE SEQUENCE (6 steps)', () => {
    expect(injected).toContain('FIXED RESPONSE SEQUENCE');
    expect(injected).toContain('brief_validation');
    expect(injected).toContain('concrete_next_step');
  });

  // Scenario 5: Anxiety case
  it('Scenario 5: injected instructions include clinical sensitivity rules', () => {
    expect(injected).toContain('CLINICAL SENSITIVITY RULES');
  });

  // Scenario 6: Depression / low self-worth
  it('Scenario 6: injected constitution includes warmth and containing principle', () => {
    expect(injected).toContain('containing_before_clinical');
  });

  // Scenario 7: OCD case
  it('Scenario 7: injected instructions include OCD compulsive domain', () => {
    expect(injected).toContain('OCD and compulsive rituals');
  });

  // Scenario 8: Religious OCD
  it('Scenario 8: injected instructions include religious OCD domain', () => {
    expect(injected).toContain('Religious OCD');
  });

  // Scenario 9: Trauma case
  it('Scenario 9: injected instructions include trauma domain', () => {
    expect(injected).toContain('Trauma-related distress');
  });

  // Scenario 10: Grief/loss case
  it('Scenario 10: injected instructions include grief/loss domain', () => {
    expect(injected).toContain('Grief, loss');
  });

  // Scenario 11: ADHD / organization
  it('Scenario 11: injected instructions include ADHD domain', () => {
    expect(injected).toContain('ADHD');
  });

  // Scenario 12: Sleep/insomnia
  it('Scenario 12: injected instructions include insomnia domain', () => {
    expect(injected).toContain('Insomnia');
  });

  // Scenario 13: Teen case
  it('Scenario 13: injected instructions include teen cases domain', () => {
    expect(injected).toContain('Teen cases');
  });

  // Scenario 14: Cross-language consistency
  it('Scenario 14: injected instructions include cross-language section', () => {
    expect(injected).toContain('CROSS-LANGUAGE CONSISTENCY');
  });

  // Scenario 15: Mid-session language switch
  it('Scenario 15: injected cross-language rules include language switch', () => {
    const hasSwitchRule = THERAPIST_CROSS_LANGUAGE_RULES.some(
      (r) => r.toLowerCase().includes('switch'),
    );
    expect(hasSwitchRule).toBe(true);
  });

  // Scenario 16: Alliance preservation before intervention
  it('Scenario 16: injected constitution includes brief_joining_before_guiding', () => {
    expect(injected).toContain('brief_joining_before_guiding');
  });

  // Scenario 17: One-step default after understanding
  it('Scenario 17: injected 6-step sequence ends with concrete_next_step', () => {
    expect(injected).toContain('concrete_next_step');
  });

  it('Scenario 17: understand_before_intervening principle included in injected constitution', () => {
    expect(injected).toContain('understand_before_intervening');
  });

  // Additional: version header in injected instructions
  it('injected instructions carry Phase 3.3 header', () => {
    expect(injected).toContain('3.3');
  });

  // Additional: injected instructions still contain prior phase components
  it('prior phase: RESPONSE-SHAPING RULES still present in injected instructions', () => {
    expect(injected).toContain('RESPONSE-SHAPING RULES');
  });

  it('prior phase: EMOTION DIFFERENTIATION still present in injected instructions', () => {
    expect(injected).toContain('EMOTION DIFFERENTIATION');
  });

  it('prior phase: THERAPIST_WORKFLOW_INSTRUCTIONS contains constitution block', () => {
    expect(THERAPIST_WORKFLOW_INSTRUCTIONS).toContain('THERAPIST CONSTITUTION (IDENTITY LAYER)');
  });
});

// ─── Section I — Additive-only regression guard ───────────────────────────────

describe('Therapist Constitution — Section I: Additive-only regression guard', () => {
  it('THERAPIST_WORKFLOW_SEQUENCE still has 6 steps', async () => {
    // Import and check the sequence still has 6 steps (existing contract)
    const { THERAPIST_WORKFLOW_SEQUENCE } = await import('../../src/lib/therapistWorkflowEngine.js');
    expect(THERAPIST_WORKFLOW_SEQUENCE.length).toBe(6);
  });

  it('THERAPIST_EARLY_TURN_SEQUENCE still has 3 turns', () => {
    expect(THERAPIST_EARLY_TURN_SEQUENCE.length).toBe(3);
  });

  it('THERAPIST_WORKFLOW_RESPONSE_RULES still has all prior rules', () => {
    const priorRules = [
      'reduce_open_ended_questions',
      'summarize_over_explore',
      'name_the_pattern',
      'move_to_structure_early',
      'end_with_something_usable',
      'slow_down_for_extreme_language',
      'safety_stack_compatibility',
      'socratic_insight_guidance',
      'avoid_repetitive_questioning',
      'formulation_aligned_intervention',
      'no_redundant_questioning',
      'formulate_before_questioning',
      'one_targeted_question',
      'no_intake_menu',
    ];
    for (const rule of priorRules) {
      expect(THERAPIST_WORKFLOW_RESPONSE_RULES).toHaveProperty(rule);
    }
  });

  it('injected instructions still contain ADAPTIVE RESPONSE FRAMEWORK section', () => {
    const output = buildWorkflowContextInstructions();
    expect(output).toContain('ADAPTIVE RESPONSE FRAMEWORK');
  });

  it('injected instructions still contain FORMULATION-LED CBT section when called via THERAPIST_FORMULATION_INSTRUCTIONS', async () => {
    const { THERAPIST_FORMULATION_INSTRUCTIONS } = await import('../../src/lib/therapistWorkflowEngine.js');
    expect(THERAPIST_FORMULATION_INSTRUCTIONS).toContain('FORMULATION-LED CBT');
  });});
