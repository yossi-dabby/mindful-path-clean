import { expect, type Page, type Locator } from '@playwright/test';
import { preparePathStage3, assertPathWidth, assertPathTextContrast } from './pathStage3';
import { applyJournalUiTranslations } from '../../src/components/i18n/journalUiTranslations.js';
import { journalTemplateCatalogRows } from '../../src/components/journal/journalTemplateCatalog.js';

export { assertPathWidth, assertPathTextContrast };
const dictionaries = applyJournalUiTranslations(Object.fromEntries(['en','he','es','fr','de','it','pt'].map(language => [language, { translation: {} }])));
export const journalCopy = (language: string) => dictionaries[language].translation.journal_ui;
export const journalCatalogNames = (language: string) => Object.values(journalCopy(language).templates.catalog).map((item: any) => item.name);
const audioBytes = Buffer.alloc(844,128);
audioBytes.write('RIFF',0);audioBytes.writeUInt32LE(836,4);audioBytes.write('WAVEfmt ',8);audioBytes.writeUInt32LE(16,16);audioBytes.writeUInt16LE(1,20);audioBytes.writeUInt16LE(1,22);audioBytes.writeUInt32LE(8000,24);audioBytes.writeUInt32LE(8000,28);audioBytes.writeUInt16LE(1,32);audioBytes.writeUInt16LE(8,34);audioBytes.write('data',36);audioBytes.writeUInt32LE(800,40);
export const journalAudioFile = {name:'qa-audio.wav',mimeType:'audio/wav',buffer:audioBytes};
export const journalImageFile = {name:'qa-image.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a8x8AAAAASUVORK5CYII=','base64')};

