import { describe, expect, it } from 'vitest';
import { chatUiByLanguage } from '../../src/components/i18n/chatUiTranslations.js';

const languages = ['en', 'he', 'es', 'fr', 'de', 'it', 'pt'];
const requiredKeys = [
  'common.back', 'common.delete',
  'chat.therapist_title', 'chat.therapist_subtitle',
  'chat.welcome.title', 'chat.welcome.message', 'chat.welcome.start_session',
  'chat.conversations_list.select_all', 'chat.conversations_list.selected_count',
  'chat.conversations_list.bulk_delete_title_other',
  'chat.proactive.title', 'chat.proactive.mood_message', 'chat.proactive.goal_message',
  'chat.entry.question', 'chat.entry.option_1', 'chat.entry.option_5',
  'chat.flow.prompt_1', 'chat.flow.prompt_5', 'chat.flow.grounding_1',
  'chat.flow.fallback_1', 'chat.flow.entry_saved',
  'chat.errors.voice_unavailable_title', 'chat.errors.file_upload_desc',
  'chat.generated_file.download_error_title', 'chat.document.view',
  'age_gate.message', 'age_gate.teen_support.counselor', 'age_gate.teen_support.teen_line'
];

const read = (object, path) => path.split('.').reduce((value, key) => value?.[key], object);

describe('chat UI translations', () => {
  it.each(languages)('defines every active chat key for %s', (language) => {
    requiredKeys.forEach((key) => {
      const value = read(chatUiByLanguage[language], key);
      expect(typeof value, `${language}:${key}`).toBe('string');
      expect(value.trim().length, `${language}:${key}`).toBeGreaterThan(1);
    });
  });

  it('does not show US-only emergency numbers in the age gate', () => {
    languages.forEach((language) => {
      const ageGate = JSON.stringify(chatUiByLanguage[language].age_gate);
      expect(ageGate).not.toMatch(/\b988\b|741741|Teen Line/i);
    });
  });
});
