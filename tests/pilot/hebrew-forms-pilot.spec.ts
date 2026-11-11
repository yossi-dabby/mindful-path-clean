import { mockAccountAccess } from '../helpers/accountAccess';
import { test, expect } from '@playwright/test';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { loadPilot } from '../../server/hebrew-pilot.mjs';

test.afterEach(async ({ page }) => {
  // Navigation can leave a catalog proxy request in flight. Complete its route
  // handler before Playwright closes the page; handler errors still fail tests.
  await page.unrouteAll({ behavior: 'wait' });
});

async function session(page, role = 'admin', token = 'pilot-admin-fixture') {
  await page.addInitScript((value) => { localStorage.setItem('base44_access_token', value); }, token);
  // Keep navigation independent of the external UI font service. Embedded PDF
  // fonts still render from the real files, including in the canvas assertions.
  await mockAccountAccess(page, 'fixture-user', token === 'pilot-admin-fixture' || token === 'pilot-reviewer-fixture');
  await page.route('https://fonts.googleapis.com/**', (route) => route.fulfill({ contentType: 'text/css', body: '' }));
  // External identity is stubbed. Catalog, authorization,
  // real PDF bytes, integrity checks and PDF.js rendering run through real code.
  await page.route('**/api/apps/*/entities/User/me', (route) => route.fulfill({ json: { id: 'fixture-user', role } }));
  await page.route('**/api/apps/*/functions/getHebrewFormsPilot', async (route) => {
    await route.fulfill({ response: await route.fetch({ url: 'http://127.0.0.1:3006/' }) });
  });
}
const preview = '/tests/fixtures/hebrew-pilot-preview.html';

const series01Units = ['MOOD-03', 'MOOD-04', 'MOOD-05', 'MOOD-06', 'SELF-02', 'SELF-03', 'SELF-04', 'SELF-05', 'SELF-06'];
const series02Units = ['PERF-02', 'PERF-03', 'PERF-04', 'PERF-05', 'PERF-06', 'REG-02', 'REG-03', 'REG-04', 'REG-05', 'REG-06'];
const series03Units = ['EXEC-02', 'EXEC-03', 'EXEC-04', 'EXEC-05', 'EXEC-06', 'SOC-02', 'SOC-03', 'SOC-04', 'SOC-05', 'SOC-06'];
const series04Units = ['SLEEP-02', 'SLEEP-03', 'SLEEP-04', 'SLEEP-05', 'SLEEP-06', 'CHANGE-02', 'CHANGE-03', 'CHANGE-04', 'CHANGE-05', 'CHANGE-06'];
const series05Units = ["FAMILY-02", "FAMILY-03", "FAMILY-04", "FAMILY-05", "FAMILY-06", "SCREEN-02", "SCREEN-03", "SCREEN-04", "SCREEN-05", "SCREEN-06"];
const series06Units = ["SHAME-02", "SHAME-03", "SHAME-04", "SHAME-05", "SHAME-06", "MEANING-02", "MEANING-03", "MEANING-04", "MEANING-05", "MEANING-06"];
const ocdUnits = ['OCD-02', 'OCD-03', 'OCD-04', 'OCD-05', 'OCD-06', 'OCD-07', 'OCD-08'];
const traumaUnits = ['TRAUMA-02', 'TRAUMA-03', 'TRAUMA-04', 'TRAUMA-05', 'TRAUMA-06', 'TRAUMA-07', 'TRAUMA-08'];
const reviewUnits = [...traumaUnits, ...ocdUnits, ...series06Units, ...series05Units, ...series04Units, ...series03Units, ...series02Units, ...series01Units, 'MOOD-02', 'SELF-01', 'PERF-01', 'REG-01', 'EXEC-01', 'SOC-01', 'SLEEP-01', 'CHANGE-01', 'FAMILY-01', 'SCREEN-01', 'SHAME-01', 'MEANING-01', 'OCD-01', 'TRAUMA-01'];
for (const unit of reviewUnits) {
  for (const age of ['CH', 'TE', 'AD', 'OA']) {
    test(`${unit} ${age} opens and downloads both new variants with exact bytes and back focus`, async ({ page }) => {
      await session(page);
      await page.goto(preview);
      await page.getByTestId(`pilot-age-${age}`).click();
      await expect(page.locator('[data-testid^="pilot-track-"]')).toHaveCount(17);
      await page.getByTestId(`pilot-track-${unit.split('-')[0].toLowerCase()}`).click();
      await expect(page.locator('[data-testid^="pilot-unit-"]')).toHaveCount(/^(MOOD|SELF|PERF|REG|EXEC|SOC|SLEEP|CHANGE|FAMILY|SCREEN|SHAME|MEANING)-/.test(unit) ? 6 : unit.startsWith('OCD-') ? age === 'CH' ? 16 : 8 : unit.startsWith('TRAUMA-') ? 8 : 1);
      await page.getByTestId(`pilot-unit-${unit}`).click();
      await expect(page.locator('[data-testid^="pilot-form-"]')).toHaveCount(3);
      await expect(page.getByTestId(`pilot-form-MP-${unit}-G-ALL-HE`)).toHaveCount(1);
      const pilot = await loadPilot();
      for (const kind of ['W', 'P']) {
        const id = `MP-${unit}-${kind}-${age}-HE`;
        const card = page.getByTestId(`pilot-form-${id}`);
        const open = card.getByRole('button', { name: 'פתח', exact: true });
        await open.click();
        await expect(page.getByTestId('pilot-pdf-preview').locator('canvas')).toHaveCount(1, { timeout: 20000 });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await page.getByTestId('pilot-back').click();
        await expect(open).toBeFocused();
        await expect(page.getByTestId('pilot-pdf-preview')).toHaveCount(0);
        const pending = page.waitForEvent('download');
        await card.getByRole('button', { name: 'הורד', exact: true }).click();
        const download = await pending;
        expect(download.suggestedFilename()).toBe(`${id}.pdf`);
        const bytes = await readFile((await download.path())!);
        const form = pilot.series12Catalog.forms.find((f) => f.id === id)!;
        expect(bytes.length).toBe(form.bytes);
        expect(createHash('sha256').update(bytes).digest('hex')).toBe(form.sha256);
      }
      for (let i = 0; i < 3; i++) await page.getByTestId('pilot-back').click();
      await expect(page.getByTestId(`pilot-age-${age}`)).toBeVisible();
    });
  }
  test(`${unit} shared guide opens all four pages and downloads unchanged`, async ({ page }) => {
    await session(page);
    await page.goto(preview);
    await page.getByTestId('pilot-age-OA').click();
    await page.getByTestId(`pilot-track-${unit.split('-')[0].toLowerCase()}`).click();
    await page.getByTestId(`pilot-unit-${unit}`).click();
    const id = `MP-${unit}-G-ALL-HE`;
    const card = page.getByTestId(`pilot-form-${id}`);
    await card.getByRole('button', { name: 'פתח', exact: true }).click();
    const canvases = page.getByTestId('pilot-pdf-preview').locator('canvas');
    await expect(canvases).toHaveCount(4, { timeout: 20000 });
    await canvases.last().scrollIntoViewIfNeeded();
    await expect(page.getByTestId('pilot-back')).toBeInViewport();
    await page.getByTestId('pilot-back').click();
    await expect(page.getByTestId(`pilot-form-MP-${unit}-W-OA-HE`)).toBeVisible();
    const pending = page.waitForEvent('download');
    await card.getByRole('button', { name: 'הורד', exact: true }).click();
    const download = await pending;
    expect(download.suggestedFilename()).toBe(`${id}.pdf`);
    const bytes = await readFile((await download.path())!);
    const form = (await loadPilot()).series12Catalog.forms.find((f) => f.id === id)!;
    expect(bytes.length).toBe(form.bytes);
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(form.sha256);
  });
}

