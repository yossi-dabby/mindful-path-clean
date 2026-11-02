/**
 * Normalization edge-case tests for the crisis detection layer.
 *
 * These tests complement test/utils/crisisDetector.test.js by drilling into
 * three specific normalization dimensions for the client-side detector in
 * src/components/utils/crisisDetector.jsx:
 *
 *   1. Extra internal spaces between words within a crisis phrase
 *      (handled by the \s+ quantifier present in every CRISIS_PATTERN)
 *   2. Trailing punctuation at the end of a crisis phrase / message
 *      (the \b word-boundary anchor still fires before punctuation chars)
 *   3. ALL-CAPS phrases across all pattern families
 *      (all patterns carry the /i flag; normalization also lowercases before
 *      checking)
 *
 * Additionally, a "known non-detections" section locks in current behavior for
 * benign inputs that appear structurally similar to crisis phrases but must NOT
 * be flagged.  These cases only assert the current production behavior;
 * they do not represent a judgment on whether that behavior is ideal.
 *
 * Exports under test (same as crisisDetector.test.js):
 *   - detectCrisisLanguage(message) → boolean
 *   - detectCrisisWithReason(message) → null | reason_code
 *
 * Do NOT modify src/components/utils/crisisDetector.jsx.
 * If the production source changes, update this file to match and re-review.
 */

import { describe, it, expect } from 'vitest';
import {
  detectCrisisLanguage,
  detectCrisisWithReason,
} from '../../src/components/utils/crisisDetector.js';

// ─── HELPERS ─────────────────────────────────────────────────────────────────

/** Assert message is flagged as crisis (boolean true + non-null reason). */
function expectCrisis(message) {
  expect(detectCrisisLanguage(message), `expected crisis for: "${message}"`).toBe(true);
  expect(detectCrisisWithReason(message), `expected non-null reason for: "${message}"`).not.toBeNull();
}

/** Assert message is NOT flagged as crisis (boolean false + null reason). */
function expectSafe(message) {
  expect(detectCrisisLanguage(message), `expected safe for: "${message}"`).toBe(false);
  expect(detectCrisisWithReason(message), `expected null reason for: "${message}"`).toBeNull();
}

// ─── 1. EXTRA INTERNAL SPACES ────────────────────────────────────────────────
// All CRISIS_PATTERNS use \s+ between tokens, so multiple consecutive spaces
// within a phrase are tolerated by the original-string check.

describe('normalization — extra internal spaces between phrase tokens', () => {
  it('detects "harm  myself" with double space (self-harm verb variant)', () => {
    expectCrisis('I want to harm  myself');
  });

  it('detects "kill  myself" with double space', () => {
    expectCrisis('I want to kill  myself');
  });

  it('detects "cut  myself" with double space', () => {
    expectCrisis('I want to cut  myself');
  });

  it('detects "goodbye   world" with triple space', () => {
    expectCrisis('goodbye   world');
  });

  it('detects "can\'t  take this anymore" (double space after contraction)', () => {
    expectCrisis("I can't  take this anymore");
  });

  it('detects "can\'t take  this  anymore" (spaces across the phrase)', () => {
    expectCrisis("I can't take  this  anymore");
  });

  it('detects "no   point in living" (triple space after "no")', () => {
    expectCrisis('no   point in living');
  });

  it('detects "no point  in  living" (spaces across the pattern)', () => {
    expectCrisis('no point  in  living');
  });

  it('detects "want  to  disappear" (spaces across the phrase)', () => {
    expectCrisis('I want  to  disappear');
  });

  it('detects "better  off  dead" (spaces across the phrase)', () => {
    expectCrisis('I am better  off  dead');
  });

  it('detects "better  off without  me" (double spaces)', () => {
    expectCrisis('everyone is better  off without  me');
  });

  it('detects "everyone  would be better off without me"', () => {
    expectCrisis('everyone  would be better off without me');
  });

  it('detects "ready  to  die" (spaces across the phrase)', () => {
    expectCrisis('I feel ready  to  die');
  });

  it('detects "ready  to end  it" (double spaces)', () => {
    expectCrisis('I feel ready  to end  it');
  });

  it('detects "end  it  all" (double spaces)', () => {
    expectCrisis('I want to end  it  all');
  });

  it('detects "don\'t  want  to  live" (spaces throughout)', () => {
    expectCrisis("I don't  want  to  live");
  });

  it('detects "take  all  my  pills" (double spaces throughout)', () => {
    expectCrisis('I want to take  all  my  pills');
  });
});

