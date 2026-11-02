import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {stage6UiCopy} from '../../src/components/i18n/stage6UiTranslations.js';
import {
  LEGAL_CONSENT_VERSION,
  LEGAL_EFFECTIVE_DATE,
  getLegalCopy,
} from '../../src/components/legal/legalContent.js';
import {
  hasCurrentChatConsent,
  persistCurrentChatConsent,
  resolveCurrentChatConsent,
} from '../../src/lib/chatConsent.js';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const parseJsonc = (path) => JSON.parse(read(path));

function createStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
  };
}

describe('Stage A privacy, consent, and lifecycle contracts', () => {
  it('publishes matching Hebrew and English legal documents with a versioned consent', () => {
    expect(LEGAL_EFFECTIVE_DATE).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(LEGAL_CONSENT_VERSION).toBe(LEGAL_EFFECTIVE_DATE);

    const english = getLegalCopy('en');
    const hebrew = getLegalCopy('he');
    expect(english.direction).toBe('ltr');
    expect(hebrew.direction).toBe('rtl');
    expect(english.privacy.sections.length).toBeGreaterThanOrEqual(8);
    expect(hebrew.privacy.sections.length).toBe(english.privacy.sections.length);
    expect(english.terms.sections.length).toBeGreaterThanOrEqual(8);
    expect(hebrew.terms.sections.length).toBe(english.terms.sections.length);
    expect(`${english.consent.aiTitle} ${english.consent.aiBody}`).toMatch(/AI/i);
    expect(hebrew.consent.crisisBody).toBeTruthy();
  });

  it('keeps public legal and information pages outside the authenticated app', () => {
    const source = read('src/App.jsx');
    const protectedAppIndex = source.indexOf('<Route path="/*" element={<ProtectedApp />} />');

    expect(protectedAppIndex).toBeGreaterThan(-1);
    for (const publicRoute of [
      '<Route path="/about" element={<About />} />',
      '<Route path="/privacy" element={<Privacy />} />',
      '<Route path="/terms" element={<Terms />} />',
      '<Route path="/contact" element={<Contact />} />',
      '<Route path="/account-deletion" element={<AccountDeletion />} />',
      '<Route path="/data-deletion" element={<AccountDeletion defaultSection="data" />} />',
    ]) {
      const routeIndex = source.indexOf(publicRoute);
      expect(routeIndex, publicRoute).toBeGreaterThan(-1);
      expect(routeIndex, publicRoute).toBeLessThan(protectedAppIndex);
    }
  });

  it('publishes clear public instructions for deleting selected data without closing the account', () => {
    const source = read('src/pages/AccountDeletion.jsx');
    expect(source).toContain('Mindful Path partial data deletion request');
    expect(source).toContain('<PartialDataDeletion/>');
    expect(source).toContain("defaultSection==='data'");
    expect(stage6UiCopy.en.selected_data_title).toBe('Delete selected data without deleting your account');
    expect(stage6UiCopy.en.selected_data_intro).toContain('keeping your Mindful Path account active');
    expect(stage6UiCopy.en.selected_data_result).toContain('Residual encrypted backups may take up to 90 days');
    for(const copy of Object.values(stage6UiCopy)) {
      expect(copy.selected_data_result).toContain('90');
      expect(copy.partial_email).toContain('Mindful Path partial data deletion request');
      expect(copy.retention_body).toContain('90');
    }
  });

  it('accepts only the current consent version', () => {
    const storage = createStorage();
    expect(hasCurrentChatConsent(storage, 'user-a')).toBe(false);
    persistCurrentChatConsent(storage, 'user-a');
    expect(hasCurrentChatConsent(storage, 'user-a')).toBe(true);
    expect(hasCurrentChatConsent(storage, 'user-b')).toBe(false);
    storage.setItem('chat_consent_version', 'older-version');
    expect(hasCurrentChatConsent(storage, 'user-a')).toBe(false);
  });

  it('restores server-confirmed consent only for the current owner', async () => {
    const storage = createStorage();
    const client = {
      auth: { me: async () => ({ id: 'user-a' }) },
      entities: {
        ConsentRecord: {
          filter: async () => [{ version: LEGAL_CONSENT_VERSION }],
        },
      },
    };

    await expect(resolveCurrentChatConsent(client, storage)).resolves.toBe(true);
    expect(hasCurrentChatConsent(storage, 'user-a')).toBe(true);
    expect(hasCurrentChatConsent(storage, 'user-b')).toBe(false);
  });

  it('enforces versioned consent on every AI surface', () => {
    for (const path of [
      'src/pages/Chat.jsx',
      'src/components/coaching/CoachingChat.jsx',
      'src/components/ai/DraggableAiCompanion.jsx',
    ]) {
      const source = read(path);
      expect(source).toContain('resolveCurrentChatConsent');
      expect(source).toContain('isConsentResolved');
    }

    const banner = read('src/components/chat/InlineConsentBanner.jsx');
    expect(banner).toContain('await base44.entities.ConsentRecord.create');
    expect(banner).toContain('persistCurrentChatConsent(undefined, currentUserId)');
    expect(banner).toContain("t('consent.save_error')");
    expect(banner).toContain('to="/terms"');
    expect(banner).toContain('to="/privacy"');
    expect(banner).not.toMatch(/ip_address|device_id|message_content/);
  });

  it('keeps consent records owner-readable, immutable, and owner-deletable', () => {
    const schema = parseJsonc('base44/entities/ConsentRecord.jsonc');
    expect(schema.rls.create).toBe(true);
    expect(schema.rls.read.created_by).toBe('{{user.email}}');
    expect(schema.rls.update).toBe(false);
    expect(schema.rls.delete.created_by).toBe('{{user.email}}');
    expect(schema.required).toContain('version');
    expect(schema.required).toContain('accepted_at');
  });

  it('exports through an authenticated server function without internal AI fields', () => {
    const backend = read('base44/functions/exportMyData/entry.ts');
    const frontend = read('src/components/settings/DataPrivacy.jsx');
    expect(backend).toContain('await base44.auth.me()');
    expect(backend).toContain('{ created_by: email }');
    expect(backend).toContain('getConversations()');
    expect(backend).toContain('sanitizeMessage');
    expect(backend).not.toContain('reasoning: message.reasoning');
    expect(backend).not.toContain('tool_calls: message.tool_calls');
    expect(frontend).toContain("functions.invoke('exportMyData'");
    expect(frontend).not.toContain('handleDeleteAllData');
    expect(frontend).toContain('href="#settings-account"');
  });

  it('keeps account deletion authenticated, admin-blocked, batched, and complete for user-owned records', () => {
    const source = read('base44/functions/deleteMyAccount/entry.ts');
    expect(source).toContain('await base44.auth.me()');
    expect(source).toContain("user.role === 'admin'");
    expect(source).toContain("'ConsentRecord'");
    expect(source).toContain("'UserExerciseProgress'");
    expect(source).toContain('BATCH_SIZE = 100');
    expect(source).toContain('{ created_by: email }');
    expect(source.indexOf('deleteAllOwnedRecords')).toBeLessThan(source.indexOf('entities.User.delete'));
  });

  it('bounds and ownership-scopes retention cleanup', () => {
    const source = read('base44/functions/retentionCleanup/entry.ts');
    expect(source).toContain('ALLOWED_RETENTION_DAYS');
    expect(source).toContain('created_by: email');
    expect(source).toContain('MAX_BATCHES');
    expect(source).toContain('getConversations()');
    expect(source).toContain('archived, not physically deleted');
  });
});
