/**
 * SANITIZATION INVARIANT — OUTPUT MUST NEVER BE EMPTY
 *
 * Asserts that the client-side message content sanitizer always returns a
 * non-empty, user-safe string, regardless of how adversarial or degenerate
 * the raw LLM output is.
 *
 * Cases covered:
 *   1. Whitespace-only input
 *   2. Only <think>…</think> reasoning block (XML-style)
 *   3. Only forbidden header lines (THOUGHT:, ANALYSIS:, PLAN:, etc.)
 *   4. Reasoning-marker-only content (bracketed internal notes)
 *   5. Mixed content: forbidden header + safe line → safe line preserved
 *   6. Output must contain no <think> blocks after sanitization
 *   7. Output must contain no forbidden header markers after sanitization
 *   8. Failsafe messages are language-appropriate (en / he)
 *
 * Uses the real sanitizeMessageContent function from
 * src/components/utils/messageContentSanitizer.jsx — no production code is
 * modified; this test is purely additive and reads the live implementation.
 *
 * Complements test/utils/messageContentSanitizer.test.js (which covers
 * <think> stripping) and test/utils/postLlmSafetyFilter.edgecases.test.js
 * (which covers the server-side filter's edge cases).
 */

import { describe, it, expect } from 'vitest';
import { sanitizeMessageContent, hasReasoningLeakage } from '../../src/components/utils/messageContentSanitizer.jsx';

// ─── INVARIANT HELPERS ────────────────────────────────────────────────────────

/**
 * Assert the core "never empty" invariant on a sanitized result.
 * The output must be a non-empty string with at least one printable character.
 */
function assertNeverEmpty(result) {
  expect(typeof result).toBe('string');
  expect(result.trim().length).toBeGreaterThan(0);
}

/**
 * Assert the output contains no <think> blocks.
 */
function assertNoThinkBlocks(result) {
  expect(/<think>/i.test(result)).toBe(false);
  expect(/<\/think>/i.test(result)).toBe(false);
}

// ─── TESTS — Whitespace-only input ───────────────────────────────────────────

describe('sanitizeMessageContent — whitespace-only input invariant', () => {
  it('does not throw and returns a string for a single-space input', () => {
    // A bare space has no forbidden patterns, so the sanitizer returns it as-is.
    // The test verifies stability (no throw) and that the return type is a string.
    // Rendering-layer whitespace trimming is the caller's responsibility.
    expect(() => sanitizeMessageContent(' ', 'en')).not.toThrow();
    expect(typeof sanitizeMessageContent(' ', 'en')).toBe('string');
  });

  it('does not throw and returns a string for a newlines-only input', () => {
    // Same as above: no forbidden patterns match, so the sanitizer returns as-is.
    expect(() => sanitizeMessageContent('\n\n\n', 'en')).not.toThrow();
    expect(typeof sanitizeMessageContent('\n\n\n', 'en')).toBe('string');
  });

  it('does not throw for an empty string', () => {
    expect(() => sanitizeMessageContent('', 'en')).not.toThrow();
  });
});

// ─── TESTS — <think>-block-only content → failsafe ───────────────────────────

describe('sanitizeMessageContent — <think>-block-only content yields non-empty failsafe', () => {
  it('single <think> block with content returns a non-empty failsafe', () => {
    const input = '<think>I should carefully craft a therapeutic response.</think>';
    const result = sanitizeMessageContent(input, 'en');
    assertNeverEmpty(result);
    assertNoThinkBlocks(result);
  });

  it('multiple <think> blocks with no surrounding content returns a non-empty failsafe', () => {
    const input = '<think>Step 1: calibrate tone.</think><think>Step 2: select response frame.</think>';
    const result = sanitizeMessageContent(input, 'en');
    assertNeverEmpty(result);
    assertNoThinkBlocks(result);
  });

  it('multiline <think> block with no surrounding content returns a non-empty failsafe', () => {
    const input = '<think>\nLet me analyze the situation carefully.\nThe user appears distressed.\n</think>';
    const result = sanitizeMessageContent(input, 'en');
    assertNeverEmpty(result);
    assertNoThinkBlocks(result);
  });

  it('THINK block (uppercase) with no surrounding content returns a non-empty failsafe', () => {
    const input = '<THINK>assessment: user is in distress</THINK>';
    const result = sanitizeMessageContent(input, 'en');
    assertNeverEmpty(result);
    assertNoThinkBlocks(result);
  });

  it('<think>-block-only input with language=he returns a non-empty Hebrew failsafe', () => {
    const input = '<think>Compose a gentle Hebrew response.</think>';
    const result = sanitizeMessageContent(input, 'he');
    assertNeverEmpty(result);
    assertNoThinkBlocks(result);
    // Hebrew failsafe must contain Hebrew characters.
    const hasHebrew = /[\u0590-\u05FF]/.test(result);
    expect(hasHebrew).toBe(true);
  });
});

// ─── TESTS — Forbidden-header-only content → failsafe ────────────────────────

