import { test, expect } from '@playwright/test';
import { prepareJournalStage4, assertPathWidth, assertPathTextContrast, journalCopy } from '../helpers/journalStage4';

for (const language of ['en','he']) for (const theme of ['light','dark']) for (const width of [360,390,430,768,1024,1280,1440]) {
  test(`Stage 4 Journal page matrix ${language}/${theme}/${width}`, async ({ page }, info) => {
    test.setTimeout(90000);
    await page.setViewportSize({width,height:width===768?1024:width===1024?768:844});
    await prepareJournalStage4(page,{language,theme});
    for (const route of ['Journal','JournalDashboard','ThoughtCoach']) {
      await page.goto('/'+route);
      const root=page.getByTestId(route==='Journal'?'journal-page':route==='JournalDashboard'?'journal-dashboard':'thoughtcoach-flow');
      await expect(root).toBeVisible({timeout:20000});
      if (route==='Journal') await expect(page.getByTestId('journal-entry-card')).toHaveCount(6);
      if (route==='JournalDashboard') await expect(root.locator('.recharts-wrapper')).toHaveCount(3);
      await assertPathWidth(page);
      await page.screenshot({path:info.outputPath(`${route}-${language}-${theme}-${width}.png`)});
      if (route==='JournalDashboard') {
        const widths=await root.locator('.recharts-wrapper').evaluateAll(charts=>charts.map(chart=>{const box=chart.getBoundingClientRect(),app=document.querySelector('#app-scroll-container')!.getBoundingClientRect();return box.left>=app.left-1&&box.right<=app.right+1;}));
        expect(widths.every(Boolean),'Every chart canvas fits its available app width').toBe(true);
      }
    }
  });
}

const palettes = { ocean:'91 161 170', sunset:'169 149 118', forest:'95 154 132', lavender:'137 146 180', minimal:'104 124 128' };
for(const language of ['en','he']) for(const mode of ['light','dark']) for(const [palette,primary] of Object.entries(palettes)) {
  test(`Stage 4 Journal additional theme ${language}/${mode}/${palette}`,async({page},info)=>{
    test.setTimeout(90000);
    const width=language==='he'?1024:390;
    await page.setViewportSize({width,height:768});
    await prepareJournalStage4(page,{language,theme:mode});
    await page.route(/\/entities\/User\/(?:me|test-user-123)(?:\?|$)/,route=>route.fulfill({json:{id:'test-user-123',email:'test@example.com',full_name:'QA User',role:'user',onboarding_completed:true,preferences:{theme:palette,language}}}));
    await page.goto('/Journal');
    await expect(page.getByTestId('journal-entry-card')).toHaveCount(6);
    await expect.poll(()=>page.locator('html').evaluate(el=>getComputedStyle(el).getPropertyValue('--color-primary').trim())).toBe(primary);
    for(const text of await page.getByTestId('journal-page').locator('h1, time').all()) await assertPathTextContrast(text);
    await page.getByRole('button',{name:language==='he'?'תבניות':'Templates',exact:true}).click();
    const dialog=page.getByRole('dialog');
    const use=dialog.getByRole('button',{name:journalCopy(language).templates.use,exact:true}).first();
    await expect(use).toBeVisible();await assertPathTextContrast(use);
    await assertPathWidth(page);
    await page.screenshot({path:info.outputPath(`journal-${palette}-${mode}.png`)});
  });
}
