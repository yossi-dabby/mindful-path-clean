import { test, expect } from '@playwright/test';
import { prepareJournalStage4, journalCopy, assertPathWidth, assertPathTextContrast } from '../helpers/journalStage4';

for(const language of ['en','he']) for(const width of [360,768,1440]){
  test(`Stage 4 many Journal records and tags ${language}/${width}`,async({page},info)=>{
    test.setTimeout(90000);page.setDefaultTimeout(20000);await page.setViewportSize({width,height:width===768?1024:844});
    const state=await prepareJournalStage4(page,{language,theme:width===360?'dark':'light'}),copy=journalCopy(language);
    const seed=state.db.ThoughtJournal[0],tags=Array.from({length:24},(_,index)=>'QA-tag-'+index+'-longtag'.repeat(6));
    seed.tags=tags;
    for(let index=0;index<34;index++)state.db.ThoughtJournal.push({...seed,id:'many-'+index,tags:['QA many'],situation:`<p>QA many record ${index}</p>`});
    await page.goto('/Journal');await expect(page.getByTestId('journal-entry-card')).toHaveCount(40);await assertPathWidth(page);
    const last=page.getByTestId('journal-entry-card').last();await last.scrollIntoViewIfNeeded();await expect(last).toBeInViewport();
    await page.getByTestId('journal-search').fill('QA many record 33');await expect(page.getByTestId('journal-entry-card')).toHaveCount(1);await expect(page.locator('[data-entry-id="many-33"]')).toBeVisible();
    await page.getByTestId('journal-search').fill('');await expect(page.getByTestId('journal-entry-card')).toHaveCount(40);
    await page.getByRole('button',{name:tags[23],exact:true}).click();await expect(page.getByTestId('journal-entry-card')).toHaveCount(1);
    await page.getByRole('button',{name:tags[0],exact:true}).click();await expect(page.getByTestId('journal-entry-card')).toHaveCount(1);
    const card=page.locator('[data-entry-id="journal-qa"]');await card.getByRole('button',{name:copy.cards.show_full,exact:true}).click();await expect(card.getByText(tags[23],{exact:true})).toBeVisible();
    await assertPathWidth(page);await page.screenshot({path:info.outputPath('journal-many-tags.png')});
    await page.getByRole('button',{name:language==='he'?'נקו סינון':'Clear Filters',exact:true}).click();await expect(page.getByTestId('journal-entry-card')).toHaveCount(40);
  });
  test(`Stage 4 full Journal record and AI results ${language}/${width}`,async({page},info)=>{
    test.setTimeout(120000);page.setDefaultTimeout(20000);
    await page.setViewportSize({width,height:width===768?1024:844});
    const state=await prepareJournalStage4(page,{language,theme:width===360?'dark':'light'}),copy=journalCopy(language);
    state.db.ThoughtJournal[0].tags.push('QA-'+ 'verylongtag'.repeat(14));
    await page.goto('/Journal');
    const card=page.locator('[data-entry-id="journal-qa"]');await expect(card).toBeVisible({timeout:20000});
    await card.getByRole('button',{name:copy.cards.show_full,exact:true}).click();
    await expect(card.getByRole('button',{name:copy.cards.show_less,exact:true})).toHaveAttribute('aria-expanded','true');
    const situation=card.locator('p').filter({hasText:'QA final situation words'}).last();
    expect.soft(await situation.evaluate(el=>el.scrollHeight<=el.clientHeight+1),'Full situation remains readable after expanding').toBe(true);
    await expect(card.locator('em').filter({hasText:'QA automatic thought'})).toBeVisible();
    await page.screenshot({path:info.outputPath('journal-full-record.png')});
    await assertPathWidth(page);
    await card.getByRole('button',{name:copy.cards.ai_analysis,exact:true}).click();
    const insights=card.getByTestId('journal-ai-reflections');
    await expect(insights.locator('dd')).toHaveCount(3);
    await insights.locator('dd').first().scrollIntoViewIfNeeded();
    await page.screenshot({path:info.outputPath('journal-ai-results.png')});
    for(const text of await insights.locator('dd').all())await assertPathTextContrast(text);
    await expect(insights.getByRole('link',{name:copy.ai.browse_exercises,exact:true})).toHaveAttribute('href','/Exercises');
    await expect(insights.getByRole('link',{name:copy.ai.view_goals,exact:true})).toHaveAttribute('href','/Goals');
    await insights.getByRole('button',{name:copy.ai.close_suggestions,exact:true}).click();
    await expect(insights).toHaveCount(0);
    const search=page.getByTestId('journal-search');await search.fill('QA partial reflection');
    await expect(page.getByTestId('journal-entry-card')).toHaveCount(1);
    await expect(page.locator('[data-entry-id="journal-partial"]')).not.toContainText(copy.cards.intensity.replace('{{before}}','0').replace('{{after}}','0'));
    await search.fill('no-results-qa-12345');await expect(page.getByTestId('journal-entry-card')).toHaveCount(0);
    await search.fill('');await expect(page.getByTestId('journal-entry-card')).toHaveCount(6);
    const types=page.getByRole('group',{name:language==='he'?'סוג':'Type',exact:true});
    await types.getByRole('button',{name:language==='he'?'הכרת תודה':'Gratitude',exact:true}).click();
    await expect(page.getByTestId('journal-entry-card')).toHaveCount(1);
    await expect(page.locator('[data-entry-id="journal-gratitude"]')).toBeVisible();
    await expect(page.getByTestId('session-summary-card')).toHaveCount(0);
  });
}
