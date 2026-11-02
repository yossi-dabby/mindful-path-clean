/**
 * Multilingual deterministic form intent and no-fallback routing.
 */

import { describe, expect, it } from 'vitest';
import {
  detectFormIntent,
  hasExplicitFormSuppressionIntent,
  resolveFormForAIRequest,
} from '../../src/data/therapeuticForms/aiFormsAccess.js';

const CASES = Object.freeze([
  {
    locale: 'es',
    send: 'Envíame un formulario.',
    list: '¿Qué formularios tienes?',
    child: 'Envíame un formulario para un niño.',
    explicitLanguage: 'Envíame un formulario en español.',
    suppressed: 'No me envíes ningún formulario.',
    multiple: 'Envíame varios formularios.',
    capability: '¿Puedes enviar varios formularios?',
    noMatchPrefix: 'No encontré',
  },
  {
    locale: 'fr',
    send: 'Envoie-moi un formulaire.',
    list: 'Quels formulaires avez-vous ?',
    child: 'Envoie-moi un formulaire pour un enfant.',
    explicitLanguage: 'Envoie-moi un formulaire en français.',
    suppressed: 'Ne m’envoie pas de formulaire.',
    multiple: 'Envoie-moi plusieurs formulaires.',
    capability: 'Peux-tu envoyer plusieurs formulaires ?',
    noMatchPrefix: 'Je n’ai',
  },
  {
    locale: 'de',
    send: 'Schick mir ein Formular.',
    list: 'Welche Formulare hast du?',
    child: 'Schick mir ein Formular für ein Kind.',
    explicitLanguage: 'Schick mir ein Formular auf Deutsch.',
    suppressed: 'Schick mir kein Formular.',
    multiple: 'Schick mir mehrere Formulare.',
    capability: 'Kannst du mehrere Formulare senden?',
    noMatchPrefix: 'Ich habe',
  },
  {
    locale: 'it',
    send: 'Inviami un modulo.',
    list: 'Quali moduli hai?',
    child: 'Inviami un modulo per un bambino.',
    explicitLanguage: 'Inviami un modulo in italiano.',
    suppressed: 'Non inviare alcun modulo.',
    multiple: 'Inviami diversi moduli.',
    capability: 'Puoi inviare diversi moduli?',
    noMatchPrefix: 'Non ho',
  },
  {
    locale: 'pt',
    send: 'Envie-me um formulário.',
    list: 'Quais formulários você tem?',
    child: 'Envie-me um formulário para uma criança.',
    explicitLanguage: 'Envie-me um formulário em português.',
    suppressed: 'Não envie nenhum formulário.',
    multiple: 'Envie-me vários formulários.',
    capability: 'Você pode enviar vários formulários?',
    noMatchPrefix: 'Ainda não',
  },
]);

describe('Multilingual deterministic therapeutic-form routing', () => {
  it('does not misroute the Portuguese runtime prohibition as a form request', () => {
    const runtimePrompt =
      'Ultimamente verifico repetidamente um relatório importante do trabalho porque tenho medo de ter deixado passar algum erro. ' +
      'Cada verificação me acalma por alguns minutos, mas depois a dúvida volta. ' +
      'Explique brevemente o mecanismo que mantém esse padrão e o tipo de intervenção adequado. ' +
      'Não proponha nenhuma ação, exercício, pergunta ou ficha de trabalho.';

    expect(hasExplicitFormSuppressionIntent(runtimePrompt)).toBe(true);
    expect(detectFormIntent(runtimePrompt)).toBeNull();
    expect(resolveFormForAIRequest(runtimePrompt, { language: 'pt' }).intent).toBeNull();
  });

  it('does not misroute a Portuguese vent-only refusal of an exercise', () => {
    const ventOnly = 'Tive um dia difícil. Agora só quero desabafar e não quero fazer um exercício.';

    expect(hasExplicitFormSuppressionIntent(ventOnly)).toBe(true);
    expect(detectFormIntent(ventOnly)).toBeNull();
    expect(resolveFormForAIRequest(ventOnly, { language: 'pt' }).intent).toBeNull();
  });

  it('keeps an explicit Portuguese worksheet request positive', () => {
    expect(hasExplicitFormSuppressionIntent('Envie-me uma ficha de trabalho.')).toBe(false);
    expect(detectFormIntent('Envie-me uma ficha de trabalho.')).toMatchObject({
      type: 'send_best_matching_form',
    });
  });

  it('detects list and single-send intent in every additional locale', () => {
    for (const item of CASES) {
      expect(detectFormIntent(item.list), `list intent: ${item.locale}`).toMatchObject({
        type: 'list_all_forms',
      });
      expect(detectFormIntent(item.send), `send intent: ${item.locale}`).toMatchObject({
        type: 'send_best_matching_form',
      });
    }
  });

  it('extracts native language names in every additional locale', () => {
    for (const item of CASES) {
      expect(detectFormIntent(item.explicitLanguage), `language: ${item.locale}`).toMatchObject({
        type: 'send_best_matching_form',
        language: item.locale,
      });
    }
  });

  it('extracts child audience terms without inferring age', () => {
    for (const item of CASES) {
      expect(detectFormIntent(item.child), `child audience: ${item.locale}`).toMatchObject({
        type: 'send_best_matching_form',
        audience: 'children',
      });
    }
  });

  it('keeps current-turn worksheet suppression authoritative in every additional locale', () => {
    for (const item of CASES) {
      expect(hasExplicitFormSuppressionIntent(item.suppressed), `suppression: ${item.locale}`).toBe(true);
      expect(detectFormIntent(item.suppressed), `suppressed intent: ${item.locale}`).toBeNull();
    }
  });

  it('detects multiple-form and capability requests in every additional locale', () => {
    for (const item of CASES) {
      expect(detectFormIntent(item.multiple), `multiple: ${item.locale}`).toMatchObject({
        type: 'send_multiple_forms',
      });
      expect(detectFormIntent(item.capability), `capability: ${item.locale}`).toMatchObject({
        type: 'forms_capability_query',
      });
    }
  });

  it('does not silently attach English or Hebrew forms when the active locale has no installed forms', () => {
    for (const item of CASES) {
      const result = resolveFormForAIRequest(item.send, { language: item.locale });
      expect(result.intent?.type, `resolved intent: ${item.locale}`).toBe('send_best_matching_form');
      expect(result.generatedFile, `single fallback: ${item.locale}`).toBeNull();
      expect(result.generatedFiles, `multi fallback: ${item.locale}`).toHaveLength(0);
      expect(result.usedFallbackLanguage, `fallback flag: ${item.locale}`).toBe(false);
      expect(result.resolvedLanguage, `resolved language: ${item.locale}`).toBe(item.locale);
      expect(result.responseText, `localized response: ${item.locale}`).toMatch(
        new RegExp(`^${item.noMatchPrefix}`),
      );
    }
  });

  it('returns localized multi-form capability text', () => {
    for (const item of CASES) {
      const result = resolveFormForAIRequest(item.capability, { language: item.locale });
      expect(result.intent?.type, `capability intent: ${item.locale}`).toBe('forms_capability_query');
      expect(result.generatedFiles).toHaveLength(0);
      expect(result.responseText).not.toMatch(/^Yes\.|^כן\./);
    }
  });
});
