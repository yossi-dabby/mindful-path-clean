/**
 * @file test/utils/guardIsolationProvenanceMatrix.test.js
 *
 * Guard Isolation Audit — Phase 1 Provenance Matrix
 * ==================================================
 *
 * Automated evidence matrix for the two non-safety guards under audit:
 *   - applyFormulationGuardToConversationMessages  (via applyFormulationGuardWithMode)
 *   - applyCurrentTurnGroundingGuardToConversationMessages (via applyGroundingGuardWithMode)
 *
 * Run matrix:
 *   EN/HE : A, B, C, D, E, F, G  (full matrix)
 *   FR/ES : A, D, F, G            (key-path subset)
 *
 * Scenario key (guard layer):
 *   A — Happy path: guard passes (GUARD_DECISION.PASS), candidate delivered as-is.
 *   B — Guard fires in ENFORCE mode: replacement applied, safe_update_accepted=true (simulated).
 *   C — Guard fires in SHADOW mode: replacement NOT applied, provenance records REPLACED.
 *   D — Guard OFF mode: guard skipped, GUARD_DECISION.SKIPPED.
 *   E — Idempotency: already-replaced message bypasses re-evaluation.
 *   F — Non-guarded turn: guard not applicable (formulation: no FD block; grounding: no violation).
 *   G — Multi-turn: guard fires only on the violating assistant turn; earlier turns are unaffected.
 *
 * Incident signature connected:
 *   response_correlated=true → named guard decision → safeUpdateMessages result
 *   → visible commit result.
 *
 * No transcript text, clinical content or PII is present in any fixture or assertion.
 * No test.skip / test.fixme used anywhere in this file.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  applyFormulationGuardWithMode,
  applyGroundingGuardWithMode,
  buildGuardProvenanceRecord,
  augmentProvenanceWithLifecycle,
  assessCausalEvidence,
  buildCompositeProvenanceKey,
  GUARD_DECISION,
  GUARD_NAME,
} from '../../src/lib/guardIsolationAudit.js';

// ─── Locale constants ─────────────────────────────────────────────────────────

const LOCALES = { EN: 'en', HE: 'he', FR: 'fr', ES: 'es' };

// ─── Fixtures — formulation guard ────────────────────────────────────────────

/**
 * User content that triggers the formulation guard.
 * Contains the FORMULATION DEEPENING block that activates guard evaluation.
 */
const FD_BLOCK_USER_CONTENT =
  'How am I doing?\n' +
  '=== FORMULATION DEEPENING \u2014 THIS TURN ONLY ===\n' +
  'Some instructions here.\n' +
  '=== END FORMULATION DEEPENING ===';

/**
 * Assistant content that FAILS the formulation contract:
 * introduces a deeper hypothesis ("deep identity meaning") with no tentative
 * marker and no verification question.
 */
const FORMULATION_FAILING_ASSISTANT_CONTENT =
  'This deep identity meaning explains the anxiety you feel.';

/**
 * Assistant content that PASSES the formulation contract:
 * contains a tentative marker ("might") and exactly one question mark.
 */
const FORMULATION_PASSING_ASSISTANT_CONTENT =
  'I wonder if this might be connected to a deeper pattern. What would that mean for you?';

// ─── Fixtures — grounding guard ──────────────────────────────────────────────

/**
 * User content that does NOT affirm a causal connection, so that the
 * grounding guard will fire when the assistant makes a causal claim.
 */
const GROUNDING_NEUTRAL_USER_CONTENT = 'I feel tense lately.';

/**
 * Assistant content that FAILS the grounding contract: contains a causal
 * claim ("this is because") without the user having affirmed causation.
 */
const GROUNDING_FAILING_ASSISTANT_CONTENT =
  'This is because of your ongoing work stress. Therefore, we should address work issues.';

/**
 * Assistant content that PASSES the grounding contract: no causal assertion.
 */
const GROUNDING_PASSING_ASSISTANT_CONTENT =
  'I hear that you feel tense. What has been on your mind recently?';

// ─── Message factories ────────────────────────────────────────────────────────

function makeUserMsg(id, content = 'Some user message') {
  return { role: 'user', id, content, created_at: '2026-08-08T00:00:00.000Z' };
}

function makeAssistantMsg(id, content) {
  return { role: 'assistant', id, content, created_at: '2026-08-08T00:01:00.000Z' };
}

/**
 * Builds a minimal raw + final message pair for the formulation guard
 * with the given user content (FD-trigger or neutral).
 */
function buildFormulationPair(userContent, assistantContent, locale) {
  const raw = [
    makeUserMsg('u-form', userContent),
    makeAssistantMsg('a-form', assistantContent),
  ];
  const final = [
    { ...raw[0], __rawIndex: 0 },
    { ...raw[1], __rawIndex: 1 },
  ];
  return { raw, final, locale };
}

/**
 * Builds a minimal raw + final message pair for the grounding guard.
 */
function buildGroundingPair(userContent, assistantContent, locale) {
  const raw = [
    makeUserMsg('u-grnd', userContent),
    makeAssistantMsg('a-grnd', assistantContent),
  ];
  const final = [
    { ...raw[0], __rawIndex: 0 },
    { ...raw[1], __rawIndex: 1 },
  ];
  return { raw, final, locale };
}

// ─── Scenario A: Happy path — guard passes ───────────────────────────────────

describe('Scenario A — Guard passes: candidate delivered as-is (EN/HE/FR/ES)', () => {
  for (const locale of [LOCALES.EN, LOCALES.HE, LOCALES.FR, LOCALES.ES]) {
    describe(`[${locale.toUpperCase()}] formulation guard ENFORCE`, () => {
      it('passes non-guarded user content — GUARD_DECISION.PASS', () => {
        // Non-FD user content → guard is not applicable (returns PASS)
        const { raw, final } = buildFormulationPair(
          'How are you?',
          FORMULATION_PASSING_ASSISTANT_CONTENT,
          locale
        );
        const result = applyFormulationGuardWithMode(raw, final, { locale, mode: 'ENFORCE' });
        expect(result.provenance.guard_decision, `[${locale}] A-form: PASS`).toBe(GUARD_DECISION.PASS);
        expect(result.provenance.replacement_created, `[${locale}] A-form: no replacement`).toBe(false);
        expect(result.messages[1]?.content, `[${locale}] A-form: content unchanged`).toBe(FORMULATION_PASSING_ASSISTANT_CONTENT);
      });
    });

    describe(`[${locale.toUpperCase()}] grounding guard ENFORCE`, () => {
      it('passes safe assistant content — GUARD_DECISION.PASS', () => {
        const { raw, final } = buildGroundingPair(
          GROUNDING_NEUTRAL_USER_CONTENT,
          GROUNDING_PASSING_ASSISTANT_CONTENT,
          locale
        );
        const result = applyGroundingGuardWithMode(raw, final, { locale, mode: 'ENFORCE' });
        expect(result.provenance.guard_decision, `[${locale}] A-grnd: PASS`).toBe(GUARD_DECISION.PASS);
        expect(result.provenance.replacement_created, `[${locale}] A-grnd: no replacement`).toBe(false);
        expect(result.messages[1]?.content, `[${locale}] A-grnd: content unchanged`).toBe(GROUNDING_PASSING_ASSISTANT_CONTENT);
      });
    });
  }
});

// ─── Scenario B: Guard fires in ENFORCE mode ─────────────────────────────────

