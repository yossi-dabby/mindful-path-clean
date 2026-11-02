import { describe, expect, it } from 'vitest';
import {
  applyFormulationGuardToConversationMessages,
  buildCurrentTurnGroundingFallback,
  buildFormulationSafeFallback,
  evaluateFormulationResponseContract,
} from '../../src/components/utils/formulationContractGuard.js';

const FD_START = '=== FORMULATION DEEPENING — THIS TURN ONLY ===';
const FD_END = '=== END FORMULATION DEEPENING ===';

function rawGuardedUser(userText = 'Continue.', noExercise = false) {
  const noExerciseLine = noExercise
    ? '\nThe person has asked not to receive an exercise yet.\n'
    : '';
  return `${FD_START}\nBounded formulation instruction.${noExerciseLine}\n${FD_END}\n\n${userText}`;
}

const CASES = [
  {
    locale: 'es-MX',
    valid: 'Una posibilidad es que esto esté relacionado con tu autoestima. ¿Qué significa para ti?',
    unsupported: 'Esto está relacionado con tu identidad. ¿Qué significa para ti?',
    prohibited: 'La verdadera amenaza está relacionada con tu identidad. ¿Qué piensas?',
    unknown: 'Lo que sigue sin saberse es el significado personal que tiene para ti. ¿Qué notas?',
    exercise: 'Probemos un ejercicio ahora. ¿Qué piensas?',
    initialStart: 'Escucho que todavía falta',
    continuationStart: 'Escucho que la parte más difícil',
    groundingStart: 'Todavía no hay suficiente información',
  },
  {
    locale: 'fr-FR',
    valid: 'Une possibilité est que cela soit lié à votre estime de soi. Qu’est-ce que cela signifie pour vous ?',
    unsupported: 'Cela est lié à votre identité. Qu’est-ce que cela signifie pour vous ?',
    prohibited: 'La véritable menace est liée à votre identité. Qu’en pensez-vous ?',
    unknown: 'Ce qui reste inconnu est le sens personnel que cela a pour vous. Que remarquez-vous ?',
    exercise: 'Essayons un exercice maintenant. Qu’en pensez-vous ?',
    initialStart: 'J’entends qu’il manque encore',
    continuationStart: 'J’entends que la partie la plus difficile',
    groundingStart: 'Il n’y a pas encore assez d’informations',
  },
  {
    locale: 'de-DE',
    valid: 'Eine Möglichkeit ist, dass dies mit deinem Selbstwert zusammenhängt. Was bedeutet das für dich?',
    unsupported: 'Dies hängt mit deiner Identität zusammen. Was bedeutet das für dich?',
    prohibited: 'Die wahre Bedrohung hängt mit deiner Identität zusammen. Was denkst du?',
    unknown: 'Noch unbekannt ist die persönliche Bedeutung, die dies für dich hat. Was bemerkst du?',
    exercise: 'Versuchen wir jetzt eine Übung. Was denkst du?',
    initialStart: 'Ich höre, dass in unserem Verständnis',
    continuationStart: 'Ich höre, dass der schwierigste Teil',
    groundingStart: 'Es gibt noch nicht genügend Informationen',
  },
  {
    locale: 'it-IT',
    valid: 'Una possibilità è che questo sia collegato alla tua autostima. Che cosa significa per te?',
    unsupported: 'Questo è collegato alla tua identità. Che cosa significa per te?',
    prohibited: 'La vera minaccia è collegata alla tua identità. Che cosa ne pensi?',
    unknown: 'Ciò che resta sconosciuto è il significato personale che ha per te. Che cosa noti?',
    exercise: 'Proviamo ora un esercizio. Che cosa ne pensi?',
    initialStart: 'Sento che manca ancora',
    continuationStart: 'Sento che la parte più difficile',
    groundingStart: 'Non ci sono ancora informazioni sufficienti',
  },
  {
    locale: 'pt-BR',
    valid: 'Uma possibilidade é que isso esteja relacionado à sua autoestima. O que isso significa para você?',
    unsupported: 'Isso está relacionado à sua identidade. O que isso significa para você?',
    prohibited: 'A verdadeira ameaça está relacionada à sua identidade. O que você pensa?',
    unknown: 'O que permanece desconhecido é o significado pessoal que isso tem para você. O que você percebe?',
    exercise: 'Vamos tentar um exercício agora. O que você pensa?',
    initialStart: 'Percebo que ainda falta',
    continuationStart: 'Percebo que a parte mais difícil',
    groundingStart: 'Ainda não há informações suficientes',
  },
];

describe('multilingual formulation contract parity', () => {
  it.each(CASES)('enforces the bounded formulation contract in $locale', (testCase) => {
    const rawUser = rawGuardedUser('Continue without inventing missing meaning.');

    expect(evaluateFormulationResponseContract(testCase.valid, rawUser)).toEqual({
      pass: true,
      reasonCodes: [],
    });

    expect(evaluateFormulationResponseContract(testCase.unsupported, rawUser)).toMatchObject({
      pass: false,
      reasonCodes: expect.arrayContaining(['unsupported_deeper_claim_without_tentative_marker']),
    });

    expect(evaluateFormulationResponseContract(testCase.prohibited, rawUser)).toMatchObject({
      pass: false,
      reasonCodes: expect.arrayContaining(['prohibited_certainty_phrase']),
    });

    expect(evaluateFormulationResponseContract(testCase.unknown, rawUser)).toEqual({
      pass: true,
      reasonCodes: [],
    });

    expect(evaluateFormulationResponseContract(
      testCase.exercise,
      rawGuardedUser('Do not offer an exercise.', true),
    )).toMatchObject({
      pass: false,
      reasonCodes: expect.arrayContaining(['exercise_proposed_when_blocked']),
    });
  });

  it.each(CASES)('uses same-language deterministic fallbacks for $locale', (testCase) => {
    const initial = buildFormulationSafeFallback(testCase.locale);
    const continuation = buildFormulationSafeFallback(testCase.locale, 'correction_followup');
    const grounding = buildCurrentTurnGroundingFallback(testCase.locale);

    expect(initial).toMatch(new RegExp(`^${testCase.initialStart}`));
    expect(continuation).toMatch(new RegExp(`^${testCase.continuationStart}`));
    expect(grounding).toMatch(new RegExp(`^${testCase.groundingStart}`));
    expect((initial.match(/\?/g) || [])).toHaveLength(1);
    expect((continuation.match(/\?/g) || [])).toHaveLength(1);
    expect((grounding.match(/\?/g) || [])).toHaveLength(1);
  });

  it.each(CASES)('replaces a violating guarded response in $locale without English fallback', (testCase) => {
    const rawMessages = [
      { id: 'user-1', role: 'user', content: rawGuardedUser() },
      { id: 'assistant-1', role: 'assistant', content: testCase.unsupported },
    ];
    const result = applyFormulationGuardToConversationMessages(rawMessages, rawMessages, {
      locale: testCase.locale,
    });

    expect(result.messages[1].content).toBe(buildFormulationSafeFallback(testCase.locale));
    expect(result.messages[1].metadata).toMatchObject({
      formulation_guard_replaced: true,
      formulation_guard_reason_codes: expect.arrayContaining([
        'unsupported_deeper_claim_without_tentative_marker',
      ]),
    });
    expect(result.pendingCorrection).toMatchObject({ locale: testCase.locale.slice(0, 2) });
  });
});
