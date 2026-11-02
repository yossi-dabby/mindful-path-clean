import {test,expect} from '@playwright/test';
import {prepareShared,inspect} from '../helpers/sharedStage6';
import {assertPathTextContrast} from '../../../tests/helpers/pathStage3';
import {stage6UiCopy as copy} from '../../../src/components/i18n/stage6UiTranslations';
import {APPEARANCE_PALETTES} from '../../../src/lib/appearancePalettes';
const envs=[['en','light',390],['he','dark',390],['en','dark',1280],['he','light',1280]] as const;
for(const [language,theme,width] of envs){
 test(`Settings preferences persist together ${language}/${theme}/${width}`,async({page})=>{
  test.setTimeout(90000);await page.setViewportSize({width,height:900});const state=await prepareShared(page,language,theme);await page.goto('/Settings');
  const name=page.locator('#settings-full-name');await expect(name).toHaveAccessibleName(/.+/);await name.fill('Synthetic edited name אבג ABC '+ 'Long '.repeat(20));
  await page.locator('#settings-profile button[type=submit]').click();await expect.poll(()=>state.user.full_name).toContain('Synthetic edited');
  await page.getByTestId('retention-select').click();await page.getByRole('option').nth(1).click();await expect.poll(()=>state.user.preferences.data_retention_days).toBe(90);
  const toggle=page.locator('#settings-notifications [role=switch]').first();await toggle.click();await expect(toggle).toBeChecked();await expect.poll(()=>state.user.preferences.notifications.dailyReminders).toBe(true);
  await page.locator('#settings-appearance button').filter({has:page.locator('h3')}).nth(1).click();await expect.poll(()=>state.user.preferences.theme).toBe('ocean');
  const other=language==='he'?'English':'עברית';await page.locator('#settings-language button').filter({has:page.locator('h3',{hasText:other})}).click();await expect.poll(()=>state.user.preferences.language).toBe(language==='he'?'en':'he');
  expect(state.user.preferences.keep).toBe('preserve-synthetic-preference');expect(state.user.preferences.data_retention_days).toBe(90);expect(state.user.preferences.notifications.dailyReminders).toBe(true);
  await page.reload();await expect(page.locator('#settings-full-name')).toHaveValue(state.user.full_name);
  await expect(page.getByTestId('retention-select')).toContainText('90');
  await expect.poll(()=>page.evaluate(()=>document.documentElement.style.getPropertyValue('--color-primary'))).toBe(APPEARANCE_PALETTES.ocean.primary);
  expect(state.writes.filter(x=>['UserPoints','Subscription'].includes(x.entity))).toHaveLength(0);
  await inspect(page,page.locator('#settings-privacy'),`preferences-${language}-${theme}-${width}`);
 });
 test(`Settings save failures rollback and retry ${language}/${theme}/${width}`,async({page})=>{
  test.setTimeout(90000);await page.setViewportSize({width,height:900});const state=await prepareShared(page,language,theme);let fail=true;
  await page.route(/\/entities\/User\/test-user-123(?:\?|$)/,route=>route.request().method()==='GET'||!fail?route.fallback():route.fulfill({status:503,json:{error:'synthetic offline'}}));
  await page.goto('/Settings');await expect(page.locator('#settings-full-name')).toBeVisible();
  await page.getByTestId('retention-select').click();await page.getByRole('option').nth(0).click();await expect(page.getByTestId('data-privacy-message')).toHaveAttribute('role','alert');await expect(page.getByTestId('retention-select')).not.toContainText('30');expect(state.user.preferences.data_retention_days).toBe(365);
  const toggle=page.locator('#settings-notifications [role=switch]').first();await toggle.click();await expect(page.getByTestId('settings-save-error')).toBeVisible();await expect(toggle).not.toBeChecked();
  const palettes=page.locator('#settings-appearance button').filter({has:page.locator('h3')});await palettes.nth(2).click();await expect(palettes.first()).toHaveAttribute('aria-pressed','true');
  const name=page.locator('#settings-full-name');await name.fill('Unsaved synthetic draft');await page.locator('#settings-profile button[type=submit]').click();await expect(name).toHaveValue('Unsaved synthetic draft');
  fail=false;await page.locator('#settings-profile button[type=submit]').click();await expect.poll(()=>state.user.full_name).toBe('Unsaved synthetic draft');
  await page.getByTestId('retention-select').click();await page.getByRole('option').nth(0).click();await expect.poll(()=>state.user.preferences.data_retention_days).toBe(30);
 });
 test(`Appearance six palettes and mode persistence ${language}/${theme}/${width}`,async({page})=>{
  test.setTimeout(90000);await page.setViewportSize({width,height:900});await prepareShared(page,language,theme);await page.goto('/Settings');
  const palettes=page.locator('#settings-appearance button').filter({has:page.locator('h3')});
  for(const [i,[id,colors]] of Object.entries(APPEARANCE_PALETTES).entries()){
   await palettes.nth(i).click();await expect(palettes.nth(i)).toHaveAttribute('aria-pressed','true');await expect(palettes.nth(i)).toBeEnabled();
   await expect.poll(()=>page.evaluate(()=>document.documentElement.style.getPropertyValue('--color-primary'))).toBe(colors.primary);
   await assertPathTextContrast(palettes.nth(i).locator('h3'));await assertPathTextContrast(palettes.nth(i).locator('p'));
  }
  const group=page.getByRole('group',{name:copy[language].appearance_mode});
  for(const mode of ['dark','light','system']){await group.getByRole('button',{name:copy[language][mode],exact:true}).click();await expect.poll(()=>page.evaluate(()=>localStorage.getItem('theme'))).toBe(mode);}
  await page.reload();await expect(group.getByRole('button',{name:copy[language].system,exact:true})).toHaveAttribute('aria-pressed','true');
 });
 test(`Delete dialog gate cancel failure retry ${language}/${theme}/${width}`,async({page})=>{
  await page.setViewportSize({width,height:600});const state=await prepareShared(page,language,theme);let attempts=0;
  await page.route('**/functions/deleteMyAccount',route=>{attempts++;return route.fulfill({status:503,json:{error:'synthetic failure only'}});});
  await page.goto('/Settings');const trigger=page.getByTestId('delete-account-button');await trigger.click();const dialog=page.getByRole('alertdialog');const input=page.getByTestId('delete-account-input');const confirm=page.getByTestId('delete-account-confirm-button');
  await expect(input).toHaveAccessibleName(/.+/);await input.fill('DELET');await expect(confirm).toBeDisabled();await input.fill('DELETE');await expect(confirm).toBeEnabled();await confirm.click();await expect(dialog.getByRole('alert')).toBeVisible();await expect(input).toHaveValue('DELETE');await expect(confirm).toBeEnabled();expect(attempts).toBe(1);expect(page.url()).toContain('/Settings');
  await confirm.click();await expect.poll(()=>attempts).toBe(2);await expect(confirm).toBeEnabled();await inspect(page,dialog,`delete-failed-${language}-${theme}-${width}`);
  await page.getByTestId('delete-account-cancel-button').click();await expect(dialog).not.toBeVisible();await expect(trigger).toBeFocused();await trigger.click();await expect(input).toHaveValue('');await page.keyboard.press('Escape');await expect(dialog).not.toBeVisible();expect(state.calls.filter(x=>x.name==='deleteMyAccount')).toHaveLength(0);
 });
 test(`Export JSON and recoverable error ${language}/${theme}/${width}`,async({page})=>{
  await page.setViewportSize({width,height:900});const state=await prepareShared(page,language,theme);await page.goto('/Settings');const button=page.getByTestId('export-data-btn');
  const downloaded=page.waitForEvent('download');await button.click();const download=await downloaded;expect(download.suggestedFilename()).toMatch(/^mindful-path-export-.*\.json$/);
  const stream=await download.createReadStream();const chunks=[];for await(const chunk of stream!)chunks.push(chunk);const data=JSON.parse(Buffer.concat(chunks).toString());expect(data.profile.id).toBe(state.user.id);expect(data.records).toEqual([]);
  await page.route('**/functions/exportMyData',route=>route.fulfill({status:503,json:{error:'synthetic failure'}}));await button.click();await expect(page.getByTestId('data-privacy-message')).toHaveAttribute('role','alert');await expect(button).toBeEnabled();
 });
}
test('Language failure keeps device language and exposes profile retry',async({page})=>{
 const state=await prepareShared(page);let fail=true;await page.route(/\/entities\/User\/test-user-123(?:\?|$)/,route=>route.request().method()==='GET'||!fail?route.fallback():route.fulfill({status:503,json:{error:'synthetic'}}));await page.goto('/Settings');
 const card=page.locator('#settings-language');await card.getByRole('button').filter({hasText:'עברית'}).click();await expect(card.getByRole('alert')).toContainText(copy.he.language_local);expect(state.user.preferences.language).toBe('en');await expect(page.locator('html')).toHaveAttribute('dir','rtl');fail=false;await card.getByRole('button',{name:copy.he.retry}).click();await expect.poll(()=>state.user.preferences.language).toBe('he');await expect(card.getByRole('alert')).not.toBeVisible();
});
test('Administrator account deletion stays blocked without backend call',async({page})=>{
 const state=await prepareShared(page,'he','dark','admin');await page.goto('/Settings');await page.getByTestId('delete-account-button').click();await expect(page.getByTestId('delete-account-input')).toHaveCount(0);await expect(page.getByTestId('delete-account-confirm-button')).toHaveCount(0);await page.getByTestId('delete-account-cancel-button').click();expect(state.calls.filter(x=>x.name==='deleteMyAccount')).toHaveLength(0);
});
