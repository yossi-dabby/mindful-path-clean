import { describe, it, expect } from 'vitest';
import { ALL_FORMS } from '../../src/data/therapeuticForms/index.js';
import { resolveFormIntent } from '../../src/utils/resolveFormIntent.js';

describe('therapeuticFormsSpanishWorkbooks.test.js — zero installed forms', () => {
  it('keeps Spanish forms absent from the canonical registry', () => {
    expect(ALL_FORMS.filter((form) => form.language === 'es')).toHaveLength(0);
  });

  it('does not resolve stale therapeutic form ids', () => {
    expect(resolveFormIntent('tf-adults-cbt-thought-record', 'en')).toBeNull();
    expect(resolveFormIntent('tf-children-cbt-stage-2-2-premium-he', 'he')).toBeNull();
  });

  it('has no active Spanish PDF URLs in the canonical registry', () => {
    const spanishPdfUrls = ALL_FORMS
      .flatMap((form) => Object.values(form.languages || {}))
      .map((langBlock) => String(langBlock?.file_url || ''))
      .filter((url) => /\/forms\/es\/.+\.pdf$/i.test(url));
    expect(spanishPdfUrls).toHaveLength(0);
  });
});