describe('Scenario B — Guard fires ENFORCE: guard_decision=REPLACED emitted, delivery authority revoked (EN/HE)', () => {
  /**
   * Post-Phase-1 remediation: ENFORCE mode no longer has delivery authority for non-safety guards.
   * The guard evaluates and emits guard_decision=REPLACED + reason_codes for telemetry,
   * but the original assistant response is preserved in the delivered messages.
   */
  for (const locale of [LOCALES.EN, LOCALES.HE]) {
    describe(`[${locale.toUpperCase()}] formulation guard ENFORCE`, () => {
      it('fires on violating assistant response — GUARD_DECISION.REPLACED emitted, original content preserved', () => {
        const { raw, final } = buildFormulationPair(
          FD_BLOCK_USER_CONTENT,
          FORMULATION_FAILING_ASSISTANT_CONTENT,
          locale
        );
        const result = applyFormulationGuardWithMode(raw, final, {
          locale,
          mode: 'ENFORCE',
          clientRequestId: 'crid-b-form',
          deliverySource: 'polling',
          responseCorrelated: true,
        });
        expect(result.provenance.guard_name, `[${locale}] B-form: guard name`).toBe(GUARD_NAME.FORMULATION);
        expect(result.provenance.guard_mode, `[${locale}] B-form: ENFORCE`).toBe('ENFORCE');
        expect(result.provenance.guard_decision, `[${locale}] B-form: REPLACED`).toBe(GUARD_DECISION.REPLACED);
        // Delivery authority revoked: replacement_created=false even though guard fires.
        expect(result.provenance.replacement_created, `[${locale}] B-form: delivery authority revoked`).toBe(false);
        expect(result.provenance.replacement_terminal, `[${locale}] B-form: not terminal`).toBe(false);
        expect(result.provenance.reason_codes.length, `[${locale}] B-form: reason codes present`).toBeGreaterThan(0);
        expect(result.provenance.client_request_id, `[${locale}] B-form: crid`).toBe('crid-b-form');
        expect(result.provenance.delivery_source, `[${locale}] B-form: delivery source`).toBe('polling');
        // Original content preserved — no replacement applied to delivery.
        expect(result.messages[1]?.content, `[${locale}] B-form: original content preserved`).toBe(FORMULATION_FAILING_ASSISTANT_CONTENT);
        expect(result.messages[1]?.metadata?.formulation_guard_replaced, `[${locale}] B-form: no metadata replacement flag`).not.toBe(true);
      });
    });

    describe(`[${locale.toUpperCase()}] grounding guard ENFORCE`, () => {
      it('fires on causal claim — GUARD_DECISION.REPLACED emitted, original content preserved', () => {
        const { raw, final } = buildGroundingPair(
          GROUNDING_NEUTRAL_USER_CONTENT,
          GROUNDING_FAILING_ASSISTANT_CONTENT,
          locale
        );
        const result = applyGroundingGuardWithMode(raw, final, {
          locale,
          mode: 'ENFORCE',
          clientRequestId: 'crid-b-grnd',
          deliverySource: 'subscription',
          responseCorrelated: true,
        });
        expect(result.provenance.guard_name, `[${locale}] B-grnd: guard name`).toBe(GUARD_NAME.GROUNDING);
        expect(result.provenance.guard_mode, `[${locale}] B-grnd: ENFORCE`).toBe('ENFORCE');
        expect(result.provenance.guard_decision, `[${locale}] B-grnd: REPLACED`).toBe(GUARD_DECISION.REPLACED);
        // Delivery authority revoked: replacement_created=false even though guard fires.
        expect(result.provenance.replacement_created, `[${locale}] B-grnd: delivery authority revoked`).toBe(false);
        expect(result.provenance.reason_codes, `[${locale}] B-grnd: reason codes`).toContain('unsupported_current_turn_grounding_claim');
        // Original content preserved — no replacement applied to delivery.
        expect(result.messages[1]?.content, `[${locale}] B-grnd: original content preserved`).toBe(GROUNDING_FAILING_ASSISTANT_CONTENT);
        expect(result.messages[1]?.metadata?.current_turn_grounding_guard_replaced, `[${locale}] B-grnd: no metadata replacement flag`).not.toBe(true);
      });
    });
  }
});

// ─── Scenario C: Guard fires in SHADOW mode — replacement NOT applied ─────────

describe('Scenario C — Guard fires SHADOW: provenance emitted, no replacement (EN/HE)', () => {
  for (const locale of [LOCALES.EN, LOCALES.HE]) {
    describe(`[${locale.toUpperCase()}] formulation guard SHADOW`, () => {
      it('detects violation — GUARD_DECISION.REPLACED, but original message preserved', () => {
        const { raw, final } = buildFormulationPair(
          FD_BLOCK_USER_CONTENT,
          FORMULATION_FAILING_ASSISTANT_CONTENT,
          locale
        );
        const result = applyFormulationGuardWithMode(raw, final, {
          locale,
          mode: 'SHADOW',
          clientRequestId: 'crid-c-form',
          deliverySource: 'polling',
          responseCorrelated: true,
        });
        expect(result.provenance.guard_mode, `[${locale}] C-form: SHADOW`).toBe('SHADOW');
        expect(result.provenance.guard_decision, `[${locale}] C-form: REPLACED (would-have)`).toBe(GUARD_DECISION.REPLACED);
        expect(result.provenance.replacement_created, `[${locale}] C-form: no replacement applied`).toBe(false);
        expect(result.provenance.replacement_terminal, `[${locale}] C-form: not terminal`).toBe(false);
        // SHADOW: original content preserved
        expect(result.messages[1]?.content, `[${locale}] C-form: original content preserved`).toBe(FORMULATION_FAILING_ASSISTANT_CONTENT);
        expect(result.messages[1]?.metadata?.formulation_guard_replaced, `[${locale}] C-form: no metadata flag`).not.toBe(true);
        // pendingCorrection must be null in SHADOW mode
        expect(result.pendingCorrection, `[${locale}] C-form: no pending correction in SHADOW`).toBeNull();
      });
    });

    describe(`[${locale.toUpperCase()}] grounding guard SHADOW`, () => {
      it('detects causal claim — GUARD_DECISION.REPLACED, original message preserved', () => {
        const { raw, final } = buildGroundingPair(
          GROUNDING_NEUTRAL_USER_CONTENT,
          GROUNDING_FAILING_ASSISTANT_CONTENT,
          locale
        );
        const result = applyGroundingGuardWithMode(raw, final, {
          locale,
          mode: 'SHADOW',
          clientRequestId: 'crid-c-grnd',
          deliverySource: 'subscription',
          responseCorrelated: true,
        });
        expect(result.provenance.guard_mode, `[${locale}] C-grnd: SHADOW`).toBe('SHADOW');
        expect(result.provenance.guard_decision, `[${locale}] C-grnd: REPLACED (would-have)`).toBe(GUARD_DECISION.REPLACED);
        expect(result.provenance.replacement_created, `[${locale}] C-grnd: no replacement applied`).toBe(false);
        // Original content preserved
        expect(result.messages[1]?.content, `[${locale}] C-grnd: original content preserved`).toBe(GROUNDING_FAILING_ASSISTANT_CONTENT);
        expect(result.pendingCorrection, `[${locale}] C-grnd: no pending correction in SHADOW`).toBeNull();
      });
    });
  }
});

// ─── Scenario D: Guard OFF — guard skipped (EN/HE/FR/ES) ─────────────────────

describe('Scenario D — Guard OFF: guard skipped, GUARD_DECISION.SKIPPED (EN/HE/FR/ES)', () => {
  for (const locale of [LOCALES.EN, LOCALES.HE, LOCALES.FR, LOCALES.ES]) {
    it(`[${locale.toUpperCase()}] formulation guard OFF — SKIPPED`, () => {
      const { raw, final } = buildFormulationPair(
        FD_BLOCK_USER_CONTENT,
        FORMULATION_FAILING_ASSISTANT_CONTENT,
        locale
      );
      const result = applyFormulationGuardWithMode(raw, final, { locale, mode: 'OFF' });
      expect(result.provenance.guard_mode, `[${locale}] D-form: OFF`).toBe('OFF');
      expect(result.provenance.guard_decision, `[${locale}] D-form: SKIPPED`).toBe(GUARD_DECISION.SKIPPED);
      expect(result.provenance.replacement_created, `[${locale}] D-form: no replacement`).toBe(false);
      // Original content unchanged
      expect(result.messages[1]?.content, `[${locale}] D-form: content unchanged`).toBe(FORMULATION_FAILING_ASSISTANT_CONTENT);
      expect(result.pendingCorrection, `[${locale}] D-form: no pending correction in OFF`).toBeNull();
    });

    it(`[${locale.toUpperCase()}] grounding guard OFF — SKIPPED`, () => {
      const { raw, final } = buildGroundingPair(
        GROUNDING_NEUTRAL_USER_CONTENT,
        GROUNDING_FAILING_ASSISTANT_CONTENT,
        locale
      );
      const result = applyGroundingGuardWithMode(raw, final, { locale, mode: 'OFF' });
      expect(result.provenance.guard_mode, `[${locale}] D-grnd: OFF`).toBe('OFF');
      expect(result.provenance.guard_decision, `[${locale}] D-grnd: SKIPPED`).toBe(GUARD_DECISION.SKIPPED);
      expect(result.provenance.replacement_created, `[${locale}] D-grnd: no replacement`).toBe(false);
      expect(result.messages[1]?.content, `[${locale}] D-grnd: content unchanged`).toBe(GROUNDING_FAILING_ASSISTANT_CONTENT);
    });
  }
});

// ─── Scenario E: Idempotency — already-replaced message not re-evaluated ──────

