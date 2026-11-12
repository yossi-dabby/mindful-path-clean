import { describe, expect, it } from 'vitest';
import { readinessTranslations } from '../../src/components/i18n/readinessTranslations.js';
import { aiReportPrivacy } from '../../src/components/legal/aiReportPrivacy.js';
import { getLegalCopy } from '../../src/components/legal/legalContent.js';
const languages = ['en', 'he', 'es', 'fr', 'de', 'it', 'pt'];
describe('reporting/retention copy', () => {
  it.each(languages)('provides complete labels, placeholders and public privacy disclosure in %s', language => {
    for (const section of ['ai_report', 'retention_cleanup']) {
      const copy = readinessTranslations[language][section];
      expect(Object.keys(copy).sort()).toEqual(Object.keys(readinessTranslations.en[section]).sort());
      expect(Object.values(copy).every(value => typeof value === 'string' && value.trim().length > 0)).toBe(true);
    }
    const count = readinessTranslations[language].retention_cleanup.counts;
    for (const placeholder of ['{{moods}}', '{{journals}}', '{{conversations}}']) expect(count).toContain(placeholder);
    expect(getLegalCopy(language).privacy.sections.find(section => section.id === 'ai-reporting')).toMatchObject(aiReportPrivacy[language]);
  });
});
