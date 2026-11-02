import {test,expect} from '@playwright/test';
import {prepareJournalStage4,assertPathWidth,assertPathTextContrast} from '../helpers/journalStage4';

for(const language of ['en','he'])for(const width of [360,768,1440]){
  test(`Stage 4 Thought Coach and Chat save into the Journal ${language}/${width}`,async({page},info)=>{
    test.setTimeout(120000);page.setDefaultTimeout(15000);await page.setViewportSize({width,height:width===768?1024:640});
    const state=await prepareJournalStage4(page,{language,theme:width===360?'dark':'light',populated:false});
    await page.goto('/ThoughtCoach');await page.getByTestId('thoughtcoach-category-fear-anxiety').click();await page.getByTestId('thoughtcoach-next').click();
    await page.getByTestId('thoughtcoach-situation-input').fill('QA coach situation '.repeat(30));await page.getByTestId('thoughtcoach-thoughts-input').fill('QA coach automatic thought');
    await page.getByTestId('thoughtcoach-emotion-anxious').click();
    await expect(async()=>{await assertPathTextContrast(page.getByTestId('thoughtcoach-emotion-anxious'));}).toPass({timeout:5000});
    await page.getByTestId('thoughtcoach-next').click();await page.getByTestId('thoughtcoach-balanced-input').fill('QA coach balanced perspective');
    await page.getByTestId('thoughtcoach-back').click();await expect(page.getByTestId('thoughtcoach-thoughts-input')).toHaveValue('QA coach automatic thought');
    await page.getByTestId('thoughtcoach-next').click();await expect(page.getByTestId('thoughtcoach-balanced-input')).toHaveValue('QA coach balanced perspective');
    await page.getByTestId('thoughtcoach-next').click();await page.screenshot({path:info.outputPath('thought-coach-confirmation.png')});await assertPathWidth(page);
    state.failWrites.ThoughtJournal=1;await page.getByTestId('thoughtcoach-save').click();await expect(page.getByRole('alert')).toBeVisible();await expect(page.getByTestId('thoughtcoach-step-4')).toBeVisible();
    await page.getByTestId('thoughtcoach-save').click();await expect(page).toHaveURL(/\/Home$/);await page.goto('/Journal');await expect(page.getByTestId('journal-entry-card')).toHaveCount(1);
    expect(state.db.ThoughtJournal[0].balanced_thought).toContain('QA coach balanced perspective');
    await page.getByRole('button',{name:language==='he'?'רשומה חדשה':'New Entry',exact:true}).first().click();await expect(page).toHaveURL(/\/Chat\?intent=thought_work$/);
    await page.route('**/functions/extractThoughtWorkData',route=>route.fulfill({json:{success:true,data:{situation:'QA chat saved situation',automatic_thoughts:'QA chat automatic thought',balanced_thought:'QA chat balanced perspective',homework:[]}}}));
    // Mount the actual save-offer component using the existing isolated Stage 2
    // fixture. This checks the save bridge, not a live agent's offer trigger.
    await page.evaluate(async()=>{const fixture=await import('/tests/fixtures/chat-stage2-preview.jsx');fixture.renderStage2Fixture('save');});
    const offer=page.getByTestId('chat-thought-save');await expect(offer).toBeVisible();state.failWrites.ThoughtJournal=1;
    await offer.getByRole('button').first().click();await expect(offer.getByRole('alert')).toBeVisible();
    await offer.getByRole('button').first().click();await expect(offer.getByRole('status')).toBeVisible();
    await expect.poll(()=>state.db.ThoughtJournal.length).toBe(2);await page.goto('/Journal');await expect(page.getByTestId('journal-entry-card')).toHaveCount(2);
    expect(state.db.ThoughtJournal[1]).toMatchObject({situation:'QA chat saved situation',balanced_thought:'QA chat balanced perspective',custom_fields:{conversation_id:'qa-only'}});await assertPathWidth(page);
  });
}
