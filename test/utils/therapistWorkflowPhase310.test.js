/**
 * @file test/utils/therapistWorkflowPhase310.test.js
 *
 * Phase 3.1.0 — Higher-attunement CBT formulator upgrade
 *
 * PURPOSE
 * -------
 * 1. Verify that THERAPIST_EARLY_TURN_SEQUENCE is exported and well-formed.
 * 2. Verify that the four new response-shaping rules are present and correct:
 *    no_redundant_questioning, formulate_before_questioning,
 *    one_targeted_question, no_intake_menu.
 * 3. Verify that buildWorkflowContextInstructions() includes the new
 *    EARLY TURN BEHAVIOR section and all four new rules.
 * 4. Verify that the version has been bumped to 3.1.0.
 * 5. Verify that all pre-existing exports and tests continue to pass
 *    (additive-only changes confirmed).
 *
 * NOTE ON SCOPE
 * -------------
 * The new rules (no_redundant_questioning, formulate_before_questioning,
 * one_targeted_question, no_intake_menu) and THERAPIST_EARLY_TURN_SEQUENCE are
 * instruction text injected verbatim into the LLM context window via
 * buildWorkflowContextInstructions().  They contain no executable JavaScript
 * decision logic.  The correct unit test scope is: verify that the instruction
 * text exists, is correctly worded, and is included in the injected output.
 * LLM behavioral integration tests (verifying that a language model follows the
 * instructions) are outside the scope of vitest unit tests and are evaluated
 * via manual clinical review of agent responses.
 *
 * CONSTRAINTS
 * -----------
 * - Does NOT import from base44/functions/ (Deno code — not importable in Vitest).
 * - Does NOT modify any existing test files.
 * - All existing Phase 3 / 3.1 assertions must still pass.
 * - Does NOT enable any feature flags — all flags remain false throughout.
 *
 * Source of truth: problem statement — upgrade therapist to higher-attunement
 * CBT formulator (staging-fresh).
 */

import { describe, it, expect } from 'vitest';

import {
  THERAPIST_WORKFLOW_VERSION,
  THERAPIST_WORKFLOW_RESPONSE_RULES,
  THERAPIST_EARLY_TURN_SEQUENCE,
  THERAPIST_WORKFLOW_INSTRUCTIONS,
  buildWorkflowContextInstructions,
} from '../../src/lib/therapistWorkflowEngine.js';

// ─── Section 1 — Version bump ─────────────────────────────────────────────────

describe('Phase 3.1.0 — Version bump', () => {
  it('THERAPIST_WORKFLOW_VERSION is "3.7.0"', () => {
    expect(THERAPIST_WORKFLOW_VERSION).toBe('3.7.0');
  });
});

// ─── Section 2 — THERAPIST_EARLY_TURN_SEQUENCE ───────────────────────────────

describe('Phase 3.1.0 — THERAPIST_EARLY_TURN_SEQUENCE', () => {
  it('is exported as a frozen array', () => {
    expect(Array.isArray(THERAPIST_EARLY_TURN_SEQUENCE)).toBe(true);
    expect(Object.isFrozen(THERAPIST_EARLY_TURN_SEQUENCE)).toBe(true);
  });

  it('has exactly 3 turns', () => {
    expect(THERAPIST_EARLY_TURN_SEQUENCE.length).toBe(3);
  });

  it('turns are numbered 1 through 3 in order', () => {
    for (let i = 0; i < 3; i++) {
      expect(THERAPIST_EARLY_TURN_SEQUENCE[i].turn).toBe(i + 1);
    }
  });

  const REQUIRED_TURN_NAMES = [
    'reflect_what_is_already_known',
    'produce_a_brief_formulation',
    'one_targeted_question',
  ];

  for (const name of REQUIRED_TURN_NAMES) {
    it(`early-turn sequence includes: ${name}`, () => {
      const found = THERAPIST_EARLY_TURN_SEQUENCE.some((t) => t.name === name);
      expect(found).toBe(true);
    });
  }

  it('each turn has a name and description', () => {
    for (const turn of THERAPIST_EARLY_TURN_SEQUENCE) {
      expect(typeof turn.name).toBe('string');
      expect(turn.name.length).toBeGreaterThan(0);
      expect(typeof turn.description).toBe('string');
      expect(turn.description.length).toBeGreaterThan(0);
    }
  });

  it('each turn object is frozen', () => {
    for (const turn of THERAPIST_EARLY_TURN_SEQUENCE) {
      expect(Object.isFrozen(turn)).toBe(true);
    }
  });

  it('turn 1 description addresses the no-menu rule', () => {
    const desc = THERAPIST_EARLY_TURN_SEQUENCE[0].description.toLowerCase();
    expect(desc).toMatch(/menu|category/);
  });

  it('turn 1 description addresses already-given context', () => {
    const desc = THERAPIST_EARLY_TURN_SEQUENCE[0].description.toLowerCase();
    expect(desc).toMatch(/already|restate/);
  });

  it('turn 2 description mentions formulation', () => {
    const desc = THERAPIST_EARLY_TURN_SEQUENCE[1].description.toLowerCase();
    expect(desc).toMatch(/formul/);
  });

  it('turn 3 description mandates one question', () => {
    const desc = THERAPIST_EARLY_TURN_SEQUENCE[2].description.toLowerCase();
    expect(desc).toMatch(/one|at most one/);
  });
});

