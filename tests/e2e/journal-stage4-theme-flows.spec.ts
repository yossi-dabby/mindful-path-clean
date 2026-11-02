import {test,expect} from '@playwright/test';
import {prepareJournalStage4,journalCopy,openJournalTemplate,advanceJournalToSave,journalDialogFits,closeJournalDialog,assertPathTextContrast,assertPathWidth} from '../helpers/journalStage4';

// Complement the functional suites: light phone and dark tablet/desktop.
// Every shared form/result surface is exercised in both modes at each size.
for(const language of ['en','he'])for(const width of [360,768,1440]){
  test(`Stage 4 Journal complementary form and result themes ${language}/${width}`,async({page},info)=>{
    test.setTimeout(180000);page.setDefaultTimeout(20000);
    await page.setViewportSize({width,height:width===768?1024:844});
    await prepareJournalStage4(page,{language,theme:width===360?'light':'dark'});
    const c=journalCopy(language);
    await page.goto('/Journal');await expect(page.getByTestId('journal-entry-card')).toHaveCount(6);
    const form=await openJournalTemplate(page,language,c.templates.default.cbt.name);
    await advanceJournalToSave(page,language,'QA complementary theme',{onStep:async(step,dialog)=>{
      await journalDialogFits(page);
      if(step===2)await assertPathTextContrast(dialog.getByRole('button',{name:c.taxonomy.emotions.anxious,exact:true}));
      if(step===3){
        await dialog.getByRole('button',{name:c.form.analyze_thoughts,exact:true}).click();
        const analysis=dialog.locator('[aria-labelledby="distortion-analysis-title"]');
        await expect(analysis.getByRole('heading',{name:c.ai.balanced_perspective,exact:true})).toBeVisible();
        for(const text of await analysis.locator('p').all())await assertPathTextContrast(text);
      }
      if(step===5){
        await dialog.getByRole('button',{name:c.form.analyze_entry,exact:true}).click();
        await expect(dialog.getByRole('heading',{name:c.form.sentiment,exact:true})).toBeVisible();
        for(const text of await dialog.locator('p').filter({hasText:'QA sample content'}).all())await assertPathTextContrast(text);
      }
      await page.screenshot({path:info.outputPath(`journal-complementary-step-${step}.png`)});
    }});
    await form.getByRole('button',{name:c.form.save_entry,exact:true}).click();
    const results=form.getByTestId('journal-ai-reflections');await expect(results).toBeVisible();
    for(const text of await results.locator('dd').all())await assertPathTextContrast(text);
    await closeJournalDialog(page);

    const reminders=page.getByRole('button',{name:language==='he'?'תזכורות':'Reminders',exact:true});
    await reminders.click();let dialog=await journalDialogFits(page);
    await dialog.getByRole('button',{name:c.reminders.create,exact:true}).click();
    await assertPathTextContrast(dialog.getByLabel(c.reminders.title_label,{exact:true}));
    await dialog.getByRole('button',{name:c.reminders.frequency,exact:true}).click();
    const chooser=page.getByTestId('bottom-sheet-select-options');await expect(chooser).toBeVisible();
    await assertPathTextContrast(chooser.getByRole('option',{name:c.reminders.weekly,exact:true}));
    await chooser.getByRole('option',{name:c.reminders.weekly,exact:true}).click();
    await expect(chooser).toBeHidden();
    await expect(dialog.getByRole('button',{name:c.reminders.frequency,exact:true})).toBeFocused();
    await closeJournalDialog(page,reminders);

    await page.getByRole('button',{name:language==='he'?'הנחיות AI':'AI Prompts',exact:true}).click();
    dialog=page.getByRole('dialog');await dialog.getByRole('button',{name:c.prompts.generate,exact:true}).click();
    const prompt=dialog.getByRole('heading',{name:'QA prompt 1',exact:true});await expect(prompt).toBeVisible();await assertPathTextContrast(prompt);
    await page.screenshot({path:info.outputPath('journal-complementary-prompts.png')});await closeJournalDialog(page);
    await page.getByRole('button',{name:language==='he'?'תובנות AI':'AI Insights',exact:true}).click();
    dialog=page.getByRole('dialog');await dialog.getByRole('button',{name:c.trends.generate,exact:true}).click();
    await expect(dialog.getByRole('heading',{name:c.trends.recommendations,exact:true})).toBeVisible();
    for(const text of await dialog.locator('p').filter({hasText:'QA sample content'}).all())await assertPathTextContrast(text);
    await journalDialogFits(page);await page.screenshot({path:info.outputPath('journal-complementary-trends.png')});
    await closeJournalDialog(page);await assertPathWidth(page);
  });
}