// ─── 2. PUNCTUATION AT THE END OF A PHRASE / MESSAGE ─────────────────────────
// \b (word boundary) matches at the transition from a word character to a
// non-word character such as ".", "!", "?", ",", etc.  Trailing punctuation
// must therefore NOT prevent detection.

describe('normalization — trailing punctuation does not prevent detection', () => {
  it('detects "I want to hurt myself." (period)', () => {
    expectCrisis('I want to hurt myself.');
  });

  it('detects "I want to hurt myself!" (exclamation mark)', () => {
    expectCrisis('I want to hurt myself!');
  });

  it('detects "I want to hurt myself?" (question mark)', () => {
    expectCrisis('I want to hurt myself?');
  });

  it('detects "I want to hurt myself..." (ellipsis)', () => {
    expectCrisis('I want to hurt myself...');
  });

  it('detects "I want to kill myself." (kill variant, period)', () => {
    expectCrisis('I want to kill myself.');
  });

  it('detects "I want to harm myself!" (harm variant, exclamation)', () => {
    expectCrisis('I want to harm myself!');
  });

  it('detects "thinking about suicide." (period)', () => {
    expectCrisis('thinking about suicide.');
  });

  it('detects "thinking about suicide!" (exclamation)', () => {
    expectCrisis('thinking about suicide!');
  });

  it('detects "planning an overdose." (period)', () => {
    expectCrisis('planning an overdose.');
  });

  it('detects "goodbye world." (period)', () => {
    expectCrisis('goodbye world.');
  });

  it('detects "goodbye world!" (exclamation)', () => {
    expectCrisis('goodbye world!');
  });

  it('detects "I can\'t go on." (period)', () => {
    expectCrisis("I can't go on.");
  });

  it('detects "I can\'t go on!" (exclamation)', () => {
    expectCrisis("I can't go on!");
  });

  it('detects "I can\'t take this anymore." (period)', () => {
    expectCrisis("I can't take this anymore.");
  });

  it('detects "no point in living." (period)', () => {
    expectCrisis('no point in living.');
  });

  it('detects "I want to disappear." (period)', () => {
    expectCrisis('I want to disappear.');
  });

  it('detects "everyone would be better off without me." (period)', () => {
    expectCrisis('everyone would be better off without me.');
  });

  it('detects "I want to end it all!" (exclamation)', () => {
    expectCrisis('I want to end it all!');
  });

  it('detects "I want to end my life." (period)', () => {
    expectCrisis('I want to end my life.');
  });

  it('detects "ready to die." (period)', () => {
    expectCrisis('ready to die.');
  });
});

// ─── 3. ALL-CAPS PHRASES ──────────────────────────────────────────────────────
// The /i flag on every pattern and the lowercase step inside normalizeForDetection
// both ensure case does not block detection.

describe('normalization — ALL-CAPS phrases are detected', () => {
  it('detects "I WANT TO KILL MYSELF"', () => {
    expectCrisis('I WANT TO KILL MYSELF');
  });

  it('detects "I WANT TO HARM MYSELF"', () => {
    expectCrisis('I WANT TO HARM MYSELF');
  });

  it('detects "I HAVE BEEN CUTTING MYSELF"', () => {
    expectCrisis('I HAVE BEEN CUTTING MYSELF');
  });

  it('detects "THINKING ABOUT SUICIDE TODAY"', () => {
    expectCrisis('THINKING ABOUT SUICIDE TODAY');
  });

  it('detects "I DONT WANT TO LIVE ANYMORE"', () => {
    expectCrisis('I DONT WANT TO LIVE ANYMORE');
  });

  it('detects "GOODBYE WORLD"', () => {
    expectCrisis('GOODBYE WORLD');
  });

  it('detects "GOODBYE CRUEL WORLD"', () => {
    expectCrisis('GOODBYE CRUEL WORLD');
  });

  it('detects "I CANT GO ON"', () => {
    expectCrisis('I CANT GO ON');
  });

  it('detects "NO POINT IN LIVING"', () => {
    expectCrisis('NO POINT IN LIVING');
  });

  it('detects "NO POINT IN GOING ON"', () => {
    expectCrisis('NO POINT IN GOING ON');
  });

  it('detects "EVERYONE WOULD BE BETTER OFF WITHOUT ME"', () => {
    expectCrisis('EVERYONE WOULD BE BETTER OFF WITHOUT ME');
  });

  it('detects "I AM BETTER OFF DEAD"', () => {
    expectCrisis('I AM BETTER OFF DEAD');
  });

  it('detects "I WANT TO END IT ALL"', () => {
    expectCrisis('I WANT TO END IT ALL');
  });

  it('detects "I WANT TO DISAPPEAR"', () => {
    expectCrisis('I WANT TO DISAPPEAR');
  });

  it('detects "PLANNING AN OVERDOSE"', () => {
    expectCrisis('PLANNING AN OVERDOSE');
  });

  it('detects "I WANT TO TAKE ALL MY PILLS"', () => {
    expectCrisis('I WANT TO TAKE ALL MY PILLS');
  });

  it('detects "READY TO DIE"', () => {
    expectCrisis('READY TO DIE');
  });

  it('detects "I CANT TAKE THIS ANYMORE"', () => {
    expectCrisis('I CANT TAKE THIS ANYMORE');
  });
});

