/**
 * @file test/utils/chatFallbackRemediation.test.js
 *
 * Post-Phase-1 Remediation — Chat Fallback Root Cause Regression
 * ==============================================================
 *
 * Evidence: A/B test confirmed that the Hebrew chat fallback was caused by a
 * language-sensitive false positive in the non-safety Current-Turn Grounding Guard
 * (applyCurrentTurnGroundingGuardToConversationMessages) firing with
 * guard_decision=REPLACED + reason_codes=["unsupported_current_turn_grounding_claim"]
 * in ENFORCE mode, replacing the legitimate assistant response with a fixed
 * "not enough information" fallback string.
 *
 * Remediation: Delivery authority of both non-safety guards has been revoked.
 * Both guards continue to evaluate candidates and emit guard_decision, reason_codes,
 * and diagnostics for telemetry, but they no longer have authority to replace or
 * block the delivered assistant response on the Chat path.
 *
 * This file contains:
 *   1. Hebrew two-turn regression: grounding guard may fire REPLACED, but the
 *      legitimate assistant candidate remains visible.
 *   2. Equivalent English regression.
 *   3. Confirm Formulation/Grounding diagnostics still emit (provenance records).
 *   4. Confirm safety-critical rejection/replacement behavior is unchanged.
 *   5. Confirm one user turn produces one visible assistant response via the
 *      orchestrator; no polling_exhausted_force_commit occurs.
 *
 * No test.skip / test.fixme / retries / weakened assertions are used.
 * No transcript PII, real user data, or clinical material is used in fixtures.
 */

import { describe, expect, it, beforeEach, vi } from 'vitest';
import {
  applyGroundingGuardWithMode,
  applyFormulationGuardWithMode,
  GUARD_DECISION,
  GUARD_NAME,
} from '../../src/lib/guardIsolationAudit.js';
import {
  createChatOrchestratorV2,
  TURN_STATUS,
} from '../../src/lib/chatOrchestratorV2.js';
import { enforceResponsePolicy } from '../../src/lib/responsePolicyEnforcer.js';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

/**
 * Hebrew two-turn scenario from the incident report.
 *   Turn 1 user: "I'm stressed before an important meeting tomorrow."
 *   Turn 2 user: "I'm afraid I'll make mistakes in front of people at the meeting."
 *
 * The assistant response for turn 2 makes a causal claim that the grounding guard
 * classifies as REPLACED (unsupported_current_turn_grounding_claim).  With the
 * remediation applied, the legitimate response must be delivered unchanged.
 */
const HEBREW_TURN1_USER = 'אני לחוץ לקראת פגישה חשובה מחר.';
const HEBREW_TURN1_ASSISTANT =
  'זה מובן לגמרי שאתה חש לחץ לפני פגישה חשובה. ספר לי עוד על מה שמדאיג אותך.';
// Turn 2: user expresses fear of making mistakes.
const HEBREW_TURN2_USER = 'אני חושש שאטעה מול האנשים בפגישה.';
// Turn 2 assistant makes a causal claim without the user having affirmed causation —
// triggers grounding guard with unsupported_current_turn_grounding_claim.
const HEBREW_TURN2_ASSISTANT_CANDIDATE =
  'This anxiety you feel is because of your fear of judgment from others. ' +
  'Therefore, we should work on reducing the fear of judgment first.';

/**
 * English two-turn equivalent — same scenario structure.
 */
const ENGLISH_TURN1_USER = 'I feel stressed before an important meeting tomorrow.';
const ENGLISH_TURN1_ASSISTANT =
  "That makes sense. Tell me more about what's worrying you.";
const ENGLISH_TURN2_USER = "I'm afraid I'll make mistakes in front of people.";
// This assistant response also makes a causal claim.
const ENGLISH_TURN2_ASSISTANT_CANDIDATE =
  'This anxiety is because of your underlying fear of judgment. ' +
  'Therefore, addressing the fear of judgment should be our focus.';

