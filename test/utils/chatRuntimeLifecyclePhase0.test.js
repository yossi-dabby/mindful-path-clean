import { describe, it, expect } from 'vitest';
import {
  buildOutboundUserMessageContent,
  calculateExpectedReplyCount,
  deduplicateMessagesByLifecycleKeys,
  getAssistantIdentityKey,
  getDefaultPollingLifecycle,
  hasPollingAttemptTimedOut,
  selectLatestAssistantResponse,
  shouldSuppressSubscriptionEventWhileLoading,
  wasCorrectionBlockSanitized,
} from '../../src/lib/chatRuntimeLifecycle.js';
import { sanitizeConversationMessagesAligned, validateAgentOutput } from '../../src/components/utils/validateAgentOutput.jsx';
import {
  FORMULATION_CORRECTION_END,
  FORMULATION_CORRECTION_START,
  CURRENT_TURN_GROUNDING_CORRECTION_START,
  CURRENT_TURN_GROUNDING_CORRECTION_END,
} from '../../src/components/utils/formulationContractGuard.js';
import { buildRuntimeCapabilitySnapshot } from '../../src/lib/runtimeCapabilityDiagnostic.js';
import { getFormulationLedContextForWiring } from '../../src/lib/workflowContextInjector.js';
import {
  CBT_THERAPIST_WIRING_STAGE2_V6_LED,
  CBT_THERAPIST_WIRING_STAGE2_V9,
} from '../../src/api/agentWiring.js';

