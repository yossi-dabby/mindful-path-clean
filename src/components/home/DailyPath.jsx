import BotanicalAccent from '@/components/brand/BotanicalAccent';
import React from 'react';
import { Check, ChevronRight, Circle, HeartPulse, MessageCircle, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { getStage11Copy } from '../i18n/stage11UiCopy.js';

export default function DailyPath({ checkInComplete, exerciseComplete, hasRecommendedExercise, isRecommendationLoading = false, onCheckIn, onCoach, onExercise }) {
  const { t, i18n } = useTranslation();
  const copy = getStage11Copy(i18n.resolvedLanguage || i18n.language);
  const isRtl = i18n.dir() === 'rtl';
  const Arrow = isRtl ? ({ className }) => <ChevronRight className={cn(className, 'rotate-180')} /> : ChevronRight;

  const steps = [
    {
      key: 'checkin',
      Icon: HeartPulse,
      complete: checkInComplete,
      onClick: onCheckIn,
      modeLabel: copy.home.checkinMode,
    },
    {
      key: 'coach',
      Icon: MessageCircle,
      complete: false,
      onClick: onCoach,
      modeLabel: copy.home.coachMode,
    },
    {
      key: 'action',
      Icon: Sparkles,
      complete: exerciseComplete,
      onClick: onExercise,
      busy: isRecommendationLoading,
      disabled: isRecommendationLoading || (!hasRecommendedExercise && exerciseComplete),
    },
  ];

  return (
    <section className="botanical-daily-path" data-testid="daily-path">
      <div className="botanical-section-heading">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">{t('daily_path.eyebrow')}</p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight text-foreground">{t('daily_path.title')}</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{t('daily_path.description')}</p>
      </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {steps.map(({ key, Icon, complete, onClick, disabled, busy, modeLabel }) => (
            <button
              type="button"
              key={key}
              onClick={onClick}
              disabled={disabled}
              aria-busy={busy || undefined}
              data-testid={`daily-path-${key}`}
              className="botanical-daily-card group flex min-h-[132px] flex-col rounded-[24px] border border-border bg-gradient-to-br from-white to-teal-50/70 p-4 text-start shadow-sm transition-all hover:-translate-y-0.5 hover:border-border hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
            >
              <BotanicalAccent variant={key === 'checkin' ? 'progress' : key === 'coach' ? 'leaves' : 'sprout'} className="botanical-daily-art" /><div className="botanical-daily-status flex w-full items-center justify-between gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary/70 text-primary"><Icon className="h-5 w-5" /></span>
                {complete ? <Check className="h-5 w-5 text-emerald-600" /> : <Circle className="h-4 w-4 text-teal-300" />}
              </div>
              <span className="mt-3 text-sm font-bold text-foreground">{t(`daily_path.${key}.title`)}</span>
              {modeLabel && <span className={cn('mt-1 w-fit rounded-full px-2 py-0.5 text-[10px] font-bold', key === 'checkin' ? 'bg-amber-100 text-amber-800' : 'bg-violet-100 text-violet-800')}>{modeLabel}</span>}
              <span className="mt-1 flex-1 text-xs leading-5 text-muted-foreground">{t(`daily_path.${key}.description`)}</span>
              <span className="mt-3 inline-flex items-center text-xs font-bold text-primary">
                {t(busy ? 'common.loading' : 'daily_path.open')}
                <Arrow className="ms-1 h-3.5 w-3.5" />
              </span>
            </button>
          ))}
        </div>
    </section>
  );
}
