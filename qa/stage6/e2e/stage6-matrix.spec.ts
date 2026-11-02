import {test,expect} from '@playwright/test';
import {prepareShared,inspect,routes,pageRoot} from '../helpers/sharedStage6';
for(const language of ['en','he'])for(const theme of ['light','dark'])for(const width of (process.env.STAGE6_BASELINE?[360]:[360,390,430,768,1024,1280,1440])){
 test(`Stage6 ${process.env.STAGE6_ADMIN?'admin ':''}pages ${language}/${theme}/${width}`,async({page})=>{
  test.setTimeout(240000);await page.setViewportSize({width,height:width===768?1024:width===1024?768:900});await prepareShared(page,language,theme,process.env.STAGE6_ADMIN?'admin':'user');
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  for(const route of (process.env.STAGE6_ADMIN?routes.slice(-3):process.env.STAGE6_SETTINGS_ONLY?['Settings']:process.env.STAGE6_ADMIN_BASELINE?routes.slice(-4):routes)){
   await page.goto('/'+route);const root=pageRoot(page,route);await expect(root).toBeVisible();
   if(route==='Settings')await expect(page.getByTestId('settings-hero')).toBeVisible();else await expect(root.locator('h1,h2').filter({visible:true}).first()).toBeVisible();
   const metrics=await inspect(page,root,`page-${route.includes('?')?'reset-password-token':route}-${language}-${theme}-${width}`);
   expect(metrics.appScroll,route+' content width').toBeLessThanOrEqual(metrics.appWidth+2);expect(metrics.direction).toBe(language==='he'?'rtl':'ltr');
   expect(errors,route+' uncaught errors').toEqual([]);
  }
 });
}
