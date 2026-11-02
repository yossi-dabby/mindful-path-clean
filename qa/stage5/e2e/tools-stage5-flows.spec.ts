import {test,expect} from '@playwright/test';
import {prepareTools,inspect,evidenceDir} from '../helpers/toolsStage5';
import {translations} from '../../../src/components/i18n/translations';
import fs from 'node:fs';
import {toolsStage5UiCopy} from '../../../src/components/i18n/toolsStage5UiTranslations';

for(const language of ['en','he'])for(const theme of ['light','dark'])for(const width of [360,768,1440]){
test(`Stage5 library interactions ${language}/${theme}/${width}`,async({page})=>{
  test.setTimeout(120000);const key=`flow-library-${language}-${theme}-${width}`;
  await page.setViewportSize({width,height:width===768?1024:840});
  const state=await prepareTools(page,language,theme);const tr:any=translations[language].translation;
  await page.goto('/Exercises');
  const search=page.getByPlaceholder(tr.exercises.search_placeholder);
  await expect(search).toBeVisible();await search.fill('zz-no-such-exercise-999');
  await expect(page.getByRole('heading',{name:tr.exercises.empty_state.no_results_title})).toBeVisible();
  await inspect(page,page.locator('#app-scroll-container'),key+'-exercises-empty-search');
  await search.fill('');
  await page.getByTestId('library-page-header').getByRole('button',{name:new RegExp(tr.exercises.favorites)}).click();
  await expect(page.getByRole('heading',{name:tr.exercises.empty_state.favorites_title})).toBeVisible();
  await page.getByTestId('library-page-header').getByRole('button',{name:new RegExp(tr.exercises.favorites)}).click();
  await page.getByRole('tab').nth(2).click();await inspect(page,page.locator('#app-scroll-container'),key+'-exercise-category');
  await page.goto('/ExerciseView?id=qa-exercise');await expect(page.getByRole('tab')).toHaveCount(5);
  for(let i=0;i<5;i++){
    await page.getByRole('tab').nth(i).click();await expect(page.getByRole('tabpanel')).toBeVisible();
    await inspect(page,page.locator('#app-scroll-container'),key+'-exercise-tab-'+i);
  }
  await page.goto('/Resources');await expect(page.getByTestId('resource-card')).toHaveCount(1);
  await page.locator('#resource-search').fill('zz-nonexistent-999');await expect(page.getByTestId('resource-card')).toHaveCount(0);
  await inspect(page,page.locator('#app-scroll-container'),key+'-resource-empty-search');
  await page.locator('#resource-search').fill('');await expect(page.getByTestId('resource-card')).toHaveCount(1);
  const external=page.getByTestId('resource-card').getByRole('link');await expect(external).toHaveAttribute('target','_blank');await expect(external).toHaveAttribute('href','https://www.who.int/');
  const save=page.getByTestId('resource-card').getByRole('button').first();await save.click();
  await expect.poll(()=>state.writes.filter(w=>w.entity==='SavedResource'&&w.method==='POST').length).toBe(1);
  await page.getByRole('tab').nth(1).click();await expect(page.getByTestId('resource-card')).toHaveCount(1);
  await inspect(page,page.locator('#app-scroll-container'),key+'-saved-resource');
  await page.goto('/Videos');await expect(page.getByRole('button',{name:tr.videos.add_to_list,exact:true})).toHaveCount(1);
  await page.getByRole('button',{name:tr.videos.add_to_list,exact:true}).click();
  let dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();await inspect(page,dialog,key+'-playlist-picker');
  const toggle=dialog.locator('button[aria-busy]').first();
  await expect(toggle.locator('svg.lucide-check')).toHaveCount(1);await toggle.click();await expect(toggle).toBeEnabled();
  await expect.poll(()=>state.db.PlaylistVideo.length).toBe(0);await toggle.click();await expect(toggle).toBeEnabled();
  await expect.poll(()=>state.db.PlaylistVideo.length).toBe(1);
  await page.keyboard.press('Escape');await expect(dialog).toBeHidden();
  await page.getByRole('button',{name:tr.videos.new_button,exact:true}).click();dialog=page.getByRole('dialog');
  await expect(dialog).toBeVisible();await expect(dialog.locator('button[type="submit"]')).toBeDisabled();
  await dialog.locator('input').fill('Synthetic QA playlist אבג ABC 123');await dialog.locator('textarea').fill('Synthetic QA description '.repeat(15));
  await inspect(page,dialog,key+'-playlist-create');await dialog.locator('button[type="submit"]').click();await expect(dialog).toBeHidden();
  await expect.poll(()=>state.writes.filter(w=>w.entity==='Playlist'&&w.method==='POST').length).toBe(1);
  await page.goto('/PlaylistDetail?id=qa-playlist');await expect(page.locator('a[href*="VideoPlayer"]')).toHaveCount(1);
  await page.locator('a[href*="VideoPlayer"]').click();await expect(page.locator('video')).toBeVisible();
  await expect.poll(()=>page.locator('video').evaluate((el:HTMLVideoElement)=>el.error?.code||0)).not.toBe(0);
  await inspect(page,page.locator('#app-scroll-container'),key+'-missing-video');
  const feedCopy=toolsStage5UiCopy[language];
  await page.goto('/PersonalizedFeed');await page.getByRole('button',{name:new RegExp(feedCopy.preferences)}).click();
  await page.getByRole('button',{name:feedCopy.stress_management,exact:true}).click();await page.getByRole('button',{name:feedCopy.save_preferences,exact:true}).click();
  await expect(page.getByRole('button',{name:feedCopy.save_preferences,exact:true})).toBeHidden();
  await page.getByRole('button',{name:feedCopy.resources,exact:true}).click();await page.getByRole('button',{name:feedCopy.recent,exact:true}).click();
  await inspect(page,page.locator('#app-scroll-container'),key+'-feed-filtered');await page.getByRole('button',{name:feedCopy.clear,exact:true}).click();
  fs.writeFileSync(`${evidenceDir}/${key}-writes.json`,JSON.stringify(state.writes,null,2));
});

test(`Stage5 community mutations ${language}/${theme}/${width}`,async({page})=>{
  test.setTimeout(120000);const key=`flow-community-${language}-${theme}-${width}`;
  await page.setViewportSize({width,height:width===768?1024:740});
  const state=await prepareTools(page,language,theme);const root=page.getByTestId('community-page');
  await page.goto('/Community');await expect(root).toBeVisible();
  const search=root.locator('input');await search.fill('zz-no-post-999');await expect(root.getByTestId('create-first-post-btn')).toBeVisible();await search.fill('');
  for(const [tab,testId,entity] of [[0,'forum-post-dialog','ForumPost'],[1,'community-group-dialog','CommunityGroup'],[2,'progress-share-dialog','SharedProgress']] as const){
    await root.getByRole('tab').nth(tab).click();
    await root.locator('button').filter({has:page.locator('svg.lucide-plus')}).first().click();
    const dialog=page.getByTestId(testId);await expect(dialog).toBeVisible();
    const submit=dialog.locator('button[type="submit"]');await expect(submit).toBeDisabled();
    await dialog.locator('input').first().fill('Synthetic QA '+entity);
    await dialog.locator('textarea').first().fill('Synthetic QA text אבג ABC 123 '.repeat(20));
    await inspect(page,dialog,key+'-'+entity);
    const focusEscapes=[];
    for(let i=0;i<18;i++){await page.keyboard.press('Tab');focusEscapes.push(await dialog.evaluate(el=>el.contains(document.activeElement)));}
    expect(focusEscapes.every(Boolean)).toBe(true);
    fs.writeFileSync(`${evidenceDir}/${key}-${entity}-focus.json`,JSON.stringify({focusEscapes}));
    await submit.click();await expect(dialog).toBeHidden();
    await expect.poll(()=>state.writes.filter(w=>w.entity===entity&&w.method==='POST').length).toBe(1);
  }
  await inspect(page,root,key+'-stories');
  fs.writeFileSync(`${evidenceDir}/${key}-writes.json`,JSON.stringify(state.writes,null,2));
});

test(`Stage5 coaches ${language}/${theme}/${width}`,async({page})=>{
  test.setTimeout(120000);const key=`flow-coach-${language}-${theme}-${width}`;
  await page.setViewportSize({width,height:width===768?1024:640});
  const state=await prepareTools(page,language,theme);const tr:any=translations[language].translation;
  await page.goto('/ThoughtCoach');const flow=page.getByTestId('thoughtcoach-flow');await expect(flow).toBeVisible();
  await expect(page.getByTestId('thoughtcoach-next')).toBeDisabled();await page.getByTestId('thoughtcoach-category-overthinking').click();await page.getByTestId('thoughtcoach-next').click();
  await page.getByTestId('thoughtcoach-situation-input').fill('Synthetic QA situation אבג ABC 123 '.repeat(8));
  await page.getByTestId('thoughtcoach-thoughts-input').fill('Synthetic QA thoughts');await page.getByTestId('thoughtcoach-emotion-anxious').click();await inspect(page,flow,key+'-thought-step2');
  await page.getByTestId('thoughtcoach-next').click();await page.getByTestId('thoughtcoach-balanced-input').fill('Synthetic QA balanced thought');await inspect(page,flow,key+'-thought-step3');
  await page.getByTestId('thoughtcoach-next').click();await inspect(page,flow,key+'-thought-summary');
  await page.getByTestId('thoughtcoach-save').click();await expect(flow).toBeHidden();await expect.poll(()=>state.writes.filter(w=>w.entity==='ThoughtJournal').length).toBe(1);
  await page.goto('/Coach');await page.getByTestId('coach-start-first').click();const wizard=page.getByTestId('coach-wizard');await expect(wizard).toBeVisible();
  await expect(page.getByTestId('coach-wizard-next')).toBeDisabled();await page.getByTestId('coach-focus-stress_management').click();await inspect(page,wizard,key+'-wizard-step1');await page.getByTestId('coach-wizard-next').click();
  await wizard.locator('textarea').nth(0).fill('Synthetic QA challenge');await wizard.locator('textarea').nth(1).fill('Synthetic QA outcome');await inspect(page,wizard,key+'-wizard-step2');await page.getByTestId('coach-wizard-next').click();
  await wizard.locator('input').fill('Synthetic QA coaching session');await inspect(page,wizard,key+'-wizard-summary');
  await wizard.locator('button').last().click();await expect(wizard).toBeHidden({timeout:20000});
  await expect(page.getByTestId('coach-chat')).toBeVisible();await inspect(page,page.getByTestId('coach-chat'),key+'-coaching-chat');
  fs.writeFileSync(`${evidenceDir}/${key}-writes.json`,JSON.stringify(state.writes,null,2));
});}
