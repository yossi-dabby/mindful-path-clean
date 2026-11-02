import { expect, test, type Page } from '@playwright/test';
import { mockApi } from './ui';
import { jsPDF } from 'jspdf';

export async function prepareChatStage2(page: Page, { language='en', theme='light', width=390, height=844, summary='' } = {}) {
  await page.setViewportSize({width,height}); await mockApi(page);
  await page.addInitScript(({language,theme}) => {
    localStorage.setItem('language',language); localStorage.setItem('i18nextLng',language); localStorage.setItem('theme',theme); localStorage.setItem('age_verified','true');
    (window as any).__DISABLE_ANALYTICS__=true;
  }, {language,theme});
  const now = new Date().toISOString();
  const conversation = { id:'qa-chat-stage2', agent_name:'cbt_therapist', metadata:{name:'QA stage 2 conversation',language}, session_summary:summary,
    messages:[{id:'qa-user',role:'user',content:'Synthetic UI check only.',created_date:now}, {id:'qa-assistant',role:'assistant',content:'One small step is enough.\n\n1. Pause.\n2. Notice.\n3. Continue.',status:'completed',created_date:now,metadata:{status:'completed',completed:true,feedback_finality_verified:true}}], created_date:now,updated_date:now };
  const db:Record<string,any[]> = { Conversation:[],UserDeletedConversations:[],TherapyFeedback:[],ThoughtJournal:[] };
  const apiRequests:string[]=[];
  page.on('request', request=>{const path=new URL(request.url()).pathname;if(/\/(entities|functions)\//.test(path))apiRequests.push(`${request.method()} ${path.replace(/\/apps\/.*?(?=\/(?:entities|functions)\/)/,'/apps/[fixture-app]')}`);});
  const state = { db, conversation, apiRequests, failFeedback:false, failSave:false, failPreference:false, fileAvailable:true, writes:[] as any[], requests:[] as string[] };
  await page.route(/\/api\/.*\/agents\/conversations(?:[/?]|$)/, async route => {
    const req=route.request(),url=new URL(req.url()); state.requests.push(`${req.method()} ${url.pathname}${url.search}`);
    const match=url.pathname.match(/\/agents\/conversations\/(?:v2\/)?([^/]+)/);
    if(req.method()==='GET') return route.fulfill({json:match?conversation:(!url.searchParams.get('agent_name') || url.searchParams.get('agent_name')==='cbt_therapist'?[conversation]:[])});
    if(req.method()==='POST' && url.pathname.endsWith('/messages')) { const data=req.postDataJSON(); const user={id:`user-${conversation.messages.length}`,role:'user',content:data.content,status:'completed',created_date:new Date().toISOString()}; conversation.messages.push(user as any); return route.fulfill({json:user}); }
    return route.fulfill({json:conversation});
  });
  await page.route(/\/api\/.*\/entities\/(?:Conversation|UserDeletedConversations|TherapyFeedback|ThoughtJournal)(?:[/?]|$)/, async route => {
    const req=route.request(),url=new URL(req.url()),match=url.pathname.match(/\/entities\/([^/]+)(?:\/([^/]+))?/)!;
    const [,entity,id]=match;
    if(req.method()==='GET'){const q=JSON.parse(url.searchParams.get('q')||'{}');return route.fulfill({json:db[entity].filter(row=>Object.entries(q).every(([k,v])=>row[k]===v))});}
    const data=req.postDataJSON();state.writes.push({entity,id,data,method:req.method()});
    if((entity==='TherapyFeedback'&&state.failFeedback)||(entity==='ThoughtJournal'&&state.failSave)||(entity==='Conversation'&&state.failPreference))return route.fulfill({status:503,json:{message:'Synthetic write failure'}});
    const row=id?db[entity].find(row=>row.id===id):{id:`qa-${entity}-${state.writes.length}`,created_by:'test@example.com'};Object.assign(row,data);if(!id)db[entity].push(row);return route.fulfill({json:row});
  });
  await page.route(/\/functions\/extractThoughtWorkData(?:[/?]|$)/, route => route.fulfill({json:{success:true,data:{situation:'Synthetic QA situation',automatic_thoughts:'Synthetic thought',balanced_thought:'A balanced QA perspective',homework:['Synthetic practice']}}}));
  const pdf = new jsPDF(); pdf.text('Synthetic Stage 2 worksheet',20,30); pdf.addPage(); pdf.text('Second QA page',20,30);
  const pdfBytes = Buffer.from(pdf.output('arraybuffer'));
  await page.route(/\/forms\/qa-stage2\.pdf(?:[?#]|$)/, route => state.fileAvailable ? route.fulfill({body:pdfBytes,contentType:'application/pdf'}) : route.fulfill({status:404,body:'Synthetic missing file'}));
  stage2States.set(page,state);
  await page.goto('/Chat');
  // Wait for the app's hydration boundary; route modules can still be loading after document load.
  await expect(page.getByTestId('chat-root')).toBeVisible({timeout:20000});
  await expect(page.getByTestId('chat-root')).toHaveAttribute('data-page-ready','true');
  return state;
}

export async function openStage2Conversation(page:Page, width:number) {
  // The accessible label is unchanged; the menu icon distinguishes the narrow
  // toggle from the desktop collapse control without depending on its language.
  const root=page.getByTestId('chat-root');
  const toggle=width<1280?root.locator('button').filter({has:page.locator('svg.lucide-menu')}):root.locator('button').filter({has:page.locator('svg.lucide-panel-left-open')});
  await toggle.click(); await page.getByRole('button',{name:/^QA stage 2 conversation/}).click();
  await expect(page.getByRole('log')).toContainText('One small step is enough.');
}

const stage2States=new WeakMap<Page, {apiRequests:string[]}>();
export async function attachStage2RequestDiagnostics(page:Page){const state=stage2States.get(page);if(state)await test.info().attach('synthetic-api-paths',{body:Buffer.from(JSON.stringify(state.apiRequests,null,2)),contentType:'application/json'});}
