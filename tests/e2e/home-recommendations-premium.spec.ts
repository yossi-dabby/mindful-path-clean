import { test, expect, type Page } from '@playwright/test';
import { mockApi } from '../helpers/ui';

const BASE_URL =
  process.env.PLAYWRIGHT_TEST_BASE_URL ||
  process.env.E2E_BASE_URL ||
  process.env.BASE_URL ||
  'http://127.0.0.1:5173';

async function prepareHome(page: Page, language = 'he', viewport = { width: 390, height: 844 }) {
  await page.setViewportSize(viewport);
  await page.addInitScript(({ language }) => {
    localStorage.setItem('language', language);
    localStorage.setItem('i18nextLng', language);
    localStorage.setItem('age_verified', 'true');
    localStorage.setItem('chat_consent_accepted', 'true');
    (window as any).__TEST_APP_ID__ = 'test-app-id';
    (window as any).__DISABLE_ANALYTICS__ = true;
  }, { language });

  await mockApi(page);
  await page.goto(`${BASE_URL}/Home`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await expect(page.getByTestId('daily-path')).toBeVisible({ timeout: 20000 });
}

test.describe('Stage B daily path', () => {
  test('is fully localized and keyboard-accessible in Hebrew', async ({ page }) => {
    await prepareHome(page);

    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    const dailyPath = page.getByTestId('daily-path');
    await expect(dailyPath).toContainText('המסלול להיום');
    await expect(dailyPath).toContainText('בדיקה יומית');
    await expect(dailyPath).toContainText('שיחה עם המאמן');
    await expect(dailyPath).toContainText('פעולה מועילה אחת');
    await expect(dailyPath).not.toContainText(/Today’s path|Talk with your coach|One useful action/);

    const action = page.getByTestId('daily-path-action');
    await expect(action).toBeEnabled();
    await action.focus();
    await expect(action).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/Exercises$/);
  });

  test('keeps all three daily actions inside every supported viewport', async ({ page }) => {
    await prepareHome(page, 'he', { width: 1440, height: 900 });

    for (const viewport of [
      { width: 360, height: 780 },
      { width: 768, height: 1024 },
      { width: 1440, height: 900 }
    ]) {
      await page.setViewportSize(viewport);
      const dimensions = await page.evaluate(() => ({
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: document.documentElement.clientWidth
      }));
      expect(dimensions.documentWidth).toBeLessThanOrEqual(dimensions.viewportWidth + 2);

      for (const testId of ['daily-path-checkin', 'daily-path-coach', 'daily-path-action']) {
        const control = page.getByTestId(testId);
        await expect(control).toBeVisible();
        const box = await control.boundingBox();
        expect(box).not.toBeNull();
        expect(box!.x, testId).toBeGreaterThanOrEqual(-1);
        expect(box!.x + box!.width, testId).toBeLessThanOrEqual(viewport.width + 1);
        expect(box!.height, testId).toBeGreaterThanOrEqual(44);
      }
    }
  });
});
