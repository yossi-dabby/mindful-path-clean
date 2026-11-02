import {test,expect,type Locator,type Page} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {prepareJournalStage4,journalCopy,advanceJournalToSave,closeJournalDialog,assertPathWidth} from '../helpers/journalStage4';

async function action(page:Page,card:Locator,width:number,language:string,label:string){
  if(width<768){await card.getByRole('button',{name:language==='he'?'עוד פעולות':'More actions',exact:true}).click();await page.getByRole('menuitem',{name:label,exact:true}).click();}
  else await card.getByRole('button',{name:label,exact:true}).click();
}
async function confirmAction(page:Page,accept:boolean,click:()=>Promise<void>){
  const handled=new Promise<void>(resolve=>page.once('dialog',async dialog=>{if(accept)await dialog.accept();else await dialog.dismiss();resolve();}));
  await click();await handled;
}
for(const language of ['en','he'])for(const width of [360,768,1440]){
  test(`Stage 4 Journal edit delete PDF and summary links ${language}/${width}`,async({page},info)=>{
    test.setTimeout(120000);page.setDefaultTimeout(15000);await page.setViewportSize({width,height:width===768?1024:640});
    const state=await prepareJournalStage4(page,{language,theme:width===360?'dark':'light'}),c=journalCopy(language);
    await page.goto('/Journal?entry=journal-qa');const card=page.locator('[data-entry-id="journal-qa"]');
    await expect(page.getByTestId('journal-entry-card')).toHaveCount(1);
    const edit=c.common.edit_aria.replace('{{item}}',c.cards.entry_item),remove=c.common.delete_aria.replace('{{item}}',c.cards.entry_item);
    await action(page,card,width,language,edit);
    await expect(page.getByRole('dialog').getByRole('textbox',{name:c.form.situation_label,exact:true})).toContainText('QA final situation words');
    const opener=width<768?card.getByRole('button',{name:language==='he'?'עוד פעולות':'More actions',exact:true}):card.getByRole('button',{name:edit,exact:true});
    await closeJournalDialog(page,opener);
    await action(page,card,width,language,edit);await advanceJournalToSave(page,language,'QA edited');
    await page.getByRole('dialog').getByRole('button',{name:c.common.back,exact:true}).click();
    await expect(page.getByRole('dialog').locator('.ql-editor')).toContainText('QA edited balanced perspective');
    await page.getByRole('dialog').getByRole('button',{name:c.common.continue,exact:true}).click();
    await page.getByRole('dialog').getByRole('button',{name:c.form.save_entry,exact:true}).click();await expect(page.getByRole('heading',{name:c.form.saved_title,exact:true})).toBeVisible();
    await closeJournalDialog(page,opener);await page.reload();
    await card.getByRole('button',{name:c.cards.show_full,exact:true}).click();await expect(card).toContainText('QA edited automatic thought');
    expect(state.db.ThoughtJournal.find(row=>row.id==='journal-qa').balanced_thought).toContain('QA edited balanced perspective');
    const downloadPromise=page.waitForEvent('download');await action(page,card,width,language,c.common.export_pdf);const download=await downloadPromise;
    const pdfPath=info.outputPath('journal-entry.pdf');await download.saveAs(pdfPath);const bytes=await readFile(pdfPath);expect(bytes.subarray(0,4).toString()).toBe('%PDF');expect(bytes.length).toBeGreaterThan(1000);
    const beforeDelete=state.writes.length;await confirmAction(page,false,()=>action(page,card,width,language,remove));expect(state.writes).toHaveLength(beforeDelete);
    state.failWrites.ThoughtJournal=1;await confirmAction(page,true,()=>action(page,card,width,language,remove));
    await expect(card.getByRole('alert')).toContainText(c.cards.delete_error);await expect(card).toBeVisible();
    await confirmAction(page,true,()=>action(page,card,width,language,remove));await expect(card).toHaveCount(0);
    await page.goto('/Journal?summary=summary-qa');const summary=page.getByTestId('session-summary-card');await expect(summary).toHaveCount(1);await expect(page.getByTestId('journal-entry-card')).toHaveCount(0);
    await expect(summary.locator('strong')).toContainText('formatted');await expect(summary.getByRole('link',{name:'QA journal resource',exact:true})).toHaveAttribute('href','https://example.com/qa');
    const summaryDownload=page.waitForEvent('download');await action(page,summary,width,language,c.common.export_pdf);const summaryPdf=await summaryDownload;
    const summaryPath=info.outputPath('journal-summary.pdf');await summaryPdf.saveAs(summaryPath);expect((await readFile(summaryPath)).subarray(0,4).toString()).toBe('%PDF');
    await page.getByRole('button',{name:language==='he'?'הצג את כל הרשומות':'View All Entries',exact:true}).click();await expect(page.getByTestId('journal-entry-card')).toHaveCount(5);
    await page.goBack();await expect(page).toHaveURL(/Journal\?summary=summary-qa$/);
    await expect(page.getByTestId('journal-entry-card')).toHaveCount(0);await expect(summary).toHaveCount(1);
    await page.goForward();await expect(page).toHaveURL(/Journal$/);await expect(page.getByTestId('journal-entry-card')).toHaveCount(5);
    await page.getByRole('button',{name:c.filters.session_summary,exact:true}).click();await expect(page.getByTestId('journal-entry-card')).toHaveCount(0);await expect(summary).toHaveCount(1);
    const deleteSummary=c.common.delete_aria.replace('{{item}}',c.cards.summary_item);
    state.failWrites.SessionSummary=1;await confirmAction(page,true,()=>action(page,summary,width,language,deleteSummary));
    await expect(page.getByText(c.cards.summary_delete_error,{exact:true})).toBeVisible();await expect(summary).toBeVisible();
    await confirmAction(page,true,()=>action(page,summary,width,language,deleteSummary));await expect(summary).toHaveCount(0);
    await assertPathWidth(page);
  });
}

// A focused route must remain authoritative even when history is traversed
// immediately after View All makes the full list visible.
for(const language of ['en','he']){
  test(`Journal focused routes survive rapid browser history ${language}`,async({page})=>{
    test.setTimeout(120000);
    const state=await prepareJournalStage4(page,{language,theme:'light'});
    const allCount=state.db.ThoughtJournal.length;
    const entries=page.getByTestId('journal-entry-card'),summaries=page.getByTestId('session-summary-card');
    for(const kind of ['entry','summary']){
      const id=kind==='entry'?'journal-qa':'summary-qa';
      await page.goto(`/Journal?${kind}=${id}`);
      await expect(entries).toHaveCount(kind==='entry'?1:0);
      await expect(summaries).toHaveCount(kind==='summary'?1:0);
      await page.getByRole('button',{name:language==='he'?'הצג את כל הרשומות':'View All Entries',exact:true}).click();
      await expect(entries).toHaveCount(allCount);
      for(let traversal=0;traversal<12;traversal++){
        await page.goBack();await expect(page).toHaveURL(new RegExp(`Journal\\?${kind}=${id}$`));
        await expect(entries).toHaveCount(kind==='entry'?1:0);
        await expect(summaries).toHaveCount(kind==='summary'?1:0);
        await page.goForward();await expect(page).toHaveURL(/Journal$/);
        await expect(entries).toHaveCount(allCount);await expect(summaries).toHaveCount(1);
      }
    }
  });
}