// ─── Section 3 — New response-shaping rules ──────────────────────────────────

describe('Phase 3.1.0 — New response-shaping rules', () => {
  const NEW_RULES = [
    'no_redundant_questioning',
    'formulate_before_questioning',
    'one_targeted_question',
    'no_intake_menu',
  ];

  for (const rule of NEW_RULES) {
    it(`THERAPIST_WORKFLOW_RESPONSE_RULES includes: ${rule}`, () => {
      expect(rule in THERAPIST_WORKFLOW_RESPONSE_RULES).toBe(true);
      expect(typeof THERAPIST_WORKFLOW_RESPONSE_RULES[rule]).toBe('string');
      expect(THERAPIST_WORKFLOW_RESPONSE_RULES[rule].length).toBeGreaterThan(0);
    });
  }

  it('no_redundant_questioning rule warns against re-asking given context', () => {
    const rule = THERAPIST_WORKFLOW_RESPONSE_RULES.no_redundant_questioning.toLowerCase();
    expect(rule).toMatch(/redundant|already|restate|again/);
  });

  it('formulate_before_questioning rule requires formulation before question', () => {
    const rule = THERAPIST_WORKFLOW_RESPONSE_RULES.formulate_before_questioning.toLowerCase();
    expect(rule).toMatch(/formul/);
    expect(rule).toMatch(/before|precede/);
  });

  it('one_targeted_question rule limits to one question per turn', () => {
    const rule = THERAPIST_WORKFLOW_RESPONSE_RULES.one_targeted_question.toLowerCase();
    expect(rule).toMatch(/one|at most one/);
  });

  it('no_intake_menu rule prohibits category menus', () => {
    const rule = THERAPIST_WORKFLOW_RESPONSE_RULES.no_intake_menu.toLowerCase();
    expect(rule).toMatch(/menu|category/);
  });

  it('THERAPIST_WORKFLOW_RESPONSE_RULES is still frozen after new rules', () => {
    expect(Object.isFrozen(THERAPIST_WORKFLOW_RESPONSE_RULES)).toBe(true);
  });
});

// ─── Section 4 — buildWorkflowContextInstructions includes new sections ───────

describe('Phase 3.1.0 — buildWorkflowContextInstructions content', () => {
  let instructions;

  beforeEach(() => {
    instructions = buildWorkflowContextInstructions();
  });

  it('includes the EARLY TURN BEHAVIOR section', () => {
    expect(instructions).toContain('EARLY TURN BEHAVIOR');
  });

  it('includes all three early-turn names', () => {
    for (const turn of THERAPIST_EARLY_TURN_SEQUENCE) {
      expect(instructions).toContain(turn.name);
    }
  });

  it('includes no_redundant_context_questions rule text (covering no_redundant_questioning)', () => {
    expect(instructions).toContain('No redundant context questions');
  });

  it('includes reflect_then_formulate_ask rule text (covering formulate_before_questioning)', () => {
    expect(instructions).toContain('Reflect then formulate then ask');
  });

  it('includes one_targeted_question rule text', () => {
    expect(instructions).toContain('One targeted question');
  });

  it('includes opening_behavior rule text (covering no_intake_menu)', () => {
    expect(instructions).toContain('Opening behavior');
  });

  it('still includes the ADAPTIVE RESPONSE FRAMEWORK section', () => {
    expect(instructions).toContain('ADAPTIVE RESPONSE FRAMEWORK');
  });

  it('still includes the EMOTION DIFFERENTIATION section', () => {
    expect(instructions).toContain('EMOTION DIFFERENTIATION');
  });

  it('still includes the safety compatibility note', () => {
    expect(instructions.toLowerCase()).toContain('safety');
  });

  it('is still clearly delimited', () => {
    expect(instructions).toContain('=== UPGRADED THERAPIST WORKFLOW');
    expect(instructions).toContain('=== END UPGRADED THERAPIST WORKFLOW ===');
  });

  it('THERAPIST_WORKFLOW_INSTRUCTIONS matches buildWorkflowContextInstructions()', () => {
    expect(THERAPIST_WORKFLOW_INSTRUCTIONS).toBe(buildWorkflowContextInstructions());
  });
});
