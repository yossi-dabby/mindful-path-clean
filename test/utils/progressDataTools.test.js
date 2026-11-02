import { describe, expect, it } from 'vitest';
import { SUPPORTED_APP_LOCALES } from '../../src/components/i18n/appLocale.js';
import {
  PROGRESS_DATA_COPY,
  WELLBEING_OUTCOME_STORAGE_KEY,
  appendWellbeingOutcome,
  buildLocalProgressExport,
  clearWellbeingOutcomes,
  createWellbeingOutcome,
  getProgressDataCopy,
  hasCompleteProgressDataTranslations,
  readWellbeingOutcomes,
  summarizeWellbeingOutcomes
} from '../../src/lib/progressDataTools.js';

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key)
  };
}

describe('progressDataTools', () => {
  it('has complete copy parity for every configured app locale', () => {
    expect(Object.keys(PROGRESS_DATA_COPY).sort()).toEqual([...SUPPORTED_APP_LOCALES].sort());
    expect(hasCompleteProgressDataTranslations()).toBe(true);
    const keys = Object.keys(PROGRESS_DATA_COPY.en).sort();
    for (const locale of SUPPORTED_APP_LOCALES) {
      expect(Object.keys(getProgressDataCopy(locale)).sort()).toEqual(keys);
      expect(getProgressDataCopy(locale).outcomeDisclaimer).toBeTruthy();
      expect(getProgressDataCopy(locale).exportConsent).toBeTruthy();
    }
    expect(getProgressDataCopy('pt-BR')).toBe(PROGRESS_DATA_COPY.pt);
  });

  it('stores bounded, device-local outcome records and clears them', () => {
    const storage = memoryStorage();
    expect(appendWellbeingOutcome({ wellbeing: 12, distress: -2, functioning: 6, recordedAt: '2026-09-01T10:00:00.000Z' }, storage)).toBe(true);
    const records = readWellbeingOutcomes(storage);
    expect(records).toEqual([{
      version: '2026-09-06.1',
      recordedAt: '2026-09-01T10:00:00.000Z',
      wellbeing: 10,
      distress: 0,
      functioning: 6
    }]);
    expect(storage.getItem(WELLBEING_OUTCOME_STORAGE_KEY)).toBeTruthy();
    expect(clearWellbeingOutcomes(storage)).toBe(true);
    expect(readWellbeingOutcomes(storage)).toEqual([]);
  });

  it('calculates transparent first-to-latest deltas without efficacy claims', () => {
    const entries = [
      createWellbeingOutcome({ wellbeing: 4, distress: 8, functioning: 3, recordedAt: '2026-09-01T10:00:00.000Z' }),
      createWellbeingOutcome({ wellbeing: 7, distress: 5, functioning: 6, recordedAt: '2026-09-06T10:00:00.000Z' })
    ];
    expect(summarizeWellbeingOutcomes(entries)).toMatchObject({
      count: 2,
      hasTrend: true,
      wellbeingDelta: 3,
      distressDelta: -3,
      functioningDelta: 3
    });
  });

  it('exports a de-identified summary and excludes narrative by default', () => {
    const payload = buildLocalProgressExport({
      locale: 'he-IL',
      exportedAt: '2026-09-06T12:00:00.000Z',
      moodEntries: [{ id: 'm1', date: '2026-09-06', mood: 'good', created_by: 'private@example.com' }],
      journalEntries: [{
        id: 'j1',
        entry_type: 'custom',
        situation: 'private situation',
        automatic_thoughts: 'private thought',
        emotion_ratings: { anxiety: 8 },
        custom_fields: { conversation_id: 'secret-conversation', experiment_type: 'behavioral_experiment', belief_after: 4 }
      }],
      goals: [{ id: 'g1', title: 'Walk', status: 'active', created_by: 'private@example.com' }],
      exercises: [{ id: 'e1', title: 'Breathing', completed_count: 2 }],
      outcomeEntries: [{ version: 'v', recordedAt: '2026-09-06T10:00:00.000Z', wellbeing: 6, distress: 4, functioning: 7 }]
    });

    expect(payload.locale).toBe('he');
    expect(payload.privacy).toEqual({
      accountIdentifierIncluded: false,
      narrativeIncluded: false,
      createdLocallyByUser: true
    });
    expect(payload.clinicalStatus).toEqual({
      diagnostic: false,
      validatedOutcomeInstrument: false,
      efficacyClaim: false
    });
    expect(payload.data.journals[0]).not.toHaveProperty('situation');
    expect(payload.data.journals[0]).not.toHaveProperty('automatic_thoughts');
    expect(payload.data.journals[0]).not.toHaveProperty('custom_fields');
    expect(payload.data.journals[0].experimentMetrics).toEqual({ experiment_type: 'behavioral_experiment', belief_after: 4 });
    expect(JSON.stringify(payload)).not.toContain('private@example.com');
    expect(JSON.stringify(payload)).not.toContain('secret-conversation');
  });

  it('includes only allowlisted narrative fields after explicit opt-in', () => {
    const payload = buildLocalProgressExport({
      includeNarrative: true,
      journalEntries: [{ situation: 'chosen text', automatic_thoughts: 'thought', dangerous_internal: 'never export' }]
    });
    expect(payload.privacy.narrativeIncluded).toBe(true);
    expect(payload.data.journals[0]).toMatchObject({ situation: 'chosen text', automatic_thoughts: 'thought' });
    expect(payload.data.journals[0]).not.toHaveProperty('dangerous_internal');
  });
});