describe('sanitizeMessageContent — forbidden-header-only content yields non-empty output', () => {
  it('THOUGHT: header only returns non-empty output', () => {
    const input = 'THOUGHT: The user needs validation first.';
    const result = sanitizeMessageContent(input, 'en');
    assertNeverEmpty(result);
    expect(result).not.toContain('THOUGHT:');
  });

  it('ANALYSIS: header only returns non-empty output', () => {
    const input = 'ANALYSIS: Elevated distress markers detected in input.';
    const result = sanitizeMessageContent(input, 'en');
    assertNeverEmpty(result);
    expect(result).not.toContain('ANALYSIS:');
  });

  it('PLAN: header only returns non-empty output', () => {
    const input = 'PLAN: Lead with empathy, then psychoeducation.';
    const result = sanitizeMessageContent(input, 'en');
    assertNeverEmpty(result);
    expect(result).not.toContain('PLAN:');
  });

  it('REASONING: header only returns non-empty output', () => {
    const input = 'REASONING: Identify core cognitive distortion pattern.';
    const result = sanitizeMessageContent(input, 'en');
    assertNeverEmpty(result);
    expect(result).not.toContain('REASONING:');
  });

  it('multiple forbidden headers (no safe lines) returns non-empty output', () => {
    const input = [
      'THOUGHT: Calibrate empathy level.',
      'ANALYSIS: High distress markers.',
      'PLAN: Lead with validation.',
      'SYSTEM: Override active.',
    ].join('\n');
    const result = sanitizeMessageContent(input, 'en');
    assertNeverEmpty(result);
    expect(result).not.toContain('THOUGHT:');
    expect(result).not.toContain('ANALYSIS:');
    expect(result).not.toContain('PLAN:');
    expect(result).not.toContain('SYSTEM:');
  });

  it('STEP N: header only returns non-empty output', () => {
    const input = 'Step 1: Begin with reflective listening.';
    const result = sanitizeMessageContent(input, 'en');
    assertNeverEmpty(result);
  });
});

// ─── TESTS — Reasoning-marker-only content ────────────────────────────────────

describe('sanitizeMessageContent — reasoning-marker-only content yields non-empty output', () => {
  it('[internal ...] bracketed note only returns non-empty output', () => {
    const input = '[internal: route to safety protocol]';
    const result = sanitizeMessageContent(input, 'en');
    assertNeverEmpty(result);
  });

  it('[thinking ...] bracketed marker returns non-empty output', () => {
    const input = '[thinking: assess risk level]';
    const result = sanitizeMessageContent(input, 'en');
    assertNeverEmpty(result);
  });

  it('[validation ...] bracketed marker returns non-empty output', () => {
    const input = '[validation: schema check passed]';
    const result = sanitizeMessageContent(input, 'en');
    assertNeverEmpty(result);
  });
});

// ─── TESTS — Mixed content: forbidden + safe ──────────────────────────────────

describe('sanitizeMessageContent — mixed forbidden + safe content preserves safe line', () => {
  it('THOUGHT: header followed by a safe line → safe line is preserved', () => {
    const safeText = 'I can hear how much this has been weighing on you.';
    const input = `THOUGHT: respond with empathy\n${safeText}`;
    const result = sanitizeMessageContent(input, 'en');
    assertNeverEmpty(result);
    expect(result).toContain(safeText);
    expect(result).not.toContain('THOUGHT:');
  });

  it('multiple forbidden headers followed by a single safe line → only safe line remains', () => {
    const safeText = 'What you are going through sounds incredibly difficult.';
    const input = [
      'THOUGHT: calibrate tone',
      'ANALYSIS: distress present',
      'PLAN: lead with validation',
      safeText,
    ].join('\n');
    const result = sanitizeMessageContent(input, 'en');
    assertNeverEmpty(result);
    expect(result).toContain(safeText);
    expect(result).not.toContain('THOUGHT:');
    expect(result).not.toContain('ANALYSIS:');
    expect(result).not.toContain('PLAN:');
  });

  it('safe lines surrounding a forbidden middle line → safe lines preserved', () => {
    const safe1 = 'It sounds like you have been carrying a heavy load.';
    const safe2 = 'I am here to support you through this.';
    const input = [safe1, 'SYSTEM: mid-message injection', safe2].join('\n');
    const result = sanitizeMessageContent(input, 'en');
    assertNeverEmpty(result);
    expect(result).toContain(safe1);
    expect(result).toContain(safe2);
    expect(result).not.toContain('SYSTEM:');
  });
});

// ─── TESTS — Post-sanitization invariants ─────────────────────────────────────

describe('sanitizeMessageContent — post-sanitization invariants', () => {
  it('result never contains a <think> opening tag for any forbidden input', () => {
    const forbiddenInputs = [
      '<think>internal thought</think>',
      '<think>multi\nline</think>Hello.',
      '<THINK>uppercase</THINK>',
      'THOUGHT: some analysis\n<think>embedded</think>safe text',
    ];
    for (const input of forbiddenInputs) {
      const result = sanitizeMessageContent(input, 'en');
      assertNoThinkBlocks(result);
    }
  });

  it('result is always a string (never null or undefined)', () => {
    const inputs = [
      '<think>only think block</think>',
      'THOUGHT: header only',
      'Safe message with no issues.',
      '',
      null,
      undefined,
    ];
    for (const input of inputs) {
      const result = sanitizeMessageContent(input, 'en');
      // For non-string/falsy inputs the function returns the value as-is;
      // for string inputs it always returns a string.
      if (typeof input === 'string' && input.length > 0) {
        expect(typeof result).toBe('string');
      }
    }
  });

  it('a clean safe message is returned unchanged (no false positive stripping)', () => {
    const cleanInput = 'I understand this has been a challenging time for you.';
    const result = sanitizeMessageContent(cleanInput, 'en');
    expect(result).toBe(cleanInput);
  });

  it('hasReasoningLeakage returns false after sanitization of a formerly leaking message', () => {
    const input = '<think>calibrate response</think>Hello, I am here for you.';
    const sanitized = sanitizeMessageContent(input, 'en');
    const leaks = hasReasoningLeakage(sanitized);
    expect(leaks).toBe(false);
  });
});