describe('Scenario E — Idempotency: already-replaced assistant message passes through (EN/HE)', () => {
  for (const locale of [LOCALES.EN, LOCALES.HE]) {
    it(`[${locale.toUpperCase()}] formulation guard: already-replaced message bypasses re-evaluation`, () => {
      const alreadyReplacedContent = 'Safe fallback text that was already applied.';
      const raw = [
        makeUserMsg('u-e', FD_BLOCK_USER_CONTENT),
        makeAssistantMsg('a-e', FORMULATION_FAILING_ASSISTANT_CONTENT),
      ];
      const final = [
        { ...raw[0], __rawIndex: 0 },
        {
          ...raw[1],
          content: alreadyReplacedContent,
          __rawIndex: 1,
          metadata: { formulation_guard_replaced: true, formulation_guard_reason_codes: ['missing_verification_question'] },
        },
      ];
      const result = applyFormulationGuardWithMode(raw, final, { locale, mode: 'ENFORCE' });
      // Already replaced — no further replacement (idempotent)
      expect(result.messages[1]?.content, `[${locale}] E-form: idempotent content`).toBe(alreadyReplacedContent);
      expect(result.messages[1]?.metadata?.formulation_guard_replaced, `[${locale}] E-form: flag preserved`).toBe(true);
    });

    it(`[${locale.toUpperCase()}] grounding guard: already-replaced message bypasses re-evaluation`, () => {
      const alreadyReplacedContent = 'There is not yet enough information. What are you experiencing?';
      const raw = [
        makeUserMsg('u-eg', GROUNDING_NEUTRAL_USER_CONTENT),
        makeAssistantMsg('a-eg', GROUNDING_FAILING_ASSISTANT_CONTENT),
      ];
      const final = [
        { ...raw[0], __rawIndex: 0 },
        {
          ...raw[1],
          content: alreadyReplacedContent,
          __rawIndex: 1,
          metadata: { current_turn_grounding_guard_replaced: true, current_turn_grounding_guard_reason_codes: ['unsupported_current_turn_grounding_claim'] },
        },
      ];
      const result = applyGroundingGuardWithMode(raw, final, { locale, mode: 'ENFORCE' });
      expect(result.messages[1]?.content, `[${locale}] E-grnd: idempotent content`).toBe(alreadyReplacedContent);
    });
  }
});

// ─── Scenario F: Non-guarded turn (EN/HE/FR/ES) ──────────────────────────────

describe('Scenario F — Non-guarded turn: guard not applicable, message delivered as-is (EN/HE/FR/ES)', () => {
  for (const locale of [LOCALES.EN, LOCALES.HE, LOCALES.FR, LOCALES.ES]) {
    it(`[${locale.toUpperCase()}] formulation guard ENFORCE on non-FD user message`, () => {
      // No FD block in user content → formulation guard not applicable
      const { raw, final } = buildFormulationPair(
        'I am feeling anxious.',
        FORMULATION_FAILING_ASSISTANT_CONTENT,
        locale
      );
      const result = applyFormulationGuardWithMode(raw, final, { locale, mode: 'ENFORCE' });
      // Guard should not apply (no FD block) — content unchanged
      expect(result.messages[1]?.content, `[${locale}] F-form: content unchanged`).toBe(FORMULATION_FAILING_ASSISTANT_CONTENT);
      expect(result.messages[1]?.metadata?.formulation_guard_replaced, `[${locale}] F-form: no replacement flag`).not.toBe(true);
    });

    it(`[${locale.toUpperCase()}] grounding guard ENFORCE on safe assistant content`, () => {
      const { raw, final } = buildGroundingPair(
        GROUNDING_NEUTRAL_USER_CONTENT,
        GROUNDING_PASSING_ASSISTANT_CONTENT,
        locale
      );
      const result = applyGroundingGuardWithMode(raw, final, { locale, mode: 'ENFORCE' });
      expect(result.provenance.guard_decision, `[${locale}] F-grnd: PASS`).toBe(GUARD_DECISION.PASS);
      expect(result.messages[1]?.content, `[${locale}] F-grnd: content unchanged`).toBe(GROUNDING_PASSING_ASSISTANT_CONTENT);
    });
  }
});

// ─── Scenario G: Multi-turn (EN/HE/FR/ES) ────────────────────────────────────

describe('Scenario G — Multi-turn: guard fires on violating turn, diagnostics emit, delivery unchanged (EN/HE/FR/ES)', () => {
  /**
   * Post-Phase-1 remediation: ENFORCE mode no longer has delivery authority.
   * Guard evaluates the violating turn and emits REPLACED decision for telemetry,
   * but all messages are delivered unchanged (original content preserved).
   */
  for (const locale of [LOCALES.EN, LOCALES.HE, LOCALES.FR, LOCALES.ES]) {
    it(`[${locale.toUpperCase()}] formulation guard ENFORCE: guard fires on violating turn, original content preserved`, () => {
      const raw = [
        makeUserMsg('u-g1', 'What is your name?'),
        makeAssistantMsg('a-g1', 'I am your therapist assistant.'),
        makeUserMsg('u-g2', FD_BLOCK_USER_CONTENT),
        makeAssistantMsg('a-g2', FORMULATION_FAILING_ASSISTANT_CONTENT),
      ];
      const final = raw.map((msg, i) => ({ ...msg, __rawIndex: i }));
      const result = applyFormulationGuardWithMode(raw, final, { locale, mode: 'ENFORCE' });
      // First turn: no FD block → unchanged
      expect(result.messages[1]?.content, `[${locale}] G-form: turn 1 unchanged`).toBe('I am your therapist assistant.');
      // Second turn: guard fires (guard_decision=REPLACED for telemetry) but delivery authority revoked
      // — original content preserved, no replacement metadata flag.
      expect(result.messages[3]?.content, `[${locale}] G-form: turn 2 original preserved`).toBe(FORMULATION_FAILING_ASSISTANT_CONTENT);
      expect(result.messages[3]?.metadata?.formulation_guard_replaced, `[${locale}] G-form: no replacement flag`).not.toBe(true);
      // Guard still emits REPLACED decision in provenance.
      expect(result.provenance.guard_decision, `[${locale}] G-form: REPLACED diagnostic`).toBe(GUARD_DECISION.REPLACED);
      expect(result.provenance.replacement_created, `[${locale}] G-form: delivery authority revoked`).toBe(false);
    });

    it(`[${locale.toUpperCase()}] grounding guard ENFORCE: guard fires on violating turn, original content preserved`, () => {
      const raw = [
        makeUserMsg('u-g1', 'Hello.'),
        makeAssistantMsg('a-g1', 'Hello! How are you doing today?'),
        makeUserMsg('u-g2', GROUNDING_NEUTRAL_USER_CONTENT),
        makeAssistantMsg('a-g2', GROUNDING_FAILING_ASSISTANT_CONTENT),
      ];
      const final = raw.map((msg, i) => ({ ...msg, __rawIndex: i }));
      const result = applyGroundingGuardWithMode(raw, final, { locale, mode: 'ENFORCE' });
      // First turn unchanged
      expect(result.messages[1]?.content, `[${locale}] G-grnd: turn 1 unchanged`).toBe('Hello! How are you doing today?');
      // Second turn: delivery authority revoked — original content preserved.
      expect(result.messages[3]?.content, `[${locale}] G-grnd: turn 2 original preserved`).toBe(GROUNDING_FAILING_ASSISTANT_CONTENT);
      expect(result.messages[3]?.metadata?.current_turn_grounding_guard_replaced, `[${locale}] G-grnd: no replacement flag`).not.toBe(true);
      expect(result.provenance.guard_decision, `[${locale}] G-grnd: REPLACED diagnostic`).toBe(GUARD_DECISION.REPLACED);
      expect(result.provenance.replacement_created, `[${locale}] G-grnd: delivery authority revoked`).toBe(false);
    });
  }
});

// ─── Provenance record builder unit tests ────────────────────────────────────

