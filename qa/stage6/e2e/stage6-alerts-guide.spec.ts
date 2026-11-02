import {test,expect} from '@playwright/test';
import {prepareShared,inspect} from '../helpers/sharedStage6';
import {stage6UiCopy as copy} from '../../../src/components/i18n/stage6UiTranslations';
import {assertPathTextContrast} from '../../../tests/helpers/pathStage3';
for(const language of ['en','he'])for(const theme of ['light','dark'])for(const width of [360,390,430,768,1024,1280,1440]){
 test(`Alerts and technical guide matrix ${language}/${theme}/${width}`,async({page})=>{
  test.setTimeout(90000);await page.setViewportSize({width,height:900});await prepareShared(page,language,theme,'admin');const errors=[];page.on('pageerror',error=>errors.push(error.message));
  for(const route of ['CrisisAlerts','TestSetupGuide']){await page.goto('/'+route);await expect(page.locator('#app-scroll-container h1')).toBeVisible();const metrics=await inspect(page,page.locator('#app-scroll-container'),`${route}-${language}-${theme}-${width}`);expect(metrics.appScroll).toBeLessThanOrEqual(metrics.appWidth+2);expect(errors).toEqual([]);}
 });
}
for(const language of ['en','he'])for(const theme of ['light','dark']){
 test(`Alerts gate failure filters partial data and clipboard recovery ${language}/${theme}`,async({page})=>{
  test.setTimeout(90000);await page.setViewportSize({width:390,height:844});const state=await prepareShared(page,language,theme);let reads=0,fail=true;
  await page.route(/\/entities\/CrisisAlert(?:\?|$)/,route=>{reads++;return fail?route.fulfill({status:503,json:{error:'synthetic'}}):route.fallback();});await page.goto('/CrisisAlerts');await expect(page.getByTestId('crisis-alerts-list')).toHaveCount(0);await expect(page.getByRole('heading',{level:2})).toBeVisible();expect(reads).toBe(0);
  state.user.role='admin';state.db.CrisisAlert=[{id:'qa-alert',surface:'unknown-fixture-surface',reason_code:'general_crisis',created_date:'invalid-date',user_email:'synthetic-'+ 'abc'.repeat(35)+'@example.com',conversation_id:'qa-'+ 'x'.repeat(100)}];await page.goto('/CrisisAlerts');await expect(page.getByRole('alert')).toBeVisible({timeout:30000});fail=false;await page.getByRole('button',{name:copy[language].retry}).click();await expect(page.getByTestId('alert-item-qa-alert')).toContainText(copy[language].unknown_date);await assertPathTextContrast(page.getByTestId('alert-item-qa-alert').locator('p').first());
  await page.getByTestId('surface-filter').click();await page.getByRole('option').nth(1).click();await expect(page.getByTestId('alert-item-qa-alert')).toHaveCount(0);await page.getByTestId('surface-filter').click();await page.getByRole('option').first().click();await expect(page.getByTestId('alert-item-qa-alert')).toBeVisible();await inspect(page,page.locator('#app-scroll-container'),`alerts-partial-${language}-${theme}`);
  await page.addInitScript(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw new Error('Synthetic denied');}}}));await page.goto('/TestSetupGuide');await page.getByRole('button',{name:copy[language].copy,exact:true}).first().click();await expect(page.getByRole('alert')).toContainText(copy[language].copy_error);await expect(page.getByRole('button',{name:copy[language].copied,exact:true})).toHaveCount(0);
  await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{(window as any).__qaClipboard=text;}}}));await page.getByRole('button',{name:copy[language].copy,exact:true}).first().click();await expect(page.getByRole('button',{name:copy[language].copied,exact:true})).toBeVisible();expect(await page.evaluate(()=>(window as any).__qaClipboard)).toContain('defineConfig');
 });
}
