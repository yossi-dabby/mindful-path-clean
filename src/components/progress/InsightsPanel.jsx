import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Lightbulb } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const moodValues = { very_low: 1, low: 2, okay: 3, good: 4, excellent: 5 };

function consecutiveCheckInDays(entries) {
  const uniqueDates = [...new Set(entries.map((entry) => entry?.date).filter(Boolean))].sort().reverse();
  if (!uniqueDates.length) return 0;
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const latest = new Date(`${uniqueDates[0]}T12:00:00`);
  const daysSinceLatest = Math.round((today - latest) / 86400000);
  if (daysSinceLatest > 1) return 0;
  let streak = 1;
  for (let index = 1; index < uniqueDates.length; index += 1) {
    const previous = new Date(`${uniqueDates[index - 1]}T12:00:00`);
    const current = new Date(`${uniqueDates[index]}T12:00:00`);
    if (Math.round((previous - current) / 86400000) !== 1) break;
    streak += 1;
  }
  return streak;
}

export default function InsightsPanel({ moodEntries = [], journalEntries = [] }) {
  const { t } = useTranslation();
  const safeMoods = Array.isArray(moodEntries) ? moodEntries : [];
  const safeJournals = Array.isArray(journalEntries) ? journalEntries : [];
  const validMoodValues = safeMoods.map((entry) => moodValues[entry?.mood]).filter(Number.isFinite);
  const avgMood = validMoodValues.length ? (validMoodValues.reduce((sum, value) => sum + value, 0) / validMoodValues.length).toFixed(1) : null;
  const checkInStreak = consecutiveCheckInDays(safeMoods);

  const commonEmotions = useMemo(() => {
    const counts = {};
    safeMoods.forEach((entry) => (Array.isArray(entry?.emotions) ? entry.emotions : []).forEach((emotion) => { counts[emotion] = (counts[emotion] || 0) + 1; }));
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([emotion]) => emotion);
  }, [safeMoods]);

  const topDistortions = useMemo(() => {
    const counts = {};
    safeJournals.forEach((entry) => (Array.isArray(entry?.cognitive_distortions) ? entry.cognitive_distortions : []).forEach((item) => { counts[item] = (counts[item] || 0) + 1; }));
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3);
  }, [safeJournals]);

  const taxonomyLabel = (type, value) => t(`mood_ui.taxonomy.${type}.${value}`, { defaultValue: String(value).replace(/_/g, ' ') });

  return (
    <Card className="border border-border/80 bg-card shadow-[var(--shadow-md)] overflow-hidden" data-testid="progress-insights">
      <CardHeader className="bg-secondary/70 dark:bg-teal-950/20 p-4 sm:p-6">
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Lightbulb className="h-5 w-5 text-amber-600" />
          {t('progress_ui.insights.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-secondary/70 p-3">
            <p className="text-sm font-medium text-primary">{t('progress_ui.insights.average_mood')}</p>
            <p className="mt-1 text-3xl font-bold text-primary">{avgMood || '—'}<span className="text-sm font-normal"> / 5</span></p>
          </div>
          <div className="rounded-xl bg-amber-50 p-3">
            <p className="text-sm font-medium text-amber-900">{t('progress_ui.insights.checkin_streak')}</p>
            <p className="mt-1 text-3xl font-bold text-amber-700">{checkInStreak}<span className="text-sm font-normal"> {t('progress_ui.common.days')}</span></p>
          </div>
        </div>
        {commonEmotions.length > 0 && <section><h3 className="mb-2 text-sm font-semibold text-foreground">{t('progress_ui.insights.common_emotions')}</h3><div className="flex flex-wrap gap-2">{commonEmotions.map((emotion) => <Badge key={emotion} variant="secondary">{taxonomyLabel('emotions', emotion)}</Badge>)}</div></section>}
        {topDistortions.length > 0 && <section><h3 className="mb-2 text-sm font-semibold text-foreground">{t('progress_ui.insights.patterns')}</h3><div className="space-y-2">{topDistortions.map(([distortion, count]) => <div key={distortion} className="rounded-xl border border-border/60 bg-secondary/35 p-3"><p className="text-sm font-medium text-foreground">{taxonomyLabel('distortions', distortion)}</p><p className="mt-1 text-xs text-primary">{t('progress_ui.insights.identified', { count })}</p></div>)}</div></section>}
        <div className="rounded-xl border border-border bg-secondary/70 p-4">
          <p className="mb-1 text-sm font-semibold text-primary">{t('progress_ui.insights.keep_going')}</p>
          <p className="text-sm text-primary">{t(safeJournals.length > 5 ? 'progress_ui.insights.encouragement_many' : 'progress_ui.insights.encouragement_few')}</p>
        </div>
      </CardContent>
    </Card>
  );
}
