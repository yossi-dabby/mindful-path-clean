import LibraryPageHeader from '@/components/ui/LibraryPageHeader';
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { isAuthError, shouldShowAuthError } from '../components/utils/authErrorHandler';
import AuthErrorBanner from '../components/utils/AuthErrorBanner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, List, Trash2, Dumbbell } from 'lucide-react';
import { motion } from 'framer-motion';
import CreatePlaylistModal from '../components/playlists/CreatePlaylistModal';
import { useTranslation } from 'react-i18next';
import PullToRefresh from '../components/utils/PullToRefresh';

export default function Playlists() {
  const { t } = useTranslation();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAuthError, setShowAuthError] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: playlists = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['playlists'],
    queryFn: () => base44.entities.Playlist.list('-created_date'),
    refetchOnWindowFocus: true
  });

  const deleteMutation = useMutation({
    mutationFn: async (playlistId) => {
      const links = await base44.entities.PlaylistVideo.filter({ playlist_id: playlistId });
      await Promise.all(links.map(link => base44.entities.PlaylistVideo.delete(link.id)));
      await base44.entities.Playlist.delete(playlistId);
    },
    onMutate: async (playlistId) => {
      await queryClient.cancelQueries({ queryKey: ['playlists'] });
      const previous = queryClient.getQueryData(['playlists']);
      queryClient.setQueryData(['playlists'], (old = []) =>
        old.filter(p => p.id !== playlistId)
      );
      return { previous };
    },
    onError: (error, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(['playlists'], ctx.previous);
      if (isAuthError(error) && shouldShowAuthError()) {
        setShowAuthError(true);
      } else {
        alert(t('playlists.delete_error'));
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['playlists'] })
  });

  return (
    <>
      {showAuthError && <AuthErrorBanner onDismiss={() => setShowAuthError(false)} />}
      <PullToRefresh queryKeys={['playlists']}>
        <div className="min-h-dvh safe-bottom">
          <div className="page-container max-w-7xl">
        <LibraryPageHeader title={t('playlists.title')} subtitle={t('playlists.subtitle')} onBack={() => navigate(createPageUrl('Videos'))} backLabel={t('playlists.back_to_videos')}>
          <Button onClick={() => setShowCreateModal(true)}><Plus className="h-4 w-4" />{t('playlists.new_playlist')}</Button>
        </LibraryPageHeader>

        {/* Error State */}
        {isError && (
          <Card className="mx-auto max-w-2xl rounded-[28px] border border-destructive/40 bg-card shadow-[var(--shadow-md)]">
            <CardContent className="p-10 md:p-12 text-center">
              <div className="w-20 h-20 flex items-center justify-center mx-auto mb-4" style={{
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.1)'
              }}>
                <List className="w-10 h-10 text-red-500" />
              </div>
              <h2 className="text-2xl font-semibold mb-2 text-foreground">{t('playlists.error_title')}</h2>
              <p className="mb-6 text-muted-foreground">{t('playlists.error_description')}</p>
              <div className="flex justify-center">
                <Button
                  onClick={() => refetch()}
                  className="text-primary-foreground px-8 py-6"
                  style={{
                    borderRadius: '24px',
                    backgroundColor: 'hsl(var(--primary))',
                    boxShadow: '0 4px 12px rgba(38, 166, 154, 0.3)'
                  }}
                >
                  {t('playlists.retry')}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {!isError && isLoading && (
          <div className="py-12">
            <div className="mx-auto max-w-2xl text-center space-y-2">
              <p className="text-sm font-medium" style={{ color: 'rgb(var(--theme-muted))' }}>{t('playlists.loading')}</p>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isError && !isLoading && playlists.length === 0 && (
          <div className="garden-surface p-6 sm:p-10">
            <div className="mx-auto max-w-2xl text-center">
              <List className="w-16 h-16 mx-auto mb-4" style={{ color: 'rgb(var(--theme-muted))' }} />
              <p className="text-lg mb-2" style={{ color: 'rgb(var(--text))' }}>{t('playlists.no_playlists_title')}</p>
              <p className="mb-6" style={{ color: 'rgb(var(--theme-muted))' }}>
                {t('playlists.no_playlists_description')}
              </p>
            </div>
            <div className="flex max-w-md mx-auto flex-col sm:flex-row items-center justify-center gap-2.5">
              <Button
                onClick={() => setShowCreateModal(true)}
                className="w-full sm:w-auto"
                style={{ 
                  backgroundColor: 'hsl(var(--primary))',
                  color: 'hsl(var(--primary-foreground))'
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                {t('playlists.create_playlist')}
              </Button>
              <Link to={createPageUrl('Videos')} className="w-full sm:w-auto">
                <Button variant="outline" className="w-full sm:w-auto">
                  {t('playlist_detail.browse_videos')}
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Playlist Grid */}
        {!isError && !isLoading && playlists.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
              {playlists.map((playlist, index) => (
                <motion.div
                  key={playlist.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <Card className="rounded-[28px] border border-border/70 bg-card shadow-[var(--shadow-sm)] transition-calm hover:shadow-[var(--shadow-md)] group">
                    <CardContent className="p-5 h-full flex flex-col">
                      <div className="flex-1">
                        <h3 className="mb-1.5 break-words text-lg font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
                          {playlist.name}
                        </h3>
                        {playlist.description && (
                          <p className="mb-3 break-words text-sm line-clamp-2" style={{ color: 'hsl(var(--muted-foreground))' }}>
                            {playlist.description}
                          </p>
                        )}
                        <div className="inline-flex items-center gap-1.5 text-xs font-medium" style={{ color: 'hsl(var(--primary))' }}>
                          <List className="w-3.5 h-3.5" />
                          {t('playlists.video_count', { count: playlist.video_count || 0 })}
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-border/60 flex items-center gap-2">
                        <Link to={`${createPageUrl('PlaylistDetail')}?id=${playlist.id}`} className="flex-1">
                          <Button
                            className="w-full px-4 h-9 text-sm"
                            variant="outline"
                            style={{ borderRadius: '9999px' }}
                          >
                            {t('playlists.view_playlist')}
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.preventDefault();
                            if (deleteMutation.isPending) return;
                            if (confirm(t('playlists.delete_confirm'))) {
                              deleteMutation.mutate(playlist.id);
                            }
                          }}
                          disabled={deleteMutation.isPending}
                          aria-label={t('playlists.delete_aria')}
                          className="shrink-0 transition-colors hover:bg-destructive/10"
                         mobileLabelKey="delete">
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            <Card className="mt-6 border border-border/70 shadow-[var(--shadow-sm)]">
              <CardContent className="p-4 md:p-5">
                <div className="flex flex-wrap gap-2.5">
                  <Link to={createPageUrl('Videos')}>
                    <Button variant="outline">
                      {t('playlist_detail.browse_videos')}
                    </Button>
                  </Link>
                  <Link to={createPageUrl('Exercises')}>
                    <Button variant="outline">
                      <Dumbbell className="w-4 h-4 mr-1" />
                      {t('quick_actions.exercises_library.title')}
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        <CreatePlaylistModal 
          isOpen={showCreateModal} 
          onClose={() => setShowCreateModal(false)} 
        />
          </div>
        </div>
      </PullToRefresh>
    </>
  );
}
