import { test, expect, type Page, type Locator } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { mockApi } from '../helpers/ui';

const worksheet = 'MP-ANX-01-W-CH-HE';
const guide = 'MP-ANX-01-G-ALL-HE';

async function session(page: Page) {
  await mockApi(page);
  await page.route('**/api/apps/*/entities/User/me', route => route.fulfill({ json: {
    id: 'fixture-admin', email: 'fixture@example.com', role: 'admin', onboarding_completed: true,
  } }));
  await page.route('**/api/apps/*/functions/getHebrewFormsPilot', async route => {
    await route.fulfill({ response: await route.fetch({ url: 'http://127.0.0.1:3006/' }) });
  });
  await page.addInitScript(() => {
    localStorage.setItem('language', 'he');
    localStorage.setItem('base44_access_token', 'pilot-admin-fixture');
  });
  await page.goto('/Tools');
  await page.getByRole('link', { name: 'טפסי CBT', exact: true }).click();
  await page.getByTestId('pilot-age-CH').click();
  await page.getByTestId('pilot-track-anxiety').click();
  await page.getByTestId('pilot-unit-ANX-01').click();
}

async function open(page: Page, id = worksheet) {
  await page.getByTestId(`pilot-form-${id}`).getByRole('button', { name: 'פתח', exact: true }).click();
  await expect(page.locator('[data-pdf-page="1"]')).toHaveAttribute('data-rendered', 'true');
}

async function bitmap(page: Locator) {
  await expect(page).toHaveAttribute('data-rendered', 'true');
  await expect.poll(async () => page.evaluate(el => Math.abs(Number((el as HTMLElement).dataset.renderWidth) - el.getBoundingClientRect().width))).toBeLessThan(1);
  return page.locator('canvas').evaluate((canvas: HTMLCanvasElement) => ({
    width: canvas.width, height: canvas.height, css: canvas.getBoundingClientRect().width,
    dpr: devicePixelRatio, viewport: innerWidth,
  }));
}

test.afterEach(async ({ page }) => { await page.unrouteAll({ behavior: 'wait' }); });

test('HiDPI rendering, full width, fresh zoom detail, focus and unchanged download', async ({ page }, info) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  let requests = 0;
  page.on('request', request => { if (request.url().includes('/functions/getHebrewFormsPilot')) requests++; });
  await session(page); await open(page);
  const inline = await bitmap(page.locator('[data-pdf-page="1"]'));
  expect(inline.width).toBe(Math.floor(inline.css * inline.dpr));
  const before = requests;
  await page.getByTestId('pdf-reader-open').click();
  const dialog = page.getByTestId('pdf-reader-dialog');
  await expect(dialog).toBeVisible();
  const fit = await bitmap(dialog.locator('[data-pdf-page="1"]'));
  expect(fit.css).toBeGreaterThan(fit.viewport * 0.9);
  for (let i = 0; i < 4; i++) await page.getByTestId('pdf-zoom-in').click();
  await expect(page.getByTestId('pdf-zoom-value')).toHaveText('200%');
  const zoomed = await bitmap(dialog.locator('[data-pdf-page="1"]'));
  expect(zoomed.css).toBeCloseTo(fit.css * 2, 0);
  expect(zoomed.width).toBeGreaterThan(fit.width);
  expect(zoomed.width * zoomed.height).toBeLessThanOrEqual(8_000_000);
  await page.screenshot({ path: info.outputPath('reader-200-percent.png') });
  await page.getByTestId('pdf-fit-width').click();
  await expect(page.getByTestId('pdf-zoom-value')).toHaveText('100%');
  await bitmap(dialog.locator('[data-pdf-page="1"]'));
  const originalViewport = page.viewportSize()!;
  await page.setViewportSize({ width: originalViewport.height, height: originalViewport.width });
  await expect.poll(async () => (await bitmap(dialog.locator('[data-pdf-page="1"]'))).css).toBeGreaterThan(originalViewport.height * 0.9);
  await page.setViewportSize(originalViewport);
  await expect.poll(async () => (await bitmap(dialog.locator('[data-pdf-page="1"]'))).css).toBeCloseTo(fit.css, 0);
  expect(requests).toBe(before);
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(page.getByTestId('pdf-reader-open')).toBeFocused();
  await bitmap(page.locator('[data-pdf-page="1"]'));
  const pending = page.waitForEvent('download');
  await page.getByTestId(`pilot-form-${worksheet}`).getByRole('button', { name: 'הורד', exact: true }).click();
  const download = await pending;
  const downloaded = await readFile((await download.path())!);
  const original = await readFile(`server/private/forms/${worksheet}.pdf`);
  expect(createHash('sha256').update(downloaded).digest('hex')).toBe(createHash('sha256').update(original).digest('hex'));
  expect(errors).toEqual([]);
});

test('long guides release distant canvases, render the last page and restore navigation', async ({ page }) => {
  await session(page); await open(page, guide);
  await page.getByTestId('pdf-reader-open').click();
  const dialog = page.getByTestId('pdf-reader-dialog');
  await expect(dialog.locator('[data-pdf-page]')).toHaveCount(4);
  const last = dialog.locator('[data-pdf-page="4"]');
  await expect.poll(() => last.locator('canvas').evaluate((c: HTMLCanvasElement) => c.width)).toBe(0);
  await last.scrollIntoViewIfNeeded();
  await bitmap(last);
  await expect.poll(() => dialog.locator('[data-pdf-page="1"] canvas').evaluate((c: HTMLCanvasElement) => c.width)).toBe(0);
  await page.getByTestId('pdf-reader-close').click();
  await page.getByTestId('pilot-back').click();
  await expect(page.getByTestId(`pilot-form-${worksheet}`)).toBeVisible();
  await expect(page.getByTestId('pilot-pdf-preview')).toHaveCount(0);
});

test('two-finger pinch redraws the PDF and one-finger panning remains available', async ({ page }) => {
  await session(page); await open(page);
  await page.getByTestId('pdf-reader-open').click();
  const scroller = page.getByTestId('pdf-reader-scroll');
  const first = page.getByTestId('pdf-reader-dialog').locator('[data-pdf-page="1"]');
  const fit = await bitmap(first);
  const box = (await scroller.boundingBox())!;
  const x = box.x + box.width / 2, y = box.y + Math.min(180, box.height / 2);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 2 });
  const fingers = (spread: number) => [{ x: x - spread, y, id: 0 }, { x: x + spread, y, id: 1 }];
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: fingers(30) });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: fingers(60) });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(page.getByTestId('pdf-zoom-value')).toHaveText('200%');
  const zoomed = await bitmap(first);
  expect(zoomed.width).toBeGreaterThan(fit.width);
  expect(await page.evaluate(() => window.visualViewport?.scale)).toBe(1);
  const before = await scroller.evaluate(el => el.scrollLeft);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 0 }] });
  for (const move of [30, 60, 90]) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x - move, y, id: 0 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect.poll(() => scroller.evaluate(el => el.scrollLeft)).toBeGreaterThan(before);
  await cdp.detach();
});
