import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { mockApi } from '../helpers/ui';

const proxy = '**/api/apps/*/functions/getHebrewFormsPilot';
const preview = '/tests/fixtures/hebrew-pilot-preview.html?language=en&switcher=1';
const worksheet = 'MP-MOOD-03-W-CH-EN';
const guide = 'MP-MOOD-03-G-ALL-EN';

async function session(page: Page, role = 'admin') {
  await mockApi(page);
  await page.route('https://fonts.googleapis.com/**', route => route.fulfill({ contentType: 'text/css', body: '' }));
  await page.route('**/api/apps/*/entities/User/me', route => route.fulfill({ json: {
    id: 'fixture-user', role, onboarding_completed: true,
  } }));
  await page.route(proxy, async route => {
    await route.fulfill({ response: await route.fetch({ url: 'http://127.0.0.1:3006/' }) });
  });
  await page.addInitScript(value => {
    localStorage.setItem('language', 'en');
    localStorage.setItem('base44_access_token', value === 'admin' ? 'pilot-admin-fixture' : 'pilot-user-fixture');
  }, role);
}
async function selectUnit(page: Page, age = 'CH') {
  await page.getByTestId(`pilot-age-${age}`).click();
  await expect(page.locator('[data-testid^="pilot-track-"]')).toHaveCount(5);
  await page.getByTestId('pilot-track-mood').click();
  await expect(page.locator('[data-testid^="pilot-unit-"]')).toHaveCount(6);
  await page.getByTestId('pilot-unit-MOOD-03').click();
  await expect(page.locator('[data-testid^="pilot-form-"]')).toHaveCount(3);
}
async function open(page: Page, id = worksheet) {
  await page.getByTestId(`pilot-form-${id}`).getByRole('button', { name: 'Open', exact: true }).click();
  await expect(page.locator('[data-pdf-page="1"]')).toHaveAttribute('data-rendered', 'true');
}

test.afterEach(async ({ page }) => { await page.unrouteAll({ behavior: 'wait' }); });

