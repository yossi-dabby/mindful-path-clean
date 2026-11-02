import { expect, type Page, type Locator } from '@playwright/test';
import { mockApi } from './ui';

export async function preparePathStage3(page: Page, { language = 'en', theme = 'light', populated = true, preservePreferencesOnReload = false } = {}) {
  await mockApi(page);
  await page.addInitScript(({ language, theme, preservePreferencesOnReload }) => {
    if(!preservePreferencesOnReload || !sessionStorage.getItem('qa-preferences-initialized')){
      localStorage.setItem('language', language);
      localStorage.setItem('i18nextLng', language);
      localStorage.setItem('theme', theme);
      sessionStorage.setItem('qa-preferences-initialized','true');
    }
    (window as any).__TEST_APP_ID__ = 'test-app-id';
    (window as any).__DISABLE_ANALYTICS__ = true;
  }, { language, theme, preservePreferencesOnReload });
  const today = new Date().toISOString().slice(0, 10);
  const title = language === 'he' ? 'מטרת בדיקה עם כותרת ארוכה במיוחד ותכנון צעדים קטנים להתקדמות יומיומית' : 'QA goal with an especially long title and small practical steps for everyday progress';
  const db: Record<string, any[]> = {
    GoalTemplate: [{ id: 'sleep_quality', title: 'Improve Sleep Quality', category: 'lifestyle', duration_weeks: 6, difficulty: 'beginner', is_popular: true }],
    Goal: populated ? [{ id: 'qa-active', title, description: title.repeat(2), category: 'emotional', status: 'active', target_date: today, created_date: today, progress: 50, milestones: [{ title, completed: false, due_date: today }, { title: 'QA completed step', completed: true }], obstacles: ['QA sample obstacle'], coping_strategies: ['QA sample strategy'], motivation: title }, { id: 'qa-complete', title: 'QA completed goal', status: 'completed', category: 'behavioral', progress: 100, milestones: [] }] : [],
    MoodEntry: populated ? Array.from({ length: 7 }, (_, i) => ({ id: `mood-${i}`, date: new Date(Date.now() - i * 86400000).toISOString().slice(0,10), mood: ['good','okay','low'][i % 3], mood_score: 6, energy_level: 5, stress_level: 4, sleep_quality: 6, emotions: ['calm'], triggers: ['work'], notes: 'QA sample only', created_by: 'test@example.com' })) : [],
    HealthMetric: populated ? [{ id: 'health-qa', date: today, sleep_hours: 7, steps: 6000, heart_rate_avg: 65 }, { id: 'health-partial', date: today, steps: 1000 }] : [],
    StarterPath: populated ? [{ id: 'starter-qa', current_day: 1, started_date: today, completed: false, day_exercises: {} }] : [],
    Journey: populated ? [{ id: 'journey-qa', language, title, description: title, duration_days: 2, category: 'anxiety', difficulty: 'beginner', is_active: true, outcomes: [title], steps: [{ day: 1, title, description: title, reflection_prompt: title, game_slug: 'thought-quiz' }, { day: 2, title: 'QA second step', description: title }] }] : [],
    UserJourneyProgress: [], ThoughtJournal: [], Exercise: [], GoalReminder: [], UserStreak: [], UserPoints: [], UserBadge: [], AppNotification: []
  };
  const writes: { entity: string; method: string; data: any }[] = [];
  const user = { id: 'test-user-123', email: 'test@example.com', full_name: 'QA User', role: 'user', onboarding_completed: true };
  await page.route(/\/entities\/User\/(?:me|test-user-123)(?:\?|$)/, async route => {
    if (route.request().method() !== 'GET') Object.assign(user, route.request().postDataJSON());
    return route.fulfill({ json: user });
  });
  const sample = (schema: any): any => {
    if (schema?.enum) return schema.enum[0];
    if (schema?.type === 'array') return [sample(schema.items)];
    if (schema?.type === 'object' || schema?.properties) return Object.fromEntries(Object.entries(schema.properties || {}).map(([key, value]) => [key, sample(value)]));
    if (schema?.type === 'number' || schema?.type === 'integer') return 1;
    if (schema?.type === 'boolean') return false;
    return 'QA sample content';
  };
  await page.route('**/integration-endpoints/Core/InvokeLLM**', async route => {
    const data = route.request().postDataJSON();
    const result = sample(data.response_json_schema);
    if (result?.goals) result.goals[0] = { ...result.goals[0], title: 'QA suggested goal', description: 'QA suggested description', category: 'emotional' };
    if (result?.action_plan) result.action_plan = [{ step: 'QA action title', description: 'QA action description', estimated_time: '2 min' }];
    return route.fulfill({ json: result });
  });
  await page.route(/\/api\/apps\/[^/]+\/entities\/[^/?]+(?:[/?]|$)/, async route => {
    const request = route.request();
    const match = new URL(request.url()).pathname.match(/\/entities\/([^/]+)(?:\/([^/]+))?/);
    if (!match || !(match[1] in db)) return route.fallback();
    const [, entity, id] = match;
    if (request.method() === 'GET') return route.fulfill({ json: id ? db[entity].find(x => x.id === id) || {} : db[entity] });
    const data = request.postDataJSON() || {};
    writes.push({ entity, method: request.method(), data });
    const row = id ? db[entity].find(x => x.id === id) || { id } : { id: `qa-${entity}-${writes.length}` };
    Object.assign(row, data);
    if (!id) db[entity].push(row);
    return route.fulfill({ json: row });
  });
  return { db, writes };
}

export async function assertPathWidth(page: Page) {
  const metrics = await page.locator('#app-scroll-container').evaluate(el => ({ width: el.clientWidth, content: el.scrollWidth }));
  expect(metrics.content, 'App content must fit without clipping horizontal overflow').toBeLessThanOrEqual(metrics.width + 2);
}

// Composite translucent theme surfaces before measuring normal-text contrast.
export async function assertPathTextContrast(locator: Locator) {
  const ratio = await locator.evaluate(el => {
    const rgba = (value: string) => (value.match(/[\d.]+/g) || []).map(Number);
    const over = (color: number[], background: number[]) => background.map((value, index) => color[index] * (color[3] ?? 1) + value * (1 - (color[3] ?? 1)));
    const layers: { color: number[]; stops: number[][] }[] = [];
    for (let node: Element | null = el; node; node = node.parentElement) {
      const style = getComputedStyle(node);
      layers.push({ color: rgba(style.backgroundColor), stops: (style.backgroundImage.match(/rgba?\([^)]+\)/g) || []).map(rgba) });
    }
    let backgrounds = [[255, 255, 255]];
    for (const layer of layers.reverse()) backgrounds = backgrounds.flatMap(background => {
      const base = over(layer.color, background);
      return layer.stops.length ? layer.stops.map(stop => over(stop, base)) : [base];
    });
    const text = rgba(getComputedStyle(el).color);
    const luminance = (color: number[]) => color.map(value => value / 255).map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4).reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
    return Math.min(...backgrounds.map(background => {
      const a = luminance(over(text, background)), b = luminance(background);
      return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    }));
  });
  expect(ratio, 'Result text must contrast its rendered theme surface').toBeGreaterThanOrEqual(4.5);
}
