import BotanicalAccent from '@/components/brand/BotanicalAccent';
import React, { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import JourneyCard from '../components/journeys/JourneyCard';
import JourneyDetail from '../components/journeys/JourneyDetail';
import { groupJourneysByProgress } from '../components/journeys/journeyUtils';
import { localizeJourneys } from '../components/journeys/journeyContentLocalization';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Compass,
  Loader2,
  Map,
  Route,
  Sparkles,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import PullToRefresh from '../components/utils/PullToRefresh';
import { getStage11Copy } from '../components/i18n/stage11UiCopy.js';

function JourneyEmptyState({ icon: Icon, title, description }) {
  return (
    <div className="rounded-[28px] border border-dashed border-border bg-[hsl(var(--card)/0.97)] px-5 py-12 text-center shadow-sm">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary/70 text-primary">
        <Icon className="h-7 w-7" aria-hidden="true" />
      </span>
      <h3 className="mt-4 text-lg font-bold text-foreground">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  );
}

function JourneyGrid({ journeys, progressMap, onStart, onContinue, onView, onRestart, onRemove, startingJourneyId, managingProgressId }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3" data-testid="journeys-grid">
      {journeys.map((journey) => (
        <JourneyCard
          key={journey.id}
          journey={journey}
          progress={progressMap[journey.id]}
          onStart={onStart}
          onContinue={onContinue}
          onView={onView}
          onRestart={onRestart}
          onRemove={onRemove}
          isStarting={startingJourneyId === journey.id}
          isManaging={managingProgressId === progressMap[journey.id]?.id}
        />
      ))}
    </div>
  );
}

