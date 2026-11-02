/**
 * Multilingual Stage 5 clinical-calibration parity.
 *
 * These tests intentionally verify the deterministic contract and active
 * session-start injection path. They do not claim to prove free-form model
 * behavior; live chat fixtures remain the runtime acceptance gate.
 */

import { describe, expect, it } from 'vitest';
import { THERAPIST_PLANNER_FIRST_INSTRUCTIONS } from '../../src/lib/therapistWorkflowEngine.js';
import { buildActionFirstDemotedSessionContentAsync } from '../../src/lib/workflowContextInjector.js';
import { CBT_THERAPIST_WIRING_HYBRID } from '../../src/api/agentWiring.js';

const SUPPORTED_LOCALES = Object.freeze(['en', 'he', 'es', 'fr', 'de', 'it', 'pt']);
const ADDITIONAL_LOCALES = Object.freeze(['es', 'fr', 'de', 'it', 'pt']);
const STAGE5_HEADER = '--- STAGE 5 CLINICAL CALIBRATION ---';

const MULTILINGUAL_RUNTIME_FIXTURES = Object.freeze({
  es: Object.freeze({
    tooHard:
      'La acción propuesta es demasiado difícil ahora. No me convenzas ni reformules el mismo paso.',
    outcome:
      'Hice la acción una vez, la ansiedad no cambió y todavía no sé qué significa el resultado.',
    noAction:
      'No propongas ahora otra acción, ejercicio, pregunta, alternativa ni posibilidad futura.',
    gad:
      'Hay una factura real que vence mañana, pero también pienso: ¿y si nunca vuelvo a estar seguro?',
  }),
  fr: Object.freeze({
    tooHard:
      "L'action proposée est trop difficile maintenant. Ne me convaincs pas et ne reformule pas la même étape.",
    outcome:
      "J'ai fait l'action une fois, l'anxiété n'a pas changé et je ne sais pas encore ce que signifie ce résultat.",
    noAction:
      "Ne propose maintenant aucune autre action, aucun exercice, aucune question, alternative ou possibilité future.",
    gad:
      "Une facture réelle est due demain, mais je pense aussi : et si je ne me sentais plus jamais en sécurité ?",
  }),
  de: Object.freeze({
    tooHard:
      'Die vorgeschlagene Handlung ist im Moment zu schwierig. Überrede mich nicht und formuliere denselben Schritt nicht nur um.',
    outcome:
      'Ich habe die Handlung einmal ausgeführt, die Angst blieb gleich, und ich weiß noch nicht, was das Ergebnis bedeutet.',
    noAction:
      'Schlage jetzt keine weitere Handlung, Übung, Frage, Alternative oder zukünftige Möglichkeit vor.',
    gad:
      'Eine echte Rechnung ist morgen fällig, aber ich denke auch: Was, wenn ich mich nie wieder finanziell sicher fühle?',
  }),
  it: Object.freeze({
    tooHard:
      "L'azione proposta è troppo difficile adesso. Non cercare di convincermi e non riformulare semplicemente lo stesso passo.",
    outcome:
      "Ho eseguito l'azione una volta, l'ansia non è cambiata e non so ancora che cosa significhi il risultato.",
    noAction:
      'Non proporre ora un’altra azione, esercizio, domanda, alternativa o possibilità futura.',
    gad:
      'C’è una bolletta reale in scadenza domani, ma penso anche: e se non mi sentissi mai più al sicuro economicamente?',
  }),
  pt: Object.freeze({
    tooHard:
      'A ação proposta está difícil demais agora. Não tente me convencer nem apenas reformule o mesmo passo.',
    outcome:
      'Fiz a ação uma vez, a ansiedade não mudou e ainda não sei o que o resultado significa.',
    noAction:
      'Não proponha agora outra ação, exercício, pergunta, alternativa ou possibilidade futura.',
    gad:
      'Há uma conta real com vencimento amanhã, mas também penso: e se eu nunca mais me sentir financeiramente seguro?',
  }),
});

describe('Multilingual Stage 5 clinical calibration — fixture parity', () => {
  it('covers all four calibration scenarios in every additional supported language', () => {
    expect(Object.keys(MULTILINGUAL_RUNTIME_FIXTURES)).toEqual(ADDITIONAL_LOCALES);

    for (const locale of ADDITIONAL_LOCALES) {
      const fixture = MULTILINGUAL_RUNTIME_FIXTURES[locale];
      expect(Object.keys(fixture)).toEqual(['tooHard', 'outcome', 'noAction', 'gad']);
      for (const value of Object.values(fixture)) {
        expect(typeof value).toBe('string');
        expect(value.trim().length).toBeGreaterThan(20);
      }
    }
  });

  it('keeps the canonical policy explicitly cross-language and preserves all four invariants', () => {
    const instructions = THERAPIST_PLANNER_FIRST_INSTRUCTIONS;
    expect(instructions).toContain(STAGE5_HEADER);
    expect(instructions).toMatch(/Cross-language parity/i);
    expect(instructions).toMatch(/A\. SEMANTIC RECALIBRATION AFTER "TOO HARD"/);
    expect(instructions).toMatch(/B\. EPISTEMIC DISCIPLINE AFTER AN OUTCOME/);
    expect(instructions).toMatch(/C\. CURRENT-TURN PROHIBITION ON ACTIONS/);
    expect(instructions).toMatch(/D\. GAD AND UNCERTAINTY WORK/);
  });
});

describe('Multilingual Stage 5 clinical calibration — active runtime injection', () => {
  it('injects the same complete Stage 5 policy exactly once for every supported locale', async () => {
    for (const locale of SUPPORTED_LOCALES) {
      const content = await buildActionFirstDemotedSessionContentAsync(
        CBT_THERAPIST_WIRING_HYBRID,
        {},
        null,
        {
          sessionLanguage: locale,
          message_text:
            MULTILINGUAL_RUNTIME_FIXTURES[locale]?.tooHard ||
            'The proposed action is too difficult right now.',
        },
      );

      const firstIndex = content.indexOf(STAGE5_HEADER);
      const secondIndex = content.indexOf(STAGE5_HEADER, firstIndex + 1);
      expect(firstIndex, `missing Stage 5 policy for ${locale}`).toBeGreaterThanOrEqual(0);
      expect(secondIndex, `duplicate Stage 5 policy for ${locale}`).toBe(-1);
      expect(content, `missing too-hard policy for ${locale}`).toMatch(
        /SEMANTIC RECALIBRATION AFTER "TOO HARD"/,
      );
      expect(content, `missing outcome policy for ${locale}`).toMatch(
        /EPISTEMIC DISCIPLINE AFTER AN OUTCOME/,
      );
      expect(content, `missing no-action policy for ${locale}`).toMatch(
        /CURRENT-TURN PROHIBITION ON ACTIONS/,
      );
      expect(content, `missing GAD policy for ${locale}`).toMatch(/GAD AND UNCERTAINTY WORK/);
    }
  });
});
