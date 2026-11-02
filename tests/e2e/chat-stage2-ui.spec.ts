import {test,expect} from '@playwright/test';
import {prepareChatStage2,openStage2Conversation,attachStage2RequestDiagnostics} from '../helpers/chatStage2';

test.afterEach(async({page},info)=>{if(info.status!==info.expectedStatus)await attachStage2RequestDiagnostics(page);});

test('Stage 2: narrow conversation drawer owns focus, covers composer and closes on Escape',async({page})=>{
 await prepareChatStage2(page,{width:333,height:597});const trigger=page.getByTestId('chat-root').getByRole('button',{name:'Open conversations sidebar',exact:true});await trigger.focus();await trigger.click();
 const dialog=page.getByRole('dialog',{name:'Sessions',exact:true});await expect(dialog).toBeVisible();
 for(let n=0;n<16;n++){await page.keyboard.press('Tab');expect(await dialog.evaluate(el=>el.contains(document.activeElement))).toBe(true);}
 await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);await expect(trigger).toBeFocused();
});

test('Stage 2: long session summary stays in the message scroll area',async({page})=>{
 await prepareChatStage2(page,{width:333,height:597,summary:'A synthetic reflection for reviewing layout. '.repeat(50)});await openStage2Conversation(page,333);
 const input=page.getByTestId('therapist-chat-input');await expect(input).toBeInViewport({ratio:1});
 expect(await page.getByTestId('chat-messages').evaluate(el=>!!el.querySelector('[data-testid="chat-session-summary"]'))).toBe(true);
});

test('Stage 2: attachment chip stays inside the user bubble',async({page})=>{
 await prepareChatStage2(page,{width:333,height:597});await page.evaluate(async()=>{const {renderStage2Fixture}=await import('/tests/fixtures/chat-stage2-preview.jsx');renderStage2Fixture('attachment');});
 const link=page.locator('#stage2-fixture a');await expect(link).toBeVisible();expect(await link.evaluate(el=>{const r=el.getBoundingClientRect(),p=el.parentElement!.parentElement!.getBoundingClientRect();return r.right<=p.right+1&&r.left>=p.left-1&&el.scrollWidth<=el.clientWidth+1;})).toBe(true);
});

test('Stage 2: dark age gate retains readable support text',async({page})=>{
 await prepareChatStage2(page,{width:333,height:597,theme:'dark'});await page.evaluate(async()=>{const {renderStage2Fixture}=await import('/tests/fixtures/chat-stage2-preview.jsx');renderStage2Fixture('age');});
 const text=page.getByRole('dialog').locator('ul');await expect(text).toBeVisible();
 const contrast=await text.evaluate(el=>{const nums=(v:string)=>(v.match(/[\d.]+/g)||[]).map(Number);const lum=(c:number[])=>c.slice(0,3).map(x=>x/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4).reduce((s,x,i)=>s+x*[.2126,.7152,.0722][i],0);const fg=lum(nums(getComputedStyle(el).color)),bg=lum(nums(getComputedStyle(el.closest('.age-gate-card')!).backgroundColor));return(Math.max(fg,bg)+.05)/(Math.min(fg,bg)+.05)});expect(contrast).toBeGreaterThanOrEqual(4.5);
});

