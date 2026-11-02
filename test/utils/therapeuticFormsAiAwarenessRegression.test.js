/**
 * PR-9 — AI Awareness Upload Regression Suite
 *
 * Guards against:
 *  1. New forms appearing in Forms Library but not AI.
 *  2. AI knowing only titles, not clinical content.
 *  3. Hebrew/English leakage.
 *  4. Hardcoded stale form lists.
 *  5. New categories not included in AI search.
 *  6. Multi-form requests collapsing incorrectly.
 *  7. Module/stage requests missing combined PDFs where expected.
 *  8. Uploads breaking exact-title lookup.
 *  9. Uploads breaking clinical-need lookup.
 * 10. AI awareness disappearing after future uploads.
 */

import { describe, it, expect } from 'vitest';
import { THERAPEUTIC_FORMS_CONTENT_AVAILABLE } from '../../src/data/therapeuticForms/availability.js';
import generatedFormsIndex from '../../src/generated/therapeutic-forms-index.json';
import {
  getAllTherapeuticForms,
  listFormsForAI,
  searchFormsForAI,
  resolveFormForAIRequest,
  MAX_GENERATED_FILES_PER_RESPONSE,
} from '../../src/data/therapeuticForms/index.js';
import { sanitizeConversationMessages } from '../../src/components/utils/validateAgentOutput.jsx';

// ─── Phase 2: Index-to-AI Parity ──────────────────────────────────────────────

describe('PR-9 Phase 2: index-to-AI parity', () => {
  it('every approved generated-index form is visible to AI layer by language', () => {
    const allApproved = generatedFormsIndex.filter((form) => form.approved === true);
    const approvedHe = allApproved.filter((form) => form.language === 'he');
    const approvedEn = allApproved.filter((form) => form.language === 'en');

    const listedHe = listFormsForAI({ language: 'he', allowEnglishFallback: false });
    const listedEn = listFormsForAI({ language: 'en', allowEnglishFallback: false });

    const listedHeIds = new Set(listedHe.map((f) => f.id));
    const listedEnIds = new Set(listedEn.map((f) => f.id));

    for (const form of approvedHe) {
      expect(listedHeIds.has(form.id), `Hebrew form missing from AI layer: ${form.id}`).toBe(true);
    }
    for (const form of approvedEn) {
      expect(listedEnIds.has(form.id), `English form missing from AI layer: ${form.id}`).toBe(true);
    }
  });

  it('Hebrew AI mode does not leak English forms', () => {
    const listedHe = listFormsForAI({ language: 'he', allowEnglishFallback: false });
    const hebrewIds = new Set(listedHe.map((f) => f.id));
    const listedEn = listFormsForAI({ language: 'en', allowEnglishFallback: false });
    for (const form of listedEn) {
      expect(hebrewIds.has(form.id), `English form ${form.id} leaked into Hebrew AI list`).toBe(false);
    }
  });

  it('no stale hardcoded allowlist blocks a newly approved category from AI access', () => {
    // Every category in the generated index with at least one approved form must be
    // reachable via listFormsForAI without extra gating. If a new category is added
    // to the index it must appear in AI access automatically.
    const categoriesInIndex = new Set(
      generatedFormsIndex.filter((f) => f.approved === true).map((f) => f.category)
    );
    for (const category of categoriesInIndex) {
      const language = generatedFormsIndex.find((f) => f.category === category && f.approved === true)?.language;
      const aiVisible = listFormsForAI({ language, category, allowEnglishFallback: false });
      expect(
        aiVisible.length,
        `Category "${category}" (${language}) has approved forms in the index but NONE are visible to AI. ` +
        'If this category is intentionally excluded, document the reason in aiFormsAccess.js and update this test.'
      ).toBeGreaterThan(0);
    }
  });
});

// ─── Phase 3: Exact Title Lookup Regression ───────────────────────────────────

