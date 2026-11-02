import BotanicalAccent from '@/components/brand/BotanicalAccent';
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Brain, Target, Activity, Download, Crown, Lock, ArrowLeft } from 'lucide-react';
import PremiumPaywall from '../components/subscription/PremiumPaywall';
import PremiumBadge from '../components/subscription/PremiumBadge';
import { isPremiumSubscription } from '../components/subscription/subscriptionReadiness.js';
import { confirmWebCheckoutFromCurrentUrl } from '../components/subscription/webBilling.js';

const COLORS = ['#F8744C', '#FFB47C', '#4B6B8C', '#B9A3C1', '#F49283'];

const LockedCard = ({ title, description, height = "auto", onUnlock }) => {
  const { t } = useTranslation();
  return (
    <Card className="border-0 shadow-lg bg-card rounded-2xl">
      <CardContent className={`p-6 md:p-8 flex items-center justify-center ${height === "chart" ? "min-h-[300px]" : "min-h-[200px]"}`}>
        <div className="min-w-0 text-center max-w-sm">
          <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="font-semibold text-foreground mb-2 text-base md:text-lg">{title}</h3>
          <p className="text-sm text-muted-foreground mb-4">{description}</p>
          <Button
            onClick={onUnlock}
            className="min-h-11 h-auto max-w-full whitespace-normal bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Crown className="w-4 h-4 mr-2" />
            {t('advanced_analytics.go_premium')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default function AdvancedAnalytics() {
  const { t } = useTranslation();
  const [showPaywall, setShowPaywall] = useState(false);

  const { data: subscription, refetch: refetchSubscription } = useQuery({
    queryKey: ['subscription'],
    queryFn: async () => {
      const user = await base44.auth.me();
      const subs = await base44.entities.Subscription.filter({ created_by: user.email });
      return subs[0];
    },
    staleTime: 30000,
    refetchOnWindowFocus: false
  });

  useEffect(() => {
    let active = true;

    confirmWebCheckoutFromCurrentUrl()
      .then((result) => {
        if (active && result?.active) refetchSubscription();
      })
      .catch(() => {
        // Keep the return parameters so the user can safely retry after a refresh.
      });

    return () => {
      active = false;
    };
  }, [refetchSubscription]);

  const { data: moodData } = useQuery({
    queryKey: ['moodAnalytics'],
    queryFn: async () => {
      const moods = await base44.entities.MoodEntry.list('-date', 90);
      return moods;
    },
    initialData: []
  });

  const { data: journalData } = useQuery({
    queryKey: ['journalAnalytics'],
    queryFn: () => base44.entities.ThoughtJournal.list('-created_date', 50),
    initialData: []
  });

  const { data: exerciseData } = useQuery({
    queryKey: ['exerciseAnalytics'],
    queryFn: () => base44.entities.Exercise.list(),
    initialData: []
  });

  const isPremium = isPremiumSubscription(subscription);

  // Calculate mood trends - memoized to prevent re-calculation on every render
  const moodTrends = useMemo(() => 
    moodData.slice(0, 30).reverse().map(m => ({
      date: new Date(m.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      mood: { 'excellent': 5, 'good': 4, 'okay': 3, 'low': 2, 'very_low': 1 }[m.mood] || 3,
      energy: { 'very_high': 5, 'high': 4, 'moderate': 3, 'low': 2, 'very_low': 1 }[m.energy_level] || 3
    })), [moodData]
  );

  // Exercise completion by category - memoized
  const exerciseChartData = useMemo(() => {
    const exerciseStats = exerciseData.reduce((acc, ex) => {
      const category = ex.category || 'other';
      acc[category] = (acc[category] || 0) + (ex.completed_count || 0);
      return acc;
    }, {});

    return Object.entries(exerciseStats).map(([name, value]) => ({
      name: name.replace('_', ' '),
      value
    }));
  }, [exerciseData]);

  // Journal insights - memoized
  const distortionData = useMemo(() => {
    const distortionCounts = journalData.reduce((acc, j) => {
      (j.cognitive_distortions || []).forEach(d => {
        acc[d] = (acc[d] || 0) + 1;
      });
      return acc;
    }, {});

    return Object.entries(distortionCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, value]) => ({ name, value }));
  }, [journalData]);

  const handleUnlockClick = useCallback(() => setShowPaywall(true), []);

  const weekDays = useMemo(() => [
    t('advanced_analytics.day_mon'), t('advanced_analytics.day_tue'), t('advanced_analytics.day_wed'),
    t('advanced_analytics.day_thu'), t('advanced_analytics.day_fri'), t('advanced_analytics.day_sat'),
    t('advanced_analytics.day_sun')
  ], [t]);

  return (
    <div className="min-h-dvh pb-20 md:pb-8">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 md:py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 md:mb-8">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => window.history.back()}
                className="md:hidden"
                aria-label={t('advanced_analytics.go_back_aria')}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="botanical-title-row"><h1 className="text-2xl md:text-4xl font-semibold text-foreground">{t('advanced_analytics.title')}</h1><BotanicalAccent variant="leaves" className="botanical-title-art" /></div>
              <PremiumBadge locked={!isPremium} compact />
            </div>
            <p className="text-sm md:text-base text-muted-foreground ml-12 md:ml-0">
              {t('advanced_analytics.subtitle')}
            </p>
          </div>
          {isPremium && (
            <Button variant="outline" className="gap-2 self-start md:self-auto ml-12 md:ml-0">
              <Download className="w-4 h-4" />
              <span className="inline">{t('advanced_analytics.export_data')}</span>
            </Button>
          )}
        </div>

        <Tabs defaultValue="mood" className="space-y-4 md:space-y-6">
          <TabsList className="bg-[hsl(var(--card)/0.97)] border shadow-sm w-full flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="mood" className="gap-1 md:gap-2 flex-1 text-xs md:text-sm">
              <Activity className="w-3 h-3 md:w-4 md:h-4" />
              <span className="inline">{t('advanced_analytics.tab_mood')}</span>
            </TabsTrigger>
            <TabsTrigger value="patterns" className="gap-1 md:gap-2 flex-1 text-xs md:text-sm">
              <Brain className="w-3 h-3 md:w-4 md:h-4" />
              <span className="inline">{t('advanced_analytics.tab_patterns')}</span>
            </TabsTrigger>
            <TabsTrigger value="progress" className="gap-1 md:gap-2 flex-1 text-xs md:text-sm">
              <Target className="w-3 h-3 md:w-4 md:h-4" />
              <span className="inline">{t('advanced_analytics.tab_exercise')}</span>
            </TabsTrigger>
            <TabsTrigger value="predictions" className="gap-1 md:gap-2 flex-1 text-xs md:text-sm">
              <TrendingUp className="w-3 h-3 md:w-4 md:h-4" />
              <span className="inline">{t('advanced_analytics.tab_ai')}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="mood" className="space-y-4 md:space-y-6">
            <Card className="border-0 shadow-lg rounded-2xl">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg md:text-xl">{t('advanced_analytics.chart_mood_energy')}</CardTitle>
              </CardHeader>
              <CardContent className="px-2 md:px-6">
                {isPremium ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={moodTrends}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                      <YAxis domain={[1, 5]} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="mood" stroke="#F8744C" strokeWidth={2} name={t('advanced_analytics.line_mood')} />
                      <Line type="monotone" dataKey="energy" stroke="#4B6B8C" strokeWidth={2} name={t('advanced_analytics.line_energy')} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="min-h-[300px] flex items-center justify-center">
                    <div className="text-center max-w-xs px-4">
                      <Lock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground mb-4">{t('advanced_analytics.unlock_mood')}</p>
                      <Button onClick={handleUnlockClick} className="bg-primary hover:bg-primary/90">
                        <Crown className="w-4 h-4 mr-2" />
                        {t('advanced_analytics.go_premium')}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 min-[1100px]:grid-cols-3 gap-4 md:gap-6">
              {isPremium ? (
                <>
                  <Card className="border-0 shadow-lg rounded-2xl">
                    <CardContent className="p-4 md:p-6">
                      <p className="text-xs md:text-sm text-muted-foreground mb-1">{t('advanced_analytics.label_avg_mood')}</p>
                      <p className="text-3xl md:text-4xl font-bold text-orange-600">
                        {(moodTrends.reduce((acc, m) => acc + m.mood, 0) / moodTrends.length || 0).toFixed(1)}
                      </p>
                      <p className="text-xs text-green-600 mt-1">{t('advanced_analytics.from_last_month')}</p>
                    </CardContent>
                  </Card>
                  <Card className="border-0 shadow-lg rounded-2xl">
                    <CardContent className="p-4 md:p-6">
                      <p className="text-xs md:text-sm text-muted-foreground mb-1">{t('advanced_analytics.label_best_day')}</p>
                      <p className="text-3xl md:text-4xl font-bold text-green-600">{t('advanced_analytics.best_day_label')}</p>
                      <p className="text-xs text-muted-foreground mt-1">{t('advanced_analytics.highest_avg_mood')}</p>
                    </CardContent>
                  </Card>
                  <Card className="border-0 shadow-lg rounded-2xl">
                    <CardContent className="p-4 md:p-6">
                      <p className="text-xs md:text-sm text-muted-foreground mb-1">{t('advanced_analytics.label_consistency')}</p>
                      <p className="text-3xl md:text-4xl font-bold text-blue-600">87%</p>
                      <p className="text-xs text-muted-foreground mt-1">{t('advanced_analytics.mood_variance')}</p>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <>
                  <LockedCard title={t('advanced_analytics.locked_avg_mood_title')} description={t('advanced_analytics.locked_avg_mood_desc')} onUnlock={handleUnlockClick} />
                  <LockedCard title={t('advanced_analytics.locked_best_days_title')} description={t('advanced_analytics.locked_best_days_desc')} onUnlock={handleUnlockClick} />
                  <LockedCard title={t('advanced_analytics.locked_consistency_title')} description={t('advanced_analytics.locked_consistency_desc')} onUnlock={handleUnlockClick} />
                </>
              )}
            </div>
          </TabsContent>

          <TabsContent value="patterns" className="space-y-4 md:space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
              <Card className="border-0 shadow-lg rounded-2xl">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg md:text-xl">{t('advanced_analytics.chart_thought_patterns')}</CardTitle>
                </CardHeader>
                <CardContent>
                  {isPremium ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={distortionData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={(entry) => entry.name.substring(0, 15)}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {distortionData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="min-h-[300px] flex items-center justify-center">
                      <div className="text-center max-w-xs px-4">
                        <Lock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground mb-4">{t('advanced_analytics.unlock_patterns')}</p>
                        <Button onClick={handleUnlockClick} className="bg-primary hover:bg-primary/90">
                          <Crown className="w-4 h-4 mr-2" />
                          {t('advanced_analytics.go_premium')}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {isPremium ? (
                <Card className="border-0 shadow-lg rounded-2xl">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg md:text-xl">{t('advanced_analytics.chart_emotional_shift')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-xs md:text-sm text-muted-foreground">{t('advanced_analytics.before_cbt')}</span>
                          <span className="text-xs md:text-sm font-semibold">7.2/10</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-red-400 h-2 rounded-full" style={{ width: '72%' }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-xs md:text-sm text-muted-foreground">{t('advanced_analytics.after_cbt')}</span>
                          <span className="text-xs md:text-sm font-semibold">4.1/10</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-green-400 h-2 rounded-full" style={{ width: '41%' }} />
                        </div>
                      </div>
                      <div className="mt-6 p-3 md:p-4 bg-green-50 rounded-xl">
                        <p className="text-sm text-green-800 font-semibold">{t('advanced_analytics.improvement_percent')}</p>
                        <p className="text-xs text-green-600 mt-1">{t('advanced_analytics.improvement_note')}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <LockedCard 
                  title="Emotional Shift Analysis" 
                  description="See how CBT improves your emotions"
                  height="chart"
                  onUnlock={handleUnlockClick}
                />
              )}
            </div>
          </TabsContent>

          <TabsContent value="progress" className="space-y-4 md:space-y-6">
            <Card className="border-0 shadow-lg rounded-2xl">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg md:text-xl">{t('advanced_analytics.chart_exercise_completion')}</CardTitle>
              </CardHeader>
              <CardContent className="px-2 md:px-6">
                {isPremium ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={exerciseChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#F8744C" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="min-h-[300px] flex items-center justify-center">
                    <div className="text-center max-w-xs px-4">
                      <Lock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground mb-4">{t('advanced_analytics.unlock_exercise')}</p>
                      <Button onClick={handleUnlockClick} className="bg-primary hover:bg-primary/90">
                        <Crown className="w-4 h-4 mr-2" />
                        {t('advanced_analytics.go_premium')}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="predictions" className="space-y-4 md:space-y-6">
            {isPremium ? (
              <Card className="border-0 shadow-lg rounded-2xl">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                    <Brain className="w-5 h-5 text-purple-600" />
                    {t('advanced_analytics.ai_predictions_title')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-purple-50 p-4 md:p-6 rounded-xl border border-purple-200">
                    <h4 className="font-semibold text-foreground mb-2 text-sm md:text-base">{t('advanced_analytics.mood_forecast_title')}</h4>
                    <p className="text-xs md:text-sm text-muted-foreground mb-4">
                      {t('advanced_analytics.mood_forecast_text')}
                    </p>
                    <div className="flex gap-1 md:gap-2">
                      {weekDays.map((day, i) => {
                        const levels = [3, 4, 3, 3, 4, 4, 3];
                        return (
                          <div key={day} className="flex-1 text-center">
                            <div className="text-[10px] md:text-xs text-muted-foreground mb-1">{day}</div>
                            <div className={`h-12 md:h-16 rounded-lg ${levels[i] >= 4 ? 'bg-green-200' : 'bg-yellow-200'}`} />
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="bg-blue-50 p-4 md:p-6 rounded-xl border border-blue-200">
                    <h4 className="font-semibold text-foreground mb-2 text-sm md:text-base">{t('advanced_analytics.recommended_actions_title')}</h4>
                    <ul className="space-y-2">
                      <li className="flex items-start gap-2 text-xs md:text-sm text-muted-foreground">
                        <span className="text-blue-600">•</span>
                        {t('advanced_analytics.action_1')}
                      </li>
                      <li className="flex items-start gap-2 text-xs md:text-sm text-muted-foreground">
                        <span className="text-blue-600">•</span>
                        {t('advanced_analytics.action_2')}
                      </li>
                      <li className="flex items-start gap-2 text-xs md:text-sm text-muted-foreground">
                        <span className="text-blue-600">•</span>
                        {t('advanced_analytics.action_3')}
                      </li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <LockedCard 
                title={t('advanced_analytics.locked_ai_title')} 
                description={t('advanced_analytics.locked_ai_desc')}
                height="chart"
                onUnlock={handleUnlockClick}
              />
            )}
          </TabsContent>
        </Tabs>

        {showPaywall && (
          <PremiumPaywall
            onClose={() => setShowPaywall(false)}
            onSuccess={() => refetchSubscription()}
          />
        )}
      </div>
    </div>
  );
}