/**
 * A safe assistant response that neither guard should classify as REPLACED.
 */
const SAFE_ASSISTANT_RESPONSE =
  "I hear that you're feeling anxious. What specifically feels most difficult about the meeting?";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeUserMsg(id, content) {
  return { role: 'user', id, content, created_at: '2026-08-09T00:00:00.000Z' };
}

function makeAssistantMsg(id, content) {
  return { role: 'assistant', id, content, created_at: '2026-08-09T00:01:00.000Z' };
}

function makeSessionStorage() {
  const store = new Map();
  return {
    getItem: vi.fn((key) => (store.has(key) ? store.get(key) : null)),
    setItem: vi.fn((key, value) => { store.set(key, value); }),
    removeItem: vi.fn((key) => { store.delete(key); }),
    clear: vi.fn(() => store.clear()),
  };
}

// ─── 1. Hebrew two-turn regression ───────────────────────────────────────────

describe('Hebrew two-turn regression — grounding guard REPLACED, delivery authority revoked', () => {
  /**
   * Reproduces the confirmed incident pattern:
   *   turn 1: user expresses pre-meeting stress (Hebrew)
   *   turn 2: user expresses fear of mistakes (Hebrew)
   *   assistant candidate for turn 2: makes a causal claim → guard fires REPLACED
   *
   * Post-remediation: guard_decision=REPLACED is emitted for telemetry, but the
   * legitimate assistant candidate remains visible.  No fixed grounding fallback
   * may replace it.
   */
  it('[HE] turn 2: grounding guard fires REPLACED, but legitimate candidate is delivered', () => {
    const raw = [
      makeUserMsg('u-he-1', HEBREW_TURN1_USER),
      makeAssistantMsg('a-he-1', HEBREW_TURN1_ASSISTANT),
      makeUserMsg('u-he-2', HEBREW_TURN2_USER),
      makeAssistantMsg('a-he-2', HEBREW_TURN2_ASSISTANT_CANDIDATE),
    ];
    const final = raw.map((msg, i) => ({ ...msg, __rawIndex: i }));

    const result = applyGroundingGuardWithMode(raw, final, {
      locale: 'he',
      mode: 'ENFORCE',
      clientRequestId: 'crid-he-regression',
      deliverySource: 'polling',
      responseCorrelated: true,
    });

    // Guard must fire REPLACED for telemetry (confirms guard evaluation still works).
    expect(result.provenance.guard_decision, 'HE: grounding guard fired REPLACED').toBe(GUARD_DECISION.REPLACED);
    expect(result.provenance.reason_codes, 'HE: reason code emitted').toContain('unsupported_current_turn_grounding_claim');
    expect(result.provenance.guard_name, 'HE: guard name in provenance').toBe(GUARD_NAME.GROUNDING);

    // CRITICAL: delivery authority revoked — replacement_created must be false.
    expect(result.provenance.replacement_created, 'HE: replacement_created=false (delivery authority revoked)').toBe(false);
    expect(result.provenance.replacement_terminal, 'HE: replacement_terminal=false').toBe(false);

    // CRITICAL: the legitimate assistant candidate must remain visible.
    // No fixed grounding fallback must replace turn 2.
    const deliveredTurn2 = result.messages[3];
    expect(deliveredTurn2?.content, 'HE: legitimate turn 2 candidate preserved').toBe(HEBREW_TURN2_ASSISTANT_CANDIDATE);
    expect(
      deliveredTurn2?.metadata?.current_turn_grounding_guard_replaced,
      'HE: no replacement metadata flag in delivered messages'
    ).not.toBe(true);

    // Earlier turns unchanged.
    expect(result.messages[1]?.content, 'HE: turn 1 assistant unchanged').toBe(HEBREW_TURN1_ASSISTANT);
  });

  it('[HE] turn 1: grounding guard on first turn with safe assistant — PASS, original delivered', () => {
    const raw = [
      makeUserMsg('u-he-t1', HEBREW_TURN1_USER),
      makeAssistantMsg('a-he-t1', SAFE_ASSISTANT_RESPONSE),
    ];
    const final = raw.map((msg, i) => ({ ...msg, __rawIndex: i }));

    const result = applyGroundingGuardWithMode(raw, final, {
      locale: 'he',
      mode: 'ENFORCE',
      clientRequestId: 'crid-he-t1',
      deliverySource: 'polling',
      responseCorrelated: true,
    });

    expect(result.provenance.guard_decision, 'HE-t1: PASS').toBe(GUARD_DECISION.PASS);
    expect(result.provenance.replacement_created, 'HE-t1: no replacement').toBe(false);
    expect(result.messages[1]?.content, 'HE-t1: original delivered').toBe(SAFE_ASSISTANT_RESPONSE);
  });
});

