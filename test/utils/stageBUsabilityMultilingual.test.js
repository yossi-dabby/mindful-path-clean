import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { translations } from '../../src/components/i18n/translations.jsx';
import { applyStageBUiTranslations } from '../../src/components/i18n/stageBUiTranslations.js';
import { getLegalCopy } from '../../src/components/legal/legalContent.js';

const read = (path) => readFileSync(path, 'utf8');
const languages = ['en', 'he', 'es', 'fr', 'de', 'it', 'pt'];

function getNested(root, path) {
  return path.split('.').reduce((value, part) => value?.[part], root);
}

applyStageBUiTranslations(translations);

describe('Stage A multilingual completion', () => {
  it('provides privacy, terms, and AI consent in every supported language', () => {
    for (const language of languages) {
      const copy = getLegalCopy(language);
      expect(copy.language, language).toBe(language);
      expect(copy.privacy.title, language).toBeTruthy();
      expect(copy.privacy.sections.length, language).toBeGreaterThanOrEqual(8);
      expect(copy.terms.title, language).toBeTruthy();
      expect(copy.terms.sections.length, language).toBeGreaterThanOrEqual(8);
      expect(copy.consent.acknowledgement, language).toBeTruthy();
      expect(copy.consent.accept, language).toBeTruthy();
    }
    expect(getLegalCopy('he').direction).toBe('rtl');
  });

  it('localizes registration, login, consent, and account deletion controls', () => {
    const keys = [
      'auth.login.title',
      'auth.register.title',
      'auth.social.continue_with',
      'auth.otp.title',
      'auth.forgot.title',
      'auth.forgot.sent',
      'auth.reset.invalid_title',
      'auth.reset.password_mismatch',
      'auth.reset.submit',
      'consent.account_verify_error',
      'consent.save_error',
      'settings.account.delete_confirm_title',
      'settings.account.delete_confirm_description',
      'settings.account.delete_confirm_button',
      'settings.account.delete_error',
    ];

    for (const language of languages) {
      const root = translations[language]?.translation;
      for (const key of keys) {
        const value = getNested(root, key);
        expect(typeof value, `${language}:${key}`).toBe('string');
        expect(value.trim().length, `${language}:${key}`).toBeGreaterThan(2);
      }
    }
  });
});

describe('Stage B usability contracts', () => {
  it('keeps onboarding short, personalized, four-step, and persistence-safe', () => {
    const source = read('src/components/onboarding/WelcomeWizard.jsx');
    expect(source).toContain('step === 1');
    expect(source).toContain('step === 2');
    expect(source).toContain('step === 3');
    expect(source).toContain('step === 4');
    expect(source).toContain('focus_areas');
    expect(source).toContain('onboarding_mood');
    expect(source).toContain('support_style');
    expect(source).toContain('mutationFn: () => base44.auth.updateMe');
    expect(source).toContain('onSuccess: () =>');
    expect(source.indexOf('onSuccess: () =>')).toBeLessThan(source.indexOf('onComplete();'));
  });

  it('shows the three-part daily path before secondary home content', () => {
    const home = read('src/pages/Home.jsx');
    const dailyPath = read('src/components/home/DailyPath.jsx');
    expect(home).toContain('<DailyPath');
    expect(dailyPath).toContain("key: 'checkin'");
    expect(dailyPath).toContain("key: 'coach'");
    expect(dailyPath).toContain("key: 'action'");
    expect(dailyPath).toContain('hasRecommendedExercise');
  });

  it('uses the same five primary destinations on desktop, tablet, and mobile', () => {
    const files = [
      'src/components/layout/Sidebar.jsx',
      'src/components/layout/BottomNav.jsx',
      'src/components/layout/MobileMenu.jsx',
    ];
    for (const path of files) {
      const source = read(path);
      for (const page of ['Home', 'Chat', 'MyPath', 'Journal', 'Tools']) {
        expect(source, `${path}:${page}`).toContain(`path: '${page}'`);
      }
    }
    expect(read('src/pages/MyPath.jsx')).toContain("my_path.title");
    expect(read('src/pages/Tools.jsx')).toContain("tools_hub.title");

    const tabNavigation = read('src/components/layout/TabNavigationProvider.jsx');
    for (const root of ['Home', 'Chat', 'MyPath', 'Journal', 'Tools']) {
      expect(tabNavigation, root).toContain(`${root}: '${root}'`);
    }
    expect(tabNavigation).toContain("StarterPath: 'MyPath'");
    expect(tabNavigation).toContain("Exercises: 'Tools'");
    expect(tabNavigation).toContain("tabStacks[activeTab]?.length");
  });

  it('keeps the seven-day example readable with calm high-contrast styling', () => {
    const source = read('src/pages/StarterPath.jsx');
    expect(source).toContain('border-border bg-secondary/70');
    expect(source).toContain('text-primary');
    expect(source).not.toContain('text-[hsl(var(--background))] bg-[hsl(var(--background))]');
  });

  it('starts desktop chat collapsed and keeps one calm intent and summary action', () => {
    const chat = read('src/pages/Chat.jsx');
    const summary = read('src/components/chat/SessionSummary.jsx');
    expect(chat).toContain('useState(true)');
    expect(chat).toContain('chat-intent-chooser');
    expect(chat).toContain("chat_stage.intent.unload");
    expect(chat).toContain("chat_stage.intent.practical");
    expect(chat).toContain("chat_stage.queue_hint");
    expect(summary).toContain('const recommendedExercise = exercises.find');
    expect(summary).toContain("chat_stage.summary.understood");
    expect(summary).toContain("chat_stage.summary.practice");
    expect(summary).toContain("chat_stage.summary.return");
  });

  it('localizes all new Stage B surfaces in every supported language', () => {
    const keys = [
      'onboarding.focus.title',
      'onboarding.mood.title',
      'onboarding.support.title',
      'onboarding.first.title',
      'onboarding.step_label',
      'daily_path.title',
      'sidebar.home.name',
      'stage_b.nav.coach',
      'stage_b.nav.path',
      'sidebar.journal.name',
      'stage_b.nav.tools',
      'chat_stage.intent.unload',
      'chat_stage.intent.practical',
      'chat_stage.summary.understood',
      'chat_stage.summary.practice',
      'chat_stage.summary.return',
    ];

    for (const language of languages) {
      const root = translations[language]?.translation;
      for (const key of keys) {
        const value = getNested(root, key);
        expect(typeof value, `${language}:${key}`).toBe('string');
        expect(value.trim().length, `${language}:${key}`).toBeGreaterThan(2);
      }
    }
  });

  it('instruments time to first value from entry point through a new assistant response', () => {
    const measurement = read('src/lib/timeToFirstValue.js');
    const home = read('src/pages/Home.jsx');
    const chat = read('src/pages/Chat.jsx');

    expect(measurement).toContain("const STORAGE_KEY = 'mindful_path_time_to_first_value_v1'");
    expect(measurement).toContain("eventName: 'time_to_first_value_completed'");
    for (const property of ['duration_ms', 'entry_point', 'value_type', 'locale', 'viewport']) {
      expect(measurement, property).toContain(property);
    }
    expect(measurement).toContain('assistantCount <= (measurement.baselineAssistantCount || 0)');
    expect(home).toContain("entryPoint: 'home_daily_checkin'");
    expect(home).toContain("entryPoint: 'home_guided_exercise'");
    expect(chat).toContain("entryPoint: 'chat_message'");
    expect(chat).toContain("valueType: 'assistant_response'");
    expect(chat).toContain('bindTimeToFirstValueConversation');
    expect(chat).toContain('completeTimeToFirstValue');
  });
});