test('active pilot replaces obsolete maintenance and planned-library blocks', async ({ page }) => {
  await session(page);
  await page.goto(preview);
  await expect(page.getByTestId('pilot-age-CH')).toBeVisible();
  for (const id of ['forms-under-revision', 'forms-audience-architecture', 'forms-collection-architecture', 'forms-empty-state']) {
    await expect(page.getByTestId(id)).toHaveCount(0);
  }
  await expect(page.getByTestId('hebrew-forms-pilot')).toContainText('970 טפסים');
  await expect(page.getByTestId('hebrew-forms-pilot')).toContainText('טיוטות לסקירה מקצועית בלבד');
});

for (const status of [400, 404]) {
  test(`P3 pending (${status}) keeps all 163 installed forms including MOOD available`, async ({ page }) => {
    await session(page);
    const paths: string[] = [];
    await page.route('**/api/apps/*/functions/getHebrewFormsPilot', async (route) => {
      const path = route.request().postDataJSON().path;
      paths.push(path);
      if (['catalog-series-12', 'catalog-series-11', 'catalog-series-10', 'catalog-series-09', 'catalog-series-08', 'catalog-series-07', 'catalog-series-06', 'catalog-series-05', 'catalog-series-04', 'catalog-series-03', 'catalog-series-02', 'catalog-series-01', 'catalog-p4-02', 'catalog-p4-01', 'catalog-p3-01'].includes(path)) await route.fulfill({ status, json: { error: 'PILOT_UNAVAILABLE' } });
      else await route.fulfill({ response: await route.fetch({ url: 'http://127.0.0.1:3006/' }) });
    });
    await page.goto(preview);
    await expect(page.getByTestId('pilot-expansion-pending')).toBeVisible();
    await expect(page.getByTestId('hebrew-forms-pilot')).toContainText('163 טפסים, גרסה 0.3-mood-01');
    expect(paths).toEqual(['catalog-series-12', 'catalog-series-11', 'catalog-series-10', 'catalog-series-09', 'catalog-series-08', 'catalog-series-07', 'catalog-series-06', 'catalog-series-05', 'catalog-series-04', 'catalog-series-03', 'catalog-series-02', 'catalog-series-01', 'catalog-p4-02', 'catalog-p4-01', 'catalog-p3-01', 'catalog-mood-01']);
    await page.getByTestId('pilot-age-CH').click();
    await expect(page.locator('[data-testid^="pilot-track-"]')).toHaveCount(4);
    await expect(page.getByTestId('pilot-track-self')).toHaveCount(0);
    await page.getByTestId('pilot-track-mood').click();
    await expect(page.getByTestId('pilot-unit-MOOD-02')).toHaveCount(0);
    await page.getByTestId('pilot-unit-MOOD-01').click();
    await page.getByTestId('pilot-form-MP-MOOD-01-W-CH-HE').getByRole('button', { name: 'פתח', exact: true }).click();
    await expect(page.getByTestId('pilot-pdf-preview').locator('canvas')).toHaveCount(1, { timeout: 20000 });
  });
}

