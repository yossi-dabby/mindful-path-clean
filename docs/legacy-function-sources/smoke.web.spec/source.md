<!-- Original entry.ts content preserved 2026-08-09T19:01:04.402Z when the bundler-safe stub replaced entry.ts to resolve Base44 function bundling errors. No behavior change — this folder was never a registered/active function. -->

```ts
/**
 * E2E SMOKE TEST - MIME Type Issue Fixed
 * 
 * Copy to: tests/e2e/smoke.web.spec.ts
 * Run: npx playwright test smoke.web.spec.ts
 * 
 * FIX: Only mock specific /api/** routes to prevent intercepting module files
 */

import { test, expect } from '@playwright/test';

test.describe('Chat Smoke Test', () => {
  test.beforeEach(async ({ page }) => {
    console.log('[TEST] Starting beforeEach setup');
    
    // CRITICAL: Only intercept /api/** routes - never intercept module files
    // This prevents MIME type errors for src/api/base44Client.js
    
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
    
    await page.goto('http://127.0.0.1:5173/chat', { waitUntil: 'networkidle' });
    
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
    await page.goto('http://127.0.0.1:5173/chat', { waitUntil: 'networkidle' });
    
    await page.waitForFunction(() => {
      return document.querySelector('[data-page-ready="true"]') !== null;
    }, { timeout: 20000 });
    
    const welcome = page.locator('text=Welcome to Therapy');
    await expect(welcome).toBeVisible({ timeout: 10000 });
    
    const startButton = page.locator('text=Start Your First Session');
    await expect(startButton).toBeVisible();
  });
});
```