test('compiled app opens and downloads all nine English PDFs across all age groups', async ({ page }, info) => {
  const requests: string[] = [], errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', r => { if (r.url().includes('/functions/getHebrewFormsPilot')) requests.push(r.postDataJSON().path); });
  await session(page);
  await page.goto('http://127.0.0.1:3005/Tools');
  await page.getByRole('link', { name: 'CBT worksheets', exact: true }).click();
  const library = page.getByTestId('english-forms-pilot');
  await expect(library).toHaveAttribute('dir', 'ltr');
  await expect(page.getByTestId('pilot-translation-coverage')).toHaveText('270 of 970 forms are available in this language. 700 have not yet been translated.');
  await expect(page.getByTestId('hebrew-forms-pilot')).toHaveCount(0);
  for (const age of ['CH', 'TE', 'AD', 'OA']) {
    await selectUnit(page, age);
    for (const id of [`MP-MOOD-03-W-${age}-EN`, `MP-MOOD-03-P-${age}-EN`, ...(age === 'CH' ? [guide] : [])]) {
      await open(page, id);
      await expect(page.locator('[data-pdf-page]')).toHaveCount(id === guide ? 4 : 1);
      if (id === worksheet) {
        await page.getByTestId('pdf-reader-open').click();
        const first = page.getByTestId('pdf-reader-dialog').locator('[data-pdf-page="1"]');
        await expect(first).toHaveAttribute('data-rendered', 'true');
        const fitPixels = await first.locator('canvas').evaluate((c: HTMLCanvasElement) => c.width);
        for (let i = 0; i < 4; i++) await page.getByTestId('pdf-zoom-in').click();
        await expect(page.getByTestId('pdf-zoom-value')).toHaveText('200%');
        await expect.poll(async () => first.evaluate(el => Number((el as HTMLElement).dataset.renderWidth))).toBeGreaterThan(page.viewportSize()!.width * 1.7);
        const pixels = await first.locator('canvas').evaluate((c: HTMLCanvasElement) => ({ width: c.width, height: c.height, css: c.getBoundingClientRect().width, dpr: devicePixelRatio }));
        // High-DPI detail respects the existing 8M-pixel / 4096-side memory cap.
        expect(pixels.width).toBeLessThanOrEqual(Math.floor(pixels.css * pixels.dpr));
        expect(pixels.width).toBeGreaterThan(fitPixels);
        expect(pixels.width * pixels.height).toBeLessThanOrEqual(8_000_000);
        expect(Math.max(pixels.width, pixels.height)).toBeLessThanOrEqual(4096);
        await page.screenshot({ path: info.outputPath('english-reader-200.png') });
        await page.getByTestId('pdf-reader-close').click();
      }
      if (id === guide) {
        const last = page.locator('[data-pdf-page="4"]');
        await last.scrollIntoViewIfNeeded();
        await expect(last).toHaveAttribute('data-rendered', 'true');
      }
      await page.getByTestId('pilot-back').click();
      const downloadEvent = page.waitForEvent('download');
      await page.getByTestId(`pilot-form-${id}`).getByRole('button', { name: 'Download', exact: true }).click();
      const download = await downloadEvent;
      expect(download.suggestedFilename()).toBe(`${id}.pdf`);
      const actual = await readFile((await download.path())!);
      const source = await readFile(`server/private/forms-en/${id}.pdf`);
      expect(createHash('sha256').update(actual).digest('hex')).toBe(createHash('sha256').update(source).digest('hex'));
    }
    await page.screenshot({ path: info.outputPath(`english-${age}.png`) });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    for (let level = 0; level < 3; level++) await page.getByTestId('pilot-back').click();
  }
  expect(requests.filter(path => path.startsWith('catalog'))).toEqual(['catalog-en-series-01']);
  expect(requests.filter(path => path.startsWith('files/'))).toHaveLength(18);
  expect(requests.every(path => path === 'catalog-en-series-01' || path.endsWith('-EN'))).toBe(true);
  expect(errors).toEqual([]);
});

test('language changes revoke previews and isolate Hebrew, English and missing translations', async ({ page }) => {
  await session(page);
  await page.addInitScript(() => {
    const revoke = URL.revokeObjectURL.bind(URL);
    (window as any).__revoked = [];
    URL.revokeObjectURL = url => { (window as any).__revoked.push(url); revoke(url); };
  });
  await page.goto(preview); await selectUnit(page); await open(page);
  const select = page.getByRole('combobox', { name: 'Fixture language' });
  await select.selectOption('he');
  await expect(page.getByTestId('english-forms-pilot')).toHaveCount(0);
  await expect(page.getByTestId('pilot-pdf-preview')).toHaveCount(0);
  await expect(page.getByTestId('hebrew-forms-pilot')).toHaveAttribute('dir', 'rtl');
  await expect(page.getByTestId('hebrew-forms-pilot')).toContainText('970');
  expect(await page.evaluate(() => (window as any).__revoked.length)).toBeGreaterThan(0);
  await page.getByTestId('pilot-age-CH').click();
  await expect(page.locator('[data-testid^="pilot-track-"]')).toHaveCount(17);
  await select.selectOption('en');
  await expect(page.getByTestId('pilot-age-CH')).toBeVisible();
  await expect(page.getByTestId('hebrew-forms-pilot')).toHaveCount(0);
  const requests: string[] = [];
  page.on('request', r => { if (r.url().includes('/functions/getHebrewFormsPilot')) requests.push(r.postDataJSON().path); });
  for (const language of ['es', 'fr', 'de', 'it', 'pt']) {
    await select.selectOption(language);
    await expect(page.getByTestId('english-forms-pilot')).toHaveCount(0);
    await expect(page.getByTestId('hebrew-forms-pilot')).toHaveCount(0);
    await expect(page.getByTestId('forms-empty-state')).toBeVisible();
    await expect(page.getByTestId('forms-empty-state')).not.toContainText('therapeutic_forms');
  }
  expect(requests).toEqual([]);
});

