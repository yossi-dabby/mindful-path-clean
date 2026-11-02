import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

/**
 * Calculate suggested difficulty based on recent performance
 * Returns: 'beginner', 'intermediate', or 'advanced'
 */
function calculateDifficulty(activities) {
  if (!activities || activities.length < 3) {
    return 'beginner'; // Default for new users
  }

  // Calculate average success rate for last 5 plays
  const recentPlays = activities.slice(0, 5);
  const playsWithSuccess = recentPlays.filter(p => p.success_rate !== null && p.success_rate !== undefined);
  
  if (playsWithSuccess.length === 0) return 'beginner';

  const avgSuccess = playsWithSuccess.reduce((sum, p) => sum + p.success_rate, 0) / playsWithSuccess.length;

  // Thresholds for difficulty progression
  if (avgSuccess >= 85) return 'advanced';      // Consistently high performance
  if (avgSuccess >= 70) return 'intermediate';  // Good performance
  return 'beginner';                            // Struggling or learning
}

/**
 * Hook to get adaptive difficulty for a specific game
 */
export function useAdaptiveDifficulty(gameId) {
  const { data: activities = [] } = useQuery({
    queryKey: ['mindGameActivities', gameId],
    queryFn: async () => {
      const allActivities = await base44.entities.MindGameActivity.list('-created_date', 20);
      return allActivities.filter(a => a.game_id === gameId);
    },
    initialData: [],
  });

  const suggestedDifficulty = calculateDifficulty(activities);
  const recentPerformance = activities.slice(0, 3);

  return {
    suggestedDifficulty,
    recentPerformance,
    totalPlays: activities.length,
  };
}