for(const language of ['en','he'])for(const theme of ['light','dark'])for(const width of [333,768,1440]) test(`Stage 2 full chat layout ${language}/${theme}/${width}`,async({page})=>{
 const height=width===333?597:width===768?1024:900;
 const state=await prepareChatStage2(page,{language,theme,width,height,summary:'A saved summary with a long unbroken word: '+ 'LongReflection'.repeat(75)});
 const input=page.getByTestId('therapist-chat-input');
 for(let index=0;index<3;index++){await page.getByTestId('chat-intent-options').getByRole('button').nth(index).click();await expect(input).not.toHaveValue('');await input.fill('');}
 expect(state.writes).toHaveLength(0);
 const now=new Date().toISOString();
 state.conversation.messages=Array.from({length:72},(_,n)=>({id:`qa-${n}`,role:n%2?'assistant':'user',content:n===0?'Oldest synthetic entry':n%2?`One small step is enough. Synthetic response ${n}.`:`Synthetic mixed text ${n}: עברית and English.`,created_date:now,status:'completed',metadata:{status:'completed',completed:true}})) as any;
 await openStage2Conversation(page,width); await expect(input).toBeInViewport({ratio:1});
 const summary=page.getByTestId('chat-session-summary');await expect(summary).toBeAttached();expect(await summary.evaluate(el=>!!el.closest('[data-testid="chat-messages"]'))).toBe(true);
 const older=page.getByRole('button',{name:language==='he'?'טעינת הודעות קודמות':'Load earlier messages',exact:true});
 await expect(older).toBeAttached();for(let n=0;n<5&&await older.count();n++)await older.click();await expect(page.getByRole('log')).toContainText('Oldest synthetic entry');
 await input.fill('A long draft without spaces: '+ 'LongDraft'.repeat(150));await expect(input).toBeInViewport({ratio:1});expect(await input.evaluate(e=>e.getBoundingClientRect().height)).toBeLessThanOrEqual(160);
 await page.setViewportSize({width,height:width<768?440:width===768?560:650});await expect(input).toBeInViewport({ratio:1});
 await expect.poll(()=>page.getByTestId('chat-messages').evaluate(el=>el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(64);
 const support=page.getByTestId('chat-human-support');await expect(support).toBeInViewport({ratio:1});await expect(support).toHaveAccessibleName(language==='he'?'עזרה אנושית':'Human support');
 expect(await page.getByTestId('chat-root').evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
 await page.screenshot({path:`test-results/chat-stage2-${language}-${theme}-${width}.png`});
 if(width<768){await page.getByTestId('chat-header').getByRole('button').first().focus();await expect(page.locator('[data-mobile-header]')).toBeVisible();}
});

for(const language of ['en','he'])for(const theme of ['light','dark'])test(`Stage 2 feedback handles failure and confirms one saved choice ${language}/${theme}`,async({page})=>{
 const state=await prepareChatStage2(page,{language,theme,width:390});await openStage2Conversation(page,390);
 const yes=page.getByTestId('feedback-helpful'),no=page.getByTestId('feedback-not-helpful');await expect(yes).toBeVisible();await expect(yes).toContainText(language==='he'?'עזר':'Helpful');await expect(no).toContainText(language==='he'?'לא עזר':'Not helpful');
 state.failFeedback=true;await yes.click();await expect(page.getByRole('alert')).toBeVisible();await expect(yes).toBeEnabled();expect(state.db.TherapyFeedback).toHaveLength(0);
 state.failFeedback=false;await no.click();await expect(no).toHaveAttribute('aria-pressed','true');await expect(no).toBeDisabled();await expect.poll(()=>state.db.TherapyFeedback.length).toBe(1);expect(state.db.TherapyFeedback[0].feedback_type).toBe('not_helpful');expect(state.writes.at(-1).data).not.toHaveProperty('created_by');
});

for(const language of ['en','he'])for(const theme of ['light','dark'])test(`Stage 2 thought save stays localized and retry saves once ${language}/${theme}`,async({page})=>{
 const state=await prepareChatStage2(page,{language,theme,width:333,height:597});await page.evaluate(async()=>{const {renderStage2Fixture}=await import('/tests/fixtures/chat-stage2-preview.jsx');renderStage2Fixture('save');});
 const panel=page.getByTestId('chat-thought-save');state.failSave=true;await panel.getByRole('button',{name:language==='he'?'שמירה ביומן':'Save to Journal',exact:true}).click();await expect(panel.getByRole('alert')).toBeVisible();await expect(panel).not.toContainText('Synthetic write failure');expect(state.db.ThoughtJournal).toHaveLength(0);
 state.failSave=false;await panel.getByRole('button',{name:language==='he'?'נסו שוב':'Retry',exact:true}).click();await expect(panel.getByRole('status')).toContainText(language==='he'?'נשמרו':'Saved');expect(state.db.ThoughtJournal).toHaveLength(1);expect(state.db.ThoughtJournal[0].custom_fields.conversation_id).toBe('qa-only');expect(state.db.ThoughtJournal[0].situation).toBe('Synthetic QA situation');expect(state.db.ThoughtJournal[0].homework_tasks).toEqual(['Synthetic practice']);
});

for(const language of ['en','he'])for(const width of [333,768])test(`Stage 2 PDF missing file retry, download and return ${language}/${width}`,async({page})=>{
 const state=await prepareChatStage2(page,{language,width,theme:'dark'});(state.conversation.messages[1].metadata as any).generated_file={type:'pdf',url:'/forms/qa-stage2.pdf',name:'qa-stage2.pdf',title:'Synthetic QA worksheet',description:'No personal data'};
 await openStage2Conversation(page,width);await page.getByTestId('generated-file-open').scrollIntoViewIfNeeded();state.fileAvailable=false;await page.getByTestId('generated-file-open').click();await expect(page).toHaveURL(/\/pdf-viewer\?/);await expect(page.getByRole('alert')).toBeVisible({timeout:15000});
 state.fileAvailable=true;await page.getByRole('button',{name:language==='he'?'נסו שוב':'Retry',exact:true}).click();await expect(page.locator('canvas')).toHaveCount(2,{timeout:15000});
 const pending=page.waitForEvent('download');await page.getByRole('button',{name:language==='he'?'הורד דף עבודה':'Download Worksheet',exact:true}).click();const download=await pending;expect(download.suggestedFilename()).toMatch(/\.pdf$/i);
 await page.getByRole('button',{name:language==='he'?'סגירה':'Close',exact:true}).click();await expect(page).toHaveURL(/\/Chat$/);await expect(page.getByRole('log')).toContainText('One small step is enough.');
});

test('Stage 2 generic user file renders a named attachment chip',async({page})=>{
 await prepareChatStage2(page,{width:333});await page.evaluate(async()=>{const {renderStage2Fixture}=await import('/tests/fixtures/chat-stage2-preview.jsx');renderStage2Fixture('generic');});await expect(page.locator('#stage2-fixture').getByRole('link',{name:/QA-notes.txt/})).toBeVisible();
});

for(const language of ['en','he','es','fr','de','it','pt'])test(`Stage 2 consent and age views retain accessible layout ${language}`,async({page})=>{
 await prepareChatStage2(page,{language,theme:'dark',width:333,height:597});await page.evaluate(async()=>{const {renderStage2Fixture}=await import('/tests/fixtures/chat-stage2-preview.jsx');renderStage2Fixture('age');});
 const gate=page.getByRole('dialog');await expect(gate).toHaveAttribute('aria-describedby','age-gate-description');await expect.poll(()=>gate.evaluate(el=>el.contains(document.activeElement))).toBe(true);
 for(let n=0;n<10;n++){await page.keyboard.press('Tab');expect(await gate.evaluate(el=>el.contains(document.activeElement))).toBe(true);}for(const button of await gate.getByRole('button').all()){await button.evaluate(el=>el.scrollIntoView({block:'center'}));await expect(button).toBeInViewport({ratio:1});expect(await button.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);}
 await page.goto('/Chat');await expect(page.getByTestId('chat-root')).toBeVisible();await page.evaluate(async()=>{const {renderStage2Fixture}=await import('/tests/fixtures/chat-stage2-preview.jsx');renderStage2Fixture('consent');});
 const consent=page.getByTestId('consent-banner');await expect(consent).toBeVisible();await expect(consent.getByRole('link')).toHaveCount(2);const accept=consent.getByTestId('consent-accept');await accept.scrollIntoViewIfNeeded();await expect(accept).toBeInViewport({ratio:1});expect(await consent.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
 await page.screenshot({path:`test-results/chat-stage2-consent-${language}.png`});
});

for(const width of [333,768,1440])test(`Stage 2 conversation actions preserve drafts and focus ${width}`,async({page})=>{
 const state=await prepareChatStage2(page,{width,theme:'dark'});await openStage2Conversation(page,width);
 if(width<1280)await page.getByTestId('chat-root').locator('button').filter({has:page.locator('svg.lucide-menu')}).click();
 const sidebar=width<1280?page.getByRole('dialog',{name:'Sessions',exact:true}):page.getByTestId('chat-desktop-sessions');
 const search=sidebar.getByRole('searchbox',{name:'Search conversations'});await search.fill('No match in QA');await expect(sidebar).toContainText('No conversations match your search.');await expect(sidebar.getByRole('button',{name:/^QA stage 2 conversation/})).toHaveCount(0);await search.fill('');
 const actions=()=>sidebar.getByRole('button',{name:/^Conversation actions for /});
 const date=sidebar.getByRole('button',{name:/^QA stage 2 conversation/}).locator('p').last();expect(await date.evaluate((el,action)=>{const a=document.querySelector(`button[aria-label="${action}"]`)!.getBoundingClientRect(),d=el.getBoundingClientRect();return d.right<=a.left||d.left>=a.right;},await actions().getAttribute('aria-label'))).toBe(true);
 await actions().click();await page.getByRole('menuitem',{name:'Rename',exact:true}).click();const draft=sidebar.getByRole('textbox',{name:'Conversation name'});await expect(draft).toHaveAttribute('maxlength','80');await draft.fill('');await expect(sidebar.getByRole('button',{name:'Save name',exact:true})).toBeDisabled();
 await draft.fill('QA renamed after retry');state.failPreference=true;await sidebar.getByRole('button',{name:'Save name',exact:true}).click();await expect(sidebar.getByRole('alert')).toBeVisible();await expect(draft).toHaveValue('QA renamed after retry');
 state.failPreference=false;await sidebar.getByRole('button',{name:'Save name',exact:true}).click();await expect(draft).toHaveCount(0);await expect(sidebar.getByRole('button',{name:/^QA renamed after retry/})).toBeVisible();
 await actions().click();await page.getByRole('menuitem',{name:'Pin',exact:true}).click();await expect.poll(()=>state.db.Conversation[0]?.is_pinned).toBe(true);
 await actions().click();await page.getByRole('menuitem',{name:'Unpin',exact:true}).click();await expect.poll(()=>state.db.Conversation[0]?.is_pinned).toBe(false);
 await actions().click();await page.getByRole('menuitem',{name:'Delete',exact:true}).click();const confirm=page.getByRole('alertdialog');await expect(confirm.getByRole('button',{name:'Cancel',exact:true})).toBeFocused();await confirm.getByRole('button',{name:'Cancel',exact:true}).click();await expect(confirm).toHaveCount(0);await expect(actions()).toBeFocused();expect(state.db.UserDeletedConversations).toHaveLength(0);
 await actions().click();await page.getByRole('menuitem',{name:'Delete',exact:true}).click();await page.getByRole('alertdialog').getByRole('button',{name:'Delete',exact:true}).click();await expect.poll(()=>state.db.UserDeletedConversations.length).toBe(1);await expect(sidebar.getByRole('button',{name:/^QA renamed after retry/})).toHaveCount(0);await expect(sidebar.getByTestId('chat-new-conversation')).toBeFocused();
});

for(const language of ['en','he'])test(`Stage 2 bulk delete confirmation returns focus ${language}`,async({page})=>{
 const state=await prepareChatStage2(page,{language,width:333});await openStage2Conversation(page,333);await page.getByTestId('chat-root').locator('button').filter({has:page.locator('svg.lucide-menu')}).click();const sidebar=page.getByRole('dialog');
 await sidebar.getByRole('checkbox').first().check();const bulk=sidebar.getByRole('button',{name:language==='he'?'מחיקת 1 שיחות שנבחרו':'Delete 1 selected sessions',exact:true});await bulk.click();await page.getByRole('alertdialog').getByRole('button',{name:language==='he'?'ביטול':'Cancel',exact:true}).click();await expect(bulk).toBeFocused();expect(state.db.UserDeletedConversations).toHaveLength(0);
 await bulk.click();await page.getByRole('alertdialog').getByRole('button',{name:language==='he'?'מחיקה':'Delete',exact:true}).click();await expect.poll(()=>state.db.UserDeletedConversations.length).toBe(1);await expect(sidebar.getByTestId('chat-new-conversation')).toBeFocused();
});

for(const language of ['en','he','es','fr','de','it','pt'])test(`Stage 2 restricted view wraps translated copy ${language}`,async({page})=>{
 await prepareChatStage2(page,{language,width:333,height:597,theme:'dark'});await page.evaluate(async()=>{const {renderStage2Fixture}=await import('/tests/fixtures/chat-stage2-preview.jsx');renderStage2Fixture('restricted');});const panel=page.locator('#stage2-fixture');await expect(panel.getByRole('heading')).toBeVisible();const home=panel.getByRole('link');await home.scrollIntoViewIfNeeded();await expect(home).toBeInViewport({ratio:1});await expect(home).toHaveAttribute('href','/');expect(await panel.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
});

for(const language of ['en','he'])test(`Stage 2 mixed-language assistant paragraphs retain natural direction ${language}`,async({page})=>{
 const state=await prepareChatStage2(page,{language,width:333,theme:'dark'});state.conversation.messages[1].content='One small step is enough.\n\nEnglish paragraph with a final period.\n\nפסקה בעברית עם נקודה בסוף.\n\n1. A short item.\n2. A longer item with '+ 'LongWord'.repeat(60)+'\n\n[QA information](https://example.com/qa)';await openStage2Conversation(page,333);
 for(const [text,direction]of [['English paragraph with a final period.','ltr'],['פסקה בעברית עם נקודה בסוף.','rtl']])expect(await page.getByRole('log').getByText(text,{exact:true}).evaluate(el=>getComputedStyle(el).direction)).toBe(direction);
 const link=page.getByRole('log').getByRole('link',{name:'QA information'});await expect(link).toHaveAttribute('href','https://example.com/qa');await expect(link).toHaveAttribute('rel','noopener noreferrer');expect(await page.getByTestId('chat-messages').evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
});

for(const width of [333,768,1440])test(`Stage 2 summary practice and support links navigate ${width}`,async({page})=>{
 // This journey cold-loads Chat and two code-split destinations; retain a bounded budget for the complete navigation, not just startup.
 test.setTimeout(90000);
 const state=await prepareChatStage2(page,{width,summary:'A synthetic session summary.'});(state.conversation as any).suggested_exercises=['qa-exercise'];await page.route(/\/api\/.*\/entities\/Exercise(?:[/?]|$)/,route=>route.fulfill({json:[{id:'qa-exercise',title:'Synthetic QA practice',description:'A short QA practice description.',category:'mindfulness',is_active:true}]}));await openStage2Conversation(page,width);
 const practice=page.getByTestId('chat-session-summary').getByRole('link');await practice.scrollIntoViewIfNeeded();await expect(practice).toBeInViewport({ratio:1});expect(await practice.locator('button').count()).toBe(0);await practice.click();await expect(page).toHaveURL(/\/Exercises$/);await expect(page.locator('[data-app-page-transition][data-app-page-name="Exercises"]')).toBeVisible({timeout:20000});await expect(page.getByRole('heading',{name:'Exercises Library',exact:true})).toBeVisible();await page.goBack();await expect(page).toHaveURL(/\/Chat$/);await expect(page.locator('[data-app-page-transition][data-app-page-name="Chat"]')).toBeVisible({timeout:20000});await expect(page.getByRole('log')).toContainText('One small step is enough.');await page.getByTestId('chat-human-support').click();await expect(page).toHaveURL(/\/contact$/);
});