// ─── 4. KNOWN NON-DETECTIONS ──────────────────────────────────────────────────
// Benign inputs that superficially resemble crisis phrases must NOT be flagged.
// These tests assert current production behavior; they do NOT claim the behavior
// is ideal — they exist to catch unintended regressions.

describe('normalization — known non-detections remain safe', () => {
  // ALL-CAPS benign phrases
  it('does not flag "I FEEL REALLY SAD TODAY"', () => {
    expectSafe('I FEEL REALLY SAD TODAY');
  });

  it('does not flag "I AM EXHAUSTED AND BURNED OUT"', () => {
    expectSafe('I AM EXHAUSTED AND BURNED OUT');
  });

  it('does not flag "GOODBYE, HAVE A GREAT DAY" (no "world" after goodbye)', () => {
    // The goodbye pattern requires the word "world" after "goodbye"; a comma
    // immediately after goodbye prevents the \s+ match, so this is SAFE.
    expectSafe('GOODBYE, HAVE A GREAT DAY');
  });

  it('does not flag "I AM BETTER OFF ALONE" ("alone" ≠ "dead" or "without me")', () => {
    // The pattern requires better\s+off\s+(dead|without\s+me); "alone" does not match.
    expectSafe('I AM BETTER OFF ALONE');
  });

  it('does not flag "NO POINT ARGUING ABOUT THIS" ("arguing" ≠ living/going on/continuing)', () => {
    // The pattern requires no\s+point\s+(in\s+)?(living|going\s+on|continuing); "arguing" does not match.
    expectSafe('NO POINT ARGUING ABOUT THIS');
  });

  it('does not flag "HE HURT HIS ARM" (not "myself")', () => {
    // The self-harm pattern requires (myself|my\s*self) after the verb; "his arm" does not match.
    expectSafe('HE HURT HIS ARM');
  });

  it('does not flag "SHE CUT THE CAKE." (not "myself")', () => {
    expectSafe('SHE CUT THE CAKE.');
  });

  it('does not flag "I HAD TO SAY GOODBYE TO MY OLD JOB." (no "world")', () => {
    expectSafe('I HAD TO SAY GOODBYE TO MY OLD JOB.');
  });

  // Punctuated benign phrases
  it('does not flag "I feel really sad." (period, benign)', () => {
    expectSafe('I feel really sad.');
  });

  it('does not flag "I just want to rest!" (exclamation, no crisis pattern)', () => {
    expectSafe('I just want to rest!');
  });

  it('does not flag "I wonder if things will get better?" (question mark, benign)', () => {
    expectSafe('I wonder if things will get better?');
  });

  it('does not flag "I feel hopeless about the situation." (period)', () => {
    expectSafe('I feel hopeless about the situation.');
  });

  it('does not flag "I have been crying all day!" (exclamation)', () => {
    expectSafe('I have been crying all day!');
  });

  // Spaces-in-benign-phrases — extra spaces must not cause false positives
  it('does not flag "no  point  arguing" with extra spaces (wrong tail word)', () => {
    expectSafe('no  point  arguing');
  });

  it('does not flag "she  hurt  her  arm" with extra spaces (not "myself")', () => {
    expectSafe('she  hurt  her  arm');
  });
});