export default function JourneysPage() {
  const { t, i18n } = useTranslation();
  const copy = getStage11Copy(i18n.resolvedLanguage || i18n.language);
  const [selectedJourney, setSelectedJourney] = useState(null);
  const [selectedProgress, setSelectedProgress] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [activeTab, setActiveTab] = useState('available');
  const [actionError, setActionError] = useState('');
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const journeysQuery = useQuery({
    queryKey: ['journeys'],
    queryFn: () => base44.entities.Journey.filter({ is_active: true }),
  });

  const progressQuery = useQuery({
    queryKey: ['journey_progress'],
    queryFn: () => base44.entities.UserJourneyProgress.list(),
  });

  const rawJourneys = journeysQuery.data || [];
  const journeys = useMemo(
    () => localizeJourneys(rawJourneys, i18n.resolvedLanguage || i18n.language),
    [rawJourneys, i18n.resolvedLanguage, i18n.language]
  );
  const progressList = progressQuery.data || [];
  const groupedJourneys = useMemo(
    () => groupJourneysByProgress(journeys, progressList),
    [journeys, progressList]
  );

  const startJourneyMutation = useMutation({
    mutationFn: async (journey) => base44.entities.UserJourneyProgress.create({
      journey_id: journey.id,
      journey_title: journey.title,
      status: 'in_progress',
      started_date: new Date().toISOString().split('T')[0],
      current_step: 0,
      completed_steps: [],
      total_steps: journey.steps?.length || 0,
    }),
    onMutate: async (journey) => {
      await queryClient.cancelQueries({ queryKey: ['journey_progress'] });
      const previous = queryClient.getQueryData(['journey_progress']);
      const optimisticId = `optimistic-journey-${journey.id}-${Date.now()}`;
      const optimisticProgress = {
        id: optimisticId,
        journey_id: journey.id,
        journey_title: journey.title,
        status: 'in_progress',
        started_date: new Date().toISOString().split('T')[0],
        current_step: 0,
        completed_steps: [],
        total_steps: journey.steps?.length || 0,
      };
      queryClient.setQueryData(['journey_progress'], (current = []) => [
        ...current.filter((item) => item.journey_id !== journey.id),
        optimisticProgress,
      ]);
      return { previous, optimisticId };
    },
    onError: (_error, _journey, context) => {
      if (context) queryClient.setQueryData(['journey_progress'], context.previous || []);
    },
    onSuccess: (createdProgress, _journey, context) => {
      queryClient.setQueryData(['journey_progress'], (current = []) => [
        ...current.filter((item) =>
          item.id !== context?.optimisticId && item.journey_id !== createdProgress.journey_id
        ),
        createdProgress,
      ]);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['journey_progress'] }),
  });

  const handleStartJourney = async (journey) => {
    setActionError('');
    try {
      const createdProgress = await startJourneyMutation.mutateAsync(journey);
      setSelectedJourney(journey);
      setSelectedProgress(createdProgress);
      setActiveTab('in-progress');
      setShowDetail(true);
    } catch {
      setActionError(t('journeys.premium.start_error'));
    }
  };

  const openJourney = (journey, progress) => {
    setActionError('');
    setSelectedJourney(journey);
    setSelectedProgress(progress || null);
    setShowDetail(true);
  };

  const manageJourneyMutation = useMutation({
    mutationFn: async ({ action, progress }) => {
      if (!progress?.id) return;
      if (action === 'restart') {
        return base44.entities.UserJourneyProgress.update(progress.id, {
          status: 'in_progress',
          started_date: new Date().toISOString().split('T')[0],
          current_step: 0,
          completed_steps: []
        });
      }
      await base44.entities.UserJourneyProgress.delete(progress.id);
      return null;
    },
    onSuccess: (nextProgress, { action, progress }) => {
      queryClient.setQueryData(['journey_progress'], (current = []) => action === 'remove'
        ? current.filter((item) => item.id !== progress.id)
        : current.map((item) => item.id === progress.id ? nextProgress : item));
      if (selectedProgress?.id === progress.id) {
        if (action === 'remove') {
          setShowDetail(false);
          setSelectedProgress(null);
        } else {
          setSelectedProgress(nextProgress);
        }
      }
      setActiveTab(action === 'remove' ? 'available' : 'in-progress');
      queryClient.invalidateQueries({ queryKey: ['journey_progress'] });
    },
    onError: () => setActionError(copy.journey.actionError)
  });

  const handleRestartJourney = (journey, progress) => {
    if (window.confirm(copy.journey.restartConfirm)) {
      setActionError('');
      manageJourneyMutation.mutate({ action: 'restart', journey, progress });
    }
  };

  const handleRemoveJourney = (journey, progress) => {
    if (window.confirm(copy.journey.removeConfirm)) {
      setActionError('');
      manageJourneyMutation.mutate({ action: 'remove', journey, progress });
    }
  };

  const handleProgressChange = (nextProgress) => {
    setSelectedProgress(nextProgress);
    queryClient.setQueryData(['journey_progress'], (current = []) => [
      ...current.filter((item) => item.id !== nextProgress.id),
      nextProgress,
    ]);
  };

  const handlePlayGame = (gameSlug) => {
    if (!gameSlug) return;
    navigate(createPageUrl('ExperientialGames') + '?game=' + encodeURIComponent(gameSlug));
  };

  const refreshJourneys = () => Promise.all([
    journeysQuery.refetch(),
    progressQuery.refetch(),
  ]);

  const isLoading = journeysQuery.isLoading || progressQuery.isLoading;
  const hasLoadError = journeysQuery.isError || progressQuery.isError;

  return (
    <PullToRefresh queryKeys={['journeys', 'journey_progress']}>
      <div
        className="min-h-dvh overflow-x-hidden bg-transparent"
        data-testid="journeys-page"
      >
        <main className="mx-auto w-full max-w-6xl px-4 pb-[calc(2rem+env(safe-area-inset-bottom,0px))] pt-4 sm:px-6 sm:pt-6">
          <section className="relative mb-6 overflow-hidden rounded-[30px] border border-border/70 bg-[hsl(var(--card)/0.97)] p-5 shadow-[0_24px_60px_rgba(42,103,91,0.13)] backdrop-blur-xl sm:p-8">

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
              className="relative mb-5 h-12 w-12 rounded-2xl border border-border bg-[hsl(var(--card)/0.97)] text-primary shadow-sm hover:bg-[hsl(var(--card)/0.97)]"
              aria-label={t('journeys.premium.back_aria')}
              data-testid="journeys-back"
            >
              <ArrowLeft className="h-5 w-5 rtl:rotate-180" aria-hidden="true" />
            </Button>

            <div className="relative grid items-end gap-6 lg:grid-cols-[1fr_auto]">
              <div className="min-w-0">
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-primary">
                  {t('journeys.premium.eyebrow')}
                </p>
                <div className="mb-3 flex min-w-0 items-center gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-700 text-white shadow-[0_12px_24px_rgba(13,148,136,0.24)]">
                    <Compass className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <div className="botanical-title-row"><h1 className="min-w-0 break-words text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl">
                    {t('journeys.page_title')}
                  </h1><BotanicalAccent variant="route" className="botanical-title-art" /></div>
                </div>
                <p className="max-w-3xl break-words text-sm leading-7 text-muted-foreground sm:text-base">
                  {t('journeys.premium.hero_description')}
                </p>
              </div>

              {!isLoading && !hasLoadError && (
                <div className="grid grid-cols-3 gap-2" aria-label={t('journeys.premium.summary_aria')}>
                  {[
                    [groupedJourneys.available.length, t('journeys.premium.stat_available')],
                    [groupedJourneys.inProgress.length, t('journeys.premium.stat_active')],
                    [groupedJourneys.completed.length, t('journeys.premium.stat_completed')],
                  ].map(([value, label]) => (
                    <div key={label} className="min-w-[78px] rounded-2xl border border-border bg-[hsl(var(--card)/0.97)] px-3 py-3 text-center shadow-sm">
                      <strong className="block text-xl font-bold text-primary">{value}</strong>
                      <span className="mt-0.5 block text-[11px] font-semibold leading-4 text-muted-foreground">{label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {actionError && (
            <div className="mb-5 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50/90 p-4 text-sm text-rose-800" role="alert">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
              <span>{actionError}</span>
            </div>
          )}

          {isLoading ? (
            <div className="flex min-h-[280px] flex-col items-center justify-center rounded-[28px] border border-border/70 bg-[hsl(var(--card)/0.97)] text-primary shadow-sm" data-testid="journeys-loading">
              <Loader2 className="mb-4 h-8 w-8 animate-spin" aria-hidden="true" />
              <p className="text-sm font-semibold">{t('journeys.premium.loading')}</p>
            </div>
          ) : hasLoadError ? (
            <div className="rounded-[28px] border border-rose-200/80 bg-[hsl(var(--card)/0.97)] px-5 py-12 text-center shadow-sm" role="alert" data-testid="journeys-error">
              <AlertCircle className="mx-auto h-10 w-10 text-rose-500" aria-hidden="true" />
              <h2 className="mt-4 text-xl font-bold text-foreground">{t('journeys.premium.load_error_title')}</h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">{t('journeys.premium.load_error_description')}</p>
              <Button onClick={refreshJourneys} className="mt-5 min-h-12 rounded-2xl bg-primary px-6 text-primary-foreground hover:bg-primary">
                {t('journeys.premium.retry')}
              </Button>
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full" data-testid="journeys-tabs">
              <TabsList
                className="mb-6 grid h-auto w-full grid-cols-3 gap-1 rounded-2xl border-border/70 bg-[hsl(var(--card)/0.97)] p-1.5 shadow-sm"
                aria-label={t('journeys.page_title')}
              >
                <TabsTrigger value="available" className="min-h-12 min-w-0 rounded-xl px-2 text-xs sm:text-sm" data-testid="journeys-tab-available">
                  <span className="truncate">{t('journeys.tabs.available')}</span>
                  <span className="ms-1 rounded-full bg-teal-900/8 px-1.5 py-0.5 text-[11px]">{groupedJourneys.available.length}</span>
                </TabsTrigger>
                <TabsTrigger value="in-progress" className="min-h-12 min-w-0 rounded-xl px-2 text-xs sm:text-sm" data-testid="journeys-tab-in-progress">
                  <span className="truncate">{t('journeys.tabs.in_progress')}</span>
                  <span className="ms-1 rounded-full bg-teal-900/8 px-1.5 py-0.5 text-[11px]">{groupedJourneys.inProgress.length}</span>
                </TabsTrigger>
                <TabsTrigger value="completed" className="min-h-12 min-w-0 rounded-xl px-2 text-xs sm:text-sm" data-testid="journeys-tab-completed">
                  <span className="truncate">{t('journeys.tabs.completed')}</span>
                  <span className="ms-1 rounded-full bg-teal-900/8 px-1.5 py-0.5 text-[11px]">{groupedJourneys.completed.length}</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="available" className="mt-0">
                {groupedJourneys.available.length > 0 ? (
                  <JourneyGrid
                    journeys={groupedJourneys.available}
                    progressMap={groupedJourneys.progressMap}
                    onStart={handleStartJourney}
                    onContinue={openJourney}
                    onView={openJourney}
                    startingJourneyId={startJourneyMutation.variables?.id}
                    onRestart={handleRestartJourney}
                    onRemove={handleRemoveJourney}
                    managingProgressId={manageJourneyMutation.variables?.progress?.id}
                  />
                ) : (
                  <JourneyEmptyState icon={Map} title={t('journeys.empty_state.no_available')} description={t('journeys.premium.empty_available_description')} />
                )}
              </TabsContent>

              <TabsContent value="in-progress" className="mt-0">
                {groupedJourneys.inProgress.length > 0 ? (
                  <JourneyGrid
                    journeys={groupedJourneys.inProgress}
                    progressMap={groupedJourneys.progressMap}
                    onStart={handleStartJourney}
                    onContinue={openJourney}
                    onView={openJourney}
                    onRestart={handleRestartJourney}
                    onRemove={handleRemoveJourney}
                    managingProgressId={manageJourneyMutation.variables?.progress?.id}
                  />
                ) : (
                  <JourneyEmptyState icon={Route} title={t('journeys.empty_state.no_in_progress')} description={t('journeys.premium.empty_active_description')} />
                )}
              </TabsContent>

              <TabsContent value="completed" className="mt-0">
                {groupedJourneys.completed.length > 0 ? (
                  <JourneyGrid
                    journeys={groupedJourneys.completed}
                    progressMap={groupedJourneys.progressMap}
                    onStart={handleStartJourney}
                    onContinue={openJourney}
                    onView={openJourney}
                    onRestart={handleRestartJourney}
                    onRemove={handleRemoveJourney}
                    managingProgressId={manageJourneyMutation.variables?.progress?.id}
                  />
                ) : (
                  <JourneyEmptyState icon={CheckCircle2} title={t('journeys.empty_state.no_completed')} description={t('journeys.premium.empty_completed_description')} />
                )}
              </TabsContent>
            </Tabs>
          )}

          <div className="mt-6 flex items-center justify-center gap-2 text-xs font-medium text-primary">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            <span>{t('journeys.premium.gentle_pace')}</span>
          </div>

          <Dialog open={showDetail} onOpenChange={setShowDetail}>
            <DialogContent
              closeLabel={t('journeys.detail.close_aria')}
              className="max-h-[calc(100dvh-0.5rem)] w-full max-w-4xl overflow-hidden border-border/70 bg-[hsl(var(--card)/0.97)] p-0 sm:max-h-[calc(100vh-2rem)] sm:w-[calc(100%-2rem)] sm:rounded-[30px]"
              data-testid="journey-detail-dialog"
            >
              {selectedJourney && (
                <JourneyDetail
                  journey={selectedJourney}
                  progress={selectedProgress}
                  onClose={() => setShowDetail(false)}
                  onPlayGame={handlePlayGame}
                  onProgressChange={handleProgressChange}
                />
              )}
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </PullToRefresh>
  );
}