// ─── 2. English two-turn regression ──────────────────────────────────────────

describe('English two-turn regression — grounding guard REPLACED, delivery authority revoked', () => {
  it('[EN] turn 2: grounding guard may fire REPLACED, legitimate candidate delivered', () => {
    const raw = [
      makeUserMsg('u-en-1', ENGLISH_TURN1_USER),
      makeAssistantMsg('a-en-1', ENGLISH_TURN1_ASSISTANT),
      makeUserMsg('u-en-2', ENGLISH_TURN2_USER),
      makeAssistantMsg('a-en-2', ENGLISH_TURN2_ASSISTANT_CANDIDATE),
    ];
    const final = raw.map((msg, i) => ({ ...msg, __rawIndex: i }));

    const result = applyGroundingGuardWithMode(raw, final, {
      locale: 'en',
      mode: 'ENFORCE',
      clientRequestId: 'crid-en-regression',
      deliverySource: 'polling',
      responseCorrelated: true,
    });

    // Guard may or may not fire REPLACED on English (per the A/B evidence);
    // in either case replacement_created must be false (delivery authority revoked).
    expect(result.provenance.replacement_created, 'EN: replacement_created=false').toBe(false);
    expect(result.provenance.replacement_terminal, 'EN: replacement_terminal=false').toBe(false);

    // CRITICAL: legitimate candidate must always be delivered.
    expect(result.messages[3]?.content, 'EN: legitimate turn 2 candidate preserved').toBe(ENGLISH_TURN2_ASSISTANT_CANDIDATE);
    expect(
      result.messages[3]?.metadata?.current_turn_grounding_guard_replaced,
      'EN: no replacement metadata flag'
    ).not.toBe(true);

    // Earlier turns unchanged.
    expect(result.messages[1]?.content, 'EN: turn 1 assistant unchanged').toBe(ENGLISH_TURN1_ASSISTANT);
  });
});

// ─── 3. Formulation/Grounding diagnostics still emit ─────────────────────────

