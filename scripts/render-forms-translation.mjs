// Readiness-only renderer. It never writes to public/, dist/ or server/private/.
import { chromium } from '@playwright/test';
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { formDirection, translationState, buildTranslationReviewCatalog } from '../src/lib/formsLocalization.js';
import { auditFormSources } from './audit-form-sources.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const language = process.argv.find(arg => arg.startsWith('--language='))?.split('=')[1] || 'en';
const unit = process.argv.find(arg => arg.startsWith('--unit='))?.split('=')[1] || 'mood-03';
if (!/^(en|es|fr|de|it|pt)$/.test(language) || !/^[a-z]+-\d{2}$/.test(unit)) throw new Error('Invalid translation selection');
const output = resolve(root, `tmp/forms-localization/${language}/${unit}`);
const packet = JSON.parse(await readFile(resolve(root, `content/forms-localization/${language}/${unit}.json`), 'utf8'));
if (packet.language !== language || packet.unit.toLowerCase() !== unit) throw new Error('Translation packet mismatch');
for (const key of ['ok', 'overflow', 'printBlocked', 'answersHeader', 'fieldLabel', 'answerLine']) {
  if (typeof packet.messages?.[key] !== 'string' || !packet.messages[key].trim()) throw new Error(`Missing message: ${key}`);
}
const sourceMap = await auditFormSources();
const catalog = buildTranslationReviewCatalog(sourceMap, packet.forms, language);
if (catalog.stale.length || catalog.forms.length !== packet.forms.length) throw new Error('Translation source changed; review before rendering');
await mkdir(output, { recursive: true });
// Self-contained review output: HTML in a downloaded CI artifact must still
// have its local fonts, direction stylesheet and print guard available.
await mkdir(resolve(output, 'assets/fonts'), { recursive: true });
const baseStyle = await readFile(resolve(root, 'content/hebrew-forms/mood-01/style.css'), 'utf8');
const directionStyle = (await readFile(resolve(root, 'content/forms-localization/review/style.css'), 'utf8')).replace(/^@import[^;]+;\s*/, '');
await writeFile(resolve(output, 'assets/style.css'), baseStyle + '\n' + directionStyle);
await copyFile(resolve(root, 'content/forms-localization/review/print_guard.js'), resolve(output, 'assets/print_guard.js'));
for (const font of ['DejaVuSans.ttf', 'DejaVuSans-Bold.ttf', 'LICENSE.txt']) {
  await copyFile(resolve(root, 'content/hebrew-forms/mood-01/fonts', font), resolve(output, 'assets/fonts', font));
}
const browser = await chromium.launch({
  ...(process.env.PILOT_CHROMIUM_PATH ? { executablePath: process.env.PILOT_CHROMIUM_PATH } : {}),
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const results = [];
try {
  for (const form of packet.forms) {
    const source = sourceMap.forms.find(item => item.id === form.sourceId);
    if (translationState(source, form, language) !== 'draft') throw new Error('Stale draft');
    const page = await browser.newPage({ viewport: { width: 900, height: 1200 } });
    const network = [];
    page.on('request', request => { if (/^https?:/.test(request.url())) network.push(request.url()); });
    await page.goto(pathToFileURL(resolve(root, source.htmlPath)).href);
    await page.evaluate(() => document.fonts.ready);
    const sourceLayout = await page.evaluate(() => ({
      pages: document.querySelectorAll('.sheet').length,
      fields: [...document.querySelectorAll('[contenteditable]')].map(field => ({
        width: field.getBoundingClientRect().width, height: field.getBoundingClientRect().height,
      })),
      sections: [...document.querySelectorAll('.section-title .num')].map(el => el.textContent),
    }));
    const file = resolve(output, `${form.id}.html`);
    const html = await page.evaluate(({ strings, messages, form, language, direction, css, script }) => {
      document.documentElement.lang = language;
      document.documentElement.dir = direction;
      const status = document.getElementById('fill-status');
      status.textContent = '';
      for (const [key, value] of Object.entries(messages)) status.dataset[key] = value;
      const translate = value => {
        const trimmed = value.trim();
        if (!/[\u0590-\u05ff]/.test(trimmed)) return value.replaceAll(form.sourceId, form.id);
        const line = /^(.*?) - שורת מילוי (\d+)$/.exec(trimmed);
        const translated = line ? strings[line[1]] && `${strings[line[1]]} - ${messages.answerLine} ${line[2]}` : strings[trimmed];
        if (typeof translated !== 'string' || !translated.trim()) throw new Error(`Missing translation: ${trimmed}`);
        return value.replace(trimmed, translated);
      };
      const walker = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) walker.currentNode.textContent = translate(walker.currentNode.textContent);
      for (const el of document.querySelectorAll('[aria-label]')) el.setAttribute('aria-label', translate(el.getAttribute('aria-label')));
      for (const el of document.querySelectorAll('[data-template]')) el.dataset.template = form.id;
      document.querySelector('link[rel="stylesheet"]').setAttribute('href', css);
      document.querySelector('script[src]').setAttribute('src', script);
      if (/[\u0590-\u05ff]/.test(document.documentElement.outerHTML)) throw new Error('Untranslated Hebrew remains');
      return '<!doctype html>\n' + document.documentElement.outerHTML;
    }, { strings: packet.strings, messages: packet.messages, form, language, direction: formDirection(language),
      css: 'assets/style.css', script: 'assets/print_guard.js' });
    await writeFile(file, html + '\n');
    await page.goto(pathToFileURL(file).href);
    await page.evaluate(() => document.fonts.ready);
    const state = await page.evaluate(() => ({
      pages: document.querySelectorAll('.sheet').length,
      fonts: [...document.fonts].every(font => font.status === 'loaded'),
      blank: [...document.querySelectorAll('[contenteditable]')].every(field => !field.textContent.trim()),
      fits: [...document.querySelectorAll('.sheet')].every(sheet => sheet.querySelector('.content').getBoundingClientRect().bottom + 8 < sheet.querySelector('.footer').getBoundingClientRect().top),
      fieldsFit: window.MindfulPathForm.validate(),
      direction: getComputedStyle(document.documentElement).direction,
      fields: [...document.querySelectorAll('[contenteditable]')].map(field => ({ width: field.getBoundingClientRect().width, height: field.getBoundingClientRect().height })),
      sections: [...document.querySelectorAll('.section-title .num')].map(el => el.textContent),
    }));
    if (!state.fonts || !state.blank || !state.fits || !state.fieldsFit || state.direction !== 'ltr' ||
        state.pages !== sourceLayout.pages || JSON.stringify(state.fields) !== JSON.stringify(sourceLayout.fields) ||
        JSON.stringify(state.sections) !== JSON.stringify(sourceLayout.sections) || network.length) {
      throw new Error(`${form.id}: layout/parity failure ${JSON.stringify(state)}`);
    }
    const pdf = await page.pdf({ path: resolve(output, `${form.id}.pdf`), preferCSSPageSize: true, printBackground: true });
    if (process.argv.includes('--screenshots')) for (let i = 0; i < state.pages; i++) {
      await page.locator('.sheet').nth(i).screenshot({ path: resolve(output, `${form.id}-${i + 1}.png`) });
    }
    if (form.kind !== 'G') {
      const field = page.locator('.line[contenteditable]').first();
      await field.fill('Fictional review answer');
      if (!await page.evaluate(() => window.MindfulPathForm.validate())) throw new Error('Short answer clipped');
      const long = 'Fictional long review answer. '.repeat(100);
      await field.fill(long);
      const guarded = await page.evaluate(answer => {
        let printed = false;
        window.print = () => { printed = true; }; window.alert = () => {};
        document.getElementById('print-form').click();
        return !printed && document.body.classList.contains('has-overflow') && window.MindfulPathForm.answers().includes(answer);
      }, long);
      if (!guarded) throw new Error('Long-answer print guard failed');
      const pending = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Save answers as text', exact: true }).click();
      const download = await pending;
      if (download.suggestedFilename() !== `${form.id}-answers.txt` || !(await readFile(await download.path(), 'utf8')).includes(long)) throw new Error('Complete answer download failed');
    }
    results.push({ id: form.id, pages: state.pages, fields: state.fields.length, bytes: pdf.length,
      sha256: createHash('sha256').update(pdf).digest('hex'), sourceId: source.id, status: 'draft' });
    await page.close();
    console.log(`${form.id}: ${state.pages} pages; source/layout/fill/download parity passed`);
  }
  await writeFile(resolve(output, 'review-catalog.json'), JSON.stringify(catalog, null, 2) + '\n');
  await writeFile(resolve(output, 'qa-results.json'), JSON.stringify(results, null, 2) + '\n');
} finally { await browser.close(); }
