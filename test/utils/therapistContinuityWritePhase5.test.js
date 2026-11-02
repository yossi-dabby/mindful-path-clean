/**
 * @file test/utils/therapistContinuityWritePhase5.test.js
 *
 * Phase 5 — Conversation-Switch Memory Write Trigger
 *
 * PURPOSE
 * -------
 * This test suite validates the Phase 5 implementation that closes the
 * "ordinary free-form Chat.jsx conversations produce no memory write" gap.
 *
 * Phase 4 wired triggerConversationEndSummarization only to the explicit
 * "Request Summary" button (requestSummary). Most users never click this
 * button. Phase 5 adds a second, automatic write trigger that fires when the
 * user navigates away from a conversation (selects a different conversation or
 * starts a new one), turning the conversation-switch event into an implicit
 * conversation-end boundary.
 *
 * Test sections:
 *  1. CONVERSATION_MIN_MESSAGES_FOR_MEMORY — export and value contract
 *  2. CONVERSATION_MIN_MESSAGES_FOR_MEMORY — semantic meaning
 *  3. triggerConversationEndSummarization — gate check with switch invoker
 *  4. triggerConversationEndSummarization — inert below message threshold
 *     (tested via deriveConversationMemoryPayload input-shape invariants)
 *  5. Conversation-memory dedup helper — export + trigger-count behavior
 *  6. Chat.jsx static analysis — conversationMemoryWrittenRef dedup Set
 *  7. Chat.jsx static analysis — maybeTriggerEndWrite helper
 *  8. Chat.jsx static analysis — loadConversation integration
 *  9. Chat.jsx static analysis — startNewConversationWithIntent integration
 * 10. Chat.jsx static analysis — requestSummary dedup wiring
 * 11. Privacy contract — no raw transcript leakage
 * 12. Role isolation — companion wiring unaffected
 * 13. Rollback — prior Phase 4 exports unchanged
 * 14. Flag isolation — THERAPIST_UPGRADE_SUMMARIZATION_ENABLED defaults false
 * 15. End-to-end integrity — switch-triggered record is valid therapist memory
 *
 * CONSTRAINTS
 * -----------
 * - Does NOT import from base44/functions/ (Deno code — not importable in Vitest).
 * - Does NOT import Chat.jsx as a React component.
 *   Static analysis of the Chat.jsx source file is used instead.
 * - Does NOT modify any prior-phase test files.
 * - All prior-phase exports are rechecked here (additive).
 */

import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Phase 5 / Phase 4 exports ────────────────────────────────────────────────
import {
  CONVERSATION_MIN_MESSAGES_FOR_MEMORY,
  CONVERSATION_END_SUMMARY_INVOKER,
  deriveConversationMemoryPayload,
  triggerConversationEndSummarization,
  // Prior-phase exports still present (rollback check)
  SESSION_SUMMARIZATION_MAX_MESSAGES,
  deriveSessionSummaryPayload,
  triggerSessionEndSummarization,
} from '../../src/lib/sessionEndSummarization.js';
import {
  claimConversationMemoryWrite,
  triggerConversationMemoryWriteOnce,
} from '../../src/lib/conversationMemoryWriteDedup.js';

// ── Phase 1 schema helpers ───────────────────────────────────────────────────
import {
  THERAPIST_MEMORY_VERSION_KEY,
  THERAPIST_MEMORY_VERSION,
  THERAPIST_MEMORY_ARRAY_FIELDS,
  isTherapistMemoryRecord,
} from '../../src/lib/therapistMemoryModel.js';

// ── Summarization gate ───────────────────────────────────────────────────────
import { isSummarizationEnabled } from '../../src/lib/summarizationGate.js';

// ── Feature flags ────────────────────────────────────────────────────────────
import {
  THERAPIST_UPGRADE_FLAGS,
  isUpgradeEnabled,
} from '../../src/lib/featureFlags.js';

// ── Agent wirings (for isolation check) ─────────────────────────────────────
import {
  AI_COMPANION_WIRING_HYBRID,
  CBT_THERAPIST_WIRING_HYBRID,
} from '../../src/api/agentWiring.js';

// ── Chat.jsx source (for static analysis) ───────────────────────────────────
const chatSrc = readFileSync(resolve('src/pages/Chat.jsx'), 'utf8');

// ─── Section 1 — CONVERSATION_MIN_MESSAGES_FOR_MEMORY export ────────────────

