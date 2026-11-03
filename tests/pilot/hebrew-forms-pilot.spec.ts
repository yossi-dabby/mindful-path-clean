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
    for (let i = 0; i < 3; i++) await panel.getByRole('button', { name: 'חזרה', exact: true }).click();
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
