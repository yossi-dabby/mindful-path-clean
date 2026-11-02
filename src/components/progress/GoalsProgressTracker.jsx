import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Target, TrendingUp, Calendar, CheckCircle2, Circle, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

const categoryColors = {
  behavioral: 'bg-blue-100 text-blue-800', emotional: 'bg-purple-100 text-purple-800',
  social: 'bg-pink-100 text-pink-800', cognitive: 'bg-indigo-100 text-indigo-800',
  lifestyle: 'bg-green-100 text-green-800'
};

export default function GoalsProgressTracker({ goals = [] }) {
  const { t, i18n } = useTranslation();
  const reduceMotion = useReducedMotion();
  const safeGoals = Array.isArray(goals) ? goals : [];
  const activeGoals = safeGoals.filter((goal) => goal?.status === 'active');
  const completedGoals = safeGoals.filter((goal) => goal?.status === 'completed');
  const avgProgress = activeGoals.length ? activeGoals.reduce((sum, goal) => sum + Math.min(100, Math.max(0, Number(goal?.progress) || 0)), 0) / activeGoals.length : 0;
  const totalMilestones = activeGoals.reduce((sum, goal) => sum + (Array.isArray(goal?.milestones) ? goal.milestones.length : 0), 0);
  const completedMilestones = activeGoals.reduce((sum, goal) => sum + (Array.isArray(goal?.milestones) ? goal.milestones.filter((milestone) => milestone?.completed).length : 0), 0);
  const dateFormatter = useMemo(() => new Intl.DateTimeFormat(i18n.resolvedLanguage || i18n.language || 'en', { year: 'numeric', month: 'short', day: 'numeric' }), [i18n.resolvedLanguage, i18n.language]);

  const daysUntil = (date) => {
    if (!date) return null;
    const target = new Date(`${date}T12:00:00`);
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    return Math.ceil((target - today) / 86400000);
  };

  return (
    <Card className="border border-border/80 bg-card shadow-[var(--shadow-md)] overflow-hidden" data-testid="progress-goals">
      <CardHeader className="bg-secondary/45  p-4 sm:p-6">
        <div className="flex flex-col min-[420px]:flex-row min-[420px]:items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-foreground"><Target className="h-5 w-5 text-orange-700" />{t('progress_ui.goals.title')}</CardTitle>
          <Button asChild variant="outline" className="min-h-11 w-full min-[420px]:w-auto"><Link to={createPageUrl('Goals')}>{t('progress_ui.goals.manage')}</Link></Button>
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {[
            [activeGoals.length, t('progress_ui.goals.active'), 'text-orange-700', 'bg-secondary/45'],
            [completedGoals.length, t('progress_ui.goals.completed'), 'text-green-700', 'bg-secondary/45'],
            [`${avgProgress.toFixed(0)}%`, t('progress_ui.goals.average'), 'text-blue-700', 'bg-secondary/45'],
            [`${completedMilestones}/${totalMilestones}`, t('progress_ui.goals.milestones'), 'text-purple-700', 'bg-secondary/45']
          ].map(([value, label, color, background]) => <div key={label} className={`min-w-0 rounded-xl p-3 sm:p-4 text-center ${background}`}><p className={`text-2xl sm:text-3xl font-bold ${color}`}>{value}</p><p className="mt-1 text-xs sm:text-sm text-muted-foreground break-words">{label}</p></div>)}
        </div>

        {activeGoals.length ? <section>
          <h3 className="mb-3 flex items-center gap-2 font-semibold text-foreground"><TrendingUp className="h-4 w-4" />{t('progress_ui.goals.your_active')}</h3>
          <div className="space-y-4">
            {activeGoals.map((goal, index) => {
              const progress = Math.min(100, Math.max(0, Number(goal?.progress) || 0));
              const milestones = Array.isArray(goal?.milestones) ? goal.milestones : [];
              const daysLeft = daysUntil(goal?.target_date);
              return <motion.article key={goal?.id || `${goal?.title}-${index}`} initial={reduceMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: reduceMotion ? 0 : index * 0.05 }} className="rounded-xl border border-border/70 bg-secondary/25 p-4">
                <div className="min-w-0">
                  <div className="mb-2 flex items-start gap-2"><Clock className="mt-0.5 h-5 w-5 shrink-0 text-orange-700" /><h4 className="min-w-0 break-words font-semibold text-foreground">{goal?.title || t('progress_ui.goals.title')}</h4></div>
                  {goal?.description && <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">{goal.description}</p>}
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <Badge className={cn('text-xs', categoryColors[goal?.category])}>{t(`progress_ui.goal_categories.${goal?.category}`, { defaultValue: goal?.category || '' })}</Badge>
                    {daysLeft !== null && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Calendar className="h-3.5 w-3.5" />{daysLeft >= 0 ? t('progress_ui.goals.days_left', { count: daysLeft }) : t('progress_ui.goals.overdue')}</span>}
                  </div>
                </div>
                <div className="mb-3">
                  <div className="mb-2 flex items-center justify-between gap-3"><span className="text-sm font-medium text-foreground">{t('progress_ui.goals.progress')}</span><span className="text-sm font-bold text-orange-700">{progress}%</span></div>
                  <Progress value={progress} className="h-2" aria-label={t('progress_ui.goals.progress')} />
                </div>
                {milestones.length > 0 && <div className="space-y-2"><p className="text-xs font-medium text-muted-foreground">{t('progress_ui.goals.milestones')} ({milestones.filter((item) => item?.completed).length}/{milestones.length})</p>{milestones.slice(0, 3).map((milestone, milestoneIndex) => <div key={milestoneIndex} className="flex items-start gap-2 text-sm">{milestone?.completed ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-700" /> : <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />}<span className={cn('text-xs break-words', milestone?.completed ? 'text-muted-foreground line-through' : 'text-foreground')}>{milestone?.title || milestone?.description}</span></div>)}{milestones.length > 3 && <p className="text-xs text-muted-foreground">{t('progress_ui.goals.more', { count: milestones.length - 3 })}</p>}</div>}
              </motion.article>;
            })}
          </div>
        </section> : <div className="py-10 text-center"><Target className="mx-auto mb-4 h-14 w-14 text-orange-600/40" /><p className="mb-2 text-lg font-semibold text-foreground">{t('progress_ui.goals.empty_title')}</p><p className="mx-auto mb-4 max-w-md text-sm text-muted-foreground">{t('progress_ui.goals.empty_text')}</p><Button asChild className="min-h-11"><Link to={createPageUrl('Goals')}><Target className="h-4 w-4" />{t('progress_ui.goals.create')}</Link></Button></div>}

        {completedGoals.length > 0 && <section className="mt-6 border-t border-border pt-6"><h3 className="mb-3 flex items-center gap-2 font-semibold text-foreground"><CheckCircle2 className="h-4 w-4 text-green-700" />{t('progress_ui.goals.recently_completed')}</h3><div className="space-y-2">{completedGoals.slice(0, 3).map((goal) => <div key={goal?.id} className="flex min-w-0 items-start gap-3 rounded-lg bg-secondary/45 p-3"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-700" /><div className="min-w-0"><p className="break-words text-sm font-medium text-foreground">{goal?.title}</p>{goal?.updated_date && <p className="text-xs text-muted-foreground">{t('progress_ui.goals.completed_on', { date: dateFormatter.format(new Date(goal.updated_date)) })}</p>}</div></div>)}</div></section>}
      </CardContent>
    </Card>
  );
}
