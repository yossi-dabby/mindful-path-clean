import React, { useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Flame, Award, Zap, Trophy, BookOpen, Dumbbell, Heart, Target, Calendar, Lock } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import PremiumIcon from '@/components/ui/PremiumIcon';

const POINT_VALUES = { mood_check: 10, journal_entry: 20, exercise_complete: 15, goal_complete: 50 };
const LEVEL_THRESHOLDS = [0, 100, 250, 500, 1000, 2000, 3500, 5500, 8000, 12000];
const DEFAULT_BADGES = [
  { key: 'first_checkin', name: 'First Check-in', icon: 'star' }, { key: 'week_warrior', name: 'Week Warrior', icon: 'flame' },
  { key: 'journal_starter', name: 'Journal Starter', icon: 'journal' }, { key: 'thoughtful_writer', name: 'Thoughtful Writer', icon: 'writing' },
  { key: 'exercise_explorer', name: 'Exercise Explorer', icon: 'movement' }, { key: 'goal_getter', name: 'Goal Getter', icon: 'target' },
  { key: 'mood_master', name: 'Mood Master', icon: 'sun' }, { key: 'consistency_king', name: 'Consistency King', icon: 'crown' }
];
const BADGE_KEY_BY_NAME = Object.fromEntries(DEFAULT_BADGES.map((badge) => [badge.name.toLowerCase(), badge.key]));

