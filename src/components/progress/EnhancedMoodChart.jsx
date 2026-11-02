import React, { useMemo } from 'react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { useTranslation } from 'react-i18next';

const moodMap = { very_low: 1, low: 2, okay: 3, good: 4, excellent: 5 };
const moodKeys = ['', 'very_low', 'low', 'okay', 'good', 'excellent'];

export default function EnhancedMoodChart({ data = [] }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage || i18n.language || 'en';
  const dateFormatter = useMemo(() => new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }), [locale]);
  const chartData = useMemo(() => data.map((entry) => ({
    date: entry?.date ? dateFormatter.format(new Date(`${entry.date}T12:00:00`)) : '',
    mood: moodMap[entry?.mood] || null,
    intensity: Number.isFinite(Number(entry?.intensity)) ? Number(entry.intensity) : null
  })).filter((entry) => entry.mood), [data, dateFormatter]);

  const moodLabel = (value) => value ? t(`progress_ui.mood.${moodKeys[value]}`) : '';

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const item = payload[0].payload;
    return (
      <div className="rounded-xl border border-border bg-card p-3 shadow-lg">
        <p className="font-semibold text-foreground">{item.date}</p>
        <p className="text-sm text-primary">{t('progress_ui.mood.mood')}: {moodLabel(item.mood)}</p>
        {item.intensity !== null && <p className="text-sm text-muted-foreground">{t('progress_ui.mood.intensity')}: {item.intensity}/10</p>}
      </div>
    );
  };

  return (
    <div className="space-y-4" role="img" aria-label={t('mood_tracker.mood_trends')}>
      <div className="h-[240px] sm:h-[300px] w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
            <defs>
              <linearGradient id="progressMoodGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#26A69A" stopOpacity={0.35}/>
                <stop offset="95%" stopColor="#26A69A" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" interval="preserveStartEnd" />
            <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tickFormatter={moodLabel} width={locale === 'de' ? 92 : 72} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="mood" stroke="#168E84" strokeWidth={3} fill="url(#progressMoodGradient)" dot={{ fill: '#168E84', r: 4 }} activeDot={{ r: 6 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <section aria-labelledby="mood-distribution-title">
        <h3 id="mood-distribution-title" className="mb-2 text-sm font-semibold text-foreground">{t('progress_ui.mood.distribution')}</h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {Object.keys(moodMap).reverse().map((mood) => {
            const count = data.filter((entry) => entry?.mood === mood).length;
            return (
              <div key={mood} className="rounded-xl border border-border/70 bg-secondary/45 p-2 text-center">
                <p className="text-lg font-bold text-primary">{count}</p>
                <p className="text-xs text-muted-foreground break-words">{t(`progress_ui.mood.${mood}`)}</p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
