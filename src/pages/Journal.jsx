import BotanicalAccent from '@/components/brand/BotanicalAccent';
import React, { useState, useMemo, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Plus, BookOpen, Search, Settings, Bell, Sparkles, BarChart2, ArrowLeft, RefreshCw } from 'lucide-react';
import { createPageUrl } from '../utils';
import ThoughtRecordForm from '../components/journal/ThoughtRecordForm';
import ThoughtRecordCard from '../components/journal/ThoughtRecordCard';
import SessionSummaryCard from '../components/journal/SessionSummaryCard';
import JournalFilters from '../components/journal/JournalFilters';
import TemplateManager from '../components/journal/TemplateManager';
import ReminderManager from '../components/journal/ReminderManager';
import AiJournalPrompts from '../components/journal/AiJournalPrompts';
import AiTrendsSummary from '../components/journal/AiTrendsSummary';
import PullToRefresh from '../components/utils/PullToRefresh';

const actionClass = 'min-h-11 rounded-2xl gap-2 text-sm font-semibold shadow-sm focus-visible:ring-2 focus-visible:ring-offset-2';

export default function Journal() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [showReminderManager, setShowReminderManager] = useState(false);
  const [showAiPrompts, setShowAiPrompts] = useState(false);
  const [showTrendsSummary, setShowTrendsSummary] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [selectedType, setSelectedType] = useState('all');
  const [promptedSituation, setPromptedSituation] = useState('');
  // The route owns the focused record. Mirrored state can clear before a
  // navigation commits and remain stale during a rapid Back/Forward traversal.
  const focusedParams = new URLSearchParams(location.search);
  const focusedEntryId = focusedParams.get('entry');
  const focusedSummaryId = focusedParams.get('summary');
  const templateTriggerRef = useRef(null);
  const promptTriggerRef = useRef(null);
  const formReturnFocusRef = useRef(null);



  const userQuery = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: 300000
  });
  const userEmail = userQuery.data?.email;

  const journalQuery = useQuery({
    queryKey: ['thoughtJournals', userEmail],
    queryFn: () => base44.entities.ThoughtJournal.filter({ created_by: userEmail }, '-created_date', 100),
    enabled: Boolean(userEmail),
    refetchOnWindowFocus: false
  });

  const summariesQuery = useQuery({
    queryKey: ['sessionSummaries', userEmail],
    queryFn: () => base44.entities.SessionSummary.filter({ created_by: userEmail }, '-session_date', 100),
    enabled: Boolean(userEmail),
    refetchOnWindowFocus: false
  });

  const templatesQuery = useQuery({
    queryKey: ['journalTemplates', userEmail],
    queryFn: () => base44.entities.JournalTemplate.filter({ created_by: userEmail }, '-created_date', 100),
    enabled: Boolean(userEmail),
  });

  const entries = useMemo(() => {
    const journals = Array.isArray(journalQuery.data) ? journalQuery.data : [];
    const summaries = (Array.isArray(summariesQuery.data) ? summariesQuery.data : []).map((summary) => ({
      ...summary,
      entry_type: 'session_summary',
      situation: t('journal_ui.main.session_summary_label', {
        date: new Intl.DateTimeFormat(i18n.resolvedLanguage || i18n.language).format(new Date(summary.session_date))
      }),
      isSummary: true
    }));
    return [...journals, ...summaries].sort((a, b) =>
      new Date(b.created_date || b.session_date) - new Date(a.created_date || a.session_date)
    );
  }, [journalQuery.data, summariesQuery.data, t, i18n.resolvedLanguage, i18n.language]);

  const allTags = useMemo(() => [...new Set(entries.flatMap((entry) => entry.tags || []))], [entries]);

  const filteredEntries = useMemo(() => entries.filter((entry) => {
    if (focusedEntryId) return entry.id === focusedEntryId && !entry.isSummary;
    if (focusedSummaryId) return entry.id === focusedSummaryId && entry.isSummary;

    const normalizedSearch = searchQuery.trim().toLocaleLowerCase(i18n.resolvedLanguage || i18n.language);
    const matchesSearch = !normalizedSearch || [
      entry.situation,
      entry.automatic_thoughts,
      entry.balanced_thought,
      entry.summary_content
    ].some((value) => value?.toLocaleLowerCase(i18n.resolvedLanguage || i18n.language).includes(normalizedSearch));
    const matchesTags = selectedTags.length === 0 || selectedTags.some((tag) => entry.tags?.includes(tag));
    const matchesType = selectedType === 'all' || entry.entry_type === selectedType ||
      (selectedType === 'session_summary' && entry.isSummary);
    return matchesSearch && matchesTags && matchesType;
  }), [entries, searchQuery, selectedTags, selectedType, focusedEntryId, focusedSummaryId, i18n.resolvedLanguage, i18n.language]);

  const handleEdit = useCallback((entry, opener) => {
    formReturnFocusRef.current = opener?.getAttribute('role') === 'menuitem'
      ? document.querySelector(`[data-entry-id="${CSS.escape(entry.id)}"] button[aria-haspopup="menu"]`)
      : opener;
    setEditingEntry(entry);
    setShowForm(true);
  }, []);

  const handleClose = useCallback(() => {
    setShowForm(false);
    setEditingEntry(null);
    setSelectedTemplate(null);
    setPromptedSituation('');
  }, []);

  const handleNewEntry = useCallback((template = null, initialSituation = '', returnFocusTo = null) => {
    formReturnFocusRef.current = returnFocusTo;
    setSelectedTemplate(template);
    setPromptedSituation(initialSituation);
    setShowForm(true);
  }, []);

  const openTemplates = (event) => {
    templateTriggerRef.current = event.currentTarget;
    setShowTemplateManager(true);
  };

  const clearFocusedEntry = () => {
    navigate(createPageUrl('Journal'));
  };

  const isLoading = userQuery.isLoading || journalQuery.isLoading || summariesQuery.isLoading;
  const hasError = userQuery.isError || journalQuery.isError || summariesQuery.isError;

  return (
    <PullToRefresh queryKeys={['thoughtJournals', 'sessionSummaries', 'journalTemplates']}>
      <main data-testid="journal-page" className="mx-auto min-h-[100dvh] w-full max-w-6xl px-3 pb-32 pt-4 sm:px-5 md:px-8 md:pb-24">
        <header className="mb-6 rounded-[28px] border border-border/70 bg-[hsl(var(--card)/0.97)] p-4 shadow-[0_18px_55px_rgba(20,92,82,0.12)] backdrop-blur-xl sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <Button variant="ghost" size="icon" onClick={() => window.history.back()} className="min-h-11 min-w-11 shrink-0 rounded-full" aria-label={t('journal.go_back_aria')}>
                <ArrowLeft className="h-5 w-5 rtl:rotate-180" />
              </Button>
              <div className="min-w-0">
                <div className="botanical-title-row"><h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl lg:text-4xl">
                  {focusedEntryId ? t('journal.title_entry') : focusedSummaryId ? t('journal.title_summary') : t('journal.title_default')}
                </h1><BotanicalAccent variant="leaves" className="botanical-title-art" /></div>
                <p className="mt-1 max-w-2xl text-sm font-medium text-primary sm:text-base">
                  {focusedEntryId ? t('journal.subtitle_entry') : focusedSummaryId ? t('journal.subtitle_summary') : t('journal.subtitle_default')}
                </p>
                {(focusedEntryId || focusedSummaryId) && (
                  <Button variant="outline" size="sm" onClick={clearFocusedEntry} className="mt-3 min-h-11 rounded-2xl">
                    {t('journal.view_all_entries')}
                  </Button>
                )}
              </div>
            </div>

            <div className="w-full lg:w-auto">
              <Button onClick={() => navigate('/Chat?intent=thought_work')} className={`${actionClass} w-full bg-primary text-primary-foreground hover:bg-primary lg:w-auto`}>
                <Plus className="h-4 w-4" />
                {t('journal.new_entry')}
              </Button>
              <div role="group" aria-label={t('journal_ui.main.actions_aria')} className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:flex lg:justify-end">
                <Button onClick={() => navigate('/JournalDashboard')} variant="outline" className={actionClass}>
                  <BarChart2 className="h-4 w-4" />
                  {t('journal_ui.main.progress')}
                </Button>
                <Button onClick={() => setShowTrendsSummary(true)} variant="outline" className={actionClass}>
                  <Sparkles className="h-4 w-4" />
                  {t('journal.ai_insights')}
                </Button>
                <Button onClick={(event) => { promptTriggerRef.current = event.currentTarget; setShowAiPrompts(true); }} variant="outline" className={actionClass}>
                  <Sparkles className="h-4 w-4" />
                  {t('journal.ai_prompts')}
                </Button>
                <Button onClick={() => setShowReminderManager(true)} variant="outline" className={actionClass}>
                  <Bell className="h-4 w-4" />
                  {t('journal.reminders')}
                </Button>
              </div>
              <Button onClick={openTemplates} variant="ghost" className="mt-2 min-h-11 w-full rounded-2xl text-primary lg:w-auto lg:float-end">
                <Settings className="h-4 w-4" />
                {t('journal.templates')}
              </Button>
            </div>
          </div>
        </header>

        <section aria-label={t('journal.search_placeholder')} className="mb-6 rounded-[24px] border border-border/70 bg-[hsl(var(--card)/0.97)] p-3 shadow-sm backdrop-blur-lg sm:p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-5 w-5 -translate-y-1/2 text-primary" />
            <Input data-testid="journal-search" aria-label={t('journal.search_placeholder')} value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={t('journal.search_placeholder')} className="h-12 w-full rounded-2xl border-border bg-[hsl(var(--card)/0.97)] ps-11 text-base shadow-none" />
          </div>
          <div className="mt-4">
            <JournalFilters allTags={allTags} selectedTags={selectedTags} onTagsChange={setSelectedTags}
              selectedType={selectedType} onTypeChange={setSelectedType} />
          </div>
        </section>

        {hasError ? (
          <Card className="border-destructive/30 bg-[hsl(var(--card)/0.97)] shadow-md">
            <CardContent className="p-8 text-center">
              <p role="alert" className="font-medium text-foreground">{t('journal_ui.main.load_error')}</p>
              <Button className="mt-4 min-h-11 rounded-2xl" onClick={() => {
                userQuery.refetch();
                journalQuery.refetch();
                summariesQuery.refetch();
              }}>
                <RefreshCw className="h-4 w-4" />
                {t('journal_ui.common.retry')}
              </Button>
            </CardContent>
          </Card>
        ) : isLoading ? (
          <div className="py-14 text-center" role="status">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-border border-t-teal-600" />
            <p className="mt-3 text-sm font-medium text-primary">{t('journal.loading')}</p>
          </div>
        ) : entries.length === 0 ? (
          <Card className="overflow-hidden border border-border/70 bg-[hsl(var(--card)/0.97)] shadow-lg backdrop-blur-xl">
            <CardContent className="p-7 text-center sm:p-12">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-secondary/70 text-primary shadow-sm">
                <BookOpen className="h-10 w-10" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">{t('journal.first_entry_title')}</h2>
              <p className="mx-auto mt-2 max-w-md text-primary">{t('journal.first_entry_description')}</p>
              <div className="mx-auto mt-6 flex max-w-md flex-col gap-3 sm:flex-row">
                <Button onClick={() => navigate('/Chat?intent=thought_work')} className="min-h-12 flex-1 rounded-2xl bg-primary text-primary-foreground hover:bg-primary">
                  {t('journal.create_entry')}
                </Button>
                <Button onClick={openTemplates} variant="outline" className="min-h-12 flex-1 rounded-2xl">
                  {t('journal.browse_templates')}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : filteredEntries.length === 0 ? (
          <Card className="border-border/70 bg-[hsl(var(--card)/0.97)] shadow-md">
            <CardContent className="p-8 text-center">
              <p className="mx-auto max-w-md text-muted-foreground">{t('journal.no_entries_match')}</p>
              <div className="mx-auto mt-4 flex max-w-md flex-col gap-2 sm:flex-row sm:justify-center">
                <Button variant="outline" className="min-h-11 rounded-2xl" onClick={() => {
                  setSearchQuery('');
                  setSelectedTags([]);
                  setSelectedType('all');
                }}>{t('journal.clear_filters')}</Button>
                <Button className="min-h-11 rounded-2xl" onClick={() => navigate('/Chat?intent=thought_work')}>{t('journal.new_entry')}</Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <section aria-live="polite" className="space-y-4">
            {filteredEntries.map((entry) => entry.isSummary ? (
              <SessionSummaryCard key={entry.id} summary={entry} onDelete={() => {
                queryClient.invalidateQueries({ queryKey: ['sessionSummaries'] });
                queryClient.invalidateQueries({ queryKey: ['journalCount'] });
              }} />
            ) : (
              <ThoughtRecordCard key={entry.id} entry={entry} onEdit={handleEdit} />
            ))}
          </section>
        )}

        {showForm && <ThoughtRecordForm entry={editingEntry} template={selectedTemplate} templates={templatesQuery.data || []}
          onClose={handleClose} initialSituation={promptedSituation} returnFocusTo={formReturnFocusRef.current} />}
        {showTemplateManager && <TemplateManager templates={templatesQuery.data || []} onClose={() => setShowTemplateManager(false)}
          isLoading={templatesQuery.isLoading} loadError={templatesQuery.isError} onRetry={() => templatesQuery.refetch()}
          onSelectTemplate={(template) => { setShowTemplateManager(false); handleNewEntry(template, '', templateTriggerRef.current); }} />}
        {showReminderManager && <ReminderManager onClose={() => setShowReminderManager(false)} />}
        {showAiPrompts && <AiJournalPrompts onSelectPrompt={(prompt) => {
          setShowAiPrompts(false);
          handleNewEntry(null, prompt, promptTriggerRef.current);
        }} onClose={() => setShowAiPrompts(false)} />}
        {showTrendsSummary && <AiTrendsSummary onClose={() => setShowTrendsSummary(false)} />}
      </main>
    </PullToRefresh>
  );
}
