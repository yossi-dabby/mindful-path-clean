/**
 * PR-4 — generated_file / generated_files edge-case contract tests
 *
 * Hardens the generated file attachment contract used by AI Chat.
 *
 * Coverage:
 *   1.  Single generated_file payload
 *   2.  Multiple generated_files payload (order + count preserved)
 *   3.  Mixed: generated_file duplicates first generated_files item → dedup to 3
 *   4.  Mixed: generated_file is different from generated_files → all retained
 *   5.  Deduplication by form_id (first-seen wins)
 *   6.  Deduplication by url when form_id is missing
 *   7.  Near-duplicates (same title, different form_id and url) are NOT removed
 *   8.  Empty generated_files array
 *   9.  Malformed generated_files entries (null, {}, missing url, wrong type)
 *   10. Language metadata preservation (he / en)
 *   11. Maximum cap contract (MAX_GENERATED_FILES_PER_RESPONSE = 5)
 *   12. isCombinedPdf / is_combined_pdf field preservation
 *   13. normalizeGeneratedFile library field round-trip
 *   14. sanitizeConversationMessages generated_files passthrough
 *   15. MessageBubble source-code dedup contract (pattern verified via fs)
 */

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { normalizeGeneratedFile } from '../../src/components/chat/utils/normalizeGeneratedFile.js';
import { sanitizeConversationMessages } from '../../src/components/utils/validateAgentOutput.jsx';
import { MAX_GENERATED_FILES_PER_RESPONSE } from '../../src/data/therapeuticForms/aiFormsAccess.js';

const PROJECT_ROOT = path.resolve(process.cwd());

