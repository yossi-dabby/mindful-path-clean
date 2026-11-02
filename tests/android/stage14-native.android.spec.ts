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

async function expectDestinationReady(page: import('@playwright/test').Page, path: string) {
  const markers: Record<string, import('@playwright/test').Locator> = {
    '/Journal': page.getByTestId('journal-page'),
    '/MyPath': page.getByRole('heading', { name: 'המסלול שלי' }),
    '/Tools': page.getByRole('heading', { name: 'כלים' }),
    '/Chat': page.getByTestId('chat-root'),
    '/Home': page.getByTestId('daily-path'),
  };
  await expect(markers[path]).toBeVisible({ timeout: 20000 });
}

test.describe('Stage 14 Android Native device matrix', () => {
  test.beforeEach(async ({ page }) => {
    await prepare(page);
  });

  test('renders the Home shell with safe navigation clearance', async ({ page }) => {
    await page.goto(`${BASE_URL}/Home`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#root')).not.toBeEmpty();
    await expectNoHorizontalOverflow(page);

    const appScroll = page.locator('#app-scroll-container');
    await expect(appScroll).toBeVisible();

    const nav = page.getByRole('navigation', { name: 'Main navigation' });
    if (await nav.isVisible().catch(() => false)) {
      const navBox = await nav.boundingBox();
      const viewport = page.viewportSize();
      expect(navBox).not.toBeNull();
      expect(viewport).not.toBeNull();
      expect((navBox?.y || 0) + (navBox?.height || 0)).toBeLessThanOrEqual((viewport?.height || 0) + 2);
    }
  });

  test('survives portrait and landscape without clipped page content', async ({ page }) => {
    await page.goto(`${BASE_URL}/Home`, { waitUntil: 'domcontentloaded' });

    for (const viewport of [
      { width: 393, height: 851 },
      { width: 851, height: 393 },
    ]) {
      await page.setViewportSize(viewport);
      await page.waitForTimeout(100);
      await expect(page.locator('#root')).not.toBeEmpty();
      await expectNoHorizontalOverflow(page);
      const appScrollHeight = await page.locator('#app-scroll-container').evaluate((element) =>
        (element as HTMLElement).getBoundingClientRect().height
      );
      expect(appScrollHeight).toBeGreaterThan(0);
    }
  });

  test('keeps the chat composer usable with a focused mobile keyboard target', async ({ page }) => {
    await page.goto(`${BASE_URL}/Chat`, { waitUntil: 'domcontentloaded' });
    const composer = page.getByTestId('therapist-chat-input');
    await expect(composer).toBeVisible({ timeout: 20000 });
    await composer.focus();
    await composer.fill('בדיקת מקלדת Android');
    await expect(composer).toHaveValue('בדיקת מקלדת Android');

    const box = await composer.boundingBox();
    const viewport = page.viewportSize();
    expect(box).not.toBeNull();
    expect(viewport).not.toBeNull();
    expect((box?.y || 0) + (box?.height || 0)).toBeLessThanOrEqual((viewport?.height || 0) + 2);
  });

  test('accepts a synthetic TXT file through the Android-compatible file picker', async ({ page }) => {
    await page.goto(`${BASE_URL}/Chat`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('chat-root')).toBeVisible({ timeout: 20000 });
    await expect(page.getByTestId('therapist-chat-input')).toBeEnabled();
    const input = page.getByTestId('chat-file-input');
    await expect(input).toHaveAttribute('accept', /\.txt/);

    await input.setInputFiles({
      name: 'android-stage14.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('Synthetic Stage 14 Android upload'),
    });

    await expect(page.getByText('android-stage14.txt')).toBeVisible({ timeout: 10000 });
  });

  test('remains stable through repeated tab navigation', async ({ page }) => {
    test.setTimeout(120000);
    await page.goto(`${BASE_URL}/Home`, { waitUntil: 'domcontentloaded' });
    const paths = ['/Journal', '/MyPath', '/Tools', '/Chat', '/Home'];

    for (const path of paths) {
        await waitForPageChunk(page);
        const link = page.locator(`a[href="${path}"]`).filter({ visible: true }).first();
        await expect(link).toBeVisible({ timeout: 10000 });
        await link.click();
        await expect(page).toHaveURL(new RegExp(`${path}$`));
        await waitForPageChunk(page);
        await expectDestinationReady(page, path);
        await expect(page.locator('#root')).not.toBeEmpty();
        await expectNoHorizontalOverflow(page);
    }
  });
});
