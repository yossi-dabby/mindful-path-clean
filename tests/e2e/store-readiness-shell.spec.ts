import { test, expect, type Page } from '@playwright/test';
import { mockApi } from '../helpers/ui';

// Keep the project's browser engine so the same cases also run in WebKit.
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

async function prepare(page: Page, language = 'en') {
  await mockApi(page);
  await page.addInitScript(language => {
    localStorage.setItem('language', language);
    localStorage.setItem('i18nextLng', language);
    localStorage.setItem('chat_consent_accepted', 'true');
    (window as any).__TEST_APP_ID__ = 'test-app-id';
    (window as any).__DISABLE_ANALYTICS__ = true;
  }, language);
}

const tab = (page: Page, path: string) => page.locator(`[data-mobile-bottom-nav] a[href="/${path}"]`);

test('Back preserves browser history when the previous entry is the tab parent', async ({ page }) => {
  await prepare(page);
  await page.goto('/Tools');
  await page.locator('[data-tool="exercises"]').click();
  await expect(page.locator('[data-app-page-name="Exercises"]')).toBeVisible();
  const before = await page.evaluate(() => window.history.state.idx);
  await page.locator('[data-mobile-header]').getByRole('button', { name: 'Back', exact: true }).click();
  await expect(page).toHaveURL(/\/Tools$/);
  expect(await page.evaluate(() => window.history.state.idx)).toBe(before - 1);
  await page.goForward();
  await expect(page.locator('[data-app-page-name="Exercises"]')).toBeVisible();
});

async function visitTwoTabStacks(page: Page) {
  await page.goto('/Tools');
  await page.locator('[data-tool="exercises"]').click();
  await expect(page.locator('[data-app-page-name="Exercises"]')).toBeVisible();
  await tab(page, 'MyPath').click();
  await page.locator('#app-scroll-container a[href="/Goals"]').click();
  await expect(page.locator('[data-app-page-name="Goals"]')).toBeVisible();
  await tab(page, 'Tools').click();
  await expect(page.locator('[data-app-page-name="Exercises"]')).toBeVisible();
}

for (const action of ['header', 'native-event']) {
  test(`Back stays in the restored tab after visiting another tab stack: ${action}`, async ({ page }) => {
    await prepare(page);
    await visitTwoTabStacks(page);
    if (action === 'header') {
      await page.locator('[data-mobile-header]').getByRole('button', { name: 'Back', exact: true }).click();
    } else {
      const handled = await page.evaluate(() => !window.dispatchEvent(new CustomEvent('mindfulpath:back-request', { cancelable: true })));
      expect(handled).toBe(true);
    }
    await expect(page).toHaveURL(/\/Tools$/);
    await expect(page.locator('[data-tool="exercises"]')).toBeVisible();
    await expect(page.locator('[data-mobile-header]').getByRole('button', { name: 'Back', exact: true })).toHaveCount(0);
    await tab(page, 'MyPath').click();
    await expect(page.locator('[data-app-page-name="Goals"]')).toBeVisible();
    await page.locator('[data-mobile-header]').getByRole('button', { name: 'Back', exact: true }).click();
    await expect(page).toHaveURL(/\/MyPath$/);
  });
}

for (const language of ['en', 'he']) for (const width of [390, 844]) {
  test(`Side safe areas protect the shell and content: ${language}/${width}`, async ({ page }) => {
    await prepare(page, language);
    await page.setViewportSize({ width, height: width === 390 ? 844 : 390 });
    await page.goto('/Home');
    await expect(page.getByTestId('daily-path')).toBeVisible();
    // Browser emulation has zero hardware insets. Inject nonzero values into
    // the same CSS variables populated by env() on a real notched device.
    await page.evaluate(() => {
      document.documentElement.style.setProperty('--sal', '36px');
      document.documentElement.style.setProperty('--sar', '20px');
    });
    const geometry = await page.evaluate(() => {
      const main = getComputedStyle(document.getElementById('app-scroll-container')!);
      const sidebar = document.querySelector('.garden-sidebar')!.getBoundingClientRect();
      const header = document.querySelector('[data-mobile-header] > div')!;
      const nav = document.querySelector('[data-mobile-bottom-nav]')!;
      return {
        left: parseFloat(main.paddingLeft), right: parseFloat(main.paddingRight),
        sidebarLeft: sidebar.left, sidebarRight: sidebar.right,
        headerLeft: parseFloat(getComputedStyle(header).paddingLeft),
        headerRight: parseFloat(getComputedStyle(header).paddingRight),
        navLeft: parseFloat(getComputedStyle(nav).paddingLeft),
        navRight: parseFloat(getComputedStyle(nav).paddingRight),
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });
    expect(geometry.left).toBeGreaterThanOrEqual(36);
    expect(geometry.right).toBeGreaterThanOrEqual(20);
    expect(geometry.overflow).toBeLessThanOrEqual(2);
    if (width === 390) {
      expect(geometry.headerLeft).toBeGreaterThanOrEqual(36);
      expect(geometry.headerRight).toBeGreaterThanOrEqual(20);
      expect(geometry.navLeft).toBeGreaterThanOrEqual(36);
      expect(geometry.navRight).toBeGreaterThanOrEqual(20);
    } else {
      expect(geometry.sidebarLeft).toBeGreaterThanOrEqual(36);
      expect(geometry.sidebarRight).toBeLessThanOrEqual(width - 20);
      expect(language === 'he' ? geometry.right : geometry.left).toBeGreaterThanOrEqual(288 + (language === 'he' ? 20 : 36));
    }
  });
}