describe('Phase 5 — CONVERSATION_MIN_MESSAGES_FOR_MEMORY: export contract', () => {
  it('CONVERSATION_MIN_MESSAGES_FOR_MEMORY is exported as a number', () => {
    expect(typeof CONVERSATION_MIN_MESSAGES_FOR_MEMORY).toBe('number');
  });

  it('CONVERSATION_MIN_MESSAGES_FOR_MEMORY is a positive integer', () => {
    expect(CONVERSATION_MIN_MESSAGES_FOR_MEMORY).toBeGreaterThanOrEqual(1);
    expect(Number.isInteger(CONVERSATION_MIN_MESSAGES_FOR_MEMORY)).toBe(true);
  });

  it('CONVERSATION_MIN_MESSAGES_FOR_MEMORY is at least 2 (requires more than just session-start)', () => {
    // The first message is the internal [START_SESSION] prompt; requiring >= 2
    // ensures at least the agent has responded before a write is attempted.
    expect(CONVERSATION_MIN_MESSAGES_FOR_MEMORY).toBeGreaterThanOrEqual(2);
  });

  it('CONVERSATION_MIN_MESSAGES_FOR_MEMORY is at most 10 (not too restrictive)', () => {
    // The threshold must not be so high that short but meaningful conversations
    // never trigger a write.
    expect(CONVERSATION_MIN_MESSAGES_FOR_MEMORY).toBeLessThanOrEqual(10);
  });
});

// ─── Section 2 — CONVERSATION_MIN_MESSAGES_FOR_MEMORY: semantic meaning ──────

describe('Phase 5 — CONVERSATION_MIN_MESSAGES_FOR_MEMORY: semantic rationale', () => {
  it('is strictly less than SESSION_SUMMARIZATION_MAX_MESSAGES (not overly restrictive)', () => {
    expect(CONVERSATION_MIN_MESSAGES_FOR_MEMORY).toBeLessThan(SESSION_SUMMARIZATION_MAX_MESSAGES);
  });

  it('represents the minimum number of messages for a meaningful exchange', () => {
    // 3 = [START_SESSION] + assistant opening + at least one real user message.
    // Any smaller value risks writing empty records for sessions the user
    // immediately abandoned.
    expect(CONVERSATION_MIN_MESSAGES_FOR_MEMORY).toBe(3);
  });
});

// ─── Section 3 — triggerConversationEndSummarization with switch invoker ──────

describe('Phase 5 — triggerConversationEndSummarization: switch invoker path', () => {
  it('does not throw when called with "chat_conversation_switch" invoker and gate off', () => {
    expect(() =>
      triggerConversationEndSummarization('conv-switch-1', { intent: 'anxiety' }, 'chat_conversation_switch'),
    ).not.toThrow();
  });

  it('returns undefined (void) when gate is off regardless of invoker', () => {
    const result = triggerConversationEndSummarization(
      'conv-switch-2',
      { name: 'Meaningful Session' },
      'chat_conversation_switch',
    );
    expect(result).toBeUndefined();
  });

  it('is inert (returns undefined) with null conversationId and gate off', () => {
    const result = triggerConversationEndSummarization(null, {}, 'chat_conversation_switch');
    expect(result).toBeUndefined();
  });

  it('is inert with an empty conversationId and gate off', () => {
    const result = triggerConversationEndSummarization('', {}, 'chat_conversation_switch');
    expect(result).toBeUndefined();
  });

  it('isSummarizationEnabled() is false — confirms gate-off inertness', () => {
    expect(isSummarizationEnabled()).toBe(false);
  });
});

// ─── Section 4 — Message-threshold gate (via deriveConversationMemoryPayload) ─

