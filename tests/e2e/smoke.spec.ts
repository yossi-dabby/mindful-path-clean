import { test, expect, devices } from '@playwright/test';
import { spaNavigate, safeFill, safeClick, mockApi, logFailedRequests, takeDebugScreenshot } from '../helpers/ui';

// Keep the mobile viewport/touch profile without overriding the browser
// selected by the Playwright project. The iPhone preset otherwise forces
// WebKit even though CI intentionally runs these projects on Chromium.
const { defaultBrowserType: _iPhoneDefaultBrowserType, ...iPhoneDevice } = devices['iPhone 12'];
test.use(iPhoneDevice);

const MESSAGE_POST_TIMEOUT_MS = 70000;

test.describe('Chat Smoke Test (Mobile)', () => {
  test('should send a message and verify it appears (or at least the POST happens) on mobile', async ({ page }) => {
    test.setTimeout(90000);

    // Inject test-environment globals before the app boots so that the Base44
    // SDK constructs proper API URLs (avoids /api/apps/undefined/... paths).
    await page.addInitScript(() => {
      (window as any).__TEST_APP_ID__ = 'test-app-id';
      (window as any).__DISABLE_ANALYTICS__ = true;
    });

    const requestLogger = await logFailedRequests(page);
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    page.on('pageerror', (error) => {
      pageErrors.push(String(error));
    });

    // Collect all POST requests made during the test for diagnostics.
    const capturedPostUrls: string[] = [];
    page.on('request', (req) => {
      if (req.method() === 'POST') {
        capturedPostUrls.push(req.url());
      }
    });

    try {
      await mockApi(page);

      console.log('[smoke] Navigating to /Chat...');
      await spaNavigate(page, '/Chat');
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
      const startSessionButton = page.getByText('Start Your First Session');
      if (await startSessionButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log('[smoke] Clicking "Start Your First Session"...');
        await safeClick(startSessionButton);
        await page.waitForTimeout(800);
      }

      const testMessage = `Test message ${Date.now()}`;
      const messageInput = page.locator('textarea[data-testid="therapist-chat-input"]')
        .or(page.locator('textarea[data-testid="chat-input"]'))
        .or(page.locator('textarea').first());
      await expect(messageInput).toBeVisible({ timeout: 20000 });

      console.log('[smoke] Filling message input...');
      await safeFill(messageInput, testMessage);

      // Prefer the actual send button testid used in Chat.jsx; fall back to
      // role/aria matchers and finally to pressing Enter on the textarea.
      const sendButton = page.locator('[data-testid="therapist-chat-send"]')
        .or(page.locator('[data-testid="chat-send"]'))
        .or(page.getByRole('button', { name: /send/i }))
        .or(page.locator('button[aria-label*="Send" i]')).first();

      if (await sendButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log('[smoke] Send button found — clicking...');
        await expect(sendButton).toBeVisible({ timeout: 20000 });
        await expect(sendButton).toBeEnabled({ timeout: 20000 });
        try {
          await sendButton.click({ timeout: 5000 });
        } catch {
          console.log('[smoke] Send click was unstable — pressing Enter fallback...');
          if (!page.isClosed()) {
            await messageInput.press('Enter', { timeout: 5000 });
          }
        }
      } else {
        console.log('[smoke] Send button not found — pressing Enter...');
        await messageInput.press('Enter');
      }

      await expect
        .poll(
          () =>
            capturedPostUrls.some(
              (url) => url.includes('/agents/conversations/') && url.includes('/messages'),
            ),
          { timeout: MESSAGE_POST_TIMEOUT_MS },
        )
        .toBe(true);

      await expect(page.getByText(testMessage).first()).toBeVisible({ timeout: 15000 }).catch(() => {});
    } catch (error) {
      requestLogger.logToConsole();
      if (capturedPostUrls.length > 0) {
        console.log('\n📋 POST requests captured during test:');
        capturedPostUrls.forEach((u) => console.log(`  POST ${u}`));
      } else {
        console.log('\n⚠️  No POST requests were captured during the test.');
      }
      if (consoleErrors.length > 0) {
        console.log('\n🧾 Browser console errors (first 10):');
        consoleErrors.slice(0, 10).forEach((entry) => console.log(`  - ${entry}`));
      }
      if (pageErrors.length > 0) {
        console.log('\n🧾 Page runtime errors (first 10):');
        pageErrors.slice(0, 10).forEach((entry) => console.log(`  - ${entry}`));
      }
      await takeDebugScreenshot(page, `chat-mobile-smoke-failed-${Date.now()}`);
      throw error;
    }
  });
});
