import { test, expect } from '@playwright/test';
import { mockApi } from '../helpers/ui';

const BASE_URL = process.env.PLAYWRIGHT_TEST_BASE_URL || process.env.E2E_BASE_URL || process.env.BASE_URL || 'http://127.0.0.1:5173';

async function prepare(page, language = 'en') {
  await mockApi(page);
  await page.addInitScript(({ language }) => {
    localStorage.setItem('language', language);
    localStorage.setItem('i18nextLng', language);
    localStorage.setItem('chat_consent_accepted', 'true');
    localStorage.setItem('age_verified', 'true');
    (window as any).__TEST_APP_ID__ = 'test-app-id';
    (window as any).__DISABLE_ANALYTICS__ = true;
  }, { language });
  await page.goto(BASE_URL + '/Progress', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await expect(page.getByTestId('progress-page')).toBeVisible({ timeout: 20000 });
}

test.describe('Progress responsive experience', () => {
  test.beforeEach(async ({ page }) => prepare(page));

  test('opens every Progress tab', async ({ page }) => {
    for (const target of ['progress-achievements', 'progress-goals', 'progress-exercises', 'progress-health']) {
      const names = {
        'progress-achievements': /Achievements/i,
        'progress-goals': /Goals/i,
        'progress-exercises': /Exercises/i,
        'progress-health': /Health/i
      };
      await page.getByRole('tab', { name: names[target] }).click();
      await expect(page.getByTestId(target)).toBeVisible();
    }
  });

  test('has no page-level overflow on phone, tablet and desktop', async ({ page }) => {
    for (const viewport of [{ width: 360, height: 780 }, { width: 768, height: 1024 }, { width: 1440, height: 900 }]) {
      await page.setViewportSize(viewport);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(2);
    }
  });

  test('opens the health form within a phone viewport and closes with Escape', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    await page.getByRole('tab', { name: /Health/i }).click();
    await page.getByRole('button', { name: /Log health data/i }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    const box = await dialog.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeLessThanOrEqual(362);
    expect(box!.height).toBeLessThanOrEqual(642);
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });
});

test('Progress renders Hebrew and RTL', async ({ page }) => {
  await prepare(page, 'he');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.getByRole('tab', { name: /מטרות/ })).toBeVisible();
  await page.getByRole('tab', { name: /תרגילים/ }).click();
  await expect(page.getByText('פעילות בתרגילים')).toBeVisible();
});
