/**
 * Regression tests for the crisis detection layer.
 *
 * These tests cover the pure client-side regex detector defined in
 * src/components/utils/crisisDetector.jsx, which is Layer 1 of the
 * two-layer crisis detection system (Layer 2 is the LLM-based
 * enhancedCrisisDetector.ts backend function — not tested here).
 *
 * Exports under test:
 *   - detectCrisisLanguage(message) → boolean
 *   - detectCrisisWithReason(message) → null | reason_code
 *
 * Valid reason_code values (from categorizeReason):
 *   'self_harm' | 'suicide' | 'overdose' | 'immediate_danger' | 'general_crisis'
 *
 * Pattern matching notes (document current behavior to protect against regression):
 *   - Patterns match the base verb form: "hurt myself" is detected, "hurting myself" is not.
 *   - The "take all" pattern requires the imperative "take", not the gerund "taking".
 *   - All patterns are case-insensitive (via /i flag).
 *   - The \s+ quantifier means extra internal spaces in a crisis phrase are tolerated.
 *   - "goodbye cruel world" is detected as CRISIS but categorized as 'general_crisis'
 *     (the categorizeReason function only contains the pattern "goodbye world", not the
 *     "cruel" variant — this is existing production behavior, documented here for awareness).
 *
 * If CRISIS_PATTERNS, normalizeForDetection, or categorizeReason change,
 * update this file to match and review whether coverage is still adequate.
 */

import { describe, it, expect } from 'vitest';
import {
  detectCrisisLanguage,
  detectCrisisWithReason,
} from '../../src/components/utils/crisisDetector.js';

// ─── HELPER ──────────────────────────────────────────────────────────────────

/** Expect a message to be flagged as crisis. */
function expectCrisis(message) {
  expect(detectCrisisLanguage(message), `expected crisis flag for: "${message}"`).toBe(true);
  expect(detectCrisisWithReason(message), `expected non-null reason for: "${message}"`).not.toBeNull();
}

/** Expect a message NOT to be flagged as crisis. */
function expectSafe(message) {
  expect(detectCrisisLanguage(message), `expected safe (no flag) for: "${message}"`).toBe(false);
  expect(detectCrisisWithReason(message), `expected null reason for: "${message}"`).toBeNull();
}

// ─── VALID REASON CODES ───────────────────────────────────────────────────────

const VALID_REASON_CODES = new Set([
  'self_harm',
  'suicide',
  'overdose',
  'immediate_danger',
  'general_crisis',
]);

// ─── 1. CLEAR CRISIS — SELF-HARM LANGUAGE ────────────────────────────────────

describe('detectCrisisLanguage — clear self-harm language', () => {
  it('detects "want to harm myself"', () => {
    expectCrisis('I want to harm myself');
  });

  it('detects "want to hurt myself"', () => {
    expectCrisis('I want to hurt myself');
  });

  it('detects "cutting myself"', () => {
    expectCrisis('I have been cutting myself again');
  });

  it('detects "cut myself"', () => {
    expectCrisis('I want to cut myself');
  });

  it('detects "harm my self" (spaced variant)', () => {
    expectCrisis('I want to harm my self');
  });

  it('detects "hurt my self" (spaced variant)', () => {
    expectCrisis('I keep wanting to hurt my self');
  });

  it('does NOT detect "hurting myself" — pattern requires immediate whitespace after the verb', () => {
    // The CRISIS_PATTERNS regex uses \b(kill|hurt|harm)\s+(myself|my\s*self)\b.
    // In "hurting myself", the engine matches "hurt" but then requires \s+ (whitespace)
    // immediately next — instead it encounters "ing", so the match fails.
    // This documents an existing coverage gap for gerund forms of the verb.
    expectSafe('I am thinking about hurting myself');
  });
});

// ─── 2. SUICIDAL IDEATION ─────────────────────────────────────────────────────

