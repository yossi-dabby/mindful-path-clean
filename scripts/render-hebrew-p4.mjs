// Offline content QA; only --write-pdfs writes the selected wave's review PDFs.
import { chromium } from '@playwright/test';
import { readFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const root = new URL('../', import.meta.url);
const wave = process.argv.find((arg) => arg.startsWith('--wave='))?.split('=')[1] || 'p4-01';
if (!['p4-01', 'p4-02', 'series-01', 'series-02', 'series-03', 'series-04', 'series-05', 'series-06', 'series-07', 'series-08', 'series-09', 'series-10'].includes(wave)) throw new Error('Unknown review wave');
const source = new URL(`content/hebrew-forms/${wave}/`, root);
const forms = JSON.parse(await readFile(new URL('forms.json', source), 'utf8'));
const output = new URL('server/private/forms/', root);
const qa = process.env.HEBREW_FORMS_QA_DIR || process.env.P4_QA_DIR;
if (qa) await mkdir(qa, { recursive: true });
const browser = await chromium.launch({
  ...(process.env.PILOT_CHROMIUM_PATH ? { executablePath: process.env.PILOT_CHROMIUM_PATH } : {}),
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
try {
  for (const form of forms) {
    const page = await browser.newPage({ viewport: { width: 900, height: 1200 } });
    await page.goto(new URL(`forms/${form.id}.html`, source).href);
    await page.evaluate(() => document.fonts.ready);
    const state = await page.evaluate(() => ({
      pages: document.querySelectorAll('.sheet').length,
      fonts: [...document.fonts].every((font) => font.status === 'loaded'),
      blank: [...document.querySelectorAll('[contenteditable]')].every((f) => !f.textContent.trim()),
      fits: [...document.querySelectorAll('.sheet')].every((sheet) =>
        sheet.querySelector('.content').getBoundingClientRect().bottom + 8 < sheet.querySelector('.footer').getBoundingClientRect().top),
      fieldsFit: window.MindfulPathForm.validate(),
    }));
    if (state.pages !== form.pages || !state.fonts || !state.blank || !state.fits || !state.fieldsFit) {
      throw new Error(`${form.id}: ${JSON.stringify(state)}`);
    }
    if (process.argv.includes('--write-pdfs')) {
      await page.pdf({ path: fileURLToPath(new URL(`${form.id}.pdf`, output)), preferCSSPageSize: true, printBackground: true });
    }
    if (qa) for (let i = 0; i < form.pages; i++) {
      await page.locator('.sheet').nth(i).screenshot({ path: `${qa}/${form.id}-${i + 1}.png` });
    }
    if (form.kind !== 'G') {
      const short = 'דוגמה בדויה';
      const long = 'דוגמה בדויה לתשובה ארוכה '.repeat(100);
      const field = page.locator('.line[contenteditable]').first();
      await field.fill(short);
      if (!await page.evaluate(() => window.MindfulPathForm.validate())) throw new Error(`${form.id}: short answer clipped`);
      await field.fill(long);
      const guarded = await page.evaluate((answer) => {
        let printed = false;
        window.print = () => { printed = true; };
        window.alert = () => {};
        document.getElementById('print-form').click();
        return !printed && document.body.classList.contains('has-overflow') && window.MindfulPathForm.answers().includes(answer);
      }, long);
      if (!guarded) throw new Error(`${form.id}: long-answer print/export guard failed`);
    }
    await page.close();
    console.log(`${form.id}: ${form.pages} pages; blank layout and fill guard passed`);
  }
} finally { await browser.close(); }
