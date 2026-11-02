/**
 * @file test/utils/therapistPacingRefinementPhase2.test.js
 *
 * Phase 2 Therapist Refinement — Pacing, Containment, and Case Sensitivity
 *
 * PURPOSE
 * -------
 * Verifies the second-layer therapist refinement system that deepens pacing,
 * containment, case sensitivity, and alliance quality in the hardest clinical
 * interaction types.
 *
 * REQUIRED SCENARIO COVERAGE (12 scenarios per problem statement):
 *
 * SECTION A — VERSION
 *   1.  THERAPIST_WORKFLOW_VERSION bumped to 3.3.0
 *
 * SECTION B — PACING REFINEMENT RULES EXPORT
 *   2.  THERAPIST_PACING_REFINEMENT_RULES is exported and well-formed (6 rules)
 *   3.  All 6 rule IDs are present (R1–R6)
 *   4.  Each rule has id, label, and description fields
 *
 * SECTION C — PACING LADDER (R1)
 *   5.  R1 (pacing_ladder) rule is present and describes the 5-step sequence
 *   6.  R1 prohibits collapsing steps 1–4 to arrive at step 5 faster
 *   7.  R1 references emotional holding before next step
 *
 * SECTION D — TEEN AND SHAME PACING (R2)
 *   8.  R2 (teen_shame_pacing) rule is present
 *   9.  R2 requires a bridging question before any behavioral task
 *   10. R2 prohibits micro-step on same turn as first shame disclosure
 *   11. R2 reduces performance framing and increases normalizing language
 *   12. R2 requires conversational register (not clinical report)
 *
 * SECTION E — SCRUPULOSITY PACING (R3)
 *   13. R3 (scrupulosity_pacing) rule is present
 *   14. R3 defines a 4-step sequence before any behavioral suggestion
 *   15. R3 requires the cycle to be made explicit (doubt → urgency → ritual → relief → doubt)
 *   16. R3 requires naming functional cost before any suggestion
 *   17. R3 prohibits moving directly from step 1 to a suggestion
 *   18. R3 prohibits sounding eager to fix the cycle before the person feels seen
 *
 * SECTION F — GRIEF CONTAINMENT (R4)
 *   19. R4 (grief_containment) rule is present
 *   20. R4 defines a 3-phase containment sequence (presence → impact/meaning → coping)
 *   21. R4 prohibits silver linings in first two responses to grief disclosure
 *   22. R4 prohibits future-oriented language before Phase 2
 *   23. R4 prohibits over-structuring grief with CBT framework in first session
 *
 * SECTION G — NO FIRST-DISCLOSURE INTERVENTION (R5)
 *   24. R5 (no_first_disclosure_intervention) rule is present
 *   25. R5 defines the correct first-disclosure sequence: acknowledge → hold → clarify → formulate
 *   26. R5 explicitly prohibits assigning a behavioral task on first-disclosure turn
 *   27. R5 explicitly prohibits naming a technique on first-disclosure turn
 *   28. R5 explicitly prohibits offering a micro-step on first-disclosure turn
 *   29. R5 allows exception when person explicitly requests a technique
 *
 * SECTION H — POST-LANGUAGE-SWITCH CONTINUITY (R6)
 *   30. R6 (post_language_switch_continuity) rule is present
 *   31. R6 requires same warmth and pacing in the new language after switch
 *   32. R6 prohibits becoming more mechanical after switch
 *   33. R6 prohibits collapsing into "next step is..." mode after switch
 *   34. R6 states that clinical identity is language-independent
 *
 * SECTION I — BUILDPACINGREFINEMENTINSTRUCTIONS / EXPORTED STRING
 *   35. buildPacingRefinementInstructions() is exported and callable
 *   36. THERAPIST_PACING_REFINEMENT_INSTRUCTIONS is a non-empty string
 *   37. Instructions include all 6 refinement rule labels
 *   38. Instructions include "PHASE 2 REFINEMENT" header
 *   39. Instructions include "PRESERVED GAINS REMINDER" section
 *   40. Instructions include warmth preservation statement
 *
 * SECTION J — BUILDWORKFLOWCONTEXTINSTRUCTIONS INTEGRATION
 *   41. buildWorkflowContextInstructions() includes Phase 2 refinement section
 *   42. THERAPIST_WORKFLOW_INSTRUCTIONS includes pacing_ladder rule
 *   43. THERAPIST_WORKFLOW_INSTRUCTIONS includes teen_shame_pacing rule
 *   44. THERAPIST_WORKFLOW_INSTRUCTIONS includes scrupulosity_pacing rule
 *   45. THERAPIST_WORKFLOW_INSTRUCTIONS includes grief_containment rule
 *   46. THERAPIST_WORKFLOW_INSTRUCTIONS includes no_first_disclosure_intervention rule
 *   47. THERAPIST_WORKFLOW_INSTRUCTIONS includes post_language_switch_continuity rule
 *
 * SECTION K — CBT_THERAPIST AGENT INSTRUCTION CONTENT
 *   48. cbt_therapist.jsonc contains "PHASE 2 REFINEMENT" section
 *   49. cbt_therapist.jsonc contains R1 pacing ladder five-step sequence
 *   50. cbt_therapist.jsonc contains R2 bridging question rule
 *   51. cbt_therapist.jsonc contains R3 scrupulosity four-step sequence
 *   52. cbt_therapist.jsonc contains R4 grief Phase 1/2/3 structure
 *   53. cbt_therapist.jsonc contains R5 first-disclosure prohibition text
 *   54. cbt_therapist.jsonc contains R6 language-switch continuity text
 *
 * SECTION L — SCENARIO COVERAGE IN CONSTITUTION (PRESERVED GAINS)
 *   55. Therapist constitution warmth principles still present (7 principles)
 *   56. THERAPIST_FIRST_SESSION_FLOW still has 7 steps (no regression)
 *   57. Clinical sensitivity rules still cover all 9 existing domains (no regression)
 *   58. Cross-language consistency rules still present (no regression)
 *   59. THERAPIST_FORMULATION_INSTRUCTIONS still present (no regression)
 *
 * SECTION M — HARD FAILURE PREVENTION
 *   60. R1 prevents collapse of acknowledgment into a single sentence before step 5
 *   61. R2 prevents direct assignment of homework on teen shame first turn
 *   62. R3 prevents direct jump from suffering acknowledgment to behavioral suggestion
 *   63. R4 prevents silver linings and future framing in first grief response
 *   64. R5 prevents technique naming on first-disclosure turn
 *   65. R6 prevents mechanical/cold behavior after language switch
 *
 * SECTION N — SCENARIO: TEEN SOCIAL SHAME CASE
 *   66. Teen shame scenario: R2 bridging-before-task instruction present in injected workflow
 *   67. Teen shame scenario: No direct performance framing in R2
 *
 * SECTION O — SCENARIO: OCD WITH CHECKING
 *   68. OCD checking scenario: existing ocd_compulsive sensitivity rule present (no regression)
 *   69. OCD checking scenario: R1 pacing ladder applies (emotional holding before next step)
 *
 * SECTION P — SCENARIO: SCRUPULOSITY / RELIGIOUS OCD
 *   70. Religious OCD scenario: R3 cycle must be explicit before suggestion
 *   71. Religious OCD scenario: R3 prohibits belief content engagement
 *
 * SECTION Q — SCENARIO: GRIEF / LOSS
 *   72. Grief scenario: R4 presence-before-meaning-before-coping sequence
 *   73. Grief scenario: No over-structuring prohibition
 *
 * SECTION R — SCENARIO: ACUTE FIRST DISCLOSURE
 *   74. First disclosure scenario: R5 prohibits technique on first turn
 *   75. First disclosure scenario: R5 sequence is acknowledge → hold → formulate
 *
 * SECTION S — SCENARIO: ADHD OVERWHELM
 *   76. ADHD scenario: existing adhd_organization sensitivity rule present (no regression)
 *   77. ADHD scenario: R1 pacing ladder requires holding before next step
 *
 * SECTION T — SCENARIO: LANGUAGE SWITCH WITH PARITY
 *   78. Multi-language scenario: R6 states clinical identity is language-independent
 *   79. Multi-language scenario: THERAPIST_CROSS_LANGUAGE_RULES parity rules present (no regression)
 *
 * SECTION U — SCENARIO: NO PREMATURE HOMEWORK
 *   80. Premature homework scenario: R5 prohibition on behavioral task assignment is explicit
 *   81. Premature homework scenario: R2 requires bridging question before task in sensitive cases
 *
 * SECTION V — SCENARIO: FIRST SESSION WARMTH
 *   82. First session scenario: first-session model preserved with warmth and 7-step flow
 *
 * CONSTRAINTS
 * -----------
 * - Does NOT import from base44/functions/ (Deno code — not importable in Vitest)
 * - Does NOT modify any existing test files
 * - All existing assertions in prior phase tests must still pass
 * - Does NOT enable any feature flags
 *
 * Source of truth: Phase 2 therapist refinement architecture task
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

import {
  THERAPIST_WORKFLOW_VERSION,
  THERAPIST_PACING_REFINEMENT_RULES,
  THERAPIST_PACING_REFINEMENT_INSTRUCTIONS,
  buildPacingRefinementInstructions,
  buildWorkflowContextInstructions,
  THERAPIST_WORKFLOW_INSTRUCTIONS,
  THERAPIST_CONSTITUTION,
  THERAPIST_FIRST_SESSION_FLOW,
  THERAPIST_CLINICAL_SENSITIVITY_RULES,
  THERAPIST_CROSS_LANGUAGE_RULES,
  THERAPIST_FORMULATION_INSTRUCTIONS,
} from '../../src/lib/therapistWorkflowEngine.js';

const REPO_ROOT = join(new URL(import.meta.url).pathname, '..', '..', '..');
const CBT_AGENT_PATH = join(REPO_ROOT, 'base44', 'agents', 'cbt_therapist.jsonc');

function readAgentInstructions() {
  const raw = readFileSync(CBT_AGENT_PATH, 'utf-8');
  const cleaned = raw.replace(/\/\/.*$/gm, '');
  return JSON.parse(cleaned).instructions;
}

// ─── Section A — Version ──────────────────────────────────────────────────────

describe('Phase 2 Refinement — Section A: Version', () => {
  it('THERAPIST_WORKFLOW_VERSION is "3.7.0"', () => {
    expect(THERAPIST_WORKFLOW_VERSION).toBe('3.7.0');
  });
});

// ─── Section B — THERAPIST_PACING_REFINEMENT_RULES export ────────────────────

describe('Phase 2 Refinement — Section B: THERAPIST_PACING_REFINEMENT_RULES export', () => {
  it('is exported and is a frozen object', () => {
    expect(THERAPIST_PACING_REFINEMENT_RULES).toBeDefined();
    expect(typeof THERAPIST_PACING_REFINEMENT_RULES).toBe('object');
    expect(Object.isFrozen(THERAPIST_PACING_REFINEMENT_RULES)).toBe(true);
  });

  it('has exactly 6 rules', () => {
    expect(Object.keys(THERAPIST_PACING_REFINEMENT_RULES)).toHaveLength(6);
  });

  it('all 6 rule keys are present', () => {
    const keys = Object.keys(THERAPIST_PACING_REFINEMENT_RULES);
    expect(keys).toContain('pacing_ladder');
    expect(keys).toContain('teen_shame_pacing');
    expect(keys).toContain('scrupulosity_pacing');
    expect(keys).toContain('grief_containment');
    expect(keys).toContain('no_first_disclosure_intervention');
    expect(keys).toContain('post_language_switch_continuity');
  });

  it('each rule has id, label, and description fields', () => {
    for (const [key, rule] of Object.entries(THERAPIST_PACING_REFINEMENT_RULES)) {
      expect(rule.id, `rule ${key} missing id`).toBeDefined();
      expect(rule.label, `rule ${key} missing label`).toBeDefined();
      expect(rule.description, `rule ${key} missing description`).toBeDefined();
      expect(typeof rule.id).toBe('string');
      expect(typeof rule.label).toBe('string');
      expect(typeof rule.description).toBe('string');
      expect(rule.description.length).toBeGreaterThan(50);
    }
  });
});

// ─── Section C — Pacing Ladder (R1) ─────────────────────────────────────────

describe('Phase 2 Refinement — Section C: R1 Pacing Ladder', () => {
  const r1 = THERAPIST_PACING_REFINEMENT_RULES.pacing_ladder;

  it('pacing_ladder rule has id "pacing_ladder"', () => {
    expect(r1.id).toBe('pacing_ladder');
  });

  it('pacing_ladder describes a five-step sequence', () => {
    expect(r1.description).toMatch(/\(1\)|\bstep 1\b/i);
    expect(r1.description).toMatch(/\(2\)|\bstep 2\b/i);
    expect(r1.description).toMatch(/\(3\)|\bstep 3\b/i);
    expect(r1.description).toMatch(/\(4\)|\bstep 4\b/i);
    expect(r1.description).toMatch(/\(5\)|\bstep 5\b/i);
  });

  it('pacing_ladder includes acknowledgment step', () => {
    expect(r1.description.toLowerCase()).toMatch(/acknowledgment|acknowledge/);
  });

  it('pacing_ladder includes emotional holding step', () => {
    expect(r1.description.toLowerCase()).toMatch(/emotional holding/);
  });

  it('pacing_ladder prohibits collapsing steps to arrive at next step faster', () => {
    expect(r1.description.toLowerCase()).toMatch(/collapse|compress|skip/);
  });

  it('pacing_ladder states the person must feel held before a next step', () => {
    expect(r1.description.toLowerCase()).toMatch(/held|held.*before|before.*step 5/);
  });
});

// ─── Section D — Teen and Shame Pacing (R2) ──────────────────────────────────

describe('Phase 2 Refinement — Section D: R2 Teen and Shame Pacing', () => {
  const r2 = THERAPIST_PACING_REFINEMENT_RULES.teen_shame_pacing;

  it('teen_shame_pacing rule has id "teen_shame_pacing"', () => {
    expect(r2.id).toBe('teen_shame_pacing');
  });

  it('R2 requires a bridging question before any behavioral task', () => {
    expect(r2.description.toLowerCase()).toMatch(/bridging question|bridge.*question/);
  });

  it('R2 prohibits micro-step on same turn as first shame disclosure', () => {
    expect(r2.description.toLowerCase()).toMatch(/micro.?step|first.*disclosure|same.*turn/);
  });

  it('R2 reduces performance framing', () => {
    expect(r2.description.toLowerCase()).toMatch(/performance.*framing|performance framing/);
  });

  it('R2 increases normalizing language', () => {
    expect(r2.description.toLowerCase()).toMatch(/normaliz/);
  });

  it('R2 requires conversational register, not clinical report', () => {
    expect(r2.description.toLowerCase()).toMatch(/clinical report|person speaking to another/);
  });
});

// ─── Section E — Scrupulosity Pacing (R3) ────────────────────────────────────

describe('Phase 2 Refinement — Section E: R3 Scrupulosity Pacing', () => {
  const r3 = THERAPIST_PACING_REFINEMENT_RULES.scrupulosity_pacing;

  it('scrupulosity_pacing rule has id "scrupulosity_pacing"', () => {
    expect(r3.id).toBe('scrupulosity_pacing');
  });

  it('R3 defines a 4-step sequence', () => {
    expect(r3.description).toMatch(/\(1\)|\bstep 1\b/i);
    expect(r3.description).toMatch(/\(2\)|\bstep 2\b/i);
    expect(r3.description).toMatch(/\(3\)|\bstep 3\b/i);
    expect(r3.description).toMatch(/\(4\)|\bstep 4\b/i);
  });
  it('R3 requires making the cycle explicit', () => {
    expect(r3.description.toLowerCase()).toMatch(/cycle.*explicit|explicit.*cycle/);
  });

  it('R3 includes the doubt→urgency→ritual→relief→doubt cycle pattern', () => {
    expect(r3.description.toLowerCase()).toMatch(/doubt|ritual|checking/);
    expect(r3.description.toLowerCase()).toMatch(/relief/);
  });

  it('R3 requires naming functional cost', () => {
    expect(r3.description.toLowerCase()).toMatch(/functional cost|toll/);
  });

  it('R3 prohibits moving directly from step 1 to a suggestion', () => {
    expect(r3.description.toLowerCase()).toMatch(/not.*move.*step 1.*directly|do not.*move.*directly/i);
  });

  it('R3 prohibits sounding eager to fix the cycle before person feels seen', () => {
    expect(r3.description.toLowerCase()).toMatch(/eager.*fix|feel.*seen/);
  });
});

// ─── Section F — Grief Containment (R4) ──────────────────────────────────────

describe('Phase 2 Refinement — Section F: R4 Grief Containment', () => {
  const r4 = THERAPIST_PACING_REFINEMENT_RULES.grief_containment;

  it('grief_containment rule has id "grief_containment"', () => {
    expect(r4.id).toBe('grief_containment');
  });

  it('R4 defines Phase 1 (Presence)', () => {
    expect(r4.description.toLowerCase()).toMatch(/phase 1|presence/);
  });

  it('R4 defines Phase 2 (Impact and meaning)', () => {
    expect(r4.description.toLowerCase()).toMatch(/phase 2|impact.*meaning/);
  });

  it('R4 defines Phase 3 (Coping support)', () => {
    expect(r4.description.toLowerCase()).toMatch(/phase 3|coping support/);
  });

  it('R4 prohibits silver linings in first two responses', () => {
    expect(r4.description.toLowerCase()).toMatch(/silver lining/);
  });

  it('R4 prohibits future-oriented language before Phase 2', () => {
    expect(r4.description.toLowerCase()).toMatch(/future.oriented/);
  });

  it('R4 prohibits over-structuring grief with CBT framework in first session', () => {
    expect(r4.description.toLowerCase()).toMatch(/over.structur|cbt framework.*first session/);
  });
});

// ─── Section G — No First-Disclosure Intervention (R5) ───────────────────────

describe('Phase 2 Refinement — Section G: R5 No First-Disclosure Intervention', () => {
  const r5 = THERAPIST_PACING_REFINEMENT_RULES.no_first_disclosure_intervention;

  it('no_first_disclosure_intervention rule has id "no_first_disclosure_intervention"', () => {
    expect(r5.id).toBe('no_first_disclosure_intervention');
  });

  it('R5 defines the correct first-disclosure sequence', () => {
    expect(r5.description.toLowerCase()).toMatch(/acknowledge.*hold|hold.*formulate/);
  });

  it('R5 explicitly prohibits assigning a behavioral task on first-disclosure turn', () => {
    expect(r5.description.toLowerCase()).toMatch(/behavioral task/);
  });

  it('R5 explicitly prohibits naming a specific technique', () => {
    expect(r5.description.toLowerCase()).toMatch(/specific technique|naming.*technique/);
  });

  it('R5 explicitly prohibits offering a micro-step', () => {
    expect(r5.description.toLowerCase()).toMatch(/micro.?step/);
  });

  it('R5 prohibits converting pain into homework', () => {
    expect(r5.description.toLowerCase()).toMatch(/homework/);
  });

  it('R5 allows exception when person explicitly requests a technique', () => {
    expect(r5.description.toLowerCase()).toMatch(/exception|explicitly asks/);
  });
});

// ─── Section H — Post-Language-Switch Continuity (R6) ────────────────────────

describe('Phase 2 Refinement — Section H: R6 Post-Language-Switch Continuity', () => {
  const r6 = THERAPIST_PACING_REFINEMENT_RULES.post_language_switch_continuity;

  it('post_language_switch_continuity rule has id "post_language_switch_continuity"', () => {
    expect(r6.id).toBe('post_language_switch_continuity');
  });

  it('R6 requires same warmth and pacing in the new language', () => {
    expect(r6.description.toLowerCase()).toMatch(/same warmth|warmth.*pacing|same.*pacing/);
  });

  it('R6 prohibits becoming more mechanical after switch', () => {
    expect(r6.description.toLowerCase()).toMatch(/mechanical/);
  });

  it('R6 prohibits collapsing into "next step is..." framing', () => {
    expect(r6.description.toLowerCase()).toMatch(/next step is|collapse.*next step/);
  });

  it('R6 states that clinical identity is language-independent', () => {
    expect(r6.description.toLowerCase()).toMatch(/language.independent|same person.*same warmth/);
  });

  it('R6 prohibits treating the switch as a session restart', () => {
    expect(r6.description.toLowerCase()).toMatch(/session restart|re.do.*opening/);
  });
});

// ─── Section I — buildPacingRefinementInstructions / exported string ──────────

describe('Phase 2 Refinement — Section I: buildPacingRefinementInstructions', () => {
  it('buildPacingRefinementInstructions is exported and callable', () => {
    expect(typeof buildPacingRefinementInstructions).toBe('function');
    const result = buildPacingRefinementInstructions();
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(100);
  });

  it('THERAPIST_PACING_REFINEMENT_INSTRUCTIONS is a non-empty string', () => {
    expect(typeof THERAPIST_PACING_REFINEMENT_INSTRUCTIONS).toBe('string');
    expect(THERAPIST_PACING_REFINEMENT_INSTRUCTIONS.length).toBeGreaterThan(100);
  });

  it('instructions include "PHASE 2 REFINEMENT" header', () => {
    expect(THERAPIST_PACING_REFINEMENT_INSTRUCTIONS).toMatch(/PHASE 2 REFINEMENT/);
  });

  it('instructions include "PRESERVED GAINS REMINDER" section', () => {
    expect(THERAPIST_PACING_REFINEMENT_INSTRUCTIONS).toMatch(/PRESERVED GAINS/);
  });

  it('instructions include all 6 refinement rule labels', () => {
    for (const rule of Object.values(THERAPIST_PACING_REFINEMENT_RULES)) {
      expect(THERAPIST_PACING_REFINEMENT_INSTRUCTIONS).toContain(rule.label);
    }
  });

  it('instructions include warmth preservation statement', () => {
    expect(THERAPIST_PACING_REFINEMENT_INSTRUCTIONS.toLowerCase()).toMatch(/warmth/);
  });

  it('buildPacingRefinementInstructions() output matches THERAPIST_PACING_REFINEMENT_INSTRUCTIONS', () => {
    expect(buildPacingRefinementInstructions()).toBe(THERAPIST_PACING_REFINEMENT_INSTRUCTIONS);
  });
});

// ─── Section J — buildWorkflowContextInstructions integration ────────────────

describe('Phase 2 Refinement — Section J: buildWorkflowContextInstructions integration', () => {
  it('buildWorkflowContextInstructions() includes Phase 2 refinement section', () => {
    const instructions = buildWorkflowContextInstructions();
    expect(instructions).toMatch(/PHASE 2 REFINEMENT/);
  });

  it('THERAPIST_WORKFLOW_INSTRUCTIONS includes pacing_ladder rule label', () => {
    expect(THERAPIST_WORKFLOW_INSTRUCTIONS).toContain(
      THERAPIST_PACING_REFINEMENT_RULES.pacing_ladder.label,
    );
  });

  it('THERAPIST_WORKFLOW_INSTRUCTIONS includes teen_shame_pacing rule label', () => {
    expect(THERAPIST_WORKFLOW_INSTRUCTIONS).toContain(
      THERAPIST_PACING_REFINEMENT_RULES.teen_shame_pacing.label,
    );
  });

  it('THERAPIST_WORKFLOW_INSTRUCTIONS includes scrupulosity_pacing rule label', () => {
    expect(THERAPIST_WORKFLOW_INSTRUCTIONS).toContain(
      THERAPIST_PACING_REFINEMENT_RULES.scrupulosity_pacing.label,
    );
  });

  it('THERAPIST_WORKFLOW_INSTRUCTIONS includes grief_containment rule label', () => {
    expect(THERAPIST_WORKFLOW_INSTRUCTIONS).toContain(
      THERAPIST_PACING_REFINEMENT_RULES.grief_containment.label,
    );
  });

  it('THERAPIST_WORKFLOW_INSTRUCTIONS includes no_first_disclosure_intervention rule label', () => {
    expect(THERAPIST_WORKFLOW_INSTRUCTIONS).toContain(
      THERAPIST_PACING_REFINEMENT_RULES.no_first_disclosure_intervention.label,
    );
  });

  it('THERAPIST_WORKFLOW_INSTRUCTIONS includes post_language_switch_continuity rule label', () => {
    expect(THERAPIST_WORKFLOW_INSTRUCTIONS).toContain(
      THERAPIST_PACING_REFINEMENT_RULES.post_language_switch_continuity.label,
    );
  });

  it('THERAPIST_WORKFLOW_INSTRUCTIONS header shows Phase 3.3', () => {
    expect(THERAPIST_WORKFLOW_INSTRUCTIONS).toMatch(/PHASE 3\.3/);
  });
});

// ─── Section K — CBT_THERAPIST agent instruction content ─────────────────────

describe('Phase 2 Refinement — Section K: cbt_therapist.jsonc content', () => {
  let instructions;

  try {
    instructions = readAgentInstructions();
  } catch (e) {
    instructions = null;
  }

  it('cbt_therapist.jsonc is readable and parseable', () => {
    expect(instructions).not.toBeNull();
    expect(typeof instructions).toBe('string');
    expect(instructions.length).toBeGreaterThan(1000);
  });

  it('cbt_therapist.jsonc contains "PHASE 2 REFINEMENT" section', () => {
    expect(instructions).toContain('PHASE 2 REFINEMENT');
  });

  it('cbt_therapist.jsonc contains R1 five-step pacing ladder language', () => {
    // Check for the 5 steps
    expect(instructions).toMatch(/Step 1.*[Aa]cknowledg/);
    expect(instructions).toMatch(/Step 2.*[Ee]motional holding/);
    expect(instructions).toMatch(/Step 5.*[Oo]ne concrete next step/);
  });

  it('cbt_therapist.jsonc contains R2 bridging question rule', () => {
    expect(instructions.toLowerCase()).toMatch(/bridging question|bridge.*question/);
  });

  it('cbt_therapist.jsonc contains R3 scrupulosity four-step sequence', () => {
    expect(instructions).toMatch(/R3|SCRUPULOSITY.*PACING|scrupulosity.*pacing/i);
    expect(instructions.toLowerCase()).toMatch(/functional cost/);
  });

  it('cbt_therapist.jsonc contains R4 grief Phase 1/2/3 structure', () => {
    expect(instructions).toMatch(/Phase 1.*PRESENCE|R4|GRIEF.*HOLDING/i);
    expect(instructions).toMatch(/Phase 2.*IMPACT|Phase 3.*COPING/i);
  });

  it('cbt_therapist.jsonc contains R5 first-disclosure prohibition text', () => {
    expect(instructions).toMatch(/R5|FIRST.DISCLOSURE INTERVENTION|first.disclosure.*intervention/i);
    expect(instructions.toLowerCase()).toMatch(/behavioral task/);
  });

  it('cbt_therapist.jsonc contains R6 language-switch continuity text', () => {
    expect(instructions).toMatch(/R6|POST.LANGUAGE.SWITCH CONTINUITY|post.language.switch/i);
    expect(instructions.toLowerCase()).toMatch(/language.independent/);
  });
});

// ─── Section L — Preserved gains (no regression) ─────────────────────────────

describe('Phase 2 Refinement — Section L: Preserved gains (no regression)', () => {
  it('THERAPIST_CONSTITUTION still has 7 principles (no regression)', () => {
    expect(Array.isArray(THERAPIST_CONSTITUTION)).toBe(true);
    expect(THERAPIST_CONSTITUTION).toHaveLength(7);
  });

  it('THERAPIST_FIRST_SESSION_FLOW still has 7 steps (no regression)', () => {
    expect(Array.isArray(THERAPIST_FIRST_SESSION_FLOW)).toBe(true);
    expect(THERAPIST_FIRST_SESSION_FLOW).toHaveLength(7);
  });

  it('THERAPIST_CLINICAL_SENSITIVITY_RULES still covers all 9 existing domains (no regression)', () => {
    const keys = Object.keys(THERAPIST_CLINICAL_SENSITIVITY_RULES);
    expect(keys).toContain('ocd_compulsive');
    expect(keys).toContain('religious_ocd');
    expect(keys).toContain('teen_cases');
    expect(keys).toContain('trauma');
    expect(keys).toContain('grief_loss');
    expect(keys).toContain('anger_relationship');
    expect(keys).toContain('adhd_organization');
    expect(keys).toContain('insomnia_sleep');
    expect(keys).toContain('eating_body_image');
    expect(keys).toHaveLength(9);
  });

  it('THERAPIST_CROSS_LANGUAGE_RULES still present (no regression)', () => {
    expect(Array.isArray(THERAPIST_CROSS_LANGUAGE_RULES)).toBe(true);
    expect(THERAPIST_CROSS_LANGUAGE_RULES.length).toBeGreaterThan(0);
  });

  it('THERAPIST_FORMULATION_INSTRUCTIONS still present (no regression)', () => {
    expect(typeof THERAPIST_FORMULATION_INSTRUCTIONS).toBe('string');
    expect(THERAPIST_FORMULATION_INSTRUCTIONS.length).toBeGreaterThan(100);
  });

  it('THERAPIST_WORKFLOW_INSTRUCTIONS still includes constitution preamble (no regression)', () => {
    expect(THERAPIST_WORKFLOW_INSTRUCTIONS).toMatch(/THERAPIST CONSTITUTION|IDENTITY LAYER/);
  });

  it('THERAPIST_WORKFLOW_INSTRUCTIONS still includes first-session model (no regression)', () => {
    expect(THERAPIST_WORKFLOW_INSTRUCTIONS).toMatch(/FIRST.SESSION OPERATING MODEL/);
  });

  it('THERAPIST_WORKFLOW_INSTRUCTIONS still includes clinical sensitivity section (no regression)', () => {
    expect(THERAPIST_WORKFLOW_INSTRUCTIONS).toMatch(/CLINICAL SENSITIVITY/);
  });
});

// ─── Section M — Hard failure prevention ─────────────────────────────────────

describe('Phase 2 Refinement — Section M: Hard failure prevention', () => {
  it('R1 explicitly prevents skipping acknowledgment+holding before next step', () => {
    const r1 = THERAPIST_PACING_REFINEMENT_RULES.pacing_ladder;
    expect(r1.description).toMatch(/NOT.*collapse|NOT.*skip/i);
  });

  it('R2 explicitly prevents direct homework assignment on teen shame first turn', () => {
    const r2 = THERAPIST_PACING_REFINEMENT_RULES.teen_shame_pacing;
    expect(r2.description.toLowerCase()).toMatch(/not.*assign.*micro.?step.*same turn|do not assign/i);
  });

  it('R3 explicitly prevents jumping from acknowledgment directly to behavioral suggestion', () => {
    const r3 = THERAPIST_PACING_REFINEMENT_RULES.scrupulosity_pacing;
    expect(r3.description.toLowerCase()).toMatch(/do not.*move.*step 1.*directly|directly.*suggestion/i);
  });

  it('R4 explicitly prevents silver linings in first grief response', () => {
    const r4 = THERAPIST_PACING_REFINEMENT_RULES.grief_containment;
    expect(r4.description.toLowerCase()).toMatch(/no silver lining|silver lining/);
  });

  it('R5 explicitly prevents technique naming on first-disclosure turn', () => {
    const r5 = THERAPIST_PACING_REFINEMENT_RULES.no_first_disclosure_intervention;
    expect(r5.description.toLowerCase()).toMatch(/specific technique|naming a specific technique/);
  });

  it('R6 explicitly prevents mechanical/cold behavior after language switch', () => {
    const r6 = THERAPIST_PACING_REFINEMENT_RULES.post_language_switch_continuity;
    expect(r6.description.toLowerCase()).toMatch(/not.*become.*mechanical|colder.*formal/);
  });
});

// ─── Section N — Scenario: Teen social shame case ────────────────────────────

describe('Phase 2 Refinement — Section N: Teen social shame scenario', () => {
  it('injected workflow instructions include bridging-before-task for teen shame', () => {
    expect(THERAPIST_WORKFLOW_INSTRUCTIONS.toLowerCase()).toMatch(
      /bridging question|bridge.*before.*task/,
    );
  });

  it('R2 does not include direct performance framing language', () => {
    const r2 = THERAPIST_PACING_REFINEMENT_RULES.teen_shame_pacing;
    // Performance framing is prohibited — the rule explicitly says "reduce performance framing"
    expect(r2.description.toLowerCase()).toMatch(/performance.*framing/);
    // The prohibition word should be present
    expect(r2.description.toLowerCase()).toMatch(/reduce|not.*frame/);
  });
});

// ─── Section O — Scenario: OCD with checking ─────────────────────────────────

describe('Phase 2 Refinement — Section O: OCD with checking scenario', () => {
  it('existing ocd_compulsive sensitivity rule is present (no regression)', () => {
    expect(THERAPIST_CLINICAL_SENSITIVITY_RULES.ocd_compulsive).toBeDefined();
    expect(THERAPIST_CLINICAL_SENSITIVITY_RULES.ocd_compulsive.domain).toContain('OCD');
  });

  it('R1 pacing ladder applies to OCD checking (emotional holding before step 5)', () => {
    const r1 = THERAPIST_PACING_REFINEMENT_RULES.pacing_ladder;
    expect(r1.description.toLowerCase()).toMatch(/emotional holding/);
    expect(r1.description.toLowerCase()).toMatch(/before.*step 5|step 5.*after/);
  });
});

// ─── Section P — Scenario: Scrupulosity / Religious OCD ──────────────────────

describe('Phase 2 Refinement — Section P: Scrupulosity / religious OCD scenario', () => {
  it('R3 requires cycle to be explicit before any behavioral suggestion', () => {
    const r3 = THERAPIST_PACING_REFINEMENT_RULES.scrupulosity_pacing;
    expect(r3.description.toLowerCase()).toMatch(/cycle.*explicit|make.*cycle/);
  });

  it('R3 does not mention belief content as a therapeutic target (no belief engagement)', () => {
    const r3 = THERAPIST_PACING_REFINEMENT_RULES.scrupulosity_pacing;
    // R3 must state that belief content is NOT the target
    expect(r3.description.toLowerCase()).toMatch(/not.*belief content|cycle.*not.*belief/);
  });
});

// ─── Section Q — Scenario: Grief / loss ──────────────────────────────────────

describe('Phase 2 Refinement — Section Q: Grief / loss scenario', () => {
  it('R4 defines presence-before-meaning-before-coping sequence', () => {
    const r4 = THERAPIST_PACING_REFINEMENT_RULES.grief_containment;
    const desc = r4.description.toLowerCase();
    expect(desc).toMatch(/presence/);
    expect(desc).toMatch(/meaning/);
    expect(desc).toMatch(/coping/);
    // Phase 1 must come before Phase 2 must come before Phase 3
    const p1pos = desc.indexOf('phase 1');
    const p2pos = desc.indexOf('phase 2');
    const p3pos = desc.indexOf('phase 3');
    expect(p1pos).toBeGreaterThanOrEqual(0);
    expect(p2pos).toBeGreaterThan(p1pos);
    expect(p3pos).toBeGreaterThan(p2pos);
  });

  it('R4 prohibits over-structuring grief', () => {
    const r4 = THERAPIST_PACING_REFINEMENT_RULES.grief_containment;
    expect(r4.description.toLowerCase()).toMatch(/over.structur/);
  });
});

// ─── Section R — Scenario: Acute first disclosure ────────────────────────────

describe('Phase 2 Refinement — Section R: Acute first disclosure scenario', () => {
  it('R5 prohibits technique on first-disclosure turn', () => {
    const r5 = THERAPIST_PACING_REFINEMENT_RULES.no_first_disclosure_intervention;
    expect(r5.description.toLowerCase()).toMatch(/specific technique/);
  });

  it('R5 sequence is acknowledge → hold → clarify → formulate', () => {
    const r5 = THERAPIST_PACING_REFINEMENT_RULES.no_first_disclosure_intervention;
    const desc = r5.description.toLowerCase();
    expect(desc).toMatch(/acknowledge/);
    expect(desc).toMatch(/hold/);
    expect(desc).toMatch(/formulate/);
    // Acknowledge should come before formulate
    const ackPos = desc.indexOf('acknowledge');
    const formPos = desc.indexOf('formulate');
    expect(ackPos).toBeGreaterThanOrEqual(0);
    expect(formPos).toBeGreaterThan(ackPos);
  });
});

// ─── Section S — Scenario: ADHD overwhelm ────────────────────────────────────

describe('Phase 2 Refinement — Section S: ADHD overwhelm scenario', () => {
  it('existing adhd_organization sensitivity rule is present (no regression)', () => {
    expect(THERAPIST_CLINICAL_SENSITIVITY_RULES.adhd_organization).toBeDefined();
    expect(THERAPIST_CLINICAL_SENSITIVITY_RULES.adhd_organization.domain).toMatch(/ADHD/i);
  });

  it('R1 pacing ladder requires holding before next step in overwhelm cases', () => {
    const r1 = THERAPIST_PACING_REFINEMENT_RULES.pacing_ladder;
    // R1 applies to "emotionally loaded" cases which includes ADHD overwhelm
    expect(r1.label.toLowerCase()).toMatch(/emotionally loaded/);
    expect(r1.description.toLowerCase()).toMatch(/emotional holding/);
  });
});

// ─── Section T — Scenario: Language switch with parity ───────────────────────

describe('Phase 2 Refinement — Section T: Language switch with parity scenario', () => {
  it('R6 states clinical identity is language-independent', () => {
    const r6 = THERAPIST_PACING_REFINEMENT_RULES.post_language_switch_continuity;
    expect(r6.description.toLowerCase()).toMatch(/language.independent/);
  });

  it('THERAPIST_CROSS_LANGUAGE_RULES parity rules are present (no regression)', () => {
    expect(THERAPIST_CROSS_LANGUAGE_RULES.length).toBeGreaterThan(5);
    const joined = THERAPIST_CROSS_LANGUAGE_RULES.join(' ').toLowerCase();
    expect(joined).toMatch(/parity|equivalent|same.*quality/);
  });

  it('R6 requires warmth to feel native in the new language', () => {
    const r6 = THERAPIST_PACING_REFINEMENT_RULES.post_language_switch_continuity;
    expect(r6.description.toLowerCase()).toMatch(/native|natural.*register/);
  });

  it('THERAPIST_WORKFLOW_INSTRUCTIONS includes language-switch rule from R6', () => {
    expect(THERAPIST_WORKFLOW_INSTRUCTIONS.toLowerCase()).toMatch(
      /language.independent|post.language.switch/,
    );
  });
});

// ─── Section U — Scenario: No premature homework ─────────────────────────────

describe('Phase 2 Refinement — Section U: No premature homework scenario', () => {
  it('R5 prohibition on behavioral task assignment is explicit', () => {
    const r5 = THERAPIST_PACING_REFINEMENT_RULES.no_first_disclosure_intervention;
    expect(r5.description.toLowerCase()).toMatch(/behavioral task/);
  });

  it('R2 requires bridging question before task in teen/shame sensitive cases', () => {
    const r2 = THERAPIST_PACING_REFINEMENT_RULES.teen_shame_pacing;
    expect(r2.description.toLowerCase()).toMatch(/bridging question.*before.*task|before.*assign/);
  });

  it('THERAPIST_WORKFLOW_INSTRUCTIONS includes "no premature" or homework prohibition', () => {
    // The injected instructions should convey the no-early-intervention principle
    const instr = THERAPIST_WORKFLOW_INSTRUCTIONS.toLowerCase();
    expect(instr).toMatch(/homework|behavioral task|micro.?step/);
  });
});

// ─── Section V — Scenario: First session warmth ──────────────────────────────

describe('Phase 2 Refinement — Section V: First session warmth scenario', () => {
  it('first-session model is preserved with warmth and 7-step flow', () => {
    expect(THERAPIST_FIRST_SESSION_FLOW).toHaveLength(7);
    const step1 = THERAPIST_FIRST_SESSION_FLOW[0];
    expect(step1.name).toBe('rapport_and_emotional_safety');
    expect(step1.description.toLowerCase()).toMatch(/warm|safe space/);
  });

  it('THERAPIST_WORKFLOW_INSTRUCTIONS includes first-session 7-step model', () => {
    const instr = THERAPIST_WORKFLOW_INSTRUCTIONS;
    expect(instr).toMatch(/rapport_and_emotional_safety/);
    expect(instr).toMatch(/one_realistic_first_task/);
  });

  it('constitution warmth principle is present in injected instructions', () => {
    const instr = THERAPIST_WORKFLOW_INSTRUCTIONS.toLowerCase();
    expect(instr).toMatch(/containing.*clinical|human.*before.*clinical/);
  });

  it('Phase 2 refinement includes preserved-gains reminder about warmth', () => {
    expect(THERAPIST_PACING_REFINEMENT_INSTRUCTIONS.toLowerCase()).toMatch(/warmth/);
    expect(THERAPIST_PACING_REFINEMENT_INSTRUCTIONS.toLowerCase()).toMatch(/cold/);
  });
});
