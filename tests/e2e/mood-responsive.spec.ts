import { test, expect } from '@playwright/test';
import { mockApi } from '../helpers/ui';

const BASE_URL =
  process.env.PLAYWRIGHT_TEST_BASE_URL ||
  process.env.E2E_BASE_URL ||
  process.env.BASE_URL ||
  'http://127.0.0.1:5173';

async function prepareMood(page, language = 'en') {
  await mockApi(page);
  await page.addInitScript(({ language }) => {
    localStorage.setItem('language', language);
    localStorage.setItem('i18nextLng', language);
    localStorage.setItem('chat_consent_accepted', 'true');
    localStorage.setItem('age_verified', 'true');
    (window as any).__TEST_APP_ID__ = 'test-app-id';
    (window as any).__DISABLE_ANALYTICS__ = true;
  }, { language });

  await page.goto(`${BASE_URL}/MoodTracker`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await expect(page.getByTestId('mood-tracker')).toBeVisible({ timeout: 20000 });
}

test.describe('Mood tracker responsive experience', () => {
  test.beforeEach(async ({ page }) => {
    await prepareMood(page);
  });

  test('opens each subpage and the accessible mood form', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Mood Tracker/i })).toBeVisible();
    await page.getByRole('tab', { name: /Calendar/i }).click();
    await expect(page.getByTestId('mood-calendar')).toBeVisible();

    await page.getByRole('tab', { name: /AI Insights/i }).click();
    await expect(page.getByTestId('mood-insights-empty')).toBeVisible();

    await page.getByTestId('mood-log-button').click();
    const dialog = page.getByTestId('mood-entry-dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('[aria-pressed="true"]').first()).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });

  test('has no page-level horizontal overflow at phone, tablet and desktop widths', async ({ page }) => {
    for (const viewport of [
      { width: 360, height: 780 },
      { width: 768, height: 1024 },
      { width: 1440, height: 900 },
    ]) {
      await page.setViewportSize(viewport);
      const sizes = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(sizes.scrollWidth).toBeLessThanOrEqual(sizes.clientWidth + 2);
    }
  });

  test('keeps the mood form inside a small phone viewport', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    await page.getByTestId('mood-log-button').click();
    const dialog = page.getByTestId('mood-entry-dialog');
    await expect(dialog).toBeVisible();
    const box = await dialog.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(362);
    expect(box!.height).toBeLessThanOrEqual(590);
  });
});

test('Mood tracker renders Hebrew copy and RTL direction', async ({ page }) => {
  await prepareMood(page, 'he');
  await expect(page.getByRole('heading', { name: /מעקב אחר מצב רוח/ })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await page.getByRole('tab', { name: /לוח שנה/ }).click();
  await expect(page.getByText(/לוח מצב הרוח/)).toBeVisible();
});
