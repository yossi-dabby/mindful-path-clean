import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Activity, TrendingUp, BookOpen, ShieldCheck, Dumbbell } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const safeArray = (value) => Array.isArray(value) ? value.filter(Boolean) : [];

export default function CorrelationInsights({ moodEntries = [], journalEntries = [], exercises = [] }) {
  const { t } = useTranslation();
  const [showAnalysis, setShowAnalysis] = useState(false);
  const analysis = useMemo(() => {
    const moods = safeArray(moodEntries).filter((entry) => entry?.date && entry?.mood);
    const journals = safeArray(journalEntries);
    const practiced = safeArray(exercises).filter((exercise) => Number(exercise?.completed_count) > 0);
    const sessions = practiced.reduce((sum, exercise) => sum + (Number(exercise.completed_count) || 0), 0);
    const strongestExercises = [...practiced].sort((a, b) => Number(b.completed_count) - Number(a.completed_count)).slice(0, 5);
    const enoughForComparison = moods.length >= 7 && (journals.length >= 3 || sessions >= 3);
    return { moods, journals, practiced, sessions, strongestExercises, enoughForComparison };
  }, [moodEntries, journalEntries, exercises]);

  if (!showAnalysis) return (
    <Card className="border border-border/80 bg-card shadow-[var(--shadow-md)] overflow-hidden" data-testid="progress-patterns">
      <CardContent className="p-6 sm:p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-secondary/70"><Activity className="h-7 w-7 text-primary" /></div>
        <h3 className="mb-2 text-xl font-semibold text-foreground">{t('progress_ui.ai.title')}</h3>
        <p className="mx-auto mb-4 max-w-lg text-sm text-muted-foreground">{t('progress_ui.ai.intro')}</p>
        <p className="mx-auto mb-5 flex max-w-lg items-start justify-center gap-2 text-xs text-muted-foreground"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />{t('progress_ui.ai.privacy')}</p>
        <Button onClick={() => setShowAnalysis(true)} className="min-h-11 w-full sm:w-auto"><Sparkles className="h-4 w-4" />{t('progress_ui.ai.analyze')}</Button>
      </CardContent>
    </Card>
  );

  return (
    <Card className="border border-border/80 bg-card shadow-[var(--shadow-md)] overflow-hidden" data-testid="progress-patterns">
      <CardHeader className="p-4 sm:p-6"><div className="flex flex-col min-[420px]:flex-row min-[420px]:items-center justify-between gap-3"><CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5 text-primary" />{t('progress_ui.ai.analysis_title')}</CardTitle><Button onClick={() => setShowAnalysis(false)} variant="outline" className="min-h-11 w-full min-[420px]:w-auto">{t('progress_ui.common.close')}</Button></div></CardHeader>
      <CardContent className="space-y-4 p-4 sm:p-6">
        {!analysis.enoughForComparison && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">{t('progress_ui.ai.insufficient')}</div>}
        <section className="rounded-xl border border-blue-200 bg-blue-50/70 p-4">
          <h3 className="mb-2 flex items-center gap-2 font-semibold text-foreground"><Dumbbell className="h-4 w-4 text-blue-700" />{t('progress_ui.ai.exercise_mood')}</h3>
          <p className="text-sm text-foreground">{t('progress_ui.ai.exercise_finding', { sessions: analysis.sessions, count: analysis.practiced.length })}</p>
          {analysis.strongestExercises.length > 0 && <div className="mt-3"><p className="mb-2 text-xs font-semibold text-muted-foreground">{t('progress_ui.ai.effective_exercises')}</p><div className="flex flex-wrap gap-2">{analysis.strongestExercises.map((exercise) => <Badge key={exercise.id || exercise.title} variant="outline">{exercise.title}</Badge>)}</div></div>}
        </section>
        <section className="rounded-xl border border-purple-200 bg-purple-50/70 p-4">
          <h3 className="mb-2 flex items-center gap-2 font-semibold text-foreground"><BookOpen className="h-4 w-4 text-purple-700" />{t('progress_ui.ai.journal_mood')}</h3>
          <p className="text-sm text-foreground">{t('progress_ui.ai.journal_finding', { count: analysis.journals.length })}</p>
        </section>
        <div className="rounded-xl border border-border bg-secondary/70 p-4">
          <h3 className="mb-2 flex items-center gap-2 font-semibold text-primary"><TrendingUp className="h-4 w-4" />{t('progress_ui.ai.success_patterns')}</h3>
          <p className="text-sm text-primary">{analysis.enoughForComparison ? t('progress_ui.insights.encouragement_many') : t('progress_ui.insights.encouragement_few')}</p>
        </div>
        <p className="flex items-start gap-2 text-xs text-muted-foreground"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />{t('progress_ui.ai.privacy')} {t('progress_ui.ai.local_note')}</p>
      </CardContent>
    </Card>
  );
}
