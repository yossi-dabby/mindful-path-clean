import { expect, type Page, type Locator } from '@playwright/test';
import { preparePathStage3 } from '../../../tests/helpers/pathStage3';
import fs from 'node:fs';
import path from 'node:path';

export const evidenceDir = process.env.STAGE5_EVIDENCE_DIR || path.resolve('reports/stage5/evidence');
export async function prepareTools(page: Page, language='en', theme='light', populated=true, preservePreferencesOnReload=false) {
  const state = await preparePathStage3(page,{language,theme,populated:false,preservePreferencesOnReload});
  const title=language==='he'?'נתוני דוגמה בלבד — כותרת ארוכה לבדיקת פריסה וטקסט מעורב ABC 123':'Synthetic QA content — a long title to inspect wrapping and mixed text אבג 123';
  const now=new Date().toISOString();
  Object.assign(state.db,{
    Exercise:populated?[{id:'qa-exercise',title,description:title.repeat(4),category:'breathing',difficulty:'beginner',duration_minutes:1,instructions:title,detailed_steps:[{title,description:title}],benefits:[title],tips:[title],tags:['QA','בדיקה'],favorite:false,completed_count:1}]:[],
    AudioContent:populated?[{id:'qa-audio',title,linked_exercise_id:'qa-exercise',audio_url:'/qa-missing-audio.mp3',type:'exercise_guide',duration_minutes:1,duration_seconds:30}]:[],
    Video:populated?[{id:'qa-video',title,videoUrl:'/qa-missing-video.mp4',thumbnailUrl:'/qa-missing-thumbnail.jpg',category:'mindfulness',duration_minutes:5,difficulty:'beginner'}]:[],
    VideoProgress:[],UserExerciseProgress:[],
    Playlist:populated?[{id:'qa-playlist',name:title,title,description:title.repeat(3),video_count:1,created_date:now}]:[],
    PlaylistVideo:populated?[{id:'qa-link',playlist_id:'qa-playlist',video_id:'qa-video',position:0}]:[],
    Resource:populated?['en','he'].map(lang=>({id:'qa-resource-'+lang,language:lang,status:'active',title:lang==='he'?'מקור בדיקה בעברית':'Synthetic QA resource',description:title.repeat(3),url:'https://www.who.int/',type:'article',category:'anxiety',tags:['QA'],source:'WHO',publication_date:'2026-01-01',verified_at:now})):[],
    SavedResource:[],
    ForumPost:populated?[{id:'qa-post',title,content:title.repeat(5),category:'general',author_name:'QA synthetic user',created_by:'test@example.com',created_date:now,upvotes:0,comment_count:0,tags:['QA']}]:[],
    CommunityGroup:populated?[{id:'qa-group',name:title,description:title.repeat(3),category:'anxiety',created_by:'test@example.com',created_date:now,member_count:0}]:[],
    GroupMembership:[],CommunityReaction:[],ForumComment:[],
    SharedProgress:populated?[{id:'qa-story',title,content:title.repeat(3),progress_type:'milestone',author_name:'QA synthetic user',created_by:'test@example.com',created_date:now,upvotes:0}]:[],
    CoachingSession:[],MindGameActivity:[],GameProgress:[],UserSubscription:[]
  });
  // Honor SDK filter queries, rather than claiming missing IDs return a valid fixture.
  await page.route(/\/api\/apps\/[^/]+\/entities\/[^/?]+(?:[/?]|$)/,async route=>{
    const req=route.request(),url=new URL(req.url());
    const m=url.pathname.match(/\/entities\/([^/]+)(?:\/([^/]+))?/);
    if(!m||!(m[1] in state.db))return route.fallback();
    if(req.method()==='DELETE'){
      state.writes.push({entity:m[1],method:'DELETE',data:{id:m[2]}});
      state.db[m[1]]=state.db[m[1]].filter(row=>row.id!==m[2]);
      return route.fulfill({json:{id:m[2]}});
    }
    if(req.method()!=='GET')return route.fallback();
    let rows=state.db[m[1]];
    const filter=JSON.parse(url.searchParams.get('q')||'{}');
    rows=rows.filter(row=>Object.entries(filter).every(([key,value])=>typeof value==='object'||row[key]===value));
    return route.fulfill({json:m[2]?rows.find(row=>row.id===m[2])||{}:rows});
  });
  return state;
}

