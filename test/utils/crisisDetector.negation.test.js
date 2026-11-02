/**
 * Negation-handling tests for the crisis detection layer.
 *
 * These tests verify that explicit, direct denials of self-harm are NOT escalated
 * by the Layer-1 regex detector while mixed-risk messages (denial + affirmative crisis)
 * continue to trigger escalation.
 *
 * Canonical implementation: src/components/utils/crisisDetector.js
 */

import { describe, it, expect } from 'vitest';
import {
  detectCrisisLanguage,
  detectCrisisWithReason,
  isDirectNegationFalsePositive,
} from '../../src/components/utils/crisisDetector.js';

/** Expect a message NOT to be flagged as crisis. */
function expectSafe(message) {
  expect(detectCrisisLanguage(message), `expected safe (no flag) for: "${message}"`).toBe(false);
  expect(detectCrisisWithReason(message), `expected null reason for: "${message}"`).toBeNull();
}

/** Expect a message to be flagged as crisis. */
function expectCrisis(message) {
  expect(detectCrisisLanguage(message), `expected crisis flag for: "${message}"`).toBe(true);
  expect(detectCrisisWithReason(message), `expected non-null reason for: "${message}"`).not.toBeNull();
}

// ─── EXACT OBSERVED PRODUCTION SCENARIO ──────────────────────────────────────

describe('exact observed production scenario — long Hebrew message with terminal denial', () => {
  it('does NOT escalate the full regression message', () => {
    expectSafe(
      'בשבועיים האחרונים קשה לי להתחיל כמעט כל דבר. אני קם עייף, דוחה משימות, וכשאני מסתכל על מה שמחכה לי אני חושב: "אין טעם להתחיל, ממילא לא אצליח להתמיד". ככל שאני עושה פחות, אני מרגיש יותר אשם וחסר ערך, ואז יש לי עוד פחות כוח להתחיל. אני לא חושב לפגוע בעצמי ואיני נמצא בסכנה כרגע.'
    );
  });
});

// ─── REQUIRED SAFE-DENIAL TESTS — HEBREW ─────────────────────────────────────

describe('safe direct denials — Hebrew', () => {
  it('אני לא חושב לפגוע בעצמי ואיני נמצא בסכנה כרגע.', () => {
    expectSafe('אני לא חושב לפגוע בעצמי ואיני נמצא בסכנה כרגע.');
  });

  it('אין לי מחשבות לפגוע בעצמי.', () => {
    expectSafe('אין לי מחשבות לפגוע בעצמי.');
  });

  it('אינני מתכוון להתאבד.', () => {
    expectSafe('אינני מתכוון להתאבד.');
  });

  it('אני לא רוצה למות.', () => {
    expectSafe('אני לא רוצה למות.');
  });
});

// ─── REQUIRED SAFE-DENIAL TESTS — ENGLISH ────────────────────────────────────

describe('safe direct denials — English', () => {
  it('I do not want to hurt myself.', () => {
    expectSafe('I do not want to hurt myself.');
  });

  it('I am not thinking about suicide.', () => {
    expectSafe('I am not thinking about suicide.');
  });

  it('I do not want to harm myself.', () => {
    expectSafe('I do not want to harm myself.');
  });

  it('I never want to kill myself.', () => {
    expectSafe('I never want to kill myself.');
  });
});

// ─── REQUIRED SAFE-DENIAL TESTS — SPANISH ────────────────────────────────────

describe('safe direct denials — Spanish', () => {
  it('No quiero hacerme daño.', () => {
    expectSafe('No quiero hacerme daño.');
  });

  it('No pienso en suicidarme.', () => {
    expectSafe('No pienso en suicidarme.');
  });
});

// ─── REQUIRED SAFE-DENIAL TESTS — FRENCH ─────────────────────────────────────

describe('safe direct denials — French', () => {
  it('Je ne veux pas me faire du mal.', () => {
    expectSafe('Je ne veux pas me faire du mal.');
  });

  it('Je ne pense pas me suicider.', () => {
    expectSafe('Je ne pense pas me suicider.');
  });
});

// ─── REQUIRED SAFE-DENIAL TESTS — GERMAN ─────────────────────────────────────

describe('safe direct denials — German', () => {
  it('Ich möchte mir nichts antun.', () => {
    expectSafe('Ich möchte mir nichts antun.');
  });

  it('Ich denke nicht daran, mich umbringen.', () => {
    expectSafe('Ich denke nicht daran, mich umbringen.');
  });
});

// ─── REQUIRED SAFE-DENIAL TESTS — ITALIAN ────────────────────────────────────

