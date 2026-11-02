import { test, expect } from '@playwright/test';
import { mockApi } from '../helpers/ui';

const BASE_URL =
  process.env.PLAYWRIGHT_TEST_BASE_URL ||
  process.env.E2E_BASE_URL ||
  process.env.BASE_URL ||
  'http://127.0.0.1:5173';

async function prepareCoach(page, language = 'en') {
  await mockApi(page);
  await page.addInitScript(({ language }) => {
    localStorage.setItem('language', language);
    localStorage.setItem('i18nextLng', language);
    localStorage.setItem('chat_consent_accepted', 'true');
    localStorage.setItem('age_verified', 'true');
    (window as any).__TEST_APP_ID__ = 'test-app-id';
    (window as any).__DISABLE_ANALYTICS__ = true;
  }, { language });

  await page.goto(`${BASE_URL}/Coach`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await expect(page.getByTestId('coach-page')).toBeVisible({ timeout: 20000 });
}

test.describe('Coach responsive experience', () => {
  test.beforeEach(async ({ page }) => {
    await prepareCoach(page);
  });

  test('renders a localised empty state and starts the session wizard', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Welcome to AI coaching/i })).toBeVisible();
    const start = page.getByTestId('coach-start-first');
    await expect(start).toBeVisible();
    await expect(start).toHaveText(/Start your first session/i);

    await start.click();
    await expect(page.getByTestId('coach-wizard')).toBeVisible();
    await expect(page.getByRole('heading', { name: /Start a new coaching session/i })).toBeVisible();
  });

  test('focus selection is keyboard-accessible and enables the next step', async ({ page }) => {
    await page.getByTestId('coach-start-first').click();
    const moodFocus = page.getByTestId('coach-focus-mood_improvement');
    await moodFocus.focus();
    await page.keyboard.press('Enter');
    await expect(moodFocus).toHaveAttribute('aria-pressed', 'true');

    const next = page.getByTestId('coach-wizard-next');
    await expect(next).toBeEnabled();
    await next.click();
    await expect(page.getByRole('heading', { name: /Tell your coach a little more/i })).toBeVisible();
  });

  test('has no horizontal overflow at phone, tablet and desktop widths', async ({ page }) => {
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

  test('wizard keeps its primary controls within the mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    await page.getByTestId('coach-start-first').click();

    const wizard = page.getByTestId('coach-wizard');
    const next = page.getByTestId('coach-wizard-next');
    await expect(wizard).toBeVisible();
    await expect(next).toBeVisible();

    const box = await next.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(362);
    expect(box!.y + box!.height).toBeLessThanOrEqual(642);
  });
});

test('Coach renders Hebrew copy and RTL direction', async ({ page }) => {
  await prepareCoach(page, 'he');
  await expect(page.getByRole('heading', { name: /ברוכים הבאים לאימון האישי עם AI/ })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.getByTestId('coach-start-first')).toHaveText(/התחילו את המפגש הראשון/);
});
