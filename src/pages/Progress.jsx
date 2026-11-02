import BotanicalAccent from '@/components/brand/BotanicalAccent';
import React, { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { TrendingUp, Calendar, Activity, Trophy, AlertCircle, Loader2, LayoutDashboard, Target, Dumbbell, HeartPulse } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import EnhancedMoodChart from '../components/progress/EnhancedMoodChart';
import InsightsPanel from '../components/progress/InsightsPanel';
import ExerciseTracker from '../components/progress/ExerciseTracker';
import CorrelationInsights from '../components/progress/CorrelationInsights';
import GoalsProgressTracker from '../components/progress/GoalsProgressTracker';
import HealthDashboard from '../components/health/HealthDashboard';
import EnhancedProgressDashboard from '../components/progress/EnhancedProgressDashboard';
import ProgressDataPanel from '../components/progress/ProgressDataPanel';
import GamificationHub from '../components/gamification/GamificationHub';
import PullToRefresh from '../components/utils/PullToRefresh';

const queryKeys = ['moodEntries', 'thoughtJournals', 'goals', 'exercises', 'healthMetrics', 'userStreaks', 'userPoints', 'userBadges'];

export default function Progress() {
  const { t } = useTranslation();
  const [timeRange, setTimeRange] = useState('7');
  const [activeTab, setActiveTab] = useState('overview');

  const moodsQuery = useQuery({ queryKey: ['moodEntries'], queryFn: () => base44.entities.MoodEntry.list('-date', 30) });
  const journalsQuery = useQuery({ queryKey: ['thoughtJournals'], queryFn: () => base44.entities.ThoughtJournal.list('-created_date', 30) });
  const goalsQuery = useQuery({ queryKey: ['goals'], queryFn: () => base44.entities.Goal.list() });
  const exercisesQuery = useQuery({ queryKey: ['exercises'], queryFn: () => base44.entities.Exercise.list() });

  const moodEntries = Array.isArray(moodsQuery.data) ? moodsQuery.data : [];
  const journalEntries = Array.isArray(journalsQuery.data) ? journalsQuery.data : [];
  const goals = Array.isArray(goalsQuery.data) ? goalsQuery.data : [];
  const exercises = Array.isArray(exercisesQuery.data) ? exercisesQuery.data : [];
  const isLoading = moodsQuery.isLoading || journalsQuery.isLoading || goalsQuery.isLoading || exercisesQuery.isLoading;
  const isError = moodsQuery.isError || journalsQuery.isError || goalsQuery.isError || exercisesQuery.isError;

  const filteredMoodEntries = useMemo(() => {
    const cutoff = new Date();
    cutoff.setHours(0, 0, 0, 0);
    cutoff.setDate(cutoff.getDate() - Number(timeRange));
    return moodEntries.filter((entry) => {
      if (!entry?.date) return false;
      const date = new Date(`${entry.date}T12:00:00`);
      return !Number.isNaN(date.getTime()) && date >= cutoff;
    });
  }, [moodEntries, timeRange]);

  const retryAll = () => Promise.all([moodsQuery.refetch(), journalsQuery.refetch(), goalsQuery.refetch(), exercisesQuery.refetch()]);
  const tabClass = 'min-h-11 min-w-0 whitespace-normal rounded-xl px-2 py-2 text-xs sm:text-sm leading-tight text-muted-foreground data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm';

  return (
    <PullToRefresh queryKeys={queryKeys}>
      <main className="mx-auto min-h-[100dvh] w-full max-w-7xl p-3 pb-28 sm:p-5 sm:pb-28 lg:p-8 lg:pb-24" data-testid="progress-page">
        <header className="mb-5 mt-2 sm:mb-7">
          <div className="flex items-start gap-3">
            <Button variant="ghost" size="icon" onClick={() => window.history.back()} className="min-h-11 min-w-11 shrink-0 rounded-full" aria-label={t('common.go_back_aria')}>
              <svg className="rtl:scale-x-[-1]" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
            </Button>
            <div className="min-w-0"><div className="botanical-title-row"><h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold break-words text-foreground">{t('progress.page_title')}</h1><BotanicalAccent variant="leaves" className="botanical-title-art" /></div><p className="mt-1 text-sm sm:text-base text-muted-foreground break-words">{t('progress.page_subtitle_full')}</p></div>
          </div>
        </header>

        {isLoading ? <div className="flex min-h-[320px] items-center justify-center gap-2 text-muted-foreground" aria-live="polite"><Loader2 className="h-5 w-5 animate-spin" />{t('progress_ui.common.loading')}</div> :
        isError ? <div className="rounded-2xl border border-destructive/30 bg-card p-6 text-center shadow-sm"><AlertCircle className="mx-auto mb-3 h-9 w-9 text-destructive" /><p className="mb-4 text-foreground">{t('progress_ui.common.load_error')}</p><Button variant="outline" onClick={retryAll}>{t('progress_ui.common.retry')}</Button></div> :
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="garden-progress-tabs mb-5 grid h-auto w-full grid-cols-2 gap-1 rounded-2xl bg-secondary/70 p-1 min-[480px]:grid-cols-3 sm:grid-cols-6" aria-label={t('progress.page_title')}>
            <TabsTrigger value="overview" className={tabClass}><LayoutDashboard className="h-4 w-4 shrink-0" />{t('progress.tabs.overview')}</TabsTrigger>
            <TabsTrigger value="achievements" className={tabClass}><Trophy className="h-4 w-4 shrink-0" />{t('progress.tabs.achievements')}</TabsTrigger>
            <TabsTrigger value="mood" className={tabClass}><TrendingUp className="h-4 w-4 shrink-0" />{t('progress.tabs.mood')}</TabsTrigger>
            <TabsTrigger value="goals" className={tabClass}><Target className="h-4 w-4 shrink-0" />{t('progress.tabs.goals')}</TabsTrigger>
            <TabsTrigger value="exercises" className={tabClass}><Dumbbell className="h-4 w-4 shrink-0" />{t('progress.tabs.exercises')}</TabsTrigger>
            <TabsTrigger value="health" className={tabClass}><HeartPulse className="h-4 w-4 shrink-0" />{t('progress.tabs.health')}</TabsTrigger>
          </TabsList>

          <TabsContent value="overview"><EnhancedProgressDashboard moodEntries={moodEntries} journalEntries={journalEntries} goals={goals} exercises={exercises} /></TabsContent>
          <TabsContent value="achievements"><GamificationHub /></TabsContent>
          <TabsContent value="mood"><Card className="border border-border/80 bg-card shadow-[var(--shadow-md)] overflow-hidden"><CardHeader className="p-4 sm:p-6"><div className="flex flex-col md:flex-row md:items-center justify-between gap-4"><CardTitle className="flex items-center gap-2 text-foreground"><TrendingUp className="h-5 w-5 text-primary" />{t('mood_tracker.mood_trends')}</CardTitle><Tabs value={timeRange} onValueChange={setTimeRange}><TabsList className="grid h-auto grid-cols-3"><TabsTrigger value="7" className="min-h-11 text-xs sm:text-sm">{t('mood_tracker.time_range.7_days')}</TabsTrigger><TabsTrigger value="14" className="min-h-11 text-xs sm:text-sm">{t('mood_tracker.time_range.14_days')}</TabsTrigger><TabsTrigger value="30" className="min-h-11 text-xs sm:text-sm">{t('mood_tracker.time_range.30_days')}</TabsTrigger></TabsList></Tabs></div></CardHeader><CardContent className="p-4 sm:p-6">{filteredMoodEntries.length === 0 ? <div className="flex min-h-64 items-center justify-center"><div className="text-center"><Calendar className="mx-auto mb-3 h-12 w-12 text-primary/30" /><p className="text-muted-foreground">{t('mood_tracker.no_data')}</p><p className="mt-1 text-sm text-muted-foreground/80">{t('mood_tracker.no_data_subtitle')}</p></div></div> : <EnhancedMoodChart data={filteredMoodEntries} />}</CardContent></Card></TabsContent>
          <TabsContent value="goals"><GoalsProgressTracker goals={goals} /></TabsContent>
          <TabsContent value="exercises"><ExerciseTracker exercises={exercises} /></TabsContent>
          <TabsContent value="health"><Card className="border border-border/80 bg-card shadow-[var(--shadow-md)] overflow-hidden"><CardHeader className="p-4 sm:p-6"><CardTitle className="flex items-center gap-2 text-foreground"><Activity className="h-5 w-5 text-primary" />{t('progress.health_wellness')}</CardTitle></CardHeader><CardContent className="p-4 sm:p-6"><HealthDashboard /></CardContent></Card></TabsContent>
        </Tabs>}

        {!isLoading && !isError && <ProgressDataPanel moodEntries={moodEntries} journalEntries={journalEntries} goals={goals} exercises={exercises} />}

        {!isLoading && !isError && <section className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2" aria-label={t('progress_ui.insights.title')}><InsightsPanel moodEntries={filteredMoodEntries} journalEntries={journalEntries} /><CorrelationInsights moodEntries={moodEntries} journalEntries={journalEntries} exercises={exercises} /></section>}
      </main>
    </PullToRefresh>
  );
}
