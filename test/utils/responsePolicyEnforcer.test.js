import { describe, it, expect } from 'vitest';
import { enforceResponsePolicy } from '../../src/lib/responsePolicyEnforcer.js';

const basePolicy = {
  policy_version: 'response_policy_v1',
  policy_available: true,
  action_permitted: false,
  intervention_mode: 'structured_exploration',
  safety_override_required: false,
  status: 'pending',
  scope_match: true,
};

describe('responsePolicyEnforcer', () => {
  it('leaves response unchanged when action is permitted', () => {
    const result = enforceResponsePolicy({
      content: 'You could tell me more about what stood out.',
      policy: { ...basePolicy, action_permitted: true },
    });
    expect(result.content).toBe('You could tell me more about what stood out.');
    expect(result.replaced).toBe(false);
  });

  it('allows validation and exploration when action is not permitted', () => {
    const result = enforceResponsePolicy({
      content: 'It sounds painful, and I want to understand what felt heaviest about it for you.',
      policy: basePolicy,
    });
    expect(result.replaced).toBe(false);
    expect(result.diagnostics.violation_detected).toBe(false);
  });

  it('replaces Hebrew concrete directives', () => {
    const result = enforceResponsePolicy({
      content: 'כדאי שתכתבי לו עכשיו הודעה ותשלחי אותה.',
      policy: basePolicy,
      locale: 'he',
    });
    expect(result.replaced).toBe(true);
    expect(result.content).toContain('מה הכי חשוב');
  });

  it('replaces English concrete directives and suppresses forms', () => {
    const result = enforceResponsePolicy({
      content: 'Try writing the message now. [FORM:test]',
      metadata: { generated_file: { id: 'f1' }, generated_files: [{ id: 'f1' }] },
      policy: basePolicy,
    });
    expect(result.replaced).toBe(true);
    expect(result.metadata.generated_file).toBeUndefined();
    expect(result.diagnostics.violation_reason_codes).toContain('form_marker');
  });

  it.each([
    ['es-MX', 'Escribe ahora un mensaje breve.', 'Quedémonos', 'direct_imperative_es'],
    ['fr-FR', 'Écrivez maintenant un message bref.', 'Restons', 'direct_imperative_fr'],
    ['de-DE', 'Schreiben Sie jetzt eine kurze Nachricht.', 'Bleiben wir', 'direct_imperative_de'],
    ['it-IT', 'Scrivi ora un messaggio breve.', 'Restiamo', 'direct_imperative_it'],
    ['pt-BR', 'Escreva agora uma mensagem breve.', 'Vamos permanecer', 'direct_imperative_pt'],
  ])('replaces a disallowed directive in %s with a same-language holding response', (
    locale,
    content,
    expectedStart,
    reasonCode,
  ) => {
    const result = enforceResponsePolicy({ content, policy: basePolicy, locale });
    expect(result.replaced).toBe(true);
    expect(result.content).toMatch(new RegExp(`^${expectedStart}`));
    expect(result.diagnostics.violation_reason_codes).toContain(reasonCode);
  });

  it.each([
    ['es', 'Tal vez podamos explorar qué se siente más importante ahora.'],
    ['fr', 'Peut-être que nous pouvons explorer ce qui compte le plus maintenant.'],
    ['de', 'Vielleicht können wir erkunden, was sich gerade am wichtigsten anfühlt.'],
    ['it', 'Forse possiamo esplorare ciò che sembra più importante adesso.'],
    ['pt', 'Talvez possamos explorar o que parece mais importante agora.'],
  ])('allows same-language exploration in %s when action is not permitted', (locale, content) => {
    const result = enforceResponsePolicy({ content, policy: basePolicy, locale });
    expect(result.replaced).toBe(false);
    expect(result.diagnostics.violation_detected).toBe(false);
  });

  it('preserves mandatory safety guidance', () => {
    const result = enforceResponsePolicy({
      content: 'If you are in immediate danger, call emergency services now.',
      policy: { ...basePolicy, safety_override_required: true },
    });
    expect(result.replaced).toBe(false);
  });

  it('fails open when policy is unavailable', () => {
    const result = enforceResponsePolicy({
      content: 'Try taking three breaths.',
      policy: { ...basePolicy, policy_available: false },
    });
    expect(result.replaced).toBe(false);
    expect(result.diagnostics.policy_available).toBe(false);
  });
});
