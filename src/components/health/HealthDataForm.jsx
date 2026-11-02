import PremiumDialog from '@/components/ui/PremiumDialog';
import React, { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import BottomSheetSelect from '@/components/ui/bottom-sheet-select';
import { Textarea } from '@/components/ui/textarea';
import { X, Activity, Moon, Heart, Droplet, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const numberOrEmpty = (value) => value === '' ? '' : Number(value);

export default function HealthDataForm({ metric, onClose }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState(metric || { date: new Date().toISOString().split('T')[0], sleep_hours: '', sleep_quality: '', steps: '', active_minutes: '', heart_rate_avg: '', heart_rate_resting: '', exercise_type: '', exercise_duration: '', water_intake: '', caffeine_mg: '', source: 'manual', notes: '' });
  const sleepQualityOptions = useMemo(() => ['poor', 'fair', 'good', 'excellent'].map((value) => ({ value, label: t(`progress_ui.quality.${value}`) })), [t]);


  const saveMutation = useMutation({
    mutationFn: (data) => {
      const cleanData = Object.fromEntries(Object.entries(data).filter(([, value]) => value !== '' && value !== null && !(typeof value === 'number' && Number.isNaN(value))));
      return metric ? base44.entities.HealthMetric.update(metric.id, cleanData) : base44.entities.HealthMetric.create(cleanData);
    },
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: ['healthMetrics'] });
      const previousHealthMetrics = queryClient.getQueryData(['healthMetrics']);
      const cleanData = Object.fromEntries(Object.entries(data).filter(([, value]) => value !== '' && value !== null));
      const optimisticEntry = { ...(metric || {}), ...cleanData, id: metric?.id || `temp-${Date.now()}`, created_date: metric?.created_date || new Date().toISOString() };
      queryClient.setQueryData(['healthMetrics'], (old = []) => metric ? old.map((item) => item.id === metric.id ? optimisticEntry : item) : [optimisticEntry, ...old]);
      return { previousHealthMetrics };
    },
    onSuccess: onClose,
    onError: (_error, _variables, context) => { if (context?.previousHealthMetrics) queryClient.setQueryData(['healthMetrics'], context.previousHealthMetrics); },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['healthMetrics'] })
  });

  const field = (key, label, props = {}) => <div><label htmlFor={`health-${key}`} className="mb-1 block text-sm text-foreground">{label}</label><Input id={`health-${key}`} value={formData[key]} onChange={(event) => setFormData((current) => ({ ...current, [key]: props.numeric ? numberOrEmpty(event.target.value) : event.target.value }))} className="min-h-11" {...props} /></div>;

  return (
    <PremiumDialog onClose={onClose} label={t('progress_ui.form.title')} className="goal-dialog flex items-center justify-center p-3 sm:p-4" role="dialog" aria-modal="true" aria-labelledby="health-form-title" data-testid="health-form-dialog" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <Card className="max-h-[92dvh] w-full max-w-2xl overflow-hidden rounded-b-none sm:rounded-[var(--radius-card)] border-border shadow-2xl">
        <CardHeader className="border-b p-4 sm:p-6"><div className="flex items-center justify-between gap-3"><CardTitle id="health-form-title">{t('progress_ui.form.title')}</CardTitle><Button variant="ghost" size="icon" className="min-h-11 min-w-11 rounded-full" onClick={onClose} aria-label={t('progress_ui.common.close')}><X className="h-5 w-5" /></Button></div></CardHeader>
        <CardContent className="max-h-[calc(92dvh-76px)] overflow-y-auto p-4 sm:p-6">
          <form className="space-y-5" onSubmit={(event) => { event.preventDefault(); saveMutation.mutate(formData); }}>
            {field('date', t('progress_ui.form.date'), { type: 'date', required: true })}
            <section className="rounded-xl bg-secondary/45 p-4"><h3 className="mb-3 flex items-center gap-2 font-semibold text-foreground"><Moon className="h-5 w-5 text-purple-700" />{t('progress_ui.form.sleep')}</h3><div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{field('sleep_hours', t('progress_ui.form.hours'), { type: 'number', step: '0.5', min: '0', max: '24', numeric: true })}<div><label className="mb-1 block text-sm text-foreground">{t('progress_ui.form.quality')}</label><BottomSheetSelect value={formData.sleep_quality} onValueChange={(value) => setFormData((current) => ({ ...current, sleep_quality: value }))} options={sleepQualityOptions} title={t('progress_ui.form.sleep_quality')} placeholder={t('progress_ui.form.select')} /></div></div></section>
            <section className="rounded-xl bg-secondary/45 p-4"><h3 className="mb-3 flex items-center gap-2 font-semibold text-foreground"><Activity className="h-5 w-5 text-green-700" />{t('progress_ui.form.activity')}</h3><div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{field('steps', t('progress_ui.form.steps'), { type: 'number', min: '0', numeric: true })}{field('active_minutes', t('progress_ui.form.active_minutes'), { type: 'number', min: '0', numeric: true })}{field('exercise_type', t('progress_ui.form.exercise_type'))}{field('exercise_duration', t('progress_ui.form.duration'), { type: 'number', min: '0', numeric: true })}</div></section>
            <section className="rounded-xl bg-secondary/45 p-4"><h3 className="mb-3 flex items-center gap-2 font-semibold text-foreground"><Heart className="h-5 w-5 text-red-700" />{t('progress_ui.form.heart')}</h3><div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{field('heart_rate_avg', t('progress_ui.form.average_bpm'), { type: 'number', min: '0', numeric: true })}{field('heart_rate_resting', t('progress_ui.form.resting_bpm'), { type: 'number', min: '0', numeric: true })}</div></section>
            <section className="rounded-xl bg-secondary/45 p-4"><h3 className="mb-3 flex items-center gap-2 font-semibold text-foreground"><Droplet className="h-5 w-5 text-blue-700" />{t('progress_ui.form.wellness')}</h3><div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{field('water_intake', t('progress_ui.form.water'), { type: 'number', min: '0', numeric: true })}{field('caffeine_mg', t('progress_ui.form.caffeine'), { type: 'number', min: '0', numeric: true })}</div></section>
            <div><label htmlFor="health-notes" className="mb-1 block text-sm font-medium text-foreground">{t('progress_ui.form.notes')}</label><Textarea id="health-notes" value={formData.notes} onChange={(event) => setFormData((current) => ({ ...current, notes: event.target.value }))} placeholder={t('progress_ui.form.notes_placeholder')} className="min-h-24" /></div>
            {saveMutation.isError && <p className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive" role="alert"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{t('progress_ui.form.save_error')}</p>}
            <div className="sticky bottom-0 grid grid-cols-2 gap-3 bg-card pt-2"><Button type="button" variant="outline" className="min-h-11" onClick={onClose}>{t('progress_ui.common.cancel')}</Button><Button type="submit" className="min-h-11" disabled={saveMutation.isPending}>{t(saveMutation.isPending ? 'progress_ui.common.saving' : 'progress_ui.common.save')}</Button></div>
          </form>
        </CardContent>
      </Card>
    </PremiumDialog>
  );
}