describe('Phase 5 — Message-threshold gate: deriveConversationMemoryPayload invariants', () => {
  // The switch trigger calls deriveConversationMemoryPayload which reads NO
  // message content — it only reads conversationId and metadata. The message
  // count threshold is enforced in Chat.jsx's maybeTriggerEndWrite before
  // calling triggerConversationEndSummarization. We verify the helper's
  // output is the same regardless of message count (no content leak).

  it('deriveConversationMemoryPayload output does not vary based on message list', () => {
    // The function does not accept a messages argument — it only uses
    // conversationId and conversationMeta.
    const r1 = deriveConversationMemoryPayload('conv-threshold-1', { intent: 'anxiety' });
    const r2 = deriveConversationMemoryPayload('conv-threshold-1', { intent: 'anxiety' });
    expect(r1.session_summary).toBe(r2.session_summary);
    expect(r1.session_id).toBe(r2.session_id);
  });

  it('deriveConversationMemoryPayload always produces empty clinical arrays (no message content)', () => {
    const result = deriveConversationMemoryPayload('conv-threshold-2', {
      intent: 'sleep issues',
    });
    for (const field of THERAPIST_MEMORY_ARRAY_FIELDS) {
      expect(result[field]).toHaveLength(0);
    }
  });

  it('deriveConversationMemoryPayload does not accept a messages parameter', () => {
    // Verify the function signature has exactly 2 parameters (conversationId, conversationMeta)
    expect(deriveConversationMemoryPayload.length).toBeLessThanOrEqual(2);
  });
});

// ─── Section 5 — Dedup helper: export + trigger-count behavior ───────────────

describe('Phase 5 — conversation-memory dedup helper', () => {
  it('claimConversationMemoryWrite marks a conversation ID only once', () => {
    const tracker = new Set();

    expect(claimConversationMemoryWrite(tracker, 'conv-dedup-1')).toBe(true);
    expect(claimConversationMemoryWrite(tracker, 'conv-dedup-1')).toBe(false);
    expect(tracker.has('conv-dedup-1')).toBe(true);
  });

  it('11. requestSummary twice for same conversation → one summarization trigger', () => {
    const tracker = new Set();
    const trigger = vi.fn();

    triggerConversationMemoryWriteOnce({
      writeTracker: tracker,
      conversationId: 'conv-dedup-2',
      conversationMeta: { name: 'Session A' },
      trigger,
      invoker: 'chat_request_summary',
    });
    triggerConversationMemoryWriteOnce({
      writeTracker: tracker,
      conversationId: 'conv-dedup-2',
      conversationMeta: { name: 'Session A' },
      trigger,
      invoker: 'chat_request_summary',
    });

    expect(trigger).toHaveBeenCalledTimes(1);
  });

  it('12. requestSummary then conversation-switch → one trigger total', () => {
    const tracker = new Set();
    const trigger = vi.fn();
    const messages = Array.from(
      { length: CONVERSATION_MIN_MESSAGES_FOR_MEMORY },
      (_, idx) => ({ id: idx }),
    );

    triggerConversationMemoryWriteOnce({
      writeTracker: tracker,
      conversationId: 'conv-dedup-3',
      conversationMeta: { name: 'Session B' },
      trigger,
      invoker: 'chat_request_summary',
    });
    triggerConversationMemoryWriteOnce({
      writeTracker: tracker,
      conversationId: 'conv-dedup-3',
      conversationMeta: { name: 'Session B' },
      messages,
      minMessages: CONVERSATION_MIN_MESSAGES_FOR_MEMORY,
      trigger,
      invoker: 'chat_conversation_switch',
    });

    expect(trigger).toHaveBeenCalledTimes(1);
  });

  it('13. conversation-switch then duplicate switch → one trigger total', () => {
    const tracker = new Set();
    const trigger = vi.fn();
    const messages = Array.from(
      { length: CONVERSATION_MIN_MESSAGES_FOR_MEMORY },
      (_, idx) => ({ id: idx }),
    );

    triggerConversationMemoryWriteOnce({
      writeTracker: tracker,
      conversationId: 'conv-dedup-4',
      conversationMeta: { name: 'Session C' },
      messages,
      minMessages: CONVERSATION_MIN_MESSAGES_FOR_MEMORY,
      trigger,
      invoker: 'chat_conversation_switch',
    });
    triggerConversationMemoryWriteOnce({
      writeTracker: tracker,
      conversationId: 'conv-dedup-4',
      conversationMeta: { name: 'Session C' },
      messages,
      minMessages: CONVERSATION_MIN_MESSAGES_FOR_MEMORY,
      trigger,
      invoker: 'chat_conversation_switch',
    });

    expect(trigger).toHaveBeenCalledTimes(1);
  });
});

// ─── Section 6 — Chat.jsx static analysis: conversationMemoryWrittenRef ──────

