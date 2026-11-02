import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Calendar, Target, AlertCircle, TrendingUp, CheckCircle2, User } from 'lucide-react';
import { format, isAfter, isBefore, addDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import VideoModal from '../home/VideoModal';

export default function GoalsDashboardWidget() {
  const { t } = useTranslation();
  const [showVideo, setShowVideo] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ['allGoals'],
    queryFn: () => base44.entities.Goal.list(),
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false
  });
  const goals = Array.isArray(data) ? data : [];

  const activeGoals = goals.filter((g) => g.status !== 'completed');
  const completedGoals = goals.filter((g) => g.status === 'completed');

  // Calculate overdue goals
  const overdueGoals = activeGoals.filter((g) => {
    if (!g.target_date) return false;
    try {
      return isBefore(new Date(g.target_date), new Date());
    } catch {
      return false;
    }
  });

  // Calculate upcoming deadlines (next 7 days)
  const upcomingDeadlines = activeGoals.
  filter((g) => {
    if (!g.target_date) return false;
    try {
      const targetDate = new Date(g.target_date);
      const weekFromNow = addDays(new Date(), 7);
      return isAfter(targetDate, new Date()) && isBefore(targetDate, weekFromNow);
    } catch {
      return false;
    }
  }).
  sort((a, b) => new Date(a.target_date) - new Date(b.target_date));

  // Calculate overall progress
  const totalProgress = activeGoals.length > 0 ?
  Math.round(activeGoals.reduce((sum, g) => sum + (g.progress || 0), 0) / activeGoals.length) :
  0;

  // Count total milestones and completed milestones
  const allMilestones = activeGoals.flatMap((g) => g.milestones || []);
  const completedMilestones = allMilestones.filter((m) => m.completed);

  if (isLoading) {
    return (
      <Card className="border border-border/80 bg-card shadow-[var(--shadow-md)]">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/3" />
            <div className="h-20 bg-gray-200 rounded" />
          </div>
        </CardContent>
      </Card>);

  }

  if (goals.length === 0) {
    return (
      <Card className="border border-border/80 bg-card shadow-[var(--shadow-md)]">
        <CardContent className="bg-secondary/70 p-6 text-center">
          <Target className="text-primary mb-3 mx-auto lucide lucide-target w-12 h-12" />
          <p className="text-primary mb-3 text-sm font-medium">{t('goals_dashboard_widget.no_goals_yet')}</p>
          <Link to={createPageUrl('Goals')}>
            <Button size="sm" className="bg-primary text-primary-foreground px-3 text-sm font-semibold tracking-[0.005em] rounded-[20px] inline-flex items-center justify-center gap-2 whitespace-nowrap border border-transparent transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow-[var(--shadow-md)] hover:bg-primary/92 hover:shadow-[var(--shadow-lg)] active:bg-primary/95 h-8 min-h-[44px] md:min-h-0">{t('goals_dashboard_widget.create_first_goal')}</Button>
          </Link>
        </CardContent>
      </Card>);

  }

  return (
    <Card className="rounded-[30px] border overflow-hidden" style={{ borderColor: 'rgba(118, 170, 156, 0.34)', background: 'linear-gradient(180deg, rgba(255,253,250,0.99) 0%, rgba(228,244,238,0.96) 100%)', boxShadow: '0 28px 64px rgba(68, 108, 96, 0.16), 0 12px 24px rgba(68, 108, 96, 0.08)' }}>
      <CardHeader className="bg-secondary/70 p-6 flex flex-col space-y-1.5 border-b border-[rgba(118,170,156,0.22)]">
        <CardTitle className="flex items-center justify-between text-foreground">
          <div className="text-primary flex items-center gap-2">
            <Target className="text-primary lucide lucide-target w-5 h-5" />
            {t('goals_dashboard_widget.title')}
          </div>
          <button
            onClick={() => setShowVideo(true)} className="bg-secondary/70 text-primary rounded-[var(--radius-nested)] flex items-center justify-center cursor-pointer hover:scale-105 transition-transform w-10 h-10 border-0 outline-none"

            aria-label="Guided introduction video"
            title="Guided introduction video">

            <User className="text-primary lucide lucide-user w-5 h-5" strokeWidth={2} />
          <span className="mobile-action-label md:hidden">Guided introduction video</span></button>
        </CardTitle>
        <p className="text-primary mt-0.5 text-xs">{t('goals_dashboard_widget.all_stages')}</p>
      </CardHeader>
      {showVideo &&
      <VideoModal
        videoUrl="https://firebasestorage.googleapis.com/v0/b/my-cbt-therapy.firebasestorage.app/o/Goals%20Overview.mp4?alt=media&token=a5849ef3-fc5b-4411-92e6-2ee608ee4952"
        onClose={() => setShowVideo(false)} />

      }
      <CardContent className="bg-secondary/70 pt-0 p-6 space-y-4">
        {/* Overall Progress */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-primary text-sm font-medium">{t('goals_dashboard_widget.overall_progress')}</span>
            <span className="text-primary text-sm font-bold">{totalProgress}%</span>
          </div>
          <Progress value={totalProgress} className="h-2" />
          <div className="text-primary mt-2 text-xs flex items-center justify-between">
            <span>{t('goals_dashboard_widget.active', { count: activeGoals.length })}</span>
            <span>{t('goals_dashboard_widget.tasks_done', { completed: completedMilestones.length, total: allMilestones.length })}</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl p-3 border border-emerald-200 bg-[linear-gradient(180deg,rgba(237,250,246,0.95)_0%,rgba(247,252,250,0.98)_100%)] shadow-[var(--shadow-sm)]">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span className="text-primary text-xs">{t('goals_dashboard_widget.completed')}</span>
            </div>
            <p className="text-xl md:text-2xl font-bold text-emerald-700 truncate">
              {completedMilestones.length}/{allMilestones.length}
            </p>
          </div>

          <div className={cn(
            "rounded-lg p-3 border",
            overdueGoals.length > 0 ?
            "bg-[linear-gradient(180deg,rgba(255,243,241,0.96)_0%,rgba(255,250,249,0.98)_100%)] border-rose-200 shadow-[var(--shadow-sm)]" :
            "bg-[linear-gradient(180deg,rgba(246,250,248,0.96)_0%,rgba(252,253,252,0.98)_100%)] border-border/70 shadow-[var(--shadow-sm)]"
          )}>
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className={cn(
                "w-4 h-4",
                overdueGoals.length > 0 ? "text-rose-600" : "text-muted-foreground"
              )} />
              <span className="text-red-700 text-xs">{t('goals_dashboard_widget.overdue')}</span>
            </div>
            <p className={cn(
              "text-2xl font-bold",
              overdueGoals.length > 0 ? "text-rose-700" : "text-foreground/55"
            )}>
              {overdueGoals.length}
            </p>
          </div>
        </div>

        {/* Overdue Goals Alert */}
        {overdueGoals.length > 0 &&
        <div className="rounded-2xl p-3 border border-rose-200 bg-[linear-gradient(180deg,rgba(255,244,242,0.96)_0%,rgba(255,250,249,0.98)_100%)] shadow-[var(--shadow-sm)]">
            <p className="text-sm font-medium text-red-800 mb-2">{t('goals_dashboard_widget.overdue_goals')}</p>
            <div className="space-y-2">
              {overdueGoals.slice(0, 3).map((goal) =>
            <div key={goal.id} className="flex items-start gap-2 text-sm">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-red-900 truncate">{goal.title}</p>
                    <p className="text-xs text-red-700">
                      {t('goals_dashboard_widget.due', { date: format(new Date(goal.target_date), 'MMM d') })}
                    </p>
                  </div>
                </div>
            )}
              {overdueGoals.length > 3 &&
            <p className="text-xs text-red-600">{t('goals_dashboard_widget.more', { count: overdueGoals.length - 3 })}</p>
            }
            </div>
          </div>
        }

        {/* Upcoming Deadlines */}
        {upcomingDeadlines.length > 0 &&
        <div className="rounded-2xl p-3 border border-amber-200 bg-[linear-gradient(180deg,rgba(255,249,238,0.96)_0%,rgba(255,252,247,0.98)_100%)] shadow-[var(--shadow-sm)]">
            <p className="text-sm font-medium text-amber-800 mb-2">{t('goals_dashboard_widget.coming_up')}</p>
            <div className="space-y-2">
              {upcomingDeadlines.slice(0, 3).map((goal) =>
            <div key={goal.id} className="flex items-start gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-amber-900 truncate">{goal.title}</p>
                    <p className="text-xs text-amber-700">
                      {t('goals_dashboard_widget.due', { date: format(new Date(goal.target_date), 'MMM d') })}
                    </p>
                  </div>
                </div>
            )}
            </div>
          </div>
        }

        {/* Action Button */}
        <Link to={createPageUrl('Goals')} className="block">
          <Button variant="outline" className="bg-[hsl(var(--card)/0.88)] text-primary px-3 text-xs font-medium tracking-[0.005em] rounded-2xl inline-flex items-center justify-center gap-2 whitespace-nowrap transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-border/70 shadow-[var(--shadow-sm)] hover:bg-secondary/92 hover:text-foreground active:bg-secondary/96 h-8 min-h-[44px] md:min-h-0 w-full" size="sm">
            <TrendingUp className="w-4 h-4 mr-2" />
            {t('goals_dashboard_widget.view_all_goals')}
          </Button>
        </Link>
      </CardContent>
    </Card>);

}