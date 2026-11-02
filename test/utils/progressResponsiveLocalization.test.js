import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { applyProgressUiTranslations } from '../../src/components/i18n/progressUiTranslations.js';

const read = (path) => readFileSync(new URL('../../' + path, import.meta.url), 'utf8');
const languages = ['en', 'he', 'es', 'fr', 'de', 'it', 'pt'];

describe('Progress production UX safeguards', () => {
  it('installs a complete Progress UI pack for all supported languages', () => {
    const translations = Object.fromEntries(languages.map((language) => [language, { translation: {} }]));
    applyProgressUiTranslations(translations);
    for (const language of languages) {
      const pack = translations[language].translation.progress_ui;
      expect(pack.common.load_error).toBeTruthy();
      expect(pack.insights.title).toBeTruthy();
      expect(pack.exercise.title).toBeTruthy();
      expect(pack.goals.title).toBeTruthy();
      expect(pack.health.title).toBeTruthy();
      expect(pack.form.save_error).toBeTruthy();
      expect(pack.ai.privacy).toBeTruthy();
      expect(pack.gamification.achievements).toBeTruthy();
      expect(Object.keys(pack.gamification.badge)).toHaveLength(8);
    }
  });

  it('applies the Progress pack during i18n bootstrap', () => {
    const source = read('src/components/i18n/i18nConfig.jsx');
    expect(source).toContain("import { applyProgressUiTranslations } from './progressUiTranslations'");
    expect(source).toContain('applyProgressUiTranslations(translations)');
  });

  it('keeps all six tabs responsive and exposes query failures', () => {
    const source = read('src/pages/Progress.jsx');
    for (const tab of ['overview', 'achievements', 'mood', 'goals', 'exercises', 'health']) {
      expect(source).toContain(`value="${tab}"`);
    }
    expect(source).toContain('data-testid="progress-page"');
    expect(source).toContain('grid-cols-2');
    expect(source).toContain('sm:grid-cols-6');
    expect(source).toContain('isError');
    expect(source).not.toContain('progressConversations');
  });

  it('does not transmit well-being records to an AI service for pattern comparison', () => {
    const source = read('src/components/progress/CorrelationInsights.jsx');
    expect(source).not.toContain('InvokeLLM');
    expect(source).not.toContain('integrations.Core');
    expect(source).toContain('progress_ui.ai.privacy');
  });

  it('uses the canonical mood field and a real consecutive-day streak', () => {
    const dashboard = read('src/components/progress/EnhancedProgressDashboard.jsx');
    const insights = read('src/components/progress/InsightsPanel.jsx');
    expect(dashboard).toContain('MOOD_VALUES[m.mood]');
    expect(dashboard).not.toContain('mood_level');
    expect(insights).toContain('consecutiveCheckInDays');
    expect(insights).not.toContain('<div className="text-teal-600 text-3xl font-bold">{moodEntries.length}</div>');
  });

  it('keeps the health dialog accessible and mobile-safe', () => {
    const source = read('src/components/health/HealthDataForm.jsx');
    expect(source).toContain('role="dialog"');
    expect(source).toContain('aria-modal="true"');
    // Escape and focus restoration belong to the shared Radix dialog now;
    // progress-responsive and path-stage3-flows exercise actual dismissal.
    expect(source).toContain("import PremiumDialog from '@/components/ui/PremiumDialog'");
    expect(source).toContain('<PremiumDialog onClose={onClose}');
    expect(source).toContain('max-h-[92dvh]');
    expect(source).toContain('min-h-11');
    expect(source).toContain('saveMutation.isError');
  });

  it('uses translated labels in every edited Progress subview', () => {
    const files = [
      'src/components/progress/EnhancedMoodChart.jsx',
      'src/components/progress/ExerciseTracker.jsx',
      'src/components/progress/InsightsPanel.jsx',
      'src/components/progress/GoalsProgressTracker.jsx',
      'src/components/progress/CorrelationInsights.jsx',
      'src/components/health/HealthDashboard.jsx',
      'src/components/health/HealthDataForm.jsx',
      'src/components/gamification/GamificationHub.jsx'
    ];
    for (const file of files) expect(read(file)).toContain('progress_ui.');
  });
});