test('late English PDF cannot reopen after language switch', async ({ page }) => {
  await session(page); await page.goto(preview); await selectUnit(page);
  let release!: () => void, received!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const ready = new Promise<void>(resolve => { received = resolve; });
  await page.route(proxy, async route => {
    const response = await route.fetch({ url: 'http://127.0.0.1:3006/' });
    if (route.request().postDataJSON().path.startsWith('files/')) { received(); await gate; }
    await route.fulfill({ response });
  });
  try {
    await page.getByTestId(`pilot-form-${worksheet}`).getByRole('button', { name: 'Open', exact: true }).click();
    await ready;
    await page.getByRole('combobox', { name: 'Fixture language' }).selectOption('he');
    await expect(page.getByTestId('hebrew-forms-pilot')).toContainText('970');
    const delivered = page.waitForResponse(r => r.url().includes('/functions/getHebrewFormsPilot') && r.request().postDataJSON().path.startsWith('files/'));
    release(); await delivered;
    await expect(page.getByTestId('pilot-pdf-preview')).toHaveCount(0);
    await expect(page.getByTestId('english-forms-pilot')).toHaveCount(0);
  } finally { release(); }
});

test('missing English release never requests Hebrew; regular users never request either catalog', async ({ page }) => {
  await session(page);
  const requests: string[] = [];
  await page.route(proxy, async route => {
    requests.push(route.request().postDataJSON().path);
    await route.fulfill({ status: 404, json: { error: 'PILOT_NOT_FOUND' } });
  });
  await page.goto(preview);
  await expect(page.getByRole('alert')).toHaveText('Forms are not yet available in this language.');
  expect(requests).toEqual(['catalog-en-series-01', 'catalog-en-mood-03']);
  await page.route('**/api/apps/*/entities/User/me', route => route.fulfill({ json: { id: 'regular', role: 'user', onboarding_completed: true } }));
  for (const language of ['en', 'he']) {
    await page.goto(`/tests/fixtures/hebrew-pilot-preview.html?language=${language}`);
    await expect(page.getByTestId('forms-empty-state')).toBeVisible();
    await expect(page.getByTestId('english-forms-pilot')).toHaveCount(0);
    await expect(page.getByTestId('hebrew-forms-pilot')).toHaveCount(0);
  }
  expect(requests).toEqual(['catalog-en-series-01', 'catalog-en-mood-03']);
});


test('staggered publication retains the nine English drafts and shows the pending release', async ({ page }) => {
  await session(page);
  const requests: string[] = [];
  await page.route(proxy, async route => {
    const path = route.request().postDataJSON().path;
    requests.push(path);
    if (path === 'catalog-en-series-01') await route.fulfill({ status: 404, json: { error: 'PILOT_NOT_FOUND' } });
    else await route.fulfill({ response: await route.fetch({ url: 'http://127.0.0.1:3006/' }) });
  });
  await page.goto(preview);
  await expect(page.getByTestId('pilot-translation-coverage')).toContainText('9 of 970');
  await expect(page.getByTestId('pilot-expansion-pending')).toBeVisible();
  await page.getByTestId('pilot-age-CH').click();
  await expect(page.locator('[data-testid^="pilot-track-"]')).toHaveCount(1);
  await page.getByTestId('pilot-track-mood').click();
  await expect(page.locator('[data-testid^="pilot-unit-"]')).toHaveCount(1);
  await page.getByTestId('pilot-unit-MOOD-03').click();
  await open(page);
  expect(requests.filter(path => path.startsWith('catalog'))).toEqual(['catalog-en-series-01', 'catalog-en-mood-03']);
});