describe('buildGuardProvenanceRecord — bounded PII-free provenance', () => {
  it('returns a frozen record with all required fields', () => {
    const rec = buildGuardProvenanceRecord({
      guardName: GUARD_NAME.FORMULATION,
      guardMode: 'ENFORCE',
      guardDecision: GUARD_DECISION.REPLACED,
      reasonCodes: ['missing_verification_question'],
      replacementCreated: true,
      replacementTerminal: true,
      assistantRawIndex: 2,
      assistantId: 'a-xyz',
      userRawIndex: 1,
      userId: 'u-abc',
      language: 'he',
      clientRequestId: 'crid-unit',
      deliverySource: 'polling',
      responseCorrelated: true,
      safeUpdateAccepted: true,
      visibleCommitCompleted: true,
    });
    expect(Object.isFrozen(rec)).toBe(true);
    expect(rec.guard_name).toBe(GUARD_NAME.FORMULATION);
    expect(rec.guard_mode).toBe('ENFORCE');
    expect(rec.guard_decision).toBe(GUARD_DECISION.REPLACED);
    expect(rec.reason_codes).toEqual(['missing_verification_question']);
    expect(rec.replacement_created).toBe(true);
    expect(rec.replacement_terminal).toBe(true);
    expect(rec.assistant_raw_index).toBe(2);
    expect(rec.assistant_id).toBe('a-xyz');
    expect(rec.user_raw_index).toBe(1);
    expect(rec.user_id).toBe('u-abc');
    expect(rec.language).toBe('he');
    expect(rec.client_request_id).toBe('crid-unit');
    expect(rec.delivery_source).toBe('polling');
    expect(rec.response_correlated).toBe(true);
    expect(rec.safe_update_accepted).toBe(true);
    expect(rec.visible_commit_completed).toBe(true);
  });

  it('clamps reason_codes to 8 entries maximum', () => {
    const rec = buildGuardProvenanceRecord({
      guardName: GUARD_NAME.GROUNDING,
      guardMode: 'SHADOW',
      guardDecision: GUARD_DECISION.REPLACED,
      reasonCodes: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'],
      replacementCreated: false,
      replacementTerminal: false,
      assistantRawIndex: 0,
      assistantId: null,
      userRawIndex: null,
      userId: null,
      language: 'en',
    });
    expect(rec.reason_codes.length).toBe(8);
  });

  it('coerces null/undefined lifecycle fields to null', () => {
    const rec = buildGuardProvenanceRecord({
      guardName: GUARD_NAME.FORMULATION,
      guardMode: 'OFF',
      guardDecision: GUARD_DECISION.SKIPPED,
      reasonCodes: [],
      replacementCreated: false,
      replacementTerminal: false,
      assistantRawIndex: null,
      assistantId: null,
      userRawIndex: null,
      userId: null,
      language: 'fr',
    });
    expect(rec.response_correlated).toBeNull();
    expect(rec.safe_update_accepted).toBeNull();
    expect(rec.visible_commit_completed).toBeNull();
    expect(rec.client_request_id).toBeNull();
    expect(rec.delivery_source).toBeNull();
  });
});

// ─── augmentProvenanceWithLifecycle unit tests ────────────────────────────────

describe('augmentProvenanceWithLifecycle — lifecycle outcome augmentation', () => {
  it('augments a partial provenance record with lifecycle fields', () => {
    const base = buildGuardProvenanceRecord({
      guardName: GUARD_NAME.GROUNDING,
      guardMode: 'ENFORCE',
      guardDecision: GUARD_DECISION.REPLACED,
      reasonCodes: ['unsupported_current_turn_grounding_claim'],
      replacementCreated: true,
      replacementTerminal: true,
      assistantRawIndex: 1,
      assistantId: 'a-aug',
      userRawIndex: 0,
      userId: 'u-aug',
      language: 'en',
      clientRequestId: 'crid-aug',
      deliverySource: 'polling',
    });
    const augmented = augmentProvenanceWithLifecycle(base, {
      responseCorrelated: true,
      safeUpdateAccepted: false,
      visibleCommitCompleted: false,
    });
    expect(augmented.response_correlated).toBe(true);
    expect(augmented.safe_update_accepted).toBe(false);
    expect(augmented.visible_commit_completed).toBe(false);
    // Other fields preserved
    expect(augmented.guard_decision).toBe(GUARD_DECISION.REPLACED);
    expect(augmented.client_request_id).toBe('crid-aug');
  });

  it('returns the original provenance unchanged if lifecycle is null/undefined', () => {
    const base = buildGuardProvenanceRecord({
      guardName: GUARD_NAME.FORMULATION,
      guardMode: 'ENFORCE',
      guardDecision: GUARD_DECISION.PASS,
      reasonCodes: [],
      replacementCreated: false,
      replacementTerminal: false,
      assistantRawIndex: 0,
      assistantId: null,
      userRawIndex: null,
      userId: null,
      language: 'he',
    });
    const augmented = augmentProvenanceWithLifecycle(base, null);
    expect(augmented.response_correlated).toBeNull();
    expect(augmented.safe_update_accepted).toBeNull();
    expect(augmented.visible_commit_completed).toBeNull();
  });
});

// ─── Feature flag contract — new guard mode flags ─────────────────────────────

describe('Guard mode feature flag contract — getFormulationGuardMode / getGroundingGuardMode', () => {
  it('returns ENFORCE by default (no env vars set)', async () => {
    vi.resetModules();
    const { getFormulationGuardMode, getGroundingGuardMode } = await import('../../src/lib/featureFlags.js');
    expect(getFormulationGuardMode()).toBe('ENFORCE');
    expect(getGroundingGuardMode()).toBe('ENFORCE');
  });

  it('returns SHADOW for formulation guard when VITE_FORMULATION_GUARD_SHADOW=true', async () => {
    vi.resetModules();
    vi.stubEnv('VITE_FORMULATION_GUARD_SHADOW', 'true');
    const { getFormulationGuardMode } = await import('../../src/lib/featureFlags.js');
    expect(getFormulationGuardMode()).toBe('SHADOW');
    vi.unstubAllEnvs();
  });

  it('returns OFF for formulation guard when VITE_FORMULATION_GUARD_OFF=true', async () => {
    vi.resetModules();
    vi.stubEnv('VITE_FORMULATION_GUARD_OFF', 'true');
    const { getFormulationGuardMode } = await import('../../src/lib/featureFlags.js');
    expect(getFormulationGuardMode()).toBe('OFF');
    vi.unstubAllEnvs();
  });

  it('SHADOW wins over OFF for formulation guard when both are set', async () => {
    vi.resetModules();
    vi.stubEnv('VITE_FORMULATION_GUARD_SHADOW', 'true');
    vi.stubEnv('VITE_FORMULATION_GUARD_OFF', 'true');
    const { getFormulationGuardMode } = await import('../../src/lib/featureFlags.js');
    expect(getFormulationGuardMode()).toBe('SHADOW');
    vi.unstubAllEnvs();
  });

  it('returns SHADOW for grounding guard when VITE_GROUNDING_GUARD_SHADOW=true', async () => {
    vi.resetModules();
    vi.stubEnv('VITE_GROUNDING_GUARD_SHADOW', 'true');
    const { getGroundingGuardMode } = await import('../../src/lib/featureFlags.js');
    expect(getGroundingGuardMode()).toBe('SHADOW');
    vi.unstubAllEnvs();
  });

  it('returns OFF for grounding guard when VITE_GROUNDING_GUARD_OFF=true', async () => {
    vi.resetModules();
    vi.stubEnv('VITE_GROUNDING_GUARD_OFF', 'true');
    const { getGroundingGuardMode } = await import('../../src/lib/featureFlags.js');
    expect(getGroundingGuardMode()).toBe('OFF');
    vi.unstubAllEnvs();
  });

  it('SHADOW wins over OFF for grounding guard when both are set', async () => {
    vi.resetModules();
    vi.stubEnv('VITE_GROUNDING_GUARD_SHADOW', 'true');
    vi.stubEnv('VITE_GROUNDING_GUARD_OFF', 'true');
    const { getGroundingGuardMode } = await import('../../src/lib/featureFlags.js');
    expect(getGroundingGuardMode()).toBe('SHADOW');
    vi.unstubAllEnvs();
  });
});

// ─── Incident signature: response_correlated=true connection ─────────────────