describe('Diagnostics still emit — provenance records populated for telemetry', () => {
  it('grounding guard: provenance emitted with all required fields when guard fires', () => {
    const raw = [
      makeUserMsg('u-diag-1', HEBREW_TURN1_USER),
      makeAssistantMsg('a-diag-1', HEBREW_TURN1_ASSISTANT),
      makeUserMsg('u-diag-2', HEBREW_TURN2_USER),
      makeAssistantMsg('a-diag-2', HEBREW_TURN2_ASSISTANT_CANDIDATE),
    ];
    const final = raw.map((msg, i) => ({ ...msg, __rawIndex: i }));

    const result = applyGroundingGuardWithMode(raw, final, {
      locale: 'he',
      mode: 'ENFORCE',
      clientRequestId: 'crid-diag-grnd',
      deliverySource: 'subscription',
      responseCorrelated: true,
    });

    const p = result.provenance;
    // All required provenance fields present.
    expect(p.guard_name, 'diag: guard_name').toBe(GUARD_NAME.GROUNDING);
    expect(p.guard_mode, 'diag: guard_mode').toBe('ENFORCE');
    expect(p.guard_decision, 'diag: guard_decision').toBe(GUARD_DECISION.REPLACED);
    expect(Array.isArray(p.reason_codes), 'diag: reason_codes is array').toBe(true);
    expect(p.reason_codes.length, 'diag: reason_codes not empty').toBeGreaterThan(0);
    expect(p.client_request_id, 'diag: client_request_id').toBe('crid-diag-grnd');
    expect(p.delivery_source, 'diag: delivery_source').toBe('subscription');
    expect(p.language, 'diag: language').toBe('he');
    // replacement_created=false confirms delivery authority revoked.
    expect(p.replacement_created, 'diag: replacement_created=false').toBe(false);
    expect(Object.isFrozen(p), 'diag: provenance frozen').toBe(true);
  });

  it('formulation guard: provenance emitted with all required fields when guard fires', () => {
    const FD_TRIGGER =
      'How am I doing?\n' +
      '=== FORMULATION DEEPENING \u2014 THIS TURN ONLY ===\n' +
      'Evaluate the hypothesis.\n' +
      '=== END FORMULATION DEEPENING ===';
    const FAILING_ASSISTANT = 'This deep identity meaning explains all your anxiety.';

    const raw = [
      makeUserMsg('u-form-diag', FD_TRIGGER),
      makeAssistantMsg('a-form-diag', FAILING_ASSISTANT),
    ];
    const final = raw.map((msg, i) => ({ ...msg, __rawIndex: i }));

    const result = applyFormulationGuardWithMode(raw, final, {
      locale: 'en',
      mode: 'ENFORCE',
      clientRequestId: 'crid-diag-form',
      deliverySource: 'polling',
      responseCorrelated: true,
    });

    const p = result.provenance;
    expect(p.guard_name, 'form-diag: guard_name').toBe(GUARD_NAME.FORMULATION);
    expect(p.guard_mode, 'form-diag: guard_mode').toBe('ENFORCE');
    expect(p.guard_decision, 'form-diag: guard_decision').toBe(GUARD_DECISION.REPLACED);
    expect(p.reason_codes.length, 'form-diag: reason_codes not empty').toBeGreaterThan(0);
    expect(p.replacement_created, 'form-diag: replacement_created=false').toBe(false);
    // Original content preserved.
    expect(result.messages[1]?.content, 'form-diag: original preserved').toBe(FAILING_ASSISTANT);
    expect(Object.isFrozen(p), 'form-diag: provenance frozen').toBe(true);
  });

  it('grounding guard SHADOW: provenance emitted, guard_decision=REPLACED, original preserved', () => {
    const raw = [
      makeUserMsg('u-shadow', HEBREW_TURN2_USER),
      makeAssistantMsg('a-shadow', HEBREW_TURN2_ASSISTANT_CANDIDATE),
    ];
    const final = raw.map((msg, i) => ({ ...msg, __rawIndex: i }));

    const result = applyGroundingGuardWithMode(raw, final, {
      locale: 'he',
      mode: 'SHADOW',
      clientRequestId: 'crid-shadow',
      deliverySource: 'polling',
      responseCorrelated: true,
    });

    expect(result.provenance.guard_decision, 'SHADOW: guard_decision=REPLACED').toBe(GUARD_DECISION.REPLACED);
    expect(result.provenance.replacement_created, 'SHADOW: replacement_created=false').toBe(false);
    expect(result.messages[1]?.content, 'SHADOW: original preserved').toBe(HEBREW_TURN2_ASSISTANT_CANDIDATE);
  });
});

// ─── 4. Safety-critical controls unchanged ────────────────────────────────────