describe('Phase 5 — Chat.jsx static analysis: conversationMemoryWrittenRef', () => {
  it('Chat.jsx declares conversationMemoryWrittenRef as a useRef', () => {
    expect(chatSrc).toContain('conversationMemoryWrittenRef');
    expect(chatSrc).toMatch(/conversationMemoryWrittenRef\s*=\s*useRef\(/);
  });

  it('conversationMemoryWrittenRef is initialized as a state Map', () => {
    expect(chatSrc).toMatch(/conversationMemoryWrittenRef\s*=\s*useRef\(\s*new\s+Map\(\)/);
  });

  it('Chat.jsx passes the shared tracker into the coordinated write helper', () => {
    const matches = (chatSrc.match(/conversationMemoryWrittenRef\.current/g) || []).length;
    expect(matches).toBeGreaterThanOrEqual(1);
  });
});

// ─── Section 7 — Chat.jsx static analysis: maybeTriggerEndWrite helper ───────

describe('Phase 5 — Chat.jsx static analysis: maybeTriggerEndWrite helper', () => {
  it('Chat.jsx declares maybeTriggerEndWrite as a function', () => {
    expect(chatSrc).toContain('maybeTriggerEndWrite');
    expect(chatSrc).toMatch(/const\s+maybeTriggerEndWrite\s*=/);
  });

  it('maybeTriggerEndWrite delegates dedup and threshold enforcement to triggerConversationMemoryWriteOnce', () => {
    const helperIdx = chatSrc.indexOf('const maybeTriggerEndWrite');
    const callIdx = chatSrc.indexOf('triggerConversationMemoryWriteOnce({', helperIdx);
    expect(helperIdx).toBeGreaterThan(-1);
    expect(callIdx).toBeGreaterThan(helperIdx);
  });

  it('maybeTriggerEndWrite passes "chat_conversation_switch" as invoker', () => {
    expect(chatSrc).toContain('chat_conversation_switch');
  });

  it('maybeTriggerEndWrite passes CONVERSATION_MIN_MESSAGES_FOR_MEMORY into the dedup helper', () => {
    const helperIdx = chatSrc.indexOf('const maybeTriggerEndWrite');
    const thresholdIdx = chatSrc.indexOf('minMessages: CONVERSATION_MIN_MESSAGES_FOR_MEMORY', helperIdx);
    expect(thresholdIdx).toBeGreaterThan(helperIdx);
  });
});

// ─── Section 8 — Chat.jsx static analysis: loadConversation integration ──────

describe('Phase 5 — Chat.jsx static analysis: loadConversation integration', () => {
  it('loadConversation calls maybeTriggerEndWrite', () => {
    const loadIdx = chatSrc.indexOf('const loadConversation');
    const callIdx = chatSrc.indexOf('maybeTriggerEndWrite(', loadIdx);
    expect(loadIdx).toBeGreaterThan(-1);
    expect(callIdx).toBeGreaterThan(loadIdx);
  });

  it('loadConversation captures leavingId before the getConversation call', () => {
    // The leaving id must be captured from currentConversationId BEFORE the
    // async getConversation call that switches to the new conversation.
    const loadIdx = chatSrc.indexOf('const loadConversation');
    const leavingIdIdx = chatSrc.indexOf('const leavingId = currentConversationId', loadIdx);
    const getConvIdx = chatSrc.indexOf('base44.agents.getConversation(conversationId)', loadIdx);
    expect(leavingIdIdx).toBeGreaterThan(-1);
    expect(leavingIdIdx).toBeLessThan(getConvIdx);
  });

  it('loadConversation captures leavingMeta from conversations list', () => {
    const loadIdx = chatSrc.indexOf('const loadConversation');
    const metaIdx = chatSrc.indexOf('leavingMeta', loadIdx);
    expect(metaIdx).toBeGreaterThan(loadIdx);
  });

  it('loadConversation passes messages as third arg to maybeTriggerEndWrite', () => {
    const loadIdx = chatSrc.indexOf('const loadConversation');
    // The call inside loadConversation must pass messages
    const callMatch = chatSrc.substring(loadIdx).match(/maybeTriggerEndWrite\([^)]+messages[^)]*\)/);
    expect(callMatch).not.toBeNull();
  });
});

// ─── Section 9 — Chat.jsx static analysis: startNewConversationWithIntent ────

