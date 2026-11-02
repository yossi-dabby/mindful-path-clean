import { describe, expect, it } from 'vitest';
import {
  evaluateCurrentTurnGroundingContract,
  evaluateCurrentTurnGroundingContractDetailed,
} from '../../src/components/utils/formulationContractGuard.js';

const CASES = [
  {
    language: 'Spanish',
    unrelatedUser: 'Hoy siento tensión antes de la reunión.',
    claims: [
      ['causal', 'Esto ocurre porque tu mente intenta protegerte.'],
      ['identity', 'Esto demuestra algo sobre tu identidad.'],
      ['relationship_meaning', 'Esto dañará la relación.'],
      ['danger', 'Estás en peligro.'],
      ['perfection_correctness', 'Tu respuesta debe ser perfecta.'],
      ['maintaining_cycle', 'La evitación mantiene este ciclo.'],
    ],
    groundedUser: 'Me preocupa lo que esto dice sobre mi identidad.',
    groundedAssistant: 'Esto está relacionado con tu identidad.',
    tentativeAssistant: 'Tal vez esto ocurre porque intentas reducir la tensión.',
    strictUser: 'Usa solo la información actual: hoy siento tensión.',
    negatedUser: 'No hables de identidad; solo describí tensión.',
  },
  {
    language: 'French',
    unrelatedUser: 'Je ressens de la tension avant la réunion aujourd’hui.',
    claims: [
      ['causal', 'Cela arrive parce que votre esprit essaie de vous protéger.'],
      ['identity', 'Cela prouve quelque chose sur votre identité.'],
      ['relationship_meaning', 'Cela nuira à la relation.'],
      ['danger', 'Vous êtes en danger.'],
      ['perfection_correctness', 'Votre réponse doit être parfaite.'],
      ['maintaining_cycle', 'L’évitement maintient ce cycle.'],
    ],
    groundedUser: 'Je crains ce que cela dit de mon identité.',
    groundedAssistant: 'Cela est lié à votre identité.',
    tentativeAssistant: 'Peut-être que cela arrive parce que vous essayez de réduire la tension.',
    strictUser: 'Utilisez uniquement les informations actuelles : je ressens de la tension.',
    negatedUser: 'Ne parlez pas d’identité ; je n’ai décrit que de la tension.',
  },
  {
    language: 'German',
    unrelatedUser: 'Heute spüre ich vor der Besprechung Anspannung.',
    claims: [
      ['causal', 'Das geschieht, weil dein Verstand dich schützen will.'],
      ['identity', 'Das beweist etwas über deine Identität.'],
      ['relationship_meaning', 'Das wird die Beziehung schädigen.'],
      ['danger', 'Du bist in Gefahr.'],
      ['perfection_correctness', 'Deine Antwort muss perfekt sein.'],
      ['maintaining_cycle', 'Die Vermeidung hält diesen Kreislauf aufrecht.'],
    ],
    groundedUser: 'Ich fürchte, was das über meine Identität aussagt.',
    groundedAssistant: 'Das hängt mit deiner Identität zusammen.',
    tentativeAssistant: 'Vielleicht geschieht das, weil du die Anspannung verringern willst.',
    strictUser: 'Nutze nur die aktuellen Informationen: Heute spüre ich Anspannung.',
    negatedUser: 'Keine Aussage über Identität; ich habe nur Anspannung beschrieben.',
  },
  {
    language: 'Italian',
    unrelatedUser: 'Oggi sento tensione prima della riunione.',
    claims: [
      ['causal', 'Questo accade perché la tua mente cerca di proteggerti.'],
      ['identity', 'Questo dimostra qualcosa sulla tua identità.'],
      ['relationship_meaning', 'Questo danneggerà la relazione.'],
      ['danger', 'Sei in pericolo.'],
      ['perfection_correctness', 'La tua risposta deve essere perfetta.'],
      ['maintaining_cycle', 'L’evitamento mantiene questo ciclo.'],
    ],
    groundedUser: 'Temo ciò che questo dice sulla mia identità.',
    groundedAssistant: 'Questo è collegato alla tua identità.',
    tentativeAssistant: 'Forse questo accade perché cerchi di ridurre la tensione.',
    strictUser: 'Usa solo le informazioni attuali: oggi sento tensione.',
    negatedUser: 'Non parlare di identità; ho descritto solo tensione.',
  },
  {
    language: 'Portuguese',
    unrelatedUser: 'Hoje sinto tensão antes da reunião.',
    claims: [
      ['causal', 'Isso acontece porque sua mente tenta proteger você.'],
      ['identity', 'Isso prova algo sobre sua identidade.'],
      ['relationship_meaning', 'Isso prejudicará o relacionamento.'],
      ['danger', 'Você está em perigo.'],
      ['perfection_correctness', 'Sua resposta deve ser perfeita.'],
      ['maintaining_cycle', 'A evitação mantém este ciclo.'],
    ],
    groundedUser: 'Tenho medo do que isso diz sobre minha identidade.',
    groundedAssistant: 'Isso está relacionado à sua identidade.',
    tentativeAssistant: 'Talvez isso aconteça porque você tenta reduzir a tensão.',
    strictUser: 'Use apenas as informações atuais: hoje sinto tensão.',
    negatedUser: 'Não fale de identidade; descrevi apenas tensão.',
  },
];

describe('multilingual current-turn grounding parity', () => {
  it.each(CASES)('rejects unsupported claim groups in $language', (testCase) => {
    for (const [expectedGroup, assistantContent] of testCase.claims) {
      const result = evaluateCurrentTurnGroundingContractDetailed(
        assistantContent,
        testCase.unrelatedUser,
      );
      expect(result.pass, `${testCase.language}: ${expectedGroup}`).toBe(false);
      expect(result.reasonCodes).toEqual(['unsupported_current_turn_grounding_claim']);
      expect(result.matchedClaimGroup).toBe(expectedGroup);
    }
  });

  it.each(CASES)('accepts an explicitly grounded same-group claim in $language', (testCase) => {
    expect(evaluateCurrentTurnGroundingContract(
      testCase.groundedAssistant,
      testCase.groundedUser,
    )).toEqual({ pass: true, reasonCodes: [] });
  });

  it.each(CASES)('accepts a tentative unsupported claim outside strict mode in $language', (testCase) => {
    expect(evaluateCurrentTurnGroundingContract(
      testCase.tentativeAssistant,
      testCase.unrelatedUser,
    )).toEqual({ pass: true, reasonCodes: [] });
  });

  it.each(CASES)('rejects a tentative unsupported claim in localized strict mode in $language', (testCase) => {
    const result = evaluateCurrentTurnGroundingContractDetailed(
      testCase.tentativeAssistant,
      testCase.strictUser,
    );
    expect(result.strictMode).toBe(true);
    expect(result.pass).toBe(false);
    expect(result.matchedClaimGroup).toBe('causal');
  });

  it.each(CASES)('does not treat a negated user term as grounding in $language', (testCase) => {
    const result = evaluateCurrentTurnGroundingContractDetailed(
      testCase.groundedAssistant,
      testCase.negatedUser,
    );
    expect(result.pass).toBe(false);
    expect(result.matchedClaimGroup).toBe('identity');
    expect(result.matchedAffirmativeUserTerm).toBe('none');
  });
});
