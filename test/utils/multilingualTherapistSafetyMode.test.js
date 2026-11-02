import { describe, expect, it } from 'vitest';
import {
  evaluateRuntimeSafetyMode,
  SAFETY_TRIGGER_CATEGORIES,
} from '../../src/lib/therapistSafetyMode.js';

const LANGUAGES = [
  {
    language: 'Spanish',
    severe: 'Siento que nada va a mejorar.',
    shutdown: 'Me estoy derrumbando.',
    catastrophic: 'Todo está arruinado.',
    distress: 'Estoy abrumado.',
    ordinary: 'Estoy preocupado por la reunión de mañana.',
  },
  {
    language: 'French',
    severe: 'Je ne vois pas d’issue.',
    shutdown: 'Je m’effondre.',
    catastrophic: 'Tout est ruiné.',
    distress: 'Je suis submergé.',
    ordinary: 'Je suis inquiet pour la réunion de demain.',
  },
  {
    language: 'German',
    severe: 'Ich sehe keinen Ausweg.',
    shutdown: 'Ich breche zusammen.',
    catastrophic: 'Alles ist ruiniert.',
    distress: 'Ich bin überwältigt.',
    ordinary: 'Ich mache mir Sorgen wegen der Besprechung morgen.',
  },
  {
    language: 'Italian',
    severe: 'Non vedo una via d’uscita.',
    shutdown: 'Sto crollando.',
    catastrophic: 'Tutto è rovinato.',
    distress: 'Sono sopraffatto.',
    ordinary: 'Sono preoccupato per la riunione di domani.',
  },
  {
    language: 'Portuguese',
    severe: 'Não vejo uma saída.',
    shutdown: 'Estou desmoronando.',
    catastrophic: 'Tudo está arruinado.',
    distress: 'Estou sobrecarregado.',
    ordinary: 'Estou preocupado com a reunião de amanhã.',
  },
];

const POSITIVE_CASES = LANGUAGES.flatMap((entry) => [
  {
    language: entry.language,
    label: 'severe hopelessness',
    message: entry.severe,
    category: SAFETY_TRIGGER_CATEGORIES.SEVERE_HOPELESSNESS,
  },
  {
    language: entry.language,
    label: 'shutdown or breakdown',
    message: entry.shutdown,
    category: SAFETY_TRIGGER_CATEGORIES.SHUTDOWN_BREAKDOWN,
  },
  {
    language: entry.language,
    label: 'catastrophic language',
    message: entry.catastrophic,
    category: SAFETY_TRIGGER_CATEGORIES.CATASTROPHIC_LANGUAGE,
  },
  {
    language: entry.language,
    label: 'high distress',
    message: entry.distress,
    category: SAFETY_TRIGGER_CATEGORIES.HIGH_DISTRESS,
  },
]);

describe('multilingual therapist safety-mode parity', () => {
  it.each(POSITIVE_CASES)('detects $label in $language', ({ message, category }) => {
    expect(evaluateRuntimeSafetyMode(message)).toEqual({
      safety_mode: true,
      trigger: category,
      category,
      pattern_match: true,
    });
  });

  it.each(LANGUAGES)('does not activate for ordinary worry in $language', ({ ordinary }) => {
    expect(evaluateRuntimeSafetyMode(ordinary)).toEqual({
      safety_mode: false,
      trigger: null,
      category: null,
      pattern_match: false,
    });
  });
});
