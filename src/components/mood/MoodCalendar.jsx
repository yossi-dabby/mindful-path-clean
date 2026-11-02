import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  isSameDay,
  startOfMonth,
  startOfWeek,
  subMonths
} from 'date-fns';
import { de, enUS, es, fr, he, it, ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { getCurrentAppLocale } from '@/components/i18n/appLocale';
import PremiumMoodIcon from '@/components/ui/PremiumMoodIcon';

const DATE_FNS_LOCALES = { en: enUS, he, es, fr, de, it, pt: ptBR };

const moodColors = {
  excellent: 'bg-emerald-500',
  good: 'bg-sky-500',
  okay: 'bg-amber-400',
  low: 'bg-orange-500',
  very_low: 'bg-rose-500'
};

const moodValues = ['excellent', 'good', 'okay', 'low', 'very_low'];

const moodLabelKeys = {
  excellent: 'mood_tracker.form.mood_excellent',
  good: 'mood_tracker.form.mood_good',
  okay: 'mood_tracker.form.mood_okay',
  low: 'mood_tracker.form.mood_low',
  very_low: 'mood_tracker.form.mood_very_low'
};

export default function MoodCalendar({ entries, onEditEntry }) {
  const { t, i18n } = useTranslation();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const appLocale = getCurrentAppLocale(i18n);
  const dateLocale = DATE_FNS_LOCALES[appLocale] || enUS;
  const weekStartsOn = ['en', 'he'].includes(appLocale) ? 0 : 1;

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const leadingDays = (monthStart.getDay() - weekStartsOn + 7) % 7;
  const emptyDays = Array.from({ length: leadingDays });
  const weekdayStart = startOfWeek(new Date(), { weekStartsOn });
  const weekdays = Array.from({ length: 7 }, (_, index) => addDays(weekdayStart, index));
  const monthKey = format(currentMonth, 'yyyy-MM');

  const monthEntries = useMemo(
    () => entries.filter((entry) => typeof entry.date === 'string' && entry.date.startsWith(monthKey)),
    [entries, monthKey]
  );

  const entriesByDate = useMemo(
    () => new Map(monthEntries.map((entry) => [entry.date, entry])),
    [monthEntries]
  );

  return (
    <Card className="overflow-hidden border border-border/75 bg-card/90 backdrop-blur-xl shadow-[var(--shadow-lg)]" data-testid="mood-calendar">
      <CardHeader className="border-b border-border/60 bg-secondary/40 p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl text-primary">
            <Calendar className="h-5 w-5" />
            {t('mood_tracker.calendar.title')}
          </CardTitle>
          <div className="flex items-center justify-between gap-2 sm:justify-end">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentMonth((value) => subMonths(value, 1))}
              aria-label={t('mood_tracker.calendar.previous_month')}
              className="min-h-11 min-w-11 rounded-full bg-card/90"
            >
              <ChevronLeft className="h-4 w-4 rtl:scale-x-[-1]" />
            </Button>
            <span className="min-w-0 flex-1 px-1 text-center text-base font-semibold text-foreground sm:min-w-44 sm:text-lg">
              {format(currentMonth, 'MMMM yyyy', { locale: dateLocale })}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentMonth((value) => addMonths(value, 1))}
              aria-label={t('mood_tracker.calendar.next_month')}
              className="min-h-11 min-w-11 rounded-full bg-card/90"
            >
              <ChevronRight className="h-4 w-4 rtl:scale-x-[-1]" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-3 sm:p-6">
        <div className="mb-5 flex flex-wrap justify-center gap-2" aria-label={t('mood_tracker.form.overall_mood')}>
          {moodValues.map((mood) => (
            <Badge key={mood} variant="outline" className="gap-1.5 rounded-full bg-card/80 px-2.5 py-1.5 text-foreground">
              <PremiumMoodIcon mood={mood} size="sm" className="h-7 w-7" />
              <span>{t(moodLabelKeys[mood])}</span>
            </Badge>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1 sm:gap-2" role="grid">
          {weekdays.map((day) => (
            <div key={day.toISOString()} role="columnheader" className="py-1 text-center text-[11px] font-semibold text-muted-foreground sm:py-2 sm:text-sm">
              <span className="sm:hidden">{format(day, 'EEEEE', { locale: dateLocale })}</span>
              <span className="hidden sm:inline">{format(day, 'EEE', { locale: dateLocale })}</span>
            </div>
          ))}

          {emptyDays.map((_, index) => <div key={`empty-${index}`} aria-hidden="true" />)}

          {calendarDays.map((day) => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const entry = entriesByDate.get(dateKey);
            const isToday = isSameDay(day, new Date());
            const accessibleDate = format(day, 'PPPP', { locale: dateLocale });

            return (
              <button
                key={dateKey}
                type="button"
                disabled={!entry}
                onClick={() => entry && onEditEntry(entry)}
                aria-label={entry
                  ? t('mood_tracker.calendar.open_day', { date: accessibleDate })
                  : t('mood_tracker.calendar.no_entry_day', { date: accessibleDate })}
                className={cn(
                  'relative flex aspect-square min-w-0 flex-col items-center justify-center gap-0.5 rounded-lg border text-foreground transition-all sm:gap-1 sm:rounded-xl',
                  entry
                    ? 'cursor-pointer border-primary/25 bg-primary/10 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-[var(--shadow-md)] focus-visible:ring-2 focus-visible:ring-ring'
                    : 'cursor-default border-border/45 bg-card/45 text-muted-foreground',
                  isToday && 'ring-2 ring-primary/35 ring-offset-1 ring-offset-background'
                )}
              >
                <span className="text-xs font-semibold sm:text-sm">{format(day, 'd')}</span>
                {entry && <PremiumMoodIcon mood={entry.mood} size="sm" className="h-7 w-7 sm:h-9 sm:w-9" />}
                {entry && <span className={cn('hidden h-1.5 w-1.5 rounded-full sm:block', moodColors[entry.mood])} aria-hidden="true" />}
                {isToday && <span className="sr-only">{t('mood_tracker.calendar.today')}</span>}
              </button>
            );
          })}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-2 border-t border-border/60 pt-5 sm:grid-cols-4 sm:gap-4">
          {[
            [monthEntries.length, t('mood_tracker.calendar.total_entries'), 'text-primary'],
            [monthEntries.filter((entry) => ['excellent', 'good'].includes(entry.mood)).length, t('mood_tracker.calendar.good_days'), 'text-emerald-700'],
            [monthEntries.filter((entry) => entry.mood === 'okay').length, t('mood_tracker.calendar.okay_days'), 'text-amber-700'],
            [monthEntries.filter((entry) => ['low', 'very_low'].includes(entry.mood)).length, t('mood_tracker.calendar.difficult_days'), 'text-rose-700']
          ].map(([value, label, color]) => (
            <div key={label} className="rounded-xl border border-border/55 bg-card/70 p-3 text-center">
              <p className={cn('text-xl font-bold sm:text-2xl', color)}>{value}</p>
              <p className="mt-1 text-xs font-medium text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
