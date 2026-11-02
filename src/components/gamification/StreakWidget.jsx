import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Flame, TrendingUp, Award, Heart, BookOpen, Dumbbell } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

export default function StreakWidget({ compact = false }) {
  const { t } = useTranslation();
  const { data: streaks, isLoading } = useQuery({
    queryKey: ['userStreaks'],
    queryFn: async () => {
      const allStreaks = await base44.entities.UserStreak.list();
      // Deduplicate by streak_type (take most recent)
      const uniqueStreaks = {};
      allStreaks.forEach((streak) => {
        if (!uniqueStreaks[streak.streak_type] ||
        new Date(streak.updated_date) > new Date(uniqueStreaks[streak.streak_type].updated_date)) {
          uniqueStreaks[streak.streak_type] = streak;
        }
      });
      return Object.values(uniqueStreaks);
    },
    initialData: [],
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false
  });
  const streaksArr = Array.isArray(streaks) ? streaks : [];
  const overallStreak = streaksArr.find((s) => s.streak_type === 'overall');
  const moodStreak = streaksArr.find((s) => s.streak_type === 'mood_check');
  const journalStreak = streaksArr.find((s) => s.streak_type === 'journal');
  const exerciseStreak = streaksArr.find((s) => s.streak_type === 'exercise');


  const currentStreak = overallStreak?.current_streak || 0;
  const longestStreak = overallStreak?.longest_streak || 0;

  if (isLoading) return null;

  // Compact display for Home grid
  if (compact) {
    return (
      <Card className="rounded-[26px] border hover:shadow-[var(--shadow-lg)] transition-calm overflow-hidden" style={{ borderColor: 'rgba(118, 170, 156, 0.3)', background: 'linear-gradient(180deg, rgba(255,248,238,0.98) 0%, rgba(239,247,242,0.96) 100%)', boxShadow: '0 22px 50px rgba(68, 108, 96, 0.13), 0 8px 18px rgba(68, 108, 96, 0.07)' }}>
        <CardContent className="p-5 text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-[18px] bg-accent/18 text-accent shadow-[var(--shadow-sm)]">
            <Flame className="text-primary lucide lucide-flame w-8 h-8" strokeWidth={2} />
          </div>
          <p className="text-primary mb-1 text-2xl font-bold">
            {currentStreak}
          </p>
          <p className="text-primary text-xs">{t('gamification.streak.day_streak')}</p>
        </CardContent>
      </Card>);

  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}>

      <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-50 to-red-50 overflow-hidden rounded-2xl">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center shadow-lg">
                <Flame className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">{t('gamification.streak.daily_title')}</h3>
                <p className="text-xs text-muted-foreground">{t('gamification.streak.momentum')}</p>
              </div>
            </div>
            {currentStreak >= 7 &&
            <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
                <Award className="w-3 h-3 mr-1" />
                {t('gamification.streak.on_fire')}
              </Badge>
            }
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[hsl(var(--card)/0.97)] backdrop-blur-sm rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <Flame className="w-4 h-4 text-orange-600" />
                <p className="text-xs text-muted-foreground">{t('gamification.streak.current')}</p>
              </div>
              <p className="text-3xl font-bold text-orange-600">
                {currentStreak}
                <span className="text-sm text-muted-foreground ml-1">{t('gamification.streak.days')}</span>
              </p>
            </div>

            <div className="bg-[hsl(var(--card)/0.97)] backdrop-blur-sm rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-purple-600" />
                <p className="text-xs text-muted-foreground">{t('gamification.streak.best')}</p>
              </div>
              <p className="text-3xl font-bold text-purple-600">
                {longestStreak}
                <span className="text-sm text-muted-foreground ml-1">{t('gamification.streak.days')}</span>
              </p>
            </div>
          </div>

          {/* Streak Calendar */}
          <div className="mt-4 pt-4 border-t border-orange-200">
            <div className="flex justify-between items-center gap-1">
              {[...Array(7)].map((_, i) => {
                const isActive = i < currentStreak;
                return (
                  <div
                    key={i}
                    className={cn(
                      "flex-1 h-2 rounded-full",
                      isActive ?
                      "bg-gradient-to-r from-orange-400 to-red-500" :
                      "bg-gray-200"
                    )} />);


              })}
            </div>
            <div className="flex justify-between mt-2">
              <p className="text-xs text-muted-foreground">{t('gamification.streak.seven_days')}</p>
              {currentStreak >= 7 &&
              <p className="text-xs text-orange-600 font-semibold">{t('gamification.streak.week_complete')}</p>
              }
            </div>
          </div>

          {/* Individual Activity Streaks */}
          <div className="mt-4 pt-4 border-t border-orange-200 grid grid-cols-3 gap-2">
            <div className="text-center p-2 rounded-lg bg-[hsl(var(--card)/0.97)]">
              <Heart className="w-4 h-4 mx-auto mb-1 text-pink-500" />
              <p className="text-sm font-bold text-foreground">{moodStreak?.current_streak || 0}</p>
              <p className="text-xs text-muted-foreground">{t('gamification.streak.check_ins')}</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-[hsl(var(--card)/0.97)]">
              <BookOpen className="w-4 h-4 mx-auto mb-1 text-purple-500" />
              <p className="text-sm font-bold text-foreground">{journalStreak?.current_streak || 0}</p>
              <p className="text-xs text-muted-foreground">{t('gamification.streak.journals')}</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-[hsl(var(--card)/0.97)]">
              <Dumbbell className="w-4 h-4 mx-auto mb-1 text-blue-500" />
              <p className="text-sm font-bold text-foreground">{exerciseStreak?.current_streak || 0}</p>
              <p className="text-xs text-muted-foreground">{t('gamification.streak.exercises')}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>);

}