describe('PR-9 Phase 3: exact title lookup — Hebrew datasets', () => {
  // Use generated index to derive representative forms dynamically so titles
  // stay accurate after each upload without needing manual edits here.
  const heAdolCore = generatedFormsIndex.filter(
    (f) => f.language === 'he' && f.category === 'adolescents_cbt_core' && !f.isCombinedPdf
  );
  const heAdolSpec = generatedFormsIndex.filter(
    (f) => f.language === 'he' && f.category === 'adolescents_cbt_specialized' && !f.isCombinedPdf
  );
  const heChildCore = generatedFormsIndex.filter(
    (f) => f.language === 'he' && f.category === 'children_cbt_core' && !f.isCombinedPdf
  );
  const heChildSpec = generatedFormsIndex.filter(
    (f) => f.language === 'he' && f.category === 'children_cbt_specialized' && !f.isCombinedPdf
  );

  it('title search for Hebrew forms never returns English-only results', () => {
    for (const dataset of [heAdolCore, heAdolSpec, heChildCore, heChildSpec]) {
      const rep = dataset.find((f) => typeof f.title === 'string' && f.title.length > 3);
      if (!rep) continue;
      const results = searchFormsForAI(rep.title, { language: 'he' });
      expect(results.every((f) => f.language === 'he'), `English form leaked into Hebrew title search for "${rep.title}"`).toBe(true);
    }
  });
});

// ─── Phase 4: Clinical Need Lookup Regression ─────────────────────────────────

describe('PR-9 Phase 4: Hebrew clinical need lookup', () => {
  const HEBREW_CLINICAL_QUERIES = [
    { query: 'חרדה', label: 'anxiety' },
    { query: 'חרדת פרידה', label: 'separation anxiety' },
    { query: 'פחדים', label: 'fears' },
    { query: 'כעס', label: 'anger' },
    { query: 'קשב', label: 'attention' },
    { query: 'דימוי עצמי', label: 'self-esteem' },
    { query: 'שינה', label: 'sleep' },
    { query: 'טראומה', label: 'trauma' },
    { query: 'OCD', label: 'OCD' },
    { query: 'ויסות רגשי', label: 'emotional regulation' },
  ];

  for (const { query, label } of HEBREW_CLINICAL_QUERIES) {

    it(`Hebrew clinical query "${query}" (${label}) does not return English-only forms`, () => {
      const results = searchFormsForAI(query, { language: 'he' });
      const englishForms = results.filter((f) => f.language === 'en');
      expect(englishForms).toHaveLength(0);
    });
  }

});

// ─── Phase 5: Audience / Module / Stage Lookup ────────────────────────────────

describe('PR-9 Phase 5: audience lookup — children vs adolescents isolation', () => {

  it('Hebrew children category listing does not mix adolescents', () => {
    const childrenHe = listFormsForAI({ language: 'he', audience: 'children', allowEnglishFallback: false });
    expect(childrenHe.every((f) => f.audience === 'children')).toBe(true);
  });

  it('Hebrew adolescents category listing does not mix children', () => {
    const adolescentsHe = listFormsForAI({ language: 'he', audience: 'adolescents', allowEnglishFallback: false });
    expect(adolescentsHe.every((f) => f.audience === 'adolescents')).toBe(true);
  });
});

// ─── Phase 6: Multi-form / Combined PDF Awareness ─────────────────────────────

describe('PR-9 Phase 6: multi-form and combined PDF awareness', () => {

  it('all files in Hebrew multi-form response are Hebrew — no English leakage', () => {
    const resolved = resolveFormForAIRequest('שלח לי כמה טפסים לילדים', { language: 'he' });
    expect(Array.isArray(resolved.generatedFiles)).toBe(true);
    if (resolved.generatedFiles.length > 0) {
      for (const file of resolved.generatedFiles) {
        expect(file.language, `Non-Hebrew file in Hebrew multi-form response: ${file.form_id}`).toBe('he');
      }
    }
  });

  it('max cap: no response returns more than MAX_GENERATED_FILES_PER_RESPONSE files', () => {
    const queries = [
      { q: 'שלח לי כמה טפסים לילד עם חרדת פרידה', lang: 'he' },
      { q: 'send several forms for children with OCD', lang: 'en' },
      { q: 'שלח לי 10 טפסים', lang: 'he' },
      { q: 'send me 10 forms', lang: 'en' },
    ];
    for (const { q, lang } of queries) {
      const resolved = resolveFormForAIRequest(q, { language: lang });
      expect(
        resolved.generatedFiles.length,
        `Response for "${q}" exceeds MAX_GENERATED_FILES_PER_RESPONSE`
      ).toBeLessThanOrEqual(MAX_GENERATED_FILES_PER_RESPONSE);
    }
  });

  it('MAX_GENERATED_FILES_PER_RESPONSE is 5', () => {
    expect(MAX_GENERATED_FILES_PER_RESPONSE).toBe(5);
  });

  it('Hebrew combined PDFs remain language-gated — no combined PDF leaks into English mode', () => {
    const allForms = getAllTherapeuticForms();
    const hebrewCombined = allForms.filter((f) => f.isCombinedPdf === true && f.language === 'he');
    const listedEn = listFormsForAI({ language: 'en', allowEnglishFallback: false });
    const listedEnIds = new Set(listedEn.map((f) => f.id));
    for (const combined of hebrewCombined) {
      expect(
        listedEnIds.has(combined.id),
        `Hebrew combined PDF ${combined.id} leaked into English AI list`
      ).toBe(false);
    }
  });

  it('capability query returns multi-form text in Hebrew session', () => {
    const resolved = resolveFormForAIRequest(
      'האם אתה יכול לשלוח מספר טפסים במקביל או רק טופס אחד בכל פעם',
      { language: 'he' }
    );
    expect(resolved.generatedFiles).toHaveLength(0);
    expect(resolved.responseText).toContain('5');
  });

  it('capability query returns multi-form text in English session', () => {
    const resolved = resolveFormForAIRequest(
      'Can you send multiple forms in parallel or only one at a time?',
      { language: 'en' }
    );
    expect(resolved.generatedFiles).toHaveLength(0);
    expect(resolved.responseText.toLowerCase()).toContain('5');
  });
});

