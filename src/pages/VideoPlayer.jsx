import LibraryPageHeader from '@/components/ui/LibraryPageHeader';
import React, { useRef, useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

export default function VideoPlayer() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [mediaError, setMediaError] = useState(false);
  const videoRef = useRef(null);
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const videoUrl = urlParams.get('videoUrl');
  const title = urlParams.get('title') || t('home_practice.media.video');
  const videoId = urlParams.get('videoId');

  // Get current progress
  const { data: videoProgress } = useQuery({
    queryKey: ['videoProgress', videoId],
    queryFn: async () => {
      if (!videoId) return null;
      try {
        const progress = await base44.entities.VideoProgress.filter({ video_id: videoId });
        return progress[0] || null;
      } catch (error) {
        console.error('Error fetching video progress:', error);
        return null;
      }
    },
    enabled: !!videoId
  });

  // Update progress mutation
  const updateProgressMutation = useMutation({
    mutationFn: async ({ progress, completed }) => {
      if (!videoId) return;

      try {
        if (videoProgress) {
          await base44.entities.VideoProgress.update(videoProgress.id, {
            progress,
            completed,
            last_watched_at: new Date().toISOString()
          });
        } else {
          await base44.entities.VideoProgress.create({
            video_id: videoId,
            progress,
            completed,
            last_watched_at: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error('Error updating video progress:', error);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['videoProgress'] });
      queryClient.invalidateQueries({ queryKey: ['allVideoProgress'] });
    }
  });

  // Track video progress
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoId) return;

    let lastUpdate = 0;

    const handleTimeUpdate = () => {
      const currentProgress = (video.currentTime / video.duration) * 100;
      const roundedProgress = Math.floor(currentProgress);

      // Update every 5%
      if (roundedProgress - lastUpdate >= 5) {
        lastUpdate = roundedProgress;
        const completed = currentProgress >= 95;
        updateProgressMutation.mutate({ progress: roundedProgress, completed });
      }
    };

    const handleEnded = () => {
      updateProgressMutation.mutate({ progress: 100, completed: true });
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('ended', handleEnded);
    };
  }, [videoId, videoProgress]);

  const handleBack = () => {
    navigate(createPageUrl('Videos'));
  };

  if (!videoUrl) {
    return (
      <div className="min-h-dvh">
        <div className="page-container max-w-4xl">
          <div className="garden-surface mt-6 p-8 text-center">
            <h1 className="text-xl font-semibold mb-4 text-foreground">
              {t('video_player.no_video')}
            </h1>
            <Button onClick={handleBack} className="px-6 py-5 text-primary-foreground" style={{
              borderRadius: '9999px',
              backgroundColor: 'hsl(var(--primary))',
              boxShadow: '0 2px 8px rgba(38, 166, 154, 0.2), 0 1px 3px rgba(0,0,0,0.06)'
            }}>{t('video_player.back_to_library')}</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh">
      <div className="page-container max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <LibraryPageHeader title={title} onBack={handleBack} backLabel={t('video_player.back_to_library')} />

        {/* Video Player Card */}
          <Card className="overflow-hidden rounded-[28px] border border-border/70 bg-card shadow-[var(--shadow-md)]">
            <CardContent className="p-0">
              <div className="relative" style={{ borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
                <video
                  ref={videoRef}
                  onError={() => setMediaError(true)}
                  onLoadedMetadata={() => setMediaError(false)}
                  className="w-full"
                  controls
                  autoPlay={false}
                  playsInline
                  src={videoUrl}
                  style={{ maxHeight: '70vh' }}
                >
                  {t('video_player.browser_no_support')}
                </video>
              </div>
              {mediaError && <div role="alert" className="space-y-3 p-4 text-foreground"><p>{t('tools_stage5.media_error')}</p><Button variant="outline" onClick={() => { setMediaError(false); videoRef.current?.load(); }}>{t('tools_stage5.retry')}</Button></div>}
              {videoProgress && videoProgress.progress > 0 && (
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium" style={{ color: 'rgb(var(--text))' }}>
                      {videoProgress.completed ? t('video_player.completed') : t('video_player.watched_percent', { percent: Math.floor(videoProgress.progress) })}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full transition-all duration-300"
                      style={{
                        width: `${videoProgress.progress}%`,
                        backgroundColor: 'hsl(var(--primary))'
                      }}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bottom Button */}
          <div className="mt-6 text-center">
            <Button
              onClick={handleBack}
              className="px-7 py-6 text-primary-foreground"
              style={{
                borderRadius: '9999px',
                backgroundColor: 'hsl(var(--primary))',
                boxShadow: '0 3px 10px rgba(38, 166, 154, 0.2), 0 1px 3px rgba(0,0,0,0.08)'
              }}
            >
              {t('video_player.back_to_library')}
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
