/**
 * @file test/utils/therapistClinicalCalibrationStage5.test.js
 *
 * Stage 5 Clinical Calibration — instruction contract, production-path injection,
 * and deterministic guard coverage.
 *
 * This file intentionally distinguishes:
 * 1. instruction-contract assertions on the canonical Stage 5 planner text;
 * 2. production-path injection assertions through the active session-start builder;
 * 3. deterministic runtime guard coverage only where the repository already has
 *    a concrete non-LLM validator.
 *
 * It does NOT claim to prove free-form model behavior for all Stage 5 scenarios.
 */

import { describe, expect, it } from 'vitest';
import {
  THERAPIST_PLANNER_FIRST_INSTRUCTIONS,
  THERAPIST_WORKFLOW_VERSION,
  buildPlannerFirstInstructions,
} from '../../src/lib/therapistWorkflowEngine.js';
import {
  buildActionFirstDemotedSessionContentAsync,
  buildV12SessionStartContentAsync,
} from '../../src/lib/workflowContextInjector.js';
import {
  CBT_THERAPIST_WIRING_HYBRID,
  CBT_THERAPIST_WIRING_STAGE2_V12,
} from '../../src/api/agentWiring.js';
import { enforceResponsePolicy } from '../../src/lib/responsePolicyEnforcer.js';
import {
  applyAtomicActionGuardToConversationMessages,
  evaluateAtomicActionOutput,
} from '../../src/lib/explicitOutputShapeGuard.js';

const INST = THERAPIST_PLANNER_FIRST_INSTRUCTIONS;
const STAGE5_HEADER = '--- STAGE 5 CLINICAL CALIBRATION ---';

const MANUAL_RUNTIME_FIXTURES = Object.freeze([
  {
    locale: 'en',
    name: 'boundary action too hard',
    userTurn: 'I already told my coworker "I cannot take this on tonight." That was too hard. Do not just soften the same boundary.',
  },
  {
    locale: 'he',
    name: 'spoken social action too hard',
    userTurn: 'אמרתי שלום בקול רם בישיבה וזה היה קשה מדי. אל תקצר את אותה אמירה למילה אחת.',
  },
  {
    locale: 'en',
    name: 'single weak ambiguous outcome',
    userTurn: 'I said one sentence in the meeting, my heart raced, and one person nodded. That is all I know.',
  },
  {
    locale: 'he',
    name: 'current-turn do not propose another action',
    userTurn: 'אל תציע כרגע עוד פעולה, צעד, שאלה או חלופה. רק תגיד איזה סוג התערבות זה.',
  },
  {
    locale: 'en',
    name: 'hypothetical GAD worry',
    userTurn: 'What if the test result means something terrible later? Help me with the worry itself, not with proving it away.',
  },
  {
    locale: 'en',
    name: 'mixed practical and hypothetical worry',
    userTurn: 'I can call the bank tomorrow, but I also keep thinking what if this means I will never be safe again.',
  },
]);

const HOLDING_POLICY = Object.freeze({
  policy_version: 'response_policy_v1',
  policy_available: true,
  action_permitted: false,
  intervention_mode: 'structured_exploration',
  safety_override_required: false,
  status: 'pending',
  scope_match: true,
});

function guardAssistantMessage(userContent, assistantContent, locale = 'en', metadata = {}) {
  const visibleMessages = [
    { role: 'user', content: userContent },
    { role: 'assistant', content: assistantContent, metadata, __rawIndex: 1 },
  ];
  const finalMessages = visibleMessages.map((message) => ({ ...message }));
  return applyAtomicActionGuardToConversationMessages(visibleMessages, finalMessages, { locale })[1];
}

