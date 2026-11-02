import { test, expect } from '@playwright/test';
import { prepareJournalStage4, journalCopy, openJournalTemplate, advanceJournalToSave, closeJournalDialog } from '../helpers/journalStage4';

for(const language of ['en','he']) for(const width of [360,768,1440]){
  test(`Stage 4 pending and failed Journal save remains retryable ${language}/${width}`,async({page})=>{
    test.setTimeout(90000);page.setDefaultTimeout(20000);
    await page.setViewportSize({width,height:width===768?1024:640});
    const state=await prepareJournalStage4(page,{language,theme:width===360?'dark':'light',populated:false}),copy=journalCopy(language);
    await page.goto('/Journal');await expect(page.getByTestId('journal-page')).toBeVisible({timeout:20000});
    await openJournalTemplate(page,language,copy.templates.default.cbt.name);
    const dialog=await advanceJournalToSave(page,language);
    state.holdNextWrite='ThoughtJournal';state.failWrites.ThoughtJournal=1;
    const save=dialog.getByRole('button',{name:copy.form.save_entry,exact:true});await save.click();
    await expect.poll(()=>typeof state.releaseHeldWrite).toBe('function');
    try{
      await expect(dialog.getByRole('heading',{name:copy.form.saved_title,exact:true})).toHaveCount(0);
      await expect(dialog.getByRole('button',{name:copy.common.saving,exact:true})).toBeDisabled();
      expect(state.db.ThoughtJournal).toHaveLength(0);expect(state.aiCalls).toBe(0);
    }finally{state.releaseHeldWrite?.();}
    await expect(dialog.getByText(copy.form.save_error,{exact:true})).toBeVisible();
    await dialog.getByRole('button',{name:copy.common.back,exact:true}).click();
    await expect(dialog.locator('.ql-editor')).toHaveText('QA balanced perspective');
    await dialog.getByRole('button',{name:copy.common.continue,exact:true}).click();
    await dialog.getByRole('button',{name:copy.form.save_entry,exact:true}).click();
    await expect(dialog.getByRole('heading',{name:copy.form.saved_title,exact:true})).toBeVisible();
    expect(state.db.ThoughtJournal).toHaveLength(1);
    expect(state.db.ThoughtJournal[0]).toMatchObject({entry_type:'cbt_standard',emotion_intensity:2});
    expect(state.db.ThoughtJournal[0].balanced_thought).toContain('QA balanced perspective');
    expect(state.writes.filter(write=>write.entity==='ThoughtJournal'&&write.method==='POST')).toHaveLength(2);
    await closeJournalDialog(page);await page.reload();
    await expect(page.getByTestId('journal-entry-card')).toHaveCount(1);
  });
}