describe('detectCrisisLanguage — suicidal ideation', () => {
  it('detects the word "suicide"', () => {
    expectCrisis('I have been thinking about suicide');
  });

  it('detects "suicide" in a confessional sentence', () => {
    expectCrisis('suicide feels like the only option');
  });

  it('detects "don\'t want to live"', () => {
    expectCrisis("I don't want to live anymore");
  });

  it('detects "dont want to live" (no apostrophe)', () => {
    expectCrisis('I dont want to live like this');
  });

  it('detects "don\'t want to be alive"', () => {
    expectCrisis("I don't want to be alive");
  });

  it('detects "end my life" via end-it-all pattern', () => {
    expectCrisis('I want to end my life');
  });

  it('detects "end it all"', () => {
    expectCrisis('I just want to end it all');
  });

  it('detects "ready to die"', () => {
    expectCrisis('I feel ready to die');
  });

  it('detects "ready to end it"', () => {
    expectCrisis('I feel ready to end it');
  });

  it('detects the canonical Hebrew benchmark phrase for ending one\'s life', () => {
    expectCrisis('אני רוצה לשים קץ לחיי הלילה.');
    expect(detectCrisisWithReason('אני רוצה לשים קץ לחיי הלילה.')).toBe('suicide');
  });

  it('detects common Hebrew variants for ending one\'s life', () => {
    expectCrisis('אני רוצה לשים קץ לחיים');
    expectCrisis('אני רוצה לגמור את חיי');
  });

  it('does not flag a directly negated Hebrew ending-one\'s-life phrase', () => {
    expectSafe('אני לא רוצה לשים קץ לחיי');
  });
});

// ─── 3. OVERDOSE / METHOD LANGUAGE ───────────────────────────────────────────

describe('detectCrisisLanguage — overdose and method language', () => {
  it('detects "overdose"', () => {
    expectCrisis('I am thinking of an overdose');
  });

  it('detects "take all my pills"', () => {
    expectCrisis('I want to take all my pills');
  });

  it('detects "take all my meds"', () => {
    expectCrisis('I could take all my meds');
  });

  it('detects "take all the pills"', () => {
    expectCrisis('take all the pills right now');
  });

  it('detects "take all my medication"', () => {
    expectCrisis('I want to take all my medication');
  });

  it('does NOT detect "taking all the pills" — pattern requires base verb "take"', () => {
    // The pattern is \btake\s+all\s+ which requires the exact word "take".
    // "taking" (gerund) is not matched. This documents an existing coverage gap.
    expectSafe('I feel like taking all the pills');
  });

  it('does NOT detect "taking all my medication" — pattern requires base verb "take"', () => {
    expectSafe('thinking about taking all my medication');
  });
});

// ─── 4. IMMEDIATE DANGER LANGUAGE ────────────────────────────────────────────

describe('detectCrisisLanguage — immediate danger language', () => {
  it('detects "goodbye world"', () => {
    expectCrisis('goodbye world, I am done');
  });

  it('detects "goodbye cruel world"', () => {
    expectCrisis('goodbye cruel world');
  });

  it('detects "can\'t go on"', () => {
    expectCrisis("I just can't go on");
  });

  it('detects "cant go on" (no apostrophe)', () => {
    expectCrisis('I cant go on like this');
  });

  it('detects "better off dead"', () => {
    expectCrisis('everyone would be better off dead');
  });

  it('detects "better off without me"', () => {
    expectCrisis('I think everyone is better off without me');
  });
});

// ─── 5. INDIRECT BUT CONCERNING LANGUAGE ─────────────────────────────────────

