import { test, expect } from '@playwright/test';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { loadPilot } from '../../server/hebrew-pilot.mjs';

async function session(page, role = 'admin', token = 'pilot-admin-fixture') {
  await page.addInitScript((value) => { localStorage.setItem('base44_access_token', value); }, token);
  // Only the external identity provider is stubbed. Catalog, authorization,
  // real PDF bytes, integrity checks and PDF.js rendering run through real code.
  await page.route('**/api/apps/*/entities/User/me', (route) => route.fulfill({ json: { id: 'fixture-user', role } }));
  await page.route('**/api/apps/*/functions/getHebrewFormsPilot', async (route) => {
    await route.fulfill({ response: await route.fetch({ url: 'http://127.0.0.1:3006/' }) });
  });
}
const preview = '/tests/fixtures/hebrew-pilot-preview.html';

test('forms page returns to its entry page and direct links fall back to Tools', async ({ page }) => {
  await session(page);
  await page.goto(preview);
  await page.getByTestId('forms-page-back').click();
  await expect(page).toHaveURL(/\/Tools$/);
  await expect(page.getByTestId('therapeutic-forms-page')).toHaveCount(0);
  await page.getByRole('link', { name: 'פתיחת ספריית הטפסים' }).click();
  await expect(page.getByTestId('therapeutic-forms-page')).toBeVisible();
  await page.getByTestId('forms-page-back').click();
  await expect(page).toHaveURL(/\/Tools$/);
  await expect(page.getByTestId('therapeutic-forms-page')).toHaveCount(0);
});

