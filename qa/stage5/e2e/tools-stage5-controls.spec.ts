import {test,expect} from '@playwright/test';
import {prepareTools,inspect} from '../helpers/toolsStage5';
import {translations} from '../../../src/components/i18n/translations';
import {BREATHING_EXERCISES} from '../../../src/components/exercises/breathingExercisesData';

test.use({hasTouch:true});

for(const language of ['en','he'])for(const theme of ['light','dark']){
test(`Stage5 breathing favorites resource filters and community actions ${language}/${theme}`,async({page})=>{
  test.setTimeout(180000);await page.setViewportSize({width:360,height:740});const state=await prepareTools(page,language,theme);const tr:any=translations[language].translation;
  state.db.Exercise[0].category='grounding';
  await page.goto('/Exercises');await page.getByPlaceholder(tr.exercises.search_placeholder).fill(state.db.Exercise[0].title);
  await page.locator('button[data-favorite="false"]').click();await expect(page.locator('button[data-favorite="true"]')).toBeVisible();
  await expect.poll(()=>state.db.UserExerciseProgress.some(p=>p.favorite)).toBe(true);
  await page.getByPlaceholder(tr.exercises.search_placeholder).fill('');await page.getByRole('tab').nth(1).click();
  const surface=page.getByTestId('interactive-breathing-surface');await expect(surface).toBeVisible();
  await expect(surface.getByRole('tab')).toHaveCount(BREATHING_EXERCISES.length);
  for(let i=0;i<BREATHING_EXERCISES.length;i++){await surface.getByRole('tab').nth(i).click();await expect(surface.getByRole('tab').nth(i)).toHaveAttribute('aria-selected','true');}
  await surface.getByRole('tab').first().click();await surface.locator('.breathing-session-sound').click();await surface.locator('.breathing-session-settings').click();
  await expect(surface.getByRole('slider')).toBeVisible();await surface.getByRole('slider').press('Home');
  for(const width of [360,768,1440]){await page.setViewportSize({width,height:width===768?1024:740});await inspect(page,surface,`breathing-settings-${language}-${theme}-${width}`);}
  await page.setViewportSize({width:360,height:740});await surface.locator('.breathing-session-settings').click();
  await page.clock.install();const play=surface.locator('.breathing-session-controls button').first();await play.tap();
  await page.clock.runFor(2000);await play.tap();await expect(play.locator('svg.lucide-play')).toBeVisible();await surface.locator('.breathing-session-controls button').last().tap();await expect(play).toBeEnabled();await play.tap();
  await page.clock.runFor(121000);await expect(surface).toBeHidden();await inspect(page,page.locator('#app-scroll-container'),`breathing-complete-${language}-${theme}`);
  const seed=state.db.Resource.find(r=>r.language===language);state.db.Resource.push({...seed,id:'qa-guide',title:'Synthetic QA guide',category:'depression',type:'guide'});
  await page.goto('/Resources');await expect(page.getByTestId('resource-card')).toHaveCount(2);
  const categories=page.getByTestId('category-chips').getByRole('button');await categories.nth(1).click();await expect(page.getByTestId('resource-card')).toHaveCount(1);
  await categories.nth(2).click();await expect(page.getByTestId('resource-card')).toHaveCount(1);
  const types=page.getByTestId('type-chips').getByRole('button');await types.nth(1).click();await expect(page.getByTestId('resource-card')).toHaveCount(0);
  await types.nth(2).click();await expect(page.getByTestId('resource-card')).toHaveCount(1);await inspect(page,page.locator('#app-scroll-container'),`resources-filtered-guide-${language}-${theme}`);
  let reacted=false;
  await page.route('**/functions/toggleCommunityReaction',r=>{reacted=!reacted;return r.fulfill({json:{reacted,count:reacted?1:0}});});
  await page.route('**/functions/joinCommunityGroup',r=>{state.db.GroupMembership.push({id:'qa-membership',group_id:'qa-group'});return r.fulfill({json:{member_count:1}});});
  await page.goto('/Community');const reaction=page.getByTestId('forum-post-qa-post').locator('button[aria-pressed]');await reaction.click();await expect(reaction).toBeEnabled();await expect(reaction).toHaveAttribute('aria-pressed','true');
  await reaction.click();await expect(reaction).toBeEnabled();await expect(reaction).toHaveAttribute('aria-pressed','false');
  await page.getByTestId('community-page').getByRole('tab').nth(1).click();const group=page.getByTestId('community-group-qa-group');const joinName=await group.getByRole('button').last().innerText();await group.getByRole('button').last().click();
  await expect.poll(()=>state.db.GroupMembership.length).toBe(1);await expect(group.getByRole('button',{name:joinName,exact:true})).toHaveCount(0);await inspect(page,group,`community-joined-${language}-${theme}`);
});}
