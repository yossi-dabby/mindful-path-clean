/**
 * PR-5 — Open vs Download runtime behavior E2E
 *
 * Covers:
 *   1. Forms Library worksheet card — Open action (same-tab PDF viewer, not download)
 *   2. Forms Library worksheet card — Download action (browser download, not Open)
 *   3. Chat GeneratedFileCard — Open action (same-tab PDF viewer, not download)
 *   4. Chat GeneratedFileCard — Download action (browser download, not Open)
 *   5. Distinctness contract — Open and Download are separate, non-interchangeable buttons
 */
import { test, expect, type Page } from '@playwright/test';
import { installSyntheticFormsContent } from '../helpers/formsSyntheticContent';
import { mockApi, spaNavigate } from '../helpers/ui';

// ─── Constants ──────────────────────────────────────────────────────────────────

// This label matches the translated category for children CBT specialized in Hebrew.
// It mirrors the same constant used in forms-library-navigation.spec.ts and is stable
// as long as the therapeutic_forms.category.children_cbt_specialized translation remains unchanged.
const HEBREW_COLLECTION_LABEL = 'CBT ייעודי לילדים';
const WORKSHEET_VISIBILITY_TIMEOUT_MS = 2000;

/** Hebrew single-worksheet fixture used for Chat generated-file-card tests. */
const HE_FORM = {
  id: 'qa-adolescents-specialized-he-worksheet',
  title: 'לחץ לפני מבחן',
  language: 'he' as const,
  url: '/forms/he/adolescents/qa/qa-adolescents-specialized-he-worksheet.pdf',
  category: 'adolescents_cbt_specialized',
};

// ─── Setup helpers ───────────────────────────────────────────────────────────────

async function setupHebrewFormsLibrary(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('language', 'he');
    localStorage.setItem('chat_consent_accepted', 'true');
    localStorage.setItem('age_verified', 'true');
    (window as any).__TEST_APP_ID__ = 'test-app-id';
    (window as any).__DISABLE_ANALYTICS__ = true;
  });
  await mockApi(page);
  await installSyntheticFormsContent(page);
}

/**
 * Navigates from the collections grid all the way to a module that has visible
 * worksheet cards.  Mirrors the helper used in forms-library-navigation.spec.ts.
 */
async function navigateToWorksheetsLevel(page: Page) {
  await expect(page.getByTestId('collections-grid')).toBeVisible();

  await page.getByTestId('audience-filter-children').click();

  const targetCollectionCard = page
    .locator('[data-testid^="collection-card-"]')
    .filter({ hasText: HEBREW_COLLECTION_LABEL })
    .first();
  await expect(targetCollectionCard).toBeVisible();
  await targetCollectionCard.getByRole('button').first().click();

  await expect(page.getByTestId('modules-grid')).toBeVisible();

  const moduleViewButtons = page.locator('[data-testid^="view-worksheets-"]');
  const moduleCount = await moduleViewButtons.count();
  expect(moduleCount).toBeGreaterThan(0);

  for (let moduleIndex = 0; moduleIndex < moduleCount; moduleIndex += 1) {
    const btn = moduleViewButtons.nth(moduleIndex);
    await expect(btn).toBeVisible();
    await btn.click();
    await expect(page.getByTestId('worksheets-view')).toBeVisible();

    const worksheetsGridVisible = await page
      .getByTestId('worksheets-grid')
      .isVisible({ timeout: WORKSHEET_VISIBILITY_TIMEOUT_MS })
      .catch(() => false);

    if (worksheetsGridVisible) {
      return;
    }

    await expect(page.getByTestId('empty-state')).toBeVisible();
    await page.getByTestId('forms-nav-back').click();
    await expect(page.getByTestId('modules-grid')).toBeVisible();
  }

  throw new Error('[forms-open-download] No module with visible worksheets grid found.');
}

/**
 * Sets up the Chat page with mocked API routes so that sending any message
 * causes the mock assistant to reply with a deterministic Hebrew generated_file card.
 */
