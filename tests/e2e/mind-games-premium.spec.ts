import { expect, test, type Page } from '@playwright/test';
import { mockApi } from '../helpers/ui';

const BASE_URL =
  process.env.PLAYWRIGHT_TEST_BASE_URL ||
  process.env.E2E_BASE_URL ||
  process.env.BASE_URL ||
  'http://127.0.0.1:5173';

async function prepareMindGames(page: Page, viewport = { width: 390, height: 844 }) {
  await page.setViewportSize(viewport);
  await page.addInitScript(() => {
    localStorage.setItem('language', 'he');
    localStorage.setItem('i18nextLng', 'he');
    localStorage.setItem('age_verified', 'true');
    localStorage.setItem('chat_consent_accepted', 'true');
    (window as any).__TEST_APP_ID__ = 'test-app-id';
    (window as any).__DISABLE_ANALYTICS__ = true;
  });
  await mockApi(page);
  await page.goto(`${BASE_URL}/ExperientialGames`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await expect(page.getByTestId('mindgames-hub')).toBeVisible({ timeout: 20_000 });
}

test.describe('Premium mind games hub', () => {
  test('offers localized search, filters and an honest empty state', async ({ page }) => {
    await prepareMindGames(page);

    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.getByRole('heading', { name: 'משחקים קצרים. מיומנויות שנשארות.' })).toBeVisible();
    await expect(page.getByTestId('mindgames-results-count')).toContainText('29');

    await page.getByTestId('mindgames-filter-focus').click();
    await expect(page.getByTestId('mindgames-results-count')).toContainText('5');
    await expect(page.getByTestId('mindgames-grid').getByTestId(/mindgame-card-/)).toHaveCount(5);

    await page.getByTestId('mindgames-search').fill('התאמת זיכרון');
    await expect(page.getByTestId('mindgames-results-count')).toContainText('1');
    await expect(page.getByTestId('mindgame-card-memory-match')).toBeVisible();

    await page.getByTestId('mindgames-search').fill('אין משחק כזה');
    await expect(page.getByTestId('mindgames-empty-state')).toBeVisible();
    await expect(page.getByTestId('mindgames-empty-state')).toContainText('לא נמצאו משחקים מתאימים');
    await page.getByRole('button', { name: 'הצגת כל המשחקים' }).click();
    await expect(page.getByTestId('mindgames-results-count')).toContainText('29');
  });

  test('supports keyboard play, accessible information and Escape close', async ({ page }) => {
    await prepareMindGames(page, { width: 1440, height: 900 });

    const infoButton = page.getByTestId('mindgame-info-memory-match').last();
    const infoBox = await infoButton.boundingBox();
    expect(infoBox).not.toBeNull();
    expect(infoBox!.width).toBeGreaterThanOrEqual(43);
    expect(infoBox!.height).toBeGreaterThanOrEqual(43);
    await infoButton.focus();
    await page.keyboard.press('Enter');

    const infoDialog = page.getByTestId('mindgame-info-dialog');
    await expect(infoDialog).toBeVisible();
    await expect(infoDialog).toContainText('התאמת זיכרון');
    await page.keyboard.press('Escape');
    await expect(infoDialog).not.toBeVisible();

    const gameButton = page.getByTestId('mindgame-card-memory-match').last();
    await gameButton.focus();
    await expect(gameButton).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('mindgame-modal-memory-match')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('mindgame-modal-memory-match')).not.toBeVisible();
  });

  test('keeps the hub and game dialog inside mobile and desktop viewports', async ({ page }) => {
    await prepareMindGames(page);

    for (const viewport of [
      { width: 360, height: 780 },
      { width: 768, height: 1024 },
      { width: 1440, height: 900 },
    ]) {
      await page.setViewportSize(viewport);
      const widths = await page.evaluate(() => ({
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: document.documentElement.clientWidth,
      }));
      expect(widths.documentWidth).toBeLessThanOrEqual(widths.viewportWidth + 2);
    }

    await page.getByTestId('mindgame-card-thought-quiz').last().click();
    const dialog = page.getByTestId('mindgame-modal-thought-quiz');
    await expect(dialog).toBeVisible();
    const box = await dialog.boundingBox();
    const viewport = page.viewportSize();
    expect(box).not.toBeNull();
    expect(viewport).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(-1);
    expect(box!.x + box!.width).toBeLessThanOrEqual(viewport!.width + 1);
    expect(box!.height).toBeLessThanOrEqual(viewport!.height + 1);
  });
});
