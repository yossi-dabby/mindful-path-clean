import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { DialogDescription, DialogTitle } from '@/components/ui/dialog';
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  Circle,
  Compass,
  Gamepad2,
  Lock,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getJourneyProgressPercentage } from './journeyUtils';

export default function JourneyDetail({
  journey,
  progress,
  onClose,
  onPlayGame,
  onProgressChange,
}) {
  const { t } = useTranslation();
  const [localProgress, setLocalProgress] = useState(progress || null);
  const [reflection, setReflection] = useState('');
  const [savingStep, setSavingStep] = useState(null);
  const [saveError, setSaveError] = useState('');
  const queryClient = useQueryClient();
  const steps = Array.isArray(journey.steps) ? journey.steps : [];

  useEffect(() => {
    setLocalProgress(progress || null);
  }, [progress]);

  const completedStepIndices = useMemo(
    () => new Set(
      (localProgress?.completed_steps || [])
        .map((step) => Number(step?.step_index))
        .filter((stepIndex) => Number.isInteger(stepIndex) && stepIndex >= 0)
    ),
    [localProgress]
  );

  const currentStepIndex = Math.min(
    Math.max(Number(localProgress?.current_step) || 0, 0),
    Math.max(steps.length - 1, 0)
  );
  const progressPercentage = getJourneyProgressPercentage(localProgress, steps.length);

  const handleCompleteStep = async (stepIndex) => {
    if (!localProgress || completedStepIndices.has(stepIndex) || savingStep !== null) return;

    setSavingStep(stepIndex);
    setSaveError('');

    const previousProgress = localProgress;
    const previousReflection = reflection;
    const updatedCompletedSteps = [
      ...(localProgress.completed_steps || []).filter((item) => Number(item?.step_index) !== stepIndex),
      {
        step_index: stepIndex,
        completed_date: new Date().toISOString(),
        reflection: reflection.trim(),
      },
    ];
    const isLastStep = stepIndex === steps.length - 1;
    const updates = {
      completed_steps: updatedCompletedSteps,
      current_step: isLastStep ? stepIndex : stepIndex + 1,
      status: isLastStep ? 'completed' : 'in_progress',
      completed_date: isLastStep ? new Date().toISOString().split('T')[0] : null,
    };
    const optimisticProgress = { ...localProgress, ...updates };

    await queryClient.cancelQueries({ queryKey: ['journey_progress'] });
    setLocalProgress(optimisticProgress);
    setReflection('');
    onProgressChange?.(optimisticProgress);
    queryClient.setQueryData(['journey_progress'], (current = []) =>
      current.map((item) => item.id === optimisticProgress.id ? optimisticProgress : item)
    );

    try {
      const savedProgress = await base44.entities.UserJourneyProgress.update(previousProgress.id, updates);
      const nextProgress = { ...optimisticProgress, ...(savedProgress || {}) };
      setLocalProgress(nextProgress);
      onProgressChange?.(nextProgress);
      queryClient.setQueryData(['journey_progress'], (current = []) =>
        current.map((item) => item.id === nextProgress.id ? nextProgress : item)
      );
    } catch {
      setLocalProgress(previousProgress);
      setReflection(previousReflection);
      onProgressChange?.(previousProgress);
      queryClient.setQueryData(['journey_progress'], (current = []) =>
        current.map((item) => item.id === previousProgress.id ? previousProgress : item)
      );
      setSaveError(t('journeys.detail.save_error'));
    } finally {
      setSavingStep(null);
      queryClient.invalidateQueries({ queryKey: ['journey_progress'] });
    }
  };

  return (
    <div className="flex max-h-[calc(100dvh-0.5rem)] min-h-0 flex-col overflow-hidden sm:max-h-[calc(100vh-2rem)]" data-testid="journey-detail">
      <header className="relative shrink-0 overflow-hidden border-b border-emerald-100/80 bg-[hsl(var(--card)/0.97)] px-5 pb-5 pt-6 pe-16 sm:px-7 sm:pb-6 sm:pt-7 sm:pe-20">
        <div className="pointer-events-none absolute -end-14 -top-20 h-48 w-48 rounded-full bg-violet-200/35 blur-3xl" />
        <div className="relative flex min-w-0 items-start gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-700 text-white shadow-[0_12px_24px_rgba(13,148,136,0.22)]">
            <Compass className="h-6 w-6" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="mb-1 text-xs font-bold uppercase tracking-[0.14em] text-primary">
              {t('journeys.premium.detail_eyebrow')}
            </p>
            <DialogTitle className="break-words text-xl font-bold leading-tight text-primary sm:text-2xl">
              {journey.title}
            </DialogTitle>
            <DialogDescription className="mt-2 break-words text-sm leading-6 text-muted-foreground">
              {journey.description}
            </DialogDescription>
          </div>
        </div>

        {localProgress && (
          <div className="relative mt-5 rounded-2xl border border-border bg-emerald-50/75 p-3">
            <div className="mb-2 flex items-center justify-between gap-3 text-xs font-semibold text-primary">
              <span>{t('journeys.card.progress')}</span>
              <span dir="ltr">{progressPercentage}%</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-teal-900/10" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={progressPercentage}>
              <div className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-600 transition-[width] duration-500" style={{ width: progressPercentage + '%' }} />
            </div>
          </div>
        )}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-5 sm:px-7 sm:py-6" style={{ overscrollBehavior: 'contain' }}>
        {Array.isArray(journey.outcomes) && journey.outcomes.length > 0 && (
          <section className="mb-6 rounded-[24px] border border-border/70 bg-secondary/35 p-5" aria-labelledby="journey-outcomes-title">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-violet-700" aria-hidden="true" />
              <h3 id="journey-outcomes-title" className="font-bold text-foreground">{t('journeys.detail.what_youll_gain')}</h3>
            </div>
            <ul className="grid gap-2 sm:grid-cols-2">
              {journey.outcomes.map((outcome, index) => (
                <li key={index} className="flex min-w-0 items-start gap-2 text-sm leading-6 text-muted-foreground">
                  <Check className="mt-1 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  <span className="min-w-0 break-words">{outcome}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section aria-labelledby="journey-steps-title">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h3 id="journey-steps-title" className="text-lg font-bold text-foreground">{t('journeys.detail.journey_steps')}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{t('journeys.premium.roadmap_description')}</p>
            </div>
            <span className="shrink-0 rounded-full bg-secondary/70 px-3 py-1 text-xs font-bold text-primary">
              {t('journeys.premium.steps_count', { count: steps.length })}
            </span>
          </div>

          <div className="space-y-3">
            {steps.map((step, index) => {
              const isCompleted = completedStepIndices.has(index);
              const isCurrent = Boolean(localProgress) && index === currentStepIndex && !isCompleted;
              const isLocked = !localProgress || (index > currentStepIndex && !isCompleted);
              const stateLabel = isCompleted
                ? t('journeys.detail.completed_step')
                : isCurrent
                  ? t('journeys.detail.current_step')
                  : t('journeys.detail.locked_step');

              return (
                <article
                  key={index}
                  className={
                    'relative overflow-hidden rounded-[24px] border p-4 transition sm:p-5 ' +
                    (isCurrent
                      ? 'border-border bg-[hsl(var(--card)/0.97)] shadow-[0_18px_42px_rgba(13,148,136,0.13)]'
                      : isCompleted
                        ? 'border-emerald-700/12 bg-emerald-50/65'
                        : 'border-slate-200/80 bg-[hsl(var(--card)/0.97)]')
                  }
                  data-testid={'journey-step-' + index}
                >
                  {isCurrent && <div className="absolute inset-y-0 start-0 w-1 bg-gradient-to-b from-teal-400 to-emerald-600" />}
                  <div className="flex min-w-0 items-start gap-3">
                    <span
                      className={
                        'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ' +
                        (isCompleted
                          ? 'bg-emerald-100 text-emerald-700'
                          : isCurrent
                            ? 'bg-primary text-white shadow-md'
                            : 'bg-slate-100 text-slate-400')
                      }
                      aria-hidden="true"
                    >
                      {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : isLocked ? <Lock className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <span className="inline-flex min-h-7 items-center rounded-full border border-border bg-[hsl(var(--card)/0.97)] px-2.5 py-1 text-[11px] font-bold text-primary">
                            {t('journeys.detail.day')} {step.day || index + 1}
                          </span>
                          <h4 className="mt-2 break-words font-bold leading-6 text-foreground">{step.title}</h4>
                        </div>
                        <span className="rounded-full bg-[hsl(var(--card)/0.97)] px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">{stateLabel}</span>
                      </div>

                      <p className="mt-2 break-words text-sm leading-6 text-muted-foreground">{step.description}</p>

                      {isCurrent && (
                        <div className="mt-4 space-y-4 border-t border-border pt-4">
                          {step.game_slug && (
                            <Button
                              type="button"
                              onClick={() => onPlayGame(step.game_slug)}
                              className="min-h-12 w-full rounded-2xl bg-violet-700 text-white shadow-md hover:bg-violet-800 sm:w-auto"
                              data-testid={'journey-play-' + index}
                            >
                              <Gamepad2 className="h-4 w-4" aria-hidden="true" />
                              {t('journeys.detail.play_game')}
                            </Button>
                          )}

                          {step.reflection_prompt && (
                            <div>
                              <label htmlFor={'journey-reflection-' + index} className="block text-sm font-semibold leading-6 text-primary">
                                {step.reflection_prompt}
                              </label>
                              <p className="mt-1 text-xs leading-5 text-muted-foreground">{t('journeys.detail.reflection_hint')}</p>
                              <textarea
                                id={'journey-reflection-' + index}
                                value={reflection}
                                onChange={(event) => setReflection(event.target.value)}
                                placeholder={t('journeys.detail.reflection_placeholder')}
                                rows={3}
                                maxLength={1000}
                                className="mt-2 min-h-24 w-full resize-y rounded-2xl border border-border bg-[hsl(var(--card)/0.97)] p-3 text-sm leading-6 text-foreground shadow-sm outline-none placeholder:text-slate-400 focus:border-border focus:ring-2 focus:ring-ring"
                                data-testid="journey-reflection"
                              />
                            </div>
                          )}

                          {saveError && (
                            <div className="flex items-start gap-2 rounded-xl bg-rose-50 p-3 text-sm text-rose-800" role="alert">
                              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                              <span>{saveError}</span>
                            </div>
                          )}

                          <Button
                            type="button"
                            onClick={() => handleCompleteStep(index)}
                            disabled={savingStep !== null}
                            className="min-h-12 w-full rounded-2xl bg-primary text-primary-foreground shadow-md hover:bg-primary sm:w-auto"
                            data-testid={'journey-complete-' + index}
                          >
                            {savingStep === index ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
                            {savingStep === index ? t('journeys.detail.saving') : t('journeys.detail.mark_complete')}
                            {savingStep !== index && <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />}
                          </Button>
                        </div>
                      )}

                      {isCompleted && (
                        <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-100/70 p-3 text-xs font-semibold text-emerald-800">
                          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                          {t('journeys.detail.completed_step')}
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>

      <footer className="shrink-0 border-t border-border/70 bg-[hsl(var(--card)/0.97)] px-4 py-3 shadow-[0_-10px_30px_rgba(42,103,91,0.07)] backdrop-blur-xl sm:px-7" style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}>
        <Button type="button" onClick={onClose} variant="outline" className="min-h-12 w-full rounded-2xl border-border bg-[hsl(var(--card)/0.97)] text-primary hover:bg-secondary/70">
          {t('common.close')}
        </Button>
      </footer>
    </div>
  );
}
