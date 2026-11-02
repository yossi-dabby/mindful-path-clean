import { test, expect } from '@playwright/test';
import { assertNoConsoleErrorsOrWarnings, assertElementVisibleAndTappable } from './utils/androidHelpers';
import { mockApi, SAFE_CONVERSATION_ROUTE_PATTERNS } from '../helpers/ui';

/**
 * Android Chat Readiness Test
 * 
 * This test verifies that the Chat page works correctly on Android devices,
 * specifically testing:
 * - Chat composer visibility and interaction
 * - Message send plus repeated composer interaction stability
 * - Composer remains tappable after repeated interactions
 * - No console errors or warnings
 */

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:5173';

const TEST_CONVERSATION_ID = 'test-conversation-123';
let postedUserMessages: string[] = [];
let postedMessagePayloads: string[] = [];
let conversationMessages: Array<Record<string, unknown>> = [];

test.describe('Android Chat Readiness', () => {
  test.beforeEach(async ({ page }) => {
    postedUserMessages = [];
    postedMessagePayloads = [];
    conversationMessages = [];
    await mockApi(page);

    await page.route(
      SAFE_CONVERSATION_ROUTE_PATTERNS.MESSAGES_POST,
      async (route) => {
        if (route.request().method() !== 'POST') {
          await route.continue();
          return;
        }

        const body = route.request().postDataJSON?.() as { content?: string };
        const content = String(body?.content || '');
        postedMessagePayloads.push(content);
        const userIndex = conversationMessages.filter((message) => message.role === 'user').length + 1;
        conversationMessages.push({
          id: `user-${userIndex}`,
          role: 'user',
          content,
          status: 'completed',
          created_at: new Date().toISOString(),
        });
        const userMessageMarker = content.match(/Android test message \d+/)?.[0];
        if (userMessageMarker) postedUserMessages.push(userMessageMarker);
        conversationMessages.push({
          id: `assistant-${userIndex}`,
          role: 'assistant',
          content: `Assistant reply ${userIndex}`,
          status: 'completed',
          metadata: { status: 'completed', completed: true },
          created_at: new Date().toISOString(),
        });

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: `user-${userIndex}`,
            role: 'user',
            content,
            created_date: new Date().toISOString(),
          }),
        });
      },
    );

    await page.route(
      SAFE_CONVERSATION_ROUTE_PATTERNS.CONVERSATION_BY_ID,
      async (route) => {
        if (route.request().method() !== 'GET') {
          await route.fallback();
          return;
        }
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: TEST_CONVERSATION_ID,
            agent_name: 'cbt_therapist',
            metadata: { name: 'Android queue test' },
            messages: conversationMessages.slice(),
            created_date: new Date().toISOString(),
          }),
        });
      },
    );

    await page.addInitScript(() => {
      localStorage.setItem('language', 'en');
      localStorage.setItem('chat_consent_accepted', 'true');
      localStorage.setItem('age_verified', 'true');
      window.__TEST_APP_ID__ = 'test-app-id';
      window.__DISABLE_ANALYTICS__ = true;
    });
  });

  test('should send a message and keep the composer usable through repeated interactions', async ({ page }) => {
    test.setTimeout(120000);
    // Set up console monitoring at the start
    const checkConsole = assertNoConsoleErrorsOrWarnings(page, {
      ignoredErrors: [/Connection rejected by server/],
      ignoredWarnings: [/cdn\.tailwindcss\.com should not be used in production/],
    });
    
    // Navigate to Chat page
    await page.goto(`${BASE_URL}/Chat?_s2=CHAT_ORCHESTRATOR_V2_ENABLED`, { waitUntil: 'networkidle' });
    
    // Wait for page to be ready
    await page.waitForFunction(() => {
      return document.querySelector('[data-page-ready="true"]') !== null;
    }, { timeout: 20000 });

    const composerSelector = '[data-testid="therapist-chat-input"]';
    const composer = page.locator(composerSelector);
    const sendButton = page.locator('[data-testid="therapist-chat-send"]');

    await expect(composer).toBeVisible({ timeout: 10000 });
    await expect(sendButton).toBeVisible({ timeout: 10000 });

    await composer.click();
    await composer.fill('Android test message 1');
    await sendButton.click();
    await expect.poll(() => postedUserMessages.length, { timeout: 20000 }).toBe(1);
    await expect(page.getByText('Assistant reply 1', { exact: true })).toBeVisible({ timeout: 20000 });

    // The V2 queue contract is covered by its dedicated Stage 12 tests. Here we
    // exercise Android focus, typing and clearing repeatedly after a real send.
    for (let i = 1; i <= 5; i++) {
      const draft = `Android composer draft ${i}`;
      await composer.click();
      await composer.fill(draft);
      await expect(composer).toHaveValue(draft);
      await composer.fill('');
    }

    expect(postedUserMessages).toEqual(['Android test message 1']);

    // After repeated interactions, verify composer is still visible and tappable
    await assertElementVisibleAndTappable(page, composerSelector);

    // Attempt to call window.printChatStabilityReport() if defined
    const hasStabilityReport = await page.evaluate(() => {
      return typeof (window as any).printChatStabilityReport === 'function';
    });

    if (hasStabilityReport) {
      await page.evaluate(() => {
        (window as any).printChatStabilityReport();
      });
      test.info().annotations.push({ type: 'stability-report', description: 'Chat stability report available' });
    } else {
      test.info().annotations.push({ type: 'stability-report', description: 'Chat stability report not available' });
    }

    // Assert no console errors or warnings
    await checkConsole();
  });

  const intentCases = [
    {
      label: 'I just want to unload',
      prompt: 'I mainly need a calm space to unload right now. Please listen before suggesting an exercise.',
    },
    {
      label: 'I want a practical solution',
      prompt: 'I would like one practical next step. Please help me focus on a single useful action.',
    },
  ];

  for (const intentCase of intentCases) {
    test(`should send the selected "${intentCase.label}" intent to the therapist`, async ({ page }) => {
      const checkConsole = assertNoConsoleErrorsOrWarnings(page, {
        ignoredErrors: [/Connection rejected by server/],
        ignoredWarnings: [/cdn\.tailwindcss\.com should not be used in production/],
      });

      await page.goto(`${BASE_URL}/Chat?_s2=CHAT_ORCHESTRATOR_V2_ENABLED`, { waitUntil: 'networkidle' });
      await expect(page.getByTestId('chat-root')).toBeVisible({ timeout: 20000 });

      const composer = page.getByTestId('therapist-chat-input');
      const sendButton = page.getByTestId('therapist-chat-send');
      const intentChooser = page.getByTestId('chat-intent-chooser');

      await expect(intentChooser).toBeVisible();
      await page.getByRole('button', { name: intentCase.label, exact: true }).click();
      await expect(composer).toHaveValue(intentCase.prompt);
      await expect(sendButton).toBeEnabled();
      await sendButton.click();

      await expect.poll(() => postedMessagePayloads.length, { timeout: 20000 }).toBe(1);
      expect(postedMessagePayloads[0]).toContain(intentCase.prompt);
      await expect(intentChooser).toBeHidden();
      await checkConsole();
    });
  }
});