describe('detectCrisisLanguage — indirect but concerning language', () => {
  it('detects "no point in living"', () => {
    expectCrisis('there is no point in living');
  });

  it('detects "no point in going on"', () => {
    expectCrisis('there is no point in going on');
  });

  it('detects "no point in continuing"', () => {
    expectCrisis('I see no point in continuing');
  });

  it('detects "want to disappear"', () => {
    expectCrisis('I just want to disappear');
  });

  it('detects "everyone would be better off without me"', () => {
    expectCrisis('I think everyone would be better off without me');
  });

  it('detects "everyone better off without me" (shorter form)', () => {
    expectCrisis('everyone is better off without me');
  });

  it('detects "can\'t take this anymore"', () => {
    expectCrisis("I can't take this anymore");
  });

  it('detects "can\'t do it anymore"', () => {
    expectCrisis("I can't do it anymore");
  });

  it('detects "cant take this anymore" (no apostrophe)', () => {
    expectCrisis('I just cant take this anymore');
  });
});

// ─── 6. CASE INSENSITIVITY AND WHITESPACE TOLERANCE ──────────────────────────

describe('detectCrisisLanguage — case insensitivity and whitespace', () => {
  it('detects crisis phrase in ALL CAPS', () => {
    expectCrisis('I WANT TO HURT MYSELF');
  });

  it('detects crisis phrase in Title Case', () => {
    expectCrisis('I Want To Hurt Myself');
  });

  it('detects crisis phrase with extra internal spaces (\\s+ tolerance)', () => {
    // The \s+ quantifier in patterns means extra spaces within a phrase are tolerated.
    expectCrisis('I want to hurt  myself');
  });

  it('detects "SUICIDE" in uppercase', () => {
    expectCrisis('SUICIDE is all I think about');
  });

  it('detects "Overdose" in mixed case', () => {
    expectCrisis('thinking about an Overdose');
  });

  it('detects crisis phrase with leading and trailing whitespace', () => {
    expectCrisis('  I want to hurt myself  ');
  });
});

// ─── 7. FALSE-POSITIVE PROTECTION — BENIGN PHRASES ───────────────────────────

describe('detectCrisisLanguage — false-positive protection (benign phrases)', () => {
  it('does not flag general sadness: "I feel really sad today"', () => {
    expectSafe('I feel really sad today');
  });

  it('does not flag normal frustration: "I am so frustrated with everything"', () => {
    expectSafe('I am so frustrated with everything');
  });

  it('does not flag grief: "I miss my grandmother who passed away"', () => {
    expectSafe('I miss my grandmother who passed away');
  });

  it('does not flag anxiety: "I have been feeling very anxious lately"', () => {
    expectSafe('I have been feeling very anxious lately');
  });

  it('does not flag loneliness: "I feel so alone and isolated"', () => {
    expectSafe('I feel so alone and isolated');
  });

  it('does not flag exhaustion: "I am completely exhausted and burned out"', () => {
    expectSafe('I am completely exhausted and burned out');
  });

  it('does not flag ambiguous distress: "I am struggling right now"', () => {
    expectSafe('I am struggling right now');
  });

  it('does not flag general overwhelm: "everything feels too much right now"', () => {
    expectSafe('everything feels too much right now');
  });

  it('does not flag "this job is stressing me with deadlines"', () => {
    expectSafe('this job is stressing me with deadlines');
  });

  it('does not flag "she disappeared for a while on vacation"', () => {
    // "disappeared" (past tense, third person) does not match "want to disappear"
    expectSafe('she disappeared for a while on vacation');
  });

  it('does not flag "I feel like a burden to everyone"', () => {
    expectSafe('I feel like a burden to everyone');
  });

  it('does not flag "I feel hopeless about the situation"', () => {
    expectSafe('I feel hopeless about the situation');
  });

  it('does not flag "I have been crying all day"', () => {
    expectSafe('I have been crying all day');
  });
});

// ─── 8. INPUT VALIDATION AND EDGE CASES ──────────────────────────────────────

