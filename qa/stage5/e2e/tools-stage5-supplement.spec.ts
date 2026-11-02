import {test,expect} from '@playwright/test';
import {prepareTools,inspect,evidenceDir} from '../helpers/toolsStage5';
import {gamesCatalog} from '../../../src/components/experiential_games/mindGamesContent';
import {assertPathTextContrast} from '../../../tests/helpers/pathStage3';
import {translations} from '../../../src/components/i18n/translations';
import fs from 'node:fs';

for(const language of ['en','he'])for(const theme of ['light','dark']){
test(`Stage5 settled instructions and game navigation ${language}/${theme}`,async({page})=>{
  test.setTimeout(240000);await page.setViewportSize({width:390,height:844});await prepareTools(page,language,theme);
  await page.goto('/ExperientialGames');await expect(page.getByTestId('mindgames-grid').getByTestId(/mindgame-card-/)).toHaveCount(29);
  await page.getByTestId('mindgames-filter-focus').click();await expect(page.getByTestId('mindgames-grid').getByTestId(/mindgame-card-/)).toHaveCount(5);
  await page.getByTestId('mindgames-search').fill('no-game-999');await expect(page.getByTestId('mindgames-empty-state')).toBeVisible();
  await inspect(page,page.locator('#app-scroll-container'),`settled-games-empty-${language}-${theme}`);
  await page.getByTestId('mindgames-search').fill('');await page.getByTestId('mindgames-filter-all').click();
  const failures=[];
  for(const game of gamesCatalog){
    await page.getByTestId(`mindgame-info-${game.slug}`).last().click();const dialog=page.getByTestId('mindgame-info-dialog');
    await inspect(page,dialog,`settled-info-${game.slug}-${language}-${theme}`);
    for(const el of await dialog.locator('h2,p').all())if(await el.isVisible())try{await assertPathTextContrast(el);}catch(error){failures.push({game:game.slug,text:await el.innerText(),error:String(error)});}
    await page.keyboard.press('Escape');await expect(dialog).toBeHidden();
  }
  fs.writeFileSync(`${evidenceDir}/settled-info-contrast-${language}-${theme}.json`,JSON.stringify(failures,null,2));
  const opener=page.getByTestId('mindgame-card-thought-quiz').last();await opener.focus();await page.keyboard.press('Enter');
  const modal=page.getByTestId('mindgame-modal-thought-quiz');await expect(modal).toBeVisible();await inspect(page,modal,`settled-game-keyboard-${language}-${theme}`);
  const inside=[];for(let i=0;i<16;i++){await page.keyboard.press('Tab');inside.push(await modal.evaluate(el=>el.contains(document.activeElement)));}
  await page.keyboard.press('Escape');await expect(modal).toBeHidden();let returned=true;try{await expect(opener).toBeFocused({timeout:1500});}catch{returned=false;}
  fs.writeFileSync(`${evidenceDir}/settled-game-focus-${language}-${theme}.json`,JSON.stringify({inside,returned}));
});

test(`Stage5 exercise dialog coaching charts and delete ${language}/${theme}`,async({page})=>{
  test.setTimeout(180000);await page.setViewportSize({width:360,height:740});const state=await prepareTools(page,language,theme);
  state.db.Exercise[0].category='grounding';const title=state.db.Exercise[0].title;const tr:any=translations[language].translation;
  await page.goto('/Exercises');await page.getByPlaceholder(tr.exercises.search_placeholder).fill(title);await page.getByRole('heading',{name:title,exact:true}).click();
  const detail=page.getByRole('dialog');await expect(detail).toBeVisible();
  const tabCount=await detail.getByRole('tab').count();for(let i=0;i<tabCount;i++){await detail.getByRole('tab').nth(i).click();await inspect(page,detail,`settled-exercise-dialog-${language}-${theme}-tab${i}`);}
  await detail.getByRole('button',{name:tr.exercise_view.mark_complete,exact:true}).last().click();
  await expect.poll(()=>state.writes.filter(w=>w.entity==='UserExerciseProgress').length).toBeGreaterThan(0);await expect(detail).toBeHidden({timeout:10000});
  const now=new Date().toISOString();state.db.CoachingSession=Array.from({length:6},(_,i)=>({id:'qa-session-'+i,title:'Synthetic QA session '+i,created_by:'test@example.com',created_date:now,status:i<3?'active':'completed',stage:i<3?'action':'completed',focus_area:['mood_improvement','stress_management','goal_achievement'][i%3],current_challenge:'Synthetic QA challenge',desired_outcome:'Synthetic QA outcome',action_plan:[{action:'Synthetic QA action '+i,timeline:'Today',completed:i%2===0}],agent_conversation_id:'test-conversation-123'}));
  for(const width of [360,390,430,768,1024,1280,1440]){
    await page.setViewportSize({width,height:width===768?1024:width===1024?768:844});await page.goto('/CoachingAnalytics');
    await expect(page.locator('.recharts-wrapper')).toHaveCount(2);await inspect(page,page.locator('#app-scroll-container'),`settled-analytics-${language}-${theme}-${width}`);
  }
  await page.setViewportSize({width:360,height:740});await page.goto('/Coach');await expect(page.getByRole('tab')).toHaveCount(2);await page.getByRole('tab').nth(1).click();await inspect(page,page.locator('#app-scroll-container'),`settled-coach-completed-${language}-${theme}`);
  const deleteButton=page.getByRole('button').filter({has:page.locator('svg.lucide-trash2')}).first();
  if(await deleteButton.count()){
    page.once('dialog',d=>d.dismiss());await deleteButton.click();expect(state.writes.filter(w=>w.entity==='CoachingSession'&&w.method==='DELETE')).toHaveLength(0);
  }
});}
