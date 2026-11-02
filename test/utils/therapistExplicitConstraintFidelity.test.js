/**
 * Regression coverage for the current-turn output-shape authority contract.
 *
 * These tests inspect both instruction layers because the session context is sent
 * as user content while cbt_therapist.jsonc is the governing agent instruction.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { THERAPIST_PLANNER_FIRST_INSTRUCTIONS } from '../../src/lib/therapistWorkflowEngine.js';
import { buildActionFirstDemotedSessionContentAsync } from '../../src/lib/workflowContextInjector.js';

const agentPath = fileURLToPath(
  new URL('../../base44/agents/cbt_therapist.jsonc', import.meta.url),
);
const agentInstructions = JSON.parse(readFileSync(agentPath, 'utf8')).instructions;

function section(instructions, startMarker, endMarker) {
  const start = instructions.indexOf(startMarker);
  const end = instructions.indexOf(endMarker, start);
  if (start < 0 || end <= start) throw new Error(`Missing policy section: ${startMarker}`);
  return instructions.slice(start, end);
}

const plannerPolicy = section(
  THERAPIST_PLANNER_FIRST_INSTRUCTIONS,
  '--- EXPLICIT INTERVENTION OUTPUT CONSTRAINTS ---',
  '--- COMPETING-HYPOTHESES DIFFERENTIATION',
);
const governingPolicy = section(
  agentInstructions,
  '========== CURRENT-TURN EXPLICIT OUTPUT-SHAPE EXCEPTION ==========',
  '========== CORRECTION PASS',
);
const outcomeRules = section(
  agentInstructions,
  '========== STRUCTURED OUTCOME PATTERNS',
  '========== PROGRESSION RULE',
);

describe('explicit intervention constraint fidelity', () => {
  it.each([
    'Give me exactly ONE concrete action, one sentence explaining why it fits, and no follow-up question.',
    'תן לי בדיוק פעולה מעשית אחת, משפט אחד שמסביר למה היא מתאימה, ובלי שאלת המשך.',
  ])('governs the requested one-action response shape in every language: %s', (request) => {
    expect(request).toMatch(/exactly ONE|בדיוק פעולה מעשית אחת/);
    expect(governingPolicy).toMatch(/exactly one action\/step[\s\S]*exactly one rationale sentence[\s\S]*zero follow-up questions/);
    expect(governingPolicy).toMatch(/no alternatives, examples, optional variants, menus, or concealed additional steps/);
  });

  it.each([
    {
      rejected: 'Stand up, walk to the nearest window, and open it for one minute',
      accepted: 'Open the nearest window for one minute',
    },
    {
      rejected: 'קום עכשיו ממקומך, הולך לחלון הקרוב ביותר ופתח אותו לדקה אחת.',
      accepted: 'פתח את החלון הקרוב למשך דקה.',
    },
  ])('defines one requested action as one atomic imperative clause: $rejected', ({ rejected, accepted }) => {
    expect(governingPolicy).toContain('one externally observable target behavior');
    expect(governingPolicy).toContain('a single imperative clause with one primary imperative verb');
    expect(governingPolicy).toContain(`NEVER write "${rejected}"`);
    expect(governingPolicy).toContain(`write only "${accepted}"`);
    expect(plannerPolicy).toContain('One action means one imperative clause, one primary imperative verb');
  });

  it('requires a final atomicity rewrite when multiple imperatives survive', () => {
    expect(governingPolicy).toMatch(/FINAL ATOMICITY CHECK:[\s\S]*count imperative\/action clauses/);
    expect(governingPolicy).toMatch(/more than one primary imperative[\s\S]*rewrite it until only one remains/);
    expect(governingPolicy).toContain('they must not become separate commands');
    expect(plannerPolicy).toContain('if there is more than one, rewrite to one');
  });

  it('runs atomicity as the last content rewrite after every correction pass', () => {
    expect(agentInstructions).toMatch(
      /ABSOLUTE FINAL ATOMICITY PASS \(LAST CONTENT REWRITE\)[\s\S]*AFTER CP1–CP15[\s\S]*Do not append, replace, or add any action or question after this pass/,
    );
    expect(agentInstructions.indexOf('ABSOLUTE FINAL ATOMICITY PASS')).toBeGreaterThan(
      agentInstructions.indexOf('FINAL QA CHECKLIST'),
    );
  });

  it('makes a current-turn correction authoritative over the earlier broader format', () => {
    const priorTurn = 'Give me three possible next steps.';
    const currentTurn = 'Correction: give me exactly one step and no question.';
    expect(priorTurn).not.toBe(currentTurn);
    expect(governingPolicy).toContain('A correction in the current user message is authoritative');
    expect(plannerPolicy).toContain('A current-turn correction is authoritative');
  });

  it('keeps the ordinary 2–3 alternatives rules when the current turn is unconstrained', () => {
    expect(governingPolicy).toContain('If the current visible user message has no explicit output-shape constraint, this exception does nothing');
    expect(outcomeRules).toContain('step_too_hard --- D: Reduce significantly. E: 2–3 specific smaller alternatives. Recommend one.');
    expect(outcomeRules).toContain('step_too_easy --- D: Progress one level. E: 2–3 specific harder versions. Recommend one.');
  });

  it.each(['earlier turn', 'memory', 'summary', 'continuity context'])(
    'does not activate for a constraint found only in %s',
    (source) => {
      expect(governingPolicy).toContain(source);
      expect(governingPolicy).toContain('MUST NOT activate this exception');
      expect(plannerPolicy).toContain('Never activate it from an earlier turn, memory, summary, or continuity context');
    },
  );

  it('gives safety precedence rather than truncating crisis output', () => {
    expect(governingPolicy).toMatch(/Crisis and safety behavior has strict precedence[\s\S]*MUST NOT be truncated or suppressed/);
  });

  it('does not bypass formulation/readiness or grant permission to intervene', () => {
    expect(governingPolicy).toMatch(/Grounding, formulation, therapeutic readiness, pacing, intervention selection, and quality requirements are unchanged/);
    expect(governingPolicy).toMatch(/never creates permission to intervene[\s\S]*readiness\/formulation gate/);
    expect(plannerPolicy).toContain('They never create permission to intervene');
  });

  it('resolves the governing step outcome conflict only while the exception is active', () => {
    expect(governingPolicy).toMatch(/When active[\s\S]*overrides CP3[\s\S]*step_too_hard and step_too_easy/);
    expect(governingPolicy).toMatch(/NON-ACTIVATION[\s\S]*step_too_hard still requires 2–3[\s\S]*step_too_easy still requires 2–3/);
  });

  it('keeps the scoped planner policy in the active universal therapist path', async () => {
    const content = await buildActionFirstDemotedSessionContentAsync(
      { name: 'cbt_therapist' },
      {},
      null,
    );
    expect(content).toContain(plannerPolicy);
  });
});