for (const age of ['CH', 'TE', 'AD', 'OA']) {
  test(`MOOD ${age} opens and downloads both age variants with a single shared guide`, async ({ page }) => {
    await session(page);
    await page.goto(preview);
    await expect(page.getByTestId('hebrew-forms-pilot')).toContainText('970 טפסים, גרסה 0.18-series-12');
    await expect(page.getByTestId('hebrew-forms-pilot').locator('bdi[dir="ltr"]')).toHaveText('0.18-series-12');
    await page.getByTestId(`pilot-age-${age}`).click();
    await page.getByTestId('pilot-track-mood').click();
    await page.getByTestId('pilot-unit-MOOD-01').click();
    await expect(page.locator('[data-testid^="pilot-form-"]')).toHaveCount(3);
    await expect(page.getByTestId('pilot-form-MP-MOOD-01-G-ALL-HE')).toHaveCount(1);
    const pilot = await loadPilot();
    for (const kind of ['W', 'P']) {
      const id = `MP-MOOD-01-${kind}-${age}-HE`;
      const card = page.getByTestId(`pilot-form-${id}`);
      const open = card.getByRole('button', { name: 'פתח', exact: true });
      await open.click();
      await expect(page.getByTestId('pilot-pdf-preview').locator('canvas')).toHaveCount(1, { timeout: 20000 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.getByTestId('pilot-back').click();
      await expect(open).toBeFocused();
      await expect(page.getByTestId('pilot-pdf-preview')).toHaveCount(0);
      const pending = page.waitForEvent('download');
      await card.getByRole('button', { name: 'הורד', exact: true }).click();
      const download = await pending;
      expect(download.suggestedFilename()).toBe(`${id}.pdf`);
      const bytes = await readFile((await download.path())!);
      const form = pilot.expandedCatalog.forms.find((f) => f.id === id)!;
      expect(bytes.length).toBe(form.bytes);
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(form.sha256);
    }
    for (let i = 0; i < 3; i++) await page.getByTestId('pilot-back').click();
    await expect(page.getByTestId(`pilot-age-${age}`)).toBeVisible();
  });
}

test('MOOD guide has four pages and preserves the selected age and unit on return', async ({ page }) => {
  await session(page);
  await page.goto(preview);
  await page.getByTestId('pilot-age-OA').click();
  await page.getByTestId('pilot-track-mood').click();
  await page.getByTestId('pilot-unit-MOOD-01').click();
  await page.getByTestId('pilot-form-MP-MOOD-01-G-ALL-HE').getByRole('button', { name: 'פתח', exact: true }).click();
  const canvases = page.getByTestId('pilot-pdf-preview').locator('canvas');
  await expect(canvases).toHaveCount(4, { timeout: 20000 });
  await canvases.last().scrollIntoViewIfNeeded();
  await expect(page.getByTestId('pilot-back')).toBeInViewport();
  await page.getByTestId('pilot-back').click();
  await expect(page.getByTestId('pilot-form-MP-MOOD-01-W-OA-HE')).toBeVisible();
});

for (const status of [400, 404]) {
  test(`partial deployment (${status}) keeps the original package usable`, async ({ page }) => {
    await session(page);
    await page.route('**/api/apps/*/functions/getHebrewFormsPilot', async (route) => {
      if (['catalog-series-12', 'catalog-series-11', 'catalog-series-10', 'catalog-series-09', 'catalog-series-08', 'catalog-series-07', 'catalog-series-06', 'catalog-series-05', 'catalog-series-04', 'catalog-series-03', 'catalog-series-02', 'catalog-series-01', 'catalog-p4-02', 'catalog-p4-01', 'catalog-p3-01', 'catalog-mood-01'].includes(route.request().postDataJSON().path)) {
        await route.fulfill({ status, json: { error: 'PILOT_UNAVAILABLE' } });
      } else await route.fulfill({ response: await route.fetch({ url: 'http://127.0.0.1:3006/' }) });
    });
    await page.goto(preview);
    await expect(page.getByTestId('pilot-expansion-pending')).toBeVisible();
    await expect(page.getByTestId('hebrew-forms-pilot')).toContainText('154 טפסים, גרסה 0.2');
    await page.getByTestId('pilot-age-AD').click();
    await expect(page.getByTestId('pilot-track-mood')).toHaveCount(0);
    await page.getByTestId('pilot-track-core').click();
    await page.getByTestId('pilot-unit-CORE-02').click();
    await page.getByTestId('pilot-form-MP-CORE-02-W-AD-HE').getByRole('button', { name: 'פתח', exact: true }).click();
    await expect(page.getByTestId('pilot-pdf-preview').locator('canvas')).toHaveCount(1, { timeout: 20000 });
  });
}

test('an altered catalog is rejected without silently falling back', async ({ page }) => {
  await session(page);
  let calls = 0;
  await page.route('**/api/apps/*/functions/getHebrewFormsPilot', async (route) => {
    calls++;
    const response = await route.fetch({ url: 'http://127.0.0.1:3006/' });
    const body = await response.json();
    body.catalog.forms[0].sha256 = '0'.repeat(64);
    await route.fulfill({ json: body });
  });
  await page.goto(preview);
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByTestId('pilot-age-AD')).toHaveCount(0);
  await expect(page.getByTestId('pilot-expansion-pending')).toHaveCount(0);
  expect(calls).toBe(1);
});

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

test('regular user and unsupported language never receive pilot catalog', async ({ page }) => {
  await session(page, 'user', 'pilot-user-fixture');
  const requests: string[] = [];
  // Count API traffic, including both releases, rather than Vite's static import
  // of the shared public fingerprint contract under base44/functions/.
  page.on('request', (request) => { if (/\/api\/hebrew-forms-pilot(?:\/|$)|\/api\/apps\/[^/]+\/functions\/getHebrewFormsPilot(?:\?|$)/.test(request.url())) requests.push(request.url()); });
  await page.goto(preview);
  await expect(page.locator('main')).toBeVisible();
  await expect(page.getByTestId('hebrew-forms-pilot')).toHaveCount(0);
  await expect(page.getByTestId('forms-empty-state')).toBeVisible();
  await page.unroute('**/api/apps/*/entities/User/me');
  await page.route('**/api/apps/*/entities/User/me', (route) => route.fulfill({ json: { id: 'fixture-admin', role: 'admin' } }));
  await page.goto(`${preview}?language=es`);
  await expect(page.getByTestId('hebrew-forms-pilot')).toHaveCount(0);
  await expect(page.getByTestId('forms-empty-state')).toBeVisible();
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
  await expect(page.getByRole('alert')).toContainText('הגישה לטפסים אינה זמינה או בוטלה');
  await page.getByTestId('pilot-form-MP-CORE-02-W-AD-HE').getByRole('button', { name: 'פתח', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('הגישה לטפסים אינה זמינה או בוטלה');
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

for (const status of [400, 404]) {
  test(`p4-01 pending (${status}) preserves the previous 217 forms`, async ({ page }) => {
    await session(page);
    const paths: string[] = [];
    await page.route('**/api/apps/*/functions/getHebrewFormsPilot', async (route) => {
      const path = route.request().postDataJSON().path; paths.push(path);
      if (['catalog-series-12', 'catalog-series-11', 'catalog-series-10', 'catalog-series-09', 'catalog-series-08', 'catalog-series-07', 'catalog-series-06', 'catalog-series-05', 'catalog-series-04', 'catalog-series-03', 'catalog-series-02', 'catalog-series-01', 'catalog-p4-02', 'catalog-p4-01'].includes(path)) await route.fulfill({ status, json: { error: 'PILOT_UNAVAILABLE' } });
      else await route.fulfill({ response: await route.fetch({ url: 'http://127.0.0.1:3006/' }) });
    });
    await page.goto(preview);
    await expect(page.getByTestId('pilot-expansion-pending')).toBeVisible();
    await expect(page.getByTestId('hebrew-forms-pilot')).toContainText('217 טפסים, גרסה 0.4-p3-01');
    expect(paths).toEqual(['catalog-series-12', 'catalog-series-11', 'catalog-series-10', 'catalog-series-09', 'catalog-series-08', 'catalog-series-07', 'catalog-series-06', 'catalog-series-05', 'catalog-series-04', 'catalog-series-03', 'catalog-series-02', 'catalog-series-01', 'catalog-p4-02', 'catalog-p4-01', 'catalog-p3-01']);
    await page.getByTestId('pilot-age-CH').click();
    await expect(page.locator('[data-testid^="pilot-track-"]')).toHaveCount(9);
    await expect(page.getByTestId('pilot-track-sleep')).toHaveCount(0);
    await page.getByTestId('pilot-track-self').click();
    await page.getByTestId('pilot-unit-SELF-01').click();
    await page.getByTestId('pilot-form-MP-SELF-01-W-CH-HE').getByRole('button', { name: 'פתח', exact: true }).click();
    await expect(page.getByTestId('pilot-pdf-preview').locator('canvas')).toHaveCount(1, { timeout: 20000 });
  });
}

for (const status of [400, 404]) {
  test(`p4-02 pending (${status}) preserves the previous 253 forms`, async ({ page }) => {
    await session(page);
    const paths: string[] = [];
    await page.route('**/api/apps/*/functions/getHebrewFormsPilot', async (route) => {
      const path = route.request().postDataJSON().path; paths.push(path);
      if (['catalog-series-12', 'catalog-series-11', 'catalog-series-10', 'catalog-series-09', 'catalog-series-08', 'catalog-series-07', 'catalog-series-06', 'catalog-series-05', 'catalog-series-04', 'catalog-series-03', 'catalog-series-02', 'catalog-series-01', 'catalog-p4-02'].includes(path)) await route.fulfill({ status, json: { error: 'PILOT_UNAVAILABLE' } });
      else await route.fulfill({ response: await route.fetch({ url: 'http://127.0.0.1:3006/' }) });
    });
    await page.goto(preview);
    await expect(page.getByTestId('pilot-expansion-pending')).toBeVisible();
    await expect(page.getByTestId('hebrew-forms-pilot')).toContainText('253 טפסים, גרסה 0.5-p4-01');
    expect(paths).toEqual(['catalog-series-12', 'catalog-series-11', 'catalog-series-10', 'catalog-series-09', 'catalog-series-08', 'catalog-series-07', 'catalog-series-06', 'catalog-series-05', 'catalog-series-04', 'catalog-series-03', 'catalog-series-02', 'catalog-series-01', 'catalog-p4-02', 'catalog-p4-01']);
    await page.getByTestId('pilot-age-CH').click();
    await expect(page.locator('[data-testid^="pilot-track-"]')).toHaveCount(13);
    await expect(page.getByTestId('pilot-track-shame')).toHaveCount(0);
    await page.getByTestId('pilot-track-sleep').click();
    await page.getByTestId('pilot-unit-SLEEP-01').click();
    await page.getByTestId('pilot-form-MP-SLEEP-01-W-CH-HE').getByRole('button', { name: 'פתח', exact: true }).click();
    await expect(page.getByTestId('pilot-pdf-preview').locator('canvas')).toHaveCount(1, { timeout: 20000 });
  });
}

for (const status of [400, 404]) {
  test(`series-01 pending (${status}) preserves the previous 289 forms`, async ({ page }) => {
    await session(page);
    const paths: string[] = [];
    await page.route('**/api/apps/*/functions/getHebrewFormsPilot', async (route) => {
      const path = route.request().postDataJSON().path; paths.push(path);
      if (['catalog-series-12', 'catalog-series-11', 'catalog-series-10', 'catalog-series-09', 'catalog-series-08', 'catalog-series-07', 'catalog-series-06', 'catalog-series-05', 'catalog-series-04', 'catalog-series-03', 'catalog-series-02', 'catalog-series-01'].includes(path)) await route.fulfill({ status, json: { error: 'PILOT_UNAVAILABLE' } });
      else await route.fulfill({ response: await route.fetch({ url: 'http://127.0.0.1:3006/' }) });
    });
    await page.goto(preview);
    await expect(page.getByTestId('pilot-expansion-pending')).toBeVisible();
    await expect(page.getByTestId('hebrew-forms-pilot')).toContainText('289 טפסים, גרסה 0.6-p4-02');
    expect(paths).toEqual(['catalog-series-12', 'catalog-series-11', 'catalog-series-10', 'catalog-series-09', 'catalog-series-08', 'catalog-series-07', 'catalog-series-06', 'catalog-series-05', 'catalog-series-04', 'catalog-series-03', 'catalog-series-02', 'catalog-series-01', 'catalog-p4-02']);
    await page.getByTestId('pilot-age-CH').click();
    await page.getByTestId('pilot-track-self').click();
    await expect(page.locator('[data-testid^="pilot-unit-"]')).toHaveCount(1);
    await page.getByTestId('pilot-unit-SELF-01').click();
    await page.getByTestId('pilot-form-MP-SELF-01-W-CH-HE').getByRole('button', { name: 'פתח', exact: true }).click();
    await expect(page.getByTestId('pilot-pdf-preview').locator('canvas')).toHaveCount(1, { timeout: 20000 });
  });
}

for (const status of [400, 404]) {
  test(`series-02 pending (${status}) preserves the previous 370 forms`, async ({ page }) => {
    await session(page);
    const paths: string[] = [];
    await page.route('**/api/apps/*/functions/getHebrewFormsPilot', async (route) => {
      const path = route.request().postDataJSON().path; paths.push(path);
      if (['catalog-series-12', 'catalog-series-11', 'catalog-series-10', 'catalog-series-09', 'catalog-series-08', 'catalog-series-07', 'catalog-series-06', 'catalog-series-05', 'catalog-series-04', 'catalog-series-03', 'catalog-series-02'].includes(path)) await route.fulfill({ status, json: { error: 'PILOT_UNAVAILABLE' } });
      else await route.fulfill({ response: await route.fetch({ url: 'http://127.0.0.1:3006/' }) });
    });
    await page.goto(preview);
    await expect(page.getByTestId('pilot-expansion-pending')).toBeVisible();
    await expect(page.getByTestId('hebrew-forms-pilot')).toContainText('370 טפסים, גרסה 0.7-series-01');
    expect(paths).toEqual(['catalog-series-12', 'catalog-series-11', 'catalog-series-10', 'catalog-series-09', 'catalog-series-08', 'catalog-series-07', 'catalog-series-06', 'catalog-series-05', 'catalog-series-04', 'catalog-series-03', 'catalog-series-02', 'catalog-series-01']);
    await page.getByTestId('pilot-age-CH').click();
    await page.getByTestId('pilot-track-reg').click();
    await expect(page.locator('[data-testid^="pilot-unit-"]')).toHaveCount(1);
    await page.getByTestId('pilot-back').click();
    await page.getByTestId('pilot-track-self').click();
    await page.getByTestId('pilot-unit-SELF-06').click();
    await page.getByTestId('pilot-form-MP-SELF-06-W-CH-HE').getByRole('button', { name: 'פתח', exact: true }).click();
    await expect(page.getByTestId('pilot-pdf-preview').locator('canvas')).toHaveCount(1, { timeout: 20000 });
  });
}

for (const status of [400, 404]) {
  test(`series-03 pending (${status}) preserves the previous 460 forms`, async ({ page }) => {
    await session(page);
    const paths: string[] = [];
    await page.route('**/api/apps/*/functions/getHebrewFormsPilot', async (route) => {
      const path = route.request().postDataJSON().path; paths.push(path);
      if (['catalog-series-12', 'catalog-series-11', 'catalog-series-10', 'catalog-series-09', 'catalog-series-08', 'catalog-series-07', 'catalog-series-06', 'catalog-series-05', 'catalog-series-04', 'catalog-series-03'].includes(path)) await route.fulfill({ status, json: { error: 'PILOT_UNAVAILABLE' } });
      else await route.fulfill({ response: await route.fetch({ url: 'http://127.0.0.1:3006/' }) });
    });
    await page.goto(preview);
    await expect(page.getByTestId('pilot-expansion-pending')).toBeVisible();
    await expect(page.getByTestId('hebrew-forms-pilot')).toContainText('460 טפסים, גרסה 0.8-series-02');
    expect(paths).toEqual(['catalog-series-12', 'catalog-series-11', 'catalog-series-10', 'catalog-series-09', 'catalog-series-08', 'catalog-series-07', 'catalog-series-06', 'catalog-series-05', 'catalog-series-04', 'catalog-series-03', 'catalog-series-02']);
    await page.getByTestId('pilot-age-CH').click();
    await page.getByTestId('pilot-track-exec').click();
    await expect(page.locator('[data-testid^="pilot-unit-"]')).toHaveCount(1);
    await page.getByTestId('pilot-back').click();
    await page.getByTestId('pilot-track-reg').click();
    await page.getByTestId('pilot-unit-REG-06').click();
    await page.getByTestId('pilot-form-MP-REG-06-W-CH-HE').getByRole('button', { name: 'פתח', exact: true }).click();
    await expect(page.getByTestId('pilot-pdf-preview').locator('canvas')).toHaveCount(1, { timeout: 20000 });
  });
}

for (const status of [400, 404]) {
  test(`series-04 pending (${status}) preserves the previous 550 forms`, async ({ page }) => {
    await session(page);
    const paths: string[] = [];
    await page.route('**/api/apps/*/functions/getHebrewFormsPilot', async (route) => {
      const path = route.request().postDataJSON().path; paths.push(path);
      if (['catalog-series-12', 'catalog-series-11', 'catalog-series-10', 'catalog-series-09', 'catalog-series-08', 'catalog-series-07', 'catalog-series-06', 'catalog-series-05', 'catalog-series-04'].includes(path)) await route.fulfill({ status, json: { error: 'PILOT_UNAVAILABLE' } });
      else await route.fulfill({ response: await route.fetch({ url: 'http://127.0.0.1:3006/' }) });
    });
    await page.goto(preview);
    await expect(page.getByTestId('pilot-expansion-pending')).toBeVisible();
    await expect(page.getByTestId('hebrew-forms-pilot')).toContainText('550 טפסים, גרסה 0.9-series-03');
    expect(paths).toEqual(['catalog-series-12', 'catalog-series-11', 'catalog-series-10', 'catalog-series-09', 'catalog-series-08', 'catalog-series-07', 'catalog-series-06', 'catalog-series-05', 'catalog-series-04', 'catalog-series-03']);
    await page.getByTestId('pilot-age-CH').click();
    await page.getByTestId('pilot-track-sleep').click();
    await expect(page.locator('[data-testid^="pilot-unit-"]')).toHaveCount(1);
    await page.getByTestId('pilot-back').click();
    await page.getByTestId('pilot-track-exec').click();
    await page.getByTestId('pilot-unit-EXEC-06').click();
    await page.getByTestId('pilot-form-MP-EXEC-06-W-CH-HE').getByRole('button', { name: 'פתח', exact: true }).click();
    await expect(page.getByTestId('pilot-pdf-preview').locator('canvas')).toHaveCount(1, { timeout: 20000 });
  });
}

for (const status of [400, 404]) {
  test(`series-06 pending (${status}) preserves the previous 730 forms`, async ({ page }) => {
    await session(page);
    const paths: string[] = [];
    await page.route('**/api/apps/*/functions/getHebrewFormsPilot', async (route) => {
      const path = route.request().postDataJSON().path; paths.push(path);
      if (["catalog-series-12", "catalog-series-11", "catalog-series-10", "catalog-series-09", "catalog-series-08", "catalog-series-07", "catalog-series-06"].includes(path)) await route.fulfill({ status, json: { error: 'PILOT_UNAVAILABLE' } });
      else await route.fulfill({ response: await route.fetch({ url: 'http://127.0.0.1:3006/' }) });
    });
    await page.goto(preview);
    await expect(page.getByTestId('pilot-expansion-pending')).toBeVisible();
    await expect(page.getByTestId('hebrew-forms-pilot')).toContainText('730 טפסים, גרסה 0.11-series-05');
    expect(paths).toEqual(["catalog-series-12", "catalog-series-11", "catalog-series-10", "catalog-series-09", "catalog-series-08", "catalog-series-07", "catalog-series-06", "catalog-series-05"]);
    await page.getByTestId('pilot-age-CH').click();
    await page.getByTestId('pilot-track-shame').click();
    await expect(page.locator('[data-testid^="pilot-unit-"]')).toHaveCount(1);
    await page.getByTestId('pilot-back').click();
    await page.getByTestId('pilot-track-family').click();
    await page.getByTestId('pilot-unit-FAMILY-06').click();
    await page.getByTestId('pilot-form-MP-FAMILY-06-W-CH-HE').getByRole('button', { name: 'פתח', exact: true }).click();
    await expect(page.getByTestId('pilot-pdf-preview').locator('canvas')).toHaveCount(1, { timeout: 20000 });
  });
}

for (const status of [400, 404]) {
  test(`series-05 pending (${status}) preserves the previous 640 forms`, async ({ page }) => {
    await session(page);
    const paths: string[] = [];
    await page.route('**/api/apps/*/functions/getHebrewFormsPilot', async (route) => {
      const path = route.request().postDataJSON().path; paths.push(path);
      if (["catalog-series-12", "catalog-series-11", "catalog-series-10", "catalog-series-09", "catalog-series-08", "catalog-series-07", "catalog-series-06", "catalog-series-05"].includes(path)) await route.fulfill({ status, json: { error: 'PILOT_UNAVAILABLE' } });
      else await route.fulfill({ response: await route.fetch({ url: 'http://127.0.0.1:3006/' }) });
    });
    await page.goto(preview);
    await expect(page.getByTestId('pilot-expansion-pending')).toBeVisible();
    await expect(page.getByTestId('hebrew-forms-pilot')).toContainText('640 טפסים, גרסה 0.10-series-04');
    expect(paths).toEqual(["catalog-series-12", "catalog-series-11", "catalog-series-10", "catalog-series-09", "catalog-series-08", "catalog-series-07", "catalog-series-06", "catalog-series-05", "catalog-series-04"]);
    await page.getByTestId('pilot-age-CH').click();
    await page.getByTestId('pilot-track-family').click();
    await expect(page.locator('[data-testid^="pilot-unit-"]')).toHaveCount(1);
    await page.getByTestId('pilot-back').click();
    await page.getByTestId('pilot-track-sleep').click();
    await page.getByTestId('pilot-unit-SLEEP-06').click();
    await page.getByTestId('pilot-form-MP-SLEEP-06-W-CH-HE').getByRole('button', { name: 'פתח', exact: true }).click();
    await expect(page.getByTestId('pilot-pdf-preview').locator('canvas')).toHaveCount(1, { timeout: 20000 });
  });
}

test('forms warning is bold above the library and opens the complete terms at its section', async ({ page }, testInfo) => {
  await session(page);
  await page.goto(preview);
  const warning = page.getByTestId('forms-usage-notice');
  const card = page.getByTestId('hebrew-forms-pilot');
  await expect(card.getByRole('heading', { name: 'טפסים בעברית', exact: true })).toBeVisible();
  await expect(warning.locator('strong')).toHaveText('לפני השימוש, בדקו את ייעוד הטופס, קבוצת הגיל ומצב הסקירה שלו. הטפסים אינם תחליף להערכה מקצועית אישית. חומר המסומן „טיוטה לסקירה” מיועד לבדיקה בלבד. שימוש טיפולי מחייב בדיקת התאמה בידי איש מקצוע מתאים, ובכפוף לתנאי השימוש.');
  expect(Number(await warning.locator('strong').evaluate((el) => getComputedStyle(el).fontWeight))).toBeGreaterThanOrEqual(700);
  await expect(warning.locator('svg')).toBeVisible();
  const noticeBox = (await warning.boundingBox())!;
  const cardBox = (await card.boundingBox())!;
  const titleBox = (await page.getByRole('heading', { name: 'טפסים טיפוליים', exact: true }).boundingBox())!;
  expect(noticeBox.y).toBeGreaterThan(titleBox.y + titleBox.height);
  expect(noticeBox.y + noticeBox.height).toBeLessThanOrEqual(cardBox.y);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('forms-warning.png'), fullPage: true });
  await warning.getByRole('link').click();
  await expect(page).toHaveURL(/\/terms#forms-terms$/);
  const terms = page.locator('#forms-terms');
  await expect(terms).toBeFocused();
  await expect(terms.getByRole('heading', { name: 'תנאי שימוש בטפסים והגבלת אחריות', exact: true })).toBeInViewport();
  await expect(terms.locator('p')).toHaveCount(6);
  await expect(terms).toContainText('אין באמור כדי לפטור את מפעילי האפליקציה מאחריות שלא ניתן לפטור ממנה על פי דין');
  // The full terms page includes the newer privacy/access update, not only the forms annex.
  await expect(page.locator('time')).toHaveAttribute('datetime', '2026-11-09');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('forms-terms.png'), fullPage: true });
  await page.goBack();
  await expect(page.getByTestId('pilot-age-CH')).toBeVisible();
});

for (let index = 1; index <= 8; index++) {
  const unit = `OCDYC-${String(index).padStart(2, '0')}`;
  test(`${unit} ages 6–7 opens and downloads all three real PDFs`, async ({ page }) => {
    await session(page);
    await page.goto(preview);
    await page.getByTestId('pilot-age-CH').click();
    await page.getByTestId('pilot-track-ocd').click();
    await expect(page.locator('[data-testid^="pilot-unit-"]')).toHaveCount(16);
    await page.getByTestId(`pilot-unit-${unit}`).click();
    await expect(page.locator('[data-testid^="pilot-form-"]')).toHaveCount(3);
    for (const kind of ['G', 'W', 'P']) {
      const id = `MP-${unit}-${kind}-CH-HE`;
      const card = page.getByTestId(`pilot-form-${id}`);
      await expect(card).toContainText('6–7');
      const open = card.getByRole('button', { name: 'פתח', exact: true });
      await open.click();
      await expect(page.getByTestId('pilot-pdf-preview').locator('canvas')).toHaveCount(kind === 'G' ? 4 : 1, { timeout: 20000 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.getByTestId('pilot-back').click();
      await expect(open).toBeFocused();
      const pending = page.waitForEvent('download');
      await card.getByRole('button', { name: 'הורד', exact: true }).click();
      const download = await pending;
      expect(download.suggestedFilename()).toBe(`${id}.pdf`);
      const bytes = await readFile((await download.path())!);
      const form = (await loadPilot()).series12Catalog.forms.find((f) => f.id === id)!;
      expect(bytes.length).toBe(form.bytes);
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(form.sha256);
    }
  });
}

for (const age of ['TE', 'AD', 'OA']) test(`OCDYC is absent from ${age} while all eight age-appropriate OCD units remain`, async ({ page }) => {
  await session(page);
  await page.goto(preview);
  await page.getByTestId(`pilot-age-${age}`).click();
  await page.getByTestId('pilot-track-ocd').click();
  await expect(page.locator('[data-testid^="pilot-unit-"]')).toHaveCount(8);
  await expect(page.locator('[data-testid^="pilot-unit-OCDYC-"]')).toHaveCount(0);
  await page.getByTestId('pilot-unit-OCD-08').click();
  await expect(page.getByTestId(`pilot-form-MP-OCD-08-W-${age}-HE`)).toBeVisible();
});

for (const status of [400, 404]) for (const [wave, count] of [[7, 820], [8, 847], [9, 883], [10, 895]]) {
  test(`OCD batch ${wave} pending (${status}) retains ${count} installed forms`, async ({ page }) => {
    await session(page);
    const unavailable = Array.from({ length: 13 - wave }, (_, i) => `catalog-series-${String(12 - i).padStart(2, '0')}`);
    await page.route('**/api/apps/*/functions/getHebrewFormsPilot', async (route) => {
      if (unavailable.includes(route.request().postDataJSON().path)) await route.fulfill({ status, json: { error: 'PILOT_UNAVAILABLE' } });
      else await route.fulfill({ response: await route.fetch({ url: 'http://127.0.0.1:3006/' }) });
    });
    await page.goto(preview);
    await expect(page.getByTestId('pilot-expansion-pending')).toBeVisible();
    await expect(page.getByTestId('hebrew-forms-pilot')).toContainText(`${count} טפסים`);
    await page.getByTestId('pilot-age-CH').click();
    await page.getByTestId('pilot-track-ocd').click();
    await expect(page.locator('[data-testid^="pilot-unit-"]')).toHaveCount(wave === 7 ? 1 : wave === 8 ? 4 : wave === 9 ? 8 : 12);
    await page.getByTestId('pilot-unit-OCD-01').click();
    await page.getByTestId('pilot-form-MP-OCD-01-W-CH-HE').getByRole('button', { name: 'פתח', exact: true }).click();
    await expect(page.getByTestId('pilot-pdf-preview').locator('canvas')).toHaveCount(1, { timeout: 20000 });
  });
}

for (const status of [400, 404]) for (const [wave, count, units] of [[11, 907, 1], [12, 934, 4]]) {
  test(`TRAUMA batch ${wave} pending (${status}) retains ${count} installed forms`, async ({ page }) => {
    await session(page);
    const unavailable = Array.from({ length: 13 - wave }, (_, i) => `catalog-series-${12 - i}`);
    await page.route('**/api/apps/*/functions/getHebrewFormsPilot', async (route) => {
      if (unavailable.includes(route.request().postDataJSON().path)) await route.fulfill({ status, json: { error: 'PILOT_UNAVAILABLE' } });
      else await route.fulfill({ response: await route.fetch({ url: 'http://127.0.0.1:3006/' }) });
    });
    await page.goto(preview);
    await expect(page.getByTestId('pilot-expansion-pending')).toBeVisible();
    await expect(page.getByTestId('hebrew-forms-pilot')).toContainText(`${count} טפסים`);
    await page.getByTestId('pilot-age-CH').click();
    await page.getByTestId('pilot-track-trauma').click();
    await expect(page.locator('[data-testid^="pilot-unit-"]')).toHaveCount(units);
    await page.getByTestId('pilot-unit-TRAUMA-01').click();
    await page.getByTestId('pilot-form-MP-TRAUMA-01-W-CH-HE').getByRole('button', { name: 'פתח', exact: true }).click();
    await expect(page.getByTestId('pilot-pdf-preview').locator('canvas')).toHaveCount(1, { timeout: 20000 });
  });
}

test('approved ordinary reviewer opens a real PDF without administrator rights; revoked access blocks reopening', async ({ page }) => {
  await session(page, 'user', 'pilot-reviewer-fixture');
  await page.goto(preview);
  await page.getByTestId('pilot-age-AD').click();
  await page.getByTestId('pilot-track-anxiety').click();
  await page.getByTestId('pilot-unit-ANX-01').click();
  const card = page.getByTestId('pilot-form-MP-ANX-01-W-AD-HE');
  await card.getByRole('button', { name: 'פתח', exact: true }).click();
  await expect(page.getByTestId('pilot-pdf-preview').locator('canvas')).toHaveCount(1);
  await page.getByTestId('pilot-back').click();
  // The server now returns a denied grant; keeping a previously allowed client
  // view cannot authorize another file request.
  await page.evaluate(async () => {
    const { base44 } = await import('/src/api/base44Client.js');
    base44.auth.setToken('pilot-user-fixture');
  });
  await card.getByRole('button', { name: 'פתח', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('הגישה לטפסים אינה זמינה או בוטלה');
  await expect(page.getByTestId('pilot-pdf-preview')).toHaveCount(0);
});