export default function GamificationHub() {
  const { t, i18n } = useTranslation();
  const reduceMotion = useReducedMotion();
  const streaksQuery = useQuery({ queryKey: ['userStreaks'], queryFn: () => base44.entities.UserStreak.list() });
  const badgesQuery = useQuery({ queryKey: ['userBadges'], queryFn: () => base44.entities.Badge.list('-earned_date') });
  const pointsQuery = useQuery({ queryKey: ['userPoints'], queryFn: () => base44.entities.UserPoints.list() });
  const moodsQuery = useQuery({ queryKey: ['moodEntries'], queryFn: () => base44.entities.MoodEntry.list('-date', 30) });
  const streaks = Array.isArray(streaksQuery.data) ? streaksQuery.data : [];
  const badges = Array.isArray(badgesQuery.data) ? badgesQuery.data : [];
  const points = Array.isArray(pointsQuery.data) ? pointsQuery.data : [];
  const moodEntries = Array.isArray(moodsQuery.data) ? moodsQuery.data : [];
  const userPoints = points[0] || { total_points: 0, weekly_points: 0, level: 1 };
  const currentLevel = Math.min(Math.max(Number(userPoints.level) || 1, 1), LEVEL_THRESHOLDS.length);
  const currentThreshold = LEVEL_THRESHOLDS[currentLevel - 1] || 0;
  const atMaxLevel = currentLevel >= LEVEL_THRESHOLDS.length;
  const nextThreshold = atMaxLevel ? currentThreshold : LEVEL_THRESHOLDS[currentLevel];
  const denominator = Math.max(1, nextThreshold - currentThreshold);
  const levelProgress = atMaxLevel ? 100 : Math.min(100, Math.max(0, ((Number(userPoints.total_points) - currentThreshold) / denominator) * 100));
  const getStreak = (type) => streaks.find((item) => item?.streak_type === type) || { current_streak: 0, longest_streak: 0 };
  const streakData = [
    ['overall', Flame, '#c2410c'], ['checkins', Heart, '#be185d'], ['journaling', BookOpen, '#7e22ce'], ['exercises', Dumbbell, '#1d4ed8']
  ].map(([label, Icon, color], index) => {
    const type = ['overall', 'mood_check', 'journal', 'exercise'][index];
    const streak = getStreak(type);
    return { label, Icon, color, current: Number(streak.current_streak) || 0, best: Number(streak.longest_streak) || 0 };
  });
  const displayedBadges = badges.length ? badges : DEFAULT_BADGES.map((badge) => ({ ...badge, progress: 0 }));
  const earnedBadges = badges.filter((badge) => badge?.earned_date);
  const localizedBadgeName = (badge) => {
    const key = badge?.key || BADGE_KEY_BY_NAME[String(badge?.name || '').toLowerCase()];
    return key ? t(`progress_ui.gamification.badge.${key}`) : badge?.name;
  };
  const weekDays = useMemo(() => {
    const locale = i18n.resolvedLanguage || i18n.language || 'en';
    const formatter = new Intl.DateTimeFormat(locale, { weekday: 'narrow' });
    const monday = new Date(2026, 0, 5);
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + index);
      return formatter.format(date);
    });
  }, [i18n.resolvedLanguage, i18n.language]);
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const activeDays = new Set(moodEntries.filter((entry) => entry?.date && new Date(`${entry.date}T12:00:00`) >= weekAgo).map((entry) => entry.date)).size;

  return (
    <div className="space-y-4 sm:space-y-6" data-testid="progress-achievements">
      <Card className="border border-border/80 bg-card shadow-[var(--shadow-md)] overflow-hidden"><CardContent className="p-4 sm:p-6">
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3"><div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600"><Trophy className="h-7 w-7 text-white" /></div><div><p className="text-sm text-muted-foreground">{t('progress_ui.gamification.level')}</p><p className="text-2xl sm:text-3xl font-bold text-foreground">{t('progress_ui.gamification.level_value', { level: currentLevel })}</p></div></div>
          <div className="flex items-center gap-2 self-start rounded-full bg-amber-50 px-4 py-2"><Zap className="h-5 w-5 text-amber-700" /><strong className="text-foreground">{Number(userPoints.total_points) || 0}</strong><span className="text-sm text-muted-foreground">{t('progress_ui.gamification.points')}</span></div>
        </div>
        <div className="space-y-2"><div className="flex items-center justify-between gap-3 text-sm"><span className="text-muted-foreground">{t('progress_ui.gamification.progress_to_level', { level: Math.min(currentLevel + 1, LEVEL_THRESHOLDS.length) })}</span><span className="font-semibold text-primary">{Math.round(levelProgress)}%</span></div><div className="h-3 overflow-hidden rounded-full bg-secondary"><motion.div initial={reduceMotion ? false : { width: 0 }} animate={{ width: `${levelProgress}%` }} className="h-full rounded-full bg-gradient-to-r from-teal-600 to-teal-500" /></div>{!atMaxLevel && <p className="text-xs text-muted-foreground">{t('progress_ui.gamification.to_next', { count: Math.max(0, nextThreshold - Number(userPoints.total_points || 0)) })}</p>}</div>
        <div className="mt-4 border-t border-border pt-4"><p className="mb-2 text-xs font-semibold text-muted-foreground">{t('progress_ui.gamification.earn_by')}</p><div className="grid grid-cols-2 lg:grid-cols-4 gap-2 text-xs">{[[Heart,'checkin',POINT_VALUES.mood_check,'text-pink-700'],[BookOpen,'journal',POINT_VALUES.journal_entry,'text-purple-700'],[Dumbbell,'exercise',POINT_VALUES.exercise_complete,'text-blue-700'],[Target,'goal',POINT_VALUES.goal_complete,'text-teal-700']].map(([Icon,key,value,color]) => <div key={key} className="flex items-center gap-1 rounded-lg bg-secondary/40 p-2"><Icon className={`h-3.5 w-3.5 ${color}`} /><span>{t(`progress_ui.gamification.${key}`)}: +{value}</span></div>)}</div></div>
      </CardContent></Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{streakData.map(({ label, Icon, color, current, best }) => <Card key={label} className="border-border/70"><CardContent className="p-3 sm:p-4 text-center"><Icon className="mx-auto mb-2 h-7 w-7" style={{ color }} /><p className="text-2xl font-bold text-foreground">{current}</p><p className="text-xs font-semibold text-muted-foreground break-words">{t(`progress_ui.gamification.${label}`)}</p><p className="mt-1 text-xs text-muted-foreground">{t('progress_ui.gamification.best', { count: best })}</p></CardContent></Card>)}</div>

      <Card className="border border-border/80 bg-card shadow-[var(--shadow-md)]"><CardHeader className="p-4 sm:p-6 pb-2"><CardTitle className="flex items-center gap-2 text-base sm:text-lg"><Award className="h-5 w-5 text-amber-600" />{t('progress_ui.gamification.achievements')}<Badge className="ms-auto">{earnedBadges.length} / {displayedBadges.length}</Badge></CardTitle></CardHeader><CardContent className="p-4 sm:p-6"><div className="grid grid-cols-2 min-[420px]:grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">{displayedBadges.map((badge) => { const earned = Boolean(badge?.earned_date); return <div key={badge?.id || badge?.name} className={`relative flex aspect-square min-w-0 flex-col items-center justify-center rounded-2xl border p-2 text-center ${earned ? 'border-amber-200 bg-amber-50' : 'border-border bg-secondary/40'}`}><PremiumIcon name={badge?.icon || 'star'} size="sm" className={`mb-1 ${earned ? '' : 'opacity-60'}`} /><p className="line-clamp-2 text-xs font-medium text-foreground">{localizedBadgeName(badge)}</p>{!earned && <Lock className="absolute end-1.5 top-1.5 h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />}</div>; })}</div></CardContent></Card>

      <Card className="border border-border/80 bg-card shadow-[var(--shadow-md)]"><CardHeader className="p-4 sm:p-6 pb-2"><CardTitle className="flex items-center gap-2 text-base sm:text-lg"><Calendar className="h-5 w-5 text-primary" />{t('progress_ui.gamification.week')}</CardTitle></CardHeader><CardContent className="p-4 sm:p-6"><div className="flex h-24 items-end justify-between gap-1" aria-hidden="true">{weekDays.map((day, index) => <div key={index} className="flex h-full flex-1 flex-col items-center justify-end gap-1"><div className={`w-full rounded-t-lg ${index < activeDays ? 'h-4/5 bg-teal-600' : 'h-1/5 bg-secondary'}`} /><span className="text-xs text-muted-foreground">{day}</span></div>)}</div><div className="mt-4 flex flex-col min-[420px]:flex-row min-[420px]:items-center justify-between gap-2 text-xs text-muted-foreground"><span>{t('progress_ui.gamification.weekly_points', { count: Number(userPoints.weekly_points) || 0 })}</span><span>{t('progress_ui.gamification.days_active', { count: activeDays })}</span></div></CardContent></Card>
    </div>
  );
}
