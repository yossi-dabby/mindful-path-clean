/**
 * Tests for the sanitizeText filtering logic defined in
 * functions/sanitizeAgentOutput.ts.
 *
 * Because that file uses the Deno runtime (excluded from vitest), the pure
 * content-stripping logic is reproduced here so the filtering rules remain
 * covered by the project test suite.
 *
 * Key differences from postLlmSafetyFilter.ts:
 *   - Reasoning markers use word-boundary (\b) rather than a trailing colon.
 *   - CONFIDENCE SCORE, MENTAL SANDBOX, CONSTRAINT CHECKLIST are mid-line matches.
 *   - `my goal is` and `here's a plan` are mid-line (not line-start only).
 *   - Only the Hebrew failsafe is used (no language selection).
 *   - Empty lines are not explicitly preserved (they pass through naturally).
 *
 * Covers:
 *   - Word-boundary reasoning marker patterns
 *   - Mid-line technical/system term detection
 *   - Always-Hebrew failsafe when content is too short
 *   - Clean content passes through unchanged
 *   - Non-string input returned as-is
 *   - Multi-line mixed content
 *   - Regression locking of all defined patterns
 *
 * If FORBIDDEN_PATTERNS, HEBREW_FAILSAFE, or sanitizeText change in
 * functions/sanitizeAgentOutput.ts, update this file to match.
 */

import { describe, it, expect } from 'vitest';

// ─── FORBIDDEN PATTERNS (mirrors functions/sanitizeAgentOutput.ts) ────────────

