import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, AlertTriangle, TrendingUp } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { useTranslation } from 'react-i18next';

const COLORS = ['#0f766e', '#0ea5e9', '#10b981', '#f59e0b', '#f97316', '#e11d48'];
const MOOD_VALUES = { excellent: 5, good: 4, okay: 3, low: 2, very_low: 1 };

const keyFor = (value) => String(value).replaceAll(' ', '_');
const safeValues = (value) => Array.isArray(value) ? value.filter(Boolean) : [];

export default function TriggerAnalysis({ entries }) {
  const { t } = useTranslation();
  const labelFor = React.useCallback(
    (group, value) => t(`mood_tracker.taxonomy.${group}.${keyFor(value)}`),
    [t]
  );

  const analysis = React.useMemo(() => {
    const triggerImpact = {};
    const activityImpact = {};
    const emotionFrequency = {};

    entries.forEach((entry) => {
      const moodValue = MOOD_VALUES[entry.mood];
      if (!moodValue) return;

      safeValues(entry.triggers).forEach((trigger) => {
        const current = triggerImpact[trigger] || { total: 0, count: 0 };
        current.total += moodValue;
        current.count += 1;
        triggerImpact[trigger] = current;
      });

      safeValues(entry.activities).forEach((activity) => {
        const current = activityImpact[activity] || { total: 0, count: 0 };
        current.total += moodValue;
        current.count += 1;
        activityImpact[activity] = current;
      });

      safeValues(entry.emotions).forEach((emotion) => {
        emotionFrequency[emotion] = (emotionFrequency[emotion] || 0) + 1;
      });
    });

    const topTriggers = Object.entries(triggerImpact)
      .map(([name, data]) => ({ name, label: labelFor('triggers', name), avgMood: data.total / data.count, count: data.count }))
      .sort((a, b) => a.avgMood - b.avgMood)
      .slice(0, 8);

    const topActivities = Object.entries(activityImpact)
      .map(([name, data]) => ({ name, label: labelFor('activities', name), avgMood: data.total / data.count, count: data.count }))
      .sort((a, b) => b.avgMood - a.avgMood)
      .slice(0, 8);

    const topEmotions = Object.entries(emotionFrequency)
      .map(([name, value]) => ({ name, label: labelFor('emotions', name), value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    return { topTriggers, topActivities, topEmotions };
  }, [entries, labelFor]);

  if (entries.length === 0) {
    return (
      <Card className="border border-border/75 bg-card/90 backdrop-blur-xl shadow-[var(--shadow-md)]">
        <CardContent className="px-5 py-10 text-center sm:p-12">
          <Activity className="mx-auto mb-3 h-12 w-12 text-primary/35" />
          <p className="text-sm text-muted-foreground sm:text-base">{t('mood_tracker.analytics.start_tracking')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-6" data-testid="mood-pattern-analysis">
      <AnalysisCard
        icon={AlertTriangle}
        iconClassName="text-rose-600"
        title={t('mood_tracker.analytics.triggers_title')}
        subtitle={t('mood_tracker.analytics.triggers_subtitle')}
      >
        <ImpactChart
          data={analysis.topTriggers}
          color="#e11d48"
          emptyLabel={t('mood_tracker.analytics.no_trigger_data')}
          t={t}
        />
      </AnalysisCard>

      <AnalysisCard
        icon={TrendingUp}
        iconClassName="text-emerald-600"
        title={t('mood_tracker.analytics.boosters_title')}
        subtitle={t('mood_tracker.analytics.boosters_subtitle')}
      >
        <ImpactChart
          data={analysis.topActivities}
          color="#059669"
          emptyLabel={t('mood_tracker.analytics.no_activity_data')}
          t={t}
        />
      </AnalysisCard>

      <AnalysisCard
        icon={Activity}
        title={t('mood_tracker.analytics.emotional_patterns')}
        subtitle={t('mood_tracker.analytics.emotional_patterns_subtitle')}
        className="lg:col-span-2"
      >
        {analysis.topEmotions.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
            <div className="min-w-0" aria-hidden="true">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={analysis.topEmotions} dataKey="value" nameKey="label" cx="50%" cy="50%" innerRadius={48} outerRadius={82} paddingAngle={2}>
                    {analysis.topEmotions.map((entry, index) => <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(value, name) => [t('mood_tracker.analytics.times_count', { count: value }), name]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex min-w-0 flex-col justify-center gap-2">
              {analysis.topEmotions.map((emotion, index) => (
                <div key={emotion.name} className="flex items-center justify-between gap-3 rounded-xl border border-border/55 bg-card/70 px-3 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="h-3.5 w-3.5 shrink-0 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} aria-hidden="true" />
                    <span dir="auto" className="truncate font-medium text-foreground">{emotion.label}</span>
                  </div>
                  <Badge variant="secondary" className="shrink-0 rounded-full">{t('mood_tracker.analytics.times_count', { count: emotion.value })}</Badge>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="py-8 text-center text-muted-foreground">{t('mood_tracker.analytics.no_emotion_data')}</p>
        )}
      </AnalysisCard>
    </div>
  );
}

function AnalysisCard({ icon: Icon, iconClassName = 'text-primary', title, subtitle, className = '', children }) {
  return (
    <Card className={`overflow-hidden border border-border/75 bg-card/90 backdrop-blur-xl shadow-[var(--shadow-md)] ${className}`}>
      <CardHeader className="border-b border-border/60 bg-secondary/35 p-4 sm:p-6">
        <CardTitle className="flex items-center gap-2 text-lg text-foreground">
          <Icon className={`h-5 w-5 ${iconClassName}`} />
          {title}
        </CardTitle>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{subtitle}</p>
      </CardHeader>
      <CardContent className="p-4 sm:p-6">{children}</CardContent>
    </Card>
  );
}

function ImpactChart({ data, color, emptyLabel, t }) {
  if (data.length === 0) return <p className="py-8 text-center text-muted-foreground">{emptyLabel}</p>;

  return (
    <div className="min-w-0 pb-2">
      <div className="h-[300px] w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 20, bottom: 4, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis type="number" domain={[0, 5]} tick={{ fontSize: 12 }} />
            <YAxis type="category" dataKey="label" width={130} tick={{ fontSize: 12 }} />
            <Tooltip
              contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px' }}
              formatter={(value) => [t('mood_tracker.analytics.average_mood_value', { value: Number(value).toFixed(1) }), '']}
            />
            <Bar dataKey="avgMood" fill={color} radius={[0, 8, 8, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
