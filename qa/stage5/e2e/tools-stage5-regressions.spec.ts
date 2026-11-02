import {test,expect,type Locator} from '@playwright/test';
import {prepareTools,inspect} from '../helpers/toolsStage5';
import {assertPathWidth,assertPathTextContrast} from '../../../tests/helpers/pathStage3';
import {translations} from '../../../src/components/i18n/translations';
import {toolsStage5UiCopy} from '../../../src/components/i18n/toolsStage5UiTranslations';

async function containsFocus(root:Locator,page) {
  for(let n=0;n<30;n++) {
    await page.keyboard.press(n%3===0?'Shift+Tab':'Tab');
    await expect.poll(()=>root.evaluate(el=>el.contains(document.activeElement))).toBe(true);
  }
}

for(const language of ['en','he'])for(const theme of ['light','dark']) {
  const copy=toolsStage5UiCopy[language];
  test(`Stage5 responsive exercise and feed regression ${language}/${theme}`,async({page})=>{
    test.setTimeout(120000);await prepareTools(page,language,theme);
    for(const width of [360,390,430,768,1024,1280,1440]) {
      await page.setViewportSize({width,height:width===768?1024:844});
      await page.goto('/ExerciseView?id=qa-exercise');
      await expect(page.getByRole('tab')).toHaveCount(5);
      await assertPathWidth(page);
      const heading=page.locator('#app-scroll-container').getByRole('heading',{level:1}).filter({visible:true}).first();
      const box=await heading.boundingBox();expect(box!.width).toBeGreaterThan(150);
      for(const tab of ['benefits','tips']) {
        await page.locator(`[role="tab"][data-state][id$="trigger-${tab}"]`).click();
        await expect(page.getByRole('tabpanel')).toBeVisible();
        await assertPathTextContrast(page.getByRole('tabpanel').locator('p').first());
      }
      await inspect(page,page.locator('#app-scroll-container'),`fixed-exercise-${language}-${theme}-${width}`);
      await page.goto('/PersonalizedFeed');await expect(page.getByRole('button',{name:new RegExp(copy.preferences)})).toBeVisible();
      await assertPathWidth(page);
      for(const button of await page.locator('button[aria-pressed]').all())await assertPathTextContrast(button);
      await inspect(page,page.locator('#app-scroll-container'),`fixed-feed-${language}-${theme}-${width}`);
    }
  });

  test(`Stage5 game focus names touch and contrast regression ${language}/${theme}`,async({page})=>{
    test.setTimeout(90000);await prepareTools(page,language,theme);await page.setViewportSize({width:360,height:740});
    await page.goto('/ExperientialGames');
    const infoButton=page.getByTestId('mindgame-info-value-compass').last();
    await infoButton.click();const info=page.getByTestId('mindgame-info-dialog');await expect(info).toBeVisible();
    for(const el of await info.locator('h2,p,li span.text-sm').all())if(await el.isVisible())await assertPathTextContrast(el);
    await page.keyboard.press('Escape');await expect(info).toBeHidden();await expect(infoButton).toBeFocused();
    await infoButton.click();await info.getByTestId('mindgame-info-play').click();
    let dialog=page.getByTestId('mindgame-modal-value-compass');await expect(dialog).toBeVisible();
    await containsFocus(dialog,page);
    await assertPathTextContrast(dialog.locator('div[style*="overscroll-behavior"] button').first());
    await page.keyboard.press('Escape');await expect(dialog).toBeHidden();await expect(infoButton).toBeFocused();
    for(const slug of ['thought-quiz','urge-surfing']){
      const opener=page.getByTestId('mindgame-card-'+slug).last();await opener.click();dialog=page.getByTestId('mindgame-modal-'+slug);
      const difficulty=dialog.locator('button[aria-pressed]');expect(await difficulty.count()).toBeGreaterThanOrEqual(2);
      for(const button of await difficulty.all()) {
        const b=await button.boundingBox();expect(b!.height).toBeGreaterThanOrEqual(44);expect(b!.width).toBeGreaterThanOrEqual(44);
        await expect(button).toHaveAccessibleName(/.+/);
      }
      await page.keyboard.press('Escape');await expect(opener).toBeFocused();
    }
    await page.getByTestId('mindgame-card-memory-match').last().click();dialog=page.getByTestId('mindgame-modal-memory-match');
    const cards=dialog.locator('button[aria-pressed]');await expect(cards).toHaveCount(16);
    const names=await cards.evaluateAll(elements=>elements.map(el=>el.getAttribute('aria-label')));expect(new Set(names).size).toBe(16);
    for(const name of names)expect(name).toContain(copy.hidden);
    await cards.first().click();await expect(cards.first()).toHaveAttribute('aria-pressed','true');await expect(cards.first()).not.toHaveAccessibleName(new RegExp(copy.hidden));
    await inspect(page,dialog,`fixed-game-accessibility-${language}-${theme}`);
  });

  test(`Stage5 loading failure retry and retained playlist ${language}/${theme}`,async({page})=>{
    test.setTimeout(90000);await prepareTools(page,language,theme);await page.setViewportSize({width:390,height:740});
    for(const [route,entity,loaded] of [['Videos','Video','video'],['ExerciseView?id=qa-exercise','Exercise','exercise']] as const){
      const pattern=new RegExp(`/entities/${entity}(?:[/?]|$)`);let release!:()=>void;const hold=new Promise<void>(resolve=>release=resolve);
      const slow=async r=>{await hold;await r.fallback();};await page.route(pattern,slow);
      await page.goto('/'+route);await expect(page.getByText(loaded==='video'?translations[language].translation.videos.loading:copy.loading_exercise,{exact:false})).toBeVisible();
      release();await page.unroute(pattern,slow);
      if(loaded==='exercise')await expect(page.getByRole('tab')).toHaveCount(5);else await expect(page.locator('a[href*="VideoPlayer"]')).toHaveCount(1);
      const fail=async r=>r.fulfill({status:503,json:{message:'Synthetic failure'}});await page.route(pattern,fail);await page.reload();
      await expect(page.getByRole('alert').filter({hasText:copy.load_error})).toBeVisible();
      await page.unroute(pattern,fail);await page.getByRole('button',{name:copy.retry,exact:true}).click();
      if(loaded==='exercise')await expect(page.getByRole('tab')).toHaveCount(5);else await expect(page.locator('a[href*="VideoPlayer"]')).toHaveCount(1);
    }
    await page.goto('/Videos');await page.getByRole('button').filter({has:page.locator('svg.lucide-plus')}).first().click();
    const dialog=page.getByRole('dialog');await dialog.locator('input').fill('QA retained draft');
    const failSave=async r=>r.request().method()==='POST'?r.fulfill({status:503,json:{message:'Synthetic save failure'}}):r.fallback();
    await page.route(/\/entities\/Playlist(?:[/?]|$)/,failSave);await dialog.locator('button[type="submit"]').click();
    await expect(dialog.getByRole('alert')).toHaveText(copy.playlist_save_error);await expect(dialog.locator('input')).toHaveValue('QA retained draft');
    await page.unroute(/\/entities\/Playlist(?:[/?]|$)/,failSave);await dialog.locator('button[type="submit"]').click();await expect(dialog).toBeHidden();
  });

  test(`Stage5 video filters and missing media feedback ${language}/${theme}`,async({page})=>{
    test.setTimeout(60000);await prepareTools(page,language,theme);await page.goto('/Videos');
    const search=page.getByRole('searchbox',{name:copy.search_videos});await search.fill('not-a-real-video');
    await expect(page.getByRole('status').filter({hasText:copy.no_matches})).toBeVisible();await expect(page.locator('a[href*="VideoPlayer"]')).toHaveCount(0);
    await search.fill('');await page.locator('a[href*="VideoPlayer"]').click();await expect(page.getByRole('alert')).toContainText(copy.media_error);
    await page.getByRole('button',{name:copy.retry,exact:true}).click();await expect(page.getByRole('alert')).toContainText(copy.media_error);
    await page.goto('/ExerciseView?id=qa-exercise');await page.locator('[role="tab"][id$="trigger-audio"]').click();
    await expect(page.getByRole('tabpanel').getByRole('alert')).toContainText(copy.media_error);
    await page.getByRole('tabpanel').getByRole('button',{name:copy.retry,exact:true}).click();await expect(page.getByRole('tabpanel').getByRole('alert')).toContainText(copy.media_error);
  });
}

