import { test, expect } from '@playwright/test';
import { prepareJournalStage4, journalCopy, journalDialogFits, closeJournalDialog } from '../helpers/journalStage4';

for (const language of ['en','he']) for (const width of [360,768,1440]) {
  test(`Stage 4 Journal overlays contain focus ${language}/${width}`,async({page},info)=>{
    test.setTimeout(120000);
    page.setDefaultTimeout(20000);
    await page.setViewportSize({width,height:width===768?1024:640});
    await prepareJournalStage4(page,{language,theme:width===360?'dark':'light'});
    await page.goto('/Journal');
    const copy=journalCopy(language);
    await expect(page.getByTestId('journal-entry-card')).toHaveCount(6,{timeout:20000});
    const names=language==='he'?['תבניות','תזכורות','הנחיות AI','תובנות AI']:['Templates','Reminders','AI Prompts','AI Insights'];
    for(const name of names){
      const opener=page.getByRole('button',{name,exact:true});await opener.click();
      const dialog=await journalDialogFits(page);
      await page.screenshot({path:info.outputPath(`journal-${name}.png`)});
      if(name===names[1]){
        await dialog.getByRole('button',{name:copy.reminders.create,exact:true}).click();
        const frequency=dialog.getByRole('button',{name:copy.reminders.frequency,exact:true});
        await frequency.click();
        const chooser=page.getByTestId('bottom-sheet-select-options');await expect(chooser).toBeVisible();
        await expect.poll(()=>chooser.evaluate(el=>el.contains(document.activeElement))).toBe(true);
        await page.keyboard.press('Escape');await expect(chooser).toBeHidden();await expect(dialog).toBeVisible();
        await expect(frequency).toBeFocused();
        await frequency.press('Enter');await expect(chooser).toBeVisible();
        await chooser.getByRole('option',{name:copy.reminders.weekly,exact:true}).click();
        await expect(chooser).toBeHidden();await expect(frequency).toBeFocused();
        await frequency.press('Tab');
        expect(await dialog.evaluate(el=>el.contains(document.activeElement))).toBe(true);
      }
      await closeJournalDialog(page,opener);
    }
  });
}