describe('safe direct denials — Italian', () => {
  it('Non voglio farmi del male.', () => {
    expectSafe('Non voglio farmi del male.');
  });

  it('Non sto pensando di suicidarmi.', () => {
    expectSafe('Non sto pensando di suicidarmi.');
  });
});

// ─── REQUIRED SAFE-DENIAL TESTS — PORTUGUESE ─────────────────────────────────

describe('safe direct denials — Portuguese', () => {
  it('Não quero me machucar.', () => {
    expectSafe('Não quero me machucar.');
  });

  it('Não estou pensando em me suicidar.', () => {
    expectSafe('Não estou pensando em me suicidar.');
  });
});

// ─── REQUIRED MIXED-MESSAGE CRISIS TESTS ─────────────────────────────────────

describe('mixed messages — denial followed by affirmative crisis (must remain crisis-positive)', () => {
  it('Hebrew: denial then "אני רוצה למות"', () => {
    expectCrisis('אני לא חושב לפגוע בעצמי בדרך כלל, אבל עכשיו אני רוצה למות.');
  });

  it('Hebrew: denial then plan to suicide', () => {
    expectCrisis('אני לא בסכנה, אבל יש לי תוכנית להתאבד.');
  });

  it('English: denial then "I want to end my life"', () => {
    expectCrisis('I do not want to hurt myself, but I want to end my life.');
  });

  it('denial then overdose pattern', () => {
    expectCrisis('I am not thinking about suicide but I want to overdose tonight.');
  });

  it('denial then "ready to end it"', () => {
    expectCrisis("I don't want to harm myself, but I am ready to end it.");
  });
});

// ─── SUPPORTED DENIAL / AFFIRMATIVE PAIRS ────────────────────────────────────

describe('each multilingual denial exercises an existing crisis pattern', () => {
  const pairs = [
    ['Hebrew', 'אני לא חושב לפגוע בעצמי.', 'אני רוצה לפגוע בעצמי.'],
    ['English', 'I do not want to hurt myself.', 'I want to hurt myself.'],
    ['Spanish', 'No quiero hacerme daño.', 'Quiero hacerme daño.'],
    ['French', 'Je ne veux pas me faire du mal.', 'Je veux me faire du mal.'],
    ['German', 'Ich denke nicht daran, mich umbringen.', 'Ich will mich umbringen.'],
    ['Italian', 'Non voglio farmi del male.', 'Voglio farmi del male.'],
    ['Portuguese', 'Não quero me machucar.', 'Quero me machucar.'],
  ];

  for (const [language, denial, affirmative] of pairs) {
    it(`${language}: direct denial is safe and the corresponding affirmative is crisis-positive`, () => {
      expectSafe(denial);
      expectCrisis(affirmative);
    });
  }
});

// ─── SAME-PATTERN MIXED OCCURRENCES ──────────────────────────────────────────

describe('same clause — a negated occurrence never hides a later affirmative occurrence', () => {
  const mixedRiskMessages = [
    ['English self-harm', 'I do not want to hurt myself and I want to hurt myself.'],
    ['English suicide', 'I am not thinking about suicide and now I am thinking about suicide.'],
    ['Spanish', 'No quiero hacerme daño y ahora quiero hacerme daño.'],
    ['French', 'Je ne veux pas me faire du mal et maintenant je veux me faire du mal.'],
    ['German', 'Ich denke nicht an Selbstmord und jetzt denke ich an Selbstmord.'],
    ['Italian', 'Non voglio farmi del male e adesso voglio farmi del male.'],
    ['Portuguese', 'Não quero me machucar e agora quero me machucar.'],
  ];

  for (const [language, message] of mixedRiskMessages) {
    it(`${language}: the affirmative occurrence wins`, () => {
      expectCrisis(message);
      expect(isDirectNegationFalsePositive(message)).toBe(false);
    });
  }
});

// ─── isDirectNegationFalsePositive CONTRACT ───────────────────────────────────

describe('isDirectNegationFalsePositive — contract', () => {
  it('returns true for pure safe denial', () => {
    expect(isDirectNegationFalsePositive('אני לא חושב לפגוע בעצמי.')).toBe(true);
  });

  it('returns false for affirmative crisis message', () => {
    expect(isDirectNegationFalsePositive('אני רוצה למות.')).toBe(false);
  });

  it('returns false for mixed denial + affirmative crisis', () => {
    expect(
      isDirectNegationFalsePositive('אני לא חושב לפגוע בעצמי אבל אני רוצה למות.')
    ).toBe(false);
  });

  it('returns false for message with no crisis phrase', () => {
    expect(isDirectNegationFalsePositive('Having a rough day at work.')).toBe(false);
  });
});
