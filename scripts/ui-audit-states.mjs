import { wave3Batch3Translations } from '../src/components/i18n/wave3Batch3Translations.js';
// Extra visual states for scripts/audit-ui.mjs --states. All records are synthetic.
export async function auditStates(page, { capture, language, games }) {
  const isHe = language === 'he';
  const sample = isHe ? 'דוגמה לבדיקת הממשק בלבד' : 'Sample for UI review only';
  const today = new Date().toISOString().slice(0, 10);
  const fixtures = {
    Goal: [{ id: 'sample-goal', title: sample, description: sample, status: 'active', category: 'behavioral', progress: 35,
      target_date: '2026-12-31', created_date: '2026-10-01T12:00:00Z', milestones: [{ title: sample, completed: false }] }],
    ThoughtJournal: [{ id: 'sample-journal', entry_type: 'cbt', situation: sample, automatic_thoughts: sample,
      emotions: ['anxious'], cognitive_distortions: ['catastrophizing'], balanced_thought: sample,
      emotion_intensity: 5, created_date: today + 'T12:00:00Z', tags: ['sample'] }],
    MoodEntry: Array.from({ length: 8 }, (_, i) => ({ id: 'sample-mood-' + i,
      date: new Date(Date.now() - i * 86400000).toISOString().slice(0, 10), mood: 'good', mood_score: 6 + i % 3,
      energy_level: 6, anxiety_level: 3, stress_level: 3, emotions: ['calm'], activities: ['walking'], notes: sample })),
    HealthMetric: [{ id: 'sample-health', date: today, sleep_hours: 7, sleep_quality: 'good', steps: 6000,
      active_minutes: 30, heart_rate_avg: 72, heart_rate_resting: 62, water_intake: 2, source: 'manual' }],
    Playlist: [{ id: 'sample-playlist', name: sample, description: sample, video_count: 1 }],
    PlaylistVideo: [{ id: 'sample-link', playlist_id: 'sample-playlist', video_id: 'sample-video', position: 0 }],
    Video: [{ id: 'sample-video', title: sample, description: sample, duration_minutes: 4, video_url: '/sample-video.mp4' }],
    CoachingSession: [{ id: 'sample-session', title: sample, focus_area: 'general', status: 'active', stage: 'planning',
      created_date: today + 'T12:00:00Z', challenges: sample, messages: [], action_plan: [{ title: sample, completed: false }] }],
    ForumPost: [{ id: 'sample-post', title: sample, content: sample, category: 'general', author_name: 'Sample user',
      created_by: 'sample@example.invalid', created_date: today + 'T12:00:00Z', likes: [], comments_count: 0 }],
    CommunityGroup: [{ id: 'sample-group', name: sample, description: sample, category: 'general', member_count: 3, members: [] }],
    Exercise: [{ id: 'sample-exercise', title: sample, description: sample, category: 'grounding', difficulty: 'beginner',
      duration_minutes: 5, instructions: [sample, sample], benefits: [sample], tips: [sample], completed_count: 2 }],
    TrustedCBTChunk: [{ id: 'sample-chunk', title: sample, topic: 'grounding', content: sample,
      short_summary: sample, language, is_active: false, priority_score: 5, tags: ['sample'] }]
  };
  await page.route('**/api/**/entities/**', async route => {
    const match = new URL(route.request().url()).pathname.match(/\/entities\/([^/]+)/);
    if (route.request().method() === 'GET' && match && fixtures[match[1]]) return route.fulfill({ json: fixtures[match[1]] });
    return route.fallback();
  });
  const go = async route => {
    await page.goto('http://127.0.0.1:5173/' + route, { waitUntil: 'networkidle' });
    await page.locator('[aria-label="Loading application"]').waitFor({ state: 'hidden' });
  };
  const state = async (name, action) => {
    try { await action(); await capture(name); }
    catch (error) { await capture(name, error.message.split('\n')[0]); }
  };
  if (process.env.AUDIT_RECHECK_ONLY === '1') {
    for (const route of ['KnowledgeStudio','Coach','MoodTracker'].filter(route => !process.env.AUDIT_STATE_TARGETS || process.env.AUDIT_STATE_TARGETS.split(',').includes('populated-' + route))) await state('populated-' + route, async () => go(route));
    if (!process.env.AUDIT_STATE_TARGETS || process.env.AUDIT_STATE_TARGETS.split(',').includes('health-form')) await state('health-form', async () => {
      await go('Progress');
      await page.getByRole('tab').nth(5).click();
      await page.getByRole('button', { name: isHe ? /תיעוד נתוני בריאות/ : /Log health data/i }).click();
      await page.getByTestId('health-form-dialog').waitFor({ state: 'visible' });
    });
    return;
  }
  if (process.env.AUDIT_DETAILS_ONLY === '1' || process.env.AUDIT_ONBOARDING_ONLY === '1') {
    if (process.env.AUDIT_ONBOARDING_ONLY !== '1') {
    const copy = wave3Batch3Translations[language].goals.card;
    for (const key of ['chart', 'board', 'journal', 'ai_adjust', 'reminders', 'edit_aria']) {
      await state('goal-detail-' + key, async () => {
        await go('Goals');
        const name = ['chart','board','journal'].includes(key) ? `${copy.show} ${copy[key]}` : copy[key];
        await page.getByRole('button', { name, exact: true }).last().click();
      });
    }
    await state('journal-full-record', async () => {
      await go('Journal');
      await page.getByRole('button', { name: isHe ? 'הצג רשומה מלאה' : 'Show full record', exact: true }).click();
    });
    await state('journal-edit-record', async () => {
      await go('Journal');
      const more = page.getByRole('button', { name: isHe ? /עוד פעולות/ : /More actions/ }).last();
      if (await more.isVisible()) await more.click();
      await page.locator(isHe ? '[aria-label="עריכת רשומת יומן"]:visible' : '[aria-label="Edit journal entry"]:visible').last().click();
    });
    }
    await page.route('**/api/**', async route => {
      const url = route.request().url();
      if (url.includes('/entities/User/me') || url.endsWith('/auth/me')) return route.fulfill({ json: {
        id: 'audit-user', email: 'audit@example.invalid', full_name: sample, role: 'admin', onboarding_completed: false
      }});
      return route.fallback();
    });
    await go('Home');
    const wizard = page.getByTestId('onboarding-flow');
    await wizard.waitFor({ state: 'visible' });
    await capture('onboarding-step-1');
    for (let step = 1; step < 4; step++) {
      await state('onboarding-step-' + (step + 1), async () => {
        await wizard.locator('button[aria-pressed]').first().click();
        await wizard.getByRole('button', { name: isHe ? /המשך/ : /Continue/i }).click();
        const titles = isHe ? ['איך אתם מרגישים כרגע?', 'איזה סוג תמיכה מתאים לכם היום?', 'הצעד הראשון שלכם מוכן'] : ['How are you feeling right now?', 'What kind of support fits you today?', 'Your first step is ready'];
        const title = titles[step - 1];
        await wizard.getByRole('heading', { name: title, exact: true }).waitFor({ state: 'visible' });
        await page.waitForFunction(title => {
          let el = Array.from(document.querySelectorAll('[data-testid="onboarding-flow"] h1')).find(el => el.textContent === title);
          if (!el) return false;
          for (; el && el !== document.body; el = el.parentElement) if (Number(getComputedStyle(el).opacity) < 0.99) return false;
          return true;
        }, title);
      });
    }
    return;
  }
  for (const route of ['Goals', 'Journal', 'JournalDashboard', 'MoodTracker', 'Coach', 'CoachingAnalytics',
    'Playlists', 'PlaylistDetail?id=sample-playlist', 'ExerciseView?id=sample-exercise', 'KnowledgeStudio']) {
    await state('populated-' + route.split('?')[0], async () => go(route));
  }
  if (process.env.AUDIT_POPULATED_ONLY === '1') return;
  await go('Progress');
  const progressTabs = page.getByRole('tab');
  for (let i = 0; i < 6; i++) await state('progress-tab-' + i, async () => progressTabs.nth(i).click());
  await state('health-form', async () => {
    await page.getByRole('button', { name: isHe ? /תיעוד נתוני בריאות/ : /Log health data/i }).click();
    await page.getByTestId('health-form-dialog').waitFor({ state: 'visible' });
  });
  await go('MoodTracker');
  for (let i = 1; i < 3; i++) await state('mood-tab-' + i, async () => page.getByRole('tab').nth(i).click());
  await state('mood-form', async () => {
    await page.getByTestId('mood-log-button').click();
    await page.getByTestId('mood-entry-dialog').waitFor({ state: 'visible' });
  });
  for (const [label, name] of [ ['templates', isHe ? 'תבניות' : 'Templates'], ['reminders', isHe ? 'תזכורות' : 'Reminders'],
    ['insights', isHe ? 'תובנות AI' : 'AI Insights'], ['prompts', isHe ? 'הנחיות AI' : 'AI Prompts'] ]) {
    await go('Journal');
    await state('journal-' + label, async () => {
      await page.getByRole('button', { name, exact: true }).first().click();
      await page.getByRole('dialog').waitFor({ state: 'visible' });
    });
  }
  await go('GoalCoach');
  await state('goal-step-2', async () => {
    await page.getByTestId('goalcoach-category-behavioral-other').click();
    await page.getByTestId('goalcoach-next').click();
  });
  await state('goal-step-3', async () => {
    await page.getByTestId('goalcoach-title-input').fill(sample);
    await page.getByTestId('goalcoach-motivation-input').fill(sample);
    await page.getByTestId('goalcoach-next').click();
  });
  await state('goal-step-4', async () => page.getByTestId('goalcoach-next').click());
  await go('ThoughtCoach');
  await state('thought-step-2', async () => {
    await page.getByTestId('thoughtcoach-category-overthinking').click();
    await page.getByTestId('thoughtcoach-next').click();
  });
  await state('thought-step-3', async () => {
    await page.getByTestId('thoughtcoach-situation-input').fill(sample);
    await page.getByTestId('thoughtcoach-thoughts-input').fill(sample);
    await page.getByTestId('thoughtcoach-emotion-anxious').click();
    await page.getByTestId('thoughtcoach-next').click();
  });
  await state('thought-step-4', async () => {
    await page.getByTestId('thoughtcoach-balanced-input').fill(sample);
    await page.getByTestId('thoughtcoach-next').click();
  });
  await go('KnowledgeStudio');
  for (let i = 1; i < 4; i++) await state('knowledge-tab-' + i, async () => page.getByRole('tab').nth(i).click());
  await go('Settings');
  for (const id of ['profile', 'language', 'appearance', 'notifications', 'privacy', 'account']) {
    await state('settings-' + id, async () => page.locator('#settings-' + id).scrollIntoViewIfNeeded());
  }
  for (const game of games) {
    await state('game-interaction-' + game, async () => {
      await go('ExperientialGames?game=' + game);
      const dialog = page.getByTestId('mindgame-modal-' + game);
      await dialog.waitFor({ state: 'visible' });
      for (let step = 0; step < 3; step++) {
        for (const field of await dialog.locator('input:not([type="range"]),textarea').all()) {
          if (await field.isVisible() && await field.isEditable()) await field.fill(game === 'number-sequence' ? '12' : sample);
        }
        const candidates = dialog.getByRole('button').filter({ hasNotText: /Close|סגירה|Try Another|נסו שוב/i });
        let clicked = false;
        for (const button of await candidates.all()) {
          const label = await button.getAttribute('aria-label');
          if (!(await button.innerText()).trim()) continue;
          if (/close|סגירה|beginner|intermediate|advanced/i.test(label || '')) continue;
          if (await button.isVisible() && await button.isEnabled()) { await button.click(); clicked = true; break; }
        }
        if (!clicked) break;
      }
    });
  }
}
