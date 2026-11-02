/**
 * INTERNAL TEXT LEAKAGE BOUNDARY — regression test suite
 *
 * Verifies that internal planner/composer/reasoning text can never reach the
 * user-visible render state through any of the identified leakage paths.
 *
 * Root causes patched by this regression suite:
 *   1. `extractAssistantMessage` — plain-text path returned rawContent as-is
 *      (no sanitization).  Fix: apply sanitizeAssistantMessage before return.
 *   2. `sanitizeConversationMessages` — plain-text assistant messages fell
 *      through to `return msg` without sanitization.
 *      Fix: sanitize before returning.
 *
 * Boundary contract:
 *   - Internal planner strings (THOUGHT:, PLAN:, ANALYSIS:, etc.) MUST be
 *     stripped before any content reaches visible render state.
 *   - After stripping, if any clean content remains it MUST be preserved.
 *   - If ALL content is stripped, a non-empty language-appropriate failsafe
 *     MUST be returned (never blank).
 *   - Object/non-string content is handled gracefully (no crash, no leakage).
 */

import { describe, it, expect } from 'vitest';
import {
  extractAssistantMessage,
  sanitizeConversationMessages,
  validateAgentOutput,
} from '../../src/components/utils/validateAgentOutput.jsx';

// ─── HELPERS ──────────────────────────────────────────────────────────────────

/** Representative planner/classifier tokens that must NEVER appear in output */
const PLANNER_TOKENS = [
  'THOUGHT:',
  'THOUGHT',
  'THINKING:',
  'ANALYSIS:',
  'REASONING:',
  'PLAN:',
  'INTERNAL:',
  'SYSTEM:',
  'STEP 1:',
  'I should',
  'I need to',
  'First I\'ll',
  'Then I\'ll',
  '[checking',
  '[internal',
  '[validation',
  '[constraint',
  '[protocol',
  '[thinking',
  '[reasoning',
  'LOCKED_DOMAIN',
  'INTERVENTION_MODE',
  'retrieveCurriculumUnit',
  'retrieveTherapistMemory',
  'blocker_resolution',
  'intervention_mode',
  'current_issue',
];

function containsPlannerTokens(text, tokens = PLANNER_TOKENS) {
  return tokens.some((tok) => text.includes(tok));
}

// ─── extractAssistantMessage — plain-text leakage boundary ───────────────────

describe('extractAssistantMessage — plain-text planner tokens are stripped', () => {
  it('strips a THOUGHT: prefix from a plain-text string', () => {
    const raw = 'THOUGHT: The user is describing social anxiety.\n\nI hear you — that sounds difficult.';
    const result = extractAssistantMessage(raw);
    expect(result).not.toContain('THOUGHT:');
    expect(result).toContain('I hear you');
  });

  it('strips ANALYSIS: + PLAN: lines from a plain-text string and preserves clean content', () => {
    const raw =
      'ANALYSIS: User needs grounding.\nPLAN: Offer breathing exercise.\n\nLet\'s try a short breathing exercise together.';
    const result = extractAssistantMessage(raw);
    expect(result).not.toContain('ANALYSIS:');
    expect(result).not.toContain('PLAN:');
    expect(result).toContain('Let\'s try a short breathing exercise');
  });

  it('strips multiple reasoning lines and returns only the clean therapeutic line', () => {
    const raw =
      'THOUGHT: Need to validate emotion.\nANALYSIS: User seems anxious.\nPLAN: 1. Ask situation\nSTEP 1: Gather context\nI should check the gate.\nFirst I\'ll ask about feelings.\n\nWhat\'s happening right now?';
    const result = extractAssistantMessage(raw);
    expect(result).not.toContain('THOUGHT:');
    expect(result).not.toContain('ANALYSIS:');
    expect(result).not.toContain('PLAN:');
    expect(result).not.toContain('STEP 1:');
    expect(result).not.toContain('I should');
    expect(result).not.toContain("First I'll");
    expect(result).toContain("What's happening right now?");
  });

  it('strips bracketed internal notes from a plain-text string', () => {
    const raw = '[checking constraint]\n[internal validation]\nWhat\'s your anxiety level from 0-10?';
    const result = extractAssistantMessage(raw);
    expect(result).not.toContain('[checking');
    expect(result).not.toContain('[internal');
    expect(result).toContain("What's your anxiety level");
  });

  it('strips LOCKED_DOMAIN from a plain-text string', () => {
    const raw = 'LOCKED_DOMAIN = social_anxiety\n\nI understand your concern about social situations.';
    const result = extractAssistantMessage(raw);
    expect(result).not.toContain('LOCKED_DOMAIN');
    expect(result).toContain('I understand your concern');
  });

  it('strips internal tool-name tokens from a plain-text string', () => {
    const raw = 'retrieveCurriculumUnit called with topic=anxiety\n\nLet\'s work on this together.';
    const result = extractAssistantMessage(raw);
    expect(result).not.toContain('retrieveCurriculumUnit');
    expect(result).toContain("Let's work on this together");
  });

  it('returns a non-empty failsafe when ALL content is planner tokens', () => {
    const raw = 'THOUGHT: Need to assess user state.\nPLAN: Start with emotion baseline.\nANALYSIS: Anxiety detected.';
    const result = extractAssistantMessage(raw);
    expect(typeof result).toBe('string');
    expect(result.trim().length).toBeGreaterThan(0);
    expect(result).not.toContain('THOUGHT:');
    expect(result).not.toContain('PLAN:');
    expect(result).not.toContain('ANALYSIS:');
  });

  it('preserves clean therapeutic content unchanged', () => {
    const raw = "I hear you. That must have been really hard. How are you feeling right now?";
    const result = extractAssistantMessage(raw);
    expect(result).toBe(raw);
  });

  it('handles Hebrew plain text without stripping clean content', () => {
    const raw = 'מעולה! הבנתי שאתה נעזר בתוכנת AI ייעודית לפרויקט.';
    const result = extractAssistantMessage(raw);
    expect(result).toBe(raw);
  });

  it('handles Hebrew plain text with English planner prefix — strips prefix, preserves Hebrew', () => {
    const raw =
      'THOUGHT: The user identified that they consult an AI software for the project.\n\nמעולה! הבנתי שאתה נעזר בתוכנת AI ייעודית לפרויקט.';
    const result = extractAssistantMessage(raw);
    expect(result).not.toContain('THOUGHT:');
    expect(result).toContain('מעולה');
  });
});