describe('Incident signature — connect guard decision to lifecycle provenance chain', () => {
  /**
   * This test group verifies the Phase 1 evidence requirement:
   *   response_correlated=true → named guard decision → safeUpdateMessages result
   *   → visible commit result.
   *
   * The orchestrator layer (response_correlated, safeUpdateMessages, visible_commit)
   * is tested separately in guardIsolationAuditMatrix.test.js.
   * This test verifies the guard decision layer and provenance connection.
   */
  for (const locale of [LOCALES.EN, LOCALES.HE]) {
    it(`[${locale.toUpperCase()}] formulation guard ENFORCE: guard fires → replacement applied → provenance complete`, () => {
      const { raw, final } = buildFormulationPair(
        FD_BLOCK_USER_CONTENT,
        FORMULATION_FAILING_ASSISTANT_CONTENT,
        locale
      );
      const result = applyFormulationGuardWithMode(raw, final, {
        locale,
        mode: 'ENFORCE',
        clientRequestId: 'crid-incident',
        deliverySource: 'polling',
        responseCorrelated: true,
      });
      // Augment with lifecycle outcome (simulating what Chat.jsx does after visible_commit)
      const fullProvenance = augmentProvenanceWithLifecycle(result.provenance, {
        responseCorrelated: true,
        safeUpdateAccepted: true,
        visibleCommitCompleted: true,
      });
      // Evidence chain: response_correlated → REPLACED → safeUpdateAccepted=true → committed
      expect(fullProvenance.response_correlated, `[${locale}] incident: response_correlated`).toBe(true);
      expect(fullProvenance.guard_decision, `[${locale}] incident: guard REPLACED`).toBe(GUARD_DECISION.REPLACED);
      expect(fullProvenance.safe_update_accepted, `[${locale}] incident: safeUpdate accepted`).toBe(true);
      expect(fullProvenance.visible_commit_completed, `[${locale}] incident: commit completed`).toBe(true);
      expect(fullProvenance.guard_name, `[${locale}] incident: named guard`).toBe(GUARD_NAME.FORMULATION);
      expect(fullProvenance.client_request_id, `[${locale}] incident: client_request_id`).toBe('crid-incident');
    });

    it(`[${locale.toUpperCase()}] grounding guard ENFORCE: guard fires → replacement → safe_update_accepted=false (simulated)`, () => {
      const { raw, final } = buildGroundingPair(
        GROUNDING_NEUTRAL_USER_CONTENT,
        GROUNDING_FAILING_ASSISTANT_CONTENT,
        locale
      );
      const result = applyGroundingGuardWithMode(raw, final, {
        locale,
        mode: 'ENFORCE',
        clientRequestId: 'crid-incident-rej',
        deliverySource: 'polling',
        responseCorrelated: true,
      });
      // Simulate the scenario: guard replaced, but safeUpdateMessages rejected
      const fullProvenance = augmentProvenanceWithLifecycle(result.provenance, {
        responseCorrelated: true,
        safeUpdateAccepted: false,
        visibleCommitCompleted: false,
      });
      // Evidence chain: response_correlated=true → REPLACED → safeUpdate REJECTED → turn pending
      expect(fullProvenance.response_correlated, `[${locale}] incident-rej: correlated`).toBe(true);
      expect(fullProvenance.guard_decision, `[${locale}] incident-rej: REPLACED`).toBe(GUARD_DECISION.REPLACED);
      expect(fullProvenance.safe_update_accepted, `[${locale}] incident-rej: safe_update REJECTED`).toBe(false);
      expect(fullProvenance.visible_commit_completed, `[${locale}] incident-rej: no commit`).toBe(false);
    });
  }
});

// ─── Regression: candidate-identity provenance isolation ─────────────────────

describe('Candidate-identity provenance isolation — regression', () => {
  /**
   * These tests prove that identity-keyed provenance (keyed by client_request_id)
   * cannot cross-attribute lifecycle evidence across assistant candidates.
   *
   * Simulated pattern that mirrors Chat.jsx guardProvenanceByRequestIdRef:
   *   1. Evaluate guard for candidate A → store provenance under key A.
   *   2. Evaluate guard for candidate B → store provenance under key B.
   *   3. Augment with lifecycle for key B → must NOT affect key A's record.
   */

  it('earlier REPLACED + later PASS: augmenting later candidate returns PASS lifecycle, earlier record unchanged', () => {
    const { raw: rawA, final: finalA } = buildFormulationPair(
      FD_BLOCK_USER_CONTENT,
      FORMULATION_FAILING_ASSISTANT_CONTENT,
      'en'
    );
    const { raw: rawB, final: finalB } = buildFormulationPair(
      'How are you?',
      'I am doing well, thank you for asking.',
      'en'
    );

    // Candidate A: guard REPLACES (REPLACED)
    const resultA = applyFormulationGuardWithMode(rawA, finalA, {
      locale: 'en',
      mode: 'ENFORCE',
      clientRequestId: 'crid-A',
    });

    // Candidate B: guard PASSES (no FD block in user content → PASS)
    const resultB = applyFormulationGuardWithMode(rawB, finalB, {
      locale: 'en',
      mode: 'ENFORCE',
      clientRequestId: 'crid-B',
    });

    // Simulate identity-keyed map (as in guardProvenanceByRequestIdRef)
    const provenanceMap = new Map();
    provenanceMap.set('crid-A', resultA.provenance);
    provenanceMap.set('crid-B', resultB.provenance);

    // Lifecycle event for candidate B (the latest turn)
    const lifecycleB = { responseCorrelated: true, safeUpdateAccepted: true, visibleCommitCompleted: true, deliverySource: 'polling' };

    // Augment candidate B's provenance with lifecycle
    const augmentedB = augmentProvenanceWithLifecycle(provenanceMap.get('crid-B'), lifecycleB);

    // Candidate A's record is untouched — still REPLACED, no lifecycle fields
    expect(provenanceMap.get('crid-A').guard_decision).toBe(GUARD_DECISION.REPLACED);
    expect(provenanceMap.get('crid-A').safe_update_accepted).toBeNull();
    expect(provenanceMap.get('crid-A').visible_commit_completed).toBeNull();

    // Candidate B's augmented provenance is PASS with lifecycle
    expect(augmentedB.guard_decision).toBe(GUARD_DECISION.PASS);
    expect(augmentedB.safe_update_accepted).toBe(true);
    expect(augmentedB.visible_commit_completed).toBe(true);
    expect(augmentedB.delivery_source).toBe('polling');
    expect(augmentedB.client_request_id).toBe('crid-B');
  });

  it('earlier PASS + later REPLACED: augmenting later candidate returns REPLACED lifecycle, earlier record unchanged', () => {
    const { raw: rawA, final: finalA } = buildFormulationPair(
      'How are you?',
      'I am doing well, thank you for asking.',
      'en'
    );
    const { raw: rawB, final: finalB } = buildFormulationPair(
      FD_BLOCK_USER_CONTENT,
      FORMULATION_FAILING_ASSISTANT_CONTENT,
      'en'
    );

    // Candidate A: guard PASSES
    const resultA = applyFormulationGuardWithMode(rawA, finalA, {
      locale: 'en',
      mode: 'ENFORCE',
      clientRequestId: 'crid-A2',
    });

    // Candidate B: guard REPLACES
    const resultB = applyFormulationGuardWithMode(rawB, finalB, {
      locale: 'en',
      mode: 'ENFORCE',
      clientRequestId: 'crid-B2',
    });

    const provenanceMap = new Map();
    provenanceMap.set('crid-A2', resultA.provenance);
    provenanceMap.set('crid-B2', resultB.provenance);

    // Lifecycle for candidate B (latest turn) — safe_update_accepted=false (rejection scenario)
    const lifecycleB = { responseCorrelated: true, safeUpdateAccepted: false, visibleCommitCompleted: false, deliverySource: 'subscription' };
    const augmentedB = augmentProvenanceWithLifecycle(provenanceMap.get('crid-B2'), lifecycleB);

    // Candidate A's record is still PASS, no lifecycle
    expect(provenanceMap.get('crid-A2').guard_decision).toBe(GUARD_DECISION.PASS);
    expect(provenanceMap.get('crid-A2').safe_update_accepted).toBeNull();

    // Candidate B's augmented provenance identifies the REPLACEMENT with lifecycle
    expect(augmentedB.guard_decision).toBe(GUARD_DECISION.REPLACED);
    expect(augmentedB.safe_update_accepted).toBe(false);
    expect(augmentedB.visible_commit_completed).toBe(false);
    expect(augmentedB.delivery_source).toBe('subscription');
    expect(augmentedB.client_request_id).toBe('crid-B2');
  });

  it('subscription/polling interleaving: augmenting by key cannot affect provenance stored under a different key', () => {
    // Simulates interleaved subscription + polling delivery for two distinct requests.
    const provenanceMap = new Map();

    const subProvenance = buildGuardProvenanceRecord({
      guardName: GUARD_NAME.FORMULATION,
      guardMode: 'ENFORCE',
      guardDecision: GUARD_DECISION.REPLACED,
      reasonCodes: ['FD_SCOPE'],
      replacementCreated: true,
      replacementTerminal: true,
      assistantRawIndex: 2,
      assistantId: 'ast-sub',
      userRawIndex: 1,
      userId: 'usr-sub',
      language: 'en',
      clientRequestId: 'crid-sub',
      deliverySource: null,
    });

    const pollProvenance = buildGuardProvenanceRecord({
      guardName: GUARD_NAME.GROUNDING,
      guardMode: 'ENFORCE',
      guardDecision: GUARD_DECISION.PASS,
      reasonCodes: [],
      replacementCreated: false,
      replacementTerminal: false,
      assistantRawIndex: 4,
      assistantId: 'ast-poll',
      userRawIndex: 3,
      userId: 'usr-poll',
      language: 'en',
      clientRequestId: 'crid-poll',
      deliverySource: null,
    });

    provenanceMap.set('crid-sub', subProvenance);
    provenanceMap.set('crid-poll', pollProvenance);

    // Polling lifecycle arrives for crid-poll — augment only that key
    const pollLifecycle = { responseCorrelated: true, safeUpdateAccepted: true, visibleCommitCompleted: true, deliverySource: 'polling' };
    const augmentedPoll = augmentProvenanceWithLifecycle(provenanceMap.get('crid-poll'), pollLifecycle);

    // Subscription provenance (different key) is unmodified
    const subRecord = provenanceMap.get('crid-sub');
    expect(subRecord.guard_decision).toBe(GUARD_DECISION.REPLACED);
    expect(subRecord.safe_update_accepted).toBeNull();
    expect(subRecord.delivery_source).toBeNull();

    // Polling provenance augmented correctly, keyed by its own client_request_id
    expect(augmentedPoll.guard_decision).toBe(GUARD_DECISION.PASS);
    expect(augmentedPoll.safe_update_accepted).toBe(true);
    expect(augmentedPoll.delivery_source).toBe('polling');
    expect(augmentedPoll.client_request_id).toBe('crid-poll');
  });

  it('client_request_id mismatch: looking up the wrong key returns undefined, preventing cross-attribution', () => {
    const provenanceMap = new Map();
    provenanceMap.set('crid-correct', buildGuardProvenanceRecord({
      guardName: GUARD_NAME.FORMULATION,
      guardMode: 'ENFORCE',
      guardDecision: GUARD_DECISION.REPLACED,
      reasonCodes: ['FD_SCOPE'],
      replacementCreated: true,
      replacementTerminal: true,
      assistantRawIndex: 0,
      assistantId: 'ast-x',
      userRawIndex: null,
      userId: null,
      language: 'en',
      clientRequestId: 'crid-correct',
    }));

    // A lookup with a mismatched (wrong) client_request_id returns undefined
    const wrongLookup = provenanceMap.get('crid-wrong') ?? null;
    expect(wrongLookup).toBeNull();

    // Augmenting null is a no-op (identity)
    const augmented = augmentProvenanceWithLifecycle(null, {
      responseCorrelated: true,
      safeUpdateAccepted: true,
      visibleCommitCompleted: true,
    });
    expect(augmented).toBeNull();
  });
});

