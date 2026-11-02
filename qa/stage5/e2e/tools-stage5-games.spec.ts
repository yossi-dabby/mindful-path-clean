import {test,expect,type Locator} from '@playwright/test';
import {prepareTools,inspect,evidenceDir} from '../helpers/toolsStage5';
import {gamesCatalog} from '../../../src/components/experiential_games/mindGamesContent';
import {mindGamesUiStrings,mindGamesUiByLanguage} from '../../../src/components/i18n/mindGamesUiTranslations';
import {assertPathTextContrast} from '../../../tests/helpers/pathStage3';
import fs from 'node:fs';
import {translations} from '../../../src/components/i18n/translations';

for(const language of ['en','he'])for(const theme of ['light','dark'])for(const game of gamesCatalog){
test(`Stage5 game flow ${game.slug}/${language}/${theme}`,async({page})=>{
  test.setTimeout(120000);
  const key=`game-${game.slug}-${language}-${theme}`;
  const ui:any=Object.fromEntries(Object.keys(mindGamesUiStrings).map(k=>[k,{...mindGamesUiStrings[k],...(mindGamesUiByLanguage[language]?.[k]||{})}]));
  const close=language==='he'?/^(סגירה|סגור)$/:/^Close$/;
  const state=await prepareTools(page,language,theme);
  await page.setViewportSize({width:390,height:844});
  await page.goto('/ExperientialGames');
  await expect(page.getByTestId('mindgames-grid').getByTestId(/mindgame-card-/)).toHaveCount(29);
  await page.getByTestId(`mindgame-info-${game.slug}`).last().click();
  const info=page.getByTestId('mindgame-info-dialog');
  await expect(info).toBeVisible();
  await inspect(page,info,key+'-instructions');
  const contrast:any[]=[];
  for(const el of await info.locator('h2,p').all())if(await el.isVisible()){
    try{await assertPathTextContrast(el);}catch(error){contrast.push({text:await el.innerText(),error:String(error)});}
  }
  fs.writeFileSync(`${evidenceDir}/${key}-contrast.json`,JSON.stringify(contrast,null,2));
  expect(contrast).toEqual([]);
  await page.keyboard.press('Escape');await expect(info).toBeHidden();
  const opener=page.getByTestId(game.testId).last();await opener.click();
  const dialog=page.getByTestId(`mindgame-modal-${game.slug}`);
  await expect(dialog).toBeVisible();
  const body=dialog.locator('div[style*="overscroll-behavior"]').first();
  const buttons=()=>body.getByRole('button').filter({hasNotText:close});
  const action=()=>buttons().filter({visible:true});
  const clickFirst=async()=>{await action().first().click();};
  // All seven modal dimensions; later interaction uses the requested narrow phone width.
  for(const width of [360,390,430,768,1024,1280,1440]){
    await page.setViewportSize({width,height:width===768?1024:width===1024?768:844});
    const box=await dialog.boundingBox();expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(-1);expect(box!.x+box!.width).toBeLessThanOrEqual(width+1);
    expect(box!.height).toBeLessThanOrEqual(page.viewportSize()!.height+1);
    await inspect(page,dialog,key+'-'+width);
  }
  await page.setViewportSize({width:360,height:740});
  const before=await body.innerText();
  if(['thought_quiz','reframe_pick'].includes(game.id)){
    await body.locator('button.w-full').first().click();
    await expect.poll(()=>body.innerText()).not.toBe(before);
    await inspect(page,dialog,key+'-result');
    const next=game.id==='thought_quiz'?translations[language].translation.mind_games.thought_quiz.next_question:ui.common.try_another;
    await body.getByRole('button',{name:next,exact:true}).click();
    await expect(body.locator('button.w-full').first()).toBeEnabled();
  }else if(['dbt_stop','opposite_action','urge_surfing','worry_time','defusion_cards','tipp_skills'].includes(game.id)){
    await body.locator('button.w-full').first().click();
    await expect.poll(()=>body.innerText()).not.toBe(before);await inspect(page,dialog,key+'-result');
    await body.getByRole('button',{name:game.id==='defusion_cards'?ui.defusion_cards.next_card:ui.common.try_another,exact:true}).click();
  }else if(game.id==='value_compass'){
    await clickFirst();await body.locator('button.w-full').first().click();
    await expect.poll(()=>body.innerText()).not.toBe(before);await inspect(page,dialog,key+'-result');
    await body.getByRole('button',{name:ui.value_compass.reset,exact:true}).click();
    await expect.poll(()=>body.innerText()).toBe(before);
  }else if(game.id==='tiny_experiment'){
    await clickFirst();const choices=body.locator('button.w-full');await choices.last().click();
    await expect.poll(()=>body.innerText()).not.toBe(before);await inspect(page,dialog,key+'-result');
  }else if(game.id==='quick_win'){
    await body.locator('input').fill('Synthetic QA win אבג ABC 123');
    await body.getByRole('button',{name:ui.quick_win.log_button,exact:true}).click();
    await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('mindgames_quickWins')||'[]').length)).toBe(1);
    await inspect(page,dialog,key+'-result');
  }else if(game.id==='calm_bingo'){
    await buttons().nth(0).click();await buttons().nth(1).click();
    await expect(body).toContainText(ui.calm_bingo.success);await inspect(page,dialog,key+'-result');
    await buttons().nth(0).click();await expect(body).not.toContainText(ui.calm_bingo.success);
  }else if(game.id==='evidence_balance'){
    await clickFirst();await expect.poll(()=>body.innerText()).not.toBe(before);await inspect(page,dialog,key+'-result');
    await body.getByRole('button',{name:ui.common.try_another,exact:true}).click();
  }else if(['accepts','improve'].includes(game.id)){
    await clickFirst();await expect.poll(()=>body.innerText()).not.toBe(before);await inspect(page,dialog,key+'-result');
    await buttons().nth(1).click();
  }else if(['willing_hands','mountain_meditation'].includes(game.id)){
    let n=0;
    while(await action().first().isVisible()&&n++<10){await clickFirst();if(await body.getByRole('button').filter({hasNotText:close}).count()===0)break;}
    await expect(body).toContainText(ui[game.id].completion);await inspect(page,dialog,key+'-result');
  }else if(game.id==='half_smile'){
    await clickFirst();await body.getByRole('button',{name:ui.half_smile.practiced_btn,exact:true}).click();await clickFirst();
    await expect.poll(()=>body.innerText()).not.toBe(before);await inspect(page,dialog,key+'-result');
  }else if(game.id==='leaves_on_stream'){
    await body.locator('input').fill('Synthetic QA thought אבג ABC 123');await clickFirst();
    await expect(body.locator('input')).toHaveCount(0);await inspect(page,dialog,key+'-result');
    await expect(body.locator('input')).toBeVisible({timeout:8000});await expect(body.locator('input')).toHaveValue('');
  }else if(game.id==='expansion'){
    await body.locator('input').fill('Synthetic QA emotion');await clickFirst();
    for(let n=0;n<ui.expansion.steps.length;n++)await clickFirst();
    await inspect(page,dialog,key+'-result');
    await expect(body.getByTestId('expansion-complete')).toBeVisible();
    await expect(body.getByTestId('expansion-complete')).toContainText('Synthetic QA emotion');
    await clickFirst();
    await expect(body.locator('input')).toBeVisible();
    await expect(body.locator('input')).toHaveValue('');
  }else if(game.id==='values_check'){
    await clickFirst();await clickFirst();await expect(body).toContainText(ui.values_check.result_yes);await inspect(page,dialog,key+'-result');
  }else if(game.id==='pros_and_cons'){
    await body.locator('input').fill('Synthetic QA decision');await clickFirst();
    await body.locator('textarea').fill('Synthetic QA benefit');await clickFirst();
    await body.locator('textarea').fill('Synthetic QA cost');await clickFirst();
    await expect(body).toContainText('Synthetic QA benefit');await expect(body).toContainText('Synthetic QA cost');await inspect(page,dialog,key+'-result');
  }else if(game.id==='check_the_facts'){
    await clickFirst();await body.getByRole('button',{name:ui.check_the_facts.check_btn,exact:true}).click();
    await expect.poll(()=>body.innerText()).not.toBe(before);await inspect(page,dialog,key+'-result');
  }else if(game.id==='self_soothe'){
    await clickFirst();await body.locator('button.w-full').first().click();await expect.poll(()=>body.innerText()).not.toBe(before);await inspect(page,dialog,key+'-result');
    await body.getByRole('button',{name:ui.self_soothe.back,exact:true}).click();
  }else if(game.id==='memory_match'){
    // Learn only the rendered SVG on each turned card; no React/internal-state inspection.
    const clockTime=new Date();await page.clock.install({time:clockTime});await page.clock.pauseAt(new Date(clockTime.getTime()+60000));
    const cards=body.locator('button.aspect-square');await expect(cards).toHaveCount(16);
    const seen=new Map<number,string>();const matched=new Set<number>();
    for(let turn=0;turn<32&&matched.size<16;turn++){
      const available=Array.from({length:16},(_,n)=>n).filter(n=>!matched.has(n));
      const knownPair=available.flatMap(i=>available.filter(j=>j>i&&seen.has(i)&&seen.get(i)===seen.get(j)).map(j=>[i,j])).at(0);
      const first=knownPair?.[0]??available.find(i=>!seen.has(i))??available[0];
      await cards.nth(first).click();
      const shapeA=(await cards.nth(first).locator('svg').getAttribute('class'))!;seen.set(first,shapeA);
      const second=knownPair?.[1]??available.find(i=>i!==first&&seen.get(i)===shapeA)??available.find(i=>i!==first&&!seen.has(i))??available.find(i=>i!==first)!;
      await cards.nth(second).click();
      if(await cards.count()===0){matched.add(first);matched.add(second);break;}
      const shapeB=await body.evaluate((root,index)=>root.querySelectorAll('button.aspect-square')[index]?.querySelector('svg')?.getAttribute('class')||null,second);
      if(shapeB===null){await expect(body).toContainText(ui.memory_match.complete_title);matched.add(first);matched.add(second);break;}
      seen.set(second,shapeB);
      if(shapeA===shapeB){matched.add(first);matched.add(second);}else {await page.clock.runFor(850);await expect(cards.nth(first)).toHaveText('?');}
    }
    await expect(body).toContainText(ui.memory_match.complete_title,{timeout:10000});await page.clock.resume();await inspect(page,dialog,key+'-result');
    await body.getByRole('button',{name:ui.common.try_another,exact:true}).click();await expect(body.locator('button.aspect-square')).toHaveCount(16);
  }else if(game.id==='focus_flow'){
    const colors=body.locator('button.aspect-square');await expect(colors).toHaveCount(4);
    await expect(colors.first()).toBeEnabled({timeout:5000});
    // Wrong choices are ordinary game input and must produce a restartable result.
    await colors.nth(0).click();
    if(await colors.count()){
      await expect(colors.first()).toBeEnabled({timeout:5000});await colors.nth(1).click();
    }
    await expect(body).toContainText(ui.focus_flow.game_over);await inspect(page,dialog,key+'-result');
    await body.getByRole('button',{name:ui.common.try_another,exact:true}).click();await expect(colors).toHaveCount(4);
  }else if(game.id==='pattern_shift'){
    for(const correct of [1,2,0,1]){
      await expect(body.locator('button.w-full').nth(correct)).toBeEnabled();await body.locator('button.w-full').nth(correct).click();
      await page.waitForTimeout(1050);
    }
    await expect(body.getByRole('button',{name:ui.common.try_another,exact:true})).toBeVisible();await inspect(page,dialog,key+'-result');
    await body.getByRole('button',{name:ui.common.try_another,exact:true}).click();await expect(body.locator('button.w-full').first()).toBeEnabled();
  }else if(game.id==='word_association'){
    for(let i=0;i<5;i++){await body.locator('input').fill('QA '+i);await clickFirst();}
    await expect(body.getByRole('button',{name:ui.common.try_another,exact:true})).toBeVisible();await inspect(page,dialog,key+'-result');
    await body.getByRole('button',{name:ui.common.try_another,exact:true}).click();await expect(body.locator('input')).toHaveValue('');
  }else if(game.id==='number_sequence'){
    for(const answer of [10,15,25,11,48]){
      await expect(body.locator('input')).toBeEnabled();await body.locator('input').fill(String(answer));await clickFirst();
      await page.waitForTimeout(1550);
    }
    await expect(body.getByRole('button',{name:ui.common.try_another,exact:true})).toBeVisible();await inspect(page,dialog,key+'-result');
    await body.getByRole('button',{name:ui.common.try_another,exact:true}).click();await expect(body.locator('input')).toHaveValue('');
  }else throw new Error(`Uncovered game ${game.id}`);
  await page.keyboard.press('Escape');await expect(dialog).toBeHidden();
  await expect(opener).toBeFocused();
  const focusReturned=true;
  fs.writeFileSync(`${evidenceDir}/${key}-flow.json`,JSON.stringify({game:game.slug,language,theme,flow:'reached result and available restart/next',focusReturned,writes:state.writes},null,2));
});}
