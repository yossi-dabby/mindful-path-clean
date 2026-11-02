import LibraryPageHeader from '@/components/ui/LibraryPageHeader';
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Plus, List } from 'lucide-react';
import { motion } from 'framer-motion';
import CreatePlaylistModal from '../components/playlists/CreatePlaylistModal';
import AddToPlaylistModal from '../components/playlists/AddToPlaylistModal';
import { useTranslation } from 'react-i18next';
import PullToRefresh from '../components/utils/PullToRefresh';

export default function Videos() {
  const { t } = useTranslation();
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [selectedVideo, setSelectedVideo] = useState(null);

  const { data: videos = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['videos'],
    queryFn: () => base44.entities.Video.list('order', 100)
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
    return allProgress.find((p) => p.video_id === videoId);
  };

  const categories = [...new Set(videos.map(video => video.category).filter(Boolean))];
  const visibleVideos = videos.filter(video => (category === 'all' || video.category === category) && `${video.title || ''} ${video.category || ''}`.toLocaleLowerCase().includes(search.toLocaleLowerCase().trim()));

  return (
    <PullToRefresh queryKeys={['videos', 'allVideoProgress']}>
      <div className="min-h-dvh bg-transparent safe-bottom">
        <div className="page-container max-w-7xl">
        <LibraryPageHeader title={t('videos.title')} subtitle={t('videos.subtitle')}>
          <Button asChild><Link to={createPageUrl('Playlists')}><List className="h-4 w-4" />{t('videos.my_playlists')}</Link></Button>
          <Button variant="outline" onClick={() => setShowCreatePlaylist(true)}><Plus className="h-4 w-4" />{t('videos.new_button')}</Button>
        </LibraryPageHeader>

        <div className="mb-6 flex flex-col gap-3 sm:flex-row">
          <input type="search" value={search} onChange={event => setSearch(event.target.value)} aria-label={t('tools_stage5.search_videos')} placeholder={t('tools_stage5.search_videos')} className="min-h-11 min-w-0 flex-1 rounded-xl border border-border bg-card px-3 text-foreground" />
          <select value={category} onChange={event => setCategory(event.target.value)} aria-label={t('tools_stage5.all_categories')} className="min-h-11 max-w-full rounded-xl border border-border bg-card px-3 text-foreground"><option value="all">{t('tools_stage5.all_categories')}</option>{categories.map(item => <option key={item} value={item}>{item}</option>)}</select>
        </div>
        {isError && <div role="alert" className="garden-surface space-y-4 p-8 text-center"><p>{t('tools_stage5.load_error')}</p><Button onClick={() => refetch()}>{t('tools_stage5.retry')}</Button></div>}
        {/* Loading State */}
        {isLoading &&
          <div className="garden-surface p-8 text-center sm:p-12">
            <p className="text-muted-foreground">{t('videos.loading')}</p>
          </div>
          }

        {/* Empty State */}
        {!isLoading && !isError && videos.length === 0 &&
          <div className="text-center py-12">
            <p className="text-lg mb-2 text-foreground">{t('videos.no_videos_title')}</p>
            <p className="text-muted-foreground">{t('videos.no_videos_description')}</p>
          </div>
          }

        {!isLoading && !isError && videos.length > 0 && visibleVideos.length === 0 && <p role="status" className="garden-surface p-8 text-center">{t('tools_stage5.no_matches')}</p>}
        {/* Video Grid */}
        {!isLoading && !isError && visibleVideos.length > 0 &&
          <div className="grid grid-cols-1 min-[480px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {visibleVideos.map((video, index) =>
            <motion.div
              key={video.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}>
              
                <Card className="border border-border/70 bg-card rounded-[28px] hover:shadow-[var(--shadow-lg)] transition-calm overflow-hidden group flex flex-col h-full">
                  <CardContent className="p-0 flex flex-col" style={{ height: '100%' }}>
                    <Link
                    to={`${createPageUrl('VideoPlayer')}?videoUrl=${encodeURIComponent(video.videoUrl)}&title=${encodeURIComponent(video.title)}&videoId=${video.id}`}>
                    
                      {/* Thumbnail with Play Overlay */}
                      <div className="relative bg-secondary/40" style={{ aspectRatio: '16/10' }}>
                        <img
                        src={video.thumbnailUrl}
                        alt={video.title}
                        className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105" />
                      
                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent group-hover:from-black/40 transition-colors flex items-center justify-center">
                          <div
                          className="w-10 h-10 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform bg-primary"
                          style={{
                            borderRadius: 'var(--r-lg)'
                          }}>
                          
                            <Play className="w-5 h-5 text-primary-foreground fill-current ml-0.5" />
                          </div>
                        </div>
                        {(() => {
                        const progress = getVideoProgress(video.id);
                        return progress && progress.progress > 0 &&
                        <>
                              {progress.completed &&
                          <div className="absolute top-1.5 left-1.5 bg-green-500 text-white px-1.5 py-0.5 rounded-full text-xs font-medium">
                                  ✓
                                </div>
                          }
                              <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20">
                                <div
                              className="h-full transition-all duration-300 bg-green-500"
                              style={{
                                width: `${progress.progress}%`
                              }} />
                            
                              </div>
                            </>;

                      })()}
                        
                        {/* Metadata Badges */}
                        <div className="absolute bottom-1.5 right-1.5 flex gap-1">
                          {video.duration_minutes &&
                        <div className="bg-black/60 backdrop-blur-sm text-white px-1.5 py-0.5 rounded text-xs font-medium">
                              {video.duration_minutes}m
                            </div>
                        }
                          {video.difficulty &&
                        <div className="bg-black/60 backdrop-blur-sm text-white px-1.5 py-0.5 rounded text-xs font-medium capitalize">
                              {video.difficulty.substring(0, 3)}
                            </div>
                        }
                        </div>
                      </div>
                    </Link>

                    {/* Video Info */}
                    <div className="p-3 flex flex-col" style={{ minHeight: '120px' }}>
                      <h3 className="text-foreground mb-1.5 text-sm font-semibold leading-tight line-clamp-2" style={{ minHeight: '2.5rem' }}>
                        {video.title}
                      </h3>
                      {video.category &&
                    <span className="bg-secondary text-primary mb-2 px-2 py-0.5 text-xs font-medium rounded-full border border-border/60 w-fit">
                          {video.category}
                        </span>
                    }
                      <div className="flex-1"></div>
                      <Button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setSelectedVideo(video);
                      }}
                      className="w-full min-h-11 text-xs font-medium text-primary-foreground"
                      style={{
                        backgroundColor: 'hsl(var(--primary))',
                        borderRadius: '8px'
                      }}>
                      
                        <Plus className="w-3.5 h-3.5 mr-1" />
                        {t('videos.add_to_list')}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>
          }

        <CreatePlaylistModal
            isOpen={showCreatePlaylist}
            onClose={() => setShowCreatePlaylist(false)} />
          
        
        <AddToPlaylistModal
            isOpen={!!selectedVideo}
            onClose={() => setSelectedVideo(null)}
            video={selectedVideo} />
          
        </div>
      </div>
    </PullToRefresh>);

}