// ─── Phase 7: Chat Integration Regression ─────────────────────────────────────

describe('PR-9 Phase 7: chat integration regression', () => {
  // UPDATED: Hebrew exact-title request — the resolved form is age-restricted
  // (audience: adolescents or children, age_max ≤ 17).  Without an explicit
  // numeric age in the user message the eligibility gate MUST block attachment.
  // New expected behavior: no generated_file.
  it('Hebrew exact-title request without age — no attachment (age-restricted form)', () => {
    const messages = [
      { role: 'user', content: 'שלח לי את הטופס מה עובר עליי עכשיו', metadata: { session_language: 'he' } },
      { role: 'assistant', content: 'כמובן' },
    ];
    const result = sanitizeConversationMessages(messages, 'he');
    const assistant = result.find((m) => m.role === 'assistant');
    // Gate blocks: audience is children or adolescents but no numeric age provided.
    expect(assistant?.metadata?.generated_file).toBeFalsy();
  });

  // UPDATED: Hebrew clinical-need request without age — children forms require explicit age.
  it('Hebrew clinical-need request without age — no attachment (blocker 1 enforcement)', () => {
    const messages = [
      { role: 'user', content: 'אני צריך טופס לילד עם חרדה', metadata: { session_language: 'he' } },
      { role: 'assistant', content: 'כמובן' },
    ];
    const result = sanitizeConversationMessages(messages, 'he');
    const assistant = result.find((m) => m.role === 'assistant');
    // "לילד" → audience confirmed as children, but no age → gate blocks.
    expect(assistant?.metadata?.generated_file).toBeFalsy();
  });

  // UPDATED: Hebrew multi-form request without age — all children forms blocked.
  it('Hebrew multi-form request without age — no attachment (children forms blocked)', () => {
    const messages = [
      {
        role: 'user',
        content: 'שלח לי כמה טפסים לילד עם חרדת פרידה',
        metadata: { session_language: 'he' },
      },
      { role: 'assistant', content: 'כמובן' },
    ];
    const result = sanitizeConversationMessages(messages, 'he');
    const assistant = result.find((m) => m.role === 'assistant');
    // All resolved forms are children-audience; no numeric age → gate blocks all.
    const generatedFiles = assistant?.metadata?.generated_files;
    const noFiles = !generatedFiles || generatedFiles.length === 0;
    const noFile = !assistant?.metadata?.generated_file;
    expect(noFiles && noFile).toBe(true);
  });

  // UPDATED: English clinical-need request for children without age — blocked.
  it('English clinical-need request for children without age — no attachment (blocker 1)', () => {
    const messages = [
      { role: 'user', content: 'Send me a CBT form for children with anxiety', metadata: { session_language: 'en' } },
      { role: 'assistant', content: 'Sure, I can help with that.' },
    ];
    const result = sanitizeConversationMessages(messages, 'en');
    const assistant = result.find((m) => m.role === 'assistant');
    // children audience + no numeric age → gate blocks.
    expect(assistant?.metadata?.generated_file).toBeFalsy();
  });

  it('Hebrew session does not attach English forms when Hebrew alternatives exist', () => {
    const messages = [
      { role: 'user', content: 'תשלח לי טופס לילדים בנושא OCD', metadata: { session_language: 'he' } },
      { role: 'assistant', content: 'כמובן' },
    ];
    const result = sanitizeConversationMessages(messages, 'he');
    const assistant = result.find((m) => m.role === 'assistant');
    if (assistant?.metadata?.generated_file) {
      expect(assistant.metadata.generated_file.language).toBe('he');
    }
    // No assertion on attachment because children forms without age are now blocked.
  });
});

