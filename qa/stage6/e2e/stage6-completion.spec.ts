import {test,expect} from '@playwright/test';
import {prepareShared,inspect} from '../helpers/sharedStage6';
import {stage6UiCopy as copy} from '../../../src/components/i18n/stage6UiTranslations';
for(const language of ['en','he','es','fr','de','it','pt']){
 test(`Seven-language settings public auth copy ${language}`,async({page})=>{
  test.setTimeout(90000);await page.setViewportSize({width:360,height:800});await prepareShared(page,language,'dark');
  for(const route of ['about','account-deletion','register','Settings']){
   await page.goto('/'+route);const main=route==='Settings'?page.locator('#settings-language'):page.getByRole('main');await expect(main).toBeVisible();
   if(route==='about')await expect(main.getByRole('heading',{level:1})).toHaveText(copy[language].about_title);
   if(route==='account-deletion')await expect(main.getByRole('heading',{level:1})).toHaveText(copy[language].account_delete_title);
   if(route==='Settings')await expect(page.getByRole('group',{name:copy[language].appearance_mode})).toHaveCount(1);
   expect(await main.innerText()).not.toMatch(/stage6\.[a-z_]+/);expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(362);
  }
 });
}
test('Settings read-only loading and recoverable load failure',async({page})=>{
 await page.setViewportSize({width:390,height:844});const state=await prepareShared(page);await page.goto('/Tools');await expect(page.getByRole('heading',{level:1})).toBeVisible();let fail=true;
 await page.route(/\/entities\/User\/(?:me|test-user-123)(?:\?|$)/,route=>fail?route.fulfill({status:503,json:{error:'synthetic'}}):route.fallback());await page.getByTestId('mobile-menu-button').click();await page.getByTestId('mobile-nav-settings').click();await expect(page.getByRole('alert').filter({hasText:copy.en.load_error})).toBeVisible();fail=false;await page.getByRole('button',{name:copy.en.retry}).click();await expect(page.getByTestId('settings-hero')).toBeVisible();expect(state.writes.filter(x=>['UserPoints','Subscription'].includes(x.entity))).toHaveLength(0);
});
test('OTP resend pending and failure recovery',async({page})=>{
 await prepareShared(page);await page.route('**/auth/register',route=>route.fulfill({json:{success:true}}));let calls=0;let resolveRequest;const release=new Promise<void>(resolve=>resolveRequest=resolve);
 await page.route('**/auth/resend-otp',async route=>{calls++;await release;return route.fulfill({status:503,json:{error:'synthetic'}});});await page.goto('/register');await page.locator('#register-email').fill('synthetic@example.com');await page.locator('#register-password').fill('Synthetic-123!');await page.locator('#register-confirm').fill('Synthetic-123!');await page.locator('form button[type=submit]').click();const resend=page.getByRole('button',{name:'Resend',exact:true});await resend.click();await expect(resend).toBeDisabled();expect(calls).toBe(1);resolveRequest();await expect(page.getByRole('alert')).toBeVisible();await expect(resend).toBeEnabled();
});
test('Synthetic auth success returns only to safe app paths',async({page})=>{
 await prepareShared(page);await page.route('**/auth/login',route=>route.fulfill({json:{access_token:'qa-synthetic-token',user:{id:'test-user-123'}}}));await page.goto('/login?returnTo=%2FSettings');await page.locator('#email').fill('synthetic@example.com');await page.locator('#password').fill('Synthetic-123!');await page.locator('form button[type=submit]').click();await expect(page).toHaveURL(/\/Settings$/);await expect(page.getByTestId('settings-hero')).toBeVisible();
});
test('Synthetic account deletion success makes one request then exits settings',async({page})=>{
 const state=await prepareShared(page);await page.goto('/Settings');await page.getByTestId('delete-account-button').click();await page.getByTestId('delete-account-input').fill('DELETE');await page.getByTestId('delete-account-confirm-button').click();await expect.poll(()=>state.calls.filter(x=>x.name==='deleteMyAccount').length).toBe(1);await expect(page).not.toHaveURL(/\/Settings$/);
});
test('Synthetic reset success and logout navigation',async({page})=>{
 await prepareShared(page);await page.route('**/auth/reset-password',route=>route.fulfill({json:{success:true}}));await page.goto('/reset-password?token=qa-synthetic-token');await page.locator('#password').fill('Synthetic-123!');await page.locator('#confirm').fill('Synthetic-123!');await page.locator('form button[type=submit]').click();await expect(page).toHaveURL(/\/login$/);await page.goto('/Settings');await page.locator('#settings-account button').first().click();await expect(page).not.toHaveURL(/\/Settings$/);
});
test('Training synthetic feedback results and new scenario',async({page})=>{
 await page.setViewportSize({width:768,height:1024});await prepareShared(page,'he','dark');let calls=0;await page.route('**/functions/evaluateTherapistResponse',route=>{calls++;return route.fulfill({json:{feedback:{overall:8,scores:{cbt_adherence:8,empathy:8,deescalation:8,directiveness:8,safety_awareness:8},strengths:['Synthetic QA strength'],improvements:['Synthetic QA improvement'],suggested_response:'Synthetic QA suggestion',session_continues:false},patientReply:'Synthetic QA reply'}});});await page.goto('/TherapistTraining');await page.getByRole('button').filter({hasText:'Acute Panic Attack'}).click();await page.getByRole('textbox',{name:copy.he.training_response}).fill('Synthetic response');await page.getByRole('button',{name:copy.he.send,exact:true}).click();await expect(page.getByRole('textbox',{name:copy.he.training_response})).toHaveCount(0);await expect(page.getByText('Synthetic QA strength')).toBeVisible();expect(calls).toBe(1);await inspect(page,page.locator('#app-scroll-container'),'training-feedback-he-dark-768');await page.getByRole('button',{name:copy.he.new_scenario,exact:true}).first().click();await expect(page.getByRole('button').filter({hasText:'Acute Panic Attack'})).toBeVisible();
});
test('Viewport keyboard resize orientation and touch menu simulation',async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});const page=await context.newPage();await prepareShared(page,'he','dark');await page.goto('/Settings');const input=page.locator('#settings-full-name');await input.focus();await page.setViewportSize({width:390,height:380});await input.fill('Synthetic short viewport');await page.locator('#settings-profile button[type=submit]').click();await expect(input).toHaveValue('Synthetic short viewport');await page.setViewportSize({width:844,height:390});await expect(page.locator('html')).toHaveAttribute('dir','rtl');expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(846);await page.setViewportSize({width:390,height:844});await page.getByTestId('mobile-menu-button').tap();await expect(page.getByTestId('mobile-drawer')).toBeVisible();await page.getByTestId('mobile-nav-settings').tap();await expect(page.getByTestId('mobile-drawer')).not.toBeVisible();await context.close();
});
