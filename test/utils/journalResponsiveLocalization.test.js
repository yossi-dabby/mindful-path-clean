import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { applyJournalUiTranslations } from '../../src/components/i18n/journalUiTranslations.js';

const read = (path) => readFileSync(new URL('../../' + path, import.meta.url), 'utf8');
const languages = ['en', 'he', 'es', 'fr', 'de', 'it', 'pt'];

describe('Journal production UX safeguards', () => {
  it('installs a complete Journal UI pack for all seven supported languages', () => {
    const translations = Object.fromEntries(
      languages.map((language) => [language, { translation: { journal_ui: { preserved: language } } }])
    );
    applyJournalUiTranslations(translations);
    for (const language of languages) {
      const journal = translations[language].translation.journal_ui;
      expect(journal.common.close).toBeTruthy();
      expect(journal.main.progress).toBeTruthy();
      expect(journal.dashboard.title).toBeTruthy();
      expect(journal.form.dialog_description).toBeTruthy();
      expect(journal.reminders.title).toBeTruthy();
      expect(journal.templates.title).toBeTruthy();
      expect(journal.templates.customize_title).toBeTruthy();
      expect(journal.templates.save_customized).toBeTruthy();
      expect(Object.keys(journal.templates.catalog)).toHaveLength(21);
      for (const catalogTemplate of Object.values(journal.templates.catalog)) {
        expect(catalogTemplate.name).toBeTruthy();
        expect(catalogTemplate.description).toBeTruthy();
      }
      for (const templateKey of ['cbt', 'gratitude', 'anxiety', 'mood']) {
        expect(journal.templates.default[templateKey].name).toBeTruthy();
        expect(journal.templates.default[templateKey].description).toBeTruthy();
      }
      expect(journal.prompts.title).toBeTruthy();
      expect(journal.trends.professional_note).toBeTruthy();
      expect(journal.taxonomy.emotions.anxious).toBeTruthy();
      expect(journal.taxonomy.distortions.catastrophizing).toBeTruthy();
      expect(journal.ai.analysis_title).toBeTruthy();
      expect(journal.filters.session_summary).toBeTruthy();
      expect(journal.common.remove).toBeTruthy();
      for (const format of ['bold','italic','underline','numbers','bullets','clear']) expect(journal.form['format_' + format]).toBeTruthy();
      expect(journal.cards.delete_error).toBeTruthy();
      expect(journal.templates.delete_error).toBeTruthy();
      expect(journal.reminders.save_error).toBeTruthy();
      expect(journal.reminders.action_error).toBeTruthy();
    }
  });

  it('applies the Journal pack during i18n bootstrap', () => {
    const source = read('src/components/i18n/i18nConfig.jsx');
    expect(source).toContain("import { applyJournalUiTranslations } from './journalUiTranslations'");
    expect(source).toContain('applyJournalUiTranslations(translations)');
  });

  it('scopes private Journal resources to the authenticated user', () => {
    const page = read('src/pages/Journal.jsx');
    const form = read('src/components/journal/ThoughtRecordForm.jsx');
    const suggestions = read('src/components/journal/AiJournalSuggestions.jsx');
    expect(page).toContain("ThoughtJournal.filter({ created_by: userEmail }");
    expect(page).toContain("SessionSummary.filter({ created_by: userEmail }");
    expect(page).toContain("JournalTemplate.filter({ created_by: userEmail }");
    expect(form).toContain("Goal.filter({ created_by: userEmail, status: 'active' })");
    expect(suggestions).toContain("ThoughtJournal.filter({ created_by: userEmail }");
    expect(suggestions).toContain("Goal.filter({ created_by: userEmail, status: 'active' })");
    expect(page).not.toContain('ThoughtJournal.list(');
  });

  it('keeps all primary Journal tools visible and responsive', () => {
    const page = read('src/pages/Journal.jsx');
    const dashboard = read('src/pages/JournalDashboard.jsx');
    const filters = read('src/components/journal/JournalFilters.jsx');
    expect(page).toContain('data-testid="journal-page"');
    expect(page).toContain('grid grid-cols-2');
    expect(page).toContain("setShowAiPrompts(true)");
    expect(page).toContain("setShowReminderManager(true)");
    expect(dashboard).toContain('data-testid="journal-dashboard"');
    expect(dashboard).toContain('<ResponsiveContainer width="100%" height="100%">');
    expect(dashboard).not.toMatch(/min-w-\[(?:500|560)px\]/);
    expect(filters).toContain('overflow-x-auto');
    expect(filters).toContain('aria-pressed');
  });

  it('uses accessible dialogs and 44px controls for every Journal overlay', () => {
    const files = [
      'src/components/journal/ThoughtRecordForm.jsx',
      'src/components/journal/TemplateManager.jsx',
      'src/components/journal/ReminderManager.jsx',
      'src/components/journal/AiJournalPrompts.jsx',
      'src/components/journal/AiTrendsSummary.jsx'
    ];
    for (const file of files) {
      const source = read(file);
      expect(source).toContain('role="dialog"');
      expect(source).toContain('aria-modal="true"');
      expect(source).toMatch(/min-h-11|min-h-12|min-w-11/);
      expect(source).toContain("import PremiumDialog from '@/components/ui/PremiumDialog'");
      expect(source).not.toContain("window.addEventListener('keydown'");
    }
    const form = read(files[0]);
    expect(form).toContain('aria-pressed={formData.emotions.includes(emotion)}');
    expect(form).toContain('aria-valuetext');
  });

  it('forces all AI-visible output into the selected language with guarded schemas', () => {
    const files = [
      'src/components/journal/AiJournalPrompts.jsx',
      'src/components/journal/AiTrendsSummary.jsx',
      'src/components/journal/AiDistortionAnalysis.jsx',
      'src/components/journal/AiEntrySummary.jsx',
      'src/components/journal/AiJournalSuggestions.jsx'
    ];
    for (const file of files) {
      const source = read(file);
      expect(source).toContain("t('journal_ui.ai.language_name')");
      expect(source).toContain('Do not mix languages');
      expect(source).toContain('response_json_schema');
      expect(source).toContain('safeInvokeLLM');
    }
    expect(read('src/components/journal/AiJournalSuggestions.jsx')).toContain("t('journal_ui.trends.professional_note')");
    expect(read('src/components/journal/AiDistortionAnalysis.jsx')).toContain("t('journal_ui.trends.professional_note')");
  });

  it('keeps built-in templates localized and safely customizable', () => {
    const manager = read('src/components/journal/TemplateManager.jsx');
    expect(manager).toContain('localizeBuiltInTemplate');
    expect(manager).toContain('onSelect={onSelectTemplate}');
    expect(manager).toContain('source_default: true');
    expect(manager).toContain('const isExisting = Boolean(template?.id) && !isCustomizingDefault');
    expect(manager).toContain('language: isCustomizingDefault ? language : template?.language || language');
    const form = read('src/components/journal/ThoughtRecordForm.jsx');
    expect(form).toContain("import { localizeJournalTemplate } from './journalTemplateCatalog'");
    expect(form).toContain('template_name: entry?.template_name || localizeJournalTemplate(template, t)?.name');
    for (const legacyEnglish of ['Standard CBT', 'Gratitude journal', 'Anxiety log', 'Mood journal']) {
      expect(manager).not.toContain(legacyEnglish);
    }
  });

  it('contains no legacy hard-coded English controls in the edited Journal flow', () => {
    const form = read('src/components/journal/ThoughtRecordForm.jsx');
    const suggestions = read('src/components/journal/AiJournalSuggestions.jsx');
    const distortion = read('src/components/journal/AiDistortionAnalysis.jsx');
    for (const legacy of ['>Continue<', 'AI-Powered Analysis', 'Entry Analysis', 'Browse Exercises', 'Apply to Journal Entry']) {
      expect(form + suggestions + distortion).not.toContain(legacy);
    }
  });
});
