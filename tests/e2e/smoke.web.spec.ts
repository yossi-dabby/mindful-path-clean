import { test, expect } from '@playwright/test';
import { mockApi } from '../helpers/ui';

const BASE_URL =
  process.env.PLAYWRIGHT_TEST_BASE_URL ||
  process.env.E2E_BASE_URL ||
  process.env.BASE_URL ||
  'http://127.0.0.1:5173';

test.describe('Chat Smoke Test', () => {
  test.beforeEach(async ({ page }) => {
    console.log('[TEST] Starting beforeEach setup');

    // Use the shared mockApi helper which:
    // - Intercepts only /api/** routes (not JS module files, preventing MIME errors)
    // - Returns correct response types ([] for entity lists, {} for other calls)
    await mockApi(page);

    // Set up test environment variables
    await page.addInitScript(() => {
      localStorage.setItem('chat_consent_accepted', 'true');
      localStorage.setItem('age_verified', 'true');
      if (document.body) {
        document.body.setAttribute('data-test-env', 'true');
      }
      (window as any).__TEST_APP_ID__ = 'test-app-id';
      (window as any).__DISABLE_ANALYTICS__ = true;
    });
  });

  test('should load chat page without errors', async ({ page }) => {
    const errors = [];
    const networkErrors = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error('[PAGE ERROR]', msg.text());
        errors.push(msg.text());
      }
    });
    
    page.on('response', response => {
      if (response.status() === 404) {
        console.error('[404 ERROR]', response.url());
        networkErrors.push(response.url());
      }
    });
    
    await page.goto(`${BASE_URL}/chat`, { waitUntil: 'networkidle' });
    
    await page.waitForFunction(() => {
      return document.querySelector('[data-page-ready="true"]') !== null;
    }, { timeout: 20000 });
    
    const chatRoot = page.locator('[data-testid="chat-root"]');
    await expect(chatRoot).toBeVisible({ timeout: 10000 });
    
    const input = page.locator('[data-testid="therapist-chat-input"]');
    await expect(input).toBeVisible({ timeout: 10000 });
    await expect(input).toBeEnabled();
    
    expect(networkErrors.length).toBe(0);
    
    await page.screenshot({ path: 'test-results/chat-loaded.png', fullPage: true });
  });

  test('should show welcome screen', async ({ page }) => {
    await page.goto(`${BASE_URL}/chat`, { waitUntil: 'networkidle' });
    
    await page.waitForFunction(() => {
      return document.querySelector('[data-page-ready="true"]') !== null;
    }, { timeout: 20000 });
    
    const welcome = page.locator('[data-testid="chat-welcome"]');
    await expect(welcome).toBeVisible({ timeout: 10000 });

    const startButton = page.locator('[data-testid="chat-start-first-session"]');
    await expect(startButton).toBeVisible();
    await expect(startButton).toBeEnabled();
  });
});