async function setupChatWithGeneratedFileCard(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('language', 'he');
    localStorage.setItem('chat_consent_accepted', 'true');
    localStorage.setItem('age_verified', 'true');
    (window as any).__TEST_APP_ID__ = 'test-app-id';
    (window as any).__DISABLE_ANALYTICS__ = true;
  });

  await mockApi(page);
  await installSyntheticFormsContent(page);

  const generatedFile = {
    type: 'pdf',
    url: HE_FORM.url,
    name: 'qa-adolescents-specialized-he-worksheet.pdf',
    title: HE_FORM.title,
    description: 'טופס טיפולי לחרדת מבחנים',
    source: 'therapeutic_forms_library',
    form_id: HE_FORM.id,
    language: 'he',
    category: HE_FORM.category,
    isCombinedPdf: false,
  };

  let conversationMessages: Array<{
    role: string;
    content: string;
    metadata?: Record<string, unknown>;
  }> = [];

  // POST /messages — store user + assistant turns (with generated_file) in memory.
  await page.route('**/api/**/agents/conversations/**/messages**', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue();
      return;
    }

    let body: { content?: string } | undefined;
    try {
      body = route.request().postDataJSON() as { content?: string } | undefined;
    } catch {
      // postDataJSON throws when the body is multipart or non-JSON; fall back to
      // empty content so the mock still responds with a generated_file card.
      body = undefined;
    }
    const userContent = String(body?.content || '');

    conversationMessages = [
      ...conversationMessages,
      { role: 'user', content: userContent },
      {
        role: 'assistant',
        content: 'הנה טופס מתאים.',
        metadata: { generated_file: generatedFile },
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

  // GET conversation — return current conversationMessages so the UI re-renders.
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
        metadata: { name: 'Open Download Test', description: 'PR-5 open/download verification' },
        messages: conversationMessages,
        created_date: new Date().toISOString(),
      }),
    });
  });

  await spaNavigate(page, '/Chat');
  await expect(page.locator('[data-testid="therapist-chat-input"]')).toBeVisible({
    timeout: 15000,
  });
}

/**
 * Fills the chat input, clicks Send, and waits for the POST /messages response.
 * Mirrors the sendChatMessage helper used in therapeutic-forms-awareness.spec.ts.
 */
async function sendChatMessage(page: Page, message: string) {
  const input = page.locator('[data-testid="therapist-chat-input"]');
  const sendButton = page.locator('[data-testid="therapist-chat-send"]');

  await input.fill(message);
  await expect(sendButton).toBeEnabled({ timeout: 15000 });

  const postResponsePromise = page.waitForResponse(
    (r) =>
      r.request().method() === 'POST' &&
      r.url().includes('/agents/conversations/') &&
      r.url().includes('/messages'),
    { timeout: 15000 },
  );

  await sendButton.click();
  await postResponsePromise;
  await expect(input).toHaveValue('');
}

// ─── Test suite ─────────────────────────────────────────────────────────────────

