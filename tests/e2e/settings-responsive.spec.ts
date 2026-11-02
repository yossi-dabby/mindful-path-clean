import { test, expect } from '@playwright/test';
import { mockApi } from '../helpers/ui';

const BASE_URL =
  process.env.PLAYWRIGHT_TEST_BASE_URL ||
  process.env.E2E_BASE_URL ||
  process.env.BASE_URL ||
  'http://127.0.0.1:5173';

async function prepareSettings(page, language = 'en', viewport = { width: 390, height: 844 }) {
  await page.setViewportSize(viewport);
  await mockApi(page);
  await page.addInitScript(({ language }) => {
    localStorage.setItem('language', language);
    localStorage.setItem('i18nextLng', language);
    localStorage.setItem('age_verified', 'true');
    localStorage.setItem('chat_consent_accepted', 'true');
    (window as any).__TEST_APP_ID__ = 'test-app-id';
    (window as any).__DISABLE_ANALYTICS__ = true;
  }, { language });

  await page.goto(BASE_URL + '/Settings', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await expect(page.getByTestId('settings-hero')).toBeVisible({ timeout: 20000 });
}

test.describe('Premium settings and mobile menu', () => {
  test('Settings has no horizontal overflow on mobile, tablet and desktop', async ({ page }) => {
    await prepareSettings(page);

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
    }
  });

  test('mobile menu exposes complete navigation and current-page state', async ({ page }) => {
    await prepareSettings(page);
    await page.getByTestId('mobile-menu-button').click();

    const drawer = page.getByTestId('mobile-drawer');
    await expect(drawer).toBeVisible();
    for (const item of ['home', 'chat', 'my-path', 'journal', 'tools']) {
      await expect(page.getByTestId(`mobile-nav-${item}`), item).toBeVisible();
    }
    await expect(page.getByTestId('mobile-nav-settings')).toHaveAttribute('aria-current', 'page');

    await expect.poll(async () => {
      const box = await drawer.boundingBox();
      return box?.x ?? -999;
    }, { timeout: 3000 }).toBeGreaterThanOrEqual(-1);

    const box = await drawer.boundingBox();
    const viewport = page.viewportSize();
    expect(box).not.toBeNull();
    expect(viewport).not.toBeNull();
    expect(box!.x + box!.width).toBeLessThanOrEqual(viewport!.width + 2);
  });

  test('Hebrew Settings is RTL and notification copy is fully localised', async ({ page }) => {
    await prepareSettings(page, 'he');

    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.getByText('התראות בתוך האפליקציה')).toBeVisible();
    await expect(page.getByText('התראות בדוא״ל')).toBeVisible();
    await expect(page.getByText('Daily Check-in Reminders')).toHaveCount(0);
    await expect(page.getByText('Email Notifications', { exact: true })).toHaveCount(0);
  });

  test('upgrade action is unavailable while subscriptions are disabled', async ({ page }) => {
    await prepareSettings(page);
    await expect(page.getByTestId('settings-upgrade-button')).toBeDisabled();
  });

  test('quick navigation keeps large touch targets on mobile', async ({ page }) => {
    await prepareSettings(page);
    const buttons = page.getByTestId('settings-quick-nav').getByRole('button');
    await expect(buttons.first()).toBeVisible();

    const count = await buttons.count();
    expect(count).toBeGreaterThanOrEqual(6);
    for (let index = 0; index < count; index += 1) {
      const box = await buttons.nth(index).boundingBox();
      expect(box).not.toBeNull();
      expect(box!.height).toBeGreaterThanOrEqual(43);
    }
  });
});
