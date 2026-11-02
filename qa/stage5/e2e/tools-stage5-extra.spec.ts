import {test,expect} from '@playwright/test';
import {prepareTools,inspect,evidenceDir} from '../helpers/toolsStage5';
import fs from 'node:fs';

for(const language of ['en','he'])for(const theme of ['light','dark']){
test(`Stage5 playlist deletion and full screen focus ${language}/${theme}`,async({page})=>{
  test.setTimeout(120000);const state=await prepareTools(page,language,theme);const original={...state.db.Playlist[0]};
  for(const width of [360,768,1440]){
    state.db.Playlist=[{...original}];state.db.PlaylistVideo=[];
    await page.setViewportSize({width,height:width===768?1024:740});await page.goto('/Playlists');
    const control=page.locator('button').filter({has:page.locator('svg[class*="trash"]')}).first();await expect(control).toBeVisible();
    const count=state.writes.filter(w=>w.entity==='Playlist'&&w.method==='DELETE').length;
    page.once('dialog',d=>d.dismiss());await control.click();expect(state.writes.filter(w=>w.entity==='Playlist'&&w.method==='DELETE')).toHaveLength(count);
    if(width===360){
      const fail=async r=>r.request().method()==='DELETE'?r.fulfill({status:503,json:{message:'Synthetic QA deletion failure'}}):r.fallback();
      await page.route(/\/entities\/Playlist\/qa-playlist(?:\?|$)/,fail);
      const dialogs=async d=>{if(d.type()==='confirm')await d.accept();else await d.dismiss();};page.on('dialog',dialogs);
      await control.click();await expect(control).toBeVisible();await expect(control).toBeEnabled();await expect.poll(()=>state.db.Playlist.length).toBe(1);
      await inspect(page,page.locator('#app-scroll-container'),`delete-playlist-error-${language}-${theme}`);
      await page.unroute(/\/entities\/Playlist\/qa-playlist(?:\?|$)/,fail);page.off('dialog',dialogs);
    }
    page.once('dialog',d=>d.accept());await control.click();await expect.poll(()=>state.db.Playlist.length).toBe(0);
    await inspect(page,page.locator('#app-scroll-container'),`delete-playlist-success-${language}-${theme}-${width}`);
  }
  await page.setViewportSize({width:360,height:640});const result={};
  for(const name of ['ThoughtCoach','Coach']){
    await page.goto('/'+name);if(name==='Coach')await page.getByTestId('coach-start-first').click();
    const root=page.getByTestId(name==='Coach'?'coach-wizard':'thoughtcoach-flow');await expect(root).toBeVisible();
    const focus=[];for(let i=0;i<24;i++){await page.keyboard.press('Tab');focus.push(await root.evaluate(el=>el.contains(document.activeElement)));}
    expect(focus.every(Boolean)).toBe(true);
    result[name]={focus};
  }
  fs.writeFileSync(`${evidenceDir}/full-screen-focus-${language}-${theme}.json`,JSON.stringify(result,null,2));
});}
