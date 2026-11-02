import { describe, expect, it } from 'vitest';
import {
  detectCrisisLanguage,
  isExplicitCurrentSafetyDenial,
} from '../../src/components/utils/crisisDetector.js';

describe('Layer-2 hard-stop suppression for explicit current-safety denials', () => {
  const observedBoundaryMessage =
    'הערב אני מרגיש מוצף ומתקשה להירגע, אבל אני בטוח ואין לי מחשבות לפגוע בעצמי. אני רוצה עזרה להבין מה מפעיל את החרדה שלי עכשיו.';

  it('suppresses the exact observed false positive while Layer 1 remains safe', () => {
    expect(detectCrisisLanguage(observedBoundaryMessage)).toBe(false);
    expect(isExplicitCurrentSafetyDenial(observedBoundaryMessage)).toBe(true);
  });

  it('does not suppress a direct denial without a current-safety assertion', () => {
    expect(isExplicitCurrentSafetyDenial('אין לי מחשבות לפגוע בעצמי.')).toBe(false);
  });

  it('does not suppress uncertainty about staying safe tonight', () => {
    expect(
      isExplicitCurrentSafetyDenial(
        'אני בטוח ואין לי מחשבות לפגוע בעצמי, אבל אני לא בטוח שאצליח לשמור על עצמי בטוח הלילה.'
      )
    ).toBe(false);
  });

  it('does not suppress a stated plan or available means', () => {
    expect(
      isExplicitCurrentSafetyDenial(
        'אני בטוח ואין לי מחשבות לפגוע בעצמי, אבל יש לי תוכנית ויש לי כדורים.'
      )
    ).toBe(false);
  });

  it('does not suppress a mixed denial followed by affirmative crisis intent', () => {
    expect(
      isExplicitCurrentSafetyDenial(
        'אני בטוח ובדרך כלל אין לי מחשבות לפגוע בעצמי, אבל עכשיו אני רוצה למות.'
      )
    ).toBe(false);
  });

  it('supports the equivalent explicit current-safety boundary in English', () => {
    expect(
      isExplicitCurrentSafetyDenial(
        'I feel overwhelmed tonight, but I am safe and I do not want to harm myself.'
      )
    ).toBe(true);
  });

  it('does not mistake Hebrew current-safety uncertainty for a safety assertion', () => {
    expect(isExplicitCurrentSafetyDenial(
      'אני לא בטוח שאצליח לעבור את הלילה, אבל אין לי מחשבות לפגוע בעצמי.'
    )).toBe(false);
  });

  it.each([
    ['Spanish', 'Estoy seguro y no quiero matarme, pero tengo un plan y pastillas.'],
    ['French', "Je suis en sécurité et je ne veux pas me tuer, mais j’ai un plan et des pilules."],
    ['German', 'Ich bin sicher und ich will nicht mich umbringen, aber ich habe einen Plan und Tabletten.'],
    ['Italian', 'Sono al sicuro e non voglio uccidermi, ma ho un piano e pillole.'],
    ['Portuguese', 'Estou seguro e não quero me matar, mas tenho um plano e comprimidos.'],
  ])('does not suppress %s plan-and-means contradictions', (_language, message) => {
    expect(isExplicitCurrentSafetyDenial(message)).toBe(false);
  });

  it.each([
    ['Hebrew', 'אני לא בטוח ואין לי מחשבות לפגוע בעצמי.'],
    ['Spanish', 'No estoy seguro y no quiero matarme.'],
    ['Italian', 'Non sono al sicuro e non voglio uccidermi.'],
    ['Portuguese', 'Não estou seguro e não quero me matar.'],
  ])('does not treat a negated %s safety assertion as affirmative', (_language, message) => {
    expect(isExplicitCurrentSafetyDenial(message)).toBe(false);
  });

  it.each([
    ['Spanish', 'Estoy seguro y no quiero matarme.'],
    ['French', 'Je suis en sécurité et je ne veux pas me tuer.'],
    ['German', 'Ich bin sicher und ich will nicht mich umbringen.'],
    ['Italian', 'Sono al sicuro e non voglio uccidermi.'],
    ['Portuguese', 'Estou seguro e não quero me matar.'],
  ])('preserves a non-contradictory explicit %s safety denial', (_language, message) => {
    expect(isExplicitCurrentSafetyDenial(message)).toBe(true);
  });

  it.each([
    ['Hebrew', 'אני בטוח ואין לי מחשבות לפגוע בעצמי, אבל אני לא בטוח שאצליח לשמור על עצמי בטוח הלילה.'],
    ['English', 'I am safe and I do not want to harm myself, but I am not sure I can stay safe tonight.'],
    ['Spanish', 'Estoy seguro y no quiero matarme, pero no estoy seguro de poder mantenerme a salvo esta noche.'],
    ['French', 'Je suis en sécurité et je ne veux pas me tuer, mais je ne suis pas sûr de pouvoir rester en sécurité cette nuit.'],
    ['German', 'Ich bin sicher und ich will nicht mich umbringen, aber ich bin nicht sicher, ob ich heute Nacht sicher bleiben kann.'],
    ['Italian', 'Sono al sicuro e non voglio uccidermi, ma non sono sicuro di poter restare al sicuro questa notte.'],
    ['Portuguese', 'Estou seguro e não quero me matar, mas não tenho certeza se consigo permanecer seguro esta noite.'],
  ])('hard-stops deterministic %s inability-to-stay-safe contradictions', (_language, message) => {
    expect(isExplicitCurrentSafetyDenial(message)).toBe(false);
    expect(detectCrisisLanguage(message)).toBe(true);
  });

  it.each([
    ['Hebrew', 'אני בטוח ואין לי מחשבות לפגוע בעצמי, אבל יש לי תוכנית ויש לי כדורים.'],
    ['English', 'I am safe and I do not want to harm myself, but I have a plan and pills.'],
    ['Spanish', 'Estoy seguro y no quiero matarme, pero tengo un plan y pastillas.'],
    ['French', 'Je suis en sécurité et je ne veux pas me tuer, mais j’ai un plan et des pilules.'],
    ['German', 'Ich bin sicher und ich will nicht mich umbringen, aber ich habe einen Plan und Tabletten.'],
    ['Italian', 'Sono al sicuro e non voglio uccidermi, ma ho un piano e pillole.'],
    ['Portuguese', 'Estou seguro e não quero me matar, mas tenho um plano e comprimidos.'],
  ])('hard-stops deterministic %s plan-and-means contradictions', (_language, message) => {
    expect(isExplicitCurrentSafetyDenial(message)).toBe(false);
    expect(detectCrisisLanguage(message)).toBe(true);
  });
});