for(const language of ['en','he']) test(`Stage5 nested community keyboard focus ${language}`,async({page})=>{
  await prepareTools(page,language,'dark');await page.setViewportSize({width:390,height:740});await page.goto('/Community');
  const root=page.getByTestId('community-page');
  for(const [index,id] of ['forum-post-dialog','community-group-dialog','progress-share-dialog'].entries()){
    await root.getByRole('tab').nth(index).click();const opener=root.locator('button').filter({has:page.locator('svg.lucide-plus')}).first();await opener.click();
    const form=page.getByTestId(id);const category=form.locator('button[aria-haspopup="dialog"]');await category.click();
    const options=page.getByTestId('bottom-sheet-select-options');await expect(options).toBeVisible();await containsFocus(options,page);
    await page.keyboard.press('Escape');await expect(options).toBeHidden();await expect(form).toBeVisible();await expect(category).toBeFocused();
    await page.keyboard.press('Escape');await expect(form).toBeHidden();await expect(opener).toBeFocused();
  }
});

for(const language of ['en','he'])test(`Stage5 playable media completion and download ${language}`,async({page})=>{
  test.setTimeout(60000);const state=await prepareTools(page,language,'light');
  state.db.AudioContent[0].audio_url='/tests/fixtures/stage5/silence.wav';state.db.AudioContent[0].download_enabled=true;
  state.db.Video[0].videoUrl='/tests/fixtures/stage5/sample.webm';
  await page.goto('/Videos');await page.locator('a[href*="VideoPlayer"]').click();const video=page.locator('video');
  await video.evaluate((el:HTMLVideoElement)=>el.play());await expect.poll(()=>state.writes.filter(w=>w.entity==='VideoProgress'&&w.data?.completed===true).length).toBeGreaterThan(0);
  await expect(page.getByRole('alert')).toHaveCount(0);
  await page.goto('/ExerciseView?id=qa-exercise');await page.locator('[role="tab"][id$="trigger-audio"]').click();
  const panel=page.getByRole('tabpanel');await expect(panel.locator('audio')).toHaveJSProperty('readyState',4);
  const [download]=await Promise.all([page.waitForEvent('download'),panel.getByRole('button',{name:translations[language].translation.home_practice?.audio_download || (language==='he'?'הורדת שמע':'Download audio')}).click()]);
  expect(download.suggestedFilename()).toMatch(/\.mp3$/);expect(await download.failure()).toBeNull();
  await panel.getByRole('button').filter({has:page.locator('svg.lucide-play')}).click();
  await expect.poll(()=>state.writes.filter(w=>w.entity==='AudioContent').length).toBe(1);
  await expect.poll(()=>state.writes.filter(w=>w.entity==='UserExerciseProgress').length).toBeGreaterThan(0);
});
