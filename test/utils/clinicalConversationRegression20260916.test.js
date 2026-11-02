import { describe, expect, it } from 'vitest';
import {
  detectFormIntent,
  hasExplicitFormAccessRequest,
} from '../../src/data/therapeuticForms/aiFormsAccess.js';
import {
  applyCurrentTurnGroundingGuardToConversationMessages,
  buildClinicalOverreachFallback,
  evaluateCurrentTurnGroundingContractDetailed,
} from '../../src/components/utils/formulationContractGuard.js';
import {
  buildFormulationLedInstructions,
} from '../../src/lib/therapistWorkflowEngine.js';
import {
  STAGE12_CLINICAL_HUMILITY_BY_LANGUAGE,
  STAGE12_SUPPORTED_LANGUAGES,
  buildStage12TurnSupplement,
} from '../../src/lib/chatQualityStage12.js';

const MULTILINGUAL_OVERREACH = Object.freeze({
  he: 'זה בדיוק המנגנון. המעגל ברור ומאושר עכשיו.',
  en: 'This is exactly the mechanism. The pattern is now confirmed.',
  es: 'Este es exactamente el mecanismo. El patrón está confirmado.',
  fr: 'C’est exactement le mécanisme. Le schéma est confirmé.',
  de: 'Das ist genau der Mechanismus. Das Muster ist bestätigt.',
  it: 'Questo è esattamente il meccanismo. Lo schema è confermato.',
  pt: 'Este é exatamente o mecanismo. O padrão está confirmado.',
});

const MULTILINGUAL_TENTATIVE_FORMULATIONS = Object.freeze({
  he: 'אחת האפשרויות היא שהימנעות ממלאת תפקיד, אבל צריך לבדוק אירוע קונקרטי וגם מצב רוח והתאמת המשרה.',
  en: 'One possibility is that avoidance plays a role, but we should examine a concrete event, mood, and job fit.',
  es: 'Una posibilidad es que la evitación influya, pero debemos examinar un episodio concreto, el estado de ánimo y el ajuste laboral.',
  fr: 'Une possibilité est que l’évitement joue un rôle, mais nous devons examiner une situation concrète, l’humeur et l’adéquation du poste.',
  de: 'Eine Möglichkeit ist, dass Vermeidung eine Rolle spielt, aber wir sollten eine konkrete Situation, Stimmung und berufliche Passung prüfen.',
  it: 'Una possibilità è che l’evitamento abbia un ruolo, ma dobbiamo esaminare un episodio concreto, l’umore e l’adeguatezza del lavoro.',
  pt: 'Uma possibilidade é que a evitação tenha um papel, mas precisamos examinar um episódio concreto, o humor e a adequação do trabalho.',
});

const MULTILINGUAL_DIAGNOSTIC_UNCERTAINTY = Object.freeze({
  he: ['יש סיכוי סביר שמדובר בחרדה מוכללת.', 'מדובר בחרדה מוכללת.', 'ייתכן שמדובר בחרדה מוכללת.'],
  en: ['Generalized anxiety disorder is possible.', 'This is generalized anxiety disorder.', 'This may be generalized anxiety disorder.'],
  es: ['Es posible que sea ansiedad generalizada.', 'Es ansiedad generalizada.', 'Podría ser ansiedad generalizada.'],
  fr: ['Une anxiété généralisée est possible.', 'C’est une anxiété généralisée.', 'Cela pourrait être une anxiété généralisée.'],
  de: ['Eine generalisierte Angststörung ist möglich.', 'Das ist eine generalisierte Angststörung.', 'Das könnte eine generalisierte Angststörung sein.'],
  it: ['È possibile che sia ansia generalizzata.', 'È ansia generalizzata.', 'Potrebbe essere ansia generalizzata.'],
  pt: ['É possível que seja ansiedade generalizada.', 'É ansiedade generalizada.', 'Poderia ser ansiedade generalizada.'],
});

