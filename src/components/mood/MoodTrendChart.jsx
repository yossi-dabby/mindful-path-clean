import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import BottomSheetSelect from '@/components/ui/bottom-sheet-select';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { de, enUS, es, fr, he, it, ptBR } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { getCurrentAppLocale } from '@/components/i18n/appLocale';

const DATE_FNS_LOCALES = { en: enUS, he, es, fr, de, it, pt: ptBR };

const moodValues = {
  excellent: 5,
  good: 4,
  okay: 3,
  low: 2,
  very_low: 1
};

export default function MoodTrendChart({ entries, dateRange, onDateRangeChange }) {
  const { t, i18n } = useTranslation();
  const appLocale = getCurrentAppLocale(i18n);
  const dateLocale = DATE_FNS_LOCALES[appLocale] || enUS;
  const dateRangeOptions = React.useMemo(() => [
    { value: '7', label: t('mood_tracker.analytics.range_last_7_days') },
    { value: '14', label: t('mood_tracker.analytics.range_last_2_weeks') },
    { value: '30', label: t('mood_tracker.analytics.range_last_month') },
    { value: '90', label: t('mood_tracker.analytics.range_last_3_months') }
  ], [t]);

  const energyValue = (level) => {
    const map = { very_low: 2, low: 4, moderate: 6, high: 8, very_high: 10 };
    return map[level] || 6;
  };

  const chartData = React.useMemo(() => {
    const today = new Date();
    const data = [];

    for (let i = dateRange - 1; i >= 0; i--) {
      const date = format(subDays(today, i), 'yyyy-MM-dd');
      const entry = entries.find((e) => e.date === date);

      data.push({
        date: format(subDays(today, i), 'MMM dd', { locale: dateLocale }),
        mood: entry ? moodValues[entry.mood] : null,
        stress: entry ? entry.stress_level : null,
        energy: entry ? energyValue(entry.energy_level) : null,
        intensity: entry ? entry.intensity : null
      });
    }

    return data;
  }, [entries, dateRange, dateLocale]);

  const stats = React.useMemo(() => {
    const todayKey = format(new Date(), 'yyyy-MM-dd');
    const cutoffKey = format(subDays(new Date(), dateRange - 1), 'yyyy-MM-dd');
    const validEntries = entries
      .filter((entry) => entry.date >= cutoffKey && entry.date <= todayKey && moodValues[entry.mood])
      .sort((a, b) => b.date.localeCompare(a.date));
    if (validEntries.length === 0) return null;

    const avgMood = validEntries.reduce((sum, e) => sum + moodValues[e.mood], 0) / validEntries.length;

    // Calculate stress average, handling missing data
    const entriesWithStress = validEntries.filter((e) => e.stress_level != null && !isNaN(e.stress_level));
    const avgStress = entriesWithStress.length > 0 ?
    entriesWithStress.reduce((sum, e) => sum + e.stress_level, 0) / entriesWithStress.length :
    null;

    const trend = validEntries.length >= 2 ?
    moodValues[validEntries[0].mood] - moodValues[validEntries[validEntries.length - 1].mood] :
    0;

    return { avgMood, avgStress, trend };
  }, [entries, dateRange]);

  return (
    <Card className="overflow-hidden bg-card/90 text-card-foreground rounded-[var(--radius-card)] backdrop-blur-xl border border-border/75 shadow-[var(--shadow-md)]" data-testid="mood-trend-chart">
      <CardHeader className="bg-secondary/35 p-4 sm:p-6 flex flex-col space-y-1.5 border-b border-border/60">
        <div className="flex flex-col gap-3 text-primary sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-primary font-semibold tracking-[-0.012em] leading-[1.3] flex items-center gap-2">
            <Activity className="text-primary lucide lucide-activity w-5 h-5" />
            {t('mood_tracker.mood_trends')}
          </CardTitle>
          <BottomSheetSelect
            value={dateRange.toString()}
            onValueChange={(v) => onDateRangeChange(parseInt(v))}
            options={dateRangeOptions}
            title={t('mood_tracker.analytics.date_range')}
            className="w-full sm:w-40"
          />
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-6">
        {/* Stats Cards */}
        {stats &&
        <div className="grid grid-cols-1 gap-2 mb-6 sm:grid-cols-3 sm:gap-4">
            <div className="bg-card/75 text-primary p-4 rounded-[var(--radius-control)] border border-border/60">
              <p className="text-primary mb-1 text-xs font-medium">{t('mood_tracker.analytics.average_mood')}</p>
              <p className="text-primary text-2xl font-bold">{stats.avgMood.toFixed(1)}/5</p>
            </div>
            <div className="bg-card/75 text-primary p-4 rounded-[var(--radius-control)] border border-border/60">
              <p className="text-primary mb-1 text-xs font-semibold">{t('mood_tracker.analytics.average_stress')}</p>
              <p className="text-primary text-xl font-semibold">
                {stats.avgStress != null ? `${stats.avgStress.toFixed(1)}/10` : t('mood_tracker.analytics.no_data_yet')}
              </p>
            </div>
            <div className="bg-card/75 p-4 rounded-[var(--radius-control)] border border-border/60">
              <p className="text-primary mb-1 text-sm font-semibold">{t('mood_tracker.analytics.trend')}</p>
              <div className="flex items-center justify-center gap-1">
                {stats.trend > 0.5 ?
              <>
                    <TrendingUp className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span className="text-lg font-bold text-green-700">{t('mood_tracker.analytics.better')}</span>
                  </> :
              stats.trend < -0.5 ?
              <>
                    <TrendingDown className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    <span className="text-lg font-bold text-blue-700">{t('mood_tracker.analytics.shift')}</span>
                  </> :

              <span className="text-primary text-lg font-bold">{t('mood_tracker.analytics.steady')}</span>
              }
              </div>
            </div>
          </div>
        }

        {stats ? <>
        {/* Mood Line Chart */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-foreground mb-3">{t('mood_tracker.analytics.mood_stress_levels')}</h3>
          <div className="min-w-0 pb-2"><div className="h-[300px] w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} className="bg-card recharts-surface">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="date"
                interval="preserveStartEnd" minTickGap={24}
                stroke="hsl(var(--muted-foreground))"
                style={{ fontSize: '12px' }} />

              <YAxis
                stroke="hsl(var(--muted-foreground))"
                style={{ fontSize: '12px' }} />

              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  color: 'hsl(var(--foreground))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }} />

              <Legend />
              <Line
                type="monotone"
                dataKey="mood"
                stroke="#0f766e"
                strokeWidth={3}
                name={t('mood_tracker.analytics.mood_series')}
                dot={{ fill: '#0f766e', r: 4 }}
                connectNulls />

              <Line
                type="monotone"
                dataKey="stress"
                stroke="#e11d48"
                strokeWidth={2}
                name={t('mood_tracker.analytics.stress_series')}
                dot={{ fill: '#e11d48', r: 3 }}
                connectNulls />

            </LineChart>
          </ResponsiveContainer>
          </div></div>
        </div>

        {/* Energy Area Chart */}
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">{t('mood_tracker.analytics.energy_intensity')}</h3>
          <div className="min-w-0 pb-2"><div className="h-[220px] w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="date"
                interval="preserveStartEnd" minTickGap={24}
                stroke="hsl(var(--muted-foreground))"
                style={{ fontSize: '12px' }} />

              <YAxis
                stroke="hsl(var(--muted-foreground))"
                style={{ fontSize: '12px' }} />

              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  color: 'hsl(var(--foreground))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }} />

              <Legend />
              <Area
                type="monotone"
                dataKey="energy"
                stroke="#0284c7"
                fill="#7dd3fc"
                name={t('mood_tracker.analytics.energy')}
                connectNulls />

              <Area
                type="monotone"
                dataKey="intensity"
                stroke="#f59e0b"
                fill="#fde68a"
                name={t('mood_tracker.analytics.intensity')}
                connectNulls />

            </AreaChart>
          </ResponsiveContainer>
          </div></div>
        </div>
        </> : (
          <div className="rounded-2xl border border-dashed border-border/70 bg-card/55 px-5 py-12 text-center">
            <Activity className="mx-auto h-10 w-10 text-primary/35" />
            <h3 className="mt-3 font-semibold text-foreground">{t('mood_tracker.no_data')}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{t('mood_tracker.no_data_subtitle')}</p>
          </div>
        )}
      </CardContent>
    </Card>);

}