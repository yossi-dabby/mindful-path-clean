
import {expect,test} from '@playwright/test';
import {mockApi} from '../helpers/ui';
for(const width of [360,768,1440]){
 test('empty chat has no painted suggestion band at '+width,async({page})=>{
  await mockApi(page);await page.addInitScript(()=>{localStorage.setItem('chat_consent_accepted','true');localStorage.setItem('age_verified','true');(window as any).__TEST_APP_ID__='test-app-id';(window as any).__DISABLE_ANALYTICS__=true;});
  await page.setViewportSize({width,height:900});await page.goto('/Chat',{waitUntil:'networkidle'});
  await expect(page.getByTestId('chat-welcome')).toBeVisible();
  const scroller=page.getByTestId('chat-empty-state-scroll');await expect(page.getByTestId('proactive-check-in')).toHaveCount(0);
  await expect(scroller.locator(':scope > div')).toHaveCount(1);
  expect(await page.getByTestId('chat-root').evaluate(el=>getComputedStyle(el).backgroundColor)).toBe('rgba(0, 0, 0, 0)');
  await expect(page.getByTestId('chat-intent-chooser')).toBeVisible();
 });
}
test('real suggestions survive and collapse completely after dismissal',async({page})=>{
 await mockApi(page);
 await page.route('**/entities/Goal**',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify([{id:'layer-test-goal',title:'Reading',status:'active',created_date:'2020-01-01T00:00:00Z'}])}));
 await page.addInitScript(()=>{localStorage.setItem('chat_consent_accepted','true');localStorage.setItem('age_verified','true');(window as any).__TEST_APP_ID__='test-app-id';(window as any).__DISABLE_ANALYTICS__=true;});
 await page.goto('/Chat',{waitUntil:'networkidle'});const panel=page.getByTestId('proactive-check-in');await expect(panel).toBeVisible();
 await panel.locator('button').last().click();await expect(panel).toHaveCount(0);
 await expect(page.getByTestId('chat-empty-state-scroll').locator(':scope > div')).toHaveCount(1);
});