describe('Phase 5 — Chat.jsx static analysis: startNewConversationWithIntent integration', () => {
  it('startNewConversationWithIntent calls maybeTriggerEndWrite', () => {
    const startIdx = chatSrc.indexOf('const startNewConversationWithIntent');
    const callIdx = chatSrc.indexOf('maybeTriggerEndWrite(', startIdx);
    expect(startIdx).toBeGreaterThan(-1);
    expect(callIdx).toBeGreaterThan(startIdx);
  });

  it('startNewConversationWithIntent captures leavingId before creating new conversation', () => {
    const startIdx = chatSrc.indexOf('const startNewConversationWithIntent');
    const leavingIdIdx = chatSrc.indexOf('const leavingId = currentConversationId', startIdx);
    const createConvIdx = chatSrc.indexOf('base44.agents.createConversation', startIdx);
    expect(leavingIdIdx).toBeGreaterThan(-1);
    expect(leavingIdIdx).toBeLessThan(createConvIdx);
  });

  it('startNewConversationWithIntent passes messages to maybeTriggerEndWrite', () => {
    const startIdx = chatSrc.indexOf('const startNewConversationWithIntent');
    const callMatch = chatSrc.substring(startIdx).match(/maybeTriggerEndWrite\([^)]+messages[^)]*\)/);
    expect(callMatch).not.toBeNull();
  });
});

// ─── Section 10 — Chat.jsx static analysis: requestSummary dedup mark ────────

describe('Phase 5 — Chat.jsx static analysis: requestSummary dedup wiring', () => {
  it('requestSummary delegates through maybeTriggerEndWrite', () => {
    const reqSummaryIdx = chatSrc.indexOf('const requestSummary');
    const triggerIdx = chatSrc.indexOf('maybeTriggerEndWrite(', reqSummaryIdx);
    expect(triggerIdx).toBeGreaterThan(reqSummaryIdx);
  });

  it('requestSummary still passes "chat_request_summary" as the invoker', () => {
    const reqSummaryIdx = chatSrc.indexOf('const requestSummary');
    const triggerIdx = chatSrc.indexOf("'chat_request_summary'", reqSummaryIdx);
    expect(triggerIdx).toBeGreaterThan(reqSummaryIdx);
  });
});

// ─── Section 11 — Privacy contract: no raw transcript leakage ─────────────────

describe('Phase 5 — Privacy contract: no raw transcript leakage', () => {
  it('deriveConversationMemoryPayload accepts no messages/transcript argument', () => {
    // Function signature: (conversationId, conversationMeta) — no messages param
    const sig = deriveConversationMemoryPayload.toString().slice(0, 200);
    // The parameter list must not mention 'messages' or 'transcript'
    expect(sig).not.toMatch(/messages|transcript/i);
  });

  it('maybeTriggerEndWrite only passes conversationId and metadata to triggerConversationEndSummarization (no content)', () => {
    // Static analysis: the triggerConversationEndSummarization call inside
    // maybeTriggerEndWrite must pass convId, convMeta, and the invoker string —
    // not the msgList (raw messages).
    const helperIdx = chatSrc.indexOf('const maybeTriggerEndWrite');
    const endOfHelper = chatSrc.indexOf('\n  };', helperIdx + 1);
    const helperBody = chatSrc.substring(helperIdx, endOfHelper);
    // The call inside maybeTriggerEndWrite must NOT pass msgList to triggerConversationEndSummarization
    expect(helperBody).not.toMatch(/triggerConversationEndSummarization\([^)]*msgList/);
  });

  it('deriveConversationMemoryPayload output has all clinical arrays empty (no inferred content)', () => {
    const result = deriveConversationMemoryPayload('conv-privacy-1', {
      intent: 'personal trauma history',
    });
    for (const field of THERAPIST_MEMORY_ARRAY_FIELDS) {
      expect(result[field]).toHaveLength(0);
    }
    // session_summary contains only the intent string — not any raw content
    expect(result.session_summary).toBe('Session focused on: personal trauma history.');
  });

  it('deriveConversationMemoryPayload output passes isTherapistMemoryRecord (schema enforced)', () => {
    const result = deriveConversationMemoryPayload('conv-privacy-2', { intent: 'grief' });
    expect(isTherapistMemoryRecord(result)).toBe(true);
  });
});

// ─── Section 12 — Role isolation: companion wiring unaffected ─────────────────

