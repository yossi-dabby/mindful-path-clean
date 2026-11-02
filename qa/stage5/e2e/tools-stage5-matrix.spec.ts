import {test,expect} from '@playwright/test';
import {prepareTools,inspect,routes,rootFor} from '../helpers/toolsStage5';

for(const language of ['en','he'])for(const theme of ['light','dark'])for(const width of [360,390,430,768,1024,1280,1440]){
  test(`Stage5 page observations ${language}/${theme}/${width}`,async({page})=>{
    test.setTimeout(180000);
    await page.setViewportSize({width,height:width===768?1024:width===1024?768:900});
    await prepareTools(page,language,theme);
    for(const route of routes){
      await page.goto('/'+route);
      const root=rootFor(page,route);
      await expect(root).toBeVisible({timeout:20000});
      // Wait for actual route content, not the shell retained during lazy navigation.
      await expect(root.locator('h1,h2').filter({visible:true}).first()).toBeVisible({timeout:20000});
      if(route==='Videos')await expect(root.getByText(/Synthetic QA content|נתוני דוגמה בלבד/).first()).toBeVisible();
      if(route.startsWith('ExerciseView'))await expect(root.getByRole('tab').first()).toBeVisible();
      if(route.startsWith('PlaylistDetail'))await expect(root.getByText(/Synthetic QA content|נתוני דוגמה בלבד/).first()).toBeVisible();
      if(route==='ExperientialGames')await expect(page.getByTestId('mindgames-grid').getByTestId(/mindgame-card-/)).toHaveCount(29);
      if(route==='TherapeuticForms')await expect(page.getByTestId('forms-under-revision')).toBeVisible();
      await inspect(page,root,`page-${route.split('?')[0]}-${language}-${theme}-${width}`);
    }
  });
}