// ─── extractAssistantMessage — object/non-string boundary ─────────────────────

describe('extractAssistantMessage — object input does not leak', () => {
  it('extracts and sanitizes assistant_message from a structured object', () => {
    const obj = {
      assistant_message:
        'THOUGHT: must stay hidden\n\nI hear you — that sounds difficult.',
      mode: 'thought_work',
    };
    const result = extractAssistantMessage(obj);
    expect(result).not.toContain('THOUGHT:');
    expect(result).toContain('I hear you');
  });

  it('returns a deterministic fallback for an object with no assistant_message', () => {
    const obj = { mode: 'thought_work', situation: 'test' };
    const result = extractAssistantMessage(obj);
    expect(typeof result).toBe('string');
    expect(result.trim().length).toBeGreaterThan(0);
  });

  it('handles null input gracefully', () => {
    const result = extractAssistantMessage(null);
    expect(typeof result).toBe('string');
    expect(result.trim().length).toBeGreaterThan(0);
  });

  it('handles undefined input gracefully', () => {
    const result = extractAssistantMessage(undefined);
    expect(typeof result).toBe('string');
    expect(result.trim().length).toBeGreaterThan(0);
  });
});

// ─── sanitizeConversationMessages — plain-text leakage boundary ───────────────

describe('sanitizeConversationMessages — plain-text planner tokens are stripped', () => {
  it('strips THOUGHT: from a plain-text assistant message', () => {
    const msgs = [
      { role: 'user', content: 'I feel anxious.' },
      {
        role: 'assistant',
        content: 'THOUGHT: User is anxious.\n\nI understand — let\'s explore that together.',
      },
    ];
    const result = sanitizeConversationMessages(msgs);
    const assistantMsg = result.find((m) => m.role === 'assistant');
    expect(assistantMsg).toBeDefined();
    expect(assistantMsg.content).not.toContain('THOUGHT:');
    expect(assistantMsg.content).toContain("let's explore that together");
  });

  it('strips ANALYSIS: + PLAN: from a plain-text assistant message', () => {
    const msgs = [
      { role: 'user', content: 'I procrastinate a lot.' },
      {
        role: 'assistant',
        content:
          'ANALYSIS: User has avoidance pattern.\nPLAN: Graded task exposure.\n\nWhat\'s one small step you could take today?',
      },
    ];
    const result = sanitizeConversationMessages(msgs);
    const assistantMsg = result.find((m) => m.role === 'assistant');
    expect(assistantMsg.content).not.toContain('ANALYSIS:');
    expect(assistantMsg.content).not.toContain('PLAN:');
    expect(assistantMsg.content).toContain('one small step');
  });

  it('strips bracketed internal notes from a plain-text assistant message', () => {
    const msgs = [
      { role: 'user', content: 'Hi.' },
      {
        role: 'assistant',
        content: '[checking gate]\n[internal constraint]\nHow are you feeling today?',
      },
    ];
    const result = sanitizeConversationMessages(msgs);
    const assistantMsg = result.find((m) => m.role === 'assistant');
    expect(assistantMsg.content).not.toContain('[checking');
    expect(assistantMsg.content).not.toContain('[internal');
    expect(assistantMsg.content).toContain('How are you feeling today?');
  });

  it('preserves user messages unchanged', () => {
    const msgs = [
      { role: 'user', content: 'I feel sad and I am not sure why.' },
    ];
    const result = sanitizeConversationMessages(msgs);
    expect(result[0].content).toBe('I feel sad and I am not sure why.');
  });

  it('leaves clean assistant messages unchanged', () => {
    const msgs = [
      { role: 'assistant', content: 'That sounds hard. What are you noticing in your body?' },
    ];
    const result = sanitizeConversationMessages(msgs);
    expect(result[0].content).toBe('That sounds hard. What are you noticing in your body?');
  });

  it('returns a failsafe when ALL content in an assistant message is planner tokens', () => {
    const msgs = [
      { role: 'user', content: 'Hello.' },
      {
        role: 'assistant',
        content: 'THOUGHT: Need to assess state.\nPLAN: Run baseline.\nANALYSIS: Anxiety present.',
      },
    ];
    const result = sanitizeConversationMessages(msgs);
    const assistantMsg = result.find((m) => m.role === 'assistant');
    expect(assistantMsg).toBeDefined();
    expect(typeof assistantMsg.content).toBe('string');
    expect(assistantMsg.content.trim().length).toBeGreaterThan(0);
    expect(assistantMsg.content).not.toContain('THOUGHT:');
    expect(assistantMsg.content).not.toContain('PLAN:');
    expect(assistantMsg.content).not.toContain('ANALYSIS:');
  });

  it('handles empty message arrays without throwing', () => {
    expect(sanitizeConversationMessages([])).toEqual([]);
  });

  it('handles non-array input gracefully', () => {
    expect(sanitizeConversationMessages(null)).toEqual([]);
    expect(sanitizeConversationMessages(undefined)).toEqual([]);
  });
});

