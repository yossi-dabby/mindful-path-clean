import { useTranslation } from 'react-i18next';
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Plus, Check, List } from 'lucide-react';
import { motion } from 'framer-motion';
import CreatePlaylistModal from './CreatePlaylistModal';

export default function AddToPlaylistModal({ isOpen, onClose, video }) {
  const { t } = useTranslation();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const queryClient = useQueryClient();

  const { data: playlists = [], isLoading: isPlaylistsLoading, isError: isPlaylistsError, refetch: refetchPlaylists } = useQuery({
    queryKey: ['playlists'],
    queryFn: () => base44.entities.Playlist.list('-created_date'),
    enabled: isOpen
  });

  const { data: playlistVideos = [], isLoading: isLinksLoading, isError: isLinksError, refetch: refetchLinks } = useQuery({
    queryKey: ['playlistVideos', video?.id],
    queryFn: () => base44.entities.PlaylistVideo.filter({ video_id: video.id }),
    enabled: isOpen && !!video
  });

  const addMutation = useMutation({
    mutationFn: async ({ playlistId }) => {
      const existingVideos = await base44.entities.PlaylistVideo.filter({ playlist_id: playlistId });
      const position = existingVideos.length + 1;

      await base44.entities.PlaylistVideo.create({
        playlist_id: playlistId,
        video_id: video.id,
        position
      });

      const playlist = playlists.find(p => p.id === playlistId);
      await base44.entities.Playlist.update(playlistId, {
        video_count: (playlist?.video_count || 0) + 1
      });
    },
    onMutate: async ({ playlistId }) => {
      const playlistVideosKey = ['playlistVideos', video?.id];
      await Promise.all([
        queryClient.cancelQueries({ queryKey: ['playlists'] }),
        queryClient.cancelQueries({ queryKey: playlistVideosKey })
      ]);
      const previousPlaylists = queryClient.getQueryData(['playlists']);
      const previousPlaylistVideos = queryClient.getQueryData(playlistVideosKey);
      const optimisticLink = {
        id: `optimistic-${playlistId}-${Date.now()}`,
        playlist_id: playlistId,
        video_id: video.id,
        position: 0
      };
      queryClient.setQueryData(playlistVideosKey, (current = []) => [...current, optimisticLink]);
      queryClient.setQueryData(['playlists'], (current = []) =>
        current.map((playlist) =>
          playlist.id === playlistId
            ? { ...playlist, video_count: (playlist.video_count || 0) + 1 }
            : playlist
        )
      );
      return { previousPlaylists, previousPlaylistVideos, playlistVideosKey };
    },
    onError: (_error, _variables, context) => {
      if (!context) return;
      queryClient.setQueryData(['playlists'], context.previousPlaylists || []);
      queryClient.setQueryData(context.playlistVideosKey, context.previousPlaylistVideos || []);
    },
    onSettled: (_data, _error, _variables, context) => {
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
      queryClient.invalidateQueries({ queryKey: context?.playlistVideosKey || ['playlistVideos', video?.id] });
    }
  });

  const removeMutation = useMutation({
    mutationFn: async ({ playlistId }) => {
      const link = playlistVideos.find(pv => pv.playlist_id === playlistId);
      if (link) {
        await base44.entities.PlaylistVideo.delete(link.id);
        const playlist = playlists.find(p => p.id === playlistId);
        await base44.entities.Playlist.update(playlistId, {
          video_count: Math.max(0, (playlist?.video_count || 0) - 1)
        });
      }
    },
    onMutate: async ({ playlistId }) => {
      const playlistVideosKey = ['playlistVideos', video?.id];
      await Promise.all([
        queryClient.cancelQueries({ queryKey: ['playlists'] }),
        queryClient.cancelQueries({ queryKey: playlistVideosKey })
      ]);
      const previousPlaylists = queryClient.getQueryData(['playlists']);
      const previousPlaylistVideos = queryClient.getQueryData(playlistVideosKey);
      queryClient.setQueryData(playlistVideosKey, (current = []) =>
        current.filter((link) => link.playlist_id !== playlistId)
      );
      queryClient.setQueryData(['playlists'], (current = []) =>
        current.map((playlist) =>
          playlist.id === playlistId
            ? { ...playlist, video_count: Math.max(0, (playlist.video_count || 0) - 1) }
            : playlist
        )
      );
      return { previousPlaylists, previousPlaylistVideos, playlistVideosKey };
    },
    onError: (_error, _variables, context) => {
      if (!context) return;
      queryClient.setQueryData(['playlists'], context.previousPlaylists || []);
      queryClient.setQueryData(context.playlistVideosKey, context.previousPlaylistVideos || []);
    },
    onSettled: (_data, _error, _variables, context) => {
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
      queryClient.invalidateQueries({ queryKey: context?.playlistVideosKey || ['playlistVideos', video?.id] });
    }
  });

  const isVideoInPlaylist = (playlistId) => {
    return playlistVideos.some(pv => pv.playlist_id === playlistId);
  };

  const playlistChangePending = addMutation.isPending || removeMutation.isPending;

  const togglePlaylist = (playlistId) => {
    if (playlistChangePending || isLinksLoading || isLinksError) return;
    if (isVideoInPlaylist(playlistId)) {
      removeMutation.mutate({ playlistId });
    } else {
      addMutation.mutate({ playlistId });
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto rounded-[28px] border-border bg-card text-foreground sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('home_practice.media.add_title')}</DialogTitle>
            <p className="text-sm mt-1" style={{ color: 'rgb(var(--theme-muted))' }}>{video?.title}</p>
          </DialogHeader>
          <div className="mt-4 space-y-2">
            {(isPlaylistsLoading || isLinksLoading) && <p role="status">{t('playlists.loading')}</p>}
            {(isPlaylistsError || isLinksError || addMutation.isError || removeMutation.isError) && <div role="alert" className="space-y-3 p-3 text-foreground"><p>{t('tools_stage5.load_error')}</p>{(isPlaylistsError || isLinksError) && <Button variant="outline" onClick={() => { refetchPlaylists(); refetchLinks(); }}>{t('tools_stage5.retry')}</Button>}</div>}
            {!isPlaylistsLoading && !isPlaylistsError && playlists.length === 0 ? (
              <div className="text-center py-8">
                <List className="w-12 h-12 mx-auto mb-3" style={{ color: 'rgb(var(--theme-muted))' }} />
                <p className="text-base font-medium mb-2" style={{ color: 'rgb(var(--text))' }}>
                  {t('playlists.no_playlists_title')}
                </p>
                <p className="text-sm mb-6" style={{ color: 'rgb(var(--theme-muted))' }}>
                  {t('playlists.no_playlists_description')}
                </p>
                <div className="flex gap-2 justify-center">
                  <Button 
                    type="button"
                    onClick={() => setShowCreateModal(true)}
                    style={{ 
                      backgroundColor: 'hsl(var(--primary))',
                      color: 'hsl(var(--primary-foreground))'
                    }}
                   mobileLabelKey="add">
                    <Plus className="w-4 h-4 mr-2" />
                    {t('home_practice.media.create_title')}
                  </Button>
                  <Button type="button" variant="outline" onClick={onClose}>
                    {t('common.close')}
                  </Button>
                </div>
              </div>
            ) : (
            playlists.map((playlist) => {
              const inPlaylist = isVideoInPlaylist(playlist.id);
              return (
                <motion.button
                  key={playlist.id}
                  type="button"
                  onClick={() => togglePlaylist(playlist.id)}
                  disabled={playlistChangePending || isLinksLoading || isLinksError}
                  aria-busy={playlistChangePending || isLinksLoading}
                  aria-pressed={inPlaylist}
                  className="w-full p-3 flex items-center justify-between transition-all disabled:cursor-wait disabled:opacity-70"
                  style={{ 
                    borderRadius: 'var(--r-md)', 
                    border: inPlaylist ? '2px solid hsl(var(--primary))' : '1px solid rgb(var(--theme-border))',
                    backgroundColor: inPlaylist ? 'hsl(var(--secondary))' : 'hsl(var(--card))'
                  }}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="min-w-0 text-start">
                    <p className="break-words text-sm font-medium" style={{ color: inPlaylist ? 'hsl(var(--primary))' : 'rgb(var(--text))' }}>
                      {playlist.name}
                    </p>
                    <p className="text-xs" style={{ color: 'rgb(var(--theme-muted))' }}>
                      {t('playlists.video_count', { count: playlist.video_count || 0 })}
                    </p>
                  </div>
                  {inPlaylist ? (
                    <Check className="w-5 h-5" style={{ color: 'hsl(var(--primary))' }} />
                  ) : (
                    <Plus className="w-5 h-5" style={{ color: 'rgb(var(--theme-muted))' }} />
                  )}
                </motion.button>
              );
            })
            )}
            </div>
            <div className="flex justify-end mt-4">
            <Button type="button" onClick={onClose}>{t('common.close')}</Button>
            </div>
            </DialogContent>
            </Dialog>

            <CreatePlaylistModal 
            isOpen={showCreateModal} 
            onClose={() => setShowCreateModal(false)} 
            />
            </>
            );
            }