// Diagnostics are data, never success assertions. Each finding is reviewed in the report.
export async function inspect(page: Page, root: Locator, key: string) {
  await expect(root).toBeVisible({timeout:20000});
  await page.evaluate(()=>document.fonts.ready);
  await root.evaluate(async el=>{
    await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));
    const finite=el.getAnimations({subtree:true}).filter(animation=>animation.playState==='running'&&animation.effect?.getComputedTiming().iterations!==Infinity);
    await Promise.allSettled(finite.map(animation=>animation.finished));
  });
  const metrics=await root.evaluate(root=>{
    const visible=(el:Element)=>{const b=el.getBoundingClientRect(),s=getComputedStyle(el);return b.width>0&&b.height>0&&s.visibility!=='hidden'&&s.display!=='none';};
    const rect=(el:Element)=>{const b=el.getBoundingClientRect();return {x:b.x,y:b.y,width:b.width,height:b.height};};
    const name=(el:Element)=>el.getAttribute('aria-label')||el.getAttribute('title')||(el.textContent||'').trim().slice(0,140);
    const controls=Array.from(root.querySelectorAll('button,a,input,textarea,[role="tab"],[role="combobox"]')).filter(visible);
    const unlabeled=controls.filter(el=>!name(el)&&!el.getAttribute('aria-labelledby')&&!el.getAttribute('placeholder')&&!el.querySelector('img[alt]')).map(el=>({tag:el.tagName,html:el.outerHTML.slice(0,350),box:rect(el)}));
    const small=controls.filter(el=>!el.hasAttribute('disabled')&&(rect(el).width<43||rect(el).height<43)).map(el=>({name:name(el),box:rect(el)}));
    const clipped=Array.from(root.querySelectorAll('h1,h2,h3,p,button,input,textarea,[role="tab"]')).filter(visible).filter(el=>{const r=rect(el),a=rect(root);return r.x<a.x-2||r.x+r.width>a.x+a.width+2||el.scrollWidth>el.clientWidth+3&&getComputedStyle(el).overflowX==='hidden'&&!el.className.toString().includes('line-clamp');}).map(el=>({name:name(el),tag:el.tagName,box:rect(el),scroll:el.scrollWidth,client:el.clientWidth}));
    const app=document.querySelector('#app-scroll-container')||root;
    return {settled:true,direction:document.documentElement.dir,theme:document.documentElement.className,root:rect(root),appWidth:app.clientWidth,appScroll:app.scrollWidth,unlabeled,small,clipped,headings:Array.from(root.querySelectorAll('h1,h2,h3')).filter(visible).map(name),text:(root as HTMLElement).innerText.slice(0,14000),links:Array.from(root.querySelectorAll('a')).map(el=>({name:name(el),href:el.getAttribute('href')}))};
  });
  fs.mkdirSync(evidenceDir,{recursive:true});
  fs.writeFileSync(`${evidenceDir}/${key}.json`,JSON.stringify(metrics,null,2));
  await page.screenshot({path:`${evidenceDir}/${key}.png`});
  return metrics;
}

export const routes=['Tools','Exercises','ExerciseView?id=qa-exercise','ExperientialGames','TherapeuticForms','Videos','Playlists','PlaylistDetail?id=qa-playlist','VideoPlayer','Resources','ThoughtCoach','Coach','CoachingAnalytics','Community','PersonalizedFeed'];
export function rootFor(page:Page,route:string){return route==='ThoughtCoach'?page.getByTestId('thoughtcoach-flow'):page.locator('#app-scroll-container');}
