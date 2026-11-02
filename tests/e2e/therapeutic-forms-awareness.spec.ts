import { test, expect, type Page } from '@playwright/test';
import path from 'node:path';
import { mockApi, spaNavigate } from '../helpers/ui';

type ChatLanguage = 'he' | 'en';

type FormFixture = {
  id: string;
  title: string;
  language: ChatLanguage;
  url: string;
  category: string;
  clinicalDomain: string;
  isCombinedPdf?: boolean;
};

type GeneratedFilePayload = {
  type: 'pdf';
  url: string;
  name: string;
  title: string;
  description: string;
  source: 'therapeutic_forms_library';
  form_id: string;
  language: ChatLanguage;
  category: string;
  isCombinedPdf: boolean;
};

type AssistantTurn = {
  content: string;
  generatedFiles: GeneratedFilePayload[];
};

const HE_SINGLE: FormFixture = {
  id: 'adolescents-cbt-specialized-he-01-04',
  title: 'לחץ לפני מבחן',
  language: 'he',
  url: '/forms/module-01/adolescents_cbt_specialized_he_01_04.pdf',
  category: 'adolescents_cbt_specialized',
  clinicalDomain: 'anxiety',
};

const HE_EXACT: FormFixture = {
  id: 'adolescents-cbt-core-he-1-4',
  title: 'מחשבה–רגש–פעולה',
  language: 'he',
  url: '/forms/adolescents_cbt_core_he_series_1/adolescents_cbt_core_he_1_4.pdf',
  category: 'adolescents_cbt_core',
  clinicalDomain: 'general_cbt',
};

const HE_COMBINED: FormFixture = {
  id: 'adolescents-cbt-core-he-stage-1-combined',
  title: 'שלב 1 — קובץ מאוחד',
  language: 'he',
  url: '/forms/adolescents_cbt_core_he_series_1/adolescents_cbt_core_he_series_1_combined.pdf',
  category: 'adolescents_cbt_core',
  clinicalDomain: 'general_cbt',
  isCombinedPdf: true,
};

const EN_SINGLE: FormFixture = {
  id: 'adolescents-cbt-core-en-1-1',
  title: 'What Is Going On for Me Right Now?',
  language: 'en',
  url: '/forms/en/adolescents/core/individual/01-01-what-is-going-on-for-me-right-now.pdf',
  category: 'adolescents_cbt_core',
  clinicalDomain: 'general_cbt',
};

const LIBRARY_FORM = HE_EXACT;

function generatedFileFromForm(form: FormFixture): GeneratedFilePayload {
  return {
    type: 'pdf',
    url: form.url,
    name: path.basename(form.url),
    title: form.title,
    description: `Category: ${form.category} | Clinical: ${form.clinicalDomain}`,
    source: 'therapeutic_forms_library',
    form_id: form.id,
    language: form.language,
    category: form.category,
    isCombinedPdf: Boolean(form.isCombinedPdf),
  };
}

