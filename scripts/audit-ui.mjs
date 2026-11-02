/**
 * Repeatable UI inventory against a production build, with synthetic API data.
 * No live session is used. External requests and mutations are intercepted.
 * Run: npm run build && node scripts/audit-ui.mjs
 * AUDIT_DIST, AUDIT_OUT and AUDIT_CHROMIUM can override local paths.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { build } from 'esbuild';
import { preview } from 'vite';
import { auditStates } from './ui-audit-states.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.resolve(process.env.AUDIT_OUT || '/tmp/mindful-ui-audit');
fs.mkdirSync(out, { recursive: true });
const helper = path.join(root, 'node_modules/.cache/ui-audit-helper.mjs');
await build({ entryPoints: [path.join(root, 'tests/helpers/ui.ts')], outfile: helper,
  bundle: true, packages: 'external', platform: 'node', format: 'esm' });
const { mockApi } = await import(helper);
const server = await preview({ root, build: { outDir: process.env.AUDIT_DIST || 'dist' },
  preview: { host: '127.0.0.1', port: 5173, strictPort: true } });
const browser = await chromium.launch({
  ...(process.env.AUDIT_CHROMIUM ? { executablePath: process.env.AUDIT_CHROMIUM } : {}),
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage', ...(process.env.AUDIT_DISABLE_GPU === '1' ? ['--disable-gpu'] : ['--use-gl=angle', '--use-angle=swiftshader'])]
});

const config = fs.readFileSync(path.join(root, 'src/pages.config.js'), 'utf8');
const pageNames = [...config.split('export const PAGES = {').at(-1).split('}')[0]
  .matchAll(/"([^"]+)":/g)].map(m => m[1]);
const app = fs.readFileSync(path.join(root, 'src/App.jsx'), 'utf8');
const explicitRoutes = [...app.matchAll(/path="([^"]+)"/g)]
  .map(m => m[1]).filter(p => !p.includes('*'));
const routes = [...new Set([...pageNames.map(p => '/' + p), ...explicitRoutes, '/not-a-real-page'])];
const catalog = fs.readFileSync(path.join(root, 'src/components/experiential_games/mindGamesContent.jsx'), 'utf8');
const games = [...catalog.matchAll(/slug:\s*"([^"]+)"/g)].map(m => m[1]);
const statesOnly = process.argv.includes('--states');
const targets = statesOnly ? [] : [...routes.map(url => ({ name: url.slice(1) || 'root', url })),
  ...games.map(game => ({ name: 'game-' + game, url: '/ExperientialGames?game=' + game, game }))];
const results = [];
const tasks = (process.env.AUDIT_LANGUAGES || 'en,he').split(',').flatMap(language => (process.env.AUDIT_WIDTHS || '390,768,1440').split(',').map(Number).map(width => ({ language, width })));
const selectedTargets = process.env.AUDIT_TARGETS ? targets.filter(t => process.env.AUDIT_TARGETS.split(',').includes(t.name)) : targets;

async function worker() {
  while (tasks.length) {
    const { language, width } = tasks.shift();
    const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 1000 },
      colorScheme: 'light', reducedMotion: 'reduce' });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    page.setDefaultNavigationTimeout(30000);
    const stateErrors = [];
    if (statesOnly) page.on('pageerror', error => stateErrors.push(error.message));
    await mockApi(page);
    await page.addInitScript(language => {
      localStorage.setItem('language', language);
      localStorage.setItem('i18nextLng', language);
      localStorage.setItem('age_verified', 'true');
      localStorage.setItem('chat_consent_accepted', 'true');
      window.__TEST_APP_ID__ = 'test-app-id';
      window.__DISABLE_ANALYTICS__ = true;
    }, language);
    // Last registered handler runs first. All writes remain local mock responses.
    await page.route('**/*', async route => {
      const req = route.request();
      const u = new URL(req.url());
      if (u.pathname.includes('/api/')) {
        if (u.pathname.includes('/entities/User/me') || u.pathname.endsWith('/auth/me')) {
          return route.fulfill({ json: { id: 'audit-user', email: 'audit@example.invalid',
            full_name: language === 'he' ? 'סקירת ממשק' : 'UI review', role: 'admin',
            onboarding_completed: true, preferences: { language } } });
        }
        if (req.method() !== 'GET') return route.fulfill({ json: { id: 'audit-result', success: true } });
        if (!u.pathname.includes('/entities/') && !u.pathname.includes('/public-settings/') && !u.pathname.includes('/auth/')) {
          return route.fulfill({ json: [] });
        }
        return route.fallback();
      }
      if (u.origin !== 'http://127.0.0.1:5173') return route.abort();
      return route.fallback();
    });
    for (const target of selectedTargets) {
      const errors = [];
      const listener = error => errors.push(error.message);
      page.on('pageerror', listener);
      let result = { target: target.name, width, language, errors };
      try {
        await page.goto('http://127.0.0.1:5173' + target.url, { waitUntil: 'networkidle', timeout: 20000 });
        await page.locator('[aria-label="Loading application"]').waitFor({ state: 'hidden', timeout: 10000 });
        if (target.game) await page.getByTestId('mindgame-modal-' + target.game).waitFor({ state: 'visible' });
        await page.evaluate(async () => {
          await document.fonts.ready;
          await Promise.all(document.getAnimations().filter(a => a.effect?.getComputedTiming()?.iterations !== Infinity)
            .map(a => a.finished.catch(() => {})));
        });
        await page.screenshot({ path: path.join(out, `${target.name}-${width}-${language}.png`), animations: 'disabled', timeout: 30000 });
        if (process.env.AUDIT_SWEEP === '1') {
          const hasDialog = await page.getByRole('dialog').count();
          const scrollers = await page.locator(hasDialog
            ? '[role="dialog"].overflow-y-auto, [role="dialog"] .overflow-y-auto'
            : '#app-scroll-container, .garden-flow-shell.overflow-y-auto, .garden-flow-shell .overflow-y-auto').all();
          result.verticalScreens = 1;
          for (let index = 0; index < scrollers.length; index++) {
            const scroller = scrollers[index];
            const sizes = await scroller.evaluate(el => ({ height: el.scrollHeight, viewport: el.clientHeight }));
            if (sizes.viewport < 40 || sizes.height <= sizes.viewport + 16) continue;
            const step = Math.max(40, Math.floor(sizes.viewport * 0.8));
            for (let top = step; top < sizes.height; top += step) {
              await scroller.evaluate((el, top) => el.scrollTo({ top, behavior: 'instant' }), top);
              await page.screenshot({ path: path.join(out, `${target.name}-${width}-${language}-scroll-${index}-${top}.png`), animations: 'disabled', timeout: 30000 });
              result.verticalScreens++;
              if (top >= sizes.height - sizes.viewport) break;
            }
            await scroller.evaluate(el => el.scrollTo({ top: 0, behavior: 'instant' }));
          }
        }
        result = { ...result, ...await page.evaluate(() => {
          const scroller = document.querySelector('#app-scroll-container');
          return { documentOverflow: document.documentElement.scrollWidth - innerWidth,
            contentOverflow: scroller ? scroller.scrollWidth - scroller.clientWidth : 0 };
        }) };
      } catch (error) {
        result.failure = error.message.split('\n')[0];
      }
      page.off('pageerror', listener);
      results.push(result);
      fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(results, null, 2) + '\n');
      console.log(target.name, width, language, result.failure || 'captured');
    }
    if (statesOnly) await auditStates(page, { language, games, capture: async (name, failure) => {
      const result = { target: name, width, language, errors: stateErrors.splice(0), ...(failure ? { failure } : {}) };
      try { await page.screenshot({ path: path.join(out, `${name}-${width}-${language}.png`), animations: 'disabled', timeout: 30000 }); }
      catch (error) { result.failure = error.message.split('\n')[0]; }
      if (process.env.AUDIT_SWEEP === '1') {
        result.verticalScreens = 1;
        const hasDialog = await page.getByRole('dialog').count();
        for (const [index, scroller] of (await page.locator(hasDialog
          ? '[role="dialog"].overflow-y-auto, [role="dialog"] .overflow-y-auto'
          : '#app-scroll-container, .garden-flow-shell.overflow-y-auto, .garden-flow-shell .overflow-y-auto').all()).entries()) {
          const sizes = await scroller.evaluate(el => ({ height: el.scrollHeight, viewport: el.clientHeight }));
          if (sizes.viewport < 40 || sizes.height <= sizes.viewport + 16) continue;
          const step = Math.max(40, Math.floor(sizes.viewport * 0.8));
          for (let top = step; top < sizes.height; top += step) {
            await scroller.evaluate((el, top) => el.scrollTo({ top, behavior: 'instant' }), top);
            await page.screenshot({ path: path.join(out, `${name}-${width}-${language}-scroll-${index}-${top}.png`), animations: 'disabled', timeout: 30000 });
            result.verticalScreens++;
            if (top >= sizes.height - sizes.viewport) break;
          }
          await scroller.evaluate(el => el.scrollTo({ top: 0, behavior: 'instant' }));
        }
      }
      Object.assign(result, await page.evaluate(() => ({ documentOverflow: document.documentElement.scrollWidth - innerWidth })));
      results.push(result);
      fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(results, null, 2) + '\n');
      console.log(name, width, language, failure || 'captured');
    }});
    await context.close();
  }
}
try {
  await Promise.all(Array.from({ length: Number(process.env.AUDIT_WORKERS || 2) }, () => worker()));
} finally {
  await browser.close();
  await new Promise(resolve => server.httpServer.close(resolve));
}
console.log(JSON.stringify({ views: results.length, failures: results.filter(r => r.failure).length,
  javascriptErrors: results.reduce((sum, r) => sum + r.errors.length, 0),
  overflow: results.filter(r => r.documentOverflow > 2 || r.contentOverflow > 2).length }));
