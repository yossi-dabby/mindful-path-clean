import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  AlertCircle,
  ArrowRight,
  Check,
  ChevronDown,
  CirclePlay,
  RefreshCw,
  Route,
  ShieldCheck,
  Sparkles
} from 'lucide-react';

import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { createPageUrl } from '../../utils';

const TOTAL_DAYS = 7;

function clampDay(value) {
  const numericDay = Number(value);
  if (!Number.isFinite(numericDay)) return 0;
  return Math.min(TOTAL_DAYS, Math.max(0, Math.round(numericDay)));
}

export default function StarterPathQuickAction({ onWatchVideo }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const {
    data: starterPath,
    isLoading,
    isError
  } = useQuery({
    queryKey: ['starterPath'],
    queryFn: async () => {
      const paths = await base44.entities.StarterPath.list('-created_date', 1);
      return paths[0] || null;
    },
    staleTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false
  });

  const startPathMutation = useMutation({
    mutationFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      return base44.entities.StarterPath.create({
        current_day: 1,
        started_date: today,
        completed: false,
        day_exercises: {}
      });
    },
    onMutate: () => setFeedback(null),
    onSuccess: (data) => {
      queryClient.setQueryData(['starterPath'], data);
      setFeedback({ type: 'success', key: 'starter_path.premium.started_success' });
    },
    onError: () => setFeedback({ type: 'error', key: 'starter_path.premium.start_error' }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['starterPath'] })
  });

  const resetPathMutation = useMutation({
    mutationFn: async () => {
      if (!starterPath?.id) throw new Error('Starter path is unavailable');
      const today = new Date().toISOString().split('T')[0];
      return base44.entities.StarterPath.update(starterPath.id, {
        current_day: 1,
        started_date: today,
        completed: false,
        day_exercises: {}
      });
    },
    onMutate: async () => {
      setFeedback(null);
      await queryClient.cancelQueries({ queryKey: ['starterPath'] });
      const previousPath = queryClient.getQueryData(['starterPath']);
      const today = new Date().toISOString().split('T')[0];
      queryClient.setQueryData(['starterPath'], (current) => current ? ({
        ...current,
        current_day: 1,
        started_date: today,
        completed: false,
        day_exercises: {}
      }) : current);
      return { previousPath };
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['starterPath'], data);
      setResetOpen(false);
      setFeedback({ type: 'success', key: 'starter_path.premium.reset_success' });
    },
    onError: (_error, _variables, context) => {
      if (context?.previousPath) queryClient.setQueryData(['starterPath'], context.previousPath);
      setFeedback({ type: 'error', key: 'starter_path.premium.reset_error' });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['starterPath'] })
  });

  const currentDay = clampDay(starterPath?.current_day);
  const isStarted = Boolean(starterPath?.id) && currentDay > 0;
  const isCompleted = Boolean(starterPath?.completed);
  const completedDays = isCompleted ? TOTAL_DAYS : Math.max(0, currentDay - 1);
  const progressPercent = completedDays / TOTAL_DAYS * 100;
  const descriptionKey = isCompleted
    ? 'starter_path.premium.description_completed'
    : isStarted
      ? 'starter_path.premium.description_continue'
      : 'starter_path.premium.description_new';

  if (isLoading) {
    return (
      <div className="relative min-h-[176px] animate-pulse rounded-[24px] border border-border/60 bg-card/75" data-testid="starter-path-loading">
        <div className="space-y-4 p-5">
          <div className="h-12 w-12 rounded-2xl bg-primary/15" />
          <div className="h-4 w-2/3 rounded-full bg-primary/10" />
          <div className="h-3 w-1/2 rounded-full bg-muted" />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      layout
      className={expanded ? 'col-span-2 min-w-0 md:col-span-3' : 'relative min-w-0'}
      data-testid="starter-path-quick-action"
    >
      <Card
        className="overflow-hidden rounded-[24px] border border-border bg-card/95 shadow-[0_22px_55px_rgba(36,100,88,0.16)] backdrop-blur-xl transition-shadow hover:shadow-[0_28px_65px_rgba(36,100,88,0.2)]"
        style={{
          background: expanded
            ? 'linear-gradient(145deg, rgba(255,255,255,0.98) 0%, rgba(226,247,240,0.98) 54%, rgba(217,241,236,0.98) 100%)'
            : 'linear-gradient(180deg, rgba(255,253,248,0.98) 0%, rgba(226,245,238,0.97) 100%)'
        }}
      >
        <CardContent className="p-4 sm:p-5">
          <div className="flex min-w-0 items-center justify-between gap-3">
            <div className="flex shrink-0 items-center gap-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-400 to-emerald-600 text-white shadow-lg shadow-teal-900/15 sm:h-14 sm:w-14">
                <Route className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={2.3} />
              </div>
              <button
                type="button"
                onClick={onWatchVideo}
                className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-[hsl(var(--card)/0.97)] text-primary transition hover:-translate-y-0.5 hover:bg-[hsl(var(--card)/0.97)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:h-14 sm:w-14"
                aria-label={t('starter_path.premium.watch_intro')}
                title={t('starter_path.premium.watch_intro')}
                data-testid="starter-path-video-button"
              >
                <CirclePlay className="h-6 w-6" />
              <span className="mobile-action-label md:hidden">{t('starter_path.premium.watch_intro')}</span></button>
            </div>

            <div className="flex min-w-0 items-center gap-2">
              {isStarted && (
                <Badge className="max-w-[9rem] truncate border border-border bg-[hsl(var(--card)/0.97)] px-2.5 py-1 text-xs font-bold text-primary hover:bg-[hsl(var(--card)/0.97)]">
                  {isCompleted
                    ? t('starter_path.premium.completed_status')
                    : t('starter_path.card_day_badge', { day: currentDay })}
                </Badge>
              )}
              <button
                type="button"
                onClick={() => setExpanded((value) => !value)}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-border bg-[hsl(var(--card)/0.97)] text-primary shadow-sm transition hover:-translate-y-0.5 hover:bg-[hsl(var(--card)/0.97)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-expanded={expanded}
                aria-controls="starter-path-premium-panel"
                aria-label={expanded ? t('starter_path.premium.collapse_aria') : t('starter_path.premium.expand_aria')}
                title={expanded ? t('starter_path.premium.collapse_aria') : t('starter_path.premium.expand_aria')}
                data-testid="starter-path-toggle"
              >
                <motion.span animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                  <ChevronDown className="h-5 w-5" />
                </motion.span>
              <span className="mobile-action-label md:hidden">{expanded ? t('starter_path.premium.collapse_aria') : t('starter_path.premium.expand_aria')}</span></button>
            </div>
          </div>

          <div className="mt-4 min-w-0 text-start">
            <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-border bg-[hsl(var(--card)/0.97)] px-2.5 py-1 text-[11px] font-semibold text-primary">
              <Sparkles className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{t('starter_path.premium.badge')}</span>
            </span>
            <h3 className="mt-2 break-words text-base font-bold leading-snug text-foreground sm:text-lg">
              {t('starter_path.card_title')}
            </h3>
            {!expanded && (
              <p className="mt-1 line-clamp-2 break-words text-xs leading-relaxed text-muted-foreground">
                {t(descriptionKey)}
              </p>
            )}
          </div>

          <AnimatePresence initial={false}>
            {expanded && (
              <motion.section
                id="starter-path-premium-panel"
                role="region"
                aria-label={t('starter_path.premium.panel_label')}
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                className="overflow-hidden"
                data-testid="starter-path-panel"
              >
                <div className="mt-5 border-t border-border pt-5">
                  <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(250px,0.65fr)]">
                    <div className="min-w-0">
                      <h3 className="text-xl font-bold text-foreground sm:text-2xl">
                        {isCompleted
                          ? t('starter_path.premium.heading_completed')
                          : isStarted
                            ? t('starter_path.premium.heading_continue', { day: currentDay })
                            : t('starter_path.premium.heading_new')}
                      </h3>
                      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                        {t(descriptionKey)}
                      </p>

                      {isStarted && (
                        <div className="mt-5 rounded-2xl border border-border bg-[hsl(var(--card)/0.97)] p-4" data-testid="starter-path-progress">
                          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                            <span className="text-sm font-semibold text-primary">
                              {t('starter_path.premium.progress_label', { completed: completedDays })}
                            </span>
                            <span className="text-xs font-medium text-muted-foreground">
                              {Math.round(progressPercent)}%
                            </span>
                          </div>
                          <div
                            className="h-2.5 overflow-hidden rounded-full bg-teal-950/10"
                            role="progressbar"
                            aria-valuemin={0}
                            aria-valuemax={TOTAL_DAYS}
                            aria-valuenow={completedDays}
                            aria-label={t('starter_path.premium.progress_label', { completed: completedDays })}
                          >
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${progressPercent}%` }}
                              transition={{ duration: 0.45 }}
                              className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-500"
                            />
                          </div>

                          <ol className="mt-4 grid grid-cols-7 gap-1.5" aria-label={t('starter_path.premium.days_label')}>
                            {Array.from({ length: TOTAL_DAYS }, (_, index) => {
                              const day = index + 1;
                              const completed = day <= completedDays;
                              const current = !isCompleted && day === currentDay;
                              return (
                                <li key={day} className="text-center">
                                  <span
                                    className={[
                                      'mx-auto flex h-8 w-8 items-center justify-center rounded-full border text-xs font-bold transition sm:h-9 sm:w-9',
                                      completed ? 'border-emerald-500 bg-emerald-500 text-white' : '',
                                      current ? 'border-border bg-[hsl(var(--card)/0.97)] text-primary ring-4 ring-ring' : '',
                                      !completed && !current ? 'border-border bg-[hsl(var(--card)/0.97)] text-slate-400' : ''
                                    ].join(' ')}
                                    aria-label={t('starter_path.premium.day_label', { day })}
                                    aria-current={current ? 'step' : undefined}
                                  >
                                    {completed ? <Check className="h-4 w-4" aria-hidden="true" /> : day}
                                  </span>
                                </li>
                              );
                            })}
                          </ol>
                        </div>
                      )}
                    </div>

                    <aside className="rounded-2xl border border-border bg-[hsl(var(--card)/0.97)] p-4 shadow-sm">
                      <div className="flex items-start gap-3">
                        <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
                          <ShieldCheck className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-semibold text-primary">{t('starter_path.premium.protected_title')}</p>
                          <p className="mt-1 text-xs leading-5 text-muted-foreground">{t('starter_path.premium.protected_note')}</p>
                        </div>
                      </div>
                    </aside>
                  </div>

                  {isError && (
                    <p className="mt-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      {t('starter_path.premium.load_error')}
                    </p>
                  )}

                  {feedback && (
                    <p
                      className={`mt-4 flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${feedback.type === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}
                      role={feedback.type === 'error' ? 'alert' : 'status'}
                      data-testid="starter-path-feedback"
                    >
                      {feedback.type === 'error' ? <AlertCircle className="h-4 w-4 shrink-0" /> : <Check className="h-4 w-4 shrink-0" />}
                      {t(feedback.key)}
                    </p>
                  )}

                  <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                    {isStarted ? (
                      <>
                        <Button asChild className="h-12 min-h-12 flex-1 rounded-full bg-primary px-6 text-base text-primary-foreground shadow-lg shadow-teal-900/15 hover:bg-primary">
                          <Link
                            to={createPageUrl('StarterPath')}
                            style={{ minHeight: '48px' }}
                            data-testid="starter-path-primary-action"
                          >
                            {isCompleted ? t('starter_path.card_btn_review') : t('starter_path.card_btn_continue')}
                            <ArrowRight className="ms-2 h-4 w-4 rtl:rotate-180" />
                          </Link>
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setFeedback(null);
                            setResetOpen(true);
                          }}
                          className="h-12 min-h-12 rounded-full border-border bg-[hsl(var(--card)/0.97)] px-5 text-primary hover:bg-[hsl(var(--card)/0.97)]"
                          aria-label={t('starter_path.premium.reset_aria')}
                          data-testid="starter-path-reset-button"
                        >
                          <RefreshCw className="me-2 h-4 w-4" />
                          {t('starter_path.premium.reset_button')}
                        </Button>
                      </>
                    ) : (
                      <Button
                        type="button"
                        onClick={() => startPathMutation.mutate()}
                        disabled={startPathMutation.isPending}
                        className="h-12 min-h-12 w-full rounded-full bg-primary px-6 text-base text-primary-foreground shadow-lg shadow-teal-900/15 hover:bg-primary"
                        data-testid="starter-path-start-button"
                      >
                        {startPathMutation.isPending && <RefreshCw className="me-2 h-4 w-4 animate-spin" />}
                        {startPathMutation.isPending ? t('starter_path.card_btn_starting') : t('starter_path.card_btn_start')}
                      </Button>
                    )}
                  </div>
                </div>
              </motion.section>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      <AlertDialog open={resetOpen} onOpenChange={(open) => !resetPathMutation.isPending && setResetOpen(open)}>
        <AlertDialogContent className="w-[calc(100%_-_2rem)] max-w-md rounded-[24px]" data-testid="starter-path-reset-dialog">
          <AlertDialogHeader className="text-start">
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
              <RefreshCw className="h-6 w-6" />
            </div>
            <AlertDialogTitle className="text-xl text-foreground">{t('starter_path.premium.reset_title')}</AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-6 text-muted-foreground">
              {t('starter_path.premium.reset_description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:space-x-0">
            <AlertDialogCancel disabled={resetPathMutation.isPending} className="min-h-11 rounded-full">
              {t('starter_path.premium.reset_cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                resetPathMutation.mutate();
              }}
              disabled={resetPathMutation.isPending}
              className="min-h-11 rounded-full bg-primary text-primary-foreground hover:bg-primary"
              data-testid="starter-path-reset-confirm"
            >
              {resetPathMutation.isPending && <RefreshCw className="me-2 h-4 w-4 animate-spin" />}
              {resetPathMutation.isPending ? t('starter_path.premium.resetting') : t('starter_path.premium.reset_confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