export async function prepareJournalStage4(page: Page, { language = 'en', theme = 'light', populated = true } = {}) {
  // An empty journal can still belong to a returning user with goals and moods.
  const base = await preparePathStage3(page, { language, theme });
  const now = new Date().toISOString();
  const long = language === 'he' ? 'רשומת בדיקה ארוכה עם פירוט עשיר וצעדים קטנים לתרגול יום יומי' : 'A long QA journal reflection with detailed context and small practical everyday steps';
  const journal = (id: string, days: number, type = 'cbt_standard') => ({
    id, entry_type: type, created_by: 'test@example.com', created_date: new Date(Date.now() - days * 86400000).toISOString(),
    situation: `<p><strong>${long}</strong> ${long.repeat(4)} QA final situation words</p>`, automatic_thoughts: '<p><em>QA automatic thought</em></p><ul><li>QA list item</li></ul>',
    emotions: ['Anxious','Sad','Worried','Frustrated'], emotion_intensity: 7, outcome_emotion_intensity: 4,
    cognitive_distortions: ['Catastrophizing'], evidence_for: '<p>QA evidence for</p>', evidence_against: '<p>QA evidence against</p>',
    balanced_thought: '<p><strong>QA balanced perspective</strong></p>', tags: ['QA work','QA reflection'], images: [], audio_notes: [],
    ai_summary: 'QA existing concise summary', homework_tasks: [{ task: long, duration_minutes: 5, success_criteria: 'QA small step completed' }]
  });
  Object.assign(base.db, {
    ThoughtJournal: populated ? [journal('journal-qa', 0), journal('journal-gratitude', 2, 'gratitude'), journal('journal-anxiety', 10, 'anxiety_log'), journal('journal-mood', 40, 'mood_journal'), journal('journal-custom', 120, 'custom'), { id: 'journal-partial', entry_type: 'custom', created_by: 'test@example.com', created_date: now, situation: '<p>QA partial reflection</p>', emotion_intensity: null, outcome_emotion_intensity: null, tags: [] }] : [],
    SessionSummary: populated ? [{ id: 'summary-qa', conversation_id: 'conversation-qa', created_by: 'test@example.com', created_date: now, session_date: now, summary_content: '# QA session summary\n\nA **formatted** reflection.\n\n- QA first item\n- QA second item', key_takeaways: [long], actionable_advice: [long], recommended_resources: [{title:'QA journal resource',url:'https://example.com/qa'}] }] : [],
    JournalTemplate: [{ id: 'template-qa', name: 'QA personal template', description: long, entry_type: 'custom', fields: [], created_by: 'test@example.com', created_date: now, language }],
    JournalReminder: populated ? [{ id: 'reminder-qa', title: long, message: long, entry_type: 'any', frequency: 'daily', time: '09:00', active: true, created_by: 'test@example.com', created_date: now }] : []
  });
  base.db.Exercise=[{id:'journal-qa-exercise',title:'QA breathing practice',category:'breathing',description:'Synthetic UI exercise',duration_minutes:2}];
  for(const row of journalTemplateCatalogRows.filter(row=>row[0].endsWith('.name'))){const key=row[0].split('.')[2];base.db.JournalTemplate.push({id:'catalog-'+key,slug:key.replaceAll('_','-'),name:row[1],entry_type:'custom',is_default:true,created_by:'test@example.com',created_date:now,fields:[],language});}
  const state = { ...base, writes: [] as any[], failWrites: {} as Record<string, number>, holdNextWrite: '', releaseHeldWrite: undefined as undefined | (() => void), failReads: {} as Record<string,number>, holdNextRead:'', releaseRead:undefined as undefined | (()=>void), failAi: false, holdNextAi:false, releaseAi:undefined as undefined | (()=>void), aiCalls: 0, uploads: [] as string[], longAi: false, holdNextUpload:false, releaseUpload:undefined as undefined | (()=>void) };
  await page.route(/\/api\/apps\/[^/]+\/entities\/(?:ThoughtJournal|SessionSummary|JournalTemplate|JournalReminder)(?:[/?]|$)/, async route => {
    const request = route.request(), url = new URL(request.url());
    const [,entity,id] = url.pathname.match(/\/entities\/([^/]+)(?:\/([^/]+))?/)!;
    const rows = state.db[entity];
    if (request.method() === 'GET') {
      if(state.holdNextRead===entity){state.holdNextRead='';await new Promise<void>(resolve=>{state.releaseRead=resolve;});}
      if(state.failReads[entity]>0){state.failReads[entity]--;return route.fulfill({status:503,json:{message:'Synthetic QA load failure'}});}
      const query = JSON.parse(url.searchParams.get('q') || '{}');
      return route.fulfill({ json: id ? rows.find(row => row.id === id) || {} : rows.filter(row => Object.entries(query).every(([key,value]) => row[key] === value)) });
    }
    const data = request.postData() ? request.postDataJSON() : {};
    state.writes.push({ entity, id, method: request.method(), data });
    if (state.holdNextWrite === entity) { state.holdNextWrite = ''; await new Promise<void>(resolve => { state.releaseHeldWrite = resolve; }); }
    if (state.failWrites[entity] > 0) { state.failWrites[entity]--; return route.fulfill({ status: 503, json: { message: 'Synthetic QA save failure' } }); }
    if (request.method() === 'DELETE') { state.db[entity] = rows.filter(row => row.id !== id); return route.fulfill({ json: { success: true } }); }
    const row = id ? rows.find(row => row.id === id)! : { id: `qa-${entity}-${state.writes.length}`, created_by: 'test@example.com', created_date: new Date().toISOString() };
    Object.assign(row, data); if (!id) rows.push(row);
    return route.fulfill({ json: row });
  });
  const sample = (schema: any, key = ''): any => {
    if (schema?.enum) return schema.enum[0];
    if (schema?.type === 'array') return Array.from({ length: schema.minItems || 1 }, () => sample(schema.items));
    if (schema?.type === 'object' || schema?.properties) return Object.fromEntries(Object.entries(schema.properties || {}).map(([name,value]) => [name,sample(value,name)]));
    if (schema?.type === 'number' || schema?.type === 'integer') return 1;
    if (schema?.type === 'boolean') return false;
    if (key === 'id') return 'catastrophizing';
    if (key === 'category_id') return 'breathing';
    const text='QA sample content';
    return state.longAi ? (text+' ').repeat(10).slice(0,Math.min(schema?.maxLength||120,120)).trim() : text;
  };
  await page.route('**/integration-endpoints/Core/InvokeLLM**', async route => {
    state.aiCalls++;
    if(state.holdNextAi){state.holdNextAi=false;await new Promise<void>(resolve=>{state.releaseAi=resolve;});}
    if (state.failAi) return route.fulfill({ status: 503, json: { message: 'Synthetic QA AI failure' } });
    const result=sample(route.request().postDataJSON().response_json_schema);
    if(result?.prompts)result.prompts=result.prompts.map((item:any,index:number)=>({...item,title:`QA prompt ${index+1}`,prompt:`QA prompt body ${index+1}`}));
    return route.fulfill({ json: result });
  });
  await page.route('**/integration-endpoints/Core/UploadFile**',async route=>{
    if(state.holdNextUpload){state.holdNextUpload=false;await new Promise<void>(resolve=>{state.releaseUpload=resolve;});}
    const audio=route.request().postDataBuffer()?.includes(Buffer.from('audio/wav'));
    const file_url=audio?'data:audio/wav;base64,'+audioBytes.toString('base64'):'/art/botanical/garden-path-v2.webp';
    state.uploads.push(audio?'audio':'image');return route.fulfill({json:{file_url}});
  });
  return state;
}

