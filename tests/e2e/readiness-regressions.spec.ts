import {test, expect} from '@playwright/test';
import {mockApi} from '../helpers/ui';

test.beforeEach(async ({page}) => {
  await mockApi(page);
  await page.addInitScript(() => {
    localStorage.setItem('language','en');
    localStorage.setItem('i18nextLng','en');
    localStorage.setItem('chat_consent_accepted','true');
    (window as any).__TEST_APP_ID__='test-app-id';
    (window as any).__DISABLE_ANALYTICS__=true;
  });
});
const nav = (page:any, path:string) => page.locator(`[data-mobile-bottom-nav] a[href="/${path}"]`);

test('readiness regression: preserve unsent chat text across bottom tabs', async ({page}, info) => {
  await page.goto('/Chat');
  const input = page.getByTestId('therapist-chat-input');
  await expect(input).toBeVisible({timeout:20000});
  await expect(input).toBeEnabled();
  await input.fill('SYNTHETIC AUDIT unsent text 2026-11-21');
  const before = await input.inputValue();
  await nav(page,'Home').click();
  await expect(page.getByTestId('daily-path')).toBeVisible();
  await nav(page,'Chat').click();
  await expect(input).toBeVisible();
  const after = await input.inputValue();
  await info.attach('draft-preservation.json',{body:JSON.stringify({before,after}), contentType:'application/json'});
  expect(after).toBe(before);
});

test('readiness regression: computed styles and actual touch target sizes', async ({page}, info) => {
  await page.goto('/Settings');
  await expect(page.getByTestId('settings-hero')).toBeVisible({timeout:20000});
  const findings = await page.evaluate(() => {
    const main = document.getElementById('app-scroll-container')!;
    const controls = Array.from(document.querySelectorAll('button, [role="combobox"], input, nav a')).filter(el=>{
      const b=el.getBoundingClientRect();return b.width>0 && b.height>0;
    }).map(el=>{
      const b=el.getBoundingClientRect();
      return {tag:el.tagName, role:el.getAttribute('role'), text:el.getAttribute('aria-label')||el.textContent?.trim().slice(0,65), width:b.width, height:b.height, select:getComputedStyle(el).userSelect};
    });
    return {viewport:innerWidth, htmlOverscroll:getComputedStyle(document.documentElement).overscrollBehavior, bodyOverscroll:getComputedStyle(document.body).overscrollBehavior, mainOverscroll:getComputedStyle(main).overscrollBehavior, under48:controls.filter(c=>c.width<47.5||c.height<47.5), controlCount:controls.length};
  });
  await info.attach('computed-ui.json',{body:JSON.stringify(findings,null,2),contentType:'application/json'});
  expect(findings.mainOverscroll).toBe('none');
  expect(findings.under48).toEqual([]);
});

test('readiness regression: preserve page scroll after bottom-tab round trip', async ({page}, info) => {
  await page.goto('/Home');
  await expect(page.getByTestId('daily-path')).toBeVisible({timeout:20000});
  await page.locator('#app-scroll-container').evaluate(el=>{el.scrollTop=350;});
  const before = await page.locator('#app-scroll-container').evaluate(el=>el.scrollTop);
  expect(before).toBeGreaterThan(200);
  await nav(page,'Tools').click();
  await expect(page.locator('[data-tool="exercises"]')).toBeVisible();
  await nav(page,'Home').click();
  await expect(page.getByTestId('daily-path')).toBeVisible();
  await page.waitForTimeout(500);
  const after = await page.locator('#app-scroll-container').evaluate(el=>el.scrollTop);
  await info.attach('scroll-preservation.json',{body:JSON.stringify({before,after}),contentType:'application/json'});
  expect(Math.abs(after-before)).toBeLessThan(2);
});

test('readiness regression: restore Tools subpage after tab round trip', async ({page}, info) => {
  await page.goto('/Tools');
  const exercises=page.locator('[data-tool="exercises"]');
  await expect(exercises).toBeVisible({timeout:20000});
  await exercises.click();
  await expect(page).toHaveURL(/\/Exercises/);
  await expect(page.locator('[data-app-page-name="Exercises"]')).toBeVisible();
  await nav(page,'Home').click();
  await expect(page.getByTestId('daily-path')).toBeVisible();
  await nav(page,'Tools').click();
  await expect(page).toHaveURL(/\/Exercises/);
  await expect(page.locator('[data-app-page-name="Exercises"]')).toBeVisible();
  await info.attach('subpage-restored.json',{body:JSON.stringify({path:new URL(page.url()).pathname}),contentType:'application/json'});
});

test('readiness regression: intentional active-tab reset and subsequent restoration', async ({page}) => {
  await page.goto('/Home');
  const main = page.locator('#app-scroll-container');
  await expect(page.getByTestId('daily-path')).toBeVisible();
  await main.evaluate(el => { el.scrollTop = 350; });
  await nav(page, 'Home').click();
  await expect.poll(() => main.evaluate(el => el.scrollTop)).toBeLessThan(2);
  await main.evaluate(el => { el.scrollTop = 280; });
  await nav(page, 'Tools').click();
  await expect(page.locator('[data-tool="exercises"]')).toBeVisible();
  await nav(page, 'Home').click();
  await expect(page.getByTestId('daily-path')).toBeVisible();
  await expect.poll(() => main.evaluate(el => el.scrollTop)).toBeCloseTo(280, 0);
});

test('readiness regression: drafts remain text-only in memory and clearing is retained', async ({page}) => {
  await page.goto('/Chat');
  const input = page.getByTestId('therapist-chat-input');
  await expect(input).toBeEnabled();
  const draft = 'SYNTHETIC private draft not for persistent storage';
  await input.fill(draft);
  await nav(page, 'Home').click();
  await expect(page.getByTestId('daily-path')).toBeVisible();
  await nav(page, 'Chat').click();
  await expect(input).toHaveValue(draft);
  const browserStorage = await page.evaluate(() => JSON.stringify([localStorage, sessionStorage]));
  expect(browserStorage).not.toContain(draft);
  await input.fill('');
  await nav(page, 'Home').click();
  await expect(page.getByTestId('daily-path')).toBeVisible();
  await nav(page, 'Chat').click();
  await expect(input).toHaveValue('');
});