describe('Stage 5 clinical calibration — instruction contract', () => {
  it('keeps the canonical Stage 5 section and workflow version', () => {
    expect(INST).toContain(STAGE5_HEADER);
    expect(THERAPIST_WORKFLOW_VERSION).toBe('3.7.0');
  });

  it('preserves the four Stage 5 invariant section headers', () => {
    expect(INST).toMatch(/A\. SEMANTIC RECALIBRATION AFTER "TOO HARD"/);
    expect(INST).toMatch(/B\. EPISTEMIC DISCIPLINE AFTER AN OUTCOME/);
    expect(INST).toMatch(/C\. CURRENT-TURN PROHIBITION ON ACTIONS/);
    expect(INST).toMatch(/D\. GAD AND UNCERTAINTY WORK/);
  });

  it('keeps the current-turn no-action restriction scoped to the current turn with safety precedence', () => {
    expect(INST).toMatch(/Do NOT include imperatives, exact actions, exercises, step sequences, menus/i);
    expect(INST).toMatch(/Apply the restriction to the CURRENT TURN ONLY/i);
    expect(INST).toMatch(/Safety and crisis requirements retain absolute precedence/i);
  });

  it('keeps Stage 5 fact-hypothesis-unknown language calibrated after a single trial', () => {
    expect(INST).toMatch(/observed facts as reported/i);
    expect(INST).toMatch(/what remains unknown/i);
    expect(INST).toMatch(/A single trial may "support," "be consistent with," or "provide preliminary/i);
    expect(INST).toMatch(/It must NOT "confirm," "prove," "establish," or/i);
  });

  it('keeps the GAD practical-versus-hypothetical distinction and anti-suppression wording', () => {
    expect(INST).toContain('actionable practical problem from a hypothetical');
    expect(INST).toContain('allow thoughts and discomfort');
    expect(INST).toContain('to be present while reducing engagement in solving');
    expect(INST).toMatch(/Never require a blank mind/i);
    expect(INST).toMatch(/thought suppression/i);
  });

  it('keeps preserved gains unchanged', () => {
    expect(INST).toMatch(/One direct atomic action when the user explicitly requests one/i);
    expect(INST).toMatch(/Refusal of reassurance in doubt\/checking loops/i);
    expect(INST).toMatch(/Distinguishing facts from interpretations/i);
    expect(INST).toContain('PLANNER CONSTITUTION');
    expect(INST).toContain('INTERVENTION READINESS GATES');
    expect(INST).toContain('STAGE 9 RESPONSE QUALITY STABILIZERS');
  });

  it('removes the one-word acknowledgment example and makes target preservation explicit', () => {
    expect(INST).not.toContain('one-word acknowledgment');
    expect(INST).not.toContain('from a full message to a one-word acknowledgment in a different modality');
    expect(INST).toMatch(/original\s+therapeutic target/i);
    expect(INST).toContain('Mere social visibility or acknowledgment is insufficient when the target is');
    expect(INST).toContain('boundary-setting.');
    expect(INST).toMatch(/must NOT become preparation, reassurance, emotion-labeling/i);
  });

  it('keeps the group-channel example only as a conditional same-target example', () => {
    expect(INST).toMatch(/visible contribution in a group channel/i);
    expect(INST).toMatch(/if that medium is genuinely available/i);
    expect(INST).toMatch(/still preserves the same feared social participation/i);
  });

  it('builder parity remains intact', () => {
    expect(buildPlannerFirstInstructions()).toBe(INST);
    expect(INST.length).toBeGreaterThan(100);
  });
});

describe('Stage 5 clinical calibration — fixture data integrity', () => {
  it('keeps concrete English and Hebrew fixtures available for manual runtime verification', () => {
    expect(MANUAL_RUNTIME_FIXTURES).toHaveLength(6);
    for (const fixture of MANUAL_RUNTIME_FIXTURES) {
      expect(typeof fixture.locale).toBe('string');
      expect(typeof fixture.name).toBe('string');
      expect(typeof fixture.userTurn).toBe('string');
      expect(fixture.locale.length).toBeGreaterThan(0);
      expect(fixture.name.length).toBeGreaterThan(0);
      expect(fixture.userTurn.length).toBeGreaterThan(0);
    }
    expect(MANUAL_RUNTIME_FIXTURES.some(({ locale, userTurn }) => locale === 'he' && /[\u0590-\u05FF]/.test(userTurn))).toBe(true);
    expect(MANUAL_RUNTIME_FIXTURES.some(({ locale }) => locale === 'en')).toBe(true);
  });
});

describe('Stage 5 clinical calibration — production-path injection coverage', () => {
  it('injects the Stage 5 block exactly once through the active HYBRID/default session-start builder', async () => {
    const content = await buildActionFirstDemotedSessionContentAsync(CBT_THERAPIST_WIRING_HYBRID, {}, null);
    const firstIndex = content.indexOf(STAGE5_HEADER);
    const secondIndex = content.indexOf(STAGE5_HEADER, firstIndex + 1);
    expect(firstIndex).toBeGreaterThanOrEqual(0);
    expect(secondIndex).toBe(-1);
  });

  it('injects the Stage 5 block exactly once through the V12 planner-first session-start builder', async () => {
    const content = await buildV12SessionStartContentAsync(CBT_THERAPIST_WIRING_STAGE2_V12, {}, null);
    const firstIndex = content.indexOf(STAGE5_HEADER);
    const secondIndex = content.indexOf(STAGE5_HEADER, firstIndex + 1);
    expect(firstIndex).toBeGreaterThanOrEqual(0);
    expect(secondIndex).toBe(-1);
  });

  it('injects the updated target-preservation wording into the active default runtime path', async () => {
    const content = await buildActionFirstDemotedSessionContentAsync(CBT_THERAPIST_WIRING_HYBRID, {}, null);
    expect(content).toContain(STAGE5_HEADER);
    expect(content).toMatch(/original\s+therapeutic target/i);
    expect(content).toMatch(/Mere social visibility or acknowledgment is insufficient when the target is\s+boundary-setting/i);
    expect(content).not.toContain('one-word acknowledgment');
  });
});

describe('Stage 5 clinical calibration — deterministic runtime guards already present in the repo', () => {
  it('rewrites a prohibited future exposure suggestion when the current turn forbids actions', () => {
    const result = enforceResponsePolicy({
      content: 'Understanding this usually means doing an exposure next time.',
      policy: HOLDING_POLICY,
      locale: 'en',
    });

    expect(result.replaced).toBe(true);
    expect(result.content).toContain('before we decide on any next step');
    expect(result.diagnostics.violation_reason_codes).toContain('exposure_instruction');
  });

  it('rewrites a prohibited Hebrew action suggestion when the current turn forbids actions', () => {
    const result = enforceResponsePolicy({
      content: 'כדאי שתשלחי עכשיו הודעה קצרה.',
      policy: HOLDING_POLICY,
      locale: 'he',
    });

    expect(result.replaced).toBe(true);
    expect(result.content).toContain('מה הכי חשוב');
    expect(result.diagnostics.violation_reason_codes).toContain('direct_imperative_he');
  });

  it('keeps safety precedence intact inside the no-action response policy guard', () => {
    const result = enforceResponsePolicy({
      content: 'If you are in immediate danger, call emergency services now.',
      policy: { ...HOLDING_POLICY, safety_override_required: true },
      locale: 'en',
    });

    expect(result.replaced).toBe(false);
    expect(result.diagnostics.safety_override_required).toBe(true);
  });

  it('accepts one atomic action when the user explicitly requests one', () => {
    const result = guardAssistantMessage(
      'Give me exactly one action and one rationale sentence.',
      'Open the nearest window for one minute. This gives you one small observable completion.',
      'en',
      { sentinel: true },
    );

    expect(result.content).toBe(
      'Open the nearest window for one minute. This gives you one small observable completion.',
    );
    expect(result.metadata.sentinel).toBe(true);
    expect(result.metadata.explicit_output_shape_guard).toBeUndefined();
    expect(evaluateAtomicActionOutput({
      userContent: 'Give me exactly one action and one rationale sentence.',
      assistantContent: result.content,
    })).toMatchObject({
      active: true,
      violation: false,
      actionClauseCount: 1,
    });
  });

  it('does not let an earlier one-action restriction persist into a later unrestricted turn', () => {
    const messages = [
      { role: 'user', content: 'Give me exactly one action.' },
      { role: 'assistant', content: 'Open the window.' },
      { role: 'user', content: 'That still felt hard. Help me understand what made it hard.' },
      {
        role: 'assistant',
        content: 'We can look at what made that feel harder and decide together what fits next.',
        __rawIndex: 3,
      },
    ];

    const result = applyAtomicActionGuardToConversationMessages(messages, messages, { locale: 'en' });
    expect(result[3].content).toBe(
      'We can look at what made that feel harder and decide together what fits next.',
    );
    expect(result[3].metadata?.explicit_output_shape_guard).toBeUndefined();
  });
});
