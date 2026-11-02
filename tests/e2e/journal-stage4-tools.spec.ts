import {test,expect} from '@playwright/test';
import {prepareJournalStage4,journalCopy,journalCatalogNames,journalDialogFits,closeJournalDialog,assertPathTextContrast,assertPathWidth} from '../helpers/journalStage4';

const itemLabel=(pattern:string,item:string)=>pattern.replace('{{item}}',item);
for(const language of ['en','he'])for(const width of [360,768,1440]){
  test(`Stage 4 Journal templates reminders and AI tools ${language}/${width}`,async({page},info)=>{
    test.setTimeout(180000);page.setDefaultTimeout(15000);
    await page.setViewportSize({width,height:width===768?1024:640});
    const state=await prepareJournalStage4(page,{language,theme:width===360?'dark':'light'}),c=journalCopy(language);
    await page.goto('/Journal');await expect(page.getByTestId('journal-entry-card')).toHaveCount(6);
    const names=language==='he'?['תבניות','תזכורות','הנחיות AI','תובנות AI']:['Templates','Reminders','AI Prompts','AI Insights'];
    const open=async(index:number)=>{await page.getByRole('button',{name:names[index],exact:true}).click();return journalDialogFits(page);};
    let d=await open(0);
    for(const name of journalCatalogNames(language)){
      const heading=d.getByRole('heading',{name,exact:true});await heading.scrollIntoViewIfNeeded();await expect(heading).toBeInViewport();
    }
    await d.getByRole('button',{name:c.templates.create,exact:true}).click();
    await d.getByLabel(c.templates.name,{exact:true}).fill('QA new template');
    await d.getByLabel(c.templates.form_description,{exact:true}).fill('QA description '.repeat(30));
    state.failWrites.JournalTemplate=1;
    await d.getByRole('button',{name:c.common.create,exact:true}).click();
    await expect(d.getByRole('alert')).toContainText(c.templates.save_error);
    await expect(d.getByLabel(c.templates.name,{exact:true})).toHaveValue('QA new template');
    await d.getByRole('button',{name:c.common.create,exact:true}).click();
    const template=()=>d.getByRole('heading',{name:'QA new template',exact:true}).locator('..');
    await expect(template()).toBeVisible();
    await template().getByRole('button',{name:itemLabel(c.common.edit_aria,'QA new template'),exact:true}).click();
    await d.getByLabel(c.templates.form_description,{exact:true}).fill('QA edited description');
    await d.getByRole('button',{name:c.common.update,exact:true}).click();
    await expect(template()).toContainText('QA edited description');
    const removeTemplate=()=>template().getByRole('button',{name:itemLabel(c.common.delete_aria,c.templates.item),exact:true});
    const beforeDelete=state.writes.length;
    page.once('dialog',dialog=>dialog.dismiss());await removeTemplate().click();expect(state.writes).toHaveLength(beforeDelete);
    state.failWrites.JournalTemplate=1;page.once('dialog',dialog=>dialog.accept());await removeTemplate().click();
    await expect(d.getByRole('alert')).toContainText(c.templates.delete_error);await expect(template()).toBeVisible();
    page.once('dialog',dialog=>dialog.accept());await removeTemplate().click();await expect(template()).toHaveCount(0);
    await closeJournalDialog(page,page.getByRole('button',{name:names[0],exact:true}));

    d=await open(1);await d.getByRole('button',{name:c.reminders.create,exact:true}).click();
    await d.getByLabel(c.reminders.title_label,{exact:true}).fill('QA new reminder');
    await d.getByRole('button',{name:c.reminders.type,exact:true}).click();
    await page.getByTestId('bottom-sheet-select-options').getByRole('option').nth(2).click();
    await d.getByRole('button',{name:c.reminders.frequency,exact:true}).click();
    await page.getByTestId('bottom-sheet-select-options').getByRole('option',{name:c.reminders.weekly,exact:true}).click();
    await d.getByLabel(c.reminders.time,{exact:true}).fill('21:30');
    await d.getByLabel(c.reminders.message,{exact:true}).fill('QA long reminder message '.repeat(12));
    state.failWrites.JournalReminder=1;await d.getByRole('button',{name:c.common.create,exact:true}).click();
    await expect(d.getByRole('alert')).toContainText(c.reminders.save_error);
    await d.getByRole('button',{name:c.common.create,exact:true}).click();
    const reminder=()=>d.getByRole('heading',{name:'QA new reminder',exact:true}).locator('xpath=ancestor::*[@data-ui="card"][1]');
    await expect(reminder()).toBeVisible();
    expect(state.db.JournalReminder.find(row=>row.title==='QA new reminder')).toMatchObject({frequency:'weekly',time:'21:30',entry_type:'gratitude'});
    state.failWrites.JournalReminder=1;await reminder().getByRole('switch').click();
    await expect(d.getByRole('alert')).toContainText(c.reminders.action_error);await expect(reminder().getByRole('switch')).toBeChecked();
    await reminder().getByRole('switch').click();await expect(reminder().getByRole('switch')).not.toBeChecked();
    await reminder().getByRole('button',{name:itemLabel(c.common.edit_aria,c.reminders.item),exact:true}).click();
    await d.getByLabel(c.reminders.message,{exact:true}).fill('QA edited reminder');
    await d.getByRole('button',{name:c.common.update,exact:true}).click();await expect(reminder()).toContainText('QA edited reminder');
    await page.screenshot({path:info.outputPath('journal-reminders-updated.png')});
    page.once('dialog',dialog=>dialog.dismiss());await reminder().getByRole('button',{name:itemLabel(c.common.delete_aria,c.reminders.item),exact:true}).click();
    await expect(reminder()).toBeVisible();
    page.once('dialog',dialog=>dialog.accept());await reminder().getByRole('button',{name:itemLabel(c.common.delete_aria,c.reminders.item),exact:true}).click();await expect(reminder()).toHaveCount(0);
    await closeJournalDialog(page,page.getByRole('button',{name:names[1],exact:true}));

    d=await open(2);state.failAi=true;await d.getByRole('button',{name:c.prompts.generate,exact:true}).click();
    await expect(d.getByRole('alert')).toContainText(c.prompts.error);state.failAi=false;
    await d.getByRole('button',{name:c.common.retry,exact:true}).click();await expect(d.locator('button').filter({has:page.getByRole('heading',{name:/QA prompt/})})).toHaveCount(4);
    await d.getByRole('button',{name:c.prompts.refresh,exact:true}).click();await expect(d.getByRole('heading',{name:'QA prompt 4',exact:true})).toBeVisible();
    await page.screenshot({path:info.outputPath('journal-prompts-results.png')});
    await d.getByRole('heading',{name:'QA prompt 1',exact:true}).click();
    await expect(page.getByRole('dialog').getByRole('textbox',{name:c.form.situation_label,exact:true})).toContainText('QA prompt body 1');
    await closeJournalDialog(page,page.getByRole('button',{name:names[2],exact:true}));

    d=await open(3);
    for(const days of ['7','30','90']){const button=d.getByRole('button',{name:c.trends.last_days.replace('{{days}}',days),exact:true});await button.click();await expect(button).toHaveAttribute('aria-pressed','true');}
    state.failAi=true;await d.getByRole('button',{name:c.trends.generate,exact:true}).click();await expect(d.getByRole('alert')).toContainText(c.trends.error);
    state.failAi=false;state.longAi=true;await d.getByRole('button',{name:c.common.retry,exact:true}).click();
    for(const key of ['overview','key_themes','emotional_patterns','cognitive_patterns','notable','recommendations']){
      const heading=d.getByRole('heading',{name:c.trends[key],exact:true});await heading.scrollIntoViewIfNeeded();await expect(heading).toBeInViewport();await assertPathTextContrast(heading);
    }
    await page.screenshot({path:info.outputPath('journal-trends-results.png')});await journalDialogFits(page);
    await closeJournalDialog(page,page.getByRole('button',{name:names[3],exact:true}));await assertPathWidth(page);
  });
}
