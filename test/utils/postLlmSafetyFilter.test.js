/**
 * Tests for the postLlmSafetyFilter and sanitizeAgentOutput filtering logic.
 *
 * These tests mirror the pure stripForbiddenContent function defined in
 * functions/postLlmSafetyFilter.ts. Because that file uses the Deno runtime
 * (excluded from vitest), the pure content-stripping logic is reproduced here
 * so the "No Reasoning Leakage" enforcement rules remain covered by the
 * project test suite.
 *
 * The sanitizeText function in functions/sanitizeAgentOutput.ts follows the
 * same filtering strategy; representative patterns from that function are also
 * covered here.
 *
 * Covers:
 *   - Clean messages pass through unchanged
 *   - Each class of forbidden pattern is stripped correctly
 *   - Bracketed internal note lines are stripped
 *   - Technical/system term lines are stripped
 *   - Language-aware failsafe (Hebrew vs English)
 *   - Content too short after stripping triggers failsafe
 *   - Non-string input is handled gracefully
 *   - Pattern matching is case-insensitive where appropriate
 *
 * If FORBIDDEN_PATTERNS, the failsafe strings, or the filter logic change,
 * update this file to match.
 */

import { describe, it, expect } from 'vitest';

// ─── FORBIDDEN PATTERNS (mirrors functions/postLlmSafetyFilter.ts) ─────────────
const FORBIDDEN_PATTERNS = [
  // Reasoning markers
  /^\s*THOUGHT:/mi,
  /^\s*THINKING:/mi,
  /^\s*ANALYSIS:/mi,
  /^\s*REASONING:/mi,
  /^\s*INTERNAL:/mi,
  /^\s*SYSTEM:/mi,
  /^\s*DEVELOPER:/mi,
  /^\s*PLAN:/mi,
  /^\s*CHECKLIST:/mi,
  /^\s*STEP\s+\d+:/mi,
  /^\s*CONFIDENCE:/mi,

  // Meta-commentary about process
  /^I should\b/mi,
  /^I need to\b/mi,
  /^I will\b/mi,
  /^Let me\b/mi,
  /^First I'll\b/mi,
  /^Then I'll\b/mi,
  /^My goal is\b/mi,
  /^The next step is\b/mi,

  // Bracketed internal notes
  /\[checking/i,
  /\[internal/i,
  /\[validation/i,
  /\[constraint/i,
  /\[protocol/i,
  /\[note:/i,

  // Technical/system terms
  /\bconstraint checklist\b/i,
  /\bmental sandbox\b/i,
  /\bconfidence score\b/i,
  /\bsanitizer\b/i,
  /\bhard gate\b/i,
  /\binstrumentation\b/i,
  /\bpolling\b/i,
  /\bparse failed\b/i,
  /\bdetection layer\b/i,
  /\bassessment protocol\b/i,

  // Process narration
  /\bhere's a plan\b/i,
  /\blet's break down\b/i,
  /\bnow I'll\b/i,
  /\bnext I'll\b/i,
];

const HEBREW_FAILSAFE = 'אני כאן איתך. מה הכי מטריד אותך כרגע?';
const ENGLISH_FAILSAFE = "I'm here with you. What's on your mind?";

// ─── STRIP FORBIDDEN CONTENT (mirrors functions/postLlmSafetyFilter.ts) ────────
function stripForbiddenContent(text, userLanguage = 'en') {
  if (!text || typeof text !== 'string') {
    return text;
  }

  const lines = text.split('\n');
  const cleanedLines = lines.filter(line => {
    const trimmed = line.trim();
    if (!trimmed) return true;
    return !FORBIDDEN_PATTERNS.some(pattern => pattern.test(line));
  });

  let cleaned = cleanedLines.join('\n').trim();

  if (!cleaned || cleaned.length < 10) {
    cleaned = userLanguage === 'he' ? HEBREW_FAILSAFE : ENGLISH_FAILSAFE;
  }

  return cleaned;
}

// ─── TESTS — clean messages pass through ─────────────────────────────────────

describe('stripForbiddenContent — clean messages pass through', () => {
  it('returns a clean therapeutic message unchanged', () => {
    const text = 'That sounds really difficult. How are you feeling right now?';
    expect(stripForbiddenContent(text)).toBe(text);
  });

  it('preserves multi-line clean content', () => {
    const text = 'I hear you.\nThat must have been hard.\nWould you like to talk more?';
    expect(stripForbiddenContent(text)).toBe(text);
  });

  it('preserves empty lines within clean content', () => {
    const text = 'Line one.\n\nLine two.';
    expect(stripForbiddenContent(text)).toBe(text);
  });

  it('handles null input gracefully', () => {
    expect(stripForbiddenContent(null)).toBeNull();
  });

  it('handles undefined input gracefully', () => {
    expect(stripForbiddenContent(undefined)).toBeUndefined();
  });

  it('handles numeric input gracefully', () => {
    expect(stripForbiddenContent(42)).toBe(42);
  });

  it('handles empty string by returning it unchanged (falsy guard)', () => {
    // The function guards with `if (!text ...)` — empty string is falsy, returned as-is.
    // buildDocument prevents empty primary_text from reaching the filter in production.
    const result = stripForbiddenContent('');
    expect(result).toBe('');
  });
});

// ─── TESTS — reasoning marker patterns ───────────────────────────────────────

describe('stripForbiddenContent — reasoning markers are stripped', () => {
  it('strips lines starting with THOUGHT:', () => {
    const text = 'THOUGHT: I should respond with empathy.\nI understand your concern.';
    const result = stripForbiddenContent(text);
    expect(result).not.toContain('THOUGHT:');
    expect(result).toContain('I understand your concern.');
  });

  it('strips lines starting with THINKING:', () => {
    const text = 'THINKING: Let me consider the best response.\nHere is my answer.';
    const result = stripForbiddenContent(text);
    expect(result).not.toContain('THINKING:');
    expect(result).toContain('Here is my answer.');
  });

  it('strips lines starting with ANALYSIS:', () => {
    const text = 'ANALYSIS: The user seems anxious.\nThat sounds tough.';
    const result = stripForbiddenContent(text);
    expect(result).not.toContain('ANALYSIS:');
    expect(result).toContain('That sounds tough.');
  });

  it('strips lines starting with REASONING:', () => {
    const text = 'REASONING: I will use a CBT approach.\nHow are you feeling?';
    const result = stripForbiddenContent(text);
    expect(result).not.toContain('REASONING:');
    expect(result).toContain('How are you feeling?');
  });

  it('strips lines starting with INTERNAL:', () => {
    const text = 'INTERNAL: checking user context\nI am here to support you.';
    const result = stripForbiddenContent(text);
    expect(result).not.toContain('INTERNAL:');
    expect(result).toContain('I am here to support you.');
  });

  it('strips lines starting with PLAN:', () => {
    const text = 'PLAN: Ask about feelings first.\nHow have you been lately?';
    const result = stripForbiddenContent(text);
    expect(result).not.toContain('PLAN:');
    expect(result).toContain('How have you been lately?');
  });

  it('strips lines starting with STEP N:', () => {
    const text = 'STEP 1: Acknowledge feelings.\nSTEP 2: Reflect back.\nI hear you.';
    const result = stripForbiddenContent(text);
    expect(result).not.toContain('STEP 1:');
    expect(result).not.toContain('STEP 2:');
    expect(result).toContain('I hear you.');
  });

  it('strips lines starting with CHECKLIST:', () => {
    const text = 'CHECKLIST: verify safety\nYou are in a safe space.';
    const result = stripForbiddenContent(text);
    expect(result).not.toContain('CHECKLIST:');
    expect(result).toContain('You are in a safe space.');
  });
});

// ─── TESTS — meta-commentary patterns ────────────────────────────────────────

describe('stripForbiddenContent — meta-commentary patterns are stripped', () => {
  it('strips "I should" line-starting phrases', () => {
    const text = 'I should be empathetic here.\nHow are you doing?';
    const result = stripForbiddenContent(text);
    expect(result).not.toContain('I should');
    expect(result).toContain('How are you doing?');
  });

  it('strips "Let me" line-starting phrases', () => {
    const text = 'Let me think about this for a moment.\nI understand.';
    const result = stripForbiddenContent(text);
    expect(result).not.toContain('Let me think');
    expect(result).toContain('I understand.');
  });

  it('strips "My goal is" line-starting phrases', () => {
    const text = 'My goal is to provide emotional support.\nYou mentioned feeling overwhelmed.';
    const result = stripForbiddenContent(text);
    expect(result).not.toContain('My goal is');
    expect(result).toContain('You mentioned feeling overwhelmed.');
  });

  it('strips "I need to" line-starting phrases', () => {
    const text = 'I need to be careful here.\nThat sounds really hard.';
    const result = stripForbiddenContent(text);
    expect(result).not.toContain('I need to');
    expect(result).toContain('That sounds really hard.');
  });

  it('strips "First I\'ll" line-starting phrases', () => {
    const text = "First I'll acknowledge the feeling.\nI hear you.";
    const result = stripForbiddenContent(text);
    expect(result).not.toMatch(/First I'll/);
    expect(result).toContain('I hear you.');
  });

  it('strips "The next step is" line-starting phrases', () => {
    const text = 'The next step is to check in with you.\nHow are you right now?';
    const result = stripForbiddenContent(text);
    expect(result).not.toContain('The next step is');
    expect(result).toContain('How are you right now?');
  });
});

// ─── TESTS — bracketed internal notes ────────────────────────────────────────

describe('stripForbiddenContent — bracketed internal notes are stripped', () => {
  it('strips lines containing [checking', () => {
    const text = '[checking CBT protocol]\nHere is what I suggest.';
    const result = stripForbiddenContent(text);
    expect(result).not.toContain('[checking');
    expect(result).toContain('Here is what I suggest.');
  });

  it('strips lines containing [internal', () => {
    const text = '[internal validation passed]\nThat sounds meaningful to me.';
    const result = stripForbiddenContent(text);
    expect(result).not.toContain('[internal');
    expect(result).toContain('That sounds meaningful to me.');
  });

  it('strips lines containing [validation', () => {
    const text = '[validation: passed]\nYou are doing well.';
    const result = stripForbiddenContent(text);
    expect(result).not.toContain('[validation');
    expect(result).toContain('You are doing well.');
  });

  it('strips lines containing [note:', () => {
    const text = '[note: this user is distressed]\nI hear you.';
    const result = stripForbiddenContent(text);
    expect(result).not.toContain('[note:');
    expect(result).toContain('I hear you.');
  });

  it('strips lines containing [protocol', () => {
    const text = '[protocol: crisis mode]\nYou are safe here.';
    const result = stripForbiddenContent(text);
    expect(result).not.toContain('[protocol');
    expect(result).toContain('You are safe here.');
  });
});

// ─── TESTS — technical/system term patterns ───────────────────────────────────

describe('stripForbiddenContent — technical/system term lines are stripped', () => {
  it('strips lines containing "constraint checklist"', () => {
    const text = 'Running constraint checklist now.\nYou are safe.';
    const result = stripForbiddenContent(text);
    expect(result).not.toContain('constraint checklist');
    expect(result).toContain('You are safe.');
  });

  it('strips lines containing "confidence score"', () => {
    const text = 'confidence score: 0.93\nI understand your concern.';
    const result = stripForbiddenContent(text);
    expect(result).not.toContain('confidence score');
    expect(result).toContain('I understand your concern.');
  });

  it('strips lines containing "mental sandbox"', () => {
    const text = 'mental sandbox active\nHow can I help?';
    const result = stripForbiddenContent(text);
    expect(result).not.toContain('mental sandbox');
    expect(result).toContain('How can I help?');
  });

  it('strips lines containing "hard gate"', () => {
    const text = 'hard gate triggered\nI am here with you.';
    const result = stripForbiddenContent(text);
    expect(result).not.toContain('hard gate');
    expect(result).toContain('I am here with you.');
  });

  it('strips lines containing "detection layer"', () => {
    const text = 'detection layer active\nThat sounds challenging.';
    const result = stripForbiddenContent(text);
    expect(result).not.toContain('detection layer');
    expect(result).toContain('That sounds challenging.');
  });

  it('strips lines containing "assessment protocol"', () => {
    const text = 'assessment protocol: standard\nLet us talk about what is on your mind.';
    const result = stripForbiddenContent(text);
    expect(result).not.toContain('assessment protocol');
  });

  it('strips lines containing "here\'s a plan"', () => {
    const text = "Here's a plan for our conversation.\nWe can start with how you are feeling.";
    const result = stripForbiddenContent(text);
    expect(result).not.toContain("here's a plan");
    expect(result).toContain('We can start with how you are feeling.');
  });
});

// ─── TESTS — failsafe behavior ────────────────────────────────────────────────

describe('stripForbiddenContent — failsafe behavior', () => {
  it('returns English failsafe when all content is stripped with language "en"', () => {
    const text = 'THOUGHT: This is all internal reasoning.';
    const result = stripForbiddenContent(text, 'en');
    expect(result).toBe(ENGLISH_FAILSAFE);
  });

  it('returns Hebrew failsafe when all content is stripped with language "he"', () => {
    const text = 'THOUGHT: This is all internal reasoning.';
    const result = stripForbiddenContent(text, 'he');
    expect(result).toBe(HEBREW_FAILSAFE);
  });

  it('returns failsafe when remaining content is too short (< 10 chars)', () => {
    const text = 'THOUGHT: This is all internal.\nOk.';
    const result = stripForbiddenContent(text, 'en');
    // "Ok." is 3 chars, which is < 10, so failsafe kicks in
    expect(result.length).toBeGreaterThanOrEqual(10);
    expect(result).toBe(ENGLISH_FAILSAFE);
  });

  it('does not trigger failsafe when enough clean content remains', () => {
    const text = 'THOUGHT: Internal note.\nThis is a substantive and helpful response to the user.';
    const result = stripForbiddenContent(text, 'en');
    expect(result).toContain('substantive and helpful');
    expect(result).not.toBe(ENGLISH_FAILSAFE);
  });

  it('English failsafe is a non-empty string', () => {
    expect(ENGLISH_FAILSAFE.length).toBeGreaterThan(0);
  });

  it('Hebrew failsafe is a non-empty string', () => {
    expect(HEBREW_FAILSAFE.length).toBeGreaterThan(0);
  });

  it('defaults to English failsafe when language is not specified', () => {
    const text = 'THOUGHT: Everything is internal.';
    const result = stripForbiddenContent(text);
    expect(result).toBe(ENGLISH_FAILSAFE);
  });
});

// ─── TESTS — case-insensitive matching ────────────────────────────────────────

describe('stripForbiddenContent — case-insensitive matching', () => {
  it('strips "CONSTRAINT CHECKLIST" in uppercase', () => {
    const text = 'CONSTRAINT CHECKLIST check passed\nContinuing.';
    const result = stripForbiddenContent(text);
    expect(result).not.toContain('CONSTRAINT CHECKLIST');
    expect(result).toContain('Continuing.');
  });

  it('strips "[INTERNAL" uppercase bracket note', () => {
    const text = '[INTERNAL note here]\nContinuing.';
    const result = stripForbiddenContent(text);
    expect(result).not.toContain('[INTERNAL');
    expect(result).toContain('Continuing.');
  });

  it('strips "MENTAL SANDBOX" in uppercase', () => {
    const text = 'MENTAL SANDBOX active\nHow can I help?';
    const result = stripForbiddenContent(text);
    expect(result).not.toContain('MENTAL SANDBOX');
    expect(result).toContain('How can I help?');
  });

  it('strips "CONFIDENCE SCORE" in uppercase', () => {
    const text = 'CONFIDENCE SCORE: 0.95\nI hear you.';
    const result = stripForbiddenContent(text);
    expect(result).not.toContain('CONFIDENCE SCORE');
    expect(result).toContain('I hear you.');
  });
});

// ─── TESTS — multi-line mixed content ─────────────────────────────────────────

describe('stripForbiddenContent — multi-line mixed content', () => {
  it('strips only forbidden lines and preserves clean lines', () => {
    const text = [
      'THOUGHT: I should start empathetically.',
      'I hear that you are going through a difficult time.',
      'PLAN: Ask about support network.',
      'Would it help to talk about what has been happening?',
    ].join('\n');
    const result = stripForbiddenContent(text);
    expect(result).not.toContain('THOUGHT:');
    expect(result).not.toContain('PLAN:');
    expect(result).toContain('I hear that you are going through a difficult time.');
    expect(result).toContain('Would it help to talk about what has been happening?');
  });

  it('preserves blank lines between clean content blocks', () => {
    const text = 'First clean line.\n\nSecond clean line.';
    expect(stripForbiddenContent(text)).toBe(text);
  });

  it('strips multiple reasoning lines in a row, keeps all clean lines', () => {
    const text = [
      'THOUGHT: Consider tone.',
      'ANALYSIS: User is anxious.',
      'REASONING: Use grounding.',
      'That sounds really hard to deal with.',
      'What has been helping you cope lately?',
    ].join('\n');
    const result = stripForbiddenContent(text);
    expect(result).not.toContain('THOUGHT:');
    expect(result).not.toContain('ANALYSIS:');
    expect(result).not.toContain('REASONING:');
    expect(result).toContain('That sounds really hard to deal with.');
    expect(result).toContain('What has been helping you cope lately?');
  });
});

// ─── TESTS — additional untested reasoning markers ────────────────────────────

describe('stripForbiddenContent — additional reasoning markers (regression lock)', () => {
  it('strips lines starting with SYSTEM:', () => {
    const text = 'SYSTEM: override mode active\nYou are not alone.';
    const result = stripForbiddenContent(text);
    expect(result).not.toContain('SYSTEM:');
    expect(result).toContain('You are not alone.');
  });

  it('strips lines starting with DEVELOPER:', () => {
    const text = 'DEVELOPER: injected context\nI hear you.';
    const result = stripForbiddenContent(text);
    expect(result).not.toContain('DEVELOPER:');
    expect(result).toContain('I hear you.');
  });

  it('strips lines starting with CONFIDENCE:', () => {
    const text = 'CONFIDENCE: 0.87\nThat must have been difficult.';
    const result = stripForbiddenContent(text);
    expect(result).not.toContain('CONFIDENCE:');
    expect(result).toContain('That must have been difficult.');
  });

  it('strips lines starting with "I will"', () => {
    const text = 'I will provide empathetic support.\nHow are you feeling?';
    const result = stripForbiddenContent(text);
    expect(result).not.toMatch(/^I will/m);
    expect(result).toContain('How are you feeling?');
  });

  it('strips lines starting with "Then I\'ll"', () => {
    const text = "Then I'll summarize the session.\nThank you for sharing that.";
    const result = stripForbiddenContent(text);
    expect(result).not.toMatch(/Then I'll/);
    expect(result).toContain('Thank you for sharing that.');
  });

  it('strips lines with leading whitespace before THOUGHT:', () => {
    const text = '  THOUGHT: internal processing\nI understand what you mean.';
    const result = stripForbiddenContent(text);
    expect(result).not.toContain('THOUGHT:');
    expect(result).toContain('I understand what you mean.');
  });

  it('strips lines with leading whitespace before PLAN:', () => {
    const text = '   PLAN: structure the response\nWould you like to continue?';
    const result = stripForbiddenContent(text);
    expect(result).not.toContain('PLAN:');
    expect(result).toContain('Would you like to continue?');
  });
});

// ─── TESTS — additional untested bracketed patterns ───────────────────────────

describe('stripForbiddenContent — additional bracketed internal note patterns', () => {
  it('strips lines containing [constraint', () => {
    const text = '[constraint: no medical advice]\nI am here to listen.';
    const result = stripForbiddenContent(text);
    expect(result).not.toContain('[constraint');
    expect(result).toContain('I am here to listen.');
  });

  it('strips mixed-case [Constraint bracket note', () => {
    const text = '[Constraint check passed]\nLet us talk about that.';
    const result = stripForbiddenContent(text);
    expect(result).not.toContain('[Constraint');
    expect(result).toContain('Let us talk about that.');
  });
});

// ─── TESTS — additional untested technical/system terms ───────────────────────

describe('stripForbiddenContent — additional technical/system term patterns (regression lock)', () => {
  it('strips lines containing "sanitizer"', () => {
    const text = 'sanitizer active\nThat takes courage to share.';
    const result = stripForbiddenContent(text);
    expect(result).not.toContain('sanitizer');
    expect(result).toContain('That takes courage to share.');
  });

  it('strips lines containing "instrumentation"', () => {
    const text = 'instrumentation layer engaged\nI hear you.';
    const result = stripForbiddenContent(text);
    expect(result).not.toContain('instrumentation');
    expect(result).toContain('I hear you.');
  });

  it('strips lines containing "polling"', () => {
    const text = 'polling for next token\nHow can I help?';
    const result = stripForbiddenContent(text);
    expect(result).not.toContain('polling');
    expect(result).toContain('How can I help?');
  });

  it('strips lines containing "parse failed"', () => {
    const text = 'parse failed at offset 42\nI am still here with you.';
    const result = stripForbiddenContent(text);
    expect(result).not.toContain('parse failed');
    expect(result).toContain('I am still here with you.');
  });
});

// ─── TESTS — additional untested process narration patterns ──────────────────

describe('stripForbiddenContent — additional process narration patterns (regression lock)', () => {
  it('strips lines containing "let\'s break down"', () => {
    const text = "Let's break down what happened.\nYou mentioned feeling overwhelmed.";
    const result = stripForbiddenContent(text);
    expect(result).not.toMatch(/let's break down/i);
    expect(result).toContain('You mentioned feeling overwhelmed.');
  });

  it('strips lines containing "now I\'ll"', () => {
    const text = "Now I'll address your concern.\nThat sounds really tough.";
    const result = stripForbiddenContent(text);
    expect(result).not.toMatch(/now I'll/i);
    expect(result).toContain('That sounds really tough.');
  });

  it('strips lines containing "next I\'ll"', () => {
    const text = "Next I'll check in about coping.\nWhat strategies have worked for you?";
    const result = stripForbiddenContent(text);
    expect(result).not.toMatch(/next I'll/i);
    expect(result).toContain('What strategies have worked for you?');
  });
});

// ─── TESTS — sanitization boundaries (no internal marker leakage) ─────────────

describe('stripForbiddenContent — sanitization boundaries', () => {
  it('does not strip clean content that merely contains the word "plan" mid-sentence', () => {
    // The pattern /^\s*PLAN:/mi only blocks lines that START with PLAN:
    const text = 'We can make a plan together for your week.';
    const result = stripForbiddenContent(text);
    expect(result).toContain('plan together');
  });

  it('does not strip clean sentences containing "I will" mid-sentence', () => {
    // The pattern /^I will\b/mi only blocks line-starting "I will"
    // A sentence like "I know I will feel better" does not start with "I will"
    const text = 'I know I will feel better soon.\nHow are you coping today?';
    const result = stripForbiddenContent(text);
    // The first line starts with "I know", not "I will", so it should pass
    expect(result).toContain('How are you coping today?');
  });

  it('strips all known internal marker types from a heavily mixed message', () => {
    const text = [
      'THOUGHT: Calibrate response.',
      'SYSTEM: injection check.',
      'DEVELOPER: context override.',
      'CONFIDENCE: 0.91',
      'ANALYSIS: user shows anxiety markers.',
      '[internal state review]',
      '[checking safety gate]',
      'confidence score: 0.93',
      'mental sandbox active.',
      'I hear you and I am here for you.',
      'What would feel most helpful right now?',
    ].join('\n');
    const result = stripForbiddenContent(text);
    expect(result).not.toContain('THOUGHT:');
    expect(result).not.toContain('SYSTEM:');
    expect(result).not.toContain('DEVELOPER:');
    expect(result).not.toContain('CONFIDENCE:');
    expect(result).not.toContain('ANALYSIS:');
    expect(result).not.toContain('[internal');
    expect(result).not.toContain('[checking');
    expect(result).not.toContain('confidence score');
    expect(result).not.toContain('mental sandbox');
    expect(result).toContain('I hear you and I am here for you.');
    expect(result).toContain('What would feel most helpful right now?');
  });

  it('returns failsafe rather than leaking internal content when all lines are forbidden', () => {
    const text = [
      'THOUGHT: I should be careful.',
      'ANALYSIS: High distress.',
      'PLAN: Use grounding technique.',
      'SYSTEM: logging active.',
    ].join('\n');
    const result = stripForbiddenContent(text, 'en');
    expect(result).toBe(ENGLISH_FAILSAFE);
    expect(result).not.toContain('THOUGHT:');
    expect(result).not.toContain('ANALYSIS:');
    expect(result).not.toContain('PLAN:');
    expect(result).not.toContain('SYSTEM:');
  });
});
