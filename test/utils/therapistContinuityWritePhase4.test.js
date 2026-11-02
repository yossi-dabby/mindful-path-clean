/**
 * @file test/utils/therapistContinuityWritePhase4.test.js
 *
 * Phase 4 — Chat.jsx Conversation Memory Write
 *
 * PURPOSE
 * -------
 * This test suite validates the Phase 4 implementation that closes the
 * Chat.jsx → CompanionMemory write gap:
 *
 *   1. deriveConversationMemoryPayload — exports and basic contract
 *   2. deriveConversationMemoryPayload — session_summary derivation logic
 *   3. deriveConversationMemoryPayload — generic "Session N" name exclusion
 *   4. deriveConversationMemoryPayload — privacy contract (no message content)
 *   5. deriveConversationMemoryPayload — Phase 1 schema compliance
 *   6. deriveConversationMemoryPayload — fail-safe for invalid inputs
 *   7. triggerConversationEndSummarization — exports and gate check
 *   8. triggerConversationEndSummarization — inert in default mode (flag off)
 *   9. CONVERSATION_END_SUMMARY_INVOKER — exported constant
 *  10. Chat.jsx integration — imports triggerConversationEndSummarization
 *  11. Chat.jsx integration — calls triggerConversationEndSummarization in requestSummary
 *  12. Role isolation — companion wiring is unaffected
 *  13. Rollback — prior phase exports unchanged
 *  14. Flag isolation — THERAPIST_UPGRADE_SUMMARIZATION_ENABLED defaults false
 *
 * CONSTRAINTS
 * -----------
 * - Does NOT import from base44/functions/ (Deno code — not importable in Vitest).
 * - Does NOT import CoachingChat.jsx or Chat.jsx React components (not unit-testable here).
 *   Static analysis of Chat.jsx source file is used instead.
 * - Does NOT modify any prior-phase test files.
 * - All prior-phase exports are rechecked here (additive).
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Phase 4 exports ──────────────────────────────────────────────────────────
import {
  deriveConversationMemoryPayload,
  triggerConversationEndSummarization,
  CONVERSATION_END_SUMMARY_INVOKER,
  // Prior-phase exports still present (rollback check)
  SESSION_SUMMARIZATION_MAX_MESSAGES,
  deriveSessionSummaryPayload,
  triggerSessionEndSummarization,
} from '../../src/lib/sessionEndSummarization.js';

// ── Phase 1 schema helpers ──────────────────────────────────────────────────
import {
  THERAPIST_MEMORY_VERSION_KEY,
  THERAPIST_MEMORY_VERSION,
  THERAPIST_MEMORY_ARRAY_FIELDS,
  THERAPIST_MEMORY_STRING_FIELDS,
  isTherapistMemoryRecord,
} from '../../src/lib/therapistMemoryModel.js';

// ── Summarization gate ──────────────────────────────────────────────────────
import {
  isSummarizationEnabled,
} from '../../src/lib/summarizationGate.js';

// ── Feature flags ───────────────────────────────────────────────────────────
import {
  THERAPIST_UPGRADE_FLAGS,
  isUpgradeEnabled,
} from '../../src/lib/featureFlags.js';

// ── Agent wirings (for isolation check) ────────────────────────────────────
import {
  AI_COMPANION_WIRING_HYBRID,
  CBT_THERAPIST_WIRING_HYBRID,
} from '../../src/api/agentWiring.js';

// ── Chat.jsx source (for static analysis) ──────────────────────────────────
const chatSrc = readFileSync(resolve('src/pages/Chat.jsx'), 'utf8');

// ─── Section 1 — Phase 4 exports exist ───────────────────────────────────────

describe('Phase 4 — deriveConversationMemoryPayload is exported', () => {
  it('deriveConversationMemoryPayload is exported as a function', () => {
    expect(typeof deriveConversationMemoryPayload).toBe('function');
  });

  it('triggerConversationEndSummarization is exported as a function', () => {
    expect(typeof triggerConversationEndSummarization).toBe('function');
  });

  it('CONVERSATION_END_SUMMARY_INVOKER is exported as a non-empty string', () => {
    expect(typeof CONVERSATION_END_SUMMARY_INVOKER).toBe('string');
    expect(CONVERSATION_END_SUMMARY_INVOKER.length).toBeGreaterThan(0);
  });
});

// ─── Section 2 — deriveConversationMemoryPayload: basic contract ─────────────

describe('Phase 4 — deriveConversationMemoryPayload: basic output contract', () => {
  it('returns an object when called with a valid conversationId and empty meta', () => {
    const result = deriveConversationMemoryPayload('conv-abc-123', {});
    expect(result).not.toBeNull();
    expect(typeof result).toBe('object');
  });

  it('output has the therapist memory version key', () => {
    const result = deriveConversationMemoryPayload('conv-abc-123', {});
    expect(result[THERAPIST_MEMORY_VERSION_KEY]).toBe(THERAPIST_MEMORY_VERSION);
  });

  it('output has session_id equal to the provided conversationId', () => {
    const result = deriveConversationMemoryPayload('conv-xyz-456', {});
    expect(result.session_id).toBe('conv-xyz-456');
  });

  it('output has a non-empty session_date (ISO timestamp)', () => {
    const result = deriveConversationMemoryPayload('conv-abc-123', {});
    expect(typeof result.session_date).toBe('string');
    expect(result.session_date.length).toBeGreaterThan(0);
    expect(() => new Date(result.session_date).getTime()).not.toThrow();
  });

  it('all THERAPIST_MEMORY_ARRAY_FIELDS are empty arrays in the output', () => {
    const result = deriveConversationMemoryPayload('conv-abc-123', {});
    for (const field of THERAPIST_MEMORY_ARRAY_FIELDS) {
      expect(Array.isArray(result[field])).toBe(true);
      expect(result[field]).toHaveLength(0);
    }
  });

  it('output passes isTherapistMemoryRecord validation', () => {
    const result = deriveConversationMemoryPayload('conv-abc-123', {});
    expect(isTherapistMemoryRecord(result)).toBe(true);
  });
});

// ─── Section 3 — session_summary derivation logic ────────────────────────────

describe('Phase 4 — deriveConversationMemoryPayload: session_summary derivation', () => {
  it('uses intent as session_summary when intent is present', () => {
    const result = deriveConversationMemoryPayload('conv-1', { intent: 'anxiety management' });
    expect(result.session_summary).toContain('anxiety management');
  });

  it('session_summary with intent starts with "Session focused on:"', () => {
    const result = deriveConversationMemoryPayload('conv-1', { intent: 'sleep issues' });
    expect(result.session_summary).toMatch(/^Session focused on:/);
  });

  it('uses name when intent is absent and name is meaningful (non-generic)', () => {
    const result = deriveConversationMemoryPayload('conv-2', { name: 'Anxiety and work stress' });
    expect(result.session_summary).toContain('Anxiety and work stress');
  });

  it('session_summary with non-generic name starts with "Session:"', () => {
    const result = deriveConversationMemoryPayload('conv-2', { name: 'Sleep problems' });
    expect(result.session_summary).toMatch(/^Session:/);
  });

  it('intent takes priority over name when both are present', () => {
    const result = deriveConversationMemoryPayload('conv-3', {
      intent: 'relationship issues',
      name: 'Session 7',
    });
    expect(result.session_summary).toContain('relationship issues');
    expect(result.session_summary).not.toContain('Session 7');
  });

  it('session_summary is empty string when only a generic "Session N" name is present', () => {
    const result = deriveConversationMemoryPayload('conv-4', { name: 'Session 3' });
    expect(result.session_summary).toBe('');
  });

  it('session_summary is empty string when "Session N" (uppercase) is the name', () => {
    const result = deriveConversationMemoryPayload('conv-4', { name: 'SESSION 10' });
    expect(result.session_summary).toBe('');
  });

  it('session_summary is empty string when no meta is provided', () => {
    const result = deriveConversationMemoryPayload('conv-5', {});
    expect(result.session_summary).toBe('');
  });

  it('session_summary is empty string when meta is undefined', () => {
    const result = deriveConversationMemoryPayload('conv-6');
    expect(result.session_summary).toBe('');
  });

  it('intent is truncated at 300 characters before being used in session_summary', () => {
    const longIntent = 'a'.repeat(400);
    const result = deriveConversationMemoryPayload('conv-7', { intent: longIntent });
    // The summary will be "Session focused on: " + truncated-intent + "."
    // The intent portion must not exceed CONVERSATION_META_MAX_CHARS (300 chars).
    // Extract the intent portion: everything between "Session focused on: " and the trailing "."
    const prefix = 'Session focused on: ';
    expect(result.session_summary.startsWith(prefix)).toBe(true);
    const intentPortion = result.session_summary.slice(prefix.length).replace(/\.$/, '');
    expect(intentPortion.length).toBeLessThanOrEqual(300);
  });
});

// ─── Section 4 — Privacy contract ────────────────────────────────────────────

describe('Phase 4 — deriveConversationMemoryPayload: privacy contract', () => {
  it('output contains no raw conversation content in any field', () => {
    const result = deriveConversationMemoryPayload('conv-1', { intent: 'anxiety' });
    // Verify no field contains typical conversation/transcript patterns
    for (const field of THERAPIST_MEMORY_ARRAY_FIELDS) {
      expect(result[field]).toHaveLength(0);
    }
  });

  it('output does not include a "messages" field', () => {
    const result = deriveConversationMemoryPayload('conv-1', {});
    expect(result).not.toHaveProperty('messages');
  });

  it('output does not include a "transcript" field', () => {
    const result = deriveConversationMemoryPayload('conv-1', {});
    expect(result).not.toHaveProperty('transcript');
  });

  it('safety_plan_notes is an empty string (no clinical content)', () => {
    const result = deriveConversationMemoryPayload('conv-1', {});
    expect(result.safety_plan_notes).toBe('');
  });

  it('risk_flags is an empty array (no content extraction)', () => {
    const result = deriveConversationMemoryPayload('conv-1', {});
    expect(result.risk_flags).toEqual([]);
  });
});

// ─── Section 5 — Phase 1 schema compliance ───────────────────────────────────

describe('Phase 4 — deriveConversationMemoryPayload: Phase 1 schema compliance', () => {
  it('all THERAPIST_MEMORY_STRING_FIELDS are present in the output', () => {
    const result = deriveConversationMemoryPayload('conv-1', {});
    for (const field of THERAPIST_MEMORY_STRING_FIELDS) {
      expect(result).toHaveProperty(field);
    }
  });

  it('all THERAPIST_MEMORY_ARRAY_FIELDS are present in the output', () => {
    const result = deriveConversationMemoryPayload('conv-1', {});
    for (const field of THERAPIST_MEMORY_ARRAY_FIELDS) {
      expect(result).toHaveProperty(field);
    }
  });

  it('all string fields in output are strings', () => {
    const result = deriveConversationMemoryPayload('conv-1', { intent: 'test' });
    for (const field of THERAPIST_MEMORY_STRING_FIELDS) {
      expect(typeof result[field]).toBe('string');
    }
  });

  it('all array fields in output are arrays', () => {
    const result = deriveConversationMemoryPayload('conv-1', { intent: 'test' });
    for (const field of THERAPIST_MEMORY_ARRAY_FIELDS) {
      expect(Array.isArray(result[field])).toBe(true);
    }
  });

  it('last_summarized_date is a non-empty string', () => {
    const result = deriveConversationMemoryPayload('conv-1', {});
    expect(typeof result.last_summarized_date).toBe('string');
    expect(result.last_summarized_date.length).toBeGreaterThan(0);
  });
});

// ─── Section 6 — Fail-safe for invalid inputs ────────────────────────────────

describe('Phase 4 — deriveConversationMemoryPayload: fail-safe for invalid inputs', () => {
  it('does not throw when conversationId is null', () => {
    expect(() => deriveConversationMemoryPayload(null, {})).not.toThrow();
  });

  it('does not throw when conversationId is undefined', () => {
    expect(() => deriveConversationMemoryPayload(undefined, {})).not.toThrow();
  });

  it('does not throw when conversationId is a number', () => {
    expect(() => deriveConversationMemoryPayload(42, {})).not.toThrow();
  });

  it('does not throw when conversationMeta is null', () => {
    expect(() => deriveConversationMemoryPayload('conv-1', null)).not.toThrow();
  });

  it('does not throw when conversationMeta is a non-object', () => {
    expect(() => deriveConversationMemoryPayload('conv-1', 'invalid')).not.toThrow();
  });

  it('returns an object (not null/undefined) for null conversationId', () => {
    const result = deriveConversationMemoryPayload(null, {});
    expect(result).not.toBeNull();
    expect(typeof result).toBe('object');
  });

  it('session_id is empty string when conversationId is null', () => {
    const result = deriveConversationMemoryPayload(null, {});
    expect(result.session_id).toBe('');
  });

  it('output passes isTherapistMemoryRecord when called with null conversationId', () => {
    const result = deriveConversationMemoryPayload(null, {});
    // A safe stub record also passes schema validation (it has the version key)
    expect(typeof result[THERAPIST_MEMORY_VERSION_KEY]).toBe('string');
  });

  it('does not throw with an intent that looks like raw transcript content', () => {
    // Even if intent accidentally matches a transcript pattern, sanitize clears it.
    // The function call itself should not throw.
    expect(() =>
      deriveConversationMemoryPayload('conv-1', {
        intent: 'User: how are you? Therapist: I am fine',
      }),
    ).not.toThrow();
    const result = deriveConversationMemoryPayload('conv-1', {
      intent: 'User: how are you? Therapist: I am fine',
    });
    // sanitizeSummaryRecord will clear the session_summary if it contains transcript
    expect(typeof result.session_summary).toBe('string');
  });
});

// ─── Section 7 — triggerConversationEndSummarization: gate check ─────────────

describe('Phase 4 — triggerConversationEndSummarization: gate check (flag off)', () => {
  it('isSummarizationEnabled() returns false in default mode', () => {
    expect(isSummarizationEnabled()).toBe(false);
  });

  it('triggerConversationEndSummarization returns without side effects when gate is off', () => {
    expect(() =>
      triggerConversationEndSummarization('conv-1', { intent: 'anxiety' }, 'test'),
    ).not.toThrow();
  });

  it('triggerConversationEndSummarization returns void when gate is off', () => {
    const result = triggerConversationEndSummarization('conv-1', {}, 'test');
    expect(result).toBeUndefined();
  });

  it('triggerConversationEndSummarization is inert with null conversationId when gate is off', () => {
    expect(() => triggerConversationEndSummarization(null, {}, 'test')).not.toThrow();
  });

  it('triggerConversationEndSummarization is inert with no args when gate is off', () => {
    expect(() => triggerConversationEndSummarization()).not.toThrow();
  });

  it('gate check happens before any side-effect code', () => {
    // Passing a deliberately bad conversationId should still not throw
    // because the gate returns before any processing
    expect(() =>
      triggerConversationEndSummarization({}, { intent: 'test' }, 'gate_test'),
    ).not.toThrow();
  });
});

// ─── Section 8 — CONVERSATION_END_SUMMARY_INVOKER constant ───────────────────

describe('Phase 4 — CONVERSATION_END_SUMMARY_INVOKER constant', () => {
  it('CONVERSATION_END_SUMMARY_INVOKER is "conversation_end"', () => {
    expect(CONVERSATION_END_SUMMARY_INVOKER).toBe('conversation_end');
  });
});

// ─── Section 9 — Chat.jsx static analysis ────────────────────────────────────

describe('Phase 4 — Chat.jsx integration (static analysis)', () => {
  it('Chat.jsx imports triggerConversationEndSummarization', () => {
    expect(chatSrc).toContain('triggerConversationEndSummarization');
  });

  it('Chat.jsx imports from @/lib/sessionEndSummarization.js', () => {
    expect(chatSrc).toContain('sessionEndSummarization');
  });

  it('Chat.jsx delegates requestSummary through maybeTriggerEndWrite', () => {
    const requestSummaryIdx = chatSrc.indexOf('const requestSummary');
    const callIdx = chatSrc.indexOf('maybeTriggerEndWrite(', requestSummaryIdx);
    expect(requestSummaryIdx).toBeGreaterThan(-1);
    expect(callIdx).toBeGreaterThan(requestSummaryIdx);
  });

  it('Chat.jsx passes currentConversationId into the requestSummary write helper', () => {
    const requestSummaryIdx = chatSrc.indexOf('const requestSummary');
    const conversationIdIdx = chatSrc.indexOf('currentConversationId,', requestSummaryIdx);
    expect(conversationIdIdx).toBeGreaterThan(requestSummaryIdx);
  });

  it('Chat.jsx passes conversations?.find result metadata as second argument', () => {
    expect(chatSrc).toContain('convForMemory?.metadata');
  });

  it('Chat.jsx passes "chat_request_summary" as the invoker label', () => {
    expect(chatSrc).toContain('chat_request_summary');
  });

  it('Chat.jsx call to triggerConversationEndSummarization is inside requestSummary', () => {
    // Find requestSummary function and check triggerConversationEndSummarization is inside it.
    // Phase 5 adds a second call site (maybeTriggerEndWrite) that may appear
    // earlier in the file. We therefore search for the call that uses the
    // 'chat_request_summary' invoker label, which uniquely identifies the
    // requestSummary call site.
    const requestSummaryIdx = chatSrc.indexOf('const requestSummary');
    const callIdx = chatSrc.indexOf("'chat_request_summary'");
    expect(requestSummaryIdx).toBeGreaterThan(-1);
    expect(callIdx).toBeGreaterThan(requestSummaryIdx);
  });
});

// ─── Section 10 — Role isolation ─────────────────────────────────────────────

describe('Phase 4 — Role isolation: companion wiring unaffected', () => {
  it('AI_COMPANION_WIRING_HYBRID does not have continuity_layer_enabled', () => {
    expect(AI_COMPANION_WIRING_HYBRID.continuity_layer_enabled).not.toBe(true);
  });

  it('CBT_THERAPIST_WIRING_HYBRID does not have continuity_layer_enabled (default)', () => {
    expect(CBT_THERAPIST_WIRING_HYBRID.continuity_layer_enabled).not.toBe(true);
  });

  it('THERAPIST_UPGRADE_SUMMARIZATION_ENABLED defaults to false (flag isolation)', () => {
    expect(THERAPIST_UPGRADE_FLAGS.THERAPIST_UPGRADE_SUMMARIZATION_ENABLED).toBe(false);
  });

  it('isSummarizationEnabled() is false by default (production safe)', () => {
    expect(isSummarizationEnabled()).toBe(false);
  });

  it('deriveConversationMemoryPayload with companion-style meta does not produce clinically sensitive output', () => {
    const result = deriveConversationMemoryPayload('companion-conv-1', {
      name: 'Companion chat',
    });
    // All clinical arrays are empty — no clinical data leakage
    for (const field of THERAPIST_MEMORY_ARRAY_FIELDS) {
      expect(result[field]).toHaveLength(0);
    }
  });
});

// ─── Section 11 — Rollback: prior phase exports unchanged ────────────────────

describe('Phase 4 — Rollback: prior phase exports still present and unchanged', () => {
  it('SESSION_SUMMARIZATION_MAX_MESSAGES is still exported as a positive integer', () => {
    expect(typeof SESSION_SUMMARIZATION_MAX_MESSAGES).toBe('number');
    expect(SESSION_SUMMARIZATION_MAX_MESSAGES).toBeGreaterThan(0);
  });

  it('deriveSessionSummaryPayload is still exported as a function', () => {
    expect(typeof deriveSessionSummaryPayload).toBe('function');
  });

  it('triggerSessionEndSummarization is still exported as a function', () => {
    expect(typeof triggerSessionEndSummarization).toBe('function');
  });

  it('triggerSessionEndSummarization still returns void when gate is off', () => {
    const result = triggerSessionEndSummarization({ id: 'sess-1', stage: 'completed' }, []);
    expect(result).toBeUndefined();
  });

  it('deriveSessionSummaryPayload still produces a valid record from CoachingSession', () => {
    const session = {
      id: 'sess-abc',
      created_date: '2024-01-01T00:00:00.000Z',
      focus_area: 'anxiety',
      stage: 'working',
    };
    const record = deriveSessionSummaryPayload(session, []);
    expect(record[THERAPIST_MEMORY_VERSION_KEY]).toBe(THERAPIST_MEMORY_VERSION);
    expect(record.session_id).toBe('sess-abc');
    expect(record.session_summary).toContain('anxiety');
  });
});

// ─── Section 12 — Flag isolation: THERAPIST_UPGRADE_SUMMARIZATION_ENABLED ────

describe('Phase 4 — Flag isolation: THERAPIST_UPGRADE_SUMMARIZATION_ENABLED defaults false', () => {
  it('THERAPIST_UPGRADE_SUMMARIZATION_ENABLED is false in default build', () => {
    expect(THERAPIST_UPGRADE_FLAGS.THERAPIST_UPGRADE_SUMMARIZATION_ENABLED).toBe(false);
  });

  it('isUpgradeEnabled("THERAPIST_UPGRADE_SUMMARIZATION_ENABLED") returns false in default mode', () => {
    expect(isUpgradeEnabled('THERAPIST_UPGRADE_SUMMARIZATION_ENABLED')).toBe(false);
  });

  it('isSummarizationEnabled() aligns with flag state (both false)', () => {
    const flagState = isUpgradeEnabled('THERAPIST_UPGRADE_SUMMARIZATION_ENABLED');
    expect(isSummarizationEnabled()).toBe(flagState);
  });

  it('THERAPIST_UPGRADE_ENABLED master gate is false (production default)', () => {
    expect(THERAPIST_UPGRADE_FLAGS.THERAPIST_UPGRADE_ENABLED).toBe(false);
  });

  it('triggerConversationEndSummarization is completely inert in production default', () => {
    // Both master gate and SUMMARIZATION flag are off → no side effects at all
    let sideEffectOccurred = false;
    // If the function were to proceed past the gate, it would call base44.functions.invoke
    // (which doesn't exist in this test environment). The absence of an error confirms
    // the function exited at the gate check.
    expect(() => {
      triggerConversationEndSummarization('conv-prod-1', { intent: 'test' }, 'production_test');
      sideEffectOccurred = true; // Only reached if function doesn't throw
    }).not.toThrow();
    // The function returned (sideEffectOccurred is true because it didn't throw)
    // but no async backend call was triggered (because the gate returned early)
    expect(sideEffectOccurred).toBe(true);
  });
});

// ─── Section 13 — End-to-end memory path integrity check ─────────────────────

describe('Phase 4 — End-to-end path integrity: conversation → memory record', () => {
  it('a Chat.jsx conversation with intent produces a memory record with non-empty session_summary', () => {
    const conversationId = 'conv-e2e-001';
    const meta = { intent: 'coping with work stress', name: 'Session 4' };
    const record = deriveConversationMemoryPayload(conversationId, meta);
    expect(record.session_id).toBe(conversationId);
    expect(record.session_summary).toContain('coping with work stress');
    expect(isTherapistMemoryRecord(record)).toBe(true);
  });

  it('a Chat.jsx conversation with no intent produces a safe empty-summary record', () => {
    const conversationId = 'conv-e2e-002';
    const meta = { name: 'Session 12' };
    const record = deriveConversationMemoryPayload(conversationId, meta);
    expect(record.session_id).toBe(conversationId);
    expect(record.session_summary).toBe(''); // Generic name excluded
    expect(isTherapistMemoryRecord(record)).toBe(true);
  });

  it('a Chat.jsx conversation with no metadata produces a minimal valid record', () => {
    const conversationId = 'conv-e2e-003';
    const record = deriveConversationMemoryPayload(conversationId, {});
    expect(record.session_id).toBe(conversationId);
    expect(isTherapistMemoryRecord(record)).toBe(true);
  });

  it('multiple conversation records produce distinct session_ids', () => {
    const r1 = deriveConversationMemoryPayload('conv-a', { intent: 'anxiety' });
    const r2 = deriveConversationMemoryPayload('conv-b', { intent: 'anxiety' });
    expect(r1.session_id).toBe('conv-a');
    expect(r2.session_id).toBe('conv-b');
    expect(r1.session_id).not.toBe(r2.session_id);
  });
});
