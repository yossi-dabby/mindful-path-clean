import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { BookOpen, Pencil, Trash2, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import PremiumDialog from '@/components/ui/PremiumDialog';
import { Button } from '@/components/ui/button';
import DailyReflection from './DailyReflection';
import { dailyRecordDate, deleteDailyRecordDate, formatDailyRecordDate, groupDailyRecords, loadDailyRecordsPage } from '@/lib/dailyRecords';

export default function DailyRecordsDialog({ userKey, onClose, onEditCheckIn }) {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [confirmDate, setConfirmDate] = useState(null);
  const [editingFlow, setEditingFlow] = useState(null);
  const [message, setMessage] = useState('');
  const [expandedDates, setExpandedDates] = useState(() => new Set());
  const contentRef = useRef(null);
  const titleRef = useRef(null);
  const cancelRef = useRef(null);
  const returnDate = useRef(null);
  const queryKey = ['dailyRecords', userKey];
  const history = useInfiniteQuery({
    queryKey,
    initialPageParam: 0,
    queryFn: ({ pageParam }) => loadDailyRecordsPage(base44, pageParam),
    getNextPageParam: (page) => page.hasMore ? page.nextOffset : undefined,
    enabled: Boolean(userKey),
  });
  const days = useMemo(() => groupDailyRecords(history.data?.pages), [history.data]);
  const dateLabel = (date) => formatDailyRecordDate(date, i18n.resolvedLanguage || i18n.language) || t('home_practice.records.unknown_date');
  const remove = useMutation({
    mutationFn: (date) => deleteDailyRecordDate(base44, date),
    onSuccess: async ({ date }) => {
      if (date === dailyRecordDate()) {
        queryClient.setQueryData(['todayMood'], null);
        queryClient.setQueryData(['todayFlow'], null);
      }
      for (const key of ['todayMood', 'todayFlow', 'todayExercise', 'moodEntries']) queryClient.invalidateQueries({ queryKey: [key] });
      // Deletions shift list offsets. Start pagination again instead of skipping
      // records with an offset calculated before the removal.
      await queryClient.resetQueries({ queryKey, exact: true }).catch(() => {});
      setMessage(t('home_practice.records.deleted'));
      setConfirmDate(null);
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey });
      for (const key of ['todayMood', 'todayFlow']) queryClient.invalidateQueries({ queryKey: [key] });
    },
  });
  useEffect(() => {
    if (confirmDate) cancelRef.current?.focus();
    else if (returnDate.current) {
      const button = contentRef.current?.querySelector(`[data-delete-date="${returnDate.current}"]`);
      (button || titleRef.current)?.focus();
      returnDate.current = null;
    }
  }, [confirmDate]);
  const requestRemoval = (date) => { returnDate.current = date; remove.reset(); setConfirmDate(date); };
  const close = () => { if (!remove.isPending) onClose(); };

  return (
    <PremiumDialog label={t('home_practice.records.title')} onClose={close} className="fixed inset-0 overflow-y-auto bg-black/50 p-3 backdrop-blur-sm sm:p-4">
      <div className="flex min-h-full items-start justify-center py-4 sm:items-center sm:py-8">
        <div ref={contentRef} className="w-full max-w-2xl rounded-[28px] border border-border bg-card p-5 text-foreground shadow-2xl sm:p-8" data-testid="daily-records-dialog">
          <div className="mb-4 flex items-start justify-between gap-3">
            <h2 ref={titleRef} tabIndex={-1} className="flex min-w-0 items-center gap-2 text-2xl font-semibold outline-none"><BookOpen className="h-5 w-5 shrink-0" />{t('home_practice.records.title')}</h2>
            <Button variant="ghost" size="icon" onClick={close} disabled={remove.isPending} aria-label={t('common.close')} className="shrink-0"><X className="h-5 w-5" /></Button>
          </div>
          <p className="mb-5 text-sm leading-relaxed text-muted-foreground">{t('home_practice.records.storage')}</p>
          {confirmDate ? (
            <section aria-labelledby="daily-records-delete-title" className="space-y-4" data-testid="daily-records-confirm-delete">
              <h3 id="daily-records-delete-title" className="text-lg font-semibold">{t('home_practice.records.confirm_title', { date: dateLabel(confirmDate) })}</h3>
              <p className="leading-relaxed">{t('home_practice.records.delete_scope')}</p>
              {remove.isError && <p role="alert" className="rounded-xl border border-border bg-secondary p-3">{t('home_practice.records.delete_error')}</p>}
              <div className="flex flex-wrap gap-3">
                <Button ref={cancelRef} variant="outline" disabled={remove.isPending} onClick={() => setConfirmDate(null)} className="h-auto flex-1 whitespace-normal">{t('common.cancel')}</Button>
                <Button variant="destructive" disabled={remove.isPending} aria-busy={remove.isPending} onClick={() => remove.mutate(confirmDate)} className="h-auto flex-1 whitespace-normal">{t(remove.isPending ? 'home_practice.records.deleting' : 'home_practice.records.confirm_delete')}</Button>
              </div>
            </section>
          ) : (
            <>
              {message && <p role="status" className="mb-4 rounded-xl bg-secondary p-3">{message}</p>}
              {history.isPending && <p role="status">{t('common.loading')}</p>}
              {history.isError && <div role="alert" className="mb-4 space-y-3 rounded-xl border border-border p-4"><p>{t('home_practice.records.load_error')}</p><Button variant="outline" onClick={() => history.refetch()}>{t('common.retry')}</Button></div>}
              {!history.isPending && !history.isError && days.length === 0 && <p className="rounded-2xl bg-muted p-5">{t('home_practice.records.empty')}</p>}
              <div className="space-y-3">
                {days.map((day) => <details key={day.date} open={expandedDates.has(day.date)} onToggle={(event) => {
                  const open = event.currentTarget.open;
                  setExpandedDates((current) => {
                    if (current.has(day.date) === open) return current;
                    const next = new Set(current);
                    if (open) next.add(day.date); else next.delete(day.date);
                    return next;
                  });
                }} className="rounded-2xl border border-border bg-muted/50" data-testid="daily-record-day" data-date={day.date}>
                  <summary className="cursor-pointer rounded-2xl p-4 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><time dateTime={day.date}>{dateLabel(day.date)}</time></summary>
                  <div className="space-y-4 border-t border-border p-4">
                    {day.moods.map((mood) => <section key={mood.id} className="rounded-xl border border-border bg-card p-4" data-testid="saved-checkin">
                      <h3 className="font-semibold">{t('home_practice.checkin_title')}</h3>
                      <dl className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                        <div><dt className="text-muted-foreground">{t('home_practice.checkin_mood')}</dt><dd>{t(`onboarding.mood.${mood.mood === 'excellent' ? 'great' : mood.mood}`, { defaultValue: mood.mood })}</dd></div>
                        {mood.energy_level && <div><dt className="text-muted-foreground">{t('home_practice.checkin_energy')}</dt><dd>{t(`home_practice.energy_${mood.energy_level}`)}</dd></div>}
                        {mood.stress_level != null && <div><dt className="text-muted-foreground">{t('home_practice.checkin_stress')}</dt><dd>{mood.stress_level}/10</dd></div>}
                      </dl>
                      {mood.notes && <p dir="auto" className="mt-3 whitespace-pre-wrap break-words leading-relaxed">{mood.notes}</p>}
                    </section>)}
                    {day.flows.map((flow) => <section key={flow.id} className="rounded-xl border border-border bg-card p-4" data-testid="saved-reflection">
                      <h3 className="font-semibold">{t('home_practice.reflection_title')}</h3>
                      {flow.key_insight && <div className="mt-3"><h4 className="text-sm font-semibold">{t('home_practice.insight_title')}</h4><p dir="auto" className="mt-1 whitespace-pre-wrap break-words">{flow.key_insight}</p></div>}
                      {flow.daily_takeaway ? <div className="mt-3"><h4 className="text-sm font-semibold">{t('home_practice.records.saved_focus')}</h4><p dir="auto" className="mt-1 whitespace-pre-wrap break-words">{flow.daily_takeaway}</p></div> : <p className="mt-3 text-sm text-muted-foreground">{t('home_practice.records.no_reflection')}</p>}
                      {(flow.exercise_completed || flow.reflection_completed || flow.daily_takeaway) && <Button variant="outline" className="mt-4 h-auto whitespace-normal" onClick={() => setEditingFlow(flow)}><Pencil className="h-4 w-4" />{t('home_practice.records.edit_reflection')}</Button>}
                    </section>)}
                    <div className="flex flex-wrap gap-2">
                      {day.date === dailyRecordDate() && <Button variant="outline" className="h-auto whitespace-normal" onClick={onEditCheckIn}>{t('home_practice.records.edit_checkin')}</Button>}
                      {day.canDelete && <Button variant="outline" className="h-auto whitespace-normal" data-delete-date={day.date} onClick={() => requestRemoval(day.date)}><Trash2 className="h-4 w-4" />{t(day.date === dailyRecordDate() ? 'home_practice.records.reset_today' : 'home_practice.records.delete_day')}</Button>}
                    </div>
                  </div>
                </details>)}
              </div>
              {history.hasNextPage && <Button variant="outline" className="mt-5 w-full" disabled={history.isFetching} onClick={() => history.fetchNextPage()}>{t(history.isFetchingNextPage ? 'common.loading' : 'home_practice.records.load_more')}</Button>}
            </>
          )}
        </div>
      </div>
      {editingFlow && <DailyReflection todayFlow={editingFlow} onClose={() => setEditingFlow(null)} />}
    </PremiumDialog>
  );
}
