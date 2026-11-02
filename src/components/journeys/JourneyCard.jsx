import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Footprints,
  Gauge,
  Loader2,
  PauseCircle,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getJourneyProgressPercentage } from './journeyUtils';
import { getStage11Copy } from '../i18n/stage11UiCopy.js';

export default function JourneyCard({
  journey,
  progress,
  onStart,
  onContinue,
  onView,
  onRestart,
  onRemove,
  isStarting = false,
  isManaging = false,
}) {
  const { t, i18n } = useTranslation();
  const copy = getStage11Copy(i18n.resolvedLanguage || i18n.language);
  const isStarted = Boolean(progress);
  const isCompleted = progress?.status === 'completed';
  const isPaused = progress?.status === 'paused';
  const stepCount = Array.isArray(journey.steps) ? journey.steps.length : 0;
  const completionPercentage = getJourneyProgressPercentage(progress, stepCount);
  const categoryLabel = t('journeys.categories.' + journey.category, {
    defaultValue: t('journeys.categories.other'),
  });
  const difficultyLabel = t('journeys.difficulties.' + journey.difficulty, {
    defaultValue: t('journeys.difficulties.beginner'),
  });

  return (
    <Card
      className="group relative h-full overflow-hidden rounded-[26px] border border-border/70 bg-[hsl(var(--card)/0.97)] shadow-[0_20px_48px_rgba(42,103,91,0.12)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:shadow-[0_26px_62px_rgba(42,103,91,0.18)]"
      data-testid={'journey-card-' + journey.id}
    >
      <div className="pointer-events-none absolute -end-16 -top-16 h-36 w-36 rounded-full bg-violet-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -start-16 h-36 w-36 rounded-full bg-teal-200/35 blur-3xl" />

      <CardContent className="relative flex h-full min-w-0 flex-col p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
          <span className="inline-flex min-h-8 items-center rounded-full border border-violet-700/10 bg-violet-50/90 px-3 py-1 text-xs font-bold text-violet-800">
            {categoryLabel}
          </span>
          {isCompleted && (
            <span className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-emerald-700/10 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              {t('journeys.tabs.completed')}
            </span>
          )}
          {isPaused && (
            <span className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-amber-700/10 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">
              <PauseCircle className="h-4 w-4" aria-hidden="true" />
              {t('journeys.card.paused')}
            </span>
          )}
        </div>

        <h2 className="break-words text-xl font-bold leading-tight tracking-tight text-foreground">
          {journey.title}
        </h2>
        <p className="mt-2 line-clamp-3 break-words text-sm leading-6 text-muted-foreground">
          {journey.description}
        </p>

        <div className="mt-5 grid grid-cols-3 gap-2" aria-label={t('journeys.card.details_aria')}>
          <div className="min-w-0 rounded-2xl border border-border bg-[hsl(var(--card)/0.97)] px-2 py-3 text-center">
            <CalendarDays className="mx-auto h-4 w-4 text-primary" aria-hidden="true" />
            <strong className="mt-1 block truncate text-sm text-primary">{journey.duration_days || 0}</strong>
            <span className="block truncate text-[10px] font-medium text-muted-foreground">{t('journeys.card.days')}</span>
          </div>
          <div className="min-w-0 rounded-2xl border border-border bg-[hsl(var(--card)/0.97)] px-2 py-3 text-center">
            <Footprints className="mx-auto h-4 w-4 text-primary" aria-hidden="true" />
            <strong className="mt-1 block truncate text-sm text-primary">{stepCount}</strong>
            <span className="block truncate text-[10px] font-medium text-muted-foreground">{t('journeys.card.steps')}</span>
          </div>
          <div className="min-w-0 rounded-2xl border border-border bg-[hsl(var(--card)/0.97)] px-2 py-3 text-center">
            <Gauge className="mx-auto h-4 w-4 text-primary" aria-hidden="true" />
            <strong className="mt-1 block truncate text-xs text-primary">{difficultyLabel}</strong>
            <span className="block truncate text-[10px] font-medium text-muted-foreground">{t('journeys.card.level')}</span>
          </div>
        </div>

        {isStarted && (
          <div className="mt-5 rounded-2xl border border-border bg-emerald-50/70 p-3">
            <div className="mb-2 flex items-center justify-between gap-3 text-xs font-semibold text-primary">
              <span>{t('journeys.card.progress')}</span>
              <span dir="ltr">{completionPercentage}%</span>
            </div>
            <div
              className="h-2.5 overflow-hidden rounded-full bg-teal-900/10"
              role="progressbar"
              aria-label={t('journeys.card.progress')}
              aria-valuemin="0"
              aria-valuemax="100"
              aria-valuenow={completionPercentage}
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-600 transition-[width] duration-500"
                style={{ width: completionPercentage + '%' }}
              />
            </div>
          </div>
        )}

        <div className="mt-auto flex flex-wrap gap-2 pt-5">
          {!isStarted && (
            <Button
              type="button"
              onClick={() => onStart(journey)}
              disabled={isStarting || stepCount === 0}
              className="min-h-12 h-auto min-w-0 basis-36 flex-1 whitespace-normal py-3 rounded-2xl bg-primary px-4 text-primary-foreground shadow-md hover:bg-primary"
              data-testid={'journey-start-' + journey.id}
            >
              {isStarting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Footprints className="h-4 w-4" aria-hidden="true" />}
              {isStarting ? t('journeys.premium.starting') : t('journeys.card.start_journey')}
            </Button>
          )}

          {isStarted && !isCompleted && (
            <Button
              type="button"
              onClick={() => onContinue(journey, progress)}
              className="min-h-12 h-auto min-w-0 basis-36 flex-1 whitespace-normal py-3 rounded-2xl bg-primary px-4 text-primary-foreground shadow-md hover:bg-primary"
              data-testid={'journey-continue-' + journey.id}
            >
              {t('journeys.card.continue_journey')}
              <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
            </Button>
          )}

          <Button
            type="button"
            onClick={() => onView(journey, progress)}
            variant="outline"
            className="min-h-12 h-auto min-w-0 basis-36 flex-1 whitespace-normal py-3 rounded-2xl border-border bg-[hsl(var(--card)/0.97)] px-4 text-primary hover:bg-[hsl(var(--card)/0.97)]"
            data-testid={'journey-view-' + journey.id}
          >
            {t('journeys.card.view_details')}
          </Button>
        </div>

        {isStarted && (
          <div className="mt-2 flex flex-wrap gap-2 border-t border-border pt-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onRestart?.(journey, progress)}
              disabled={isManaging}
              className="min-h-11 h-auto min-w-0 basis-32 flex-1 whitespace-normal py-2 rounded-xl text-primary hover:bg-secondary/70"
              data-testid={'journey-restart-' + journey.id}
            >
              {isManaging ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
              {copy.journey.restart}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onRemove?.(journey, progress)}
              disabled={isManaging}
              className="min-h-11 h-auto min-w-0 basis-32 flex-1 whitespace-normal py-2 rounded-xl text-red-700 hover:bg-red-50"
              data-testid={'journey-remove-' + journey.id}
             mobileLabelKey="delete">
              <Trash2 className="h-4 w-4" />
              {copy.journey.remove}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
