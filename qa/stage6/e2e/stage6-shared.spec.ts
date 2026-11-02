import {test,expect} from '@playwright/test';
import {prepareShared,inspect} from '../helpers/sharedStage6';
import {stage6UiCopy as copy} from '../../../src/components/i18n/stage6UiTranslations';
import {assertPathTextContrast} from '../../../tests/helpers/pathStage3';
for(const language of ['en','he'])for(const theme of ['light','dark']){
 test(`Shared navigation notification recovery focus ${language}/${theme}`,async({page})=>{
  test.setTimeout(90000);await page.setViewportSize({width:390,height:844});const state=await prepareShared(page,language,theme);
  state.db.AppNotification=[{id:'qa-notification',title:'Synthetic notification אבג 123 '+ 'Long '.repeat(15),message:'QA only '+ 'ABCD'.repeat(70),created_date:'not-a-date',type:'system',is_read:false}];
  await page.goto('/Settings');const menu=page.getByTestId('mobile-menu-button');await menu.click();const drawer=page.getByTestId('mobile-drawer');await expect(drawer).toBeVisible();await expect.poll(()=>drawer.evaluate(el=>el.contains(document.activeElement))).toBe(true);await page.keyboard.press('Tab');await expect.poll(()=>drawer.evaluate(el=>el.contains(document.activeElement))).toBe(true);
  await inspect(page,drawer,`mobile-menu-${language}-${theme}`);await page.keyboard.press('Escape');await expect(drawer).not.toBeVisible();await expect(menu).toBeFocused();
  await menu.click();await page.getByTestId('mobile-nav-tools').click();await expect(page).toHaveURL(/\/Tools$/);await expect(drawer).not.toBeVisible();await expect(page.locator('html')).toHaveAttribute('dir',language==='he'?'rtl':'ltr');
  const bell=page.locator('[data-mobile-header] button[aria-haspopup=dialog]').first();await bell.click();const dialog=page.getByRole('dialog');await expect(dialog).toContainText(copy[language].unknown_date);await expect.poll(()=>dialog.evaluate(el=>el.contains(document.activeElement))).toBe(true);
  await page.route(/\/entities\/AppNotification\/qa-notification(?:\?|$)/,route=>route.request().method()==='GET'?route.fallback():route.fulfill({status:503,json:{error:'synthetic'}}));
  await dialog.getByRole('button').filter({hasText:'Synthetic notification'}).click();await expect(dialog.getByRole('alert')).toBeVisible();await expect(bell).toContainText('1');
  await inspect(page,dialog,`notifications-failure-${language}-${theme}`);await page.keyboard.press('Escape');await expect(dialog).not.toBeVisible();await expect(bell).toBeFocused();
  await page.unroute(/\/entities\/AppNotification\/qa-notification(?:\?|$)/);await bell.click();await dialog.getByRole('button').filter({hasText:'Synthetic notification'}).click();await expect.poll(()=>state.db.AppNotification[0].is_read).toBe(true);await dialog.getByRole('button',{name:language==='he'?'מחיקת התראה':'Delete notification'}).click();await expect.poll(()=>state.db.AppNotification.length).toBe(0);
 });
 test(`Public pages long missing link contrast ${language}/${theme}`,async({page})=>{
  await page.setViewportSize({width:360,height:740});await prepareShared(page,language,theme);
  for(const route of ['about','account-deletion','data-deletion','privacy','terms','contact','missing-'+ 'ABCDEFG'.repeat(35)]){
   await page.goto('/'+route);const main=page.getByRole('main').last();await expect(main.getByRole('heading',{level:1})).toBeVisible();
   expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(362);
   const paragraphs=main.locator('p').filter({visible:true});if(await paragraphs.count())await assertPathTextContrast(paragraphs.first());
   const links=main.locator('footer a').filter({visible:true});if(await links.count())await assertPathTextContrast(links.first());
   if(route.startsWith('missing'))await inspect(page,main,`404-long-${language}-${theme}`);
  }
 });
 test(`Human support all regions and link metadata ${language}/${theme}`,async({page})=>{
  await page.setViewportSize({width:430,height:900});await prepareShared(page,language,theme);await page.goto('/contact');const select=page.getByTestId('human-support-region');
  const values=await select.locator('option').evaluateAll(els=>els.map(el=>(el as HTMLOptionElement).value).filter(Boolean));expect(values.length).toBeGreaterThan(1);
  for(const value of values){await select.selectOption(value);const cards=page.locator('article[data-testid^=human-support-]').filter({has:page.locator('h3')});await expect(cards.first()).toBeVisible();const hrefs=await cards.locator('a').evaluateAll(els=>els.map(el=>el.getAttribute('href')));expect(hrefs.every(h=>/^(https:|tel:|sms:|mailto:)/.test(h||''))).toBe(true);await assertPathTextContrast(cards.first().locator('p').first());}
  await inspect(page,page.getByTestId('human-support-page'),`support-selected-${language}-${theme}`);
 });
}
test('Notification library loading failure retry and empty state',async({page})=>{
 await page.setViewportSize({width:390,height:844});await prepareShared(page);let fail=true;
 await page.route(/\/entities\/AppNotification(?:\?|$)/,route=>fail?route.fulfill({status:503,json:{error:'synthetic'}}):route.fulfill({json:[]}));await page.goto('/Settings');const bell=page.locator('[data-mobile-header] button[aria-haspopup=dialog]').first();await bell.click();const dialog=page.getByRole('dialog');await expect(dialog.getByRole('alert')).toBeVisible({timeout:30000});fail=false;await dialog.getByRole('button',{name:copy.en.retry}).click();await expect(dialog.getByRole('alert')).not.toBeVisible();await expect(dialog).toContainText('No notifications');
});
