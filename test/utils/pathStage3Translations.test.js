import { it, expect } from 'vitest';
import { translations } from '../../src/components/i18n/translations.jsx';

it('provides every goal-calendar, board and reminder label and interpolation in all seven languages', () => {
  const english = translations.en.translation.path_ui;
  for (const language of ['en', 'he', 'es', 'fr', 'de', 'it', 'pt']) {
    const copy = translations[language].translation.path_ui;
    expect(Object.keys(copy).sort()).toEqual(Object.keys(english).sort());
    for (const key of Object.keys(english)) {
      expect(copy[key].trim()).not.toBe('');
      expect(copy[key].match(/{{\w+}}/g)).toEqual(english[key].match(/{{\w+}}/g));
    }
  }
});