test('administrator browses ages, shared guides, units, opens real PDF and downloads unchanged source', async ({ page }) => {
  await session(page);
  await page.goto(preview);
  const panel = page.getByTestId('hebrew-forms-pilot');
  await expect(panel).toBeVisible();
  await expect(panel.getByText(/טיוטות לסקירה מקצועית בלבד/)).toBeVisible();
  for (const age of ['CH', 'TE', 'AD', 'OA']) {
    await page.getByTestId(`pilot-age-${age}`).click();
    await page.getByTestId('pilot-track-core').click();
    await page.getByTestId('pilot-unit-CORE-02').click();
    await expect(page.getByTestId(`pilot-form-MP-CORE-02-W-${age}-HE`)).toBeVisible();
    await expect(page.getByTestId('pilot-form-MP-CORE-02-G-ALL-HE')).toBeVisible();
    for (let i = 0; i < 3; i++) await panel.getByTestId('pilot-back').click();
  }
  await page.getByTestId('pilot-age-CH').click();
  await page.getByTestId('pilot-track-anxiety').click();
  await page.getByTestId('pilot-unit-ANX-01').click();
  const card = page.getByTestId('pilot-form-MP-ANX-01-W-CH-HE');
  await card.getByRole('button', { name: 'פתח', exact: true }).click();
  await expect(page.getByTestId('pilot-pdf-preview').locator('canvas').first()).toBeVisible({ timeout: 20000 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const downloaded = page.waitForEvent('download');
  await card.getByRole('button', { name: 'הורד', exact: true }).click();
  const download = await downloaded;
  expect(download.suggestedFilename()).toBe('MP-ANX-01-W-CH-HE.pdf');
  const bytes = await readFile((await download.path())!);
  const pilot = await loadPilot();
  expect(createHash('sha256').update(bytes).digest('hex')).toBe(pilot.catalog.forms.find((f) => f.id === 'MP-ANX-01-W-CH-HE')!.sha256);
});

test('back remains reachable through a long PDF and returns one level at a time', async ({ page }) => {
  await session(page);
  await page.goto(preview);
  await page.getByTestId('pilot-age-TE').click();
  await page.getByTestId('pilot-track-core').click();
  await page.getByTestId('pilot-unit-CORE-02').click();
  const guide = page.getByTestId('pilot-form-MP-CORE-02-G-ALL-HE');
  const open = guide.getByRole('button', { name: 'פתח', exact: true });
  await open.click();
  const canvases = page.getByTestId('pilot-pdf-preview').locator('canvas');
  await expect(canvases).toHaveCount(4, { timeout: 20000 });
  await canvases.last().scrollIntoViewIfNeeded();
  const back = page.getByTestId('pilot-back');
  await expect(back).toBeInViewport();
  await expect(back).toHaveText('חזרה לרשימת הטפסים');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await back.click();
  await expect(page.getByTestId('pilot-pdf-preview')).toHaveCount(0);
  await expect(open).toBeFocused();
  await expect(page.getByTestId('pilot-form-MP-CORE-02-W-TE-HE')).toBeVisible();
  await expect(page.getByTestId('pilot-unit-CORE-02')).toHaveCount(0);
  await expect(back).toHaveText('חזרה ליחידות');
  await back.click();
  await expect(page.getByTestId('pilot-unit-CORE-02')).toBeVisible();
  await expect(back).toHaveText('חזרה למסלולים');
  await back.click();
  await expect(page.getByTestId('pilot-track-core')).toBeVisible();
  await expect(back).toHaveText('חזרה לקבוצות הגיל');
  await back.click();
  await expect(page.getByTestId('pilot-age-TE')).toBeVisible();
  await expect(back).toHaveCount(0);
});

test('back cancels a pending PDF without leaving the unit or reopening it later', async ({ page }) => {
  await session(page);
  await page.goto(preview);
  await page.getByTestId('pilot-age-AD').click();
  await page.getByTestId('pilot-track-anxiety').click();
  await page.getByTestId('pilot-unit-ANX-01').click();
  let release = () => {};
  const pending = new Promise<void>((resolve) => { release = resolve; });
  let received = () => {};
  const responseReady = new Promise<void>((resolve) => { received = resolve; });
  await page.route('**/api/apps/*/functions/getHebrewFormsPilot', async (route) => {
    const response = await route.fetch({ url: 'http://127.0.0.1:3006/' });
    received();
    await pending;
    await route.fulfill({ response });
  });
  const card = page.getByTestId('pilot-form-MP-ANX-01-W-AD-HE');
  const open = card.getByRole('button', { name: 'פתח', exact: true });
  await open.click();
  await responseReady;
  const back = page.getByTestId('pilot-back');
  await expect(back).toBeEnabled();
  await expect(back).toHaveText('חזרה לרשימת הטפסים');
  await back.click();
  await expect(open).toBeEnabled();
  await expect(card).toBeVisible();
  const delivered = page.waitForResponse('**/api/apps/*/functions/getHebrewFormsPilot');
  release();
  await delivered;
  await expect(page.getByTestId('pilot-pdf-preview')).toHaveCount(0);
  await expect(back).toHaveText('חזרה ליחידות');
  // A new action still works after cancellation, using the same real PDF route.
  await open.click();
  await expect(page.getByTestId('pilot-pdf-preview').locator('canvas').first()).toBeVisible({ timeout: 20000 });
});

test('regular user and English mode never receive pilot catalog', async ({ page }) => {
  await session(page, 'user', 'pilot-user-fixture');
  const requests: string[] = [];
  page.on('request', (request) => { if (/hebrew-forms-pilot|functions\/getHebrewFormsPilot/.test(request.url())) requests.push(request.url()); });
  await page.goto(preview);
  await expect(page.locator('main')).toBeVisible();
  await expect(page.getByTestId('hebrew-forms-pilot')).toHaveCount(0);
  await page.unroute('**/api/apps/*/entities/User/me');
  await page.route('**/api/apps/*/entities/User/me', (route) => route.fulfill({ json: { id: 'fixture-admin', role: 'admin' } }));
  await page.goto(`${preview}?language=en`);
  await expect(page.getByTestId('hebrew-forms-pilot')).toHaveCount(0);
  expect(requests).toEqual([]);
});

test('expired session clears preview and blocks opening/downloading a file', async ({ page }) => {
  await session(page);
  await page.goto(preview);
  await page.getByTestId('pilot-age-AD').click();
  await page.getByTestId('pilot-track-core').click();
  await page.getByTestId('pilot-unit-CORE-02').click();
  const card = page.getByTestId('pilot-form-MP-CORE-02-W-AD-HE');
  await card.getByRole('button', { name: 'פתח', exact: true }).click();
  await expect(page.getByTestId('pilot-pdf-preview').locator('canvas').first()).toBeVisible({ timeout: 20000 });
  await page.evaluate(async () => {
    const { base44 } = await import('/src/api/base44Client.js');
    base44.auth.setToken('expired-fixture');
  });
  await card.getByRole('button', { name: 'הורד', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('אין הרשאת מנהל תקפה');
  await page.getByTestId('pilot-form-MP-CORE-02-W-AD-HE').getByRole('button', { name: 'פתח', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('אין הרשאת מנהל תקפה');
  await expect(page.getByTestId('pilot-pdf-preview')).toHaveCount(0);
});


test('a corrupted PDF response never opens or downloads', async ({ page }) => {
  await session(page);
  await page.goto(preview);
  await page.getByTestId('pilot-age-CH').click();
  await page.getByTestId('pilot-track-anxiety').click();
  await page.getByTestId('pilot-unit-ANX-01').click();
  await page.route('**/api/apps/*/functions/getHebrewFormsPilot', (route) => route.fulfill({ json: { kind: 'pdf', id: 'MP-ANX-01-W-CH-HE', base64: Buffer.from('%PDF-corrupt').toString('base64') } }));
  const card = page.getByTestId('pilot-form-MP-ANX-01-W-CH-HE');
  await card.getByRole('button', { name: 'פתח', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('הקובץ לא הורד');
  await expect(page.getByTestId('pilot-pdf-preview')).toHaveCount(0);
});

test('unavailable backend is distinguished from an expired session and never falls back to a same-origin API', async ({ page }) => {
  await session(page);
  await page.route('**/api/apps/*/functions/getHebrewFormsPilot', (route) => route.fulfill({ status: 503, json: { error: 'PILOT_UNAVAILABLE' } }));
  const oldEndpointRequests: string[] = [];
  page.on('request', (request) => { if (request.url().includes('/api/hebrew-forms-pilot')) oldEndpointRequests.push(request.url()); });
  await page.goto(preview);
  await expect(page.getByRole('alert')).toContainText('נסו שוב בעוד זמן קצר');
  await expect(page.getByRole('alert')).not.toContainText('התחברות מחדש');
  expect(oldEndpointRequests).toEqual([]);
});
