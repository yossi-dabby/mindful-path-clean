import { test, expect } from '@playwright/test';
import { spaNavigate, mockApi, logFailedRequests } from '../helpers/ui';

/**
 * Accessibility Tests – Community Page
 *
 * Verifies that the Community page renders a visible <h1> heading with the
 * word "community" so that screen-reader users and automated tools can
 * correctly identify the page.
 */

test.describe('Community Page – Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await mockApi(page);
  });

  test('should have a visible h1 heading containing "Community"', async ({ page }) => {
    test.setTimeout(60000);
    const requestLogger = await logFailedRequests(page);

    try {
      await spaNavigate(page, '/Community');
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

      const communityHeading = page.locator('h1').filter({ hasText: /community/i }).first();
      await expect(communityHeading).toBeVisible({ timeout: 15000 });

      console.log('✅ Community page: visible <h1> with "Community" text found');
    } catch (error) {
      requestLogger.logToConsole();
      await page.screenshot({
        path: `test-results/community-accessibility-h1-failed-${Date.now()}.png`,
        fullPage: true,
      });
      throw error;
    }
  });
});
