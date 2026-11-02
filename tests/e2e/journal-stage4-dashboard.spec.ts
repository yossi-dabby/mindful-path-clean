import {test,expect} from '@playwright/test';
import {prepareJournalStage4,journalCopy,assertPathWidth,assertPathTextContrast} from '../helpers/journalStage4';
for(const language of ['en','he'])for(const width of [360,768,1440]){
  test(`Stage 4 Journal dashboard periods and missing ratings ${language}/${width}`,async({page},info)=>{
    test.setTimeout(90000);page.setDefaultTimeout(20000);await page.setViewportSize({width,height:width===768?1024:640});
    const state=await prepareJournalStage4(page,{language,theme:width===360?'dark':'light'}),c=journalCopy(language);
    await page.goto('/JournalDashboard');const dashboard=page.getByTestId('journal-dashboard');await expect(dashboard).toBeVisible();
    for(const [range,total,paired]of [['14',4,3],['30',4,3],['90',5,4],['all',6,5]] as const){
      const rangeButton=dashboard.getByRole('button',{name:c.dashboard['range_'+range],exact:true});await rangeButton.click();await expect(rangeButton).toHaveAttribute('aria-pressed','true');
      const stats=dashboard.locator('section').first().locator('bdi');
      await expect(stats).toHaveText([String(total),'7/10','-3',String(paired)]);
      for(const value of await stats.all()){await expect(value).toHaveAttribute('dir','ltr');await assertPathTextContrast(value);}
      await expect(dashboard.locator('.recharts-wrapper > .recharts-surface')).toHaveCount(3);
      for(const canvas of await dashboard.locator('.recharts-wrapper > .recharts-surface').all()){
        await canvas.scrollIntoViewIfNeeded();const bounds=(await canvas.boundingBox())!;expect(bounds.x).toBeGreaterThanOrEqual(0);expect(bounds.x+bounds.width).toBeLessThanOrEqual(width+1);
      }
      const patterns=dashboard.locator('.recharts-wrapper').last();await patterns.locator('.recharts-bar-rectangle').first().hover();
      const tooltip=patterns.locator('.recharts-tooltip-wrapper');await expect(tooltip).toBeVisible();
      const tooltipBox=(await tooltip.boundingBox())!;expect(tooltipBox.x).toBeGreaterThanOrEqual(0);expect(tooltipBox.x+tooltipBox.width).toBeLessThanOrEqual(width+1);
      await page.screenshot({path:info.outputPath('dashboard-range-'+range+'.png')});
      await info.attach('dashboard-overflow-'+range,{body:JSON.stringify(await dashboard.evaluate(root=>Array.from(root.querySelectorAll('*')).filter(el=>el.getBoundingClientRect().right>innerWidth+2).map(el=>({tag:el.tagName,class:el.getAttribute('class'),right:el.getBoundingClientRect().right,text:el.textContent?.slice(0,100)})))),contentType:'application/json'});
      await assertPathWidth(page);
    }
    await dashboard.getByRole('link',{name:c.dashboard.back,exact:true}).click();await expect(page.getByTestId('journal-page')).toBeVisible();
    state.db.ThoughtJournal=[];await page.goto('/JournalDashboard');await expect(page.getByRole('heading',{name:c.dashboard.empty_title,exact:true})).toBeVisible();
    await page.getByRole('button',{name:c.dashboard.go_journal,exact:true}).click();await expect(page.getByTestId('journal-page')).toBeVisible();
  });
}