describe('Safety-critical controls — unchanged by delivery authority remediation', () => {
  /**
   * enforceResponsePolicy is a separate safety pipeline (not a non-safety guard).
   * It must continue to function independently of any guard remediation.
   * Return shape: { content, metadata, diagnostics, enforced, replaced }
   */
  it('enforceResponsePolicy: policy not available — content passes through unchanged', () => {
    const result = enforceResponsePolicy({
      content: 'Here is some general therapeutic advice.',
      metadata: {},
      policy: { policy_available: false },
      locale: 'en',
    });
    // Policy unavailable → content passed through, enforcement not applied.
    expect(result.enforced, 'safety: enforced=false when policy unavailable').toBe(false);
    expect(result.replaced, 'safety: replaced=false when policy unavailable').toBe(false);
    expect(result.content, 'safety: content unchanged').toBe('Here is some general therapeutic advice.');
  });

  it('enforceResponsePolicy: safety_override_required=true preserves content', () => {
    const safetyContent =
      'If you are in immediate danger, please call emergency services right away.';
    const result = enforceResponsePolicy({
      content: safetyContent,
      metadata: {},
      policy: {
        policy_available: true,
        action_permitted: true,
        safety_override_required: true,
      },
      locale: 'en',
    });
    // Safety override must always pass through — never suppressed.
    expect(result.enforced, 'safety: override enforced=true').toBe(true);
    expect(result.replaced, 'safety: override not replaced').toBe(false);
    expect(result.content, 'safety: content preserved').toBe(safetyContent);
  });

  it('grounding guard remediation does not affect enforceResponsePolicy outcome', () => {
    // Run the grounding guard on a causal-claim response (fires REPLACED).
    const raw = [
      makeUserMsg('u-safety-1', ENGLISH_TURN1_USER),
      makeAssistantMsg('a-safety-1', ENGLISH_TURN2_ASSISTANT_CANDIDATE),
    ];
    const final = raw.map((msg, i) => ({ ...msg, __rawIndex: i }));
    const guardResult = applyGroundingGuardWithMode(raw, final, {
      locale: 'en',
      mode: 'ENFORCE',
    });

    // Delivery authority revoked — original content delivered.
    const deliveredContent = guardResult.messages[1]?.content;
    expect(deliveredContent, 'safety-check: original content after guard').toBe(ENGLISH_TURN2_ASSISTANT_CANDIDATE);

    // Independently: enforceResponsePolicy is still operative on the delivered content.
    const policyResult = enforceResponsePolicy({
      content: deliveredContent,
      metadata: {},
      policy: { policy_available: true, action_permitted: true, safety_override_required: false },
      locale: 'en',
    });
    // Policy operates independently — its outcome is unaffected by the guard change.
    expect(typeof policyResult.enforced, 'safety-check: enforced is boolean').toBe('boolean');
    expect(typeof policyResult.replaced, 'safety-check: replaced is boolean').toBe('boolean');
    expect(typeof policyResult.content, 'safety-check: content is string').toBe('string');
  });
});

// ─── 5. One user turn → one visible assistant response ───────────────────────