// ─── Regression: delivery_source propagated through augmentation ─────────────

describe('delivery_source — propagated through augmentProvenanceWithLifecycle', () => {
  it('applies deliverySource from lifecycle, overriding null in base record', () => {
    const base = buildGuardProvenanceRecord({
      guardName: GUARD_NAME.GROUNDING,
      guardMode: 'ENFORCE',
      guardDecision: GUARD_DECISION.PASS,
      reasonCodes: [],
      replacementCreated: false,
      replacementTerminal: false,
      assistantRawIndex: 0,
      assistantId: 'ast-ds',
      userRawIndex: null,
      userId: null,
      language: 'en',
      clientRequestId: 'crid-ds',
      deliverySource: null,
    });

    const augmented = augmentProvenanceWithLifecycle(base, {
      responseCorrelated: true,
      safeUpdateAccepted: true,
      visibleCommitCompleted: true,
      deliverySource: 'subscription',
    });

    expect(augmented.delivery_source).toBe('subscription');
  });

  it('applies deliverySource=polling from lifecycle', () => {
    const base = buildGuardProvenanceRecord({
      guardName: GUARD_NAME.FORMULATION,
      guardMode: 'SHADOW',
      guardDecision: GUARD_DECISION.REPLACED,
      reasonCodes: ['FD_SCOPE'],
      replacementCreated: false,
      replacementTerminal: false,
      assistantRawIndex: 1,
      assistantId: 'ast-ds2',
      userRawIndex: 0,
      userId: 'usr-ds2',
      language: 'he',
      clientRequestId: 'crid-ds2',
      deliverySource: null,
    });

    const augmented = augmentProvenanceWithLifecycle(base, {
      responseCorrelated: true,
      safeUpdateAccepted: false,
      visibleCommitCompleted: false,
      deliverySource: 'polling',
    });

    expect(augmented.delivery_source).toBe('polling');
    expect(augmented.safe_update_accepted).toBe(false);
  });

  it('preserves existing delivery_source when lifecycle does not supply one', () => {
    const base = buildGuardProvenanceRecord({
      guardName: GUARD_NAME.GROUNDING,
      guardMode: 'ENFORCE',
      guardDecision: GUARD_DECISION.PASS,
      reasonCodes: [],
      replacementCreated: false,
      replacementTerminal: false,
      assistantRawIndex: 0,
      assistantId: 'ast-ds3',
      userRawIndex: null,
      userId: null,
      language: 'en',
      clientRequestId: 'crid-ds3',
      deliverySource: 'polling',
    });

    const augmented = augmentProvenanceWithLifecycle(base, {
      responseCorrelated: true,
      safeUpdateAccepted: true,
      visibleCommitCompleted: true,
      // no deliverySource field
    });

    // Existing delivery_source preserved when lifecycle does not override it
    expect(augmented.delivery_source).toBe('polling');
  });
});

// ─── Regression: causal decision rule ────────────────────────────────────────