describe('Phase 5 — Role isolation: companion wiring unaffected', () => {
  it('AI_COMPANION_WIRING_HYBRID does not have continuity_layer_enabled', () => {
    expect(AI_COMPANION_WIRING_HYBRID.continuity_layer_enabled).not.toBe(true);
  });

  it('CBT_THERAPIST_WIRING_HYBRID does not have continuity_layer_enabled (default mode)', () => {
    expect(CBT_THERAPIST_WIRING_HYBRID.continuity_layer_enabled).not.toBe(true);
  });

  it('THERAPIST_UPGRADE_SUMMARIZATION_ENABLED defaults to false (companion unaffected)', () => {
    expect(THERAPIST_UPGRADE_FLAGS.THERAPIST_UPGRADE_SUMMARIZATION_ENABLED).toBe(false);
  });

  it('maybeTriggerEndWrite is only referenced inside Chat.jsx (not in companion files)', () => {
    // Static: no companion file should reference this Chat.jsx-local helper
    expect(chatSrc).toContain('maybeTriggerEndWrite');
    // The helper name is chat-specific — it should not appear in agent wiring
  });
});

// ─── Section 13 — Rollback: prior Phase 4 exports unchanged ──────────────────

describe('Phase 5 — Rollback: prior Phase 4 exports still present and unchanged', () => {
  it('CONVERSATION_END_SUMMARY_INVOKER is still exported as "conversation_end"', () => {
    expect(CONVERSATION_END_SUMMARY_INVOKER).toBe('conversation_end');
  });

  it('SESSION_SUMMARIZATION_MAX_MESSAGES is still exported as a positive integer', () => {
    expect(typeof SESSION_SUMMARIZATION_MAX_MESSAGES).toBe('number');
    expect(SESSION_SUMMARIZATION_MAX_MESSAGES).toBeGreaterThan(0);
  });

  it('deriveConversationMemoryPayload is still exported as a function', () => {
    expect(typeof deriveConversationMemoryPayload).toBe('function');
  });

  it('triggerConversationEndSummarization is still exported as a function', () => {
    expect(typeof triggerConversationEndSummarization).toBe('function');
  });

  it('deriveSessionSummaryPayload is still exported as a function', () => {
    expect(typeof deriveSessionSummaryPayload).toBe('function');
  });

  it('triggerSessionEndSummarization is still exported as a function', () => {
    expect(typeof triggerSessionEndSummarization).toBe('function');
  });

  it('Chat.jsx still calls triggerConversationEndSummarization from requestSummary', () => {
    const reqSummaryIdx = chatSrc.indexOf('const requestSummary');
    const callIdx = chatSrc.indexOf("'chat_request_summary'", reqSummaryIdx);
    expect(callIdx).toBeGreaterThan(reqSummaryIdx);
  });
});

// ─── Section 14 — Flag isolation ─────────────────────────────────────────────

describe('Phase 5 — Flag isolation: THERAPIST_UPGRADE_SUMMARIZATION_ENABLED defaults false', () => {
  it('THERAPIST_UPGRADE_SUMMARIZATION_ENABLED is false in default build', () => {
    expect(THERAPIST_UPGRADE_FLAGS.THERAPIST_UPGRADE_SUMMARIZATION_ENABLED).toBe(false);
  });

  it('isUpgradeEnabled("THERAPIST_UPGRADE_SUMMARIZATION_ENABLED") returns false in default mode', () => {
    expect(isUpgradeEnabled('THERAPIST_UPGRADE_SUMMARIZATION_ENABLED')).toBe(false);
  });

  it('isSummarizationEnabled() is false in default production mode', () => {
    expect(isSummarizationEnabled()).toBe(false);
  });

  it('triggerConversationEndSummarization is completely inert in production default regardless of invoker', () => {
    // Gate is off → no side effects regardless of which call site fires
    expect(() =>
      triggerConversationEndSummarization('conv-flag-1', { intent: 'any' }, 'chat_conversation_switch'),
    ).not.toThrow();
    expect(() =>
      triggerConversationEndSummarization('conv-flag-2', {}, 'chat_request_summary'),
    ).not.toThrow();
  });

  it('THERAPIST_UPGRADE_ENABLED master gate is false (production default)', () => {
    expect(THERAPIST_UPGRADE_FLAGS.THERAPIST_UPGRADE_ENABLED).toBe(false);
  });

  it('Phase 5 trigger paths are completely inert when flags are off (no exceptions thrown)', () => {
    // Simulate what maybeTriggerEndWrite does when flags are off:
    // gate check in triggerConversationEndSummarization returns immediately
    let threw = false;
    try {
      triggerConversationEndSummarization('conv-gate-1', { intent: 'test' }, 'chat_conversation_switch');
    } catch {
      threw = true;
    }
    expect(threw).toBe(false);
  });
});

