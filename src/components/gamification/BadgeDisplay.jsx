import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Award, Sparkles, Trophy } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import PremiumIcon from '@/components/ui/PremiumIcon';

const badgeIconNames = {
  '🌟': 'star', '🔥': 'flame', '📝': 'journal', '✍️': 'writing',
  '🏃': 'movement', '🎯': 'target', '😌': 'sun', '👑': 'crown', '🏅': 'star'
};

const resolveBadgeIcon = (icon) => badgeIconNames[icon] || icon || 'star';

const rarityBgColors = {
  common: 'rgba(156, 163, 175, 0.15)',
  rare: 'rgba(59, 130, 246, 0.15)',
  epic: 'rgba(168, 85, 247, 0.15)',
  legendary: 'rgba(245, 158, 11, 0.15)'
};

export default function BadgeDisplay({ compact = false }) {
  const { t } = useTranslation();
  const { data: badges, isLoading } = useQuery({
    queryKey: ['userBadges'],
    queryFn: async () => {
      const allBadges = await base44.entities.Badge.list('-earned_date');
      // Deduplicate by badge_type (keep most recent)
      const uniqueBadges = {};
      allBadges.forEach((badge) => {
        const key = badge.badge_type || badge.name;
        if (!uniqueBadges[key] ||
        new Date(badge.updated_date) > new Date(uniqueBadges[key].updated_date)) {
          uniqueBadges[key] = badge;
        }
      });
      return Object.values(uniqueBadges);
    },
    initialData: [],
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false
  });
  const badgesArr = Array.isArray(badges) ? badges : [];
  const earnedBadges = badgesArr.filter((b) => b.earned_date);
  const inProgressBadges = badgesArr.filter((b) => !b.earned_date && b.progress > 0);

  if (isLoading) return null;

  if (compact) {
    return (
      <Card className="rounded-[26px] border hover:shadow-[var(--shadow-lg)] transition-calm overflow-hidden" style={{ borderColor: 'rgba(118, 170, 156, 0.3)', background: 'linear-gradient(180deg, rgba(246,252,248,0.98) 0%, rgba(235,245,240,0.96) 100%)', boxShadow: '0 22px 50px rgba(68, 108, 96, 0.13), 0 8px 18px rgba(68, 108, 96, 0.07)' }}>
        <CardContent className="bg-emerald-50 p-5 text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-[18px] bg-primary/12 text-primary shadow-[var(--shadow-sm)]">
            <Award className="text-primary mx-auto lucide lucide-award w-8 h-8" strokeWidth={2} />
          </div>
          <p className="text-primary mb-1 text-2xl font-bold">{earnedBadges.length}</p>
          <p className="text-primary text-xs">{t('gamification.badges.badges')}</p>
          {inProgressBadges.length > 0 &&
          <p className="text-xs mt-1 text-muted-foreground">{t('gamification.badges.in_progress_count', { count: inProgressBadges.length })}</p>
          }
        </CardContent>
      </Card>);

  }

  return (
    <div className="space-y-6">
      {/* Earned Badges */}
      <Card className="border-0 shadow-lg rounded-2xl" style={{
        background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.95) 0%, rgba(232, 246, 243, 0.9) 100%)'
      }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2" style={{ color: '#1A3A34' }}>
            <Trophy className="w-5 h-5" style={{ color: '#ECC94B' }} />
            {t('gamification.badges.earned_badges')}
            <Badge className="ml-auto text-xs" style={{ background: 'rgba(236, 201, 75, 0.2)', color: '#B7791F' }}>
              {t('gamification.badges.earned_count', { count: earnedBadges.length })}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {earnedBadges.length === 0 ?
          <div className="text-center py-8">
              <Award className="w-12 h-12 mx-auto mb-3 opacity-30" style={{ color: '#7A9A92' }} />
              <p className="text-sm" style={{ color: '#7A9A92' }}>{t('gamification.badges.first_badge_prompt')}</p>
            </div> :

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 sm:gap-4">
              {earnedBadges.map((badge, i) =>
            <motion.div
              key={badge.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ y: -4, scale: 1.05 }}
              className="relative cursor-pointer group">

                  <div
                className="aspect-square rounded-2xl flex flex-col items-center justify-center p-2 sm:p-3 transition-all"
                style={{
                  background: `linear-gradient(145deg, ${rarityBgColors[badge.rarity] || rarityBgColors.common} 0%, rgba(255, 255, 255, 0.9) 100%)`,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                }}>

                    <PremiumIcon name={resolveBadgeIcon(badge.icon)} size="sm" className="mb-1" />
                    <p dir="auto" className="text-xs font-medium text-center line-clamp-2" style={{ color: '#1A3A34' }}>{badge.name}</p>
                    <Badge className="mt-1 text-xs capitalize" style={{
                  background: badge.rarity === 'legendary' ? 'rgba(245, 158, 11, 0.2)' :
                  badge.rarity === 'epic' ? 'rgba(168, 85, 247, 0.2)' :
                  badge.rarity === 'rare' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(156, 163, 175, 0.2)',
                  color: badge.rarity === 'legendary' ? '#B45309' :
                  badge.rarity === 'epic' ? '#7C3AED' :
                  badge.rarity === 'rare' ? '#2563EB' : '#4B5563'
                }}>
                      {t(`gamification.badges.rarity.${badge.rarity}`, { defaultValue: badge.rarity })}
                    </Badge>
                  </div>
                </motion.div>
            )}
            </div>
          }
        </CardContent>
      </Card>

      {/* In Progress */}
      {inProgressBadges.length > 0 &&
      <Card className="border-0 shadow-lg rounded-2xl" style={{
        background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.95) 0%, rgba(232, 246, 243, 0.9) 100%)'
      }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2" style={{ color: '#1A3A34' }}>
              <Sparkles className="w-5 h-5" style={{ color: '#F6AD55' }} />
              {t('gamification.badges.in_progress')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {inProgressBadges.map((badge, i) =>
            <motion.div
              key={badge.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="rounded-xl p-4 transition-all hover:shadow-md"
              style={{ background: 'rgba(200, 230, 225, 0.3)' }}>

                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center opacity-50" style={{
                  background: 'rgba(200, 200, 200, 0.4)'
                }}>
                      <PremiumIcon name={resolveBadgeIcon(badge.icon)} size="sm" className="opacity-60" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p dir="auto" className="font-semibold text-sm truncate" style={{ color: '#1A3A34' }}>{badge.name}</p>
                      <p dir="auto" className="text-xs line-clamp-1" style={{ color: '#5A7A72' }}>{badge.description}</p>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs" style={{ color: '#7A9A92' }}>{t('gamification.badges.progress')}</p>
                      <p className="text-xs font-semibold" style={{ color: '#26A69A' }}>{badge.progress || 0}%</p>
                    </div>
                    <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'rgba(200, 230, 225, 0.5)' }}>
                      <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${badge.progress || 0}%` }}
                    transition={{ duration: 0.5 }}
                    className="h-full rounded-full"
                    style={{ background: 'linear-gradient(90deg, #26A69A 0%, #38B2AC 100%)' }} />

                    </div>
                  </div>
                </motion.div>
            )}
            </div>
          </CardContent>
        </Card>
      }
    </div>);

}