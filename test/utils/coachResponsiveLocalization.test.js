import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { applyCoachUiTranslations } from '../../src/components/i18n/coachUiTranslations.js';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const languages = ['en', 'he', 'es', 'fr', 'de', 'it', 'pt'];

describe('Coach production UX safeguards', () => {
  it('installs the complete Coach UI pack for all seven supported languages', () => {
    const translations = Object.fromEntries(
      languages.map((language) => [language, { translation: { coach: { title: language } } }])
    );

    applyCoachUiTranslations(translations);

    for (const language of languages) {
      const coach = translations[language].translation.coach;
      expect(coach.title).toBe(language);
      expect(coach.welcome.title).toBeTruthy();
      expect(coach.wizard.start).toBeTruthy();
      expect(coach.chat.placeholder).toBeTruthy();
      expect(coach.action_plan.update_error).toBeTruthy();
      expect(coach.insights.refresh).toBeTruthy();
      expect(coach.focus.mood_improvement.label).toBeTruthy();
      expect(coach.stage.completed).toBeTruthy();
    }
  });

  it('applies the Coach pack during i18n bootstrap', () => {
    const source = read('src/components/i18n/i18nConfig.jsx');
    expect(source).toContain("import { applyCoachUiTranslations } from './coachUiTranslations'");
    expect(source).toContain('applyCoachUiTranslations(translations)');
  });

  it('does not leave the previous English-only Coach interface copy', () => {
    const files = [
      'src/pages/Coach.jsx',
      'src/components/coaching/CoachingSessionList.jsx',
      'src/components/coaching/CoachingSessionWizard.jsx',
      'src/components/coaching/CoachingChat.jsx',
      'src/components/coaching/ActionPlanPanel.jsx',
      'src/components/coaching/PersonalizedInsights.jsx',
    ].map(read).join('\n');

    for (const legacy of [
      'Welcome to AI Coaching!',
      'No sessions yet',
      'Start New Session</h1>',
      'Back to Sessions',
      'Quick prompts:</p>',
      'Action Plan</CardTitle>',
      'Refresh Insights',
    ]) {
      expect(files).not.toContain(legacy);
    }
  });

  it('persists the canonical discovery stage for newly created sessions', () => {
    const source = read('src/components/coaching/CoachingSessionWizard.jsx');
    expect(source).toContain("stage: 'discovery'");
    expect(source).toContain("current_stage: 'understanding'");
  });

  it('limits coaching analytics to the authenticated user', () => {
    const source = read('src/pages/CoachingAnalytics.jsx');
    expect(source).toContain("queryKey: ['coachingSessions', user?.email]");
    expect(source).toContain("filter({ created_by: user.email }, '-created_date')");
    expect(source).not.toContain('CoachingSession.list()');
  });

  it('optimistically updates action plans, rolls back failures, and refreshes the session', () => {
    const panel = read('src/components/coaching/ActionPlanPanel.jsx');
    const chat = read('src/components/coaching/CoachingChat.jsx');
    expect(panel).toContain('onMutate: async (actions)');
    expect(panel).toContain('queryClient.setQueryData(context.sessionKey, context.previousSession)');
    expect(panel).toContain('onUpdate?.()');
    expect(panel).toContain("invalidateQueries({ queryKey: ['coachingSessions'] })");
    expect(chat.match(/onUpdate=\{refetchSession\}/g)).toHaveLength(2);
  });

  it('provides responsive and accessible Coach controls', () => {
    const page = read('src/pages/Coach.jsx');
    const list = read('src/components/coaching/CoachingSessionList.jsx');
    const wizard = read('src/components/coaching/CoachingSessionWizard.jsx');
    const chat = read('src/components/coaching/CoachingChat.jsx');

    expect(page).toContain('sm:inline-grid sm:w-auto');
    expect(page).toContain('fixed end-4');
    expect(list).toContain('role="button"');
    expect(list).toContain('tabIndex={0}');
    expect(wizard).toContain('aria-pressed={formData.focus_area === area.value}');
    expect(wizard).toContain('<PremiumDialog');
    expect(wizard).toContain('onClose={onClose} localEscape');
    expect(read('src/components/ui/PremiumDialog.jsx')).toContain('<DialogPrimitive.Portal>');
    expect(wizard).toContain('contentScrollRef.current.scrollTop = 0');
    expect(wizard).toContain("WebkitOverflowScrolling: 'touch'");
    expect(wizard).toMatch(/<h1 className="[^"]*break-words[^"]*leading-tight[^"]*"/);
    expect(chat).toContain('overflow-x-auto');
    expect(chat).toContain("env(safe-area-inset-bottom, 0px)");
  });
});
