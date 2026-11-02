import { test, expect, type Page } from '@playwright/test';
import { mockApi } from '../helpers/ui';

const BASE_URL =
  process.env.PLAYWRIGHT_TEST_BASE_URL ||
  process.env.E2E_BASE_URL ||
  process.env.BASE_URL ||
  'http://127.0.0.1:5173';

async function prepareStarterPath(page: Page, language = 'he') {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(({ language }) => {
    localStorage.setItem('language', language);
    localStorage.setItem('i18nextLng', language);
    localStorage.setItem('age_verified', 'true');
    localStorage.setItem('chat_consent_accepted', 'true');
    (window as any).__TEST_APP_ID__ = 'test-app-id';
    (window as any).__DISABLE_ANALYTICS__ = true;
  }, { language });

  await mockApi(page);

  await page.route('**/entities/StarterPath**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{
        id: 'starter-path-test-1',
        current_day: 1,
        started_date: '2026-09-04',
        completed: false,
        day_exercises: {}
      }])
    });
  });

  await page.route('**/integration-endpoints/Core/InvokeLLM**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        introduction: language === 'he' ? 'נתחיל בהתבוננות קצרה.' : 'Start with a short reflection.',
        main_prompt: language === 'he' ? 'איזו מחשבה עלתה ברגע הזה?' : 'What thought appeared in that moment?',
        guidance: language === 'he' ? 'כתבו בקצרה ובכנות.' : 'Write briefly and honestly.',
        example: language === 'he' ? 'דוגמה: אני לא בטוח, אבל אוכל לנסות צעד קטן.' : 'Example: I am unsure, but I can try one small step.'
      })
    });
  });
}

test.describe('Premium seven-day starter path', () => {
  test('opens from My Path and renders the exercise example with readable contrast', async ({ page }) => {
    await prepareStarterPath(page);
    await page.goto(`${BASE_URL}/MyPath`, { waitUntil: 'domcontentloaded', timeout: 30000 });

    const pathLink = page.locator('a[href="/StarterPath"]');
    await expect(pathLink).toBeVisible({ timeout: 20000 });
    await pathLink.click();
    await expect(page).toHaveURL(/\/StarterPath$/);

    const begin = page.getByTestId('starter-path-begin');
    await expect(begin).toBeVisible({ timeout: 20000 });
    await begin.click();

    const example = page.getByTestId('starter-path-example');
    await expect(example).toBeVisible();
    await expect(example).toContainText('דוגמה:');
    await expect(example).toHaveClass(/bg-secondary\/70/);

    const colors = await example.evaluate((element) => {
      const text = element.querySelector('p');
      if (!text) throw new Error('Exercise example text is missing');
      const rgb = (value: string) => value.match(/[\d.]+/g)!.map(Number);
      const foreground = rgb(getComputedStyle(text).color);
      let background = [255, 255, 255];
      const ancestors: Element[] = [];
      for (let parent: Element | null = text; parent; parent = parent.parentElement) ancestors.unshift(parent);
      for (const parent of ancestors) {
        const color = rgb(getComputedStyle(parent).backgroundColor);
        const alpha = color[3] ?? 1;
        background = background.map((value, i) => color[i] * alpha + value * (1 - alpha));
      }
      const luminance = (color: number[]) => color.slice(0, 3).map(value => value / 255)
        .map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4)
        .reduce((sum, value, i) => sum + value * [.2126, .7152, .0722][i], 0);
      const a = luminance(foreground), b = luminance(background);
      return { contrast: (Math.max(a, b) + .05) / (Math.min(a, b) + .05) };
    });
    expect(colors.contrast).toBeGreaterThanOrEqual(4.5);
  });

  test('is RTL in Hebrew and remains within mobile, tablet and desktop widths', async ({ page }) => {
    await prepareStarterPath(page);
    await page.goto(`${BASE_URL}/StarterPath`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await expect(page.getByTestId('starter-path-page')).toBeVisible({ timeout: 20000 });
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');

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
});
