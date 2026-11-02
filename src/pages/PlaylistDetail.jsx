import LibraryPageHeader from '@/components/ui/LibraryPageHeader';
import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

export default function PlaylistDetail() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const playlistId = urlParams.get('id');

  const { data: playlist, isLoading, isError, refetch } = useQuery({
    queryKey: ['playlist', playlistId],
    queryFn: async () => {
      const playlists = await base44.entities.Playlist.filter({ id: playlistId });
      return playlists[0] || null;
    },
    enabled: !!playlistId
  });

  const { data: playlistVideos = [], isLoading: isLinksLoading, isError: isLinksError, refetch: refetchLinks } = useQuery({
    queryKey: ['playlistVideos', playlistId],
    queryFn: () => base44.entities.PlaylistVideo.filter({ playlist_id: playlistId }),
    enabled: !!playlistId
  });

  const { data: videos = [], isLoading: isVideosLoading, isError: isVideosError, refetch: refetchVideos } = useQuery({
    queryKey: ['videos', playlistVideos],
    queryFn: async () => {
      if (playlistVideos.length === 0) return [];
      const allVideos = await base44.entities.Video.list();
      const videoMap = new Map(allVideos.map(v => [v.id, v]));
      return playlistVideos
        .map(pv => videoMap.get(pv.video_id))
        .filter(v => v)
        .sort((a, b) => {
          const posA = playlistVideos.find(pv => pv.video_id === a.id)?.position || 0;
          const posB = playlistVideos.find(pv => pv.video_id === b.id)?.position || 0;
          return posA - posB;
        });
    },
    enabled: playlistVideos.length > 0
  });

  const { data: allProgress = [] } = useQuery({
    queryKey: ['allVideoProgress'],
    queryFn: async () => {
      try {
        return await base44.entities.VideoProgress.list();
      } catch (error) {
        console.error('Error fetching video progress:', error);
        return [];
      }
    },
    initialData: []
  });

  const getVideoProgress = (videoId) => {
    return allProgress.find(p => p.video_id === videoId);
  };

  const removeMutation = useMutation({
    mutationFn: async (videoId) => {
      const link = playlistVideos.find(pv => pv.video_id === videoId);
      if (link) {
        await base44.entities.PlaylistVideo.delete(link.id);
        await base44.entities.Playlist.update(playlistId, {
          video_count: Math.max(0, (playlist.video_count || 0) - 1)
        });
      }
    },
    onMutate: async (videoId) => {
      const playlistKey = ['playlist', playlistId];
      const playlistVideosKey = ['playlistVideos', playlistId];
      await Promise.all([
        queryClient.cancelQueries({ queryKey: playlistKey }),
        queryClient.cancelQueries({ queryKey: playlistVideosKey }),
        queryClient.cancelQueries({ queryKey: ['playlists'] })
      ]);
      const previousPlaylist = queryClient.getQueryData(playlistKey);
      const previousPlaylistVideos = queryClient.getQueryData(playlistVideosKey);
      const previousPlaylists = queryClient.getQueryData(['playlists']);
      queryClient.setQueryData(playlistVideosKey, (current = []) =>
        current.filter((link) => link.video_id !== videoId)
      );
      queryClient.setQueryData(playlistKey, (current) =>
        current ? { ...current, video_count: Math.max(0, (current.video_count || 0) - 1) } : current
      );
      queryClient.setQueryData(['playlists'], (current = []) =>
        current.map((item) =>
          item.id === playlistId
            ? { ...item, video_count: Math.max(0, (item.video_count || 0) - 1) }
            : item
        )
      );
      return { previousPlaylist, previousPlaylistVideos, previousPlaylists, playlistKey, playlistVideosKey };
    },
    onError: (_error, _videoId, context) => {
      if (!context) return;
      queryClient.setQueryData(context.playlistKey, context.previousPlaylist);
      queryClient.setQueryData(context.playlistVideosKey, context.previousPlaylistVideos || []);
      queryClient.setQueryData(['playlists'], context.previousPlaylists || []);
    },
    onSettled: (_data, _error, _videoId, context) => {
      queryClient.invalidateQueries({ queryKey: context?.playlistKey || ['playlist', playlistId] });
      queryClient.invalidateQueries({ queryKey: context?.playlistVideosKey || ['playlistVideos', playlistId] });
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
    }
  });

  if (!playlist) {
    return (
      <div className="min-h-dvh bg-warm-gradient safe-bottom">
        <div className="page-container max-w-7xl">
          <div className="text-center py-12">
            <Card className="mx-auto max-w-xl"><CardContent className="space-y-4 p-8"><p role="status">{t(isError ? 'tools_stage5.load_error' : playlistId && isLoading ? 'playlist_detail.loading' : 'playlist_detail.not_found')}</p>{isError && <Button variant="outline" onClick={() => refetch()}>{t('playlists.retry')}</Button>}<Button onClick={() => navigate(createPageUrl('Playlists'))}>{t('playlist_detail.back_to_playlists')}</Button></CardContent></Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-warm-gradient safe-bottom">
      <div className="page-container max-w-7xl">
        <LibraryPageHeader title={playlist.name} subtitle={playlist.description} onBack={() => navigate(createPageUrl('Playlists'))} backLabel={t('playlist_detail.back_to_playlists')}>
          <span className="text-sm text-primary">{t('playlist_detail.video_count', { count: videos.length })}</span>
        </LibraryPageHeader>

        {(isLinksError || isVideosError || removeMutation.isError) && <div role="alert" className="garden-surface mb-4 space-y-3 p-4 text-foreground"><p>{t('tools_stage5.load_error')}</p>{(isLinksError || isVideosError) && <Button variant="outline" onClick={() => { refetchLinks(); refetchVideos(); }}>{t('tools_stage5.retry')}</Button>}</div>}
        {(isLinksLoading || isVideosLoading) && <p role="status">{t('playlist_detail.loading')}</p>}
        {/* Empty State */}
        {!isLinksLoading && !isVideosLoading && !isLinksError && !isVideosError && videos.length === 0 && (
          <div className="text-center py-12">
            <p className="text-lg mb-2" style={{ color: 'rgb(var(--text))' }}>{t('playlist_detail.no_videos_title')}</p>
            <p style={{ color: 'rgb(var(--theme-muted))' }}>
              {t('playlist_detail.no_videos_description')}
            </p>
            <Button
              onClick={() => navigate(createPageUrl('Videos'))}
              className="mt-4"
              style={{ 
                backgroundColor: 'hsl(var(--primary))',
                color: 'hsl(var(--primary-foreground))'
              }}
            >
              {t('playlist_detail.browse_videos')}
            </Button>
          </div>
        )}

        {/* Video Grid */}
        {videos.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map((video, index) => (
              <motion.div
                key={video.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="group"
              >
                <Card className="overflow-hidden rounded-[28px] border border-border/70 bg-card shadow-[var(--shadow-sm)] transition-calm hover:shadow-[var(--shadow-md)]">
                  <CardContent className="p-0">
                    <Link to={`${createPageUrl('VideoPlayer')}?videoUrl=${encodeURIComponent(video.videoUrl)}&title=${encodeURIComponent(video.title)}&videoId=${video.id}`}>
                      <div className="relative aspect-square overflow-hidden">
                        <img
                          src={video.thumbnailUrl}
                          alt={video.title}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                          <div 
                            className="w-16 h-16 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform"
                            style={{ 
                              borderRadius: 'var(--r-xl)',
                              backgroundColor: 'hsl(var(--primary))'
                            }}
                          >
                            <Play className="w-8 h-8 text-primary-foreground fill-current" />
                          </div>
                        </div>
                        {(() => {
                          const progress = getVideoProgress(video.id);
                          return progress && progress.progress > 0 && (
                            <>
                              {progress.completed && (
                                <div className="absolute top-2 left-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                                  {t('playlist_detail.completed_badge')}
                                </div>
                              )}
                              <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/30">
                                <div 
                                  className="h-full transition-all duration-300"
                                  style={{ 
                                    width: `${progress.progress}%`,
                                    backgroundColor: 'hsl(var(--primary))'
                                  }}
                                />
                              </div>
                            </>
                          );
                        })()}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.preventDefault();
                            if (!removeMutation.isPending) removeMutation.mutate(video.id);
                          }}
                          disabled={removeMutation.isPending}
                          aria-busy={removeMutation.isPending}
                          className="absolute top-2 right-2 bg-[hsl(var(--card)/0.97)] hover:bg-[hsl(var(--card)/0.97)] opacity-100 md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100 group-focus-within:opacity-100 transition-opacity disabled:cursor-wait disabled:opacity-60"
                          aria-label={t('playlist_detail.remove_video_aria')}
                         mobileLabel={t('playlist_detail.remove_video_aria')}>
                          <X className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </Link>
                    <div className="p-4">
                      <h3 className="text-base font-semibold mb-1 line-clamp-2" style={{ color: 'rgb(var(--text))' }}>
                        {video.title}
                      </h3>
                      {video.category && (
                        <p className="text-sm" style={{ color: 'rgb(var(--theme-muted))' }}>
                          {video.category}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