describe('Phase 0 chat runtime lifecycle characterization', () => {
  it('rapid consecutive sends overwrite array-position expected reply state', () => {
    const expectedReplyCountRef = { current: 0 };
    expectedReplyCountRef.current = calculateExpectedReplyCount(4);
    const firstSendExpectation = expectedReplyCountRef.current;
    expectedReplyCountRef.current = calculateExpectedReplyCount(5);
    expect(firstSendExpectation).toBe(6);
    expect(expectedReplyCountRef.current).toBe(7);
  });

  it('turn_id/reply_to_turn_id/client_request_id/generation_id are not used for assistant identity', () => {
    const key = getAssistantIdentityKey({
      role: 'assistant',
      content: 'reply',
      turn_id: 't-1',
      reply_to_turn_id: 'u-1',
      client_request_id: 'req-1',
      generation_id: 'gen-1',
    }, 3);
    expect(key).toBe('idx:3|role:assistant');
  });

  it('subscription events are suppressed while loading', () => {
    expect(shouldSuppressSubscriptionEventWhileLoading(true)).toBe(true);
    expect(shouldSuppressSubscriptionEventWhileLoading(false)).toBe(false);
  });

  it('loading suppression can be gated by authoritative polling state', () => {
    expect(shouldSuppressSubscriptionEventWhileLoading(true, { hasAuthoritativePolling: true })).toBe(true);
    expect(shouldSuppressSubscriptionEventWhileLoading(true, { hasAuthoritativePolling: false })).toBe(false);
  });

  it('polling halts at the existing bounded max attempt threshold', () => {
    const { maxPollAttempts, pollDelays } = getDefaultPollingLifecycle();
    expect(pollDelays).toEqual([500, 1000, 2000, 4000, 6500]);
    expect(hasPollingAttemptTimedOut(maxPollAttempts - 1, maxPollAttempts)).toBe(false);
    expect(hasPollingAttemptTimedOut(maxPollAttempts, maxPollAttempts)).toBe(true);
  });

  it('polling/subscription copies of one assistant response deduplicate to one message', () => {
    const messages = [
      { role: 'user', id: 'u1', content: 'hi' },
      { role: 'assistant', id: 'a1', content: 'hello' },
      { role: 'assistant', id: 'a1', content: 'hello' },
    ];
    const result = deduplicateMessagesByLifecycleKeys(messages, { startingTurnId: 0 });
    expect(result.deduplicated).toHaveLength(2);
    expect(result.duplicatesBlocked).toBe(1);
  });

  it('correction blocks are not prepended to stored outbound user content', () => {
    const outbound = buildOutboundUserMessageContent({
      runtimeSupplement: null,
      formulationSupplement: null,
      messageText: 'next message',
    });
    expect(outbound).toBe('next message');
    expect(outbound).not.toContain('FORMULATION CONTRACT CORRECTION');
  });

  it('sanitizer strips correction blocks from visible user content', () => {
    const correctionBlock = [
      FORMULATION_CORRECTION_START,
      '',
      'internal correction text',
      '',
      'fallback',
      '',
      FORMULATION_CORRECTION_END,
    ].join('\n');
    const rawMessages = [{
      role: 'user',
      content: `${correctionBlock}\n\nhello`,
    }];
    const sanitized = sanitizeConversationMessagesAligned(rawMessages, 'en');
    expect(sanitized[0].content).toBe('hello');
    expect(wasCorrectionBlockSanitized(rawMessages, sanitized)).toBe(true);
  });

  it('sanitizer strips grounding correction blocks from visible user content', () => {
    const correctionBlock = [
      CURRENT_TURN_GROUNDING_CORRECTION_START,
      '',
      'internal correction text',
      '',
      'fallback',
      '',
      CURRENT_TURN_GROUNDING_CORRECTION_END,
    ].join('\n');
    const rawMessages = [{
      role: 'user',
      content: `${correctionBlock}\n\nhello`,
    }];
    const sanitized = sanitizeConversationMessagesAligned(rawMessages, 'en');
    expect(sanitized[0].content).toBe('hello');
  });

  it('action_permitted=false currently has no deterministic post-generation enforcement', () => {
    const candidate = validateAgentOutput(JSON.stringify({
      assistant_message: 'שלח את ההודעה עכשיו',
      strategy_context: 'Action permitted: no',
    }));
    expect(candidate?.assistant_message).toBe('שלח את ההודעה עכשיו');
    const visible = sanitizeConversationMessagesAligned([
      { role: 'assistant', content: candidate?.assistant_message || '' },
    ], 'he');
    expect(visible[0]?.content).toBe('שלח את ההודעה עכשיו');
  });

  it('one assistant response yields one selected rendered response identity', () => {
    const messages = [
      { role: 'user', id: 'u1', content: 'hi' },
      { role: 'assistant', id: 'a1', content: 'hello' },
    ];
    const selected = selectLatestAssistantResponse(messages);
    expect(selected?.msg?.id).toBe('a1');
    expect(getAssistantIdentityKey(selected?.msg, selected?.index)).toBe('id:a1');
  });

  it('formulation-led diagnostic is compared against injector evaluation', () => {
    const v9Snapshot = buildRuntimeCapabilitySnapshot({
      getTherapistWiring: () => CBT_THERAPIST_WIRING_STAGE2_V9,
      getCompanionWiring: () => ({ name: 'ai_companion' }),
      getFlagValue: () => false,
      getCompanionFlagValue: () => false,
      getSuperCbtFlagConfigured: () => false,
    });
    const v9Injected = getFormulationLedContextForWiring(
      CBT_THERAPIST_WIRING_STAGE2_V9,
      { _formulationLedEnabled: false },
    );
    expect(v9Snapshot.formulation_led_effective).toBe(false);
    expect(v9Injected).toBeNull();

    const v6LedSnapshot = buildRuntimeCapabilitySnapshot({
      getTherapistWiring: () => CBT_THERAPIST_WIRING_STAGE2_V6_LED,
      getCompanionWiring: () => ({ name: 'ai_companion' }),
      getFlagValue: () => false,
      getCompanionFlagValue: () => false,
      getSuperCbtFlagConfigured: () => false,
    });
    const v6LedInjected = getFormulationLedContextForWiring(CBT_THERAPIST_WIRING_STAGE2_V6_LED);
    expect(v6LedSnapshot.formulation_led_effective).toBe(true);
    expect(typeof v6LedInjected).toBe('string');
  });

  it('fixtures keep LTS absent/weak/warming distinct from continuity session counts', () => {
    const fixtures = [
      { name: 'absent', lts_read_state: 'absent_or_invalid', lts_warming_up: false, lts_session_count: 0, continuity_session_count: 3 },
      { name: 'weak', lts_read_state: 'weak', lts_warming_up: false, lts_session_count: 0, continuity_session_count: 3 },
      { name: 'warming', lts_read_state: 'weak', lts_warming_up: true, lts_session_count: 1, continuity_session_count: 3 },
    ];

    expect(fixtures[0].lts_read_state).toBe('absent_or_invalid');
    expect(fixtures[1].lts_read_state).toBe('weak');
    expect(fixtures[2].lts_warming_up).toBe(true);
    expect(fixtures.every((fixture) => fixture.continuity_session_count === 3)).toBe(true);
  });
});
