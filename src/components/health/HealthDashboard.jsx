import React, { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Activity, Moon, Heart, AlertCircle, Loader2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import HealthDataForm from './HealthDataForm';
import PullToRefresh from '@/components/utils/PullToRefresh';
import { useTranslation } from 'react-i18next';

export default function HealthDashboard() {
  const { t, i18n } = useTranslation();
  const [showForm, setShowForm] = useState(false);
  const { data: healthMetrics = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['healthMetrics'],
    queryFn: () => base44.entities.HealthMetric.list('-date', 30)
  });
  const safeMetrics = Array.isArray(healthMetrics) ? healthMetrics : [];
  const locale = i18n.resolvedLanguage || i18n.language || 'en';
  const dateFormatter = useMemo(() => new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }), [locale]);
  const recentMetrics = safeMetrics.slice(0, 7);
  const average = (field) => {
    const values = recentMetrics.map((metric) => Number(metric?.[field])).filter((value) => Number.isFinite(value) && value > 0);
    return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
  };
  const avgSleep = average('sleep_hours');
  const avgSteps = average('steps');
  const avgHeartRate = average('heart_rate_avg');
  const chartData = useMemo(() => safeMetrics.slice(0, 14).reverse().filter((metric) => metric?.date).map((metric) => ({
    date: dateFormatter.format(new Date(`${metric.date}T12:00:00`)),
    sleep: Number(metric.sleep_hours) || null,
    steps: Number(metric.steps) ? Number(metric.steps) / 1000 : null,
    heartRate: Number(metric.heart_rate_avg) || null
  })), [safeMetrics, dateFormatter]);

  if (isLoading) return <div className="flex min-h-64 items-center justify-center gap-2 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" />{t('progress_ui.common.loading')}</div>;
  if (isError) return <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center"><AlertCircle className="mx-auto mb-3 h-8 w-8 text-destructive" /><p className="mb-4 text-sm text-foreground">{t('progress_ui.common.load_error')}</p><Button variant="outline" onClick={() => refetch()}>{t('progress_ui.common.retry')}</Button></div>;

  const form = showForm ? <HealthDataForm onClose={() => setShowForm(false)} /> : null;
  if (!safeMetrics.length) return (
    <PullToRefresh queryKeys={['healthMetrics']}>
      <div className="space-y-4" data-testid="progress-health">
        <Card className="border border-border/80 bg-card shadow-[var(--shadow-md)]"><CardContent className="p-6 sm:p-10 text-center"><div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary shadow-sm"><Activity className="h-8 w-8 text-primary" /></div><h2 className="mb-2 text-xl sm:text-2xl font-semibold text-foreground">{t('progress_ui.health.title')}</h2><p className="mx-auto mb-2 max-w-lg text-muted-foreground">{t('progress_ui.health.intro')}</p><p className="mx-auto mb-6 max-w-lg text-xs text-muted-foreground">{t('progress_ui.health.notice')}</p><Button onClick={() => setShowForm(true)} className="min-h-11 w-full sm:w-auto"><Plus className="h-5 w-5" />{t('progress_ui.health.log')}</Button></CardContent></Card>
        {form}
      </div>
    </PullToRefresh>
  );

  return (
    <PullToRefresh queryKeys={['healthMetrics']}>
      <div className="space-y-6" data-testid="progress-health">
        <p className="rounded-xl border border-border bg-secondary/45 p-3 text-xs text-foreground">{t('progress_ui.health.notice')}</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            [t('progress_ui.health.avg_sleep'), avgSleep ? `${avgSleep.toFixed(1)} h` : '—', Moon, 'bg-secondary/45', 'text-blue-700'],
            [t('progress_ui.health.avg_steps'), avgSteps ? Math.round(avgSteps).toLocaleString(locale) : '—', Activity, 'bg-secondary/45', 'text-emerald-700'],
            [t('progress_ui.health.avg_heart'), avgHeartRate ? `${Math.round(avgHeartRate)} bpm` : '—', Heart, 'bg-secondary/45', 'text-rose-700']
          ].map(([label, value, Icon, background, color]) => <Card key={label} className="border-border/70"><CardContent className={`p-4 ${background}`}><div className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="mb-1 text-xs sm:text-sm text-muted-foreground break-words">{label}</p><p className="text-2xl font-bold text-foreground">{value}</p></div><Icon className={`h-8 w-8 shrink-0 ${color}`} /></div></CardContent></Card>)}
        </div>
        <Card className="border border-border/80 bg-card shadow-[var(--shadow-md)]"><CardContent className="p-4 sm:p-6"><div className="mb-4 flex flex-col min-[420px]:flex-row min-[420px]:items-center justify-between gap-3"><h3 className="font-semibold text-foreground">{t('progress_ui.health.trends')}</h3><Button onClick={() => setShowForm(true)} className="min-h-11 w-full min-[420px]:w-auto" size="sm"><Plus className="h-4 w-4" />{t('progress_ui.health.log')}</Button></div><div className="h-[270px] w-full min-w-0" role="img" aria-label={t('progress_ui.health.trends')}>{chartData.some(row => row.sleep || row.steps || row.heartRate) ? <ResponsiveContainer width="100%" height="100%"><LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}><XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" /><YAxis tick={{ fontSize: 10 }} /><Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px' }} /><Legend wrapperStyle={{ fontSize: 11 }} /><Line type="monotone" dataKey="sleep" stroke="#2563eb" name={t('progress_ui.health.sleep_hours')} strokeWidth={2} dot={false} /><Line type="monotone" dataKey="steps" stroke="#059669" name={t('progress_ui.health.steps_thousands')} strokeWidth={2} dot={false} /><Line type="monotone" dataKey="heartRate" stroke="#e11d48" name={t('progress_ui.health.heart_rate')} strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer> : <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">{t('progress_ui.common.no_data')}</div>}</div></CardContent></Card>
        {form}
      </div>
    </PullToRefresh>
  );
}
