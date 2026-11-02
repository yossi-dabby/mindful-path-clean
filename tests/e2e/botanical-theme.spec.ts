import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { mockApi } from '../helpers/ui';

test.describe.configure({mode:'parallel'});
async function prepare(page, language='he') {
  await mockApi(page);
  await page.addInitScript(language => {
    localStorage.setItem('language', language); localStorage.setItem('i18nextLng', language);
    localStorage.setItem('chat_consent_accepted','true'); localStorage.setItem('age_verified','true');
    (window as any).__TEST_APP_ID__='test-app-id'; (window as any).__DISABLE_ANALYTICS__=true;
  }, language);
}
const pages = readFileSync('src/pages.config.js','utf8').split('export const PAGES = {').at(-1)!.split('}')[0];
const routes = [...pages.matchAll(/"([^"]+)":/g)].map(match=>'/'+match[1]);
routes.push('/KnowledgeStudio','/AdminFeatureFlags','/TherapistTraining','/about','/privacy','/terms','/contact','/account-deletion','/login','/register','/forgot-password','/reset-password','/pdf-viewer','/data-deletion');
for(const route of routes) {
  test('botanical layout stays usable: '+route, async ({page})=>{
    test.setTimeout(120000);
    await prepare(page);
    await page.goto(route);
    await expect(page.locator('#root')).not.toBeEmpty({timeout:30000});
    for(const width of [360,768,1440]){
      await page.setViewportSize({width,height:900});
      const size=await page.evaluate(()=>({width:innerWidth,content:document.documentElement.scrollWidth}));
      expect(size.content).toBeLessThanOrEqual(size.width+1);
      for(const art of await page.locator('.botanical-accent:visible').all()){
        await expect(art).toHaveAttribute('aria-hidden','true');
        expect(await art.evaluate(el=>getComputedStyle(el).pointerEvents)).toBe('none');
      }
    }
  });
}
for(const language of ['en','he','es','fr','de','it','pt']){
  test('botanical My Path renders artwork and navigation: '+language,async({page})=>{
    test.setTimeout(120000); await prepare(page,language); await page.goto('/MyPath');
    const hero=page.locator('.botanical-hero');
    await expect(hero).toBeVisible({timeout:30000});
    for(const width of [360,768,1440]){
      await page.setViewportSize({width,height:900});
      const art=hero.locator('svg image').first();
      await expect(art).toHaveAttribute('href','/art/botanical/watercolor-atlas.webp');
      await expect(hero.locator('[data-art-variant="leaves"]')).toBeVisible();
      await expect(page.locator('.botanical-navigation-grid > a')).toHaveCount(3);
      const boundaries=await hero.evaluate(el=>{const copy=el.querySelector('.botanical-hero-copy')!.getBoundingClientRect();const box=el.getBoundingClientRect();return{copyLeft:copy.left,copyRight:copy.right,left:box.left,right:box.right};});
      expect(boundaries.copyLeft).toBeGreaterThanOrEqual(boundaries.left);
      expect(boundaries.copyRight).toBeLessThanOrEqual(boundaries.right);
      await expect(page.locator('.botanical-card-description').first()).not.toContainText('botanical.');
    }
    await page.locator('.botanical-navigation-grid > a[href="/Goals"]').click();
    await expect(page).toHaveURL(/\/Goals/);
  });
}

test("watercolor artwork has a real paint area on Home and My Path",async({page})=>{
 test.setTimeout(120000);await prepare(page);
 const asset=await page.request.get("/art/botanical/watercolor-atlas.webp");expect(asset.ok()).toBe(true);
 for(const route of ["/Home","/MyPath"]){await page.goto(route);const paintings=page.locator(".botanical-daily-art > svg,.botanical-card-art > svg");await expect(paintings).toHaveCount(3);
 for(const width of [360,768,1440]){await page.setViewportSize({width,height:900});for(const art of await paintings.all()){const box=await art.boundingBox();expect(box!.width).toBeGreaterThanOrEqual(40);expect(box!.height).toBeGreaterThanOrEqual(40);}}}
});