describe('detectCrisisLanguage — edge cases and input validation', () => {
  it('returns false for null input', () => {
    expect(detectCrisisLanguage(null)).toBe(false);
  });

  it('returns false for undefined input', () => {
    expect(detectCrisisLanguage(undefined)).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(detectCrisisLanguage('')).toBe(false);
  });

  it('returns false for whitespace-only string', () => {
    expect(detectCrisisLanguage('   ')).toBe(false);
  });

  it('returns false for a number input', () => {
    expect(detectCrisisLanguage(42)).toBe(false);
  });

  it('returns false for an object input', () => {
    expect(detectCrisisLanguage({})).toBe(false);
  });

  it('returns false for an array input', () => {
    expect(detectCrisisLanguage([])).toBe(false);
  });

  it('handles very long safe text without throwing', () => {
    const longText = 'I am feeling okay. '.repeat(500);
    expect(() => detectCrisisLanguage(longText)).not.toThrow();
    expect(detectCrisisLanguage(longText)).toBe(false);
  });

  it('handles text with emoji without throwing', () => {
    expect(() => detectCrisisLanguage('I feel 😢 today but I am okay')).not.toThrow();
    expect(detectCrisisLanguage('I feel 😢 today but I am okay')).toBe(false);
  });

  it('handles a boolean input gracefully', () => {
    expect(detectCrisisLanguage(true)).toBe(false);
    expect(detectCrisisLanguage(false)).toBe(false);
  });
});

// ─── 9. detectCrisisWithReason — NULL FOR SAFE MESSAGES ──────────────────────