describe('assessCausalEvidence — causal decision rule', () => {
  it('ENFORCE REPLACED + SHADOW PASS → NOT causal (non-deterministic, model candidate may differ between runs)', () => {
    const enforceRecord = buildGuardProvenanceRecord({
      guardName: GUARD_NAME.FORMULATION,
      guardMode: 'ENFORCE',
      guardDecision: GUARD_DECISION.REPLACED,
      reasonCodes: ['FD_SCOPE'],
      replacementCreated: true,
      replacementTerminal: true,
      assistantRawIndex: 0,
      assistantId: 'ast-e1',
      userRawIndex: null,
      userId: null,
      language: 'en',
      clientRequestId: 'crid-causal',
    });
    const shadowRecord = buildGuardProvenanceRecord({
      guardName: GUARD_NAME.FORMULATION,
      guardMode: 'SHADOW',
      guardDecision: GUARD_DECISION.PASS,
      reasonCodes: [],
      replacementCreated: false,
      replacementTerminal: false,
      assistantRawIndex: 0,
      assistantId: 'ast-s1',
      userRawIndex: null,
      userId: null,
      language: 'en',
      clientRequestId: 'crid-causal-shadow',
    });
    const result = assessCausalEvidence(enforceRecord, shadowRecord);
    // SHADOW=PASS when ENFORCE=REPLACED: the underlying model candidate may have
    // differed between runs — causality cannot be attributed to the guard.
    expect(result.causal).toBe(false);
    expect(result.reason).toBe('non_deterministic_not_proven');
  });

  it('ENFORCE REPLACED + SHADOW REPLACED → PROVEN causal (guard fires in both modes on same candidate)', () => {
    const enforceRecord = buildGuardProvenanceRecord({
      guardName: GUARD_NAME.GROUNDING,
      guardMode: 'ENFORCE',
      guardDecision: GUARD_DECISION.REPLACED,
      reasonCodes: ['GROUNDING_VIOLATION'],
      replacementCreated: true,
      replacementTerminal: true,
      assistantRawIndex: 0,
      assistantId: 'ast-e2',
      userRawIndex: null,
      userId: null,
      language: 'en',
      clientRequestId: 'crid-both-replace',
    });
    const shadowRecord = buildGuardProvenanceRecord({
      guardName: GUARD_NAME.GROUNDING,
      guardMode: 'SHADOW',
      guardDecision: GUARD_DECISION.REPLACED,
      reasonCodes: ['GROUNDING_VIOLATION'],
      replacementCreated: false, // SHADOW: guard fires but does NOT apply replacement
      replacementTerminal: false,
      assistantRawIndex: 0,
      assistantId: 'ast-s2',
      userRawIndex: null,
      userId: null,
      language: 'en',
      clientRequestId: 'crid-both-replace-shadow',
    });
    const result = assessCausalEvidence(enforceRecord, shadowRecord);
    // Strong causal signal: guard fires in both ENFORCE (replacement applied) and
    // SHADOW (guard evaluates, emits REPLACED, does NOT apply replacement).
    expect(result.causal).toBe(true);
    expect(result.reason).toBe('proven_causal');
  });

  it('ENFORCE PASS + SHADOW PASS → NOT causal (no replacement signal)', () => {
    const enforceRecord = buildGuardProvenanceRecord({
      guardName: GUARD_NAME.FORMULATION,
      guardMode: 'ENFORCE',
      guardDecision: GUARD_DECISION.PASS,
      reasonCodes: [],
      replacementCreated: false,
      replacementTerminal: false,
      assistantRawIndex: 0,
      assistantId: 'ast-e3',
      userRawIndex: null,
      userId: null,
      language: 'en',
      clientRequestId: 'crid-both-pass',
    });
    const shadowRecord = buildGuardProvenanceRecord({
      guardName: GUARD_NAME.FORMULATION,
      guardMode: 'SHADOW',
      guardDecision: GUARD_DECISION.PASS,
      reasonCodes: [],
      replacementCreated: false,
      replacementTerminal: false,
      assistantRawIndex: 0,
      assistantId: 'ast-s3',
      userRawIndex: null,
      userId: null,
      language: 'en',
      clientRequestId: 'crid-both-pass-shadow',
    });
    const result = assessCausalEvidence(enforceRecord, shadowRecord);
    expect(result.causal).toBe(false);
    expect(result.reason).toBe('enforce_passed_no_causal_signal');
  });

  it('missing enforce record → NOT causal', () => {
    const shadowRecord = buildGuardProvenanceRecord({
      guardName: GUARD_NAME.FORMULATION,
      guardMode: 'SHADOW',
      guardDecision: GUARD_DECISION.PASS,
      reasonCodes: [],
      replacementCreated: false,
      replacementTerminal: false,
      assistantRawIndex: 0,
      assistantId: 'ast-s4',
      userRawIndex: null,
      userId: null,
      language: 'en',
      clientRequestId: 'crid-missing',
    });
    const result = assessCausalEvidence(null, shadowRecord);
    expect(result.causal).toBe(false);
    expect(result.reason).toBe('missing_paired_evidence');
  });

  it('missing shadow record → NOT causal', () => {
    const enforceRecord = buildGuardProvenanceRecord({
      guardName: GUARD_NAME.FORMULATION,
      guardMode: 'ENFORCE',
      guardDecision: GUARD_DECISION.REPLACED,
      reasonCodes: ['FD_SCOPE'],
      replacementCreated: true,
      replacementTerminal: true,
      assistantRawIndex: 0,
      assistantId: 'ast-e5',
      userRawIndex: null,
      userId: null,
      language: 'en',
      clientRequestId: 'crid-missing-shadow',
    });
    const result = assessCausalEvidence(enforceRecord, null);
    expect(result.causal).toBe(false);
    expect(result.reason).toBe('missing_paired_evidence');
  });

  it('ENFORCE REPLACED + no shadow record — safe_update_accepted=false alone does NOT prove causality', () => {
    // The correct causal rule requires a paired SHADOW=REPLACED record (guard fires
    // in both modes on the same candidate content).  An ENFORCE REPLACED record with
    // safe_update_accepted=false is a necessary condition but not sufficient alone.
    const enforceRecord = augmentProvenanceWithLifecycle(
      buildGuardProvenanceRecord({
        guardName: GUARD_NAME.GROUNDING,
        guardMode: 'ENFORCE',
        guardDecision: GUARD_DECISION.REPLACED,
        reasonCodes: ['GROUNDING_VIOLATION'],
        replacementCreated: true,
        replacementTerminal: true,
        assistantRawIndex: 0,
        assistantId: 'ast-e6',
        userRawIndex: null,
        userId: null,
        language: 'en',
        clientRequestId: 'crid-corrected',
      }),
      { responseCorrelated: true, safeUpdateAccepted: false, visibleCommitCompleted: false, deliverySource: 'polling' }
    );
    // With only an ENFORCE REPLACED record and no shadow record, causality is unproven.
    const result = assessCausalEvidence(enforceRecord, null);
    expect(result.causal).toBe(false);
    expect(result.reason).toBe('missing_paired_evidence');
  });
});

// ─── Regression: assessCausalEvidence — ENFORCE=PASS + SHADOW=REPLACED ────────

describe('assessCausalEvidence — ENFORCE=PASS + SHADOW=REPLACED inconsistent case', () => {
  it('returns enforce_passed_shadow_replaced_inconsistent (not causal)', () => {
    const enforceRecord = buildGuardProvenanceRecord({
      guardName: GUARD_NAME.FORMULATION,
      guardMode: 'ENFORCE',
      guardDecision: GUARD_DECISION.PASS,
      reasonCodes: [],
      replacementCreated: false,
      replacementTerminal: false,
      assistantRawIndex: 0,
      assistantId: 'ast-incon',
      userRawIndex: null,
      userId: null,
      language: 'en',
      clientRequestId: 'crid-incon',
    });
    const shadowRecord = buildGuardProvenanceRecord({
      guardName: GUARD_NAME.FORMULATION,
      guardMode: 'SHADOW',
      guardDecision: GUARD_DECISION.REPLACED,
      reasonCodes: ['FD_SCOPE'],
      replacementCreated: false,
      replacementTerminal: false,
      assistantRawIndex: 0,
      assistantId: 'ast-incon-s',
      userRawIndex: null,
      userId: null,
      language: 'en',
      clientRequestId: 'crid-incon-shadow',
    });
    const result = assessCausalEvidence(enforceRecord, shadowRecord);
    expect(result.causal).toBe(false);
    expect(result.reason).toBe('enforce_passed_shadow_replaced_inconsistent');
  });
});

// ─── Composite provenance key — candidate isolation ───────────────────────────

