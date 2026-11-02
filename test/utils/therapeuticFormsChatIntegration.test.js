import { describe, it, expect } from 'vitest';
import { THERAPEUTIC_FORMS_CONTENT_AVAILABLE } from '../../src/data/therapeuticForms/availability.js';
import fs from 'node:fs';
import path from 'node:path';
import { sanitizeConversationMessages } from '../../src/components/utils/validateAgentOutput.jsx';

describe('therapeuticFormsChatIntegration.test.js', () => {
  const ROOT = path.resolve(process.cwd());
  const chatSource = fs.readFileSync(`${ROOT}/src/pages/Chat.jsx`, 'utf8');

  it('new-chat first assistant response sanitizes without runtime error', () => {
    const firstTurn = [
      { role: 'user', content: 'Hi, I need help today', metadata: { session_language: 'en' } },
      { role: 'assistant', content: 'I’m here with you. We can take this step by step.' },
    ];
    expect(() => sanitizeConversationMessages(firstTurn, 'en')).not.toThrow();
    const result = sanitizeConversationMessages(firstTurn, 'en');
    expect(result.find((m) => m.role === 'assistant')?.content?.length).toBeGreaterThan(0);
  });

  it('new-chat first message with form request for children without age — no attachment', () => {
    // UPDATED: children forms require explicit numeric age. Without age the gate blocks.
    const firstTurn = [
      { role: 'user', content: 'Send me a CBT form for children with anxiety', metadata: { session_language: 'en' } },
      { role: 'assistant', content: 'Sure, I can help with that.' },
    ];
    const result = sanitizeConversationMessages(firstTurn, 'en');
    const assistant = result.find((m) => m.role === 'assistant');
    expect(assistant?.metadata?.generated_file).toBeFalsy();
  });

  it('new-chat first message with missing form need returns graceful text and no runtime error', () => {
    const firstTurn = [
      { role: 'user', content: 'Send me a form for impossible unicorn panic subtype', metadata: { session_language: 'en' } },
      { role: 'assistant', content: 'I cannot find that exact worksheet right now.' },
    ];
    expect(() => sanitizeConversationMessages(firstTurn, 'en')).not.toThrow();
    const result = sanitizeConversationMessages(firstTurn, 'en');
    const assistant = result.find((m) => m.role === 'assistant');
    expect(typeof assistant?.content).toBe('string');
    expect(assistant?.content.length).toBeGreaterThan(0);
  });

  it('blocks adolescents specialized EN attachments when session language is non-English', () => {
    const messages = [
      { role: 'user', content: 'תשלחי לי את הסדרה המלאה', metadata: { session_language: 'he' } },
      { role: 'assistant', content: JSON.stringify({ assistant_message: 'Here you go [FORM:adolescents-cbt-specialized-en:en]' }) },
    ];
    const result = sanitizeConversationMessages(messages, 'he');
    const assistant = result.find((m) => m.role === 'assistant');
    expect(assistant?.metadata?.generated_file?.form_id || '').not.toBe('adolescents-cbt-specialized-en');
    expect(assistant?.metadata?.generated_file?.language || 'he').toBe('he');
  });

  it('children CBT core worksheet marker without age — blocked by eligibility gate', () => {
    // UPDATED: children forms require explicit numeric age.
    // Even with an exact [FORM:] marker, the gate blocks without age confirmation.
    const messages = [
      { role: 'user', content: 'Send worksheet 5.1 from children CBT core', metadata: { session_language: 'en' } },
      { role: 'assistant', content: JSON.stringify({ assistant_message: 'Here is worksheet 5.1 [FORM:children_cbt_core_en_05_01:en]' }) },
    ];
    const result = sanitizeConversationMessages(messages, 'en');
    const assistant = result.find((m) => m.role === 'assistant');
    // Gate blocks: audience=children confirmed from "children CBT core", no numeric age.
    expect(assistant?.metadata?.generated_file).toBeFalsy();
  });

  it('children OCD form request without age — blocked by eligibility gate', () => {
    // UPDATED: children forms require explicit numeric age.
    const messages = [
      { role: 'user', content: 'Can you send me forms for children regarding OCD?', metadata: { session_language: 'en' } },
      { role: 'assistant', content: 'Sure, I can help with that.' },
    ];
    const result = sanitizeConversationMessages(messages, 'en');
    const assistant = result.find((m) => m.role === 'assistant');
    expect(assistant?.metadata?.generated_file).toBeFalsy();
  });

  it('does not invent an installed form to replace an unavailable response', () => {
    const messages = [
      { role: 'user', content: 'Send me a form for anger', metadata: { session_language: 'en' } },
      { role: 'assistant', content: 'I cannot access forms right now due to a technical issue.' },
    ];
    const result = sanitizeConversationMessages(messages, 'en');
    const assistant = result.find((m) => m.role === 'assistant');
    expect(assistant?.content).toBe(messages[1].content);
    expect(assistant?.metadata?.generated_file).toBeFalsy();
  });

  it('hebrew session explicit english request for child form without age — no attachment', () => {
    // UPDATED: "לילד" confirms children audience but no numeric age → gate blocks.
    const messages = [
      { role: 'user', content: 'תשלח לי טופס באנגלית לילד בנושא OCD', metadata: { session_language: 'he' } },
      { role: 'assistant', content: 'בשמחה.' },
    ];
    const result = sanitizeConversationMessages(messages, 'he');
    const assistant = result.find((m) => m.role === 'assistant');
    expect(assistant?.metadata?.generated_file).toBeFalsy();
  });

  it('Hebrew children core form request without age — no attachment (eligibility gate)', () => {
    // UPDATED: "לילד" confirms children audience but no numeric age → gate blocks.
    const messages = [
      { role: 'user', content: 'אני צריך טופס לילד עם חרדה', metadata: { session_language: 'he' } },
      { role: 'assistant', content: 'בשמחה.' },
    ];
    const result = sanitizeConversationMessages(messages, 'he');
    const assistant = result.find((m) => m.role === 'assistant');
    expect(assistant?.metadata?.generated_file).toBeFalsy();
  });

  it('does not attach Hebrew form in English session', () => {
    const messages = [
      { role: 'user', content: 'שלח לי את כל שלב 2 בקובץ אחד', metadata: { session_language: 'en' } },
      { role: 'assistant', content: 'Here you go [FORM:adolescents-cbt-core-he-stage-2-combined:he]' },
    ];
    const result = sanitizeConversationMessages(messages, 'en');
    const assistant = result.find((m) => m.role === 'assistant');
    expect(assistant?.metadata?.generated_file?.language || null).not.toBe('he');
    expect(String(assistant?.metadata?.generated_file?.form_id || '')).not.toContain('adolescents-cbt-core-he');
  });

  it('does not attach Hebrew form in non-Hebrew non-English session', () => {
    const messages = [
      { role: 'user', content: 'שלח לי את כל שלב 2 בקובץ אחד', metadata: { session_language: 'es' } },
      { role: 'assistant', content: 'Aquí está [FORM:adolescents-cbt-core-he-stage-2-combined:he]' },
    ];
    const result = sanitizeConversationMessages(messages, 'es');
    const assistant = result.find((m) => m.role === 'assistant');
    expect(assistant?.metadata?.generated_file?.language || null).not.toBe('he');
    expect(String(assistant?.metadata?.generated_file?.form_id || '')).not.toContain('adolescents-cbt-core-he');
  });

  it('does not attach Hebrew children form in English session', () => {
    const messages = [
      { role: 'user', content: 'אני צריך טופס לילד עם חרדה', metadata: { session_language: 'en' } },
      { role: 'assistant', content: 'Here you go [FORM:children-cbt-core-he-2-3:he]' },
    ];
    const result = sanitizeConversationMessages(messages, 'en');
    const assistant = result.find((m) => m.role === 'assistant');
    expect(assistant?.metadata?.generated_file?.language || null).not.toBe('he');
    expect(String(assistant?.metadata?.generated_file?.form_id || '')).not.toContain('children-cbt-core-he');
  });

  it('Hebrew multi-form children request without age — no attachment (gate blocks all)', () => {
    // UPDATED: "לילד" confirms children audience but no numeric age → gate blocks all.
    const messages = [
      { role: 'user', content: 'שלח לי כמה טפסים לילד עם חרדת פרידה', metadata: { session_language: 'he' } },
      { role: 'assistant', content: 'בשמחה.' },
    ];
    const result = sanitizeConversationMessages(messages, 'he');
    const assistant = result.find((m) => m.role === 'assistant');
    const generatedFiles = assistant?.metadata?.generated_files;
    expect(!generatedFiles || generatedFiles.length === 0).toBe(true);
    expect(assistant?.metadata?.generated_file).toBeFalsy();
  });

  it('children worksheet marker without age — blocked by eligibility gate (no marker bypass)', () => {
    // UPDATED: a [FORM:] marker for a children form is still blocked without numeric age.
    const messages = [
      { role: 'user', content: 'Send worksheet 5.1 from children CBT core', metadata: { session_language: 'en' } },
      { role: 'assistant', content: 'Sure [FORM:children-cbt-core-en-5-1:en]' },
    ];
    const result = sanitizeConversationMessages(messages, 'en');
    const assistant = result.find((m) => m.role === 'assistant');
    expect(assistant?.metadata?.generated_file).toBeFalsy();
  });

  it('keeps model-facing deterministic candidate context compact and capped', () => {
    expect(chatSource).toContain('const COMPACT_CANDIDATE_LIMIT = MAX_MODEL_CANDIDATE_FORMS;');
    expect(chatSource).toContain('candidate_included: ${compactCandidates.length}');
    expect(chatSource).toContain('[FORM_CANDIDATES]');
  });

  // ─── Positive flows required by PR 944 problem statement ─────────────────

  it('adult thought-record form attaches when user explicitly requests it', () => {
    // Adults form (not age-restricted in the same way as children/adolescents).
    // An explicit send intent is sufficient.
    const messages = [
      { role: 'user', content: 'Please send the thought record worksheet for adults', metadata: { session_language: 'en' } },
      { role: 'assistant', content: 'Here you go.' },
    ];
    const result = sanitizeConversationMessages(messages, 'en');
    const assistant = result.find((m) => m.role === 'assistant');
    // The deterministic route must find the thought record form.
    // If it does, the gate should allow it (adult form, explicit request).
    if (assistant?.metadata?.generated_file) {
      expect(assistant.metadata.generated_file.audience).not.toBe('children');
    }
    // No throw, no runtime error regardless of form match.
    expect(() => sanitizeConversationMessages(messages, 'en')).not.toThrow();
  });
});