describe('detectCrisisWithReason — returns null for safe messages', () => {
  it('returns null for a benign message', () => {
    expect(detectCrisisWithReason('I had a hard day at work')).toBeNull();
  });

  it('returns null for null input', () => {
    expect(detectCrisisWithReason(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(detectCrisisWithReason(undefined)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(detectCrisisWithReason('')).toBeNull();
  });

  it('returns null for whitespace-only string', () => {
    expect(detectCrisisWithReason('   ')).toBeNull();
  });
});

// ─── 10. detectCrisisWithReason — REASON CODE SHAPE ──────────────────────────

describe('detectCrisisWithReason — reason code shape and categories', () => {
  it('returns a string reason code for crisis messages', () => {
    const reason = detectCrisisWithReason('I want to harm myself');
    expect(typeof reason).toBe('string');
    expect(reason.length).toBeGreaterThan(0);
  });

  it('returns a valid reason code from the known set for any crisis input', () => {
    const crisisInputs = [
      'I want to harm myself',
      'thinking about suicide',
      'planning an overdose',
      'goodbye world',
      "I can't go on",
    ];
    for (const input of crisisInputs) {
      const reason = detectCrisisWithReason(input);
      expect(
        VALID_REASON_CODES.has(reason),
        `reason "${reason}" for "${input}" must be one of: ${[...VALID_REASON_CODES].join(', ')}`
      ).toBe(true);
    }
  });

  it('categorizes "harm myself" as "self_harm"', () => {
    expect(detectCrisisWithReason('I want to harm myself')).toBe('self_harm');
  });

  it('categorizes "hurt myself" as "self_harm"', () => {
    expect(detectCrisisWithReason('I want to hurt myself')).toBe('self_harm');
  });

  it('categorizes "cut myself" as "self_harm"', () => {
    expect(detectCrisisWithReason('I want to cut myself')).toBe('self_harm');
  });

  it('categorizes "suicide" as "suicide"', () => {
    expect(detectCrisisWithReason('I have been thinking about suicide')).toBe('suicide');
  });

  it('categorizes "overdose" as "overdose"', () => {
    expect(detectCrisisWithReason('I am planning an overdose')).toBe('overdose');
  });

  it('categorizes "goodbye world" as "immediate_danger"', () => {
    expect(detectCrisisWithReason('goodbye world')).toBe('immediate_danger');
  });

  it('categorizes "goodbye cruel world" as "general_crisis" (not "immediate_danger")', () => {
    // The categorizeReason immediate_danger pattern uses "goodbye\s+world" (without the
    // optional "cruel" variant that appears in the CRISIS_PATTERNS detection regex).
    // As a result, "goodbye cruel world" is correctly detected as a crisis but falls
    // through to general_crisis in the reason categorizer.
    // This is existing production behavior, documented here to protect against silent change.
    // NOTE: semantically "goodbye cruel world" carries the same urgency as "goodbye world",
    // so aligning the categorizeReason pattern may be worth a future safety review.
    expect(detectCrisisWithReason('goodbye cruel world')).toBe('general_crisis');
  });

  it('categorizes "ready to die" as "immediate_danger"', () => {
    expect(detectCrisisWithReason('I feel ready to die')).toBe('immediate_danger');
  });

  it('categorizes "ready to end it" as "immediate_danger"', () => {
    expect(detectCrisisWithReason('I feel ready to end it')).toBe('immediate_danger');
  });

  it('categorizes "take all my pills" as "immediate_danger"', () => {
    expect(detectCrisisWithReason('I want to take all my pills')).toBe('immediate_danger');
  });

  it('categorizes indirect crisis patterns as "general_crisis"', () => {
    const generalCrisisInputs = [
      'I want to disappear',
      "I can't go on",
      "I can't take this anymore",
      'there is no point in living',
      'everyone would be better off without me',
    ];
    for (const input of generalCrisisInputs) {
      const reason = detectCrisisWithReason(input);
      expect(
        reason === 'general_crisis',
        `expected "general_crisis" for "${input}", got "${reason}"`
      ).toBe(true);
    }
  });
});

// ─── 11. REGRESSION — PATTERNS MUST NOT BE SILENTLY REMOVED ──────────────────
//
// This suite locks in each pattern family so that future changes to CRISIS_PATTERNS
// cannot silently remove detection of any category without a test failure.
//

describe('detectCrisisLanguage — regression guard: all pattern families present', () => {
  const PATTERN_FAMILY_EXAMPLES = [
    // self-harm (base verb forms required — "hurt/harm/cut myself")
    { label: 'hurt myself',            input: 'I want to hurt myself' },
    { label: 'harm myself',            input: 'I want to harm myself' },
    { label: 'cut myself',             input: 'I want to cut myself' },
    { label: 'cutting myself',         input: 'I have been cutting myself' },
    // suicide
    { label: 'suicide',                input: 'thinking about suicide' },
    // end it
    { label: 'end my life',            input: 'I want to end my life' },
    { label: 'end it all',             input: 'end it all' },
    // don't want to live
    { label: "don't want to live",     input: "I don't want to live" },
    { label: "don't want to be alive", input: "I don't want to be alive" },
    // overdose
    { label: 'overdose',               input: 'planning an overdose' },
    { label: 'take all my pills',      input: 'take all my pills' },
    { label: 'take all my meds',       input: 'take all my meds' },
    { label: 'take all the pills',     input: 'take all the pills' },
    { label: 'take all my medication', input: 'take all my medication' },
    // immediate danger
    { label: 'goodbye world',          input: 'goodbye world' },
    { label: 'goodbye cruel world',    input: 'goodbye cruel world' },
    { label: "can't go on",            input: "I can't go on" },
    { label: 'better off dead',        input: 'better off dead' },
    { label: 'better off without me',  input: 'better off without me' },
    // indirect
    { label: 'no point in living',     input: 'no point in living' },
    { label: 'no point in going on',   input: 'no point in going on' },
    { label: 'no point in continuing', input: 'no point in continuing' },
    { label: 'want to disappear',      input: 'want to disappear' },
    { label: 'everyone better off without me', input: 'everyone better off without me' },
    { label: "can't take this anymore",input: "I can't take this anymore" },
    { label: "can't do it anymore",    input: "I can't do it anymore" },
    { label: 'ready to die',           input: 'I feel ready to die' },
    { label: 'ready to end it',        input: 'I feel ready to end it' },
  ];

  for (const { label, input } of PATTERN_FAMILY_EXAMPLES) {
    it(`pattern family "${label}" is still detected`, () => {
      expect(
        detectCrisisLanguage(input),
        `pattern family "${label}" must still be detected for input: "${input}"`
      ).toBe(true);
    });
  }
});
