import BotanicalAccent from '@/components/brand/BotanicalAccent';
import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles, BookOpen, Target, CirclePlay } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import HomeDailyCheckIn from '../components/home/HomeDailyCheckIn';
import { loadRecommendedExercise } from '@/lib/homeDailyCheckIn';
import { localizeExercise } from '@/components/exercises/exerciseLocalization';
import QuickActions from '../components/home/QuickActions';
import WelcomeWizard from '../components/onboarding/WelcomeWizard';
import StreakWidget from '../components/gamification/StreakWidget';
import BadgeDisplay from '../components/gamification/BadgeDisplay';
import DailyPath from '../components/home/DailyPath';
import DailyReflection from '../components/home/DailyReflection';
import DailyRecordsDialog from '../components/home/DailyRecordsDialog';
import ExerciseDetail from '../components/exercises/ExerciseDetail';
import VideoModal from '../components/home/VideoModal';
import GoalsDashboardWidget from '../components/goals/GoalsDashboardWidget';
import PullToRefresh from '../components/utils/PullToRefresh';
import { beginTimeToFirstValue, completeTimeToFirstValue } from '@/lib/timeToFirstValue.js';

export default function Home() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [showMoodCheckIn, setShowMoodCheckIn] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showReflection, setShowReflection] = useState(false);
  const [showDailyRecords, setShowDailyRecords] = useState(false);
  const [showExercise, setShowExercise] = useState(false);
  const [showGoalsVideo, setShowGoalsVideo] = useState(false);
  const [showJournalVideo, setShowJournalVideo] = useState(false);
  const queryClient = useQueryClient();
  const savedCompletion = useRef(null);

  useEffect(() => {
    // Use sessionStorage cache from Layout.js if available
    const cached = sessionStorage.getItem('user_prefs_loaded');
    if (cached) {
      try {
        const { name, onboarding_completed } = JSON.parse(cached);
        if (name) setUser({ full_name: name });
        if (onboarding_completed === false) setShowOnboarding(true);
      } catch (_) {}
    }
    base44.auth.me().then((userData) => {
      setUser(userData);
      if (!userData.onboarding_completed) {
        setShowOnboarding(true);
      }
      // Update cache with onboarding status
      try {
        const prev = JSON.parse(sessionStorage.getItem('user_prefs_loaded') || '{}');
        sessionStorage.setItem('user_prefs_loaded', JSON.stringify({
          ...prev,
          name: userData.full_name,
          onboarding_completed: userData.onboarding_completed
        }));
      } catch (_) {}
    }).catch(() => {});
  }, []);

  const { data: todayMood, isError: moodError, refetch: refetchMood } = useQuery({
    queryKey: ['todayMood'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const moods = await base44.entities.MoodEntry.filter({ date: today }, '-created_date', 1);
      return moods[0] || null;
    },
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false
  });

  const { data: recentGoals, isError: goalsError, refetch: refetchGoals } = useQuery({
    queryKey: ['recentGoals'],
    queryFn: () => base44.entities.Goal.filter({ status: 'active' }, '-created_date', 3),
    initialData: [],
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false
  });

  // Combined query for journal data - fetch recent entries and use for both count and latest
  const { data: recentJournals, isError: journalsError, refetch: refetchJournals } = useQuery({
    queryKey: ['recentJournals'],
    queryFn: async () => {
      const entries = await base44.entities.ThoughtJournal.list('-created_date', 10);
      return entries;
    },
    initialData: [],
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false
  });

  // Derive values from combined query
  const latestGoal = recentGoals[0] || null;
  const journalCount = recentJournals.length;
  const latestJournalEntry = recentJournals[0] || null;
  const savedEntryId = latestJournalEntry ? latestJournalEntry.id : null;

  // Get today's flow
  const { data: todayFlow, isLoading: flowLoading, isError: flowError, refetch: refetchFlow } = useQuery({
    queryKey: ['todayFlow'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const flows = await base44.entities.DailyFlow.filter({ date: today }, '-created_date', 1);
      return flows[0] || null;
    },
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false
  });

  // Get today's exercise
  const { data: todayExerciseData, isLoading: exerciseLoading, isError: exerciseError, refetch: refetchExercise } = useQuery({
    queryKey: ['todayExercise', todayFlow?.exercise_id],
    queryFn: async () => {
      if (!todayFlow?.exercise_id) return null;
      return loadRecommendedExercise(base44, todayFlow.exercise_id);
    },
    enabled: !!todayFlow?.exercise_id
  });

  const todayExercise = todayExerciseData ? localizeExercise(todayExerciseData, i18n.resolvedLanguage || i18n.language) : null;

  useEffect(() => {
    if (!showExercise || !todayExercise) return;
    completeTimeToFirstValue({
      valueType: 'exercise_opened',
      locale: i18n.language || 'en',
    });
  }, [i18n.language, showExercise, todayExercise]);

  const favoriteMutation = useMutation({
    mutationFn: (exercise) => base44.entities.Exercise.update(exercise.id, { favorite: !exercise.favorite }),
    onMutate: async (exercise) => {
      const key = ['todayExercise', exercise.id];
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData(key);
      queryClient.setQueryData(key, { ...exercise, favorite: !exercise.favorite });
      return { key, previous };
    },
    onError: (_error, _exercise, context) => {
      if (context) queryClient.setQueryData(context.key, context.previous);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] });
      queryClient.invalidateQueries({ queryKey: ['allExercises'] });
    }
  });

  const handleStartCheckIn = () => {
    beginTimeToFirstValue({
      entryPoint: 'home_daily_checkin',
      valueType: 'checkin_saved',
      locale: i18n.language || 'en',
      restart: true,
    });
    setShowMoodCheckIn(true);
  };

  const handleStartExercise = () => {
    beginTimeToFirstValue({
      entryPoint: 'home_guided_exercise',
      valueType: 'exercise_opened',
      locale: i18n.language || 'en',
      restart: true,
    });
    setShowExercise(true);
  };

  const handleExerciseComplete = async (duration) => {
    const completionKey = `${todayFlow?.id}:${todayExercise?.id}`;
    if (todayExercise && !todayFlow?.exercise_completed && savedCompletion.current !== completionKey) {
      await base44.entities.Exercise.update(todayExercise.id, {
        completed_count: (todayExercise.completed_count || 0) + 1,
        last_completed: new Date().toISOString(),
        total_time_practiced: (todayExercise.total_time_practiced || 0) + (duration || 0),
      });
      // Keep a successful progress write across a failed flow update/retry in
      // this dialog so clicking retry does not count the same practice twice.
      savedCompletion.current = completionKey;
      queryClient.invalidateQueries({ queryKey: ['todayExercise'] });
    }
    if (todayFlow) {
      await base44.entities.DailyFlow.update(todayFlow.id, {
        exercise_completed: true,
        exercise_time: new Date().toISOString()
      });
      queryClient.invalidateQueries({ queryKey: ['todayFlow'] });
    }
    setShowExercise(false);
    setShowReflection(true);
  };

  const handleStartReflection = () => {
    setShowReflection(true);
  };

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('home.greeting.morning');
    if (hour < 18) return t('home.greeting.afternoon');
    return t('home.greeting.evening');
  };

  return (
    <PullToRefresh queryKeys={['recentGoals', 'recentJournals', 'todayFlow', 'todayMood', 'todayExercise']}>
      <div className="relative w-full min-h-[100dvh] overflow-hidden">
        <div className="mx-auto pb-24 page-container relative z-10 max-w-5xl w-full">
        {/* Header */}
        <div className="botanical-home-hero mb-5 rounded-[32px] border border-border/60 bg-card/95 p-6 shadow-[var(--shadow-md)] md:p-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-foreground mb-3 text-2xl font-semibold md:text-3xl [overflow-wrap:anywhere]">
                {greeting()}{user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}
              </h1>
              <div className="bg-secondary/70 text-secondary-foreground px-3 py-1 text-xs font-medium rounded-full inline-flex items-center gap-2 border border-border/60">
                <Sparkles className="w-3.5 h-3.5" />
                {t('home.oasis_label')}
              </div>
            </div>
            <BotanicalAccent variant="leaves" className="botanical-home-hero-art" />
          </div>
        </div>

        {(moodError || goalsError || journalsError || flowError || exerciseError) && (
          <div role="alert" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 text-foreground">
            <p className="text-sm">{t('home_practice.load_error')}</p>
            <Button variant="outline" size="sm" onClick={() => {
              if (moodError) refetchMood();
              if (goalsError) refetchGoals();
              if (journalsError) refetchJournals();
              if (flowError) refetchFlow();
              if (exerciseError) refetchExercise();
            }}>{t('common.retry')}</Button>
          </div>
        )}

        {/* Stage B: one calm daily path with three primary choices */}
        <div className="mb-8">
          <DailyPath
            checkInComplete={Boolean(todayMood || todayFlow?.check_in_completed)}
            exerciseComplete={Boolean(todayFlow?.exercise_completed)}
            hasRecommendedExercise={Boolean(todayExercise)}
            isRecommendationLoading={flowLoading || exerciseLoading}
            onCheckIn={handleStartCheckIn}
            onCoach={() => navigate(createPageUrl('Coach'))}
            onExercise={() => todayExercise ? handleStartExercise() : navigate('/Exercises')}
          />
        </div>

        <section className="mb-8 flex flex-col gap-4 rounded-[24px] border border-border bg-card p-5 text-foreground shadow-[var(--shadow-sm)] sm:flex-row sm:items-center sm:justify-between" aria-labelledby="daily-records-heading">
          <div className="min-w-0">
            <h2 id="daily-records-heading" className="flex items-center gap-2 text-lg font-semibold"><BookOpen className="h-5 w-5 shrink-0 text-primary" />{t('home_practice.records.title')}</h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">{t('home_practice.records.storage')}</p>
          </div>
          <Button variant="outline" className="h-auto shrink-0 whitespace-normal" disabled={!user?.email} onClick={() => setShowDailyRecords(true)} data-testid="open-daily-records">{t('home_practice.records.open')}</Button>
        </section>

          {/* Secondary Content - Progress Context */}
        <div className="hidden bg-secondary/70 text-emerald-200 p-4 rounded-[40px] space-y-5 border border-[rgba(125,173,160,0.24)] md:p-5 shadow-[0_20px_52px_rgba(68,108,96,0.08)] backdrop-blur-[10px]">
        
        {/* Goals Dashboard Widget */}
        <GoalsDashboardWidget />
        
        {/* Quick Stats */}
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <div className="relative overflow-hidden rounded-[28px] border border-[rgba(116,169,154,0.34)] bg-[linear-gradient(180deg,rgba(255,253,250,0.98)_0%,rgba(227,244,238,0.96)_100%)] p-5 text-center shadow-[0_24px_54px_rgba(68,108,96,0.14),0_8px_18px_rgba(68,108,96,0.08)]">
            <div className="flex items-center justify-center gap-2 mb-1">
              {latestGoal &&
                  <Link to={createPageUrl('Goals', `goal=${latestGoal.id}`)}>
                  <Button
                      size="icon"
                      variant="ghost"
                      className="p-0 h-8 w-8 hover:bg-secondary/80 text-primary flex items-center justify-center rounded-full bg-secondary"
                      aria-label={t('home.aria.view_goal_details')} mobileLabel={t('home.aria.view_goal_details')}>

                    <Target className="w-4 h-4" />
                  </Button>
                </Link>
                  }
              <p className="text-primary text-2xl font-bold">{recentGoals.length}</p>
            </div>
            <div className="flex items-center justify-center gap-2">
              <p className="text-primary text-xs">{t('home.active_goals')}</p>
            </div>
            <Button
                  onClick={() => setShowGoalsVideo(true)}
                  size="icon"
                  variant="ghost" className="mt-2 mx-auto flex h-12 w-12 min-h-[48px] min-w-[48px] items-center justify-center rounded-2xl border border-border bg-[hsl(var(--card)/0.97)] p-0 text-primary shadow-sm transition hover:-translate-y-0.5 hover:bg-[hsl(var(--card)/0.97)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"

                  title={t('home.aria.watch_help_video')}
                  aria-label={t('home.aria.watch_goals_help_video')} mobileLabelKey="video">

              <CirclePlay className="h-6 w-6" strokeWidth={2.2} />
            </Button>
          </div>
          <div className="relative overflow-hidden rounded-[28px] border border-[rgba(116,169,154,0.3)] bg-[linear-gradient(180deg,rgba(252,248,241,0.98)_0%,rgba(232,246,241,0.96)_100%)] p-5 text-center shadow-[0_24px_54px_rgba(68,108,96,0.14),0_8px_18px_rgba(68,108,96,0.08)]">
            <div className="text-primary mb-1 flex items-center justify-center gap-2">
              {savedEntryId &&
                  <Link to={createPageUrl('Journal', `entry=${savedEntryId}`)}>
                  <Button
                      size="icon"
                      variant="ghost"
                      className="p-0 h-8 w-8 hover:bg-secondary/80 text-primary flex items-center justify-center rounded-full bg-secondary"
                      aria-label={t('home.aria.view_journal_entry')} mobileLabelKey="details">

                    <BookOpen className="text-primary lucide lucide-book-open w-4 h-4" />
                  </Button>
                </Link>
                  }
              <p className="text-primary text-2xl font-bold">{journalCount}</p>
            </div>
            <div className="flex items-center justify-center gap-2">
              <p className="text-primary text-xs">{t('home.journal_entries')}</p>
            </div>
            <Button
                  onClick={() => setShowJournalVideo(true)}
                  size="icon"
                  variant="ghost" className="mt-2 mx-auto flex h-12 w-12 min-h-[48px] min-w-[48px] items-center justify-center rounded-2xl border border-border bg-[hsl(var(--card)/0.97)] p-0 text-primary shadow-sm transition hover:-translate-y-0.5 hover:bg-[hsl(var(--card)/0.97)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"

                  title={t('home.aria.watch_help_video')}
                  aria-label={t('home.aria.watch_journal_help_video')} mobileLabelKey="video">

              <CirclePlay className="h-6 w-6" strokeWidth={2.2} />
            </Button>
          </div>
          <StreakWidget compact />
          <BadgeDisplay compact />
        </div>

        {(goalsError || journalsError) &&
            <div className="mt-6 space-y-3">
            {/* Error State for Goals */}
            {goalsError &&
              <Card className="border border-destructive/20 bg-destructive/5">
                <CardContent className="p-4 text-center space-y-3">
                  <p className="text-sm text-foreground">{t('home.error.goals_load')}</p>
                  <Button
                    onClick={() => refetchGoals()}
                    size="sm"
                    variant="outline"
                    className="text-xs">
                    {t('common.retry')}
                  </Button>
                </CardContent>
              </Card>
              }

            {/* Error State for Journal */}
            {journalsError &&
              <Card className="border border-destructive/20 bg-destructive/5">
                <CardContent className="p-4 text-center space-y-3">
                  <p className="text-sm text-foreground">{t('home.error.journal_load')}</p>
                  <Button
                    onClick={() => refetchJournals()}
                    size="sm"
                    variant="outline"
                    className="text-xs">
                    {t('common.retry')}
                  </Button>
                </CardContent>
              </Card>
              }
          </div>
            }

        </div>

        {/* Supporting Actions */}
        <div className="hidden bg-secondary/70 mt-8 p-4 rounded-[64px] border border-[rgba(116,169,154,0.28)] md:p-5 shadow-[0_24px_58px_rgba(68,108,96,0.12),0_8px_22px_rgba(68,108,96,0.07)] backdrop-blur-[12px]">
          <QuickActions />
        </div>

      {showDailyRecords && <DailyRecordsDialog userKey={user?.id || user?.email} onClose={() => setShowDailyRecords(false)} onEditCheckIn={() => setShowMoodCheckIn(true)} />}

      {/* Mood Check-in Modal */}
      {showMoodCheckIn &&
          <HomeDailyCheckIn initialMood={todayMood} onClose={() => setShowMoodCheckIn(false)} />
          }

      {/* Exercise Modal */}
      {showExercise && todayExercise &&
          <ExerciseDetail
            exercise={todayExercise}
            onClose={() => setShowExercise(false)}
            onComplete={handleExerciseComplete}
            favoritePending={favoriteMutation.isPending}
            favoriteError={favoriteMutation.isError}
            onToggleFavorite={(exercise) => { if (!favoriteMutation.isPending) favoriteMutation.mutate(exercise); }} />

          }

      {/* Reflection Modal */}
      {showReflection &&
          <DailyReflection
            todayFlow={todayFlow}
            exercise={todayExercise}
            onClose={() => setShowReflection(false)} />

          }

      {/* Onboarding Wizard */}
      {showOnboarding &&
          <WelcomeWizard
            onComplete={() => {
              setShowOnboarding(false);
              queryClient.invalidateQueries({ queryKey: ['currentUser'] });
            }} />

          }

      {/* Video Modals */}
      {showGoalsVideo &&
          <VideoModal
            videoUrl="https://firebasestorage.googleapis.com/v0/b/my-cbt-therapy.firebasestorage.app/o/Active%20Goals.mp4?alt=media&token=6679fb6d-1312-4742-b569-eb32053d5100"
            onClose={() => setShowGoalsVideo(false)} />

          }
      {showJournalVideo &&
          <VideoModal
            videoUrl="https://firebasestorage.googleapis.com/v0/b/my-cbt-therapy.firebasestorage.app/o/Journal%20Entries.mp4?alt=media&token=f919537a-0f47-4696-a532-f81e1768a7b8"
            onClose={() => setShowJournalVideo(false)} />

          }
        </div>
      </div>
    </PullToRefresh>);

}
