import { test, expect } from '@playwright/test';
import { mockApi } from '../helpers/ui';

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:5173';

async function prepare(page: import('@playwright/test').Page) {
  await mockApi(page);
  await page.addInitScript(() => {
    localStorage.setItem('language', 'he');
    localStorage.setItem('chat_consent_accepted', 'true');
    localStorage.setItem('age_verified', 'true');
    window.__TEST_APP_ID__ = 'test-app-id';
    window.__DISABLE_ANALYTICS__ = true;
  });
}

async function expectNoHorizontalOverflow(page: import('@playwright/test').Page) {
  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 2);
}

async function waitForPageChunk(page: import('@playwright/test').Page) {
  await expect(page.getByRole('status', { name: 'Loading page' })).toBeHidden({ timeout: 20000 });
}

test.describe('Stage 15 iOS Native device matrix', () => {
  test.beforeEach(async ({ page }) => {
    await prepare(page);
  });

  test('renders the app shell inside iPhone and iPad safe bounds', async ({ page }) => {
    await page.goto(`${BASE_URL}/Home`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#root')).not.toBeEmpty();
    await expect(page.locator('#app-scroll-container')).toBeVisible();
    await expectNoHorizontalOverflow(page);

    const viewport = page.viewportSize();
    const scrollBox = await page.locator('#app-scroll-container').boundingBox();
    expect(viewport).not.toBeNull();
    expect(scrollBox).not.toBeNull();
    expect(scrollBox?.x || 0).toBeGreaterThanOrEqual(0);
    expect((scrollBox?.x || 0) + (scrollBox?.width || 0)).toBeLessThanOrEqual((viewport?.width || 0) + 2);
  });

  test('survives portrait and landscape changes without clipping', async ({ page }) => {
    await page.goto(`${BASE_URL}/Home`, { waitUntil: 'domcontentloaded' });

    for (const viewport of [
      { width: 393, height: 852 },
      { width: 852, height: 393 },
      { width: 834, height: 1194 },
      { width: 1194, height: 834 },
    ]) {
      await page.setViewportSize(viewport);
      await page.waitForTimeout(100);
      await expect(page.locator('#root')).not.toBeEmpty();
      await expectNoHorizontalOverflow(page);
      const height = await page.locator('#app-scroll-container').evaluate((element) =>
        (element as HTMLElement).getBoundingClientRect().height
      );
      expect(height).toBeGreaterThan(0);
    }
  });

  test('keeps the chat composer visible and prevents iOS focus zoom', async ({ page }) => {
    await page.goto(`${BASE_URL}/Chat`, { waitUntil: 'domcontentloaded' });
    const composer = page.getByTestId('therapist-chat-input');
    await expect(composer).toBeVisible({ timeout: 20000 });
    await composer.focus();
    await composer.fill('בדיקת מקלדת iOS');
    await expect(composer).toHaveValue('בדיקת מקלדת iOS');

    const result = await composer.evaluate((element) => {
      const rect = (element as HTMLElement).getBoundingClientRect();
      return {
        bottom: rect.bottom,
        viewportHeight: window.visualViewport?.height || window.innerHeight,
        fontSize: Number.parseFloat(getComputedStyle(element).fontSize),
      };
    });
    expect(result.bottom).toBeLessThanOrEqual(result.viewportHeight + 2);
    expect(result.fontSize).toBeGreaterThanOrEqual(16);
  });

  test('accepts files through the WKWebView document picker contract', async ({ page }) => {
    await page.goto(`${BASE_URL}/Chat`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('chat-root')).toBeVisible({ timeout: 20000 });
    const input = page.getByTestId('chat-file-input');
    await expect(input).toHaveAttribute('accept', /image\/\*/);
    await expect(input).toHaveAttribute('accept', /\.txt/);

    await input.setInputFiles({
      name: 'ios-stage15.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('Synthetic Stage 15 iOS upload'),
    });

    await expect(page.getByText('ios-stage15.txt')).toBeVisible({ timeout: 10000 });
  });

  test('recovers after background-style lifecycle events and navigation', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto(`${BASE_URL}/Home`, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true }));
      document.dispatchEvent(new Event('visibilitychange'));
      window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
    });

    for (const path of ['/Journal', '/Tools', '/Chat', '/Home']) {
      await waitForPageChunk(page);
      const link = page.locator(`a[href="${path}"]:visible`).first();
      await expect(link).toBeVisible({ timeout: 10000 });
      await link.click();
      await expect(page).toHaveURL(new RegExp(`${path}$`));
      await waitForPageChunk(page);
      await expect(page.locator(`a[href="${path}"][aria-current="page"]:visible`).first()).toBeVisible({ timeout: 10000 });
      await expect(page.locator('#root')).not.toBeEmpty();
      await expectNoHorizontalOverflow(page);
    }
  });
});
