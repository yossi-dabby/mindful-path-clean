import {test,expect} from '@playwright/test';
import {prepareJournalStage4,journalCopy,assertPathTextContrast,closeJournalDialog} from '../helpers/journalStage4';

for(const language of ['en','he'])for(const width of [360,768,1440]){
  test(`Stage 4 Journal templates and reminders load retry ${language}/${width}`,async({page})=>{
    test.setTimeout(120000);await page.setViewportSize({width,height:width===768?1024:844});
    const state=await prepareJournalStage4(page,{language,theme:width===768?'light':'dark'}),c=journalCopy(language);
    state.holdNextRead='JournalTemplate';state.failReads.JournalTemplate=2;
    await page.goto('/Journal');await expect(page.getByTestId('journal-entry-card')).toHaveCount(6);
    for(const [entity,name]of [['JournalTemplate',language==='he'?'תבניות':'Templates'],['JournalReminder',language==='he'?'תזכורות':'Reminders']]){
      if(entity==='JournalReminder'){state.releaseRead=undefined;state.holdNextRead=entity;state.failReads[entity]=2;}
      const opener=page.getByRole('button',{name,exact:true});await opener.click();
      const dialog=page.getByRole('dialog');await expect.poll(()=>typeof state.releaseRead).toBe('function');
      try{await expect(dialog.getByRole('status')).toBeVisible();}finally{state.releaseRead?.();}
      await expect(dialog.getByRole('alert')).toContainText(c.common.load_error);await assertPathTextContrast(dialog.getByRole('alert'));
      await dialog.getByRole('button',{name:c.common.retry,exact:true}).click();await expect(dialog.getByRole('alert')).toHaveCount(0);
      if(entity==='JournalTemplate')await expect(dialog.getByRole('heading',{name:'QA personal template',exact:true})).toBeVisible();
      else await expect(dialog.getByRole('switch')).toBeChecked();
      await closeJournalDialog(page,opener);
    }
  });
  test(`Stage 4 Journal loading errors and summary retry ${language}/${width}`,async({page},info)=>{
    test.setTimeout(120000);
    await page.setViewportSize({width,height:width===768?1024:844});
    const state=await prepareJournalStage4(page,{language,theme:width===768?'light':'dark'}),c=journalCopy(language);
    state.holdNextRead='ThoughtJournal';state.failReads.ThoughtJournal=2;
    await page.goto('/Journal');
    const journal=page.getByTestId('journal-page');
    await expect.poll(()=>typeof state.releaseRead).toBe('function');
    try{
      await expect(journal.getByRole('status')).toBeVisible();
      await expect(page.getByTestId('journal-entry-card')).toHaveCount(0);
    }finally{state.releaseRead?.();}
    await expect(journal.getByRole('alert')).toContainText(c.main.load_error);
    await assertPathTextContrast(journal.getByRole('alert'));
    await page.screenshot({path:info.outputPath('journal-load-error.png')});
    await journal.getByRole('button',{name:c.common.retry,exact:true}).click();
    await expect(page.getByTestId('journal-entry-card')).toHaveCount(6);

    // Reload clears the successful list query so Dashboard exercises its own
    // loading and failure paths rather than rendering already cached records.
    state.releaseRead=undefined;state.holdNextRead='ThoughtJournal';state.failReads.ThoughtJournal=2;
    await page.goto('/JournalDashboard');
    const dashboard=page.getByTestId('journal-dashboard');
    await expect.poll(()=>typeof state.releaseRead).toBe('function');
    try{await expect(dashboard.getByRole('status')).toBeVisible();}finally{state.releaseRead?.();}
    await expect(dashboard.getByRole('alert')).toContainText(c.dashboard.load_error);
    await assertPathTextContrast(dashboard.getByRole('alert'));
    await dashboard.getByRole('button',{name:c.common.retry,exact:true}).click();
    await expect(dashboard.locator('.recharts-wrapper')).toHaveCount(3);
    await page.goto('/Journal');await expect(page.getByTestId('journal-entry-card')).toHaveCount(6);
    const card=page.locator('[data-entry-id="journal-qa"]');
    state.holdNextAi=true;state.failAi=true;
    await card.getByRole('button',{name:c.ai.regenerate,exact:true}).click();
    await expect.poll(()=>typeof state.releaseAi).toBe('function');
    try{
      const status=card.getByRole('status');await expect(status).toContainText(c.ai.loading_summary);
      await assertPathTextContrast(status);await page.screenshot({path:info.outputPath('journal-summary-loading.png')});
    }finally{state.releaseAi?.();}
    await expect(card.getByRole('alert')).toContainText(c.common.ai_error);
    await expect(card).toContainText('QA existing concise summary');
    await assertPathTextContrast(card.getByRole('alert'));
    state.failAi=false;await card.getByRole('button',{name:c.ai.regenerate,exact:true}).click();
    await expect(card.getByRole('alert')).toHaveCount(0);
    await expect(card).toContainText('QA sample content');
    expect(state.db.ThoughtJournal.find(row=>row.id==='journal-qa').ai_summary).toBe('QA sample content');


  });
}
