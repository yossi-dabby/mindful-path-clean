import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import VideoModal from './VideoModal';
import { useTranslation } from 'react-i18next';

export default function StarterPathCard() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [showVideo, setShowVideo] = useState(false);

  // Get user's starter path progress
  const { data: starterPath, isLoading } = useQuery({
    queryKey: ['starterPath'],
    queryFn: async () => {
      const paths = await base44.entities.StarterPath.list();
      return paths[0] || null;
    }
  });

  const startPathMutation = useMutation({
    mutationFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      return await base44.entities.StarterPath.create({
        current_day: 1,
        started_date: today
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['starterPath'] });
      // Navigation handled by Link component
    }
  });

  if (isLoading) {
    return null;
  }

  // Don't show if completed
  if (starterPath?.completed) {
    return null;
  }

  const currentDay = starterPath?.current_day || 0;
  const isStarted = currentDay > 0;
  const dayThemeDescription = currentDay > 0
    ? t(`starter_path.day_themes.${currentDay}.description`, { defaultValue: t('starter_path.card_description_continue') })
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <Card className="border-0 hover:shadow-xl transition-calm" style={{ 
        borderRadius: '32px',
        background: 'linear-gradient(145deg, rgba(248, 253, 252, 0.95) 0%, rgba(232, 246, 243, 0.85) 100%)',
        backdropFilter: 'blur(16px)',
        boxShadow: '0 10px 36px rgba(38, 166, 154, 0.1), 0 4px 14px rgba(0,0,0,0.04), inset 0 2px 0 rgba(255,255,255,0.7)'
      }}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4 md:gap-6">
            {/* Help Video Button - WEB: LEFT side */}
            <div className="hidden md:flex items-start">
              <style>{`
                @keyframes angelPulse {
                  0%, 100% { opacity: 0.9; transform: scale(1); }
                  50% { opacity: 1; transform: scale(1.05); }
                }
              `}</style>
              <Button
                onClick={() => setShowVideo(true)}
                size="icon"
                variant="ghost"
                className="flex-shrink-0"
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '20px',
                  backgroundColor: 'rgba(255, 215, 0, 0.15)',
                  animation: 'angelPulse 2s ease-in-out infinite'
                }}
                aria-label={t('starter_path.card_aria_watch_video')}
               mobileLabelKey="video">
                <Sparkles className="w-6 h-6" style={{ color: '#FFD700' }} strokeWidth={2} />
              </Button>
            </div>

            <div className="flex-1">
              {/* Header */}
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 icon-default" style={{ color: '#26A69A' }} strokeWidth={2} />
                <h3 className="text-base font-semibold truncate" style={{ color: '#1A3A34' }}>
                  {t('starter_path.card_title')}
                </h3>
                {isStarted && (
                  <Badge variant="secondary" className="border-0" style={{ 
                    borderRadius: '16px',
                    backgroundColor: 'rgba(38, 166, 154, 0.15)',
                    color: '#26A69A'
                  }}>
                    {t('starter_path.card_day_badge', { day: currentDay })}
                  </Badge>
                )}
              </div>

              {/* Description */}
              <p className="text-sm mb-4 line-clamp-2" style={{ color: '#5A7A72' }}>
                {isStarted 
                  ? dayThemeDescription
                  : t('starter_path.card_description_new')}
              </p>

              {/* Progress Bar */}
              {isStarted && (
                <div className="mb-5">
                  <div className="h-2.5 overflow-hidden" style={{ 
                    backgroundColor: 'rgba(200, 220, 215, 0.5)',
                    borderRadius: '12px'
                  }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(currentDay / 7) * 100}%` }}
                      transition={{ duration: 0.5 }}
                      style={{ 
                        height: '100%',
                        backgroundColor: '#26A69A',
                        borderRadius: '12px',
                        boxShadow: '0 2px 8px rgba(38, 166, 154, 0.3)'
                      }}
                    />
                  </div>
                  <p className="text-xs mt-2" style={{ color: '#5A7A72' }}>
                    {t('starter_path.card_progress', { day: currentDay })}
                  </p>
                </div>
              )}

              {/* CTA */}
              {isStarted ? (
                <Link to={createPageUrl('StarterPath')}>
                  <Button
                    className="px-7 py-5 font-medium transition-calm text-white"
                    style={{ 
                      borderRadius: '22px',
                      backgroundColor: '#26A69A',
                      boxShadow: '0 6px 20px rgba(38, 166, 154, 0.3), 0 3px 8px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.2)'
                    }}
                  >
                    {t('starter_path.card_btn_continue')}
                    <ArrowRight className="w-4 h-4 ml-2 icon-default" strokeWidth={2} />
                  </Button>
                </Link>
              ) : (
                <Button
                  onClick={() => startPathMutation.mutate()}
                  disabled={startPathMutation.isPending}
                  className="px-7 py-5 font-medium transition-calm text-white"
                  style={{ 
                    borderRadius: '22px',
                    backgroundColor: '#26A69A',
                    boxShadow: '0 6px 20px rgba(38, 166, 154, 0.3), 0 3px 8px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.2)'
                  }}
                >
                  {startPathMutation.isPending ? t('starter_path.card_btn_starting') : t('starter_path.card_btn_start')}
                  <ArrowRight className="w-4 h-4 ml-2 icon-default" strokeWidth={2} />
                </Button>
              )}
            </div>

            {/* Visual Indicator */}
            <div className="flex-shrink-0 flex flex-col items-center gap-2">
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 3, repeat: Infinity, ease: [0.2, 0.8, 0.2, 1] }}
                className="w-18 h-18 flex items-center justify-center"
                style={{ 
                  width: '72px',
                  height: '72px',
                  borderRadius: '24px',
                  backgroundColor: 'rgba(38, 166, 154, 0.15)',
                  boxShadow: '0 4px 12px rgba(38, 166, 154, 0.15), inset 0 1px 0 rgba(255,255,255,0.5)'
                }}
              >
                {isStarted ? (
                  <div className="text-center">
                    <p className="text-2xl font-bold" style={{ color: '#26A69A' }}>{currentDay}</p>
                    <p className="text-xs" style={{ color: '#26A69A' }}>/ 7</p>
                  </div>
                ) : (
                  <Sparkles className="w-8 h-8 icon-default" style={{ color: '#26A69A' }} strokeWidth={2} />
                )}
              </motion.div>
              
              {/* Help Video Button - MOBILE: UNDER star icon */}
              <Button
                onClick={() => setShowVideo(true)}
                size="icon"
                variant="ghost"
                className="md:hidden"
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '16px',
                  backgroundColor: 'rgba(255, 215, 0, 0.15)',
                  animation: 'angelPulse 2s ease-in-out infinite'
                }}
                aria-label={t('starter_path.card_aria_watch_video')}
               mobileLabelKey="video">
                <Sparkles className="w-5 h-5" style={{ color: '#FFD700' }} strokeWidth={2} />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Video Modal */}
      {showVideo && (
        <VideoModal
          videoUrl="https://firebasestorage.googleapis.com/v0/b/my-cbt-therapy.firebasestorage.app/o/7-Day%20Starter%20Path.mp4?alt=media&token=4fcbf1a9-fbec-42f2-a969-fb887f804819"
          onClose={() => setShowVideo(false)}
        />
      )}
    </motion.div>
  );
}