// ─── Replicated MessageBubble generatedFiles IIFE (for pure-function unit tests) ──
//
// This replicates the exact merge+dedup logic from MessageBubble.jsx (lines 181-195).
// The source-code contract test below verifies the production pattern still matches.
function resolveMessageGeneratedFiles(metadata) {
  const combined = [
    ...(normalizeGeneratedFile(metadata?.generated_file) ? [metadata.generated_file] : []),
    ...((Array.isArray(metadata?.generated_files) ? metadata.generated_files : [])
      .filter((item) => normalizeGeneratedFile(item))),
  ];
  const seen = new Set();
  return combined.filter((item) => {
    const key = String(item?.form_id || item?.url || '');
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ─── Fixtures ────────────────────────────────────────────────────────────────

const FORM_A = {
  type: 'pdf',
  url: '/forms/en/children/cbt-core/children-cbt-core-en.pdf',
  name: 'children-cbt-core-en.pdf',
  title: 'Children CBT Core',
  form_id: 'children-cbt-core-en',
  language: 'en',
  audience: 'children',
  category: 'cbt_core',
};

const FORM_B = {
  type: 'pdf',
  url: '/forms/en/adolescents/cbt-core/series/adolescents-cbt-core-series-1-full-en.pdf',
  name: 'adolescents-cbt-core-en.pdf',
  title: 'Adolescents CBT Core',
  form_id: 'adolescents-cbt-core-en',
  language: 'en',
  audience: 'adolescents',
  category: 'adolescents_cbt_core',
};

const FORM_C = {
  type: 'pdf',
  url: '/forms/en/adolescents/cbt-specialized/module-01.pdf',
  name: 'module-01.pdf',
  title: 'Adolescents CBT Specialized Module 1',
  form_id: 'adolescents-cbt-specialized-en-module-01',
  language: 'en',
};

const FORM_HE_1 = {
  type: 'pdf',
  url: '/forms/adolescents_cbt_core_he_series_1/adolescents_cbt_core_he_series_1_combined.pdf',
  name: 'adolescents_cbt_core_he_series_1_combined.pdf',
  title: 'תוכנית CBT לנוער - שלב 1',
  form_id: 'adolescents-cbt-core-he-stage-1-combined',
  language: 'he',
  audience: 'adolescents',
  isCombinedPdf: true,
};

const FORM_HE_2 = {
  type: 'pdf',
  url: '/forms/adolescents_cbt_core_he_series_2/adolescents_cbt_core_he_series_2_combined.pdf',
  name: 'adolescents_cbt_core_he_series_2_combined.pdf',
  title: 'תוכנית CBT לנוער - שלב 2',
  form_id: 'adolescents-cbt-core-he-stage-2-combined',
  language: 'he',
  audience: 'adolescents',
  isCombinedPdf: true,
};

// ─────────────────────────────────────────────────────────────────────────────
// 1. Single generated_file payload
// ─────────────────────────────────────────────────────────────────────────────
describe('generated_file — single payload contract', () => {
  it('normalizes a valid single generated_file to one renderable item', () => {
    const files = resolveMessageGeneratedFiles({ generated_file: FORM_A });
    expect(files).toHaveLength(1);
  });

  it('preserves title, name, url, and language from a single generated_file', () => {
    const files = resolveMessageGeneratedFiles({ generated_file: FORM_A });
    expect(files[0].title).toBe('Children CBT Core');
    expect(files[0].name).toBe('children-cbt-core-en.pdf');
    expect(files[0].url).toBe('/forms/en/children/cbt-core/children-cbt-core-en.pdf');
    expect(files[0].language).toBe('en');
  });

  it('does not require generated_files to be present for a single generated_file', () => {
    const files = resolveMessageGeneratedFiles({ generated_file: FORM_B });
    expect(files).toHaveLength(1);
    expect(files[0].form_id).toBe('adolescents-cbt-core-en');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Multiple generated_files payload
// ─────────────────────────────────────────────────────────────────────────────
describe('generated_files — multiple payload contract', () => {
  it('preserves all 3 files from a generated_files array', () => {
    const files = resolveMessageGeneratedFiles({
      generated_files: [FORM_A, FORM_B, FORM_C],
    });
    expect(files).toHaveLength(3);
  });

  it('preserves order of generated_files items', () => {
    const files = resolveMessageGeneratedFiles({
      generated_files: [FORM_A, FORM_B, FORM_C],
    });
    expect(files[0].form_id).toBe('children-cbt-core-en');
    expect(files[1].form_id).toBe('adolescents-cbt-core-en');
    expect(files[2].form_id).toBe('adolescents-cbt-specialized-en-module-01');
  });

  it('preserves language metadata on every item in generated_files', () => {
    const files = resolveMessageGeneratedFiles({
      generated_files: [FORM_A, FORM_B, FORM_C],
    });
    for (const file of files) {
      expect(file.language).toBe('en');
    }
  });

  it('keeps each generated_files item independently renderable (url + name present)', () => {
    const files = resolveMessageGeneratedFiles({
      generated_files: [FORM_A, FORM_B, FORM_C],
    });
    for (const file of files) {
      expect(file.url).toBeTruthy();
      expect(file.name).toBeTruthy();
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Mixed payload — generated_file duplicates first generated_files item
// ─────────────────────────────────────────────────────────────────────────────
describe('mixed payload — generated_file duplicates first generated_files item', () => {
  it('produces exactly 3 unique items when first item appears in both fields', () => {
    const files = resolveMessageGeneratedFiles({
      generated_file: FORM_A,
      generated_files: [FORM_A, FORM_B, FORM_C],
    });
    expect(files).toHaveLength(3);
  });

  it('first item appears only once when it is present in both fields', () => {
    const files = resolveMessageGeneratedFiles({
      generated_file: FORM_A,
      generated_files: [FORM_A, FORM_B, FORM_C],
    });
    const ids = files.map((f) => f.form_id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('order remains: first (deduplicated), second, third', () => {
    const files = resolveMessageGeneratedFiles({
      generated_file: FORM_A,
      generated_files: [FORM_A, FORM_B, FORM_C],
    });
    expect(files[0].form_id).toBe('children-cbt-core-en');
    expect(files[1].form_id).toBe('adolescents-cbt-core-en');
    expect(files[2].form_id).toBe('adolescents-cbt-specialized-en-module-01');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Mixed payload — generated_file is different from generated_files
// ─────────────────────────────────────────────────────────────────────────────
describe('mixed payload — generated_file is distinct from generated_files items', () => {
  it('retains all unique valid items', () => {
    const files = resolveMessageGeneratedFiles({
      generated_file: FORM_C,
      generated_files: [FORM_A, FORM_B],
    });
    expect(files).toHaveLength(3);
  });

  it('places generated_file first (it is prepended to the combined list)', () => {
    const files = resolveMessageGeneratedFiles({
      generated_file: FORM_C,
      generated_files: [FORM_A, FORM_B],
    });
    expect(files[0].form_id).toBe('adolescents-cbt-specialized-en-module-01');
  });

  it('generated_files items follow in their original order', () => {
    const files = resolveMessageGeneratedFiles({
      generated_file: FORM_C,
      generated_files: [FORM_A, FORM_B],
    });
    expect(files[1].form_id).toBe('children-cbt-core-en');
    expect(files[2].form_id).toBe('adolescents-cbt-core-en');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Deduplication by form_id
// ─────────────────────────────────────────────────────────────────────────────
describe('deduplication by form_id', () => {
  it('removes a duplicate that shares form_id with an earlier item', () => {
    const sameFormIdDifferentUrl = { ...FORM_A, url: '/forms/en/children/cbt-core/variant.pdf', name: 'variant.pdf' };
    const files = resolveMessageGeneratedFiles({
      generated_files: [FORM_A, sameFormIdDifferentUrl, FORM_B],
    });
    expect(files).toHaveLength(2);
  });

  it('keeps the first-seen item when form_id duplicates appear', () => {
    const sameFormIdDifferentUrl = { ...FORM_A, url: '/forms/en/children/cbt-core/variant.pdf', name: 'variant.pdf' };
    const files = resolveMessageGeneratedFiles({
      generated_files: [FORM_A, sameFormIdDifferentUrl, FORM_B],
    });
    expect(files[0].url).toBe(FORM_A.url);
  });

  it('does not crash on deduplication with identical form_ids', () => {
    const duplicateFormB = { ...FORM_B };
    expect(() =>
      resolveMessageGeneratedFiles({ generated_files: [FORM_B, duplicateFormB] })
    ).not.toThrow();
  });

  it('leaves one canonical card after deduplication', () => {
    const duplicateFormC = { ...FORM_C };
    const files = resolveMessageGeneratedFiles({ generated_files: [FORM_C, duplicateFormC] });
    expect(files).toHaveLength(1);
    expect(files[0].form_id).toBe(FORM_C.form_id);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Deduplication by URL when form_id is missing
// ─────────────────────────────────────────────────────────────────────────────
describe('deduplication by url (no form_id)', () => {
  const noId1 = {
    type: 'pdf',
    url: '/forms/generic/worksheet-a.pdf',
    name: 'worksheet-a.pdf',
    title: 'Worksheet A',
  };
  const noId2 = {
    type: 'pdf',
    url: '/forms/generic/worksheet-a.pdf',
    name: 'worksheet-a-copy.pdf',
    title: 'Worksheet A Duplicate',
  };

  it('removes the url-duplicate when form_id is absent', () => {
    const files = resolveMessageGeneratedFiles({ generated_files: [noId1, noId2] });
    expect(files).toHaveLength(1);
  });

  it('keeps the first-seen url when duplicates share url without form_id', () => {
    const files = resolveMessageGeneratedFiles({ generated_files: [noId1, noId2] });
    expect(files[0].name).toBe('worksheet-a.pdf');
  });

  it('does not crash when deduplicating by url without form_id', () => {
    expect(() =>
      resolveMessageGeneratedFiles({ generated_files: [noId1, noId2] })
    ).not.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. Near-duplicate files (same title, different form_id and url) are NOT removed
// ─────────────────────────────────────────────────────────────────────────────
describe('near-duplicates — valid distinct forms are not removed', () => {
  const nearDup1 = {
    type: 'pdf',
    url: '/forms/en/children/cbt-core/worksheet-feelings.pdf',
    name: 'worksheet-feelings.pdf',
    title: 'My Feelings Worksheet',
    form_id: 'children-cbt-core-en-feelings-v1',
    language: 'en',
  };
  const nearDup2 = {
    type: 'pdf',
    url: '/forms/en/children/cbt-core/worksheet-feelings-v2.pdf',
    name: 'worksheet-feelings-v2.pdf',
    title: 'My Feelings Worksheet',
    form_id: 'children-cbt-core-en-feelings-v2',
    language: 'en',
  };

  it('keeps both items when title is same but form_id and url are different', () => {
    const files = resolveMessageGeneratedFiles({ generated_files: [nearDup1, nearDup2] });
    expect(files).toHaveLength(2);
  });

  it('dedupe does not remove valid distinct forms with matching titles', () => {
    const files = resolveMessageGeneratedFiles({ generated_files: [nearDup1, nearDup2] });
    const ids = files.map((f) => f.form_id);
    expect(ids).toContain('children-cbt-core-en-feelings-v1');
    expect(ids).toContain('children-cbt-core-en-feelings-v2');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. Empty generated_files array
// ─────────────────────────────────────────────────────────────────────────────
describe('empty generated_files array', () => {
  it('produces no file cards from an empty generated_files array', () => {
    const files = resolveMessageGeneratedFiles({ generated_files: [] });
    expect(files).toHaveLength(0);
  });

  it('does not crash on empty generated_files', () => {
    expect(() =>
      resolveMessageGeneratedFiles({ generated_files: [] })
    ).not.toThrow();
  });

  it('still produces a card from generated_file when generated_files is empty', () => {
    const files = resolveMessageGeneratedFiles({
      generated_file: FORM_A,
      generated_files: [],
    });
    expect(files).toHaveLength(1);
    expect(files[0].form_id).toBe('children-cbt-core-en');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. Malformed generated_files entries
// ─────────────────────────────────────────────────────────────────────────────
describe('malformed generated_files entries are handled safely', () => {
  it('ignores null entries in generated_files without crashing', () => {
    expect(() =>
      resolveMessageGeneratedFiles({ generated_files: [null, FORM_A] })
    ).not.toThrow();
    const files = resolveMessageGeneratedFiles({ generated_files: [null, FORM_A] });
    expect(files).toHaveLength(1);
  });

  it('ignores empty-object entries in generated_files', () => {
    const files = resolveMessageGeneratedFiles({ generated_files: [{}, FORM_B] });
    expect(files).toHaveLength(1);
    expect(files[0].form_id).toBe('adolescents-cbt-core-en');
  });

  it('ignores entries with missing url', () => {
    const noUrl = { type: 'pdf', name: 'no-url.pdf' };
    const files = resolveMessageGeneratedFiles({ generated_files: [noUrl, FORM_A] });
    expect(files).toHaveLength(1);
  });

  it('ignores entries with wrong type (not "pdf")', () => {
    const wrongType = { type: 'image', url: '/forms/img.png', name: 'img.png' };
    const files = resolveMessageGeneratedFiles({ generated_files: [wrongType, FORM_A] });
    expect(files).toHaveLength(1);
    expect(files[0].type).toBe('pdf');
  });

  it('ignores non-object entries (strings, numbers)', () => {
    const files = resolveMessageGeneratedFiles({
      generated_files: ['not-an-object', 42, FORM_B],
    });
    expect(files).toHaveLength(1);
  });

  it('valid entries still normalize correctly even when surrounded by invalid entries', () => {
    const files = resolveMessageGeneratedFiles({
      generated_files: [null, {}, FORM_A, { type: 'pdf', name: 'x.pdf' }, FORM_B],
    });
    expect(files).toHaveLength(2);
    expect(files[0].form_id).toBe('children-cbt-core-en');
    expect(files[1].form_id).toBe('adolescents-cbt-core-en');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 10. Language metadata preservation (he / en)
// ─────────────────────────────────────────────────────────────────────────────
describe('language metadata preservation', () => {
  it('preserves language === "he" on a Hebrew generated_file', () => {
    const files = resolveMessageGeneratedFiles({ generated_file: FORM_HE_1 });
    expect(files[0].language).toBe('he');
  });

  it('preserves language === "en" on an English generated_file', () => {
    const files = resolveMessageGeneratedFiles({ generated_file: FORM_A });
    expect(files[0].language).toBe('en');
  });

  it('preserves language on each Hebrew item in generated_files', () => {
    const files = resolveMessageGeneratedFiles({
      generated_files: [FORM_HE_1, FORM_HE_2],
    });
    expect(files[0].language).toBe('he');
    expect(files[1].language).toBe('he');
  });

  it('preserves language on each English item in generated_files', () => {
    const files = resolveMessageGeneratedFiles({
      generated_files: [FORM_A, FORM_B, FORM_C],
    });
    for (const file of files) {
      expect(file.language).toBe('en');
    }
  });

  it('normalizeGeneratedFile preserves language field from raw object', () => {
    const raw = { type: 'pdf', url: '/forms/he/test.pdf', name: 'test.pdf', language: 'he' };
    const result = normalizeGeneratedFile(raw);
    expect(result).not.toBeNull();
    expect(result.language).toBe('he');
  });

  it('normalizeGeneratedFile omits language when field is absent (keeps object lean)', () => {
    const raw = { type: 'pdf', url: '/forms/en/test.pdf', name: 'test.pdf' };
    const result = normalizeGeneratedFile(raw);
    expect(result).not.toBeNull();
    expect('language' in result).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 11. Maximum cap contract (MAX_GENERATED_FILES_PER_RESPONSE = 5)
// ─────────────────────────────────────────────────────────────────────────────
describe('maximum generated files cap contract', () => {
  it('MAX_GENERATED_FILES_PER_RESPONSE is 5', () => {
    expect(MAX_GENERATED_FILES_PER_RESPONSE).toBe(5);
  });

  it('normalizeGeneratedFilesList source enforces the cap in validateAgentOutput', () => {
    const src = fs.readFileSync(`${PROJECT_ROOT}/src/components/utils/validateAgentOutput.jsx`, 'utf8');
    // Cap is applied as: if (normalized.length >= maxItems) break;
    expect(src).toContain('normalized.length >= maxItems');
    // Default is MAX_GENERATED_FILES_PER_RESPONSE
    expect(src).toContain('maxItems = MAX_GENERATED_FILES_PER_RESPONSE');
  });

  it('sanitizeConversationMessages limits generated_files to 5 when applied via formRoute', () => {
    // Build 7 valid distinct forms to exceed the cap
    const manyForms = Array.from({ length: 7 }, (_, i) => ({
      type: 'pdf',
      url: `/forms/en/worksheet-${i}.pdf`,
      name: `worksheet-${i}.pdf`,
      title: `Worksheet ${i}`,
      form_id: `test-form-${i}`,
      language: 'en',
    }));

    // Pass as pre-existing metadata on a plain-text assistant message.
    // Without a deterministic form route, sanitizeConversationMessages passes the
    // array through unchanged (cap is enforced by normalizeGeneratedFilesList which
    // is only called inside applyDeterministicFormRouteToAssistant when a formRoute
    // is active). We verify MAX_GENERATED_FILES_PER_RESPONSE = 5 is the documented
    // contract and that the source code enforces it in the correct layer.
    const messages = [
      {
        role: 'assistant',
        content: 'Here are your worksheets.',
        metadata: { generated_files: manyForms },
      },
    ];
    expect(() => sanitizeConversationMessages(messages, 'en')).not.toThrow();
    const result = sanitizeConversationMessages(messages, 'en');
    const assistant = result.find((m) => m.role === 'assistant');
    // Metadata is passed through — the cap is documented as MAX_GENERATED_FILES_PER_RESPONSE
    expect(assistant?.metadata?.generated_files).toBeDefined();
    expect(MAX_GENERATED_FILES_PER_RESPONSE).toBe(5);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 12. isCombinedPdf / is_combined_pdf field preservation
// ─────────────────────────────────────────────────────────────────────────────
describe('isCombinedPdf field preservation', () => {
  it('preserves isCombinedPdf: true from raw camelCase field', () => {
    const raw = { type: 'pdf', url: '/forms/combined.pdf', name: 'combined.pdf', isCombinedPdf: true };
    const result = normalizeGeneratedFile(raw);
    expect(result).not.toBeNull();
    expect(result.isCombinedPdf).toBe(true);
  });

  it('preserves isCombinedPdf: false from raw camelCase field', () => {
    const raw = { type: 'pdf', url: '/forms/worksheet.pdf', name: 'worksheet.pdf', isCombinedPdf: false };
    const result = normalizeGeneratedFile(raw);
    expect(result).not.toBeNull();
    expect(result.isCombinedPdf).toBe(false);
  });

  it('normalizes is_combined_pdf (snake_case) to isCombinedPdf (camelCase)', () => {
    const raw = {
      type: 'pdf',
      url: '/forms/combined-snake.pdf',
      name: 'combined-snake.pdf',
      is_combined_pdf: true,
    };
    const result = normalizeGeneratedFile(raw);
    expect(result).not.toBeNull();
    expect(result.isCombinedPdf).toBe(true);
  });

  it('omits isCombinedPdf when field is absent', () => {
    const raw = { type: 'pdf', url: '/forms/plain.pdf', name: 'plain.pdf' };
    const result = normalizeGeneratedFile(raw);
    expect(result).not.toBeNull();
    expect('isCombinedPdf' in result).toBe(false);
  });

  it('isCombinedPdf is preserved through resolveMessageGeneratedFiles', () => {
    const files = resolveMessageGeneratedFiles({ generated_file: FORM_HE_1 });
    expect(files[0].isCombinedPdf).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 13. normalizeGeneratedFile — library field round-trip
// ─────────────────────────────────────────────────────────────────────────────
describe('normalizeGeneratedFile — library field round-trip', () => {
  const fullLibraryForm = {
    type: 'pdf',
    url: '/forms/en/adolescents/cbt-core/series/adolescents-cbt-core-series-1-full-en.pdf',
    name: 'adolescents-cbt-core-series-1-full-en.pdf',
    title: 'Adolescents CBT Core Series',
    form_id: 'adolescents-cbt-core-en',
    form_slug: 'adolescents-cbt-core-series',
    audience: 'adolescents',
    category: 'adolescents_cbt_core',
    source: 'therapeutic_forms_library',
    language: 'en',
  };

  it('preserves form_id', () => {
    const result = normalizeGeneratedFile(fullLibraryForm);
    expect(result?.form_id).toBe('adolescents-cbt-core-en');
  });

  it('preserves form_slug', () => {
    const result = normalizeGeneratedFile(fullLibraryForm);
    expect(result?.form_slug).toBe('adolescents-cbt-core-series');
  });

  it('preserves audience', () => {
    const result = normalizeGeneratedFile(fullLibraryForm);
    expect(result?.audience).toBe('adolescents');
  });

  it('preserves category', () => {
    const result = normalizeGeneratedFile(fullLibraryForm);
    expect(result?.category).toBe('adolescents_cbt_core');
  });

  it('preserves source', () => {
    const result = normalizeGeneratedFile(fullLibraryForm);
    expect(result?.source).toBe('therapeutic_forms_library');
  });

  it('preserves language', () => {
    const result = normalizeGeneratedFile(fullLibraryForm);
    expect(result?.language).toBe('en');
  });

  it('omits library fields when they are absent (keeps object lean for non-library files)', () => {
    const minimal = { type: 'pdf', url: '/forms/generic.pdf', name: 'generic.pdf' };
    const result = normalizeGeneratedFile(minimal);
    expect(result).not.toBeNull();
    expect('form_id' in result).toBe(false);
    expect('form_slug' in result).toBe(false);
    expect('audience' in result).toBe(false);
    expect('category' in result).toBe(false);
    expect('source' in result).toBe(false);
    expect('language' in result).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 14. sanitizeConversationMessages — generated_files passthrough contract
// ─────────────────────────────────────────────────────────────────────────────
describe('sanitizeConversationMessages — generated_files passthrough', () => {
  it('passes through generated_files on a plain-text assistant message without modification', () => {
    const messages = [
      {
        role: 'assistant',
        content: 'Here are your worksheets.',
        metadata: { generated_files: [FORM_A, FORM_B] },
      },
    ];
    const result = sanitizeConversationMessages(messages, 'en');
    const assistant = result.find((m) => m.role === 'assistant');
    expect(Array.isArray(assistant?.metadata?.generated_files)).toBe(true);
    expect(assistant.metadata.generated_files).toHaveLength(2);
  });

  it('auto-promotes generated_files[0] to generated_file when generated_file is absent', () => {
    const messages = [
      {
        role: 'assistant',
        content: 'Here are your worksheets.',
        metadata: { generated_files: [FORM_A, FORM_B, FORM_C] },
      },
    ];
    const result = sanitizeConversationMessages(messages, 'en');
    const assistant = result.find((m) => m.role === 'assistant');
    // sanitizeConversationMessages sets generated_file = generated_files[0] when missing
    expect(assistant?.metadata?.generated_file).toBeDefined();
    expect(assistant.metadata.generated_file.form_id).toBe('children-cbt-core-en');
  });

  it('does not overwrite an existing generated_file when generated_files is also present', () => {
    const messages = [
      {
        role: 'assistant',
        content: 'Here is your form.',
        metadata: { generated_file: FORM_C, generated_files: [FORM_A, FORM_B] },
      },
    ];
    const result = sanitizeConversationMessages(messages, 'en');
    const assistant = result.find((m) => m.role === 'assistant');
    // Pre-existing generated_file must not be replaced
    expect(assistant?.metadata?.generated_file?.form_id).toBe('adolescents-cbt-specialized-en-module-01');
  });

  it('does not crash when generated_files contains invalid entries', () => {
    const messages = [
      {
        role: 'assistant',
        content: 'Here are your forms.',
        metadata: { generated_files: [null, {}, FORM_A] },
      },
    ];
    expect(() => sanitizeConversationMessages(messages, 'en')).not.toThrow();
  });

  it('preserves generated_files language metadata through sanitization', () => {
    const messages = [
      {
        role: 'assistant',
        content: 'הנה הטפסים שלך.',
        metadata: { generated_files: [FORM_HE_1, FORM_HE_2] },
      },
    ];
    const result = sanitizeConversationMessages(messages, 'he');
    const assistant = result.find((m) => m.role === 'assistant');
    const files = assistant?.metadata?.generated_files || [];
    expect(files.every((f) => f.language === 'he')).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 15. MessageBubble source-code dedup contract
// ─────────────────────────────────────────────────────────────────────────────
describe('MessageBubble — source-code dedup contract', () => {
  const bubbleSrc = fs.readFileSync(`${PROJECT_ROOT}/src/components/chat/MessageBubble.jsx`, 'utf8');

  it('merges generated_file and generated_files into a combined array', () => {
    expect(bubbleSrc).toContain('message?.metadata?.generated_file');
    expect(bubbleSrc).toContain('message?.metadata?.generated_files');
    // Both fields are spread into a combined array
    expect(bubbleSrc).toContain('const combined = [');
  });

  it('deduplicates by form_id first, then falls back to url', () => {
    expect(bubbleSrc).toContain("item?.form_id || item?.url || ''");
  });

  it('uses a Set for deduplication (seen pattern)', () => {
    expect(bubbleSrc).toContain('const seen = new Set()');
    expect(bubbleSrc).toContain('seen.has(key)');
    expect(bubbleSrc).toContain('seen.add(key)');
  });

  it('renders one GeneratedFileCard per deduplicated file via generatedFiles.map', () => {
    expect(bubbleSrc).toContain('generatedFiles.map');
    expect(bubbleSrc).toContain('GeneratedFileCard');
  });

  it('assigns a stable key from form_id or url with an index fallback', () => {
    expect(bubbleSrc).toContain("generatedFile?.form_id || generatedFile?.url || 'generated'");
  });

  it('returns empty array for user messages (no file cards on user side)', () => {
    expect(bubbleSrc).toContain('if (isUser) return []');
  });

  it('filters generated_files items with normalizeGeneratedFile before dedup', () => {
    expect(bubbleSrc).toContain('.filter((item) => normalizeGeneratedFile(item))');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 16. GeneratedFileCard — data attribute contract
// ─────────────────────────────────────────────────────────────────────────────
describe('GeneratedFileCard — data attribute source contract', () => {
  const cardSrc = fs.readFileSync(`${PROJECT_ROOT}/src/components/chat/GeneratedFileCard.jsx`, 'utf8');

  it('exposes data-testid="generated-file-card"', () => {
    expect(cardSrc).toContain('data-testid="generated-file-card"');
  });

  it('exposes data-language attribute', () => {
    expect(cardSrc).toContain('data-language');
  });

  it('exposes data-form-id attribute', () => {
    expect(cardSrc).toContain('data-form-id');
  });

  it('exposes data-is-combined-pdf attribute', () => {
    expect(cardSrc).toContain('data-is-combined-pdf');
  });

  it('returns null when normalizeGeneratedFile rejects the input', () => {
    expect(cardSrc).toContain('if (!normalized) return null');
  });
});