// ─── Boundary invariant — no planner token from a combined planner block ──────

describe('leakage boundary — combined planner block cannot reach visible output', () => {
  /** Simulates what a planner-heavy raw agent reply looks like */
  const FULL_PLANNER_BLOCK =
    'THOUGHT: User is describing social anxiety in work settings.\n' +
    'ANALYSIS: Domain = social_anxiety. Intervention = graded_exposure.\n' +
    'LOCKED_DOMAIN = social_anxiety\n' +
    'INTERVENTION_MODE = graded_exposure\n' +
    'blocker_resolution = avoidance\n' +
    'intervention_mode = graded_exposure\n' +
    'PLAN: Step 1 — acknowledge, Step 2 — reframe, Step 3 — suggest micro-step.\n' +
    'I should check the continuity gate.\n' +
    '[checking domain rule]\n\n' +
    'It sounds like work situations feel really overwhelming right now.';

  it('extractAssistantMessage strips the full planner block and preserves clean line', () => {
    const result = extractAssistantMessage(FULL_PLANNER_BLOCK);
    expect(containsPlannerTokens(result)).toBe(false);
    expect(result).toContain('work situations feel really overwhelming');
  });

  it('sanitizeConversationMessages strips the full planner block via message array', () => {
    const msgs = [
      { role: 'user', content: 'Work is overwhelming.' },
      { role: 'assistant', content: FULL_PLANNER_BLOCK },
    ];
    const result = sanitizeConversationMessages(msgs);
    const assistantMsg = result.find((m) => m.role === 'assistant');
    expect(containsPlannerTokens(assistantMsg.content)).toBe(false);
    expect(assistantMsg.content).toContain('work situations feel really overwhelming');
  });

  it('never produces an empty string from any leakage boundary function', () => {
    const result1 = extractAssistantMessage(FULL_PLANNER_BLOCK);
    expect(result1.trim().length).toBeGreaterThan(0);

    const msgs = [{ role: 'assistant', content: FULL_PLANNER_BLOCK }];
    const result2 = sanitizeConversationMessages(msgs);
    expect(result2[0].content.trim().length).toBeGreaterThan(0);
  });
});
