import { test, expect } from '@playwright/test';

// Exercise mobile controls without overriding the project's browser engine.
test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
import { mockApi } from '../helpers/ui';
test.beforeEach(async ({page})=>{
 await mockApi(page); await page.addInitScript(()=>{
 localStorage.setItem('language','en');localStorage.setItem('i18nextLng','en');localStorage.setItem('chat_consent_accepted','true');
 (window as any).__TEST_APP_ID__='test-app-id';(window as any).__DISABLE_ANALYTICS__=true;
 });});
test('readiness controls: light dark system and reload persistence',async({page},info)=>{
 await page.emulateMedia({colorScheme:'dark'});
 await page.goto('/Settings');await expect(page.getByTestId('settings-hero')).toBeVisible();
 const appearance=page.locator('#settings-appearance');
 await appearance.getByRole('button',{name:'System',exact:true}).click();
 await expect(page.locator('html')).toHaveClass(/dark/);
 const dark=await page.evaluate(()=>getComputedStyle(document.body).backgroundColor);
 await appearance.getByRole('button',{name:'Light',exact:true}).click();
 await expect(page.locator('html')).not.toHaveClass(/dark/);
 const light=await page.evaluate(()=>getComputedStyle(document.body).backgroundColor);
 expect(light).not.toBe(dark);
 await page.reload();await expect(page.getByTestId('settings-hero')).toBeVisible();
 await expect(page.locator('html')).not.toHaveClass(/dark/);
 await appearance.getByRole('button',{name:'Dark',exact:true}).click();
 await expect(page.locator('html')).toHaveClass(/dark/);
 await info.attach('theme.json',{body:JSON.stringify({dark,light}),contentType:'application/json'});
});
test('readiness controls: retention bottom sheet selection and keyboard focus',async({page})=>{
 let prefs={data_retention_days:365};
 await page.route('**/entities/User/**',async route=>{
 if(route.request().method()!=='GET') prefs={...prefs,...route.request().postDataJSON()?.preferences};
 await route.fulfill({json:{id:'test-user-123',email:'test@example.com',full_name:'Test User',role:'user',onboarding_completed:true,preferences:prefs}});
 });
 await page.goto('/Settings');await expect(page.getByTestId('settings-hero')).toBeVisible();
 const trigger=page.getByTestId('retention-select');await trigger.click();
 const sheet=page.getByTestId('bottom-sheet-select-options');await expect(sheet).toBeVisible();
 const options=sheet.getByRole('option');await expect(options).toHaveCount(4);
 await options.first().focus();await page.keyboard.press('ArrowDown');await expect(options.nth(1)).toBeFocused();
 await page.keyboard.press('Enter');await expect(sheet).not.toBeVisible();
 await expect(trigger).toBeFocused();await expect(trigger).toContainText('90');
});
test('readiness controls: notification optimistic deletion rolls back on server error',async({page},info)=>{
 let rejectResponse:()=>void=()=>{};
 let mutationStarted=false;
 const gate=new Promise<void>(resolve=>{rejectResponse=resolve});
 const item={id:'synthetic-audit-notification',title:'SYNTHETIC audit notification',message:'Test fixture',type:'system',is_read:false,created_date:'2026-11-21T12:00:00Z'};
 await page.route('**/entities/AppNotification**',async route=>{
  if(route.request().method()==='DELETE'){mutationStarted=true;await gate;await route.fulfill({status:500,json:{error:'Synthetic audit failure'}});}
  else await route.fulfill({json:[item]});
 });
 await page.goto('/Home');await expect(page.getByTestId('daily-path')).toBeVisible();
 await page.locator('[data-testid="notification-bell"]:visible').click();
 const panel=page.getByTestId('notification-panel');await expect(panel.getByText(item.title)).toBeVisible();
 await panel.getByRole('button',{name:/delete/i}).click();
 await expect.poll(()=>mutationStarted).toBe(true);
 await expect(panel.getByText(item.title)).not.toBeVisible();
 rejectResponse();
 await expect(panel.getByText(item.title)).toBeVisible();
 await info.attach('rollback.json',{body:JSON.stringify({optimisticRemoval:true,restoredAfter500:true}),contentType:'application/json'});
});
test('readiness controls: editable content selection remains available',async({page})=>{
 await page.goto('/Chat');const input=page.getByTestId('therapist-chat-input');await expect(input).toBeVisible();
 await input.fill('SYNTHETIC selection audit');
 expect(await input.evaluate(el=>{
  const style=getComputedStyle(el);
  return style.getPropertyValue('user-select')||style.getPropertyValue('-webkit-user-select');
 })).toBe('text');
 await input.selectText();expect(await input.evaluate((el:any)=>el.selectionEnd-el.selectionStart)).toBe(25);
});
test('readiness controls: Tools restores rendered subpage not just URL',async({page})=>{
 await page.goto('/Tools');await page.locator('[data-tool="exercises"]').click();
 await expect(page.locator('[data-app-page-name="Exercises"]')).toBeVisible();
 await page.locator('[data-mobile-bottom-nav] a[href="/Home"]').click();
 await expect(page.getByTestId('daily-path')).toBeVisible();
 await page.locator('[data-mobile-bottom-nav] a[href="/Tools"]').click();
 await expect(page).toHaveURL(/\/Exercises/);
 await expect(page.locator('[data-app-page-name="Exercises"]')).toBeVisible();
});

