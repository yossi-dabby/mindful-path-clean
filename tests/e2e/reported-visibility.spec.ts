import {test,expect} from '@playwright/test';
import {mockApi} from '../helpers/ui';

for(const language of ['en','he'])for(const theme of ['light','dark'])test(`reported entry and artwork visibility ${language}/${theme}`,async({page})=>{
 test.setTimeout(90000);
 await mockApi(page);await page.addInitScript(({language,theme})=>{localStorage.setItem('language',language);localStorage.setItem('i18nextLng',language);localStorage.setItem('theme',theme);localStorage.setItem('age_verified','true');(window as any).__TEST_APP_ID__='test-app-id';(window as any).__DISABLE_ANALYTICS__=true;},{language,theme});
 for(const [width,height]of [[365,659],[333,597],[768,1024],[1024,768],[1440,900],[1363,500],[844,390]]){
  await page.setViewportSize({width,height});await page.goto('/Chat');await expect(page.getByTestId('chat-root')).toHaveAttribute('data-page-ready','true',{timeout:20000});
  const welcome=page.getByTestId('chat-welcome');const start=page.getByTestId('chat-start-first-session');
  // Initial geometry only: scrolling here would hide the reported regression.
  await expect(welcome).toBeInViewport({ratio:1});await expect(start).toBeInViewport({ratio:1});
  const geometry=await welcome.evaluate(el=>{const rect=el.getBoundingClientRect(),nav=document.querySelector('[data-mobile-bottom-nav]')!,header=document.querySelector('[data-mobile-header]')!;const nr=nav.getBoundingClientRect(),hr=header.getBoundingClientRect();const boundary=nr.height?nr.top:innerHeight;return{top:rect.top,bottom:rect.bottom,headerBottom:hr.height?hr.bottom:0,boundary,ownScroll:el.scrollHeight>el.clientHeight+1,appScrollTop:document.querySelector('#app-scroll-container')!.scrollTop};});
  expect(geometry.top).toBeGreaterThanOrEqual(geometry.headerBottom);expect(geometry.bottom).toBeLessThanOrEqual(geometry.boundary+1);expect(geometry.ownScroll).toBe(false);expect(geometry.appScrollTop).toBe(0);
  await expect(page.getByTestId('chat-welcome-title')).toBeInViewport({ratio:1});await expect(page.getByTestId('chat-welcome-copy')).toBeInViewport({ratio:1});
  if(width<768){const nav=page.locator('[data-mobile-bottom-nav]');await expect(nav).toBeInViewport({ratio:1});expect(await nav.evaluate(el=>{const r=el.getBoundingClientRect(),a=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return !!a&&el.contains(a);})).toBe(true);}
  await page.screenshot({animations:'disabled',path:`test-results/chat-entry-${language}-${theme}-${width}.png`});
 }
 for(const width of [365,768,1024,1440]){
  await page.setViewportSize({width,height:900});await page.goto('/Tools');const cards=page.locator('.botanical-tool-card');await expect(cards).toHaveCount(6);
  const geometry=await cards.evaluateAll(elements=>elements.map(el=>{const r=el.getBoundingClientRect(),icon=el.querySelector('.botanical-tool-icon')!.getBoundingClientRect(),art=el.querySelector('.botanical-tool-art')!.getBoundingClientRect(),heading=el.querySelector('h2')!;const rect=(b:DOMRect)=>({left:b.left,right:b.right,top:b.top,bottom:b.bottom});return{card:rect(r),icon:rect(icon),art:rect(art),titleFits:heading.scrollWidth<=heading.clientWidth+1,iconCoversArt:icon.left<art.right&&icon.right>art.left&&icon.top<art.bottom&&icon.bottom>art.top};}));
  for(const g of geometry){expect(g.iconCoversArt).toBe(false);for(const item of [g.icon,g.art]){expect(item.left).toBeGreaterThanOrEqual(g.card.left);expect(item.right).toBeLessThanOrEqual(g.card.right);expect(item.top).toBeGreaterThanOrEqual(g.card.top);expect(item.bottom).toBeLessThanOrEqual(g.card.bottom);}expect(g.titleFits).toBe(true);}
  await page.screenshot({animations:'disabled',path:`test-results/tools-art-${language}-${theme}-${width}.png`});
 }
});

for(const width of [365,768,1440])test(`start opens the fixed conversation layout at ${width}`,async({page})=>{
 await mockApi(page);await page.addInitScript(()=>{localStorage.setItem('age_verified','true');(window as any).__TEST_APP_ID__='test-app-id';(window as any).__DISABLE_ANALYTICS__=true;});await page.setViewportSize({width,height:width===365?659:900});await page.goto('/Chat');await page.getByTestId('chat-start-first-session').click();await expect(page.getByTestId('chat-root')).toHaveAttribute('data-chat-empty','false');await expect(page.getByTestId('chat-messages')).toBeVisible();await expect(page.getByTestId('therapist-chat-input')).toBeInViewport({ratio:1});expect(await page.locator('#app-scroll-container').evaluate(el=>el.scrollTop)).toBe(0);
});
