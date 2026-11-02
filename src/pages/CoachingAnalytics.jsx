import BotanicalAccent from '@/components/brand/BotanicalAccent';
import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Target, CheckCircle, Users, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { useTranslation } from 'react-i18next';
import { useIsMobile } from '@/hooks/use-mobile';

const COLORS = ['#0f9f8f', '#2a7f9e', '#7c6fd0', '#e49b3f', '#d86675'];

export default function CoachingAnalytics() {
  const { t } = useTranslation();
  const isMobile = useIsMobile();

  const focusAreaLabels = {
    mood_improvement: t('coaching_analytics.focus_areas.mood_improvement'),
    stress_management: t('coaching_analytics.focus_areas.stress_management'),
    goal_achievement: t('coaching_analytics.focus_areas.goal_achievement'),
    behavior_change: t('coaching_analytics.focus_areas.behavior_change'),
    relationship: t('coaching_analytics.focus_areas.relationship'),
    self_esteem: t('coaching_analytics.focus_areas.self_esteem'),
    general: t('coaching_analytics.focus_areas.general')
  };

  const stageLabels = {
    discovery: t('coaching_analytics.stages.discovery'),
    planning: t('coaching_analytics.stages.planning'),
    action: t('coaching_analytics.stages.action'),
    review: t('coaching_analytics.stages.review'),
    completed: t('coaching_analytics.stages.completed')
  };

  const { data: user, isLoading: isUserLoading, isError: isUserError, refetch: refetchUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: sessions = [], isLoading: isSessionsLoading, isError, refetch } = useQuery({
    queryKey: ['coachingSessions', user?.email],
    queryFn: () => base44.entities.CoachingSession.filter({ created_by: user.email }, '-created_date'),
    enabled: !!user?.email
  });

  const isLoading = isUserLoading || isSessionsLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <p className="text-foreground" role="status" aria-live="polite">{t('coaching_analytics.loading')}</p>
      </div>
    );
  }

  if (isError || isUserError) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-3xl items-center justify-center p-4">
        <Card className="w-full border border-red-200 bg-card/95 shadow-lg">
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <p className="font-medium text-red-700" role="alert">{t('coach.load_error')}</p>
            <Button variant="outline" onClick={() => { refetchUser(); refetch(); }}>{t('coach.retry')}</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate metrics
  const activeSessions = sessions.filter(s => s.status === 'active');
  const completedSessions = sessions.filter(s => s.status === 'completed');
  const completionRate = sessions.length > 0 
    ? Math.round((completedSessions.length / sessions.length) * 100) 
    : 0;

  // Most common challenges (focus areas)
  const focusAreaCounts = sessions.reduce((acc, session) => {
    const area = session.focus_area;
    acc[area] = (acc[area] || 0) + 1;
    return acc;
  }, {});

  const focusAreaData = Object.entries(focusAreaCounts)
    .map(([area, count]) => ({
      name: focusAreaLabels[area] || area,
      value: count
    }))
    .sort((a, b) => b.value - a.value);

  // Stage distribution
  const stageCounts = sessions.reduce((acc, session) => {
    const stage = session.stage;
    acc[stage] = (acc[stage] || 0) + 1;
    return acc;
  }, {});

  const stageData = Object.entries(stageCounts).map(([stage, count]) => ({
    stage: stageLabels[stage] || stage,
    count
  }));

  // Action plan completion rate
  const sessionsWithActions = sessions.filter(s => s.action_plan?.length > 0);
  const totalActions = sessionsWithActions.reduce((sum, s) => sum + (s.action_plan?.length || 0), 0);
  const completedActions = sessionsWithActions.reduce((sum, s) => 
    sum + (s.action_plan?.filter(a => a.completed).length || 0), 0);
  const actionCompletionRate = totalActions > 0 
    ? Math.round((completedActions / totalActions) * 100) 
    : 0;
  const hasSessionData = sessions.length > 0;

  if (!hasSessionData) {
    return (
      <div className="mx-auto min-h-dvh max-w-7xl p-4 sm:p-6 lg:p-8">
        <header className="mb-6 mt-2 sm:mb-8 sm:mt-4">
          <Link to={createPageUrl('Coach')}>
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="h-4 w-4 rtl:scale-x-[-1]" />
              {t('coaching_analytics.back_to_coaching')}
            </Button>
          </Link>
          <div className="botanical-title-row"><h1 className="text-3xl md:text-4xl font-semibold text-foreground mb-2">{t('coaching_analytics.title')}</h1><BotanicalAccent variant="leaves" className="botanical-title-art" /></div>
          <p className="text-foreground">{t('coaching_analytics.subtitle')}</p>
        </header>

        <Card className="border border-border/70 bg-card/95 shadow-lg">
          <CardContent className="p-8 md:p-12 text-center space-y-4">
            <BotanicalAccent variant="progress" className="mx-auto h-28 w-44" /><p className="font-medium text-foreground">{t('coaching_analytics.no_data')}</p>
            <Link to={createPageUrl('Coach')}>
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 rtl:scale-x-[-1]" />
                {t('coaching_analytics.back_to_coaching')}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-dvh max-w-7xl p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <header className="mb-6 mt-2 sm:mb-8 sm:mt-4">
        <Link to={createPageUrl('Coach')}>
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="h-4 w-4 rtl:scale-x-[-1]" />
            {t('coaching_analytics.back_to_coaching')}
          </Button>
        </Link>
        <div className="botanical-title-row"><h1 className="text-3xl md:text-4xl font-semibold text-foreground mb-2">{t('coaching_analytics.title')}</h1><BotanicalAccent variant="leaves" className="botanical-title-art" /></div>
        <p className="text-foreground">{t('coaching_analytics.subtitle')}</p>
      </header>

      {/* Stats Overview */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:mb-8 sm:gap-4 lg:grid-cols-4 lg:gap-6">
        <Card className="border border-border/70 bg-card/95 shadow-lg">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground mb-1">{t('coaching_analytics.total_sessions')}</p>
                <p className="text-3xl font-bold text-foreground">{sessions.length}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/70 bg-card/95 shadow-lg">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground mb-1">{t('coaching_analytics.active_sessions')}</p>
                <p className="text-3xl font-bold text-blue-600">{activeSessions.length}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Target className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/70 bg-card/95 shadow-lg">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground mb-1">{t('coaching_analytics.completion_rate')}</p>
                <p className="text-3xl font-bold text-green-600">{completionRate}%</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/70 bg-card/95 shadow-lg">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground mb-1">{t('coaching_analytics.action_completion')}</p>
                <p className="text-3xl font-bold text-orange-600">{actionCompletionRate}%</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-orange-600" />
              </div>
            </div>
            <p className="text-xs text-foreground mt-2">
              {t('coaching_analytics.actions_completed', { completed: completedActions, total: totalActions })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:mb-8 lg:grid-cols-2 lg:gap-6">
        {/* Focus Areas */}
        <Card className="border border-border/70 bg-card/95 shadow-lg">
          <CardHeader>
            <CardTitle>{t('coaching_analytics.most_common_challenges')}</CardTitle>
          </CardHeader>
          <CardContent>
            {focusAreaData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={focusAreaData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={isMobile ? false : ({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={isMobile ? 72 : 86}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {focusAreaData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-foreground py-12">{t('coaching_analytics.no_data')}</p>
            )}
          </CardContent>
        </Card>

        {/* Stage Distribution */}
        <Card className="border border-border/70 bg-card/95 shadow-lg">
          <CardHeader>
            <CardTitle>{t('coaching_analytics.stage_distribution')}</CardTitle>
          </CardHeader>
          <CardContent>
            {stageData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stageData} margin={{ top: 8, right: 8, left: -20, bottom: isMobile ? 24 : 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="stage" interval={0} angle={isMobile ? -20 : 0} textAnchor={isMobile ? 'end' : 'middle'} tick={{ fontSize: isMobile ? 10 : 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#0f9f8f" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-foreground py-12">{t('coaching_analytics.no_data')}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Challenges List */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle>{t('coaching_analytics.challenge_breakdown')}</CardTitle>
        </CardHeader>
        <CardContent>
          {focusAreaData.length > 0 ? (
            <div className="space-y-4">
              {focusAreaData.slice(0, 5).map((item, index) => (
                <div key={index} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                  <div className="flex items-center gap-3 flex-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold`} 
                         style={{ backgroundColor: COLORS[index % COLORS.length] }}>
                      {index + 1}
                    </div>
                    <span className="text-foreground font-medium">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="hidden h-2 w-24 rounded-full bg-gray-200 sm:block lg:w-32">
                      <div
                        className="h-2 rounded-full"
                        style={{
                          width: `${(item.value / sessions.length) * 100}%`,
                          backgroundColor: COLORS[index % COLORS.length]
                        }}
                      />
                    </div>
                    <span className="min-w-fit text-end text-sm font-semibold text-foreground sm:w-20">
                      {item.value} {item.value === 1 ? t('coaching_analytics.session_singular') : t('coaching_analytics.session_plural')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-foreground py-8">{t('coaching_analytics.no_data')}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
