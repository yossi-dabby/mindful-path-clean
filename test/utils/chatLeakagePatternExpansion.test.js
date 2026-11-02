/**
 * chatLeakagePatternExpansion — regression test suite
 *
 * Verifies that the expanded set of meta-reasoning / policy-narration patterns
 * added to FORBIDDEN_INLINE_PATTERNS in messageContentSanitizer are correctly
 * detected and suppressed before any content reaches visible render state.
 *
 * Root causes addressed:
 *  - "The user is expressing gratitude…" — internal message-classification leak
 *  - "Relevant Constitution principles…" — policy narration leak
 *  - "I need to respond to…" — internal planning phrase leak
 *  - "This is a therapeutic response" — meta-commentary on own output
 *
 * All tests are additive and do not weaken any existing assertions.
 */

import { describe, it, expect } from 'vitest';
import {
  sanitizeMessageContent,
  hasReasoningLeakage,
} from '../../src/components/utils/messageContentSanitizer.jsx';

// ─── Meta-analysis of the user's message ─────────────────────────────────────

describe('sanitizeMessageContent — meta-analysis of user message', () => {
  it('strips "The user is expressing gratitude" line and preserves clean content', () => {
    const raw =
      'The user is expressing gratitude and satisfaction.\n\n' +
      'I am really glad this has been helpful for you.';
    const result = sanitizeMessageContent(raw, 'en');
    expect(result).not.toContain('The user is expressing gratitude');
    expect(result).toContain('I am really glad');
  });

  it('strips "The user is describing" line and preserves clean content', () => {
    const raw =
      'The user is describing a social anxiety situation.\n\n' +
      'It sounds like that situation was really uncomfortable.';
    const result = sanitizeMessageContent(raw, 'en');
    expect(result).not.toMatch(/The user is describing/i);
    expect(result).toContain('It sounds like');
  });

  it('strips "The user\'s message indicates" line', () => {
    const raw =
      "The user's message indicates a positive shift in mood.\n\nI'm glad to hear things feel a bit better.";
    const result = sanitizeMessageContent(raw, 'en');
    expect(result).not.toMatch(/The user's message indicates/i);
    expect(result).toContain("I'm glad");
  });

  it('strips "The user\'s request is" line', () => {
    const raw =
      "The user's request is for form recommendations.\n\nHere are some forms that may help you:";
    const result = sanitizeMessageContent(raw, 'en');
    expect(result).not.toMatch(/The user's request is/i);
    expect(result).toContain('Here are some forms');
  });
});

// ─── Policy narration / Constitution leak ────────────────────────────────────

describe('sanitizeMessageContent — policy narration / constitution leak', () => {
  it('strips "Relevant Constitution principles" line and preserves clean content', () => {
    const raw =
      'Relevant Constitution principles: CP3, CP7, CP12.\n\n' +
      'Let me offer you a simple grounding exercise.';
    const result = sanitizeMessageContent(raw, 'en');
    expect(result).not.toMatch(/Relevant Constitution principles/i);
    expect(result).toContain('Let me offer you');
  });

  it('strips "Relevant Constitution rules" line', () => {
    const raw =
      'Relevant Constitution rules apply here.\n\nI am here to support you.';
    const result = sanitizeMessageContent(raw, 'en');
    expect(result).not.toMatch(/Relevant Constitution rules/i);
    expect(result).toContain('I am here to support you');
  });

  it('strips "Per the constitution" line', () => {
    const raw =
      'Per the constitution, I should maintain directive focus.\n\nTake one small step today.';
    const result = sanitizeMessageContent(raw, 'en');
    expect(result).not.toMatch(/Per the constitution/i);
    expect(result).toContain('Take one small step today');
  });

  it('strips "According to the guidelines" line', () => {
    const raw =
      'According to the guidelines, I need to offer a directive response.\n\nHere is what I suggest.';
    const result = sanitizeMessageContent(raw, 'en');
    expect(result).not.toMatch(/According to the guidelines/i);
    expect(result).toContain('Here is what I suggest');
  });

  it('strips "Applying principle" line', () => {
    const raw =
      'Applying principle CP12 — directive output.\n\nLet\'s focus on one concrete step.';
    const result = sanitizeMessageContent(raw, 'en');
    expect(result).not.toMatch(/Applying principle/i);
    expect(result).toContain("Let's focus on one concrete step");
  });
});

// ─── Internal planning phrases ────────────────────────────────────────────────

describe('sanitizeMessageContent — internal planning phrases', () => {
  it('strips "I need to respond to" line and preserves clean content', () => {
    const raw =
      'I need to respond to this gratitude message appropriately.\n\n' +
      "It's really great to hear that the exercise helped!";
    const result = sanitizeMessageContent(raw, 'en');
    expect(result).not.toMatch(/I need to respond to/i);
    expect(result).toContain("It's really great");
  });

  it('strips "I need to generate" line', () => {
    const raw =
      'I need to generate a directive response for this turn.\n\nHere is what I recommend:';
    const result = sanitizeMessageContent(raw, 'en');
    expect(result).not.toMatch(/I need to generate/i);
    expect(result).toContain('Here is what I recommend');
  });

  it('strips "I will now produce a response" line', () => {
    const raw =
      'I will now produce a therapeutic response.\n\nI hear you — that sounds really hard.';
    const result = sanitizeMessageContent(raw, 'en');
    expect(result).not.toMatch(/I will now produce/i);
    expect(result).toContain('I hear you');
  });
});

// ─── Meta-commentary on own output ───────────────────────────────────────────

describe('sanitizeMessageContent — meta-commentary on own output', () => {
  it('strips "This is a therapeutic response" line', () => {
    const raw =
      'This is a therapeutic response addressing gratitude.\n\n' +
      'Thank you for sharing that with me.';
    const result = sanitizeMessageContent(raw, 'en');
    expect(result).not.toMatch(/This is a therapeutic response/i);
    expect(result).toContain('Thank you for sharing');
  });

  it('strips "This should be a brief response" line', () => {
    const raw =
      'This should be a brief response.\n\nI am here with you.';
    const result = sanitizeMessageContent(raw, 'en');
    expect(result).not.toMatch(/This should be a brief response/i);
    expect(result).toContain('I am here with you');
  });
});

// ─── hasReasoningLeakage — expanded pattern detection ────────────────────────

describe('hasReasoningLeakage — expanded meta-reasoning detection', () => {
  it('detects "The user is expressing" as leakage', () => {
    expect(hasReasoningLeakage('The user is expressing gratitude.\n\nThank you.')).toBe(true);
  });

  it('detects "Relevant Constitution principles" as leakage', () => {
    expect(hasReasoningLeakage('Relevant Constitution principles: CP3.\n\nLet\'s move forward.')).toBe(true);
  });

  it('returns false for clean therapeutic content', () => {
    expect(hasReasoningLeakage('I hear you. That sounds difficult.')).toBe(false);
  });

  it('returns false for clean Hebrew content', () => {
    expect(hasReasoningLeakage('אני כאן איתך. מה הכי מטריד אותך?')).toBe(false);
  });
});

// ─── Failsafe: full leakage block with only internal content ─────────────────

describe('sanitizeMessageContent — failsafe for full leakage block', () => {
  it('returns a non-empty failsafe when all lines are leakage tokens', () => {
    const raw =
      'The user is expressing gratitude.\n' +
      'Relevant Constitution principles: CP3, CP12.\n' +
      'I need to respond with directive output.\n' +
      'This is a therapeutic response.';
    const result = sanitizeMessageContent(raw, 'en');
    expect(typeof result).toBe('string');
    expect(result.trim().length).toBeGreaterThan(0);
    // None of the leakage lines should survive
    expect(result).not.toMatch(/The user is expressing/i);
    expect(result).not.toMatch(/Relevant Constitution/i);
    expect(result).not.toMatch(/I need to respond/i);
    expect(result).not.toMatch(/This is a therapeutic response/i);
  });
});