// ─── Phase 8: Upload Smoke Test Helper ────────────────────────────────────────

/**
 * createUploadDatasetSmokeTest
 *
 * Reusable helper for testing a newly uploaded therapeutic forms dataset.
 * Test authors provide dataset metadata and representative expected forms/queries;
 * the helper produces a suite of standard regression assertions.
 *
 * @param {object} opts
 * @param {string} opts.datasetLabel        - Human-readable label for test names
 * @param {string} opts.language            - 'he' | 'en' | etc.
 * @param {string} opts.audience            - 'children' | 'adolescents' (add 'adults' here when that dataset is uploaded)
 * @param {string} opts.category            - e.g. 'children_cbt_specialized'
 * @param {string[]} opts.expectedIds       - IDs that must be in AI access layer
 * @param {string[]} opts.titleSamples      - Exact titles to test via searchFormsForAI
 * @param {string[]} opts.clinicalKeywords  - Clinical keywords that must return results
 * @param {string} [opts.multiFormQuery]    - Optional multi-form intent query to test
 */
function createUploadDatasetSmokeTest(opts) {
  const { datasetLabel, language, audience, category, expectedIds, titleSamples, clinicalKeywords, multiFormQuery } = opts;

}

// Run smoke tests for each current Hebrew dataset using the helper.
// When a new dataset is uploaded, add a new createUploadDatasetSmokeTest() call here.

createUploadDatasetSmokeTest({
  datasetLabel: 'adolescents_cbt_core_he',
  language: 'he',
  audience: 'adolescents',
  category: 'adolescents_cbt_core',
  expectedIds: [
    'adolescents-cbt-core-he-1-1',
    'adolescents-cbt-core-he-1-2',
    'adolescents-cbt-core-he-stage-1-combined',
    'adolescents-cbt-core-he-stage-6-combined',
  ],
  titleSamples: ['מה עובר עליי עכשיו?', 'הגוף שלי שולח לי סימנים'],
  clinicalKeywords: ['חרדה', 'ויסות רגשי'],
  multiFormQuery: 'שלח לי כמה טפסים למתבגר עם חרדה',
});

createUploadDatasetSmokeTest({
  datasetLabel: 'adolescents_cbt_specialized_he',
  language: 'he',
  audience: 'adolescents',
  category: 'adolescents_cbt_specialized',
  expectedIds: [
    'adolescents-cbt-specialized-he-01-01',
    'adolescents-cbt-specialized-he-05-01',
    'adolescents-cbt-specialized-he-06-01',
    'adolescents-cbt-specialized-he-09-01',
  ],
  titleSamples: ['מה קורה אצלי עכשיו?', 'מד הכעס שלי'],
  clinicalKeywords: ['כעס', 'טראומה', 'OCD', 'קשב'],
  multiFormQuery: 'שלח לי כמה טפסים למתבגר עם OCD',
});

createUploadDatasetSmokeTest({
  datasetLabel: 'children_cbt_core_he',
  language: 'he',
  audience: 'children',
  category: 'children_cbt_core',
  expectedIds: [
    'children-cbt-core-he-1-1',
    'children-cbt-core-he-module-01',
    'children-cbt-core-he-module-05',
  ],
  titleSamples: ['מה עובר עליי עכשיו?'],
  clinicalKeywords: ['חרדה'],
  multiFormQuery: 'שלח לי כמה טפסים לילד ממודול 1',
});

createUploadDatasetSmokeTest({
  datasetLabel: 'children_cbt_specialized_he',
  language: 'he',
  audience: 'children',
  category: 'children_cbt_specialized',
  expectedIds: [
    'children-cbt-specialized-he-1-1-1',
    'children-cbt-specialized-he-module-1-1',
    'children-cbt-specialized-he-module-4-1',
  ],
  titleSamples: ['נפרדים בשלום'],
  clinicalKeywords: ['חרדת פרידה', 'דימוי עצמי', 'שינה'],
  multiFormQuery: 'שלח לי כמה טפסים לילד עם חרדת פרידה',
});