const FORBIDDEN_PATTERNS = [
  /^\s*THOUGHT\b/mi,
  /^\s*THINKING\b/mi,
  /^\s*ANALYSIS\b/mi,
  /^\s*REASONING\b/mi,
  /^\s*INTERNAL\b/mi,
  /^\s*SYSTEM\b/mi,
  /^\s*DEVELOPER\b/mi,
  /^\s*PLAN\b/mi,
  /^\s*CHECKLIST\b/mi,
  /^\s*STEP\s+\d+/mi,
  /\bCONFIDENCE\s+SCORE\b/i,
  /\bMENTAL SANDBOX\b/i,
  /\bCONSTRAINT CHECKLIST\b/i,
  /\bmy goal is\b/i,
  /\bhere's a plan\b/i,
  /\blet's break down\b/i,
  /^\s*let me\s+/mi,
  /^\s*first I'll\b/mi,
  /^\s*then I'll\b/mi,
  /^\s*I should\b/mi,
  /^\s*I need to\b/mi,
  /^\s*I will\b/mi,
  /\[checking/i,
  /\[internal/i,
  /\[validation/i,
  /\[constraint/i,
  /\[protocol/i,
  /\bsanitizer\b/i,
  /\bhard gate\b/i,
  /\binstrumentation\b/i,
  /\bpolling\b/i,
  /\bparse failed\b/i,
  /\bdetection layer\b/i,
  /\bassessment protocol\b/i,
];

const HEBREW_FAILSAFE = 'אני כאן איתך. מה הכי מטריד אותך כרגע?';

// ─── SANITIZE TEXT (mirrors functions/sanitizeAgentOutput.ts) ─────────────────

function sanitizeText(text) {
  if (!text || typeof text !== 'string') {
    return text;
  }

  const lines = text.split('\n');

  const cleanedLines = lines.filter(line => {
    return !FORBIDDEN_PATTERNS.some(pattern => pattern.test(line));
  });

  let cleaned = cleanedLines.join('\n').trim();

  if (!cleaned || cleaned.length < 10) {
    cleaned = HEBREW_FAILSAFE;
  }

  return cleaned;
}

// ─── TESTS — clean messages pass through ─────────────────────────────────────

describe('sanitizeText — clean messages pass through unchanged', () => {
  it('returns a clean therapeutic message unchanged', () => {
    const text = 'That sounds really difficult. How are you feeling right now?';
    expect(sanitizeText(text)).toBe(text);
  });

  it('preserves multi-line clean content', () => {
    const text = 'I hear you.\nThat must have been hard.\nWould you like to talk more?';
    expect(sanitizeText(text)).toBe(text);
  });

  it('preserves empty lines within clean content', () => {
    const text = 'Line one.\n\nLine two.';
    expect(sanitizeText(text)).toBe(text);
  });

  it('handles null input gracefully', () => {
    expect(sanitizeText(null)).toBeNull();
  });

  it('handles undefined input gracefully', () => {
    expect(sanitizeText(undefined)).toBeUndefined();
  });

  it('handles numeric input gracefully', () => {
    expect(sanitizeText(42)).toBe(42);
  });

  it('handles empty string (falsy guard returns it as-is)', () => {
    expect(sanitizeText('')).toBe('');
  });
});

// ─── TESTS — word-boundary reasoning marker patterns ─────────────────────────

describe('sanitizeText — word-boundary reasoning markers are stripped', () => {
  it('strips lines starting with THOUGHT (word boundary, no colon required)', () => {
    const text = 'THOUGHT internal calibration\nI understand your concern.';
    const result = sanitizeText(text);
    expect(result).not.toContain('THOUGHT');
    expect(result).toContain('I understand your concern.');
  });

  it('strips lines starting with THINKING (word boundary)', () => {
    const text = 'THINKING about tone\nHow have you been feeling?';
    const result = sanitizeText(text);
    expect(result).not.toContain('THINKING');
    expect(result).toContain('How have you been feeling?');
  });

  it('strips lines starting with ANALYSIS (word boundary)', () => {
    const text = 'ANALYSIS user shows high distress\nThat sounds hard.';
    const result = sanitizeText(text);
    expect(result).not.toContain('ANALYSIS');
    expect(result).toContain('That sounds hard.');
  });

  it('strips lines starting with REASONING (word boundary)', () => {
    const text = 'REASONING apply CBT\nI hear you.';
    const result = sanitizeText(text);
    expect(result).not.toContain('REASONING');
    expect(result).toContain('I hear you.');
  });

  it('strips lines starting with INTERNAL (word boundary)', () => {
    const text = 'INTERNAL state check\nYou are not alone.';
    const result = sanitizeText(text);
    expect(result).not.toContain('INTERNAL');
    expect(result).toContain('You are not alone.');
  });

  it('strips lines starting with SYSTEM (word boundary)', () => {
    const text = 'SYSTEM context override\nLet us talk about that.';
    const result = sanitizeText(text);
    expect(result).not.toContain('SYSTEM');
    expect(result).toContain('Let us talk about that.');
  });

  it('strips lines starting with DEVELOPER (word boundary)', () => {
    const text = 'DEVELOPER injected\nThank you for sharing.';
    const result = sanitizeText(text);
    expect(result).not.toContain('DEVELOPER');
    expect(result).toContain('Thank you for sharing.');
  });

  it('strips lines starting with PLAN (word boundary)', () => {
    const text = 'PLAN ask about coping\nWhat strategies help you most?';
    const result = sanitizeText(text);
    expect(result).not.toContain('PLAN');
    expect(result).toContain('What strategies help you most?');
  });

  it('strips lines starting with CHECKLIST (word boundary)', () => {
    const text = 'CHECKLIST verify safety\nYou are in a safe space.';
    const result = sanitizeText(text);
    expect(result).not.toContain('CHECKLIST');
    expect(result).toContain('You are in a safe space.');
  });

  it('strips lines starting with STEP followed by a digit', () => {
    const text = 'STEP 1 acknowledge feelings\nI understand that.';
    const result = sanitizeText(text);
    expect(result).not.toContain('STEP 1');
    expect(result).toContain('I understand that.');
  });

  it('strips lines with leading whitespace before a reasoning marker', () => {
    const text = '  THOUGHT internal note\nThat must be really hard.';
    const result = sanitizeText(text);
    expect(result).not.toContain('THOUGHT');
    expect(result).toContain('That must be really hard.');
  });
});

// ─── TESTS — mid-line technical/system term patterns ─────────────────────────

describe('sanitizeText — mid-line technical/system terms are stripped', () => {
  it('strips lines containing "CONFIDENCE SCORE"', () => {
    const text = 'CONFIDENCE SCORE: 0.95\nI hear you.';
    const result = sanitizeText(text);
    expect(result).not.toContain('CONFIDENCE SCORE');
    expect(result).toContain('I hear you.');
  });

  it('strips lines containing "MENTAL SANDBOX"', () => {
    const text = 'MENTAL SANDBOX active\nHow can I help?';
    const result = sanitizeText(text);
    expect(result).not.toContain('MENTAL SANDBOX');
    expect(result).toContain('How can I help?');
  });

  it('strips lines containing "CONSTRAINT CHECKLIST"', () => {
    const text = 'Running CONSTRAINT CHECKLIST\nYou are safe.';
    const result = sanitizeText(text);
    expect(result).not.toContain('CONSTRAINT CHECKLIST');
    expect(result).toContain('You are safe.');
  });

  it('strips lines containing "my goal is" (mid-line)', () => {
    const text = 'Ultimately, my goal is to support you.\nThat sounds meaningful.';
    const result = sanitizeText(text);
    expect(result).not.toMatch(/my goal is/i);
    expect(result).toContain('That sounds meaningful.');
  });

  it('strips lines containing "here\'s a plan" (mid-line)', () => {
    const text = "So here's a plan for us to try.\nYou mentioned feeling stuck.";
    const result = sanitizeText(text);
    expect(result).not.toMatch(/here's a plan/i);
    expect(result).toContain('You mentioned feeling stuck.');
  });

  it('strips lines containing "let\'s break down" (mid-line)', () => {
    const text = "Let's break down what is going on.\nWhat has been most difficult?";
    const result = sanitizeText(text);
    expect(result).not.toMatch(/let's break down/i);
    expect(result).toContain('What has been most difficult?');
  });

  it('strips lines containing "sanitizer"', () => {
    const text = 'sanitizer pass complete\nThat takes real strength.';
    const result = sanitizeText(text);
    expect(result).not.toContain('sanitizer');
    expect(result).toContain('That takes real strength.');
  });

  it('strips lines containing "hard gate"', () => {
    const text = 'hard gate triggered\nI am here with you.';
    const result = sanitizeText(text);
    expect(result).not.toContain('hard gate');
    expect(result).toContain('I am here with you.');
  });

  it('strips lines containing "instrumentation"', () => {
    const text = 'instrumentation layer engaged\nThank you for trusting me.';
    const result = sanitizeText(text);
    expect(result).not.toContain('instrumentation');
    expect(result).toContain('Thank you for trusting me.');
  });

  it('strips lines containing "polling"', () => {
    const text = 'polling for response\nI understand.';
    const result = sanitizeText(text);
    expect(result).not.toContain('polling');
    expect(result).toContain('I understand.');
  });

  it('strips lines containing "parse failed"', () => {
    const text = 'parse failed at offset 12\nLet us continue.';
    const result = sanitizeText(text);
    expect(result).not.toContain('parse failed');
    expect(result).toContain('Let us continue.');
  });

  it('strips lines containing "detection layer"', () => {
    const text = 'detection layer active\nThat sounds challenging.';
    const result = sanitizeText(text);
    expect(result).not.toContain('detection layer');
    expect(result).toContain('That sounds challenging.');
  });

  it('strips lines containing "assessment protocol"', () => {
    const text = 'assessment protocol: standard\nHow can I support you?';
    const result = sanitizeText(text);
    expect(result).not.toContain('assessment protocol');
    expect(result).toContain('How can I support you?');
  });
});

// ─── TESTS — meta-commentary line-start patterns ──────────────────────────────

describe('sanitizeText — meta-commentary line-start patterns', () => {
  it('strips lines starting with "let me"', () => {
    const text = 'let me consider your situation.\nThat sounds really hard.';
    const result = sanitizeText(text);
    expect(result).not.toMatch(/let me/i);
    expect(result).toContain('That sounds really hard.');
  });

  it('strips lines starting with "first I\'ll"', () => {
    const text = "First I'll acknowledge the feeling.\nI hear you.";
    const result = sanitizeText(text);
    expect(result).not.toMatch(/first I'll/i);
    expect(result).toContain('I hear you.');
  });

  it('strips lines starting with "then I\'ll"', () => {
    const text = "Then I'll summarize the session.\nThank you for sharing.";
    const result = sanitizeText(text);
    expect(result).not.toMatch(/then I'll/i);
    expect(result).toContain('Thank you for sharing.');
  });

  it('strips lines starting with "I should"', () => {
    const text = 'I should validate this feeling.\nYou are doing well.';
    const result = sanitizeText(text);
    expect(result).not.toMatch(/I should/);
    expect(result).toContain('You are doing well.');
  });

  it('strips lines starting with "I need to"', () => {
    const text = 'I need to be careful here.\nThat sounds really hard.';
    const result = sanitizeText(text);
    expect(result).not.toMatch(/I need to/);
    expect(result).toContain('That sounds really hard.');
  });

  it('strips lines starting with "I will"', () => {
    const text = 'I will provide support now.\nHow are you feeling?';
    const result = sanitizeText(text);
    expect(result).not.toMatch(/^I will/m);
    expect(result).toContain('How are you feeling?');
  });
});

// ─── TESTS — bracketed internal note patterns ─────────────────────────────────

describe('sanitizeText — bracketed internal note patterns', () => {
  it('strips lines containing [checking', () => {
    const text = '[checking CBT gate]\nHere is what I suggest.';
    const result = sanitizeText(text);
    expect(result).not.toContain('[checking');
    expect(result).toContain('Here is what I suggest.');
  });

  it('strips lines containing [internal', () => {
    const text = '[internal context loaded]\nThat sounds meaningful to me.';
    const result = sanitizeText(text);
    expect(result).not.toContain('[internal');
    expect(result).toContain('That sounds meaningful to me.');
  });

  it('strips lines containing [validation', () => {
    const text = '[validation passed]\nYou are doing well.';
    const result = sanitizeText(text);
    expect(result).not.toContain('[validation');
    expect(result).toContain('You are doing well.');
  });

  it('strips lines containing [constraint', () => {
    const text = '[constraint: no crisis detected]\nI am here with you.';
    const result = sanitizeText(text);
    expect(result).not.toContain('[constraint');
    expect(result).toContain('I am here with you.');
  });

  it('strips lines containing [protocol', () => {
    const text = '[protocol: standard session]\nYou are safe here.';
    const result = sanitizeText(text);
    expect(result).not.toContain('[protocol');
    expect(result).toContain('You are safe here.');
  });
});

// ─── TESTS — always-Hebrew failsafe ──────────────────────────────────────────

describe('sanitizeText — always-Hebrew failsafe (no language selection)', () => {
  it('returns Hebrew failsafe when all content is stripped', () => {
    const text = 'THOUGHT internal\nANALYSIS calibration check';
    const result = sanitizeText(text);
    expect(result).toBe(HEBREW_FAILSAFE);
  });

  it('returns Hebrew failsafe when remaining content is too short', () => {
    const text = 'THOUGHT: All internal.\nOk.';
    const result = sanitizeText(text);
    // "Ok." is 3 chars, which is < 10, so failsafe applies
    expect(result).toBe(HEBREW_FAILSAFE);
  });

  it('Hebrew failsafe is a non-empty string', () => {
    expect(HEBREW_FAILSAFE.length).toBeGreaterThan(0);
  });

  it('does not use English failsafe — only Hebrew is available', () => {
    const text = 'THOUGHT everything is internal';
    const result = sanitizeText(text);
    expect(result).toBe(HEBREW_FAILSAFE);
    expect(result).not.toBe("I'm here with you. What's on your mind?");
  });

  it('does not trigger failsafe when enough clean content remains', () => {
    const text = 'THOUGHT: Internal.\nThat is a meaningful observation worth exploring together.';
    const result = sanitizeText(text);
    expect(result).toContain('meaningful observation');
    expect(result).not.toBe(HEBREW_FAILSAFE);
  });
});

// ─── TESTS — multi-line mixed content ─────────────────────────────────────────

describe('sanitizeText — multi-line mixed content', () => {
  it('strips only forbidden lines and preserves clean lines', () => {
    const text = [
      'THOUGHT internal reasoning',
      'I hear that you are going through a difficult time.',
      'PLAN structure session',
      'Would it help to talk about what has been happening?',
    ].join('\n');
    const result = sanitizeText(text);
    expect(result).not.toContain('THOUGHT');
    expect(result).not.toContain('PLAN');
    expect(result).toContain('I hear that you are going through a difficult time.');
    expect(result).toContain('Would it help to talk about what has been happening?');
  });

  it('strips multiple consecutive forbidden lines, keeps all clean lines', () => {
    const text = [
      'THOUGHT tone calibration',
      'ANALYSIS distress level high',
      'REASONING use grounding technique',
      'CONFIDENCE SCORE: 0.91',
      'That sounds really hard to deal with.',
      'What has been helping you cope lately?',
    ].join('\n');
    const result = sanitizeText(text);
    expect(result).not.toContain('THOUGHT');
    expect(result).not.toContain('ANALYSIS');
    expect(result).not.toContain('REASONING');
    expect(result).not.toContain('CONFIDENCE SCORE');
    expect(result).toContain('That sounds really hard to deal with.');
    expect(result).toContain('What has been helping you cope lately?');
  });

  it('returns failsafe when all lines are internal markers', () => {
    const text = [
      'THOUGHT internal',
      'SYSTEM logging',
      'PLAN respond with empathy',
      '[checking safety]',
    ].join('\n');
    const result = sanitizeText(text);
    expect(result).toBe(HEBREW_FAILSAFE);
  });
});

// ─── TESTS — case-insensitive matching ───────────────────────────────────────

describe('sanitizeText — case-insensitive matching', () => {
  it('strips "confidence score" in lowercase', () => {
    const text = 'confidence score: 0.88\nI understand.';
    const result = sanitizeText(text);
    expect(result).not.toContain('confidence score');
    expect(result).toContain('I understand.');
  });

  it('strips "MENTAL SANDBOX" in uppercase', () => {
    const text = 'MENTAL SANDBOX active\nHow can I help?';
    const result = sanitizeText(text);
    expect(result).not.toContain('MENTAL SANDBOX');
    expect(result).toContain('How can I help?');
  });

  it('strips "Constraint Checklist" in mixed case', () => {
    const text = 'Running Constraint Checklist\nI hear you.';
    const result = sanitizeText(text);
    expect(result).not.toMatch(/constraint checklist/i);
    expect(result).toContain('I hear you.');
  });

  it('strips "[INTERNAL" in uppercase bracket', () => {
    const text = '[INTERNAL note here]\nContinuing.';
    const result = sanitizeText(text);
    expect(result).not.toContain('[INTERNAL');
    expect(result).toContain('Continuing.');
  });
});