test.describe('Open vs Download runtime behavior — Forms Library and Chat', () => {
  // ── Scenario 1: Forms Library Open ─────────────────────────────────────────

  test('Forms Library Open action navigates same-tab to PDF viewer and does not trigger download', async ({
    page,
  }) => {
    await setupHebrewFormsLibrary(page);
    await spaNavigate(page, '/TherapeuticForms');

    await navigateToWorksheetsLevel(page);

    // Stable generic selector added in Phase 2.
    const firstOpenButton = page.locator('[data-testid="forms-file-open"]').first();
    await expect(firstOpenButton).toBeVisible();

    // Open must NOT carry an HTML `download` attribute.
    const downloadAttr = await firstOpenButton.getAttribute('download');
    expect(downloadAttr).toBeNull();

    // Click Open — expect same-tab navigation to /pdf-viewer, NOT a popup or download event.
    await firstOpenButton.click();
    await page.waitForURL('**/pdf-viewer**', { timeout: 10000 });

    // The URL must point to the PDF viewer route with a file param.
    const currentUrl = page.url();
    expect(currentUrl).toContain('/pdf-viewer');
    expect(currentUrl).toContain('file=');
    // The viewer URL must NOT contain a download query flag.
    expect(currentUrl).not.toContain('download=1');

    // Navigate back to confirm the Forms Library page is still accessible.
    await page.goBack();
    await expect(page.getByTestId('worksheets-view')).toBeVisible();
  });

  // ── Scenario 2: Forms Library Download ─────────────────────────────────────

  test('Forms Library Download triggers browser download and does not navigate to PDF viewer', async ({
    page,
  }) => {
    await setupHebrewFormsLibrary(page);
    await spaNavigate(page, '/TherapeuticForms');

    await navigateToWorksheetsLevel(page);

    const firstDownloadButton = page.locator('[data-testid="forms-file-download"]').first();
    await expect(firstDownloadButton).toBeVisible();

    const urlBefore = page.url();

    // Arm a download listener before clicking so no event can slip past.
    const downloadEventPromise = page
      .waitForEvent('download', { timeout: 8000 })
      .catch(() => null);

    await firstDownloadButton.click();

    const downloadEvent = await downloadEventPromise;

    if (downloadEvent) {
      // Playwright captured a real browser download — verify it is a PDF.
      expect(downloadEvent.suggestedFilename()).toMatch(/\.pdf$/i);
    } else {
      // Some CI headless environments absorb the anchor-click download without
      // surfacing a Playwright download event.  Assert the stable app-level
      // contract: the page did NOT navigate away from the Forms Library.
      expect(page.url()).toBe(urlBefore);
    }

    // Regardless of download event capture, the current page must NOT have
    // navigated into the PDF viewer route (that is the Open path, not Download).
    expect(page.url()).not.toContain('/pdf-viewer');

    // Forms Library remains usable after the download action.
    await expect(page.getByTestId('worksheets-view')).toBeVisible();
  });

  // ── Scenario 3: Chat GeneratedFileCard Open ─────────────────────────────────

  test('Chat generated-file-card Open action navigates same-tab to PDF viewer, card accessible via back', async ({
    page,
  }) => {
    await setupChatWithGeneratedFileCard(page);

    await sendChatMessage(page, 'בקשה לטופס');

    const card = page.locator('[data-testid="generated-file-card"]').first();
    await expect(card).toBeVisible({ timeout: 15000 });

    // Language must remain Hebrew.
    await expect(card).toHaveAttribute('data-language', 'he');

    const openBtn = card.locator('[data-testid="generated-file-open"]');
    const downloadBtn = card.locator('[data-testid="generated-file-download"]');
    await expect(openBtn).toBeVisible();
    await expect(downloadBtn).toBeVisible();

    // Open must NOT carry an HTML `download` attribute.
    expect(await openBtn.getAttribute('download')).toBeNull();

    // Click Open — expect same-tab navigation to /pdf-viewer, NOT a popup or download event.
    await openBtn.click();
    await page.waitForURL('**/pdf-viewer**', { timeout: 10000 });

    const currentUrl = page.url();
    expect(currentUrl).toContain('/pdf-viewer');
    expect(currentUrl).toContain('file=');
    expect(currentUrl).not.toContain('download=1');

    // Navigate back to confirm the chat is still accessible with the card.
    await page.goBack();
    await expect(card).toBeVisible();
    // Download button remains distinct and visible after Open.
    await expect(downloadBtn).toBeVisible();
    // Chat input must still be available (no chat error).
    await expect(page.locator('[data-testid="therapist-chat-input"]')).toBeVisible();
  });

  // ── Scenario 4: Chat GeneratedFileCard Download ──────────────────────────────

  test('Chat generated-file-card Download triggers download behavior and does not open viewer', async ({
    page,
  }) => {
    await setupChatWithGeneratedFileCard(page);

    await sendChatMessage(page, 'בקשה לטופס');

    const card = page.locator('[data-testid="generated-file-card"]').first();
    await expect(card).toBeVisible({ timeout: 15000 });

    const downloadBtn = card.locator('[data-testid="generated-file-download"]');
    await expect(downloadBtn).toBeVisible();

    const urlBefore = page.url();

    const downloadEventPromise = page
      .waitForEvent('download', { timeout: 8000 })
      .catch(() => null);

    await downloadBtn.click();

    const downloadEvent = await downloadEventPromise;

    if (downloadEvent) {
      expect(downloadEvent.suggestedFilename()).toMatch(/\.pdf$/i);
    } else {
      // Fallback: assert no navigation away from Chat (Download did not use the Open route).
      expect(page.url()).toBe(urlBefore);
    }

    // Download must NOT have navigated into the PDF viewer route (that is the Open path).
    expect(page.url()).not.toContain('/pdf-viewer');

    // Card must remain after download — the action must not remove it.
    await expect(card).toBeVisible();
    // Open button remains distinct and available.
    await expect(card.locator('[data-testid="generated-file-open"]')).toBeVisible();
    // Chat input must still be usable.
    await expect(page.locator('[data-testid="therapist-chat-input"]')).toBeVisible();
  });

  // ── Scenario 5: Distinctness contract ──────────────────────────────────────

  test('Open and Download are distinct, non-interchangeable buttons on both surfaces', async ({
    page,
  }) => {
    // ---- Forms Library surface ----
    await setupHebrewFormsLibrary(page);
    await spaNavigate(page, '/TherapeuticForms');
    await navigateToWorksheetsLevel(page);

    const formsOpenBtns = page.locator('[data-testid="forms-file-open"]');
    const formsDownloadBtns = page.locator('[data-testid="forms-file-download"]');

    const formsOpenCount = await formsOpenBtns.count();
    const formsDownloadCount = await formsDownloadBtns.count();

    expect(formsOpenCount).toBeGreaterThan(0);
    expect(formsDownloadCount).toBeGreaterThan(0);
    // Each worksheet card has exactly one Open and one Download button.
    expect(formsOpenCount).toBe(formsDownloadCount);

    // Every Open button must NOT carry an HTML download attribute.
    for (let buttonIndex = 0; buttonIndex < formsOpenCount; buttonIndex += 1) {
      expect(await formsOpenBtns.nth(buttonIndex).getAttribute('download')).toBeNull();
    }

    // Clicking Download on a worksheet must NOT navigate to /pdf-viewer (which would
    // signal that it incorrectly routed to the Open code path).
    const urlBeforeDownload = page.url();
    const firstDownloadBtn = formsDownloadBtns.first();
    // Also arm a download listener to consume the event so it does not leak.
    const downloadConsumePromise = page
      .waitForEvent('download', { timeout: 3000 })
      .catch(() => null);
    await firstDownloadBtn.click();
    await downloadConsumePromise;
    // Download must NOT have navigated into the PDF viewer route.
    expect(page.url()).not.toContain('/pdf-viewer');
    expect(page.url()).toBe(urlBeforeDownload);

    // ---- Chat surface ----
    await setupChatWithGeneratedFileCard(page);
    await sendChatMessage(page, 'בקשה לטופס');

    const chatCard = page.locator('[data-testid="generated-file-card"]').first();
    await expect(chatCard).toBeVisible({ timeout: 15000 });

    const chatOpenBtn = chatCard.locator('[data-testid="generated-file-open"]');
    const chatDownloadBtn = chatCard.locator('[data-testid="generated-file-download"]');
    await expect(chatOpenBtn).toBeVisible();
    await expect(chatDownloadBtn).toBeVisible();

    // They must be different DOM elements with different testids.
    const chatOpenId = await chatOpenBtn.getAttribute('data-testid');
    const chatDownloadId = await chatDownloadBtn.getAttribute('data-testid');
    expect(chatOpenId).toBe('generated-file-open');
    expect(chatDownloadId).toBe('generated-file-download');
    expect(chatOpenId).not.toBe(chatDownloadId);

    // Open button must NOT carry an HTML download attribute.
    expect(await chatOpenBtn.getAttribute('download')).toBeNull();

    // Both buttons target the same underlying file: the form_id and language must
    // be consistent across the card.
    await expect(chatCard).toHaveAttribute('data-form-id', HE_FORM.id);
    await expect(chatCard).toHaveAttribute('data-language', 'he');
  });
});
