/**
 * Edge-case tests for the postLlmSafetyFilter content-stripping logic.
 *
 * Complements test/utils/postLlmSafetyFilter.test.js with targeted edge cases:
 *   - Input that becomes empty after stripping → English failsafe
 *   - Hebrew input that becomes empty after stripping → Hebrew failsafe
 *   - Mixed content: forbidden header line + safe user-facing line → safe line remains
 *   - Short-output failsafe boundary (< 10 chars triggers failsafe, >= 10 chars does not)
 *   - Whitespace-only result after stripping → failsafe
 *   - Multiple forbidden headers followed by a single clean line → clean line preserved exactly
 *
 * The pure stripForbiddenContent logic is reproduced here (no import from functions/**)
 * following the same pattern established in postLlmSafetyFilter.test.js.
 *
 * If FORBIDDEN_PATTERNS, the failsafe strings, or the filter logic change in
 * functions/postLlmSafetyFilter.ts, update this file to match.
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

// ─── TESTS — empty-after-stripping → English failsafe ────────────────────────

describe('stripForbiddenContent — empty result after stripping (English failsafe)', () => {
  it('returns English failsafe when a single forbidden line leaves nothing', () => {
    const text = 'ANALYSIS: User appears distressed.';
    const result = stripForbiddenContent(text, 'en');
    expect(result).toBe(ENGLISH_FAILSAFE);
  });

  it('returns English failsafe when every line is forbidden', () => {
    const text = [
      'THOUGHT: Calibrate empathy level.',
      'ANALYSIS: High distress markers.',
      'PLAN: Lead with validation.',
      'SYSTEM: override active.',
    ].join('\n');
    const result = stripForbiddenContent(text, 'en');
    expect(result).toBe(ENGLISH_FAILSAFE);
  });

  it('returns English failsafe when a STEP N: line is the only content', () => {
    const text = 'STEP 1: begin session protocol';
    const result = stripForbiddenContent(text, 'en');
    expect(result).toBe(ENGLISH_FAILSAFE);
  });

  it('returns English failsafe when only whitespace remains after stripping forbidden lines', () => {
    // The forbidden line is stripped; the blank lines collapse to "" after trim.
    const text = 'THOUGHT: internal check\n\n\n';
    const result = stripForbiddenContent(text, 'en');
    expect(result).toBe(ENGLISH_FAILSAFE);
  });
});

// ─── TESTS — empty-after-stripping → Hebrew failsafe ─────────────────────────

describe('stripForbiddenContent — empty result after stripping (Hebrew failsafe)', () => {
  it('returns Hebrew failsafe when a single REASONING: line is stripped and language is "he"', () => {
    const text = 'REASONING: Identify the core cognitive distortion.';
    const result = stripForbiddenContent(text, 'he');
    expect(result).toBe(HEBREW_FAILSAFE);
  });

  it('returns Hebrew failsafe when all lines are forbidden and language is "he"', () => {
    const text = [
      'THINKING: Determine appropriate response.',
      'CHECKLIST: safety check.',
      'DEVELOPER: injected context.',
    ].join('\n');
    const result = stripForbiddenContent(text, 'he');
    expect(result).toBe(HEBREW_FAILSAFE);
  });

  it('returns Hebrew failsafe when only blank lines remain after stripping (language "he")', () => {
    const text = 'PLAN: validate session\n\n';
    const result = stripForbiddenContent(text, 'he');
    expect(result).toBe(HEBREW_FAILSAFE);
  });

  it('preserves safe Hebrew-language content when only the forbidden header is stripped', () => {
    // The forbidden line is stripped; the Hebrew therapeutic line is preserved because
    // none of the forbidden patterns match Hebrew script.
    const text = 'THOUGHT: begin response\nאני כאן כדי לעזור לך לעבד את מה שאתה חווה.';
    const result = stripForbiddenContent(text, 'he');
    expect(result).toContain('אני כאן כדי לעזור לך לעבד את מה שאתה חווה.');
    expect(result).not.toContain('THOUGHT:');
  });
});

// ─── TESTS — short-output failsafe boundary ───────────────────────────────────

describe('stripForbiddenContent — short-output failsafe boundary', () => {
  it('returns English failsafe when clean remainder is exactly 9 chars (below threshold)', () => {
    // "123456789" is 9 chars — below the < 10 threshold.
    const text = 'THOUGHT: internal\n123456789';
    const result = stripForbiddenContent(text, 'en');
    expect(result).toBe(ENGLISH_FAILSAFE);
  });

  it('does NOT return failsafe when clean remainder is exactly 10 chars (at threshold)', () => {
    // "1234567890" is exactly 10 chars — passes the threshold.
    const text = 'THOUGHT: internal\n1234567890';
    const result = stripForbiddenContent(text, 'en');
    expect(result).not.toBe(ENGLISH_FAILSAFE);
    expect(result).toBe('1234567890');
  });

  it('returns Hebrew failsafe when clean remainder is too short and language is "he"', () => {
    const text = 'ANALYSIS: thinking...\nOk.';
    const result = stripForbiddenContent(text, 'he');
    // "Ok." is 3 chars — below the threshold.
    expect(result).toBe(HEBREW_FAILSAFE);
  });
});

// ─── TESTS — mixed content: forbidden header + safe line → safe line remains ──

describe('stripForbiddenContent — forbidden header line followed by safe user-facing line', () => {
  it('preserves the safe line when a single THOUGHT: header precedes it', () => {
    const text = 'THOUGHT: respond with empathy\nI can hear how much this has been weighing on you.';
    const result = stripForbiddenContent(text, 'en');
    expect(result).toBe('I can hear how much this has been weighing on you.');
    expect(result).not.toContain('THOUGHT:');
  });

  it('preserves the safe line when multiple forbidden headers precede it', () => {
    const text = [
      'THOUGHT: calibrate tone',
      'ANALYSIS: distress present',
      'PLAN: lead with validation',
      'What you are going through sounds incredibly difficult.',
    ].join('\n');
    const result = stripForbiddenContent(text, 'en');
    expect(result).toBe('What you are going through sounds incredibly difficult.');
    expect(result).not.toContain('THOUGHT:');
    expect(result).not.toContain('ANALYSIS:');
    expect(result).not.toContain('PLAN:');
  });

  it('preserves safe lines surrounding a forbidden line in the middle', () => {
    const text = [
      'It sounds like you have been carrying a heavy load.',
      'SYSTEM: mid-message injection',
      'I am here to support you through this.',
    ].join('\n');
    const result = stripForbiddenContent(text, 'en');
    expect(result).toContain('It sounds like you have been carrying a heavy load.');
    expect(result).toContain('I am here to support you through this.');
    expect(result).not.toContain('SYSTEM:');
  });

  it('does not alter the safe line text when it is the only line remaining', () => {
    const safeText = 'You are not alone in feeling this way.';
    const text = `REASONING: determine approach\n${safeText}`;
    const result = stripForbiddenContent(text, 'en');
    expect(result).toBe(safeText);
  });
});