function buildAssistantTurn(language: ChatLanguage, userMessage: string): AssistantTurn {
  let normalized = userMessage.trim();

  // Strip [START_SESSION] wiring block prepended to the first message in a new conversation.
  // The session start block is separated from the actual user text by '\n\n'. Because the
  // session block itself may contain '\n\n' separators between its sections, we locate the
  // LAST '\n\n' in the content, which is always the boundary added by handleSendMessage.
  // If no '\n\n' separator is found the block carries no visible user text, so we clear it.
  if (normalized.startsWith('[START_SESSION]')) {
    const lastSep = normalized.lastIndexOf('\n\n');
    normalized = lastSep !== -1 ? normalized.substring(lastSep + 2).trim() : '';
  }

  // Strip [FORM_ROUTER_CONTEXT] block appended to messages with a detected form intent.
  const frcIdx = normalized.indexOf('\n[FORM_ROUTER_CONTEXT]');
  if (frcIdx !== -1) {
    normalized = normalized.substring(0, frcIdx).trim();
  }

  // Policy refresh injections should not generate a visible assistant reply in the mock.
  if (normalized.startsWith('[THERAPEUTIC_FORMS_POLICY_REFRESH]')) {
    return { content: '', generatedFiles: [] };
  }

  const lower = normalized.toLowerCase();

  if (lower.includes('כותרת מדויקת:')) {
    const exactTitle = normalized.split(':').slice(1).join(':').trim();
    if (exactTitle === HE_EXACT.title) {
      return {
        content: `זיהיתי כותרת מדויקת: ${HE_EXACT.title}`,
        generatedFiles: [generatedFileFromForm(HE_EXACT)],
      };
    }
  }

  if (lower.includes('supports up to 5') || lower.includes('כמה טפסים')) {
    return {
      content: 'ניתן לבקש עד 5 טפסים בתשובה אחת.',
      generatedFiles: [],
    };
  }

  if (lower.includes('שני טפסים')) {
    return {
      content: 'להלן שני טפסים בעברית בהתאם לבקשה שלך.',
      generatedFiles: [generatedFileFromForm(HE_SINGLE), generatedFileFromForm(HE_COMBINED)],
    };
  }

  if (lower.includes('חרדה') || lower.includes('clinical')) {
    return {
      content: 'נבחר טופס מתאים. תחום קליני: anxiety.',
      generatedFiles: [generatedFileFromForm(HE_SINGLE)],
    };
  }

  if (language === 'en' || lower.includes('english')) {
    return {
      content: 'English-only forms for your request.',
      generatedFiles: [generatedFileFromForm(EN_SINGLE)],
    };
  }

  return {
    content: 'הנה טופס אחד בעברית לבקשה שלך.',
    generatedFiles: [generatedFileFromForm(HE_SINGLE)],
  };
}

async function setupTherapeuticFormsChat(page: Page, language: ChatLanguage) {
  await page.addInitScript((lang: string) => {
    localStorage.setItem('language', lang);
    localStorage.setItem('chat_consent_accepted', 'true');
    localStorage.setItem('age_verified', 'true');
    (window as any).__TEST_APP_ID__ = 'test-app-id';
    (window as any).__DISABLE_ANALYTICS__ = true;
  }, language);

  await mockApi(page);

  let conversationMessages: Array<{ role: 'user' | 'assistant'; content: string; metadata?: Record<string, unknown> }> = [];

  await page.route('**/api/**/agents/conversations/**/messages**', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue();
      return;
    }

    let body: { content?: string } | undefined;
    try {
      body = route.request().postDataJSON() as { content?: string } | undefined;
    } catch {
      body = undefined;
    }
    const userContent = String(body?.content || '');
    const assistantTurn = buildAssistantTurn(language, userContent);

    conversationMessages = [
      ...conversationMessages,
      { role: 'user', content: userContent },
      {
        role: 'assistant',
        content: assistantTurn.content,
        metadata: assistantTurn.generatedFiles.length > 0
          ? { generated_files: assistantTurn.generatedFiles }
          : {},
      },
    ];

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        role: 'user',
        content: userContent,
        created_date: new Date().toISOString(),
      }),
    });
  });

  await page.route('**/api/**/agents/conversations/test-conversation-123**', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue();
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'test-conversation-123',
        agent_name: 'cbt_therapist',
        metadata: { name: 'Therapeutic Forms Awareness', description: 'E2E awareness verification' },
        messages: conversationMessages,
        created_date: new Date().toISOString(),
      }),
    });
  });

  await spaNavigate(page, '/Chat');
  await expect(page.locator('[data-testid="therapist-chat-input"]')).toBeVisible({ timeout: 15000 });
}

async function sendChatMessage(page: Page, message: string) {
  const input = page.locator('[data-testid="therapist-chat-input"]');
  const sendButton = page.locator('[data-testid="therapist-chat-send"]');

  await input.fill(message);
  await expect(sendButton).toBeEnabled({ timeout: 15000 });
  const postMessageResponse = page.waitForResponse((response) => (
    response.request().method() === 'POST'
    && response.url().includes('/agents/conversations/')
    && response.url().includes('/messages')
  ), { timeout: 15000 });
  await sendButton.click();
  await postMessageResponse;
  await expect(input).toHaveValue('');
}

