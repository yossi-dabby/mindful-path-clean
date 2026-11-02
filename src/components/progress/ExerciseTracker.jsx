import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Dumbbell } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const categoryColors = {
  breathing: '#3b82f6', grounding: '#10b981', cognitive_restructuring: '#8b5cf6',
  behavioral_activation: '#f59e0b', mindfulness: '#0891b2', exposure: '#db2777',
  sleep: '#6366f1', relationships: '#e11d48', stress_management: '#0d9488', other: '#64748b'
};

export default function ExerciseTracker({ exercises = [] }) {
  const { t } = useTranslation();
  const safeExercises = Array.isArray(exercises) ? exercises : [];
  const completedExercises = safeExercises.filter((exercise) => Number(exercise?.completed_count) > 0);
  const totalCompletions = safeExercises.reduce((sum, exercise) => sum + (Number(exercise?.completed_count) || 0), 0);
  const categoryStats = useMemo(() => safeExercises.reduce((acc, exercise) => {
    const count = Number(exercise?.completed_count) || 0;
    if (count > 0) {
      const category = exercise?.category || 'other';
      acc[category] = (acc[category] || 0) + count;
    }
    return acc;
  }, {}), [safeExercises]);
  const topExercises = useMemo(() => [...safeExercises]
    .filter((exercise) => Number(exercise?.completed_count) > 0)
    .sort((a, b) => (Number(b.completed_count) || 0) - (Number(a.completed_count) || 0))
    .slice(0, 5)
    .map((exercise) => {
      const title = exercise?.title || t('progress_ui.categories.other');
      return { name: title.length > 22 ? `${title.slice(0, 22)}…` : title, count: Number(exercise.completed_count) || 0, category: exercise?.category || 'other' };
    }), [safeExercises, t]);

  return (
    <Card className="border border-border/80 bg-card shadow-[var(--shadow-md)] overflow-hidden" data-testid="progress-exercises">
      <CardHeader className="bg-secondary/45 p-4 sm:p-6">
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Dumbbell className="h-5 w-5 text-emerald-700" />
          {t('progress_ui.exercise.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 sm:p-6">
        <div className="grid grid-cols-1 min-[420px]:grid-cols-3 gap-3 mb-6">
          {[
            [completedExercises.length, t('progress_ui.exercise.tried'), 'text-emerald-700', 'bg-secondary/45'],
            [totalCompletions, t('progress_ui.exercise.total_sessions'), 'text-blue-700', 'bg-secondary/45'],
            [Object.keys(categoryStats).length, t('progress_ui.exercise.categories'), 'text-violet-700', 'bg-secondary/45']
          ].map(([value, label, color, background]) => (
            <div key={label} className={`min-w-0 rounded-xl p-3 sm:p-4 text-center ${background}`}>
              <p className={`text-2xl sm:text-3xl font-bold ${color}`}>{value}</p>
              <p className="mt-1 text-xs sm:text-sm text-muted-foreground break-words">{label}</p>
            </div>
          ))}
        </div>
        {totalCompletions > 0 ? (
          <>
            <h3 className="mb-3 font-semibold text-foreground">{t('progress_ui.exercise.most_practiced')}</h3>
            <div className="h-[240px] w-full min-w-0" role="img" aria-label={t('progress_ui.exercise.most_practiced')}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topExercises} layout="vertical" margin={{ top: 4, right: 12, left: 8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(value) => t('progress_ui.common.sessions', { count: value })} />
                  <Bar dataKey="count" radius={[0, 8, 8, 0]}>
                    {topExercises.map((entry, index) => <Cell key={`cell-${index}`} fill={categoryColors[entry.category] || categoryColors.other} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              {Object.entries(categoryStats).map(([category, count]) => (
                <div key={category} className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-border/60 bg-secondary/35 p-3">
                  <span className="min-w-0 break-words text-sm font-medium text-foreground">{t(`progress_ui.categories.${category}`, { defaultValue: category.replace(/_/g, ' ') })}</span>
                  <Badge style={{ backgroundColor: categoryColors[category] || categoryColors.other }} className="shrink-0 text-white">{t('progress_ui.common.sessions', { count })}</Badge>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="py-10 text-center">
            <Dumbbell className="mx-auto mb-3 h-12 w-12 text-muted-foreground/35" />
            <p className="text-muted-foreground">{t('progress_ui.exercise.empty')}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