test('readiness controls: chrome labels suppress selection without disabling editable content', async ({ page }) => {
  await page.goto('/Home');
  await expect(page.getByTestId('daily-path')).toBeVisible();
  const labels = page.locator('[data-mobile-bottom-nav] a > span');
  await expect(labels).toHaveCount(5);
  for (const label of await labels.all()) {
    expect(await label.evaluate(el => {
      const style = getComputedStyle(el);
      return style.getPropertyValue('user-select') || style.getPropertyValue('-webkit-user-select');
    })).toBe('none');
  }
  // Protect editable descendants even if a search field is added to chrome.
  const probe = page.locator('[data-mobile-header]');
  await probe.evaluate(el => {
    const input = document.createElement('textarea');
    input.dataset.testid = 'chrome-editable-probe';
    input.value = 'Selectable text';
    el.append(input);
  });
  const editable = page.getByTestId('chrome-editable-probe');
  expect(await editable.evaluate(el => {
    const style = getComputedStyle(el);
    return style.getPropertyValue('user-select') || style.getPropertyValue('-webkit-user-select');
  })).toBe('text');
  await editable.selectText();
  expect(await editable.evaluate((el: HTMLTextAreaElement) => el.selectionEnd - el.selectionStart)).toBe(15);
});

test('readiness controls: overscroll stays scoped to the document and app scroller', async ({ page }) => {
  await page.goto('/Home');
  await expect(page.getByTestId('daily-path')).toBeVisible();
  for (const selector of ['html', 'body', '#app-scroll-container']) {
    expect(await page.locator(selector).evaluate(el => getComputedStyle(el).overscrollBehaviorY)).toBe('none');
  }
  // Preserve browser zoom/panning defaults rather than blocking all touch input.
  expect(await page.locator('html').evaluate(el => getComputedStyle(el).touchAction)).toBe('auto');
});

for (const outcome of ['success', 'error']) {
  test(`readiness controls: exercise favorite updates before the response and handles ${outcome}`, async ({ page }) => {
    let release: () => void = () => {};
    const responseGate = new Promise<void>(resolve => { release = resolve; });
    let payload: any;
    const exercise = { id: 'readiness-exercise', title: 'Readiness exercise fixture', category: 'grounding', difficulty: 'beginner', description: 'Synthetic exercise description', favorite: false };
    const progress = { id: 'readiness-progress', exercise_id: exercise.id, favorite: false };
    let catalogWrites = 0;
    await page.route('**/entities/Exercise**', async route => {
      if (route.request().method() === 'GET') return route.fulfill({ json: [exercise] });
      catalogWrites++;
      return route.fulfill({ status: 500, json: { error: 'Catalog must remain read only' } });
    });
    await page.route('**/entities/UserExerciseProgress**', async route => {
      if (route.request().method() === 'GET') return route.fulfill({ json: [progress] });
      payload = route.request().postDataJSON();
      await responseGate;
      if (outcome === 'error') return route.fulfill({ status: 500, json: { error: 'Synthetic favorite failure' } });
      progress.favorite = payload.favorite;
      return route.fulfill({ json: progress });
    });
    await page.goto('/ExerciseView?id=readiness-exercise');
    const favorite = page.locator('#app-scroll-container button[aria-pressed]');
    await expect(favorite).toHaveAttribute('aria-pressed', 'false');
    await favorite.click();
    try {
      await expect.poll(() => payload).toEqual({ favorite: true });
      await expect(favorite).toHaveAttribute('aria-pressed', 'true');
      await expect(favorite).toBeDisabled();
    } finally {
      release();
    }
    await expect(favorite).toBeEnabled();
    await expect(favorite).toHaveAttribute('aria-pressed', outcome === 'success' ? 'true' : 'false');
    if (outcome === 'error') await expect(page.locator('#app-scroll-container [role="alert"]')).toBeVisible();
    await page.reload();
    await expect(favorite).toHaveAttribute('aria-pressed', outcome === 'success' ? 'true' : 'false');
    expect(catalogWrites).toBe(0);
  });
}
