import { test, expect } from '@playwright/test';
import { spaNavigate, mockApi, logFailedRequests } from '../helpers/ui';

/**
 * App Boot – No Console Errors
 *
 * Loads the app and fails on any unexpected console errors produced during
 * initial boot / hydration. Uses mocked API only (no real network dependencies).
 *
 * Known-benign messages that are allowlisted:
 *   - "favicon" – 404 for favicon.ico is harmless and environment-dependent.
 */

// Patterns for console error messages that are known-benign and should not
// cause the test to fail.
const BENIGN_ERROR_PATTERNS: RegExp[] = [
  /favicon/i,
];

function isBenign(text: string): boolean {
  return BENIGN_ERROR_PATTERNS.some((pattern) => pattern.test(text));
}

test.describe('App Boot – No Console Errors', () => {
  test('app loads without unexpected console errors', async ({ page }) => {
    test.setTimeout(60000);

    // Disable analytics to prevent spurious errors in the test environment.
    await page.addInitScript(() => {
      (window as any).__DISABLE_ANALYTICS__ = true;
    });

    // Mock all API calls so the test has no real network dependencies.
    await mockApi(page);

    const requestLogger = await logFailedRequests(page);

    // Collect console errors BEFORE navigating so we capture everything from
    // the very first moment the page starts loading.
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' && !isBenign(msg.text())) {
        consoleErrors.push(msg.text());
      }
    });

    try {
      // Navigate to the root and wait for React hydration.
      // spaNavigate calls waitForAppHydration internally.
      await spaNavigate(page, '/');

      // Verify the app root is visible (basic sanity check).
      await expect(page.locator('#root')).toBeVisible({ timeout: 10000 });

      // Fail the test if any unexpected console errors were emitted.
      if (consoleErrors.length > 0) {
        throw new Error(
          `Unexpected console error(s) during app boot:\n${consoleErrors.map((e, i) => `  ${i + 1}. ${e}`).join('\n')}`
        );
      }
    } catch (error) {
      requestLogger.logToConsole();
      await page.screenshot({
        path: `test-results/app-boot-console-errors-${Date.now()}.png`,
        fullPage: true,
      });
      throw error;
    }
  });
});
