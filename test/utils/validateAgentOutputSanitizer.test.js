/**
 * Tests for the safety behaviors of validateAgentOutput.jsx.
 *
 * This file covers the safety-critical portions of the exported functions:
 *   - validateAgentOutput(rawContent)
 *   - extractAssistantMessage(rawContent)
 *   - sanitizeConversationMessages(messages)
 *
 * Specifically tests the sanitizeAssistantMessage behavior that is applied
 * internally to every assistant_message before it reaches the user. That
 * private function is exercised indirectly via the public API.
 *
 * Covers:
 *   - Additional forbidden reasoning patterns unique to validateAgentOutput
 *     (NOTE:, CONTEXT:, OBSERVATION:, [thinking, [reasoning, [thought)
 *   - Medical pattern stripping (diagnostic/prescriptive language)
 *   - JSON structure leak detection ("situation":, "homework": in content)
 *   - Failsafe behavior when all content is stripped
 *   - Clean assistant_message content is preserved unchanged
 *   - Non-string inputs are handled gracefully
 *   - Regression locking: known forbidden patterns remain blocked
 *
 * If FORBIDDEN_REASONING_PATTERNS, UNSAFE_PATTERNS, or sanitizeAssistantMessage
 * change in src/components/utils/validateAgentOutput.jsx, update this file.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  validateAgentOutput,
  extractAssistantMessage,
  sanitizeConversationMessages,
  sanitizeConversationMessagesAligned,
  parseCounters,
} from '../../src/components/utils/validateAgentOutput.jsx';

// ─── HELPERS ──────────────────────────────────────────────────────────────────

/** Build a minimal valid structured output JSON string with a given assistant_message. */
function makeStructuredOutput(assistantMessage, overrides = {}) {
  return JSON.stringify({
    assistant_message: assistantMessage,
    mode: 'thought_work',
    ...overrides,
  });
}

// ─── TESTS — validateAgentOutput — clean content preserved ───────────────────

