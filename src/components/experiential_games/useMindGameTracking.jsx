import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { getMindGameMetadata } from './mindGameMetadata';

export function useMindGameTracking() {
  const queryClient = useQueryClient();

  const trackGamePlay = useMutation({
    mutationFn: async ({ 
      game, 
      completed = false, 
      durationSeconds = 0, 
      rating = null,
      difficulty_level = 'beginner',
      success_rate = null,
      attempts = 1
    }) => {
      const metadata = getMindGameMetadata(game.id);
      
      return base44.entities.MindGameActivity.create({
        game_id: game.id,
        game_slug: game.slug,
        game_title: game.title,
        category: metadata.category,
        skill_focus: metadata.skill,
        completed,
        duration_seconds: durationSeconds,
        rating,
        difficulty_level,
        success_rate,
        attempts,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mindGameActivities'] });
    },
  });

  return {
    trackGamePlay: trackGamePlay.mutate,
  };
}
