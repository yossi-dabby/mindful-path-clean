import { test, expect } from '@playwright/test';
import { prepareJournalStage4, journalCopy, openJournalTemplate, advanceJournalToSave, closeJournalDialog, journalDialogFits, journalImageFile, journalAudioFile, assertPathTextContrast, assertPathWidth } from '../helpers/journalStage4';

for(const language of ['en','he'])for(const width of [360,768,1440]){
  test(`Stage 4 creates every Journal type with rich text and attachments ${language}/${width}`,async({page},info)=>{
    test.setTimeout(180000);page.setDefaultTimeout(20000);
    await page.setViewportSize({width,height:width===768?1024:640});
    const state=await prepareJournalStage4(page,{language,theme:width===360?'dark':'light',populated:false}),copy=journalCopy(language);
    await page.goto('/Journal');await expect(page.getByTestId('journal-page')).toBeVisible({timeout:20000});
    const types=[['cbt_standard',copy.templates.default.cbt.name],['gratitude',copy.templates.default.gratitude.name],['anxiety_log',copy.templates.default.anxiety.name],['mood_journal',copy.templates.default.mood.name],['custom','QA personal template']];
    for(const [type,name]of types){
      const form=await openJournalTemplate(page,language,name);
      await expect(form.getByRole('textbox',{name:copy.form.situation_label,exact:true})).toBeVisible();
      if(language==='he')await expect(form.locator('.ql-editor').first()).toHaveCSS('direction','rtl');
      await advanceJournalToSave(page,language,'QA '+type,{rich:type==='cbt_standard',onStep:type==='cbt_standard'?async(step,dialog)=>{
        await expect(page.getByTestId('journal-record-content')).toHaveAttribute('data-step',String(step));
        await journalDialogFits(page);
        if(step===1){
          for(const toolbar of await dialog.locator('.ql-toolbar').all())for(const button of await toolbar.getByRole('button').all()){
            await expect(button).toHaveAttribute('aria-label',/.+/);
            expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
          }
        }
        if(step===3){
          await dialog.getByRole('button',{name:copy.form.analyze_thoughts,exact:true}).click();
          const analysis=dialog.locator('[aria-labelledby="distortion-analysis-title"]');
          await expect(analysis.getByRole('heading',{name:copy.ai.balanced_perspective,exact:true})).toBeVisible();
          await assertPathTextContrast(analysis.getByRole('heading',{name:copy.ai.balanced_perspective,exact:true}));
          await page.screenshot({path:info.outputPath('cbt-pattern-analysis.png')});
          await analysis.getByRole('button',{name:copy.ai.apply,exact:true}).click();
          await expect(dialog.getByRole('button',{name:copy.taxonomy.distortions.catastrophizing,exact:true})).toHaveAttribute('aria-pressed','true');
        }
        if(step===5){
          state.failAi=true;await dialog.getByRole('button',{name:copy.form.analyze_entry,exact:true}).click();
          await expect.soft(dialog.getByRole('alert')).toContainText(copy.common.ai_error);
          state.failAi=false;await dialog.getByRole('button',{name:copy.form.analyze_entry,exact:true}).click();
          await expect(dialog.getByRole('heading',{name:copy.form.sentiment,exact:true})).toBeVisible();
          await assertPathTextContrast(dialog.getByRole('heading',{name:copy.form.sentiment,exact:true}));
          await dialog.getByRole('button',{name:copy.form.link_goal,exact:true}).click();
          await page.getByTestId('bottom-sheet-select-options').getByRole('option').nth(1).click();
          const tag=dialog.getByLabel(copy.form.tags,{exact:true});
          await tag.fill('QA-tag-'+ 'longtag'.repeat(20));await tag.press('Enter');
          await dialog.locator('#image-upload').setInputFiles({name:'qa-invalid.txt',mimeType:'text/plain',buffer:Buffer.from('Synthetic QA invalid image')});
          await expect(dialog.getByRole('alert')).toContainText(copy.form.invalid_image);
          state.holdNextUpload=true;await dialog.locator('#image-upload').setInputFiles(journalImageFile);
          await expect.poll(()=>typeof state.releaseUpload).toBe('function');
          try{await expect(dialog.getByRole('button',{name:copy.form.save_entry,exact:true})).toBeDisabled();}finally{state.releaseUpload?.();}
          const images=dialog.getByTestId('journal-image-attachments');await expect(images.locator('img')).toHaveCount(1);
          const remove=images.getByRole('button');
          const imageBox=(await images.locator('img').boundingBox())!,removeBox=(await remove.boundingBox())!;
          expect(removeBox.y).toBeGreaterThanOrEqual(imageBox.y+imageBox.height);
          await remove.click();await expect(images).toHaveCount(0);
          await dialog.locator('#image-upload').setInputFiles(journalImageFile);
          await expect(images.locator('img')).toHaveCount(1);
          await dialog.locator('#audio-upload').setInputFiles(journalAudioFile);
          await expect(dialog.getByTestId('journal-audio-attachments').locator('audio')).toHaveCount(1);
          await expect.poll(()=>dialog.locator('audio').evaluate((el:HTMLAudioElement)=>el.duration)).toBeGreaterThan(0);
          await page.setViewportSize({width,height:width===768?700:420});
          const save=dialog.getByRole('button',{name:copy.form.save_entry,exact:true});await save.scrollIntoViewIfNeeded();
          await expect(save).toBeInViewport({ratio:1});
          expect(await page.getByTestId('journal-record-content').evaluate(el=>el.scrollWidth-el.clientWidth)).toBeLessThanOrEqual(2);
          await page.setViewportSize({width,height:width===768?1024:640});
        }
        await page.screenshot({path:info.outputPath(`cbt-step-${step}.png`)});
      }:undefined});
      await form.getByRole('button',{name:copy.form.save_entry,exact:true}).click();
      await expect(form.getByRole('heading',{name:copy.form.saved_title,exact:true})).toBeVisible();
      await expect(form.getByTestId('journal-ai-reflections')).toBeVisible();
      const record=state.db.ThoughtJournal.find(row=>row.entry_type===type);
      expect(record).toBeTruthy();expect(record.automatic_thoughts).toContain('QA '+type);
      expect(record.balanced_thought).toContain('balanced perspective');
      if(type==='cbt_standard'){
        expect(record.situation).toContain('<strong>');expect(record.linked_goal_id).toBe('qa-active');
        expect(record.tags).toHaveLength(1);expect(record.images).toHaveLength(1);expect(record.audio_notes).toHaveLength(1);
        expect(record.cognitive_distortions).toContain('Catastrophizing');
      }
      await closeJournalDialog(page,page.getByRole('button',{name:language==='he'?'תבניות':'Templates',exact:true}));await assertPathWidth(page);
    }
    await openJournalTemplate(page,language,copy.templates.default.cbt.name);
    await page.getByRole('dialog').locator('.ql-editor').first().fill('QA canceled draft');
    await closeJournalDialog(page);await page.reload();
    await expect(page.getByTestId('journal-entry-card')).toHaveCount(5);
    expect(state.writes.filter(write=>write.entity==='ThoughtJournal'&&write.method==='POST')).toHaveLength(5);
  });
}
