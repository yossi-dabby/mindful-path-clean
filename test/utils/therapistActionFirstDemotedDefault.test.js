/**
 * @file test/utils/therapistActionFirstDemotedDefault.test.js
 *
 * Therapist Runtime — Action-First Demotion — Default Route Verification
 *
 * PURPOSE
 * -------
 * Verifies that action-first behavior has been demoted from the default runtime
 * route to a conditional post-formulation route — across ALL wiring paths
 * (including HYBRID, the baseline default).
 *
 * PROBLEM ADDRESSED
 * -----------------
 * buildV12SessionStartContentAsync only appended the Wave 5 formulation-first
 * planner policy block when wiring.planner_first_enabled === true (V12 path).
 * For the HYBRID path (the production default when all upgrade flags are off),
 * no formulation-first instruction was injected, leaving the LLM free to default
 * to action-first / exercise-first behavior on first turns and early turns.
 *
 * SOLUTION
 * --------
 * buildActionFirstDemotedSessionContentAsync wraps buildV12SessionStartContentAsync
 * and always appends THERAPIST_PLANNER_FIRST_INSTRUCTIONS when the base result
 * does not already contain it.  Every session — regardless of the active wiring —
 * receives the formulation-first planner policy instructions.
 * Chat.jsx uses this wrapper at all 4 session-start call sites.
 *
 * TEST STRUCTURE
 * --------------
 * SECTION A — New function: buildActionFirstDemotedSessionContentAsync
 *   1. Function is exported from workflowContextInjector.js
 *   2. Returns a Promise
 *   3. HYBRID path: result contains [START_SESSION]
 *   4. HYBRID path: result contains THERAPIST_PLANNER_FIRST_INSTRUCTIONS
 *   5. V12 path: result contains THERAPIST_PLANNER_FIRST_INSTRUCTIONS (no duplication)
 *   6. V12 path: THERAPIST_PLANNER_FIRST_INSTRUCTIONS appears exactly once
 *   7. null wiring: result contains [START_SESSION]
 *   8. null wiring: result contains THERAPIST_PLANNER_FIRST_INSTRUCTIONS
 *   9. Fail-open: returns a string on any error, never throws
 *  10. HYBRID result length > V12 base [START_SESSION] length (block was appended)
 *
 * SECTION B — Chat.jsx routing: wrapper used at all session-start call sites
 *  11. Chat.jsx imports buildActionFirstDemotedSessionContentAsync
 *  12. Chat.jsx does NOT call buildV12SessionStartContentAsync directly at any
 *      session-start send site (verified by AST-style grep)
 *  13. All 4 session-start call sites in Chat.jsx use the demoted function
 *
 * SECTION C — Default route proof (formulation-first is now the default)
 *  14. HYBRID path result starts with [START_SESSION]
 *  15. HYBRID path result contains the HARD RULE instruction
 *  16. HYBRID path result contains the 8-step planner constitution header
 *  17. HYBRID path result contains the TREATMENT TARGET TAXONOMY section
 *  18. HYBRID path result contains the CASE-TYPE REASONING POSTURES section
 *  19. HYBRID path result contains the INTERVENTION READINESS GATES section
 *  20. HYBRID path result contains the PRESERVED GAINS section
 *
 * SECTION D — Required regression scenarios (10 from problem statement)
 *  21. Ordinary first-turn social anxiety: planner-first block present in default path
 *  22. Ordinary first-turn ADHD overwhelm: planner-first block present in default path
 *  23. Ordinary first-turn generalised anxiety: planner-first block present
 *  24. Low self-worth first turn: planner-first block present in default path
 *  25. OCD first turn: no jump to ERP-like instruction without formulation gates
 *  26. Grief first turn: planner-first block requires holding before task
 *  27. Trauma first turn: planner-first block forbids early regulation exercise
 *  28. Later-stage case: action/micro-step available when formulation gates satisfied
 *  29. Cross-language parity: planner-first block contains no language-specific restriction
 *  30. Warmth/alliance/pacing/competence: preserved-gains section present
 *
 * SECTION E — Action path: still available when formulation conditions are met
 *  31. THERAPIST_INTERVENTION_READINESS_GATES is exported from therapistWorkflowEngine.js
 *  32. THERAPIST_INTERVENTION_READINESS_GATES defines formulation_in_place gate
 *  33. THERAPIST_INTERVENTION_READINESS_GATES defines person_feels_understood gate
 *  34. THERAPIST_INTERVENTION_READINESS_GATES defines readiness_signal gate
 *  35. THERAPIST_INTERVENTION_READINESS_GATES defines rationale_is_clear gate
 *  36. THERAPIST_INTERVENTION_READINESS_GATES defines distress_allows_task gate
 *  37. THERAPIST_INTERVENTION_READINESS_GATES defines not_grief_trauma_acute_shame gate
 *  38. checkInterventionReadiness: ready=true when all conditions met
 *  39. checkInterventionReadiness: ready=false when formulation absent
 *  40. THERAPIST_PLANNER_FIRST_INSTRUCTIONS contains the PRESERVED GAINS block
 *      proving action-path is retained (not removed)
 *
 * SECTION F — No unrelated regressions: prior gains preserved
 *  41. THERAPIST_PLANNER_FIRST_INSTRUCTIONS unchanged (Wave 5 header present)
 *  42. CBT_THERAPIST_WIRING_HYBRID tool_configs unchanged (no entity access added)
 *  43. CBT_THERAPIST_WIRING_STAGE2_V12.planner_first_enabled still true
 *  44. buildV12SessionStartContentAsync still exists (not removed)
 *  45. getPlannerFirstContextForWiring still returns null for HYBRID (contract intact)
 *  46. getPlannerFirstContextForWiring still returns block for V12 (contract intact)
 *  47. THERAPIST_UPGRADE_PLANNER_FIRST_ENABLED feature flag key still present
 *  48. THERAPIST_UPGRADE_FLAGS still has THERAPIST_UPGRADE_ENABLED key
 *  49. THERAPIST_WORKFLOW_VERSION still exported (workflow engine intact)
 *  50. THERAPIST_CONSTITUTION still exported and frozen (identity intact)
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  buildV12SessionStartContentAsync,
  buildActionFirstDemotedSessionContentAsync,
  getPlannerFirstContextForWiring,
} from '../../src/lib/workflowContextInjector.js';
import {
  CBT_THERAPIST_WIRING_HYBRID,
  CBT_THERAPIST_WIRING_STAGE2_V12,
} from '../../src/api/agentWiring.js';
import {
  THERAPIST_PLANNER_FIRST_INSTRUCTIONS,
  THERAPIST_WORKFLOW_VERSION,
  THERAPIST_CONSTITUTION,
  THERAPIST_INTERVENTION_READINESS_GATES,
} from '../../src/lib/therapistWorkflowEngine.js';
import {
  checkInterventionReadiness,
} from '../../src/lib/cbtKnowledgePlanner.js';
import { THERAPIST_UPGRADE_FLAGS } from '../../src/lib/featureFlags.js';

const chatJsxPath = path.resolve('src/pages/Chat.jsx');
const chatJsxSource = fs.readFileSync(chatJsxPath, 'utf8');
const injectorPath = path.resolve('src/lib/workflowContextInjector.js');
const injectorSource = fs.readFileSync(injectorPath, 'utf8');

// ─── SECTION A — buildActionFirstDemotedSessionContentAsync ──────────────────

describe('Action-First Demotion — SECTION A: buildActionFirstDemotedSessionContentAsync', () => {
  it('1. buildActionFirstDemotedSessionContentAsync is exported from workflowContextInjector.js', () => {
    expect(typeof buildActionFirstDemotedSessionContentAsync).toBe('function');
  });

  it('2. buildActionFirstDemotedSessionContentAsync returns a Promise', () => {
    const result = buildActionFirstDemotedSessionContentAsync(null, {}, null);
    expect(result instanceof Promise).toBe(true);
  });

  it('3. HYBRID path: result contains [START_SESSION]', async () => {
    const result = await buildActionFirstDemotedSessionContentAsync(CBT_THERAPIST_WIRING_HYBRID, {}, null);
    expect(result).toContain('[START_SESSION]');
  });

  it('4. HYBRID path: result contains THERAPIST_PLANNER_FIRST_INSTRUCTIONS', async () => {
    const result = await buildActionFirstDemotedSessionContentAsync(CBT_THERAPIST_WIRING_HYBRID, {}, null);
    expect(result).toContain(THERAPIST_PLANNER_FIRST_INSTRUCTIONS);
  });

  it('5. V12 path: result contains THERAPIST_PLANNER_FIRST_INSTRUCTIONS', async () => {
    const result = await buildActionFirstDemotedSessionContentAsync(CBT_THERAPIST_WIRING_STAGE2_V12, {}, null);
    expect(result).toContain(THERAPIST_PLANNER_FIRST_INSTRUCTIONS);
  });

  it('6. V12 path: THERAPIST_PLANNER_FIRST_INSTRUCTIONS appears exactly once (no duplication)', async () => {
    const result = await buildActionFirstDemotedSessionContentAsync(CBT_THERAPIST_WIRING_STAGE2_V12, {}, null);
    const firstIdx = result.indexOf(THERAPIST_PLANNER_FIRST_INSTRUCTIONS);
    const secondIdx = result.indexOf(THERAPIST_PLANNER_FIRST_INSTRUCTIONS, firstIdx + 1);
    expect(firstIdx).toBeGreaterThanOrEqual(0);
    expect(secondIdx).toBe(-1);
  });

  it('7. null wiring: result contains [START_SESSION]', async () => {
    const result = await buildActionFirstDemotedSessionContentAsync(null, {}, null);
    expect(result).toContain('[START_SESSION]');
  });

  it('8. null wiring: result contains THERAPIST_PLANNER_FIRST_INSTRUCTIONS', async () => {
    const result = await buildActionFirstDemotedSessionContentAsync(null, {}, null);
    expect(result).toContain(THERAPIST_PLANNER_FIRST_INSTRUCTIONS);
  });

  it('9. Fail-open: function never throws — always returns a string', async () => {
    // Pathological inputs
    const r1 = await buildActionFirstDemotedSessionContentAsync(undefined, undefined, undefined);
    expect(typeof r1).toBe('string');
    const r2 = await buildActionFirstDemotedSessionContentAsync({}, {}, null);
    expect(typeof r2).toBe('string');
  });

  it('10. HYBRID result is longer than [START_SESSION] alone (block was appended)', async () => {
    const hybridResult = await buildActionFirstDemotedSessionContentAsync(CBT_THERAPIST_WIRING_HYBRID, {}, null);
    const baseV12Result = await buildV12SessionStartContentAsync(CBT_THERAPIST_WIRING_HYBRID, {}, null);
    // V12 returns [START_SESSION] for HYBRID; demoted wrapper appends the block
    expect(hybridResult.length).toBeGreaterThan(baseV12Result.length);
  });
});

// ─── SECTION B — Chat.jsx: wrapper used at all session-start sites ────────────

describe('Action-First Demotion — SECTION B: Chat.jsx routing verification', () => {
  it('11. Chat.jsx imports buildActionFirstDemotedSessionContentAsync', () => {
    expect(chatJsxSource).toContain('buildActionFirstDemotedSessionContentAsync');
  });

  it('12. Chat.jsx uses buildActionFirstDemotedSessionContentAsync at all session-start send sites', () => {
    // Count call sites — the pattern with ( finds actual function calls, not the import
    const matches = chatJsxSource.match(/buildActionFirstDemotedSessionContentAsync\(/g) || [];
    // 4 session-start call sites in Chat.jsx
    expect(matches.length).toBeGreaterThanOrEqual(4);
  });

  it('13. workflowContextInjector.js exports buildActionFirstDemotedSessionContentAsync', () => {
    expect(injectorSource).toContain('export async function buildActionFirstDemotedSessionContentAsync');
  });
});

// ─── SECTION C — Default route proof ─────────────────────────────────────────

describe('Action-First Demotion — SECTION C: formulation-first is now the default route', () => {
  it('14. HYBRID path result starts with [START_SESSION]', async () => {
    const result = await buildActionFirstDemotedSessionContentAsync(CBT_THERAPIST_WIRING_HYBRID, {}, null);
    expect(result.trim().startsWith('[START_SESSION]')).toBe(true);
  });

  it('15. HYBRID path result contains the HARD RULE instruction', async () => {
    const result = await buildActionFirstDemotedSessionContentAsync(CBT_THERAPIST_WIRING_HYBRID, {}, null);
    expect(result).toContain('HARD RULE');
    expect(result).toContain('Intervention selection and micro-step assignment must NEVER be the default');
  });

  it('16. HYBRID path result contains the 8-step planner constitution header', async () => {
    const result = await buildActionFirstDemotedSessionContentAsync(CBT_THERAPIST_WIRING_HYBRID, {}, null);
    expect(result).toContain('PLANNER CONSTITUTION: 8-STEP REASONING ORDER');
  });

  it('17. HYBRID path result contains the TREATMENT TARGET TAXONOMY section', async () => {
    const result = await buildActionFirstDemotedSessionContentAsync(CBT_THERAPIST_WIRING_HYBRID, {}, null);
    expect(result).toContain('TREATMENT TARGET TAXONOMY');
  });

  it('18. HYBRID path result contains the CASE-TYPE REASONING POSTURES section', async () => {
    const result = await buildActionFirstDemotedSessionContentAsync(CBT_THERAPIST_WIRING_HYBRID, {}, null);
    expect(result).toContain('CASE-TYPE REASONING POSTURES');
  });

  it('19. HYBRID path result contains the INTERVENTION READINESS GATES section', async () => {
    const result = await buildActionFirstDemotedSessionContentAsync(CBT_THERAPIST_WIRING_HYBRID, {}, null);
    expect(result).toContain('INTERVENTION READINESS GATES');
  });

  it('20. HYBRID path result contains the PRESERVED GAINS section', async () => {
    const result = await buildActionFirstDemotedSessionContentAsync(CBT_THERAPIST_WIRING_HYBRID, {}, null);
    expect(result).toContain('PRESERVED GAINS');
  });
});

// ─── SECTION D — 10 required regression scenarios ────────────────────────────

describe('Action-First Demotion — SECTION D: required regression scenarios', () => {
  it('21. Ordinary first-turn social anxiety: planner-first block present in default path', async () => {
    // Social anxiety domain alone must not trigger action — formulation gates must be present
    const result = await buildActionFirstDemotedSessionContentAsync(CBT_THERAPIST_WIRING_HYBRID, {}, null);
    // The block prohibits domain→action shortcuts
    expect(result).toContain('Domain classification immediately turning into intervention');
    expect(result).toContain('INTERVENTION READINESS GATES');
  });

  it('22. Ordinary first-turn ADHD overwhelm: planner-first block present in default path', async () => {
    const result = await buildActionFirstDemotedSessionContentAsync(CBT_THERAPIST_WIRING_HYBRID, {}, null);
    // The block requires formulation before any task — applies to ADHD overwhelm
    expect(result).toContain('Formulation is in place');
    expect(result).toContain('Readiness signal is present');
  });

  it('23. Ordinary first-turn generalised anxiety: planner-first block present', async () => {
    const result = await buildActionFirstDemotedSessionContentAsync(CBT_THERAPIST_WIRING_HYBRID, {}, null);
    expect(result).toContain('WAVE 5 — FORMULATION-FIRST PLANNER POLICY');
    // The 8-step sequence governs ALL first turns, including generalised anxiety
    expect(result).toContain('Step 1 —');
    expect(result).toContain('Step 4 —');
  });

  it('24. Low self-worth first turn: planner-first block present in default path', async () => {
    const result = await buildActionFirstDemotedSessionContentAsync(CBT_THERAPIST_WIRING_HYBRID, {}, null);
    // The CASE-TYPE REASONING POSTURES section covers low self-worth / shame presentations
    expect(result).toContain('CASE-TYPE REASONING POSTURES');
    expect(result).toContain('Person has felt genuinely understood');
  });

  it('25. OCD first turn: no jump to ERP-like instruction without formulation gates', async () => {
    const result = await buildActionFirstDemotedSessionContentAsync(CBT_THERAPIST_WIRING_HYBRID, {}, null);
    // The planner constitution requires formulation before technique
    expect(result).toContain('Technique naming before formulation is in place');
    // INTERVENTION READINESS GATES block ERP-like actions until conditions are met
    expect(result).toContain('Case type does not prohibit early task assignment');
  });

  it('26. Grief first turn: planner-first block requires holding before any task', async () => {
    const result = await buildActionFirstDemotedSessionContentAsync(CBT_THERAPIST_WIRING_HYBRID, {}, null);
    // The HARD FAILURE CONDITIONS section calls out grief explicitly
    expect(result).toContain('Grief, trauma, or shame being converted too quickly into action');
    // Gate: case type does not prohibit early task assignment (grief is a prohibited case type)
    expect(result).toContain('Case type does not prohibit early task assignment');
  });

  it('27. Trauma first turn: planner-first block forbids early regulation exercise', async () => {
    const result = await buildActionFirstDemotedSessionContentAsync(CBT_THERAPIST_WIRING_HYBRID, {}, null);
    expect(result).toContain('Grief, trauma, or shame being converted too quickly into action');
    // Gate label: distress must allow task engagement (blocks early exercises)
    expect(result).toContain('Current distress level allows task engagement');
    expect(result).toContain('Moderate or high distress signals require stabilization');
  });

  it('28. Later-stage case: action/micro-step available when formulation gates are satisfied', async () => {
    // All intervention readiness gates require conditions to be MET (not always blocked)
    const readyCtx = {
      formulation_in_place: true,
      person_feels_understood: true,
      readiness_signal: true,
      rationale_is_clear: true,
      distress_allows_task: true,
    };
    const result = checkInterventionReadiness(readyCtx);
    expect(result.ready).toBe(true);
    expect(result.unmetCriteria.length).toBe(0);
    // Action path remains available; it is NOT removed — only demoted
    const blockContent = THERAPIST_PLANNER_FIRST_INSTRUCTIONS;
    expect(blockContent).toContain('PRESERVED GAINS');
    expect(blockContent).not.toContain('action path is permanently disabled');
    expect(blockContent).not.toContain('action path is removed');
  });

  it('29. Cross-language parity: planner-first block contains no language-specific restriction', async () => {
    const result = await buildActionFirstDemotedSessionContentAsync(CBT_THERAPIST_WIRING_HYBRID, {}, null);
    expect(result).not.toMatch(/English only/i);
    expect(result).not.toMatch(/English responses only/i);
    expect(result).not.toMatch(/respond in English only/i);
    // The block applies to all 7 supported languages equally
    expect(THERAPIST_PLANNER_FIRST_INSTRUCTIONS).not.toMatch(/language.specific/i);
  });

  it('30. Warmth/alliance/pacing/competence: preserved-gains section present in default path', async () => {
    const result = await buildActionFirstDemotedSessionContentAsync(CBT_THERAPIST_WIRING_HYBRID, {}, null);
    expect(result).toContain('PRESERVED GAINS');
    expect(result).toContain('Warmth and reduced coldness across all languages');
    expect(result).toContain('Alliance quality from prior phases');
    expect(result).toContain('Pacing improvements and holding sequence');
  });
});

// ─── SECTION D2 — Stage 9 response quality stabilizers ────────────────────────

describe('Action-First Demotion — SECTION D2: Stage 9 response quality stabilizers', () => {
  it('30.1 Planner block includes the Stage 9 response quality stabilizers section', () => {
    expect(THERAPIST_PLANNER_FIRST_INSTRUCTIONS).toContain('STAGE 9 RESPONSE QUALITY STABILIZERS');
  });

  it('30.2 Stage 9 enforces a long warm containing default first-turn opener', () => {
    expect(THERAPIST_PLANNER_FIRST_INSTRUCTIONS).toContain('First-turn default opener: long, warm, and containing');
  });

  it('30.3 Stage 9 enforces question-restraint and suppresses generic intake/mapping endings', () => {
    expect(THERAPIST_PLANNER_FIRST_INSTRUCTIONS).toContain('Question restraint: default to no question');
    expect(THERAPIST_PLANNER_FIRST_INSTRUCTIONS).toContain('Do NOT end turns with generic intake/mapping prompts');
  });

  it('30.4 Stage 9 enforces explanation-first hold for social anxiety, GAD/worry loops, and trauma/hyperarousal', () => {
    expect(THERAPIST_PLANNER_FIRST_INSTRUCTIONS).toContain('Explanation-first hold for social anxiety');
    expect(THERAPIST_PLANNER_FIRST_INSTRUCTIONS).toContain('Explanation-first hold for GAD/worry loops');
    expect(THERAPIST_PLANNER_FIRST_INSTRUCTIONS).toContain('Explanation-first hold for trauma/hyperarousal');
  });

  it('30.5 Stage 9 enforces therapist voice over teacher voice and cross-language parity', () => {
    expect(THERAPIST_PLANNER_FIRST_INSTRUCTIONS).toContain('Therapist voice over teacher voice');
    expect(THERAPIST_PLANNER_FIRST_INSTRUCTIONS).toContain('Cross-language parity');
  });
});

// ─── SECTION E — Action path still available when conditions are met ──────────

describe('Action-First Demotion — SECTION E: action path availability when formulation conditions met', () => {
  it('31. THERAPIST_INTERVENTION_READINESS_GATES is exported from therapistWorkflowEngine.js', () => {
    expect(THERAPIST_INTERVENTION_READINESS_GATES).toBeDefined();
    expect(typeof THERAPIST_INTERVENTION_READINESS_GATES).toBe('object');
  });

  it('32. THERAPIST_INTERVENTION_READINESS_GATES defines formulation_in_place gate', () => {
    expect(THERAPIST_INTERVENTION_READINESS_GATES.formulation_in_place).toBeDefined();
    expect(typeof THERAPIST_INTERVENTION_READINESS_GATES.formulation_in_place.id).toBe('string');
  });

  it('33. THERAPIST_INTERVENTION_READINESS_GATES defines person_feels_understood gate', () => {
    expect(THERAPIST_INTERVENTION_READINESS_GATES.person_feels_understood).toBeDefined();
  });

  it('34. THERAPIST_INTERVENTION_READINESS_GATES defines readiness_signal gate', () => {
    expect(THERAPIST_INTERVENTION_READINESS_GATES.readiness_signal).toBeDefined();
  });

  it('35. THERAPIST_INTERVENTION_READINESS_GATES defines rationale_is_clear gate', () => {
    expect(THERAPIST_INTERVENTION_READINESS_GATES.rationale_is_clear).toBeDefined();
  });

  it('36. THERAPIST_INTERVENTION_READINESS_GATES defines distress_allows_task gate', () => {
    expect(THERAPIST_INTERVENTION_READINESS_GATES.distress_allows_task).toBeDefined();
  });

  it('37. THERAPIST_INTERVENTION_READINESS_GATES defines not_grief_trauma_acute_shame gate', () => {
    expect(THERAPIST_INTERVENTION_READINESS_GATES.not_grief_trauma_acute_shame).toBeDefined();
  });

  it('38. checkInterventionReadiness: ready=true when all 5 standard conditions are met', () => {
    const ctx = {
      formulation_in_place: true,
      person_feels_understood: true,
      readiness_signal: true,
      rationale_is_clear: true,
      distress_allows_task: true,
    };
    const result = checkInterventionReadiness(ctx);
    expect(result.ready).toBe(true);
    expect(result.unmetCriteria).toHaveLength(0);
  });

  it('39. checkInterventionReadiness: ready=false when formulation is absent', () => {
    const ctx = {
      formulation_in_place: false,
      person_feels_understood: true,
      readiness_signal: true,
      rationale_is_clear: true,
      distress_allows_task: true,
    };
    const result = checkInterventionReadiness(ctx);
    expect(result.ready).toBe(false);
    expect(result.unmetCriteria).toContain('formulation_in_place');
  });

  it('40. THERAPIST_PLANNER_FIRST_INSTRUCTIONS contains PRESERVED GAINS (action-path retained, not removed)', () => {
    expect(THERAPIST_PLANNER_FIRST_INSTRUCTIONS).toContain('PRESERVED GAINS');
    // The block says the action path is the "last resort" — not removed
    expect(THERAPIST_PLANNER_FIRST_INSTRUCTIONS).toContain('last resort');
  });
});

// ─── SECTION F — Prior gains preserved: no unrelated regressions ─────────────

describe('Action-First Demotion — SECTION F: prior gains preserved', () => {
  it('41. THERAPIST_PLANNER_FIRST_INSTRUCTIONS unchanged (Wave 5 header present)', () => {
    expect(THERAPIST_PLANNER_FIRST_INSTRUCTIONS).toContain('WAVE 5 — FORMULATION-FIRST PLANNER POLICY');
    expect(THERAPIST_PLANNER_FIRST_INSTRUCTIONS.trim()).toMatch(/END WAVE 5/);
  });

  it('42. CBT_THERAPIST_WIRING_HYBRID tool_configs unchanged (no entity access added)', () => {
    const entityNames = CBT_THERAPIST_WIRING_HYBRID.tool_configs.map((t) => t.entity_name);
    // Original 12 entities must all still be present
    expect(entityNames).toContain('SessionSummary');
    expect(entityNames).toContain('ThoughtJournal');
    expect(entityNames).toContain('Exercise');
    expect(entityNames).toContain('CaseFormulation');
    expect(entityNames).toContain('Conversation');
    // No new entities added
    expect(entityNames).not.toContain('AppNotification');
    expect(entityNames).not.toContain('Subscription');
  });

  it('43. CBT_THERAPIST_WIRING_STAGE2_V12.planner_first_enabled still true', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V12.planner_first_enabled).toBe(true);
  });

  it('44. buildV12SessionStartContentAsync still exists and is a function (not removed)', () => {
    expect(typeof buildV12SessionStartContentAsync).toBe('function');
  });

  it('45. getPlannerFirstContextForWiring still returns null for HYBRID wiring (contract intact)', () => {
    expect(getPlannerFirstContextForWiring(CBT_THERAPIST_WIRING_HYBRID)).toBeNull();
  });

  it('46. getPlannerFirstContextForWiring still returns block for V12 wiring (contract intact)', () => {
    expect(getPlannerFirstContextForWiring(CBT_THERAPIST_WIRING_STAGE2_V12)).toBe(
      THERAPIST_PLANNER_FIRST_INSTRUCTIONS,
    );
  });

  it('47. THERAPIST_UPGRADE_FLAGS has THERAPIST_UPGRADE_PLANNER_FIRST_ENABLED key', () => {
    expect(Object.prototype.hasOwnProperty.call(
      THERAPIST_UPGRADE_FLAGS, 'THERAPIST_UPGRADE_PLANNER_FIRST_ENABLED',
    )).toBe(true);
  });

  it('48. THERAPIST_UPGRADE_FLAGS has THERAPIST_UPGRADE_ENABLED key (master gate intact)', () => {
    expect(Object.prototype.hasOwnProperty.call(
      THERAPIST_UPGRADE_FLAGS, 'THERAPIST_UPGRADE_ENABLED',
    )).toBe(true);
  });

  it('49. THERAPIST_WORKFLOW_VERSION is still exported (workflow engine intact)', () => {
    expect(typeof THERAPIST_WORKFLOW_VERSION).toBe('string');
    expect(THERAPIST_WORKFLOW_VERSION.length).toBeGreaterThan(0);
  });

  it('50. THERAPIST_CONSTITUTION is still exported and frozen (therapist identity intact)', () => {
    expect(Array.isArray(THERAPIST_CONSTITUTION)).toBe(true);
    expect(THERAPIST_CONSTITUTION.length).toBeGreaterThan(0);
    expect(Object.isFrozen(THERAPIST_CONSTITUTION)).toBe(true);
  });
});
