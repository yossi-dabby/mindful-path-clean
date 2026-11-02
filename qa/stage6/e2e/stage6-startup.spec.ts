import {test,expect} from '@playwright/test';
import {prepareShared,inspect} from '../helpers/sharedStage6';
import {stage6UiCopy as copy} from '../../../src/components/i18n/stage6UiTranslations';
for(const language of ['en','he']){
 test(`Startup error retry and restricted account ${language}`,async({page})=>{
  await page.setViewportSize({width:360,height:740});await prepareShared(page,language,'dark');let fail=true;
  await page.route(/\/entities\/User\/(?:me|test-user-123)(?:\?|$)/,route=>fail?route.fulfill({status:503,json:{message:'Synthetic QA startup failure'}}):route.fallback());await page.goto('/Settings');const error=page.getByTestId('startup-error-screen');await expect(error.getByRole('heading',{level:1})).toHaveText(copy[language].startup_title);await inspect(page,error,`startup-error-${language}-dark-360`);fail=false;await error.getByRole('button',{name:copy[language].retry}).click();await expect(page.getByTestId('settings-hero')).toBeVisible();
  await page.route(/\/entities\/User\/(?:me|test-user-123)(?:\?|$)/,route=>route.fulfill({status:403,json:{message:'Synthetic QA restricted account',extra_data:{reason:'user_not_registered'}}}));await page.reload();await expect(page.getByRole('heading',{name:copy[language].restricted})).toBeVisible();await inspect(page,page.getByRole('main'),`restricted-${language}-dark-360`);
 });
}
