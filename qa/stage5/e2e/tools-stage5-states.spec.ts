import {test,expect} from '@playwright/test';
import {prepareTools,inspect,evidenceDir} from '../helpers/toolsStage5';
import {assertPathTextContrast} from '../../../tests/helpers/pathStage3';
import fs from 'node:fs';

const surfaces=[['Exercises','Exercise'],['ExerciseView?id=qa-exercise','Exercise'],['Videos','Video'],['Playlists','Playlist'],['PlaylistDetail?id=qa-playlist','Playlist'],['Resources','Resource'],['Coach','CoachingSession'],['CoachingAnalytics','CoachingSession'],['Community','ForumPost']];
for(const language of ['en','he'])for(const theme of ['light','dark']){
test(`Stage5 loading empty error observations ${language}/${theme}`,async({page})=>{
  test.setTimeout(240000);await page.setViewportSize({width:390,height:844});
  const state=await prepareTools(page,language,theme,false);
  for(const [route,entity] of surfaces){
    const base=`state-${route.split('?')[0]}-${language}-${theme}`;
    await page.goto('/'+route);const root=page.locator('#app-scroll-container');await expect(root.locator('h1,h2,[role="status"]').filter({visible:true}).first()).toBeVisible();
    await inspect(page,root,base+'-empty');
    const pattern=new RegExp(`/entities/${entity}(?:[/?]|$)`);
    let release!:()=>void;const held=new Promise<void>(resolve=>release=resolve);
    const handler=async r=>{await held;await r.fulfill({json:[]});};
    await page.route(pattern,handler);
    const req=page.waitForRequest(pattern);await page.goto('/'+route);await req;
    await inspect(page,root,base+'-loading');release();await page.unroute(pattern,handler);
    let calls=0;const failure=async r=>{calls++;return r.fulfill({status:503,json:{message:'Synthetic QA service unavailable'}});};
    await page.route(pattern,failure);await page.goto('/'+route);await expect.poll(()=>calls).toBeGreaterThan(0);
    await page.waitForTimeout(1800);await inspect(page,root,base+'-error');
    fs.writeFileSync(`${evidenceDir}/${base}-requests.json`,JSON.stringify({entity,failedCalls:calls}));
    await page.unroute(pattern,failure);
    const retry=root.getByRole('button',{name:/Retry|Try again|Try Again|נסו שנית|ניסיון חוזר|נסה שוב|נסו שוב/i}).first();
    if(await retry.count()){await Promise.all([page.waitForResponse(pattern),retry.click()]);await inspect(page,root,base+'-retry');}
  }
});

test(`Stage5 failed save observations ${language}/${theme}`,async({page})=>{
  test.setTimeout(90000);await page.setViewportSize({width:360,height:640});
  const state=await prepareTools(page,language,theme);
  await page.route(/\/entities\/Playlist(?:[/?]|$)/,r=>r.request().method()==='POST'?r.fulfill({status:503,json:{message:'Synthetic QA save failure'}}):r.fallback());
  await page.goto('/Videos');await page.getByRole('button').filter({has:page.locator('svg.lucide-plus')}).first().click();
  const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();await dialog.locator('input').fill('Synthetic QA retained draft');await dialog.locator('textarea').fill('Synthetic QA description');
  await dialog.locator('button[type="submit"]').click();await expect(dialog.locator('button[type="submit"]')).toBeEnabled();await expect(dialog.locator('input')).toHaveValue('Synthetic QA retained draft');
  await inspect(page,dialog,`save-error-playlist-${language}-${theme}`);
  await expect(dialog.getByRole('alert')).toBeVisible();const alerts=await dialog.getByRole('alert').count();fs.writeFileSync(`${evidenceDir}/save-error-playlist-${language}-${theme}-alerts.json`,JSON.stringify({alerts,draftRetained:true}));
  await page.unroute(/\/entities\/Playlist(?:[/?]|$)/);await dialog.locator('button[type="submit"]').click();await expect(dialog).toBeHidden();
  await expect.poll(()=>state.writes.filter(w=>w.entity==='Playlist'&&w.method==='POST').length).toBe(1);
  await page.goto('/Community');await page.route(/\/entities\/ForumPost(?:[/?]|$)/,r=>r.request().method()==='POST'?r.fulfill({status:503,json:{message:'Synthetic QA save failure'}}):r.fallback());
  const root=page.getByTestId('community-page');await expect(root).toBeVisible();await root.locator('button').filter({has:page.locator('svg.lucide-plus')}).first().click();
  const post=page.getByTestId('forum-post-dialog');await post.locator('input').first().fill('Synthetic QA retained post');await post.locator('textarea').fill('Synthetic QA retained content');await post.locator('button[type="submit"]').click();
  await expect(post.getByRole('alert')).toBeVisible();await inspect(page,post,`save-error-community-${language}-${theme}`);
});

test(`Stage5 measured content contrast ${language}/${theme}`,async({page})=>{
  test.setTimeout(180000);await page.setViewportSize({width:390,height:844});await prepareTools(page,language,theme);
  const failures=[];
  for(const route of ['Tools','Exercises','ExerciseView?id=qa-exercise','Videos','Resources','Coach','CoachingAnalytics','Community','PersonalizedFeed']){
    await page.goto('/'+route);const root=page.locator('#app-scroll-container');await expect(root.locator('h1,h2,[role="status"]').filter({visible:true}).first()).toBeVisible();
    if(route.startsWith('ExerciseView'))await expect(root.getByRole('tab')).toHaveCount(5);
    await page.waitForTimeout(800);
    const tabs=route.startsWith('ExerciseView')?[0,1,2,3,4]:[-1];
    for(const tab of tabs){
      if(tab>=0)await root.getByRole('tab').nth(tab).click();
      await page.waitForTimeout(250);
      for(const el of (await root.locator('h1,h2,h3,p,button').all()).slice(0,90))if(await el.isVisible()&&await el.innerText()&&!await el.getAttribute('disabled')){
        try{await assertPathTextContrast(el);}catch(error){failures.push({route,tab,text:(await el.innerText()).slice(0,160),error:String(error)});}
      }
    }
  }
  fs.writeFileSync(`${evidenceDir}/contrast-content-${language}-${theme}.json`,JSON.stringify(failures,null,2));
  expect(failures).toEqual([]);
});}

