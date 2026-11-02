import BotanicalAccent from '@/components/brand/BotanicalAccent';
import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, BarChart, Bar, Legend, ReferenceLine, Cell
} from 'recharts';
import { subDays, isAfter } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, TrendingDown, TrendingUp, Minus, Brain, BookOpen, BarChart2, Target, RefreshCw } from 'lucide-react';
import { journalNumberOrNull as numberOrNull } from '@/components/journal/journalPresentation';

const RANGE_OPTIONS = [
  { key: '14', days: 14 },
  { key: '30', days: 30 },
  { key: '90', days: 90 },
  { key: 'all', days: null }
];

const DISTORTION_COLORS = ['#0f766e', '#7c3aed', '#d97706', '#dc2626', '#059669', '#2563eb', '#db2777', '#4f46e5'];
const normalizeTaxonomyKey = (value = '') => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

function CustomTooltip({ active, payload, label, t }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="max-w-full [overflow-wrap:anywhere] rounded-xl border border-border bg-[hsl(var(--card)/0.97)] p-3 text-sm shadow-lg">
      <p className="mb-1 font-semibold text-muted-foreground">{label}</p>
      {payload.map((item) => (
        <p key={item.dataKey} className="flex items-center gap-1 text-foreground">
          <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
          {t('journal_ui.dashboard.tooltip_value', {
            name: item.name,
            value: typeof item.value === 'number' ? item.value.toFixed(1) : item.value
          })}
        </p>
      ))}
    </div>
  );
}

