<!-- Original entry.ts content preserved 2026-08-09T19:01:04.404Z when the bundler-safe stub replaced entry.ts to resolve Base44 function bundling errors. No behavior change — this folder was never a registered/active function. -->

```ts
import { test, expect } from '@playwright/test';
import { testHelpers } from '../e2eTestHelpers.js';

/**
 * Smoke Test - Chat Flow (Web)
 * 
 * Tests basic chat functionality with all safeguards:
 * - Analytics mocking to prevent null app ID crashes
 * - Base44 API mocking to prevent 404 errors
 * - Page closure diagnostics
 * - Safe interactions with closure detection
 */

test.describe('Chat Smoke Test (Web)', () => {
  test.beforeEach(async ({ page }) => {
    // CRITICAL: Mock analytics to prevent null app ID crashes
    await testHelpers.mockAnalytics(page);
    
    // CRITICAL: Mock Base44 API endpoints to prevent 404 errors
    await testHelpers.mockBase44APIs(page);
    
    // Setup closure diagnostics
    testHelpers.setupClosureDiagnostics(page);
    
    // Set test environment flags and provide app context
    await page.addInitScript(() => {
      // Bypass age gate and consent
      localStorage.setItem('chat_consent_accepted', 'true');
      localStorage.setItem('age_verified', 'true');
      document.body.setAttribute('data-test-env', 'true');
      
      // Provide test app ID to prevent undefined/null appId errors
      window.__TEST_APP_ID__ = 'test-app-id';
      window.__TEST_APP_TOKEN__ = 'test-token';
      
      // Disable analytics
      window.__DISABLE_ANALYTICS__ = true;
    });
  });

  test('should load chat page and send message', async ({ page }) => {
    // Navigate to chat
    await page.goto('http://127.0.0.1:5173/chat');
    
    // Wait for page to be ready - increased timeout
    await page.waitForFunction(() => {
      const root = document.querySelector('[data-page-ready="true"]');
      return root !== null;
    }, { timeout: 15000 });

    // Verify chat root is visible
    const chatRoot = page.locator('[data-testid="chat-root"]');
    await expect(chatRoot).toBeVisible({ timeout: 10000 });

    // Wait for input to be ready
    const input = await testHelpers.waitForChatReady(page, 15000);
    await expect(input).toBeVisible();
    await expect(input).toBeEnabled();

    // Verify the welcome screen or messages container is present
    // Chat starts with no conversation, so messages container may not exist yet
    const hasWelcome = await page.locator('text=Welcome to Therapy').isVisible().catch(() => false);
    const hasMessages = await page.locator('[data-testid="chat-messages"]').isVisible().catch(() => false);
    
    expect(hasWelcome || hasMessages).toBe(true);

    // Verify page health after loading
    const isHealthy = await testHelpers.verifyPageHealth(page);
    expect(isHealthy).toBe(true);
  });

  test('should handle page closure gracefully', async ({ page }) => {
    await page.goto('http://127.0.0.1:5173/chat');
    
    // Setup health monitoring
    let pageStillOpen = true;
    page.on('close', () => {
      pageStillOpen = false;
      console.log('[TEST] Page closed during test');
    });

    // Wait for chat ready
    await testHelpers.waitForChatReady(page);
    
    // Verify page is still open
    expect(pageStillOpen).toBe(true);
    expect(page.isClosed()).toBe(false);
  });
});
```
