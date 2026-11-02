import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { chatUiByLanguage } from '../../src/components/i18n/chatUiTranslations.js';
import { MAX_CHAT_ATTACHMENT_BYTES, validateChatAttachment } from '../../src/components/chat/utils/fileValidation.js';

describe('Chat conversation tools and attachment validation', () => {
  it('provides conversation tools in every supported language', () => {
    for (const language of ['en', 'he', 'es', 'fr', 'de', 'it', 'pt']) {
      const list = chatUiByLanguage[language].chat.conversations_list;
      const errors = chatUiByLanguage[language].chat.errors;
      for (const key of ['search_placeholder', 'no_search_results', 'rename_aria', 'pin_aria', 'unpin_aria', 'actions_aria', 'pinned_label', 'rename_placeholder', 'save_name']) {
        expect(list[key], `${language}.${key}`).toEqual(expect.any(String));
      }
      for (const key of ['file_too_large_title', 'file_too_large_desc', 'unsupported_file_title', 'unsupported_file_desc']) {
        expect(errors[key], `${language}.${key}`).toEqual(expect.any(String));
      }
    }
  });

  it('accepts supported documents and images', () => {
    expect(validateChatAttachment({ name: 'notes.pdf', type: 'application/pdf', size: 100 }).valid).toBe(true);
    expect(validateChatAttachment({ name: 'photo.jpg', type: 'image/jpeg', size: 100 }).valid).toBe(true);
    expect(validateChatAttachment({ name: 'data.csv', type: '', size: 100 }).valid).toBe(true);
  });

  it('rejects unsupported and oversized files', () => {
    expect(validateChatAttachment({ name: 'app.exe', type: 'application/octet-stream', size: 100 }).reason).toBe('unsupported');
    expect(validateChatAttachment({ name: 'large.pdf', type: 'application/pdf', size: MAX_CHAT_ATTACHMENT_BYTES + 1 }).reason).toBe('too_large');
  });

  it('persists owner-scoped pin preferences and exposes search/rename controls', () => {
    const entity = readFileSync('base44/entities/Conversation.jsonc', 'utf8');
    const list = readFileSync('src/components/chat/ConversationsList.jsx', 'utf8');
    expect(entity).toContain('"is_pinned"');
    expect(entity).toContain('"created_by": "{{user.email}}"');
    expect(list).toContain('type="search"');
    expect(list).toContain('onRenameConversation');
    expect(list).toContain('onTogglePinConversation');
  });
});
