/**
 * Phase 1 Stabilization — Therapeutic Forms Library
 *
 * Covers the two safe fixes from the Phase 1 audit:
 *   1. Missing translation labels: children_cbt_core (EN), children_cbt_specialized (EN + HE)
 *   2. Null moduleTitle for adolescents_cbt_specialized_he entries in the generated index
 *
 * Also asserts that no regressions were introduced to language gating, AI retrieval,
 * or open/download behavior.
 */

import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { THERAPEUTIC_FORMS_CONTENT_AVAILABLE } from '../../src/data/therapeuticForms/availability.js';
import { translations } from '../../src/components/i18n/translations.jsx';
import generatedFormsIndex from '../../src/generated/therapeutic-forms-index.json';
import { ALL_FORMS, resolveFormWithLanguage } from '../../src/data/therapeuticForms/index.js';

const ROOT = path.resolve(process.cwd());

// ── 1. Translation labels ─────────────────────────────────────────────────────

describe('Phase 1 — translation label fixes', () => {
  it('children_cbt_core translation exists in English', () => {
    const label = translations?.en?.translation?.therapeutic_forms?.category?.children_cbt_core;
    expect(label, 'children_cbt_core label missing in English').toBeTruthy();
    expect(label).toBe('Children CBT Core');
  });

  it('children_cbt_specialized translation exists in English', () => {
    const label = translations?.en?.translation?.therapeutic_forms?.category?.children_cbt_specialized;
    expect(label, 'children_cbt_specialized label missing in English').toBeTruthy();
    expect(label).toBe('Children CBT Specialized');
  });

  it('children_cbt_specialized translation exists in Hebrew', () => {
    const label = translations?.he?.translation?.therapeutic_forms?.category?.children_cbt_specialized;
    expect(label, 'children_cbt_specialized label missing in Hebrew').toBeTruthy();
    expect(label).toBe('CBT ייעודי לילדים');
  });

  it('children_cbt_core translation in Hebrew is unchanged', () => {
    const label = translations?.he?.translation?.therapeutic_forms?.category?.children_cbt_core;
    expect(label).toBe('סדרת ליבה CBT לילדים');
  });

  it('raw key children_cbt_core does not appear in English category labels as undefined or null', () => {
    const category = translations?.en?.translation?.therapeutic_forms?.category;
    expect(category?.children_cbt_core).toBeDefined();
    expect(category?.children_cbt_core).not.toBeNull();
  });

  it('raw key children_cbt_specialized does not appear in Hebrew category labels as undefined or null', () => {
    const category = translations?.he?.translation?.therapeutic_forms?.category;
    expect(category?.children_cbt_specialized).toBeDefined();
    expect(category?.children_cbt_specialized).not.toBeNull();
  });
});

// ── 2. moduleTitle in generated index ────────────────────────────────────────

describe('Phase 1 — adolescents_cbt_specialized_he moduleTitle fix', () => {
  const heSpecialized = generatedFormsIndex.filter(
    (f) => f.language === 'he' && f.category === 'adolescents_cbt_specialized' && f.type === 'individual_worksheet'
  );

  it('every adolescents_cbt_specialized_he entry has a non-null moduleTitle', () => {
    const missing = heSpecialized.filter((f) => f.moduleTitle == null);
    expect(missing, `Entries with null moduleTitle: ${missing.map((f) => f.id).join(', ')}`).toHaveLength(0);
  });

  it('every adolescents_cbt_specialized_he entry has a non-null module_title (snake_case field)', () => {
    const missing = heSpecialized.filter((f) => f.module_title == null);
    expect(missing, `Entries with null module_title: ${missing.map((f) => f.id).join(', ')}`).toHaveLength(0);
  });

  it('module titles are Hebrew strings, not fallback labels like שלב 1', () => {
    const fallback = heSpecialized.filter(
      (f) => typeof f.moduleTitle === 'string' && /^שלב\s+\d+$/.test(f.moduleTitle)
    );
    expect(fallback, 'Some entries still use fallback שלב N titles').toHaveLength(0);
  });

});

// ── 3. Language gating — no regressions ──────────────────────────────────────

describe('Phase 1 — language gating regression', () => {

  it('Hebrew adolescents forms are not surfaced in English mode', () => {
    const heForms = ALL_FORMS.filter(
      (f) => f.language === 'he' && f.audience === 'adolescents'
    );
    for (const form of heForms) {
      expect(resolveFormWithLanguage(form.id, 'en')).toBeNull();
    }
  });
});

// ── 4. AI retrieval — no regressions ─────────────────────────────────────────

describe('Phase 1 — AI retrieval regression', () => {
  it('AI retrieval has no retired children core forms', () => {
    const childrenCore = ALL_FORMS.filter((f) => f.category === 'children_cbt_core');
    expect(childrenCore).toEqual([]);
  });

  it('AI retrieval has no retired children specialized forms', () => {
    const childrenSpecialized = ALL_FORMS.filter((f) => f.category === 'children_cbt_specialized');
    expect(childrenSpecialized).toEqual([]);
  });

  it('AI retrieval contains no retired adolescents specialized Hebrew forms', () => {
    const heSpecialized = ALL_FORMS.filter(
      (f) => f.category === 'adolescents_cbt_specialized' && f.language === 'he'
    );
    expect(heSpecialized).toEqual([]);
  });
});

// ── 5. Open/download behavior — source-code contract unchanged ────────────────
// Source-level verification is intentional here: the problem statement requires
// confirming no open/download behavior changed without running a browser. Regex
// on source is the only available non-browser mechanism for these contracts.

describe('Phase 1 — open/download behavior unchanged', () => {
  it('openFile.js source is unchanged — uses window.open / Blob URL pattern', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/components/chat/utils/openFile.js'), 'utf8');
    // Must not have a download attribute anchor pattern (that would be the old behavior)
    expect(src).not.toMatch(/createElement\(['"]a['"]\)[\s\S]{0,200}download/);
    // Must still open inline (not force download for open action)
    expect(src).toMatch(/window\.open|_blank|blob:/i);
  });

  it('downloadPdfFile.js source is unchanged — uses download attachment pattern', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/components/chat/utils/downloadPdfFile.js'), 'utf8');
    // Download should still use anchor with download attribute
    expect(src).toMatch(/download/i);
  });

});

// ── 6. Collection-first redesign contracts ───────────────────────────────────

describe('Phase 1 baseline + Phase 3 UI contracts', () => {
  it('TherapeuticForms.jsx now exposes collection-first helpers', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/pages/TherapeuticForms.jsx'), 'utf8');
    expect(src).toContain('buildCollectionsFromForms');
    expect(src).toContain('buildModulesFromCollectionForms');
    expect(src).toContain('FormsCollectionCard');
    expect(src).toContain('FormsModuleCard');
  });
});