for(const language of ['en','he'])for(const mode of ['light','dark'])for(const palette of ['ocean','sunset','forest','lavender','minimal']){
test(`Stage5 palette observations ${language}/${mode}/${palette}`,async({page})=>{
  test.setTimeout(120000);await page.setViewportSize({width:language==='he'?1024:390,height:844});await prepareTools(page,language,mode);
  await page.route(/\/entities\/User\/(?:me|test-user-123)(?:\?|$)/,r=>r.fulfill({json:{id:'test-user-123',email:'test@example.com',full_name:'QA synthetic user',onboarding_completed:true,role:'user',preferences:{theme:palette,language}}}));
  const expectedPrimary={ocean:'91 161 170',sunset:'169 149 118',forest:'95 154 132',lavender:'137 146 180',minimal:'104 124 128'}[palette];
  for(const route of ['Tools','Exercises','Resources','ExperientialGames','Videos','Coach','Community','PersonalizedFeed']){
    await page.goto('/'+route);const root=page.locator('#app-scroll-container');await expect(root.locator('h1,h2,[role="status"]').filter({visible:true}).first()).toBeVisible();
    await expect.poll(()=>page.evaluate(()=>document.documentElement.style.getPropertyValue('--color-primary').trim())).toBe(expectedPrimary);
    await inspect(page,root,`palette-${route}-${language}-${mode}-${palette}`);
  }
});}
