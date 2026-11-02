import { describe, expect, it } from 'vitest';
import { SUPPORTED_APP_LOCALES } from '../../src/components/i18n/appLocale.js';
import { HUMAN_SUPPORT_COPY, HUMAN_SUPPORT_DIRECTORY_BY_REGION, HUMAN_SUPPORT_DIRECTORY_VERSION, HUMAN_SUPPORT_REGION_LABELS, SUPPORTED_HUMAN_SUPPORT_REGIONS, getHumanSupportCopy, getHumanSupportRegionOptions, getHumanSupportResources, hasCompleteHumanSupportTranslations } from '../../src/lib/humanSupportDirectory.js';

describe('humanSupportDirectory', () => {
  it('covers every configured app language with complete UI and country labels', () => {
    expect(hasCompleteHumanSupportTranslations()).toBe(true);
    expect(Object.keys(HUMAN_SUPPORT_COPY).sort()).toEqual([...SUPPORTED_APP_LOCALES].sort());
    expect(Object.keys(HUMAN_SUPPORT_REGION_LABELS).sort()).toEqual([...SUPPORTED_APP_LOCALES].sort());
    const requiredCopyKeys = Object.keys(HUMAN_SUPPORT_COPY.en).sort();
    for (const locale of SUPPORTED_APP_LOCALES) {
      const copy = getHumanSupportCopy(locale);
      expect(Object.keys(copy).sort()).toEqual(requiredCopyKeys);
      expect(Object.keys(HUMAN_SUPPORT_REGION_LABELS[locale])).toEqual(SUPPORTED_HUMAN_SUPPORT_REGIONS);
      expect(copy.buttonLabel).toBeTruthy(); expect(copy.countryPrompt).toBeTruthy(); expect(copy.immediateTitle).toBeTruthy(); expect(copy.disclaimer).toBeTruthy();
      expect(getHumanSupportRegionOptions(locale)).toHaveLength(SUPPORTED_HUMAN_SUPPORT_REGIONS.length);
      expect(getHumanSupportRegionOptions(locale).every((option) => option.label)).toBe(true);
    }
  });

  it('keeps every supported region auditable with immediate and urgent options', () => {
    expect(HUMAN_SUPPORT_DIRECTORY_VERSION).toBe('2026-09-06.2');
    expect(Object.keys(HUMAN_SUPPORT_DIRECTORY_BY_REGION)).toEqual(SUPPORTED_HUMAN_SUPPORT_REGIONS);
    for (const region of SUPPORTED_HUMAN_SUPPORT_REGIONS) {
      expect(getHumanSupportResources(region, 'immediate').length).toBeGreaterThan(0);
      expect(getHumanSupportResources(region, 'urgent_support').length).toBeGreaterThan(0);
      for (const resource of getHumanSupportResources(region)) {
        expect(resource.country).toBe(region); expect(['immediate', 'urgent_support', 'non_emergency']).toContain(resource.urgency);
        expect(resource.lastVerifiedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/); expect(resource.verificationOwner).toBeTruthy(); expect(resource.sourceUrl).toMatch(/^https:\/\//); expect(resource.channels.length).toBeGreaterThan(0);
      }
    }
  });

  it('does not infer a country from the display language', () => { expect(getHumanSupportResources('he')).toEqual([]); expect(getHumanSupportResources('en-US')).toEqual([]); expect(getHumanSupportCopy('pt-BR')).toBe(HUMAN_SUPPORT_COPY.pt); });
  it('retains the verified national crisis numbers', () => { const labels = Object.values(HUMAN_SUPPORT_DIRECTORY_BY_REGION).flatMap((resources) => resources.flatMap((resource) => resource.channels.map((channel) => channel.label))); for (const expected of ['911', '988', '100', '101', '1201', '112', '024', '3114', '116 123', '02 2327 2327', '808 24 24 24']) expect(labels).toContain(expected); });
});