async function expectSingleGeneratedCard(page: Page, formId: string, language: ChatLanguage, isCombinedPdf = false, timeout = 25000) {
  const cards = page.locator('[data-testid="generated-file-card"]');
  await expect(cards).toHaveCount(1, { timeout });

  const card = cards.first();
  await expect(card).toHaveAttribute('data-form-id', formId);
  await expect(card).toHaveAttribute('data-language', language);
  await expect(card).toHaveAttribute('data-is-combined-pdf', String(isCombinedPdf));
  await expect(card.locator('[data-testid="generated-file-open"]')).toBeVisible();
  await expect(card.locator('[data-testid="generated-file-download"]')).toBeVisible();
}

test.describe('Therapeutic forms awareness in chat responses', () => {
  test('Hebrew first-message single-form request', async ({ page }) => {
    await setupTherapeuticFormsChat(page, 'he');

    await sendChatMessage(page, 'אני צריך טופס אחד בעברית ללחץ לפני מבחן');

    await expectSingleGeneratedCard(page, HE_SINGLE.id, 'he', false);
    await expect(page.getByText(HE_SINGLE.title, { exact: true })).toBeVisible();
  });

  test('Hebrew multi-form request', async ({ page }) => {
    await setupTherapeuticFormsChat(page, 'he');

    await sendChatMessage(page, 'תן לי שני טפסים בעברית לנושא חרדה');

    const cards = page.locator('[data-testid="generated-file-card"]');
    await expect(cards).toHaveCount(2, { timeout: 15000 });
    await expect(page.locator(`[data-testid="generated-file-card"][data-form-id="${HE_SINGLE.id}"]`)).toHaveCount(1);
    await expect(page.locator(`[data-testid="generated-file-card"][data-form-id="${HE_COMBINED.id}"]`)).toHaveCount(1);
    await expect(page.locator('[data-testid="generated-file-card"][data-language="he"]')).toHaveCount(2);
    await expect(page.locator('[data-testid="generated-file-card"][data-is-combined-pdf="true"]')).toHaveCount(1);
  });

  test('English language isolation', async ({ page }) => {
    await setupTherapeuticFormsChat(page, 'en');

    await sendChatMessage(page, 'Please share one English CBT worksheet only.');

    await expectSingleGeneratedCard(page, EN_SINGLE.id, 'en', false);
    await expect(page.locator('[data-testid="generated-file-card"][data-language="he"]')).toHaveCount(0);
  });

  test('Hebrew language isolation', async ({ page }) => {
    await setupTherapeuticFormsChat(page, 'he');

    await sendChatMessage(page, 'בבקשה תן לי טופס בעברית בלבד');

    await expectSingleGeneratedCard(page, HE_SINGLE.id, 'he', false);
    await expect(page.locator('[data-testid="generated-file-card"][data-language="en"]')).toHaveCount(0);
  });

  test('Exact Hebrew title lookup', async ({ page }) => {
    await setupTherapeuticFormsChat(page, 'he');

    await sendChatMessage(page, `כותרת מדויקת: ${HE_EXACT.title}`);

    await expect(page.getByText(`זיהיתי כותרת מדויקת: ${HE_EXACT.title}`)).toBeVisible({ timeout: 15000 });
    await expectSingleGeneratedCard(page, HE_EXACT.id, 'he', false);
    await expect(page.getByText(HE_EXACT.title, { exact: true })).toBeVisible();
  });

  test('Clinical metadata lookup', async ({ page }) => {
    await setupTherapeuticFormsChat(page, 'he');

    await sendChatMessage(page, 'אני צריך טופס לחרדה');

    await expectSingleGeneratedCard(page, HE_SINGLE.id, 'he', false);
  });

});