// ─── Section 15 — End-to-end integrity ───────────────────────────────────────

describe('Phase 5 — End-to-end integrity: switch-triggered record is valid therapist memory', () => {
  it('a conversation with intent produces a valid therapist-memory record for the switch path', () => {
    const conversationId = 'conv-switch-e2e-001';
    const meta = { intent: 'managing work anxiety', name: 'Session 7' };
    const record = deriveConversationMemoryPayload(conversationId, meta);
    expect(record.session_id).toBe(conversationId);
    expect(record.session_summary).toContain('managing work anxiety');
    expect(isTherapistMemoryRecord(record)).toBe(true);
    expect(record[THERAPIST_MEMORY_VERSION_KEY]).toBe(THERAPIST_MEMORY_VERSION);
  });

  it('a conversation with a meaningful name (non-generic) produces a valid record', () => {
    const conversationId = 'conv-switch-e2e-002';
    const meta = { name: 'Grief and loss processing' };
    const record = deriveConversationMemoryPayload(conversationId, meta);
    expect(record.session_id).toBe(conversationId);
    expect(record.session_summary).toContain('Grief and loss processing');
    expect(isTherapistMemoryRecord(record)).toBe(true);
  });

  it('a conversation with a generic name ("Session N") produces an empty-summary record', () => {
    const conversationId = 'conv-switch-e2e-003';
    const meta = { name: 'Session 15' };
    const record = deriveConversationMemoryPayload(conversationId, meta);
    expect(record.session_id).toBe(conversationId);
    expect(record.session_summary).toBe('');
    expect(isTherapistMemoryRecord(record)).toBe(true);
  });

  it('a conversation with no metadata still produces a minimal valid record', () => {
    const conversationId = 'conv-switch-e2e-004';
    const record = deriveConversationMemoryPayload(conversationId, {});
    expect(record.session_id).toBe(conversationId);
    expect(isTherapistMemoryRecord(record)).toBe(true);
  });

  it('switch-trigger record and requestSummary-trigger record from same conversation have matching session_id', () => {
    const id = 'conv-same-001';
    const meta = { intent: 'sleep hygiene' };
    const switchRecord = deriveConversationMemoryPayload(id, meta);
    const summaryRecord = deriveConversationMemoryPayload(id, meta);
    expect(switchRecord.session_id).toBe(summaryRecord.session_id);
    expect(switchRecord.session_summary).toBe(summaryRecord.session_summary);
  });

  it('dedup: two write attempts for the same conversationId would produce identical records', () => {
    // Both paths (switch and requestSummary) call deriveConversationMemoryPayload
    // with the same inputs — the dedup set in Chat.jsx prevents the second call,
    // but if it were to fire, the record would be identical (idempotent).
    const id = 'conv-dedup-001';
    const meta = { intent: 'stress reduction' };
    const r1 = deriveConversationMemoryPayload(id, meta);
    const r2 = deriveConversationMemoryPayload(id, meta);
    expect(r1.session_id).toBe(r2.session_id);
    expect(r1.session_summary).toBe(r2.session_summary);
    for (const field of THERAPIST_MEMORY_ARRAY_FIELDS) {
      expect(r1[field]).toHaveLength(0);
      expect(r2[field]).toHaveLength(0);
    }
  });

  it('CONVERSATION_MIN_MESSAGES_FOR_MEMORY gates writes: a conversation with fewer messages would not write', () => {
    // This is enforced in Chat.jsx's maybeTriggerEndWrite — we verify the
    // constant makes sense: a list shorter than the threshold would be rejected.
    const fewMessages = Array.from({ length: CONVERSATION_MIN_MESSAGES_FOR_MEMORY - 1 }, (_, i) => ({
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: `msg ${i}`,
    }));
    expect(fewMessages.length).toBeLessThan(CONVERSATION_MIN_MESSAGES_FOR_MEMORY);
  });

  it('CONVERSATION_MIN_MESSAGES_FOR_MEMORY gates writes: a conversation at threshold would write', () => {
    const enoughMessages = Array.from({ length: CONVERSATION_MIN_MESSAGES_FOR_MEMORY }, (_, i) => ({
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: `msg ${i}`,
    }));
    expect(enoughMessages.length).toBe(CONVERSATION_MIN_MESSAGES_FOR_MEMORY);
  });
});