export default function JournalDashboard() {
  const { t, i18n } = useTranslation();
  const [range, setRange] = useState(30);
  const locale = i18n.resolvedLanguage || i18n.language || 'en';
  const dateLabel = (value) => new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(new Date(value));

  const userQuery = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: 300000
  });
  const userEmail = userQuery.data?.email;

  const journalsQuery = useQuery({
    queryKey: ['thoughtJournals', userEmail],
    queryFn: () => base44.entities.ThoughtJournal.filter({ created_by: userEmail }, '-created_date', 300),
    enabled: Boolean(userEmail),
  });

  const filteredJournals = useMemo(() => {
    const journals = Array.isArray(journalsQuery.data) ? journalsQuery.data : [];
    if (!range) return journals;
    const cutoff = subDays(new Date(), range);
    return journals.filter((entry) => entry.created_date && isAfter(new Date(entry.created_date), cutoff));
  }, [journalsQuery.data, range]);

  const intensityTrend = useMemo(() => filteredJournals
    .map((entry) => ({
      date: dateLabel(entry.created_date),
      timestamp: new Date(entry.created_date).getTime(),
      before: numberOrNull(entry.emotion_intensity),
      after: numberOrNull(entry.outcome_emotion_intensity)
    }))
    .filter((entry) => entry.before !== null)
    .sort((a, b) => a.timestamp - b.timestamp), [filteredJournals, locale]);

  const dailyAverage = useMemo(() => {
    const buckets = new Map();
    filteredJournals.forEach((entry) => {
      const before = numberOrNull(entry.emotion_intensity);
      if (before === null || !entry.created_date) return;
      const dayKey = new Date(entry.created_date).toISOString().slice(0, 10);
      const bucket = buckets.get(dayKey) || { date: dateLabel(entry.created_date), timestamp: new Date(entry.created_date).getTime(), before: [], after: [] };
      bucket.before.push(before);
      const after = numberOrNull(entry.outcome_emotion_intensity);
      if (after !== null) bucket.after.push(after);
      buckets.set(dayKey, bucket);
    });
    return [...buckets.values()].map((bucket) => ({
      date: bucket.date,
      timestamp: bucket.timestamp,
      avgBefore: +(bucket.before.reduce((sum, value) => sum + value, 0) / bucket.before.length).toFixed(1),
      avgAfter: bucket.after.length ? +(bucket.after.reduce((sum, value) => sum + value, 0) / bucket.after.length).toFixed(1) : null
    })).sort((a, b) => a.timestamp - b.timestamp);
  }, [filteredJournals, locale]);

  const distortionFreq = useMemo(() => {
    const counts = {};
    filteredJournals.forEach((entry) => {
      (Array.isArray(entry.cognitive_distortions) ? entry.cognitive_distortions : []).forEach((distortion) => {
        counts[distortion] = (counts[distortion] || 0) + 1;
      });
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([rawName, count], index) => ({
      name: t(`journal_ui.taxonomy.distortions.${normalizeTaxonomyKey(rawName)}`, { defaultValue: rawName.replace(/_/g, ' ') }),
      count,
      fill: DISTORTION_COLORS[index % DISTORTION_COLORS.length]
    }));
  }, [filteredJournals, t, locale]);

  const emotionFreq = useMemo(() => {
    const counts = {};
    filteredJournals.forEach((entry) => {
      (Array.isArray(entry.emotions) ? entry.emotions : []).forEach((emotion) => {
        counts[emotion] = (counts[emotion] || 0) + 1;
      });
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [filteredJournals]);

  const stats = useMemo(() => {
    const beforeValues = filteredJournals.map((entry) => numberOrNull(entry.emotion_intensity)).filter((value) => value !== null);
    const paired = filteredJournals.map((entry) => ({
      before: numberOrNull(entry.emotion_intensity),
      after: numberOrNull(entry.outcome_emotion_intensity)
    })).filter(({ before, after }) => before !== null && after !== null);
    const avgReduction = paired.length
      ? +(paired.reduce((sum, entry) => sum + (entry.before - entry.after), 0) / paired.length).toFixed(1)
      : null;
    const avgBefore = beforeValues.length
      ? +(beforeValues.reduce((sum, value) => sum + value, 0) / beforeValues.length).toFixed(1)
      : null;
    return { total: filteredJournals.length, avgReduction, avgBefore, reframed: paired.length };
  }, [filteredJournals]);

  const TrendIcon = stats.avgReduction > 0 ? TrendingDown : stats.avgReduction < 0 ? TrendingUp : Minus;
  const trendColor = stats.avgReduction > 0 ? '#0f766e' : stats.avgReduction < 0 ? '#dc2626' : '#64748b';
  const isLoading = userQuery.isLoading || journalsQuery.isLoading;
  const hasError = userQuery.isError || journalsQuery.isError;
  const chartTooltip = <CustomTooltip t={t} />;

  return (
    <main data-testid="journal-dashboard" className="mx-auto min-h-[100dvh] w-full max-w-6xl px-3 pb-32 pt-4 sm:px-5 md:px-8 md:pb-20">
      <header className="mb-6 rounded-[28px] border border-border/70 bg-[hsl(var(--card)/0.97)] p-4 shadow-[0_18px_55px_rgba(20,92,82,0.12)] backdrop-blur-xl sm:p-6">
        <div className="flex items-start gap-3">
          <Link to={createPageUrl('Journal')} aria-label={t('journal_ui.dashboard.back')}>
            <Button variant="ghost" size="icon" className="min-h-11 min-w-11 rounded-full">
              <ArrowLeft className="h-5 w-5 rtl:rotate-180" />
            </Button>
          </Link>
          <div>
            <div className="botanical-title-row"><h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{t('journal_ui.dashboard.title')}</h1><BotanicalAccent variant="leaves" className="botanical-title-art" /></div>
            <p className="mt-1 text-sm font-medium text-primary sm:text-base">{t('journal_ui.dashboard.subtitle')}</p>
          </div>
        </div>
      </header>

      <div role="group" aria-label={t('journal_ui.dashboard.range_aria')} className="mb-6 grid grid-cols-2 gap-2 rounded-2xl border border-border/70 bg-[hsl(var(--card)/0.97)] p-2 backdrop-blur-lg sm:flex sm:w-fit">
        {RANGE_OPTIONS.map((option) => (
          <Button key={option.key} variant={range === option.days ? 'default' : 'ghost'} size="sm"
            onClick={() => setRange(option.days)} aria-pressed={range === option.days}
            className={`min-h-11 rounded-xl px-4 ${range === option.days ? 'bg-primary text-primary-foreground hover:bg-primary' : 'text-primary hover:bg-[hsl(var(--card)/0.97)]'}`}>
            {t(`journal_ui.dashboard.range_${option.key}`)}
          </Button>
        ))}
      </div>

      {hasError ? (
        <Card className="border-destructive/30 bg-[hsl(var(--card)/0.97)]">
          <CardContent className="p-8 text-center">
            <p role="alert" className="font-medium text-foreground">{t('journal_ui.dashboard.load_error')}</p>
            <Button onClick={() => { userQuery.refetch(); journalsQuery.refetch(); }} className="mt-4 min-h-11 rounded-2xl">
              <RefreshCw className="h-4 w-4" />{t('journal_ui.common.retry')}
            </Button>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="py-20 text-center" role="status">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-border border-t-teal-700" />
          <p className="mt-3 text-muted-foreground">{t('journal_ui.dashboard.loading')}</p>
        </div>
      ) : filteredJournals.length === 0 ? (
        <Card className="border-border/70 bg-[hsl(var(--card)/0.97)] shadow-md">
          <CardContent className="p-8 text-center sm:p-12">
            <BookOpen className="mx-auto mb-4 h-12 w-12 text-primary" />
            <h2 className="text-xl font-bold text-foreground">{t('journal_ui.dashboard.empty_title')}</h2>
            <p className="mx-auto mt-2 max-w-md text-muted-foreground">{t('journal_ui.dashboard.empty_description')}</p>
            <Link to={createPageUrl('Journal')}>
              <Button className="mt-5 min-h-11 rounded-2xl bg-primary text-primary-foreground hover:bg-primary">{t('journal_ui.dashboard.go_journal')}</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { label: t('journal_ui.dashboard.entries'), value: stats.total, icon: BookOpen, color: '#0f766e' },
              { label: t('journal_ui.dashboard.avg_start'), value: stats.avgBefore !== null ? `${stats.avgBefore}/10` : '—', icon: Brain, color: '#7c3aed' },
              { label: t('journal_ui.dashboard.avg_reduction'), value: stats.avgReduction !== null ? `${stats.avgReduction > 0 ? '-' : '+'}${Math.abs(stats.avgReduction)}` : '—', icon: TrendIcon, color: trendColor },
              { label: t('journal_ui.dashboard.reframed'), value: stats.reframed, icon: Target, color: '#d97706' }
            ].map(({ label, value, icon: Icon, color }) => (
              <Card key={label} className="border-border/70 bg-[hsl(var(--card)/0.97)] shadow-sm backdrop-blur-xl">
                <CardContent className="flex min-h-32 flex-col gap-1 p-4">
                  <Icon className="mb-1 h-5 w-5" style={{ color }} />
                  <p className="text-2xl font-bold text-foreground"><bdi dir="ltr">{value}</bdi></p>
                  <p className="text-xs font-medium text-muted-foreground">{label}</p>
                </CardContent>
              </Card>
            ))}
          </section>

          {intensityTrend.length > 1 && (
            <Card className="border-border/70 bg-[hsl(var(--card)/0.97)] shadow-sm backdrop-blur-xl">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-start gap-2 text-base font-bold text-primary">
                  <BarChart2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  {t('journal_ui.dashboard.intensity_title')}
                </CardTitle>
                <p className="text-xs text-muted-foreground">{t('journal_ui.dashboard.intensity_description')}</p>
              </CardHeader>
              <CardContent>
                <div className="min-w-0 pb-2">
                  <div className="h-[270px] w-full min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={intensityTrend} margin={{ top: 5, right: 16, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} minTickGap={24} interval="preserveStartEnd" />
                        <YAxis domain={[0, 10]} ticks={[0, 2, 4, 6, 8, 10]} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                        <Tooltip content={chartTooltip} position={{ x: 0 }} wrapperStyle={{ maxWidth: '100%', whiteSpace: 'normal' }} />
                        <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} formatter={(value) => <span className="text-foreground">{value}</span>} />
                        <ReferenceLine y={5} stroke="rgba(15,118,110,0.18)" strokeDasharray="4 4" />
                        <Area type="monotone" dataKey="before" name={t('journal_ui.dashboard.before')} stroke="#7c3aed" strokeWidth={2.5} fill="#7c3aed18" dot={{ fill: '#7c3aed', r: 3 }} connectNulls />
                        <Area type="monotone" dataKey="after" name={t('journal_ui.dashboard.after')} stroke="#0f766e" strokeWidth={2.5} fill="#0f766e18" dot={{ fill: '#0f766e', r: 3 }} connectNulls />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {dailyAverage.length > 1 && (
            <Card className="border-border/70 bg-[hsl(var(--card)/0.97)] shadow-sm backdrop-blur-xl">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base font-bold text-primary">
                  <TrendingDown className="h-5 w-5 text-primary" />
                  {t('journal_ui.dashboard.daily_title')}
                </CardTitle>
                <p className="text-xs text-muted-foreground">{t('journal_ui.dashboard.daily_description')}</p>
              </CardHeader>
              <CardContent>
                <div className="min-w-0 pb-2">
                  <div className="h-[230px] w-full min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={dailyAverage} margin={{ top: 5, right: 16, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} minTickGap={24} interval="preserveStartEnd" />
                        <YAxis domain={[0, 10]} ticks={[0, 2, 4, 6, 8, 10]} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                        <Tooltip content={chartTooltip} position={{ x: 0 }} wrapperStyle={{ maxWidth: '100%', whiteSpace: 'normal' }} />
                        <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} formatter={(value) => <span className="text-foreground">{value}</span>} />
                        <Line type="monotone" dataKey="avgBefore" name={t('journal_ui.dashboard.avg_before')} stroke="#7c3aed" strokeWidth={2.5} dot={{ fill: '#7c3aed', r: 4 }} connectNulls />
                        <Line type="monotone" dataKey="avgAfter" name={t('journal_ui.dashboard.avg_after')} stroke="#0f766e" strokeWidth={2.5} strokeDasharray="5 3" dot={{ fill: '#0f766e', r: 4 }} connectNulls />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {distortionFreq.length > 0 && (
              <Card className="border-border/70 bg-[hsl(var(--card)/0.97)] shadow-sm backdrop-blur-xl">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base font-bold text-primary">
                    <Brain className="h-5 w-5 text-purple-700" />{t('journal_ui.dashboard.patterns_title')}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">{t('journal_ui.dashboard.patterns_description')}</p>
                </CardHeader>
                <CardContent>
                  <div className="min-w-0 pb-2">
                    <div className="h-[240px] w-full min-w-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={distortionFreq} layout="vertical" margin={{ top: 0, right: 10, left: 8, bottom: 0 }}>
                          <XAxis type="number" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} allowDecimals={false} />
                          <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--foreground))' }} tickLine={false} axisLine={false} width={150} />
                          <Tooltip content={chartTooltip} position={{ x: 0 }} wrapperStyle={{ maxWidth: '100%', whiteSpace: 'normal' }} />
                          <Bar dataKey="count" name={t('journal_ui.dashboard.times_identified')} radius={[0, 6, 6, 0]}>
                            {distortionFreq.map((entry) => <Cell key={entry.name} fill={entry.fill} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {emotionFreq.length > 0 && (
              <Card className="border-border/70 bg-[hsl(var(--card)/0.97)] shadow-sm backdrop-blur-xl">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base font-bold text-primary">
                    <Target className="h-5 w-5 text-amber-600" />{t('journal_ui.dashboard.emotions_title')}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">{t('journal_ui.dashboard.emotions_description')}</p>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2 pt-2">
                    {emotionFreq.map(([emotion, count], index) => (
                      <Badge key={emotion} className="rounded-full border border-border px-3 py-1.5 text-sm text-primary"
                        style={{ backgroundColor: `rgba(20,184,166,${0.10 + (index / Math.max(emotionFreq.length, 1)) * 0.24})` }}>
                        {t(`journal_ui.taxonomy.emotions.${normalizeTaxonomyKey(emotion)}`, {
                          defaultValue: t(`mood_tracker.taxonomy.emotions.${normalizeTaxonomyKey(emotion)}`, { defaultValue: emotion })
                        })}
                        <span className="ms-1 opacity-65">×{count}</span>
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
