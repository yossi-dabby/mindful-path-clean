import BotanicalAccent from '@/components/brand/BotanicalAccent';
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, Brain, Calendar, Loader2, Plus, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import DetailedMoodForm from '../components/mood/DetailedMoodForm';
import MoodTrendChart from '../components/mood/MoodTrendChart';
import MoodInsights from '../components/mood/MoodInsights';
import TriggerAnalysis from '../components/mood/TriggerAnalysis';
import MoodCalendar from '../components/mood/MoodCalendar';
import PullToRefresh from '../components/utils/PullToRefresh';

const VALID_TABS = new Set(['overview', 'calendar', 'insights']);

const getLocalDateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function MoodTracker() {
  const { t } = useTranslation();
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [dateRange, setDateRange] = useState(30);

  const requestedTab = new URLSearchParams(window.location.search).get('tab');
  const [activeTab, setActiveTab] = useState(VALID_TABS.has(requestedTab) ? requestedTab : 'overview');

  const {
    data: user,
    isLoading: isUserLoading,
    isError: isUserError,
    refetch: refetchUser
  } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: 5 * 60 * 1000
  });

  const {
    data: moodEntries = [],
    isLoading: isMoodLoading,
    isError: isMoodError,
    refetch: refetchMood
  } = useQuery({
    queryKey: ['moodEntries', user?.email, dateRange],
    enabled: Boolean(user?.email),
    queryFn: () => base44.entities.MoodEntry.filter({ created_by: user.email }, '-date', dateRange * 2)
  });

  const safeMoodEntries = Array.isArray(moodEntries) ? moodEntries : [];
  const todayEntry = safeMoodEntries.find((entry) => entry.date === getLocalDateKey());

  const handleEdit = (entry) => {
    setEditingEntry(entry);
    setShowForm(true);
  };

  const handleClose = () => {
    setShowForm(false);
    setEditingEntry(null);
  };

  const handleTabChange = (newTab) => {
    if (!VALID_TABS.has(newTab)) return;
    setActiveTab(newTab);
    const params = new URLSearchParams(window.location.search);
    params.set('tab', newTab);
    window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
  };

  const isLoading = isUserLoading || (Boolean(user?.email) && isMoodLoading);
  const isError = isUserError || isMoodError;

  return (
    <PullToRefresh queryKeys={['moodEntries']}>
      <main className="min-h-[100dvh] w-full px-3 pb-32 pt-4 backdrop-blur-[2px] sm:px-4 md:px-6 md:pb-24" data-testid="mood-tracker">
        <div className="mx-auto w-full max-w-7xl">
          <motion.header className="mb-5 sm:mb-6" initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}>
            <div className="garden-responsive-heading flex flex-col gap-4 rounded-[var(--radius-card)] border border-border/65 bg-card/78 p-4 shadow-[var(--shadow-sm)] backdrop-blur-xl sm:p-5 md:flex-row md:items-center md:justify-between">
              <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                <Button variant="ghost" size="icon" onClick={() => window.history.back()} className="shrink-0 rounded-full" aria-label={t('common.go_back_aria')}>
                  <svg className="rtl:scale-x-[-1]" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                </Button>
                <div className="min-w-0">
                  <div className="botanical-title-row"><h1 className="break-words text-2xl font-semibold text-foreground md:text-3xl">{t('mood_tracker.page_title')}</h1><BotanicalAccent variant="leaves" className="botanical-title-art" /></div>
                  <p className="mt-1 max-w-2xl text-sm font-medium leading-6 text-foreground/70 md:text-base">{t('mood_tracker.page_subtitle')}</p>
                </div>
              </div>
              <Button
                onClick={() => setShowForm(true)}
                className="min-h-12 w-full rounded-full px-6 shadow-[var(--shadow-md)] md:w-auto"
                disabled={isLoading || isError}
                data-testid="mood-log-button"
              >
                <Plus className="h-5 w-5" />
                {todayEntry ? t('mood_tracker.update_today') : t('mood_tracker.log_mood')}
              </Button>
            </div>
          </motion.header>

          {isLoading && (
            <div className="flex min-h-64 items-center justify-center rounded-[var(--radius-card)] border border-border/65 bg-card/85 p-8" role="status">
              <div className="text-center">
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                <p className="mt-3 text-sm font-medium text-muted-foreground">{t('mood_tracker.loading')}</p>
              </div>
            </div>
          )}

          {isError && !isLoading && (
            <div className="flex min-h-64 items-center justify-center rounded-[var(--radius-card)] border border-destructive/20 bg-card/90 p-6 text-center" role="alert">
              <div>
                <AlertCircle className="mx-auto h-9 w-9 text-destructive" />
                <h2 className="mt-3 text-lg font-semibold text-foreground">{t('mood_tracker.load_error')}</h2>
                <Button variant="outline" className="mt-4 min-h-11 rounded-full" onClick={() => isUserError ? refetchUser() : refetchMood()}>
                  {t('mood_tracker.retry')}
                </Button>
              </div>
            </div>
          )}

          {!isLoading && !isError && (
            <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-5 sm:space-y-6">
              <TabsList aria-label={t('mood_tracker.tabs_aria')} className="grid h-auto min-h-14 w-full grid-cols-3 gap-1 rounded-2xl border border-border/60 bg-card/78 p-1.5 shadow-[var(--shadow-sm)] backdrop-blur-xl sm:inline-grid sm:w-auto">
                <MoodTab value="overview" icon={TrendingUp} label={t('mood_tracker.tabs.overview')} />
                <MoodTab value="calendar" icon={Calendar} label={t('mood_tracker.tabs.calendar')} />
                <MoodTab value="insights" icon={Brain} label={t('mood_tracker.tabs.insights')} />
              </TabsList>

              <TabsContent value="overview" className="space-y-5 sm:space-y-6">
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
                  <MoodTrendChart entries={safeMoodEntries} dateRange={dateRange} onDateRangeChange={setDateRange} />
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                  <TriggerAnalysis entries={safeMoodEntries} />
                </motion.div>
              </TabsContent>

              <TabsContent value="calendar">
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                  <MoodCalendar entries={safeMoodEntries} onEditEntry={handleEdit} />
                </motion.div>
              </TabsContent>

              <TabsContent value="insights">
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                  <MoodInsights entries={safeMoodEntries} />
                </motion.div>
              </TabsContent>
            </Tabs>
          )}
        </div>

        {showForm && <DetailedMoodForm entry={editingEntry || todayEntry} onClose={handleClose} />}
      </main>
    </PullToRefresh>
  );
}

function MoodTab({ value, icon: Icon, label }) {
  return (
    <TabsTrigger
      value={value}
      className="min-h-11 min-w-0 gap-1.5 rounded-xl px-2 text-xs font-medium text-foreground/70 transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm sm:px-4 sm:text-sm"
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{label}</span>
    </TabsTrigger>
  );
}