describe('2026-09-16 clinical conversation regression', () => {
  it('does not let the forms policy hijack a clinical discussion that merely mentions prior CBT tools', () => {
    const clinicalTurn =
      'בטיפול CBT הקודם השתמשנו בדף עבודה ובתרגילים, אבל עכשיו אני רוצה להבין ' +
      'למה אני נמנע ממשימות ומה קורה לי רגשית.';

    expect(hasExplicitFormAccessRequest(clinicalTurn)).toBe(false);
    expect(detectFormIntent(clinicalTurn)).toBeNull();
  });

  it('still routes an explicit current-turn worksheet request', () => {
    const request = 'בבקשה שלח לי דף עבודה לחרדה.';
    expect(hasExplicitFormAccessRequest(request)).toBe(true);
    expect(detectFormIntent(request)).not.toBeNull();
  });

  it.each([
    'עכשיו התמונה מלאה: זה המנגנון עצמו.',
    'אתה מחליט במודע להימנע ולכן הדפוס נשמר.',
    'הטיפול עבד על הסימפטומים אבל לא על המנגנון שמתחת.',
  ])('blocks deterministic clinical overreach: %s', (assistantText) => {
    const evaluation = evaluateCurrentTurnGroundingContractDetailed(
      assistantText,
      'אני שם לב שאני דוחה משימות ומרגיש הקלה כשאני נמנע.'
    );

    expect(evaluation.pass).toBe(false);
    expect(evaluation.reasonCodes).toContain('clinical_overreach_certainty');
    expect(evaluation.rejectedSentenceSnippet).toBeNull();
  });

  it.each(Object.entries(MULTILINGUAL_OVERREACH))(
    'blocks semantic certainty patterns in %s',
    (_language, assistantText) => {
      const evaluation = evaluateCurrentTurnGroundingContractDetailed(
        assistantText,
        'I avoid difficult tasks and feel immediate relief.'
      );
      expect(evaluation.pass).toBe(false);
      expect(evaluation.reasonCodes).toContain('clinical_overreach_certainty');
      expect(evaluation.rejectedSentenceSnippet).toBeNull();
    },
  );

  it.each(Object.entries(MULTILINGUAL_TENTATIVE_FORMULATIONS))(
    'allows a tentative multi-factorial formulation in %s',
    (_language, assistantText) => {
      const evaluation = evaluateCurrentTurnGroundingContractDetailed(
        assistantText,
        'I avoid difficult tasks and feel immediate relief.'
      );
      expect(evaluation.pass).toBe(true);
    },
  );

  it.each(Object.entries(MULTILINGUAL_DIAGNOSTIC_UNCERTAINTY))(
    'preserves diagnostic uncertainty in %s',
    (_language, [userText, definiteAssistantText, tentativeAssistantText]) => {
      const definite = evaluateCurrentTurnGroundingContractDetailed(definiteAssistantText, userText);
      expect(definite.pass).toBe(false);
      expect(definite.reasonCodes).toContain('diagnostic_uncertainty_escalation');
      expect(definite.rejectedSentenceSnippet).toBeNull();

      const tentative = evaluateCurrentTurnGroundingContractDetailed(tentativeAssistantText, userText);
      expect(tentative.pass).toBe(true);
    },
  );

  it('allows a tentative, multi-factorial formulation', () => {
    const evaluation = evaluateCurrentTurnGroundingContractDetailed(
      'אחת האפשרויות היא שהימנעות נותנת הקלה מיידית, אבל עדיין צריך לבדוק גם מצב רוח, שינה, קשב והתאמת המשימה.',
      'אני שם לב שאני דוחה משימות ומרגיש הקלה כשאני נמנע.'
    );

    expect(evaluation.pass).toBe(true);
  });

  it('replaces overreach with a bounded Hebrew fallback in the visible conversation', () => {
    const rawMessages = [
      { role: 'user', id: 'u1', content: 'אני דוחה משימות ומרגיש הקלה כשאני נמנע.' },
      { role: 'assistant', id: 'a1', content: 'התמונה עכשיו מלאה: זה המנגנון עצמו.' },
    ];
    const finalMessages = [
      { ...rawMessages[0], __rawIndex: 0 },
      { ...rawMessages[1], __rawIndex: 1 },
    ];

    const guarded = applyCurrentTurnGroundingGuardToConversationMessages(
      rawMessages,
      finalMessages,
      { locale: 'he' }
    );

    expect(guarded.messages[1].content).toBe(buildClinicalOverreachFallback('he'));
    expect(guarded.messages[1].metadata.current_turn_grounding_guard_reason_codes)
      .toContain('clinical_overreach_certainty');
  });

  it('injects non-blaming clinical humility into the therapist contract', () => {
    const instructions = buildFormulationLedInstructions();
    expect(instructions).toContain('Clinical humility and non-blaming formulation');
    expect(instructions).toContain('Never claim that the picture is complete');
    expect(instructions).toContain('Do not convert avoidance');
    expect(instructions).toContain('check what has already been tried');
    expect(instructions).toContain('practical mismatch and avoidance may coexist');
    expect(instructions).toContain('possible, suspected, or probable');
    expect(instructions).toContain('consent, prior');
    expect(instructions).toContain('two plausible alternatives');
    expect(instructions).toContain('collaborative experiment');
  });

  it('injects the localized clinical-humility rule in every supported language', () => {
    expect(Object.keys(STAGE12_CLINICAL_HUMILITY_BY_LANGUAGE).sort())
      .toEqual([...STAGE12_SUPPORTED_LANGUAGES].sort());
    for (const language of STAGE12_SUPPORTED_LANGUAGES) {
      const localizedRule = STAGE12_CLINICAL_HUMILITY_BY_LANGUAGE[language];
      expect(localizedRule.trim().length).toBeGreaterThan(80);
      expect(buildStage12TurnSupplement('neutral message', language)).toContain(localizedRule);
    }
  });
});