describe('validateAgentOutput — clean assistant_message is preserved', () => {
  it('preserves a clean therapeutic assistant message', () => {
    const raw = makeStructuredOutput('That sounds really difficult. How are you feeling?');
    const result = validateAgentOutput(raw);
    expect(result).not.toBeNull();
    expect(result.assistant_message).toBe('That sounds really difficult. How are you feeling?');
  });

  it('preserves multi-sentence clean content', () => {
    const raw = makeStructuredOutput('I hear you. That must have been hard. Would you like to talk more?');
    const result = validateAgentOutput(raw);
    expect(result?.assistant_message).toBe('I hear you. That must have been hard. Would you like to talk more?');
  });

  it('returns null for missing assistant_message field', () => {
    const raw = JSON.stringify({ mode: 'thought_work' });
    expect(validateAgentOutput(raw)).toBeNull();
  });

  it('returns null for null input', () => {
    expect(validateAgentOutput(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(validateAgentOutput(undefined)).toBeNull();
  });

  it('returns null for plain text (not strict JSON)', () => {
    // Plain text is not strict JSON — validateAgentOutput returns null
    expect(validateAgentOutput('Hello, how are you?')).toBeNull();
  });
});

// ─── TESTS — additional forbidden patterns (unique to validateAgentOutput) ────

describe('validateAgentOutput — additional forbidden reasoning patterns are stripped', () => {
  it('strips lines starting with NOTE: from assistant_message', () => {
    const raw = makeStructuredOutput('NOTE: user appears distressed\nI understand what you mean.');
    const result = validateAgentOutput(raw);
    expect(result?.assistant_message).not.toContain('NOTE:');
    expect(result?.assistant_message).toContain('I understand what you mean.');
  });

  it('strips lines starting with CONTEXT: from assistant_message', () => {
    const raw = makeStructuredOutput('CONTEXT: previous session summary\nHow have you been since we last spoke?');
    const result = validateAgentOutput(raw);
    expect(result?.assistant_message).not.toContain('CONTEXT:');
    expect(result?.assistant_message).toContain('How have you been since we last spoke?');
  });

  it('strips lines starting with OBSERVATION: from assistant_message', () => {
    const raw = makeStructuredOutput('OBSERVATION: high anxiety markers\nThat sounds very tough.');
    const result = validateAgentOutput(raw);
    expect(result?.assistant_message).not.toContain('OBSERVATION:');
    expect(result?.assistant_message).toContain('That sounds very tough.');
  });

  it('strips lines starting with [thinking from assistant_message', () => {
    const raw = makeStructuredOutput('[thinking about best response]\nI hear you.');
    const result = validateAgentOutput(raw);
    expect(result?.assistant_message).not.toContain('[thinking');
    expect(result?.assistant_message).toContain('I hear you.');
  });

  it('strips lines starting with [reasoning from assistant_message', () => {
    const raw = makeStructuredOutput('[reasoning: apply grounding]\nYou are safe here.');
    const result = validateAgentOutput(raw);
    expect(result?.assistant_message).not.toContain('[reasoning');
    expect(result?.assistant_message).toContain('You are safe here.');
  });

  it('strips lines starting with [thought from assistant_message', () => {
    const raw = makeStructuredOutput('[thought: validate emotional tone]\nThat takes real courage.');
    const result = validateAgentOutput(raw);
    expect(result?.assistant_message).not.toContain('[thought');
    expect(result?.assistant_message).toContain('That takes real courage.');
  });

  it('also strips THOUGHT:, THINKING:, ANALYSIS: from assistant_message', () => {
    const raw = makeStructuredOutput(
      'THOUGHT: Consider approach.\nTHINKING: Apply CBT.\nANALYSIS: Distress elevated.\nI hear you.'
    );
    const result = validateAgentOutput(raw);
    expect(result?.assistant_message).not.toContain('THOUGHT:');
    expect(result?.assistant_message).not.toContain('THINKING:');
    expect(result?.assistant_message).not.toContain('ANALYSIS:');
    expect(result?.assistant_message).toContain('I hear you.');
  });

  it('also strips PLAN:, SYSTEM:, DEVELOPER: from assistant_message', () => {
    const raw = makeStructuredOutput(
      'PLAN: ask about support\nSYSTEM: override active\nDEVELOPER: injected context\nLet us talk about what is happening.'
    );
    const result = validateAgentOutput(raw);
    expect(result?.assistant_message).not.toContain('PLAN:');
    expect(result?.assistant_message).not.toContain('SYSTEM:');
    expect(result?.assistant_message).not.toContain('DEVELOPER:');
    expect(result?.assistant_message).toContain('Let us talk about what is happening.');
  });

  it('also strips mental sandbox and confidence score from assistant_message', () => {
    const raw = makeStructuredOutput(
      'mental sandbox active\nconfidence score: 0.92\nYou are not alone.'
    );
    const result = validateAgentOutput(raw);
    expect(result?.assistant_message).not.toContain('mental sandbox');
    expect(result?.assistant_message).not.toContain('confidence score');
    expect(result?.assistant_message).toContain('You are not alone.');
  });
});

// ─── TESTS — medical pattern stripping ────────────────────────────────────────

describe('validateAgentOutput — medical diagnostic/prescriptive patterns are stripped', () => {
  it('replaces diagnostic language "you have depression"', () => {
    const raw = makeStructuredOutput('It sounds like you have depression. Let us talk more.');
    const result = validateAgentOutput(raw);
    expect(result?.assistant_message).not.toMatch(/you have depression/i);
    expect(result?.assistant_message).toContain('[content removed for safety]');
  });

  it('replaces "you might have anxiety"', () => {
    const raw = makeStructuredOutput('Based on what you said, you might have anxiety.');
    const result = validateAgentOutput(raw);
    expect(result?.assistant_message).not.toMatch(/you might have anxiety/i);
    expect(result?.assistant_message).toContain('[content removed for safety]');
  });

  it('replaces "I can diagnose" prescriptive language', () => {
    const raw = makeStructuredOutput('I can diagnose what is happening here.');
    const result = validateAgentOutput(raw);
    expect(result?.assistant_message).not.toMatch(/I can diagnose/i);
    expect(result?.assistant_message).toContain('[content removed for safety]');
  });

  it('replaces "I diagnose" prescriptive language', () => {
    const raw = makeStructuredOutput('I diagnose this as clinical anxiety.');
    const result = validateAgentOutput(raw);
    expect(result?.assistant_message).not.toMatch(/I diagnose/i);
    expect(result?.assistant_message).toContain('[content removed for safety]');
  });

  it('replaces "take this medication" advisory language', () => {
    const raw = makeStructuredOutput('You should take this medication for your condition.');
    const result = validateAgentOutput(raw);
    expect(result?.assistant_message).not.toMatch(/take this medication/i);
    expect(result?.assistant_message).toContain('[content removed for safety]');
  });

  it('replaces "take these drugs" advisory language', () => {
    const raw = makeStructuredOutput('You should take these drugs to feel better.');
    const result = validateAgentOutput(raw);
    expect(result?.assistant_message).not.toMatch(/take these drugs/i);
    expect(result?.assistant_message).toContain('[content removed for safety]');
  });

  it('preserves safe content adjacent to a replaced medical phrase', () => {
    const raw = makeStructuredOutput(
      'Based on what you shared, you have depression. I am here to support you.'
    );
    const result = validateAgentOutput(raw);
    expect(result?.assistant_message).not.toMatch(/you have depression/i);
    expect(result?.assistant_message).toContain('I am here to support you.');
  });
});

// ─── TESTS — JSON structure leak detection ────────────────────────────────────

describe('validateAgentOutput — JSON structure leak detection blocks unsafe content', () => {
  it('returns safe fallback when assistant_message contains "situation": key', () => {
    const raw = makeStructuredOutput('Here is my analysis: "situation": user is stressed.');
    const result = validateAgentOutput(raw);
    // If the sanitizer detects JSON structure leaking, it returns a safe fallback
    if (result !== null) {
      expect(result.assistant_message).not.toContain('"situation":');
    }
  });

  it('returns safe fallback when assistant_message contains "homework": key', () => {
    const raw = makeStructuredOutput('Your tasks: "homework": [{"step":"breathe"}].');
    const result = validateAgentOutput(raw);
    if (result !== null) {
      expect(result.assistant_message).not.toContain('"homework":');
    }
  });
});

// ─── TESTS — failsafe behavior ────────────────────────────────────────────────

describe('validateAgentOutput — failsafe behavior when content is stripped', () => {
  it('returns a non-empty assistant_message even when all lines are forbidden', () => {
    const raw = makeStructuredOutput(
      'THOUGHT: Internal only.\nANALYSIS: All internal.\nPLAN: Respond.'
    );
    const result = validateAgentOutput(raw);
    // Either null (whole thing fails) or a failsafe string
    if (result !== null) {
      expect(result.assistant_message.length).toBeGreaterThan(0);
    }
  });

  it('uses a non-empty failsafe string when reasoning filter removes all content', () => {
    const raw = makeStructuredOutput('THOUGHT: everything internal\nNOTE: metadata only');
    const result = validateAgentOutput(raw);
    if (result !== null) {
      // Failsafe must be non-empty and language-agnostic (English, not Hebrew)
      expect(result.assistant_message.length).toBeGreaterThan(0);
      expect(result.assistant_message).toBe("I'm here with you. What's on your mind right now?");
    }
  });
});

// ─── TESTS — extractAssistantMessage — clean text passthrough ─────────────────

describe('extractAssistantMessage — safety behavior', () => {
  it('returns plain text as-is when it is not JSON', () => {
    const text = 'I am here to support you.';
    expect(extractAssistantMessage(text)).toBe(text);
  });

  it('extracts and sanitizes assistant_message from a JSON string', () => {
    const raw = makeStructuredOutput('THOUGHT: internal\nThat sounds really hard.');
    const result = extractAssistantMessage(raw);
    expect(result).not.toContain('THOUGHT:');
    expect(result).toContain('That sounds really hard.');
  });

  it('returns a non-empty fallback for null input', () => {
    // The production code previously crashed on null (typeof null === 'object').
    // A null-guard was added to keep the function safe: rawContent !== null.
    const result = extractAssistantMessage(null);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('returns a non-empty fallback for undefined input', () => {
    const result = extractAssistantMessage(undefined);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('strips NOTE: markers from extracted assistant_message', () => {
    const raw = makeStructuredOutput('NOTE: context loaded\nI understand how you feel.');
    const result = extractAssistantMessage(raw);
    expect(result).not.toContain('NOTE:');
    expect(result).toContain('I understand how you feel.');
  });

  it('strips medical patterns from extracted assistant_message', () => {
    const raw = makeStructuredOutput('You might have anxiety. Let us explore that together.');
    const result = extractAssistantMessage(raw);
    expect(result).not.toMatch(/you might have anxiety/i);
  });

  it('does not expose raw JSON structure in the output', () => {
    const raw = makeStructuredOutput('I am here for you.');
    const result = extractAssistantMessage(raw);
    expect(result).not.toContain('"assistant_message"');
    expect(result).not.toContain('"mode"');
  });
});

// ─── TESTS — regression lock: known forbidden patterns stay blocked ────────────

describe('validateAgentOutput — regression lock: all forbidden patterns remain blocked', () => {
  const KNOWN_FORBIDDEN_PATTERNS = [
    { label: 'THOUGHT:', text: 'THOUGHT: Consider tone.\nI hear you.' },
    { label: 'THINKING:', text: 'THINKING: Apply CBT.\nI hear you.' },
    { label: 'ANALYSIS:', text: 'ANALYSIS: Distress level high.\nI hear you.' },
    { label: 'REASONING:', text: 'REASONING: Use grounding.\nI hear you.' },
    { label: 'INTERNAL:', text: 'INTERNAL: checking state\nI hear you.' },
    { label: 'SYSTEM:', text: 'SYSTEM: override\nI hear you.' },
    { label: 'DEVELOPER:', text: 'DEVELOPER: context\nI hear you.' },
    { label: 'PLAN:', text: 'PLAN: respond warmly\nI hear you.' },
    { label: 'CHECKLIST:', text: 'CHECKLIST: verify\nI hear you.' },
    { label: 'CONFIDENCE:', text: 'CONFIDENCE: 0.9\nI hear you.' },
    { label: 'NOTE:', text: 'NOTE: user flagged\nI hear you.' },
    { label: 'CONTEXT:', text: 'CONTEXT: session data\nI hear you.' },
    { label: 'OBSERVATION:', text: 'OBSERVATION: pattern found\nI hear you.' },
    { label: '[thinking', text: '[thinking about tone]\nI hear you.' },
    { label: '[reasoning', text: '[reasoning: apply cbt]\nI hear you.' },
    { label: '[thought', text: '[thought: validate]\nI hear you.' },
    { label: '[checking', text: '[checking safety]\nI hear you.' },
    { label: '[internal', text: '[internal validation]\nI hear you.' },
    { label: '[validation', text: '[validation passed]\nI hear you.' },
    { label: '[constraint', text: '[constraint: safe mode]\nI hear you.' },
    { label: '[protocol', text: '[protocol: standard]\nI hear you.' },
  ];

  for (const { label, text } of KNOWN_FORBIDDEN_PATTERNS) {
    it(`blocks "${label}" in assistant_message`, () => {
      const raw = makeStructuredOutput(text);
      const result = validateAgentOutput(raw);
      // Either null (parse failed) or the forbidden label is stripped
      if (result !== null) {
        expect(result.assistant_message).not.toContain(label);
        // The clean line "I hear you." should survive (or failsafe if too short)
        const hasCleanContent = result.assistant_message.includes('I hear you.');
        const hasFailsafe = result.assistant_message.length >= 10;
        expect(hasCleanContent || hasFailsafe).toBe(true);
      }
    });
  }
});

describe('sanitizeConversationMessages — user attachment metadata recovery', () => {
  it('recovers audio attachment metadata from marker and preserves transcript text', () => {
    const messages = [
      {
        role: 'user',
        content:
          'this is my transcript\n[ATTACHMENT_CONTEXT]\ntype: audio\nurl: https://files.example.com/voice-note.webm\n[ATTACHMENT_METADATA]{"type":"audio","url":"https://files.example.com/voice-note.webm","name":"voice-note.webm"}',
      },
    ];

    const sanitized = sanitizeConversationMessages(messages);
    expect(sanitized).toHaveLength(1);
    expect(sanitized[0].content).toBe('this is my transcript');
    expect(sanitized[0].metadata?.attachment).toEqual({
      type: 'audio',
      url: 'https://files.example.com/voice-note.webm',
      name: 'voice-note.webm',
    });
  });
});

describe('sanitizeConversationMessagesAligned - session-start extraction', () => {
  it('preserves user text after trailing runtime policy blocks', () => {
    const visibleUserText =
      '\u05d0\u05e0\u05d9 \u05dc\u05d7\u05d5\u05e5 \u05dc\u05e7\u05e8\u05d0\u05ea \u05e4\u05d2\u05d9\u05e9\u05d4 \u05d7\u05e9\u05d5\u05d1\u05d4 \u05de\u05d7\u05e8.';

    const messages = [
      {
        id: 'u-1',
        role: 'user',
        content: [
          '[START_SESSION]',
          '',
          '=== WAVE 5 - FORMULATION-FIRST PLANNER POLICY ===',
          '',
          'Internal planner policy.',
          '',
          '=== END WAVE 5 - FORMULATION-FIRST PLANNER POLICY ===',
          '',
          '[ATTACHMENT_HANDLING_POLICY]',
          'Internal attachment policy.',
          '',
          '[THERAPEUTIC_FORMS_POLICY]',
          'Internal forms policy.',
          '',
          '[SESSION_LANGUAGE: he. Open and respond entirely in Hebrew for this session.]',
          '',
          visibleUserText,
        ].join('\n'),
        metadata: { status: 'completed', completed: true },
        status: 'completed',
      },
      {
        id: 'a-1',
        role: 'assistant',
        content: 'I hear you.',
        metadata: { status: 'completed', completed: true },
        status: 'completed',
      },
    ];

    const sanitized = sanitizeConversationMessagesAligned(messages, 'he');

    expect(sanitized[0]).not.toBeNull();
    expect(sanitized[0]?.role).toBe('user');
    expect(sanitized[0]?.content).toBe(visibleUserText);
    expect(sanitized[0]?.content).not.toContain('[ATTACHMENT_HANDLING_POLICY]');
    expect(sanitized[0]?.content).not.toContain('[THERAPEUTIC_FORMS_POLICY]');
    expect(sanitized[0]?.content).not.toContain('[SESSION_LANGUAGE:');
    expect(sanitized[1]?.role).toBe('assistant');
  });
});