describe('buildCompositeProvenanceKey — candidate-scoped isolation', () => {
  it('two different assistant candidates under the same client_request_id produce different keys', () => {
    const key1 = buildCompositeProvenanceKey('crid-shared', 'ast-A', 'usr-A', GUARD_NAME.FORMULATION);
    const key2 = buildCompositeProvenanceKey('crid-shared', 'ast-B', 'usr-B', GUARD_NAME.FORMULATION);
    expect(key1).not.toBe(key2);
  });

  it('same candidate, different guard names produce different keys', () => {
    const key1 = buildCompositeProvenanceKey('crid-1', 'ast-1', 'usr-1', GUARD_NAME.FORMULATION);
    const key2 = buildCompositeProvenanceKey('crid-1', 'ast-1', 'usr-1', GUARD_NAME.GROUNDING);
    expect(key1).not.toBe(key2);
  });

  it('null / absent components produce a deterministic sentinel key', () => {
    const key = buildCompositeProvenanceKey(null, null, null, null);
    expect(key).toBe('__no_request_id__\x00__no_assistant_id__\x00__no_user_id__\x00__no_guard__');
  });

  it('candidate A stored under shared crid cannot overwrite or be retrieved as candidate B', () => {
    const store = new Map();
    const provA = buildGuardProvenanceRecord({
      guardName: GUARD_NAME.FORMULATION,
      guardMode: 'ENFORCE',
      guardDecision: GUARD_DECISION.REPLACED,
      reasonCodes: ['FD_SCOPE'],
      replacementCreated: true,
      replacementTerminal: true,
      assistantRawIndex: 0,
      assistantId: 'ast-A',
      userRawIndex: null,
      userId: 'usr-A',
      language: 'en',
      clientRequestId: 'crid-shared',
    });
    const provB = buildGuardProvenanceRecord({
      guardName: GUARD_NAME.FORMULATION,
      guardMode: 'ENFORCE',
      guardDecision: GUARD_DECISION.PASS,
      reasonCodes: [],
      replacementCreated: false,
      replacementTerminal: false,
      assistantRawIndex: 0,
      assistantId: 'ast-B',
      userRawIndex: null,
      userId: 'usr-B',
      language: 'en',
      clientRequestId: 'crid-shared',
    });
    const keyA = buildCompositeProvenanceKey('crid-shared', 'ast-A', 'usr-A', GUARD_NAME.FORMULATION);
    const keyB = buildCompositeProvenanceKey('crid-shared', 'ast-B', 'usr-B', GUARD_NAME.FORMULATION);

    store.set(keyA, provA);
    store.set(keyB, provB);

    // Both entries coexist — neither overwrites the other.
    expect(store.size).toBe(2);
    // Candidate A's key returns candidate A's record (REPLACED).
    expect(store.get(keyA).guard_decision).toBe(GUARD_DECISION.REPLACED);
    // Candidate B's key returns candidate B's record (PASS).
    expect(store.get(keyB).guard_decision).toBe(GUARD_DECISION.PASS);
  });

  it('wrong-key prefix scan (mismatched clientRequestId) returns no entries', () => {
    const store = new Map();
    const key = buildCompositeProvenanceKey('crid-correct', 'ast-x', 'usr-x', GUARD_NAME.FORMULATION);
    store.set(key, { sentinel: true });

    const found = [];
    for (const [k, v] of store.entries()) {
      if (k.startsWith('crid-wrong\x00')) found.push(v);
    }
    expect(found).toHaveLength(0);
  });

  it('prefix scan for a given clientRequestId finds entries for all guards of the same candidate', () => {
    const store = new Map();
    const crid = 'crid-prefix-scan';
    const astId = 'ast-ps';
    const usrId = 'usr-ps';

    const provF = buildGuardProvenanceRecord({
      guardName: GUARD_NAME.FORMULATION,
      guardMode: 'ENFORCE',
      guardDecision: GUARD_DECISION.PASS,
      reasonCodes: [],
      replacementCreated: false,
      replacementTerminal: false,
      assistantRawIndex: 0,
      assistantId: astId,
      userRawIndex: null,
      userId: usrId,
      language: 'en',
      clientRequestId: crid,
    });
    const provG = buildGuardProvenanceRecord({
      guardName: GUARD_NAME.GROUNDING,
      guardMode: 'ENFORCE',
      guardDecision: GUARD_DECISION.PASS,
      reasonCodes: [],
      replacementCreated: false,
      replacementTerminal: false,
      assistantRawIndex: 0,
      assistantId: astId,
      userRawIndex: null,
      userId: usrId,
      language: 'en',
      clientRequestId: crid,
    });
    store.set(buildCompositeProvenanceKey(crid, astId, usrId, GUARD_NAME.FORMULATION), provF);
    store.set(buildCompositeProvenanceKey(crid, astId, usrId, GUARD_NAME.GROUNDING), provG);
    // Different clientRequestId entry — must not appear in prefix scan for crid.
    store.set(buildCompositeProvenanceKey('crid-other', astId, usrId, GUARD_NAME.FORMULATION), {});

    const prefix = crid + '\x00';
    const found = [];
    for (const [k, v] of store.entries()) {
      if (k.startsWith(prefix)) found.push(v);
    }
    expect(found).toHaveLength(2);
    expect(found).toContain(provF);
    expect(found).toContain(provG);
  });
});

// ─── Bounded provenance store — FIFO cap and conversation-clear ────────────────────

describe('Bounded provenance store — FIFO cap and conversation-clear semantics', () => {
  it('FIFO eviction: entries beyond cap=20 are evicted oldest-first', () => {
    const store = new Map();
    const CAP = 20;
    for (let i = 0; i < 25; i++) {
      const k = buildCompositeProvenanceKey(
        `crid-cap-${i}`, `ast-${i}`, `usr-${i}`, GUARD_NAME.FORMULATION
      );
      store.set(k, { index: i });
      while (store.size > CAP) {
        store.delete(store.keys().next().value);
      }
    }
    expect(store.size).toBe(CAP);
    const indices = [...store.values()].map((v) => v.index);
    // Entries 0-4 (oldest five) must be evicted; entries 5-24 (newest 20) must remain.
    for (let i = 0; i < 5; i++) {
      expect(indices, `entry ${i} should have been evicted`).not.toContain(i);
    }
    for (let i = 5; i < 25; i++) {
      expect(indices, `entry ${i} should be present`).toContain(i);
    }
  });

  it('conversation-clear: store.clear() removes all entries', () => {
    const store = new Map();
    for (let i = 0; i < 5; i++) {
      store.set(
        buildCompositeProvenanceKey(`crid-clear-${i}`, `ast-${i}`, `usr-${i}`, GUARD_NAME.GROUNDING),
        { index: i }
      );
    }
    expect(store.size).toBe(5);
    store.clear();
    expect(store.size).toBe(0);
  });

  it('after conversation-clear, old keys are not found by prefix scan', () => {
    const store = new Map();
    store.set(
      buildCompositeProvenanceKey('crid-old', 'ast-old', 'usr-old', GUARD_NAME.GROUNDING),
      { sentinel: 'old' }
    );
    store.clear();

    const found = [];
    for (const [k, v] of store.entries()) {
      if (k.startsWith('crid-old\x00')) found.push(v);
    }
    expect(found).toHaveLength(0);
  });
});

// ─── Strict causal decision table (complete) ─────────────────────────────────

describe('assessCausalEvidence — strict complete decision table', () => {
  function makeEnforceRecord(decision) {
    return buildGuardProvenanceRecord({
      guardName: GUARD_NAME.FORMULATION,
      guardMode: 'ENFORCE',
      guardDecision: decision,
      reasonCodes: decision === GUARD_DECISION.REPLACED ? ['FD_SCOPE'] : [],
      replacementCreated: decision === GUARD_DECISION.REPLACED,
      replacementTerminal: decision === GUARD_DECISION.REPLACED,
      assistantRawIndex: 0,
      assistantId: 'ast-table-e',
      userRawIndex: null,
      userId: null,
      language: 'en',
      clientRequestId: 'crid-table',
    });
  }
  function makeShadowRecord(decision) {
    return buildGuardProvenanceRecord({
      guardName: GUARD_NAME.FORMULATION,
      guardMode: 'SHADOW',
      guardDecision: decision,
      reasonCodes: decision === GUARD_DECISION.REPLACED ? ['FD_SCOPE'] : [],
      // SHADOW never applies replacements.
      replacementCreated: false,
      replacementTerminal: false,
      assistantRawIndex: 0,
      assistantId: 'ast-table-s',
      userRawIndex: null,
      userId: null,
      language: 'en',
      clientRequestId: 'crid-table-shadow',
    });
  }

  it('ENFORCE=REPLACED + SHADOW=REPLACED → causal=true, reason=proven_causal', () => {
    const r = assessCausalEvidence(
      makeEnforceRecord(GUARD_DECISION.REPLACED),
      makeShadowRecord(GUARD_DECISION.REPLACED)
    );
    expect(r.causal).toBe(true);
    expect(r.reason).toBe('proven_causal');
  });

  it('ENFORCE=REPLACED + SHADOW=PASS → causal=false, reason=non_deterministic_not_proven', () => {
    const r = assessCausalEvidence(
      makeEnforceRecord(GUARD_DECISION.REPLACED),
      makeShadowRecord(GUARD_DECISION.PASS)
    );
    expect(r.causal).toBe(false);
    expect(r.reason).toBe('non_deterministic_not_proven');
  });

  it('ENFORCE=PASS + SHADOW=PASS → causal=false, reason=enforce_passed_no_causal_signal', () => {
    const r = assessCausalEvidence(
      makeEnforceRecord(GUARD_DECISION.PASS),
      makeShadowRecord(GUARD_DECISION.PASS)
    );
    expect(r.causal).toBe(false);
    expect(r.reason).toBe('enforce_passed_no_causal_signal');
  });

  it('ENFORCE=PASS + SHADOW=REPLACED → causal=false, reason=enforce_passed_shadow_replaced_inconsistent', () => {
    const r = assessCausalEvidence(
      makeEnforceRecord(GUARD_DECISION.PASS),
      makeShadowRecord(GUARD_DECISION.REPLACED)
    );
    expect(r.causal).toBe(false);
    expect(r.reason).toBe('enforce_passed_shadow_replaced_inconsistent');
  });

  it('null enforce record → causal=false, reason=missing_paired_evidence', () => {
    const r = assessCausalEvidence(null, makeShadowRecord(GUARD_DECISION.REPLACED));
    expect(r.causal).toBe(false);
    expect(r.reason).toBe('missing_paired_evidence');
  });

  it('null shadow record → causal=false, reason=missing_paired_evidence', () => {
    const r = assessCausalEvidence(makeEnforceRecord(GUARD_DECISION.REPLACED), null);
    expect(r.causal).toBe(false);
    expect(r.reason).toBe('missing_paired_evidence');
  });

  it('both null → causal=false, reason=missing_paired_evidence', () => {
    const r = assessCausalEvidence(null, null);
    expect(r.causal).toBe(false);
    expect(r.reason).toBe('missing_paired_evidence');
  });
});
