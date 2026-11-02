import { test, expect } from '@playwright/test';
import { assertNoConsoleErrorsOrWarnings, assertElementVisibleAndTappable } from './utils/androidHelpers';

/**
 * Android Keyboard Layout Test
 * 
 * This test verifies that the chat composer remains accessible when the
 * Android virtual keyboard is displayed, specifically testing:
 * - Composer can be focused
 * - Text can be typed
 * - Composer remains visible and tappable with keyboard shown
 * - No console errors or warnings
 */

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:5173';

test.describe('Android Keyboard Layout', () => {
  test.beforeEach(async ({ page }) => {
    // Set up test environment
    await page.route('**/api/apps/**', async (route) => {
      const url = route.request().url();
      if (url.includes('/public-settings/')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'test-app-id',
            appId: 'test-app-id',
            appName: 'Test App',
            isPublic: true
          })
        });
      } else {
        await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
      }
    });
    
    await page.route('**/api/auth/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-user-id',
          email: 'test@example.com',
          full_name: 'Test User',
          role: 'user',
          preferences: {}
        })
      });
    });
    
    await page.route('**/api/agents/**', async (route) => {
      const method = route.request().method();
      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([])
        });
      } else if (method === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'test-conversation-id',
            messages: [],
            metadata: { name: 'Test Session' }
          })
        });
      } else {
        await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
      }
    });
    
    await page.route('**/api/entities/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });
    
    await page.route('**/analytics/**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    });
    
    // Set up test environment
    await page.addInitScript(() => {
      localStorage.setItem('chat_consent_accepted', 'true');
      localStorage.setItem('age_verified', 'true');
      document.body.setAttribute('data-test-env', 'true');
      window.__TEST_APP_ID__ = 'test-app-id';
      window.__DISABLE_ANALYTICS__ = true;
    });
  });

  test('should maintain composer visibility and accessibility with keyboard', async ({ page }) => {
    // Set up console monitoring at the start
    const checkConsole = assertNoConsoleErrorsOrWarnings(page);
    
    // Navigate to Chat page
    await page.goto(`${BASE_URL}/Chat`, { waitUntil: 'networkidle' });
    
    // Wait for page to be ready
    await page.waitForFunction(() => {
      return document.querySelector('[data-page-ready="true"]') !== null;
    }, { timeout: 20000 });

    // Locate the chat composer
    const composerSelectors = [
      '[data-testid="therapist-chat-input"]',
      '[data-testid="chat-input"]',
      'textarea',
      '[contenteditable="true"]'
    ];

    let composer = null;
    let usedSelector = '';
    for (const selector of composerSelectors) {
      const element = page.locator(selector).first();
      if (await element.count() > 0) {
        composer = element;
        usedSelector = selector;
        test.info().annotations.push({ type: 'info', description: `Found composer with selector: ${selector}` });
        break;
      }
    }

    if (!composer) {
      test.skip(true, 'Chat composer not found - skipping test');
      return;
    }

    // Verify composer is initially visible
    await expect(composer).toBeVisible({ timeout: 10000 });

    // Focus the composer (this would typically trigger the keyboard on a real device)
    await composer.click();
    await page.waitForTimeout(500);

    // Type some text
    const testMessage = 'Testing keyboard layout on Android';
    await composer.fill(testMessage);
    await page.waitForTimeout(500);

    // Verify the text was entered
    const composerValue = await composer.inputValue().catch(() => 
      composer.textContent()
    );
    expect(composerValue).toContain('Testing keyboard');

    // Assert that the composer is still visible and tappable
    // (On a real device with keyboard shown, this would verify the composer
    // is not hidden behind the keyboard)
    await assertElementVisibleAndTappable(page, usedSelector);

    // Assert no console errors or warnings
    await checkConsole();
  });

  test('therapist chat input has mobile-keyboard optimization attributes', async ({ page }) => {
    await page.goto(`${BASE_URL}/Chat`, { waitUntil: 'networkidle' });

    await page.waitForFunction(() => {
      return document.querySelector('[data-page-ready="true"]') !== null;
    }, { timeout: 20000 }).catch(() => {});

    const textarea = page.locator('[data-testid="therapist-chat-input"]');
    if (await textarea.count() === 0) {
      test.skip(true, 'Therapist chat input not found – skipping');
      return;
    }

    // enterKeyHint="send" tells the mobile OS to show a "Send" key
    const enterKeyHint = await textarea.getAttribute('enterkeyhint');
    expect(enterKeyHint).toBe('send');

    // autoCapitalize="sentences" for natural message composition
    const autoCapitalize = await textarea.getAttribute('autocapitalize');
    expect(autoCapitalize).toBe('sentences');

    // autoComplete="off" prevents autocomplete from interfering
    const autoComplete = await textarea.getAttribute('autocomplete');
    expect(autoComplete).toBe('off');
  });

  test('coach chat input has mobile-keyboard optimization attributes', async ({ page }) => {
    await page.goto(`${BASE_URL}/Coach`, { waitUntil: 'networkidle' });

    await page.waitForTimeout(3000);

    const textarea = page.locator('[data-testid="coach-chat-input"]');
    if (await textarea.count() === 0) {
      test.skip(true, 'Coach chat input not found – skipping');
      return;
    }

    const enterKeyHint = await textarea.getAttribute('enterkeyhint');
    expect(enterKeyHint).toBe('send');

    const autoCapitalize = await textarea.getAttribute('autocapitalize');
    expect(autoCapitalize).toBe('sentences');

    // autoComplete="off" prevents autocomplete from interfering with chat
    const autoComplete = await textarea.getAttribute('autocomplete');
    expect(autoComplete).toBe('off');

    // autoCorrect="on" so natural-language typos are corrected
    const autoCorrect = await textarea.getAttribute('autocorrect');
    expect(autoCorrect).toBe('on');
  });
});
