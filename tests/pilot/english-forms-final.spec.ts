import { mockAccountAccess } from '../helpers/accountAccess';
import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { mockApi } from '../helpers/ui';

const manifest = JSON.parse(readFileSync('content/forms-localization/waves/en-series-03.json', 'utf8'));
const proof = JSON.parse(readFileSync('content/forms-localization/review/en-series-03-qa.json', 'utf8'));
const representative = new Set(['shared-entry', 'shared-assessment', 'shared-sessions', 'core-01', 'core-02', 'core-08', 'anx-06', 'ocd-08', 'ocdyc-01', 'trauma-08']);
async function session(page: Page) {
  await mockApi(page);
  await mockAccountAccess(page, 'fixture-user', true);
  await page.route('https://fonts.googleapis.com/**', route => route.fulfill({ contentType: 'text/css', body: '' }));
  await page.route('**/api/apps/*/entities/User/me', route => route.fulfill({ json: { id: 'fixture-user', role: 'admin', onboarding_completed: true } }));
  await page.route('**/api/apps/*/functions/getHebrewFormsPilot', async route => {
    await route.fulfill({ response: await route.fetch({ url: 'http://127.0.0.1:3006/' }) });
  });
  await page.addInitScript(() => {
    localStorage.setItem('language', 'en');
    localStorage.setItem('base44_access_token', 'pilot-admin-fixture');
  });
  await page.goto('http://127.0.0.1:3005/Tools');
  await page.getByRole('link', { name: 'CBT worksheets', exact: true }).click();
  await expect(page.getByTestId('pilot-translation-coverage')).toContainText('970 of 970');
}
for (const [index, spec] of manifest.packets.entries()) {
  const age = spec.key.startsWith('ocdyc-') ? 'CH' : ['CH', 'TE', 'AD', 'OA'][index % 4];
  const catalog = JSON.parse(readFileSync(`server/private/english-pilot-series-03-${spec.track}.json`, 'utf8'));
  const forms = catalog.forms.filter((form: { unit: string; age: string }) => form.unit === spec.unit && [age, 'ALL'].includes(form.age));
  test(`${spec.key} ${age} opens and downloads every age-matched form${representative.has(spec.key) ? ' [representative]' : ''}`, async ({ page }, info) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await session(page);
    await page.getByTestId(`pilot-age-${age}`).click();
    await expect(page.locator('[data-testid^="pilot-track-"]')).toHaveCount(17);
    await page.getByTestId(`pilot-track-${spec.track}`).click();
    const units = new Set(catalog.forms.filter((form: { age: string }) => [age, 'ALL'].includes(form.age)).map((form: { unit: string }) => form.unit));
    await expect(page.locator('[data-testid^="pilot-unit-"]')).toHaveCount(units.size);
    const unit = page.getByTestId(`pilot-unit-${spec.unit}`);
    if (spec.track === 'shared') expect(await unit.innerText()).not.toMatch(/[\u0590-\u05ff]/);
    await unit.click();
    await expect(page.locator('[data-testid^="pilot-form-"]')).toHaveCount(forms.length);
    for (const form of forms) {
      const pages = proof.forms.find((entry: { id: string }) => entry.id === form.id).pages;
      const card = page.getByTestId(`pilot-form-${form.id}`);
      expect(await card.innerText()).not.toMatch(/[\u0590-\u05ff]/);
      await card.getByRole('button', { name: 'Open', exact: true }).click();
      await expect(page.locator('[data-pdf-page="1"]')).toHaveAttribute('data-rendered', 'true');
      await expect(page.locator('[data-pdf-page]')).toHaveCount(pages);
      if (pages > 1) {
        const last = page.locator(`[data-pdf-page="${pages}"]`);
        await last.scrollIntoViewIfNeeded();
        await expect(last).toHaveAttribute('data-rendered', 'true');
      }
      await page.getByTestId('pilot-back').click();
      const event = page.waitForEvent('download');
      await page.getByTestId(`pilot-form-${form.id}`).getByRole('button', { name: 'Download', exact: true }).click();
      const download = await event;
      expect(download.suggestedFilename()).toBe(`${form.id}.pdf`);
      expect(createHash('sha256').update(await readFile((await download.path())!)).digest('hex'))
        .toBe(createHash('sha256').update(await readFile(`server/private/forms-en/${form.id}.pdf`)).digest('hex'));
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (representative.has(spec.key)) await page.screenshot({ path: info.outputPath(`${spec.key}.png`) });
    expect(errors).toEqual([]);
  });
}
for (const age of ['TE', 'AD', 'OA']) test(`OCDYC is absent from ${age}, while standard OCD remains [representative]`, async ({ page }) => {
  await session(page);
  await page.getByTestId(`pilot-age-${age}`).click();
  await page.getByTestId('pilot-track-ocd').click();
  await expect(page.locator('[data-testid^="pilot-unit-OCDYC-"]')).toHaveCount(0);
  await expect(page.locator('[data-testid^="pilot-unit-OCD-"]')).toHaveCount(8);
  await page.getByTestId('pilot-unit-OCD-01').click();
  await expect(page.locator('[data-testid^="pilot-form-"]')).toHaveCount(3);
  await expect(page.getByTestId(`pilot-form-MP-OCD-01-W-${age}-EN`)).toBeVisible();
});
test.afterEach(async ({ page }) => { await page.unrouteAll({ behavior: 'wait' }); });
