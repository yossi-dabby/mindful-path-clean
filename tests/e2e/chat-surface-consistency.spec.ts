import {test,expect,type Page} from '@playwright/test';
import {mockApi} from '../helpers/ui';
async function prepare(page:Page,language='en',dark=false){
 await mockApi(page);
 await page.addInitScript(({language,dark})=>{localStorage.setItem('language',language);localStorage.setItem('i18nextLng',language);localStorage.setItem('theme',dark?'dark':'light');localStorage.setItem('age_verified','true');(window as any).__TEST_APP_ID__='test-app-id';(window as any).__DISABLE_ANALYTICS__=true;},{language,dark});
 await page.goto('/Chat');await expect(page.getByTestId('chat-root')).toBeVisible({timeout:20000});
}
async function contrast(locator){return locator.evaluate(el=>{
 const rgb=(v:string)=>v.match(/[\d.]+/g)!.map(Number);const fg=rgb(getComputedStyle(el).color);let bg=[255,255,255];const ancestors:Element[]=[];
 for(let p:Element|null=el;p;p=p.parentElement)ancestors.unshift(p);
 for(const p of ancestors){const c=rgb(getComputedStyle(p).backgroundColor),a=c[3]??1;bg=bg.map((v,i)=>c[i]*a+v*(1-a));}
 const luminance=(c:number[])=>c.slice(0,3).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
 const a=luminance(fg),b=luminance(bg);return(Math.max(a,b)+.05)/(Math.min(a,b)+.05);
});}
for(const language of ['en','he'])for(const width of [390,768,1440])test(`${language} ${width}: all opening choices and support fit`,async({page})=>{
 await page.setViewportSize({width,height:width===390?844:1000});await prepare(page,language);
 const support=page.getByTestId('chat-human-support');await expect(support).toBeVisible();
 expect(await support.evaluate(el=>{const row=el.parentElement!.getBoundingClientRect(),b=el.getBoundingClientRect();return Math.max(row.left-b.left,b.right-row.right,el.scrollWidth-el.clientWidth);})).toBeLessThanOrEqual(1);
 expect(await support.locator('span').evaluate(el=>{const b=el.getBoundingClientRect(),p=el.parentElement!.getBoundingClientRect();return Math.max(p.left-b.left,b.right-p.right);})).toBeLessThanOrEqual(1);
 for(const option of await page.getByTestId('chat-intent-options').getByRole('button').all()){await expect(option).toBeInViewport({ratio:1});expect(await option.evaluate(el=>el.scrollWidth-el.clientWidth)).toBeLessThanOrEqual(1);}
 await expect(page.getByTestId('chat-start-first-session')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
});
for(const dark of [false,true])test(`${dark?'dark':'light'}: file text and feedback are legible`,async({page})=>{
 await page.setViewportSize({width:390,height:844});await prepare(page,'en',dark);
 await page.evaluate(async()=>{const {renderChatFixture}=await import('/tests/fixtures/chat-ui-preview.jsx');renderChatFixture('message');});
 await expect(page.getByTestId('generated-file-card')).toBeVisible();
 for(const locator of [page.getByTestId('generated-file-card').locator('p').first(),page.getByTestId('generated-file-open'),page.getByTestId('generated-file-download'),page.getByTestId('feedback-helpful')]){await expect(locator).toBeVisible();expect(await contrast(locator)).toBeGreaterThanOrEqual(4.5);}
 for(const id of ['generated-file-open','generated-file-download']){const a=page.getByTestId(id);expect((await a.boundingBox())!.height).toBeGreaterThanOrEqual(44);expect(await a.evaluate(el=>el.scrollWidth-el.clientWidth)).toBeLessThanOrEqual(1);}
});