export async function journalDialogFits(page: Page) {
  const dialog = page.getByRole('dialog');
  await expect(dialog).toHaveCount(1);
  await expect.poll(() => dialog.evaluate(el => el.contains(document.activeElement))).toBe(true);
  const card = dialog.locator('[data-ui="card"]').first();
  const bounds = await card.boundingBox(), viewport = page.viewportSize()!;
  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(0); expect(bounds!.y).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width + 1);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport.height + 1);
  expect(await card.evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(2);
  // Quill uses Tab to indent selected text. Start keyboard navigation at a
  // control so this focus check does not edit the draft it is inspecting.
  await dialog.getByRole('button').first().focus();
  for (let index=0;index<6;index++) { await page.keyboard.press('Tab'); expect(await dialog.evaluate(el => el.contains(document.activeElement))).toBe(true); }
  return dialog;
}

export async function closeJournalDialog(page: Page, opener?: Locator) {
  await expect.poll(()=>page.getByRole('dialog').evaluate(el=>el.contains(document.activeElement))).toBe(true);
  await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).toHaveCount(0);
  if (opener) await expect(opener).toBeFocused();
}

export async function openJournalTemplate(page: Page, language: string, name: string) {
  await page.getByRole('button',{name:language==='he'?'תבניות':'Templates',exact:true}).click();
  const manager=page.getByRole('dialog');
  await manager.getByRole('heading',{name,exact:true}).locator('..').getByRole('button',{name:journalCopy(language).templates.use,exact:true}).click();
  await expect(page.getByRole('dialog').locator('.ql-editor')).toHaveCount(2);
  return page.getByRole('dialog');
}

export async function advanceJournalToSave(page: Page, language: string, prefix='QA', options: {rich?:boolean;onStep?:(step:number,dialog:Locator)=>Promise<void>} = {}) {
  const copy=journalCopy(language),dialog=page.getByRole('dialog');
  await dialog.locator('.ql-editor').nth(0).fill(prefix+' situation with a practical next step');
  await dialog.locator('.ql-editor').nth(1).fill(prefix+' automatic thought');
  if(options.rich){await dialog.locator('.ql-editor').nth(0).press('ControlOrMeta+A');await dialog.locator('[data-journal-field="situation"]').getByRole('button',{name:copy.form.format_bold,exact:true}).click();await expect(dialog.locator('[data-journal-field="situation"] strong')).toContainText(prefix);}
  await options.onStep?.(1,dialog);
  await dialog.getByRole('button',{name:copy.common.continue,exact:true}).click();
  await dialog.getByRole('button',{name:copy.taxonomy.emotions.anxious,exact:true}).click();
  await dialog.getByRole('slider').press('Home');await dialog.getByRole('slider').press('ArrowRight');
  await options.onStep?.(2,dialog);
  await dialog.getByRole('button',{name:copy.common.continue,exact:true}).click();
  await dialog.locator('.ql-editor').nth(0).fill(prefix+' evidence for');
  await dialog.locator('.ql-editor').nth(1).fill(prefix+' evidence against');
  await options.onStep?.(3,dialog);
  await dialog.getByRole('button',{name:copy.common.continue,exact:true}).click();
  await dialog.locator('.ql-editor').fill(prefix+' balanced perspective');
  await options.onStep?.(4,dialog);
  await dialog.getByRole('button',{name:copy.common.continue,exact:true}).click();
  await options.onStep?.(5,dialog);
  return dialog;
}
