import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { mockApi } from '../helpers/ui';

for (const track of ['MOOD', 'SELF', 'PERF', 'REG', 'EXEC']) for (let number = 1; number <= 6; number++) {
  const unit = `${track}-${String(number).padStart(2, '0')}`;
  const age = ['CH', 'TE', 'AD', 'OA'][(number - 1) % 4];
  test(`${unit} ${age} opens and downloads worksheet, practice and guide${number === 6 ? ' [representative]' : ''}`, async ({ page }, info) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await mockApi(page);
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
    await expect(page.getByTestId('pilot-translation-coverage')).toContainText('270 of 970');
    await page.getByTestId(`pilot-age-${age}`).click();
    await expect(page.locator('[data-testid^="pilot-track-"]')).toHaveCount(5);
    await page.getByTestId(`pilot-track-${track.toLowerCase()}`).click();
    await expect(page.locator('[data-testid^="pilot-unit-"]')).toHaveCount(6);
    await page.getByTestId(`pilot-unit-${unit}`).click();
    await expect(page.locator('[data-testid^="pilot-form-"]')).toHaveCount(3);
    for (const suffix of [`W-${age}`, `P-${age}`, 'G-ALL']) {
      const id = `MP-${unit}-${suffix}-EN`;
      await page.getByTestId(`pilot-form-${id}`).getByRole('button', { name: 'Open', exact: true }).click();
      await expect(page.locator('[data-pdf-page="1"]')).toHaveAttribute('data-rendered', 'true');
      await expect(page.locator('[data-pdf-page]')).toHaveCount(suffix === 'G-ALL' ? 4 : 1);
      if (suffix === 'G-ALL') {
        const last = page.locator('[data-pdf-page="4"]');
        await last.scrollIntoViewIfNeeded();
        await expect(last).toHaveAttribute('data-rendered', 'true');
      }
      await page.getByTestId('pilot-back').click();
      const event = page.waitForEvent('download');
      await page.getByTestId(`pilot-form-${id}`).getByRole('button', { name: 'Download', exact: true }).click();
      const download = await event;
      expect(download.suggestedFilename()).toBe(`${id}.pdf`);
      expect(createHash('sha256').update(await readFile((await download.path())!)).digest('hex'))
        .toBe(createHash('sha256').update(await readFile(`server/private/forms-en/${id}.pdf`)).digest('hex'));
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (number === 6) await page.screenshot({ path: info.outputPath(`${unit}.png`) });
    expect(errors).toEqual([]);
  });
}
test.afterEach(async ({ page }) => { await page.unrouteAll({ behavior: 'wait' }); });
