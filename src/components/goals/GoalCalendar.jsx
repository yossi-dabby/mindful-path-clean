import { useTranslation } from 'react-i18next';
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Calendar, Target, Flag } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isToday } from 'date-fns';
import { cn } from '@/lib/utils';

const categoryColors = {
  behavioral: 'bg-blue-500',
  emotional: 'bg-purple-500',
  social: 'bg-green-500',
  cognitive: 'bg-orange-500',
  lifestyle: 'bg-pink-500'
};

export default function GoalCalendar({ goals }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage || i18n.language || 'en';
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get goals and milestones for each day
  const getEventsForDay = (day) => {
    const events = [];
    
    goals.forEach(goal => {
      // Check goal target date
      if (goal.target_date) {
        try {
          const targetDate = new Date(goal.target_date);
          if (!isNaN(targetDate.getTime()) && isSameDay(targetDate, day)) {
            events.push({
              type: 'goal',
              goal,
              label: goal.title
            });
          }
        } catch (e) {
          // Invalid date, skip
        }
      }
      
      // Check milestone dates
      goal.milestones?.forEach((milestone, idx) => {
        if (milestone.due_date) {
          try {
            const dueDate = new Date(milestone.due_date);
            if (!isNaN(dueDate.getTime()) && isSameDay(dueDate, day)) {
              events.push({
                type: 'milestone',
                goal,
                milestone,
                label: milestone.title
              });
            }
          } catch (e) {
            // Invalid date, skip
          }
        }
      });
    });
    
    return events;
  };

  // Get first day of week offset
  const firstDayOfWeek = monthStart.getDay();
  const emptyDays = Array(firstDayOfWeek).fill(null);

  return (
    <Card className="border border-border/70 bg-card shadow-[var(--shadow-md)]" data-testid="goal-calendar">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            {t('path_ui.calendar')}
          </CardTitle>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-center">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              aria-label={t('path_ui.previous_month')}
            >
              <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
            </Button>
            <span className="text-sm font-semibold flex-1 text-center">
              {new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(currentMonth)}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              aria-label={t('path_ui.next_month')}
            >
              <ChevronRight className="w-4 h-4 rtl:rotate-180" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Weekday Headers */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
          {Array.from({ length: 7 }, (_, index) => new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(new Date(2023, 0, 1 + index))).map((day) => (
            <div key={day} className="text-center text-xs font-semibold text-muted-foreground py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {/* Empty cells for offset */}
          {emptyDays.map((_, idx) => (
            <div key={`empty-${idx}`} className="aspect-square" />
          ))}
          
          {/* Days */}
          {daysInMonth.map((day) => {
            const events = getEventsForDay(day);
            const hasEvents = events.length > 0;
            const isCurrentDay = isToday(day);
            
            return (
              <button
                type="button"
                onClick={() => setSelectedDay(day)}
                aria-label={new Intl.DateTimeFormat(locale, { dateStyle: 'full' }).format(day)}
                aria-pressed={Boolean(selectedDay && isSameDay(day, selectedDay))}
                data-calendar-date={format(day, 'yyyy-MM-dd')}
                key={day.toString()}
                className={cn(
                  'min-w-0 min-h-16 md:aspect-square border rounded-lg p-1 relative transition-all',
                  isCurrentDay ? 'border-primary border-2 bg-secondary' : 'border-border',
                  hasEvents && !isCurrentDay && 'bg-secondary/60',
                  'hover:shadow-md'
                )}
              >
                <div className="text-xs font-medium text-muted-foreground mb-1">
                  {format(day, 'd')}
                </div>
                
                {/* Event indicators */}
                <div className="space-y-0.5">
                  {events.slice(0, 2).map((event, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        'text-[9px] leading-tight truncate rounded px-1 py-0.5 text-white',
                        event.type === 'goal' ? categoryColors[event.goal.category] : 'bg-gray-600'
                      )}
                      title={event.label}
                    >
                      {event.type === 'goal' ? <Target className="w-2 h-2 inline mr-0.5" /> : <Flag className="w-2 h-2 inline mr-0.5" />}
                      {event.label}
                    </div>
                  ))}
                  {events.length > 2 && (
                    <div className="text-[9px] text-muted-foreground px-1">
                      {t('path_ui.more', { count: events.length - 2 })}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {selectedDay && <section className="mt-4 rounded-2xl border border-border bg-secondary/50 p-4" aria-live="polite" data-testid="goal-calendar-day">
          <h3 className="mb-2 font-semibold text-foreground">{new Intl.DateTimeFormat(locale, { dateStyle: 'full' }).format(selectedDay)}</h3>
          {getEventsForDay(selectedDay).length ? <ul className="space-y-2 text-sm text-foreground">{getEventsForDay(selectedDay).map((event, index) => <li key={index} className="break-words [overflow-wrap:anywhere]">{event.label}</li>)}</ul> : <p className="text-sm text-muted-foreground">{t('progress_ui.common.no_data')}</p>}
        </section>}

        {/* Legend */}
        <div className="mt-6 pt-4 border-t">
          <p className="text-xs font-semibold text-muted-foreground mb-2">{t('path_ui.legend')}</p>
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-1 text-xs">
              <Target className="w-3 h-3 text-muted-foreground" />
              <span className="text-muted-foreground">{t('path_ui.deadline')}</span>
            </div>
            <div className="flex items-center gap-1 text-xs">
              <Flag className="w-3 h-3 text-muted-foreground" />
              <span className="text-muted-foreground">{t('path_ui.milestone')}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {Object.entries(categoryColors).map(([category, color]) => (
              <div key={category} className="flex items-center gap-1 text-xs">
                <div className={cn('w-3 h-3 rounded', color)} />
                <span className="text-muted-foreground capitalize">{t(`goals.card.categories.${category}`)}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