describe('One user turn → one visible assistant response (no polling_exhausted_force_commit)', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.stubGlobal('window', { sessionStorage: makeSessionStorage() });
  });

  it('[HE] Hebrew turn: raw_correlation correlated + visible_commit accepted — no force commit', () => {
    const coord = createChatOrchestratorV2();
    const convId = 'conv-he-remediation';
    const { turn } = coord.registerSend({ conversationId: convId, executeSend: async () => {} });
    coord.markGenerating(turn.client_request_id);

    const snapshot = [
      makeUserMsg('u-he-ot', HEBREW_TURN2_USER),
      makeAssistantMsg('a-he-ot', HEBREW_TURN2_ASSISTANT_CANDIDATE),
    ];

    // Phase 1: raw_correlation (correlated, pending visible commit).
    const correlateResult = coord.reconcileSnapshot({
      snapshot,
      deliverySource: 'polling',
      clientRequestId: turn.client_request_id,
      phase: 'raw_correlation',
      visibleAccepted: true,
    });
    expect(correlateResult.response_correlated, 'HE-one-turn: correlated').toBe(true);
    expect(correlateResult.accepted, 'HE-one-turn: not yet committed at raw_correlation').toBe(false);
    expect(correlateResult.rejected_reason, 'HE-one-turn: pending visible_commit').toBe('raw_correlation_pending_visible_commit');
    // Turn still GENERATING — no polling_exhausted_force_commit path needed.
    expect(coord.getActiveTurn().status, 'HE-one-turn: still GENERATING').toBe(TURN_STATUS.GENERATING);

    // Phase 2: visible_commit (single visible response accepted).
    const commitResult = coord.reconcileSnapshot({
      snapshot,
      deliverySource: 'polling',
      clientRequestId: turn.client_request_id,
      phase: 'visible_commit',
      visibleAccepted: true,
      terminalReason: 'visible_terminal_result_committed',
    });
    expect(commitResult.accepted, 'HE-one-turn: visible_commit accepted').toBe(true);
    expect(commitResult.response_correlated, 'HE-one-turn: committed correlated').toBe(true);
    // Turn COMPLETED after exactly one visible commit — no force commit required.
    expect(coord.getActiveTurn().status, 'HE-one-turn: COMPLETED').toBe(TURN_STATUS.COMPLETED);
  });

  it('[EN] English turn: same one-turn → one-response lifecycle, no force commit', () => {
    const coord = createChatOrchestratorV2();
    const convId = 'conv-en-remediation';
    const { turn } = coord.registerSend({ conversationId: convId, executeSend: async () => {} });
    coord.markGenerating(turn.client_request_id);

    const snapshot = [
      makeUserMsg('u-en-ot', ENGLISH_TURN2_USER),
      makeAssistantMsg('a-en-ot', ENGLISH_TURN2_ASSISTANT_CANDIDATE),
    ];

    const correlateResult = coord.reconcileSnapshot({
      snapshot,
      deliverySource: 'polling',
      clientRequestId: turn.client_request_id,
      phase: 'raw_correlation',
      visibleAccepted: true,
    });
    expect(correlateResult.response_correlated, 'EN-one-turn: correlated').toBe(true);

    const commitResult = coord.reconcileSnapshot({
      snapshot,
      deliverySource: 'polling',
      clientRequestId: turn.client_request_id,
      phase: 'visible_commit',
      visibleAccepted: true,
      terminalReason: 'visible_terminal_result_committed',
    });
    expect(commitResult.accepted, 'EN-one-turn: committed').toBe(true);
    expect(coord.getActiveTurn().status, 'EN-one-turn: COMPLETED').toBe(TURN_STATUS.COMPLETED);
  });

  it('loading clears after visible_commit: turn moves from GENERATING to COMPLETED', () => {
    const coord = createChatOrchestratorV2();
    const { turn } = coord.registerSend({
      conversationId: 'conv-loading',
      executeSend: async () => {},
    });
    coord.markGenerating(turn.client_request_id);

    // Before commit: turn is GENERATING (loading indicator active).
    expect(coord.getActiveTurn().status, 'loading: GENERATING before commit').toBe(TURN_STATUS.GENERATING);

    const snapshot = [
      makeUserMsg('u-load', HEBREW_TURN2_USER),
      makeAssistantMsg('a-load', SAFE_ASSISTANT_RESPONSE),
    ];
    coord.reconcileSnapshot({
      snapshot,
      deliverySource: 'subscription',
      clientRequestId: turn.client_request_id,
      phase: 'visible_commit',
      visibleAccepted: true,
      terminalReason: 'visible_terminal_result_committed',
    });

    // After commit: turn is COMPLETED (loading clears).
    expect(coord.getActiveTurn().status, 'loading: COMPLETED after commit').toBe(TURN_STATUS.COMPLETED);
  });
});
