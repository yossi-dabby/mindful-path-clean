import { useTranslation } from 'react-i18next';
import React, { useState, useId } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export default function CreatePlaylistModal({ isOpen, onClose }) {
  const { t } = useTranslation();
  const formId = useId();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: ({ playlistName, playlistDescription }) =>
      base44.entities.Playlist.create({
        name: playlistName,
        description: playlistDescription,
        video_count: 0
      }),
    onMutate: async ({ playlistName, playlistDescription }) => {
      await queryClient.cancelQueries({ queryKey: ['playlists'] });
      const previous = queryClient.getQueryData(['playlists']);
      const optimisticId = `optimistic-playlist-${Date.now()}`;
      queryClient.setQueryData(['playlists'], (current = []) => [
        {
          id: optimisticId,
          name: playlistName,
          description: playlistDescription,
          video_count: 0,
          created_date: new Date().toISOString()
        },
        ...current
      ]);
      return { previous, optimisticId };
    },
    onError: (_error, _variables, context) => {
      if (context) queryClient.setQueryData(['playlists'], context.previous || []);
    },
    onSuccess: (createdPlaylist, _variables, context) => {
      queryClient.setQueryData(['playlists'], (current = []) => [
        createdPlaylist,
        ...current.filter((playlist) => playlist.id !== context?.optimisticId)
      ]);
      setName('');
      setDescription('');
      onClose();
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['playlists'] })
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name.trim() && !createMutation.isPending) {
      createMutation.mutate({
        playlistName: name.trim(),
        playlistDescription: description.trim()
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto rounded-[28px] border-border bg-card text-foreground sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('home_practice.media.create_title')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <label htmlFor={`${formId}-name`} className="mb-2 block text-sm font-medium">
              {t('home_practice.media.name')} *
            </label>
            <Input
              id={`${formId}-name`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('home_practice.media.name_example')}
              required
            />
          </div>
          <div>
            <label htmlFor={`${formId}-description`} className="mb-2 block text-sm font-medium">
              {t('home_practice.media.description')}
            </label>
            <Textarea
              id={`${formId}-description`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('home_practice.media.description_example')}
              rows={3}
            />
          </div>
          {createMutation.isError && <p role="alert" className="rounded-xl border border-destructive/40 bg-card p-3 text-sm text-foreground">{t('tools_stage5.playlist_save_error')}</p>}
          <div className="flex flex-wrap justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button 
              type="submit" 
              disabled={!name.trim() || createMutation.isPending}
              style={{ 
                backgroundColor: 'hsl(var(--primary))',
                color: 'hsl(var(--primary-foreground))'
              }}
            >
              {t(createMutation.isPending ? 'home_practice.media.creating' : 'home_practice.media.create_title')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}