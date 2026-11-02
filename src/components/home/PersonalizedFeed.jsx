import MobileActionLabel from '@/components/ui/MobileActionLabel';
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Headphones, Dumbbell, ThumbsUp, ThumbsDown, Clock, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';

export default function PersonalizedFeed() {
  const [ratings, setRatings] = useState({});
  const queryClient = useQueryClient();

  // Fetch user data for recommendations
  const { data: recentMoods, isLoading: moodsLoading } = useQuery({
    queryKey: ['recentMoods'],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return await base44.entities.MoodEntry.list('-created_date', 30);
    },
    initialData: []
  });

  const { data: recentJournals, isLoading: journalsLoading } = useQuery({
    queryKey: ['recentJournals'],
    queryFn: () => base44.entities.ThoughtJournal.list('-created_date', 20),
    initialData: []
  });

  const { data: allAudio, isLoading: audioLoading } = useQuery({
    queryKey: ['allAudio'],
    queryFn: () => base44.entities.AudioContent.list(),
    initialData: []
  });

  const { data: allExercises, isLoading: exercisesLoading } = useQuery({
    queryKey: ['allExercises'],
    queryFn: () => base44.entities.Exercise.list(),
    initialData: []
  });

  // Analyze user patterns and generate recommendations
  const recommendations = React.useMemo(() => {
    // Early return for empty data
    if (!allAudio.length && !allExercises.length) {
      return { audio: [], exercises: [], reason: '' };
    }

    if (!recentMoods.length && !recentJournals.length) {
      // Default recommendations for new users - no scoring needed
      return {
        audio: allAudio.slice(0, 2),
        exercises: allExercises.slice(0, 2),
        reason: 'Getting started'
      };
    }

    // Analyze mood patterns
    const moodStats = {
      lowMoodCount: recentMoods.filter(m => ['low', 'very_low'].includes(m.mood)).length,
      anxietyMentions: recentMoods.filter(m => m.emotions?.some(e => e.toLowerCase().includes('anxi'))).length,
      stressMentions: recentMoods.filter(m => m.stress_level >= 7).length
    };

    // Analyze journal patterns
    const cognitiveDistortions = recentJournals.filter(j => j.cognitive_distortions?.length > 0).length;

    // Determine primary need
    let primaryCategories = [];
    let reason = '';

    if (moodStats.lowMoodCount > recentMoods.length * 0.4) {
      primaryCategories.push('behavioral_activation', 'mindfulness');
      reason = 'Based on your recent mood patterns';
    }

    if (moodStats.anxietyMentions > 3 || moodStats.stressMentions > 3) {
      primaryCategories.push('breathing', 'grounding', 'mindfulness');
      reason = reason || 'To help manage anxiety and stress';
    }

    if (cognitiveDistortions > 5) {
      primaryCategories.push('cognitive_restructuring');
      reason = reason || 'Building on your thought work';
    }

    if (!primaryCategories.length) {
      primaryCategories = ['mindfulness', 'breathing'];
      reason = 'Recommended for you';
    }

    // Optimize scoring: only score if we have content
    const scoredAudio = allAudio.length > 0 ? allAudio.map(audio => {
      let score = 0;
      if (primaryCategories.includes(audio.category)) score += 3;
      if (audio.type === 'breathing_guide' && moodStats.anxietyMentions > 2) score += 2;
      if (audio.type === 'soundscape' && moodStats.stressMentions > 2) score += 2;
      if (audio.duration_minutes <= 10) score += 1;
      return { ...audio, score };
    }).sort((a, b) => b.score - a.score).slice(0, 2) : [];

    const scoredExercises = allExercises.length > 0 ? allExercises.map(exercise => {
      let score = 0;
      if (primaryCategories.includes(exercise.category)) score += 3;
      if (exercise.category === 'breathing' && moodStats.anxietyMentions > 2) score += 2;
      if (exercise.category === 'cognitive_restructuring' && cognitiveDistortions > 3) score += 2;
      if (exercise.difficulty === 'beginner') score += 1;
      return { ...exercise, score };
    }).sort((a, b) => b.score - a.score).slice(0, 2) : [];

    return {
      audio: scoredAudio,
      exercises: scoredExercises,
      reason
    };
  }, [recentMoods, recentJournals, allAudio, allExercises]);

  // Rating mutation
  const rateMutation = useMutation({
    mutationFn: async ({ type, id, helpful }) => {
      // Store rating in local state for now
      // In production, you'd save this to track user preferences
      setRatings(prev => ({ ...prev, [`${type}-${id}`]: helpful }));
    }
  });

  const handleRate = (type, id, helpful) => {
    rateMutation.mutate({ type, id, helpful });
  };

  const getRating = (type, id) => ratings[`${type}-${id}`];

  const isLoading = moodsLoading || journalsLoading || audioLoading || exercisesLoading;

  if (isLoading) {
    return (
      <Card className="mb-8 border-0" style={{ 
        borderRadius: 'var(--r-xl)',
        backgroundColor: 'rgb(var(--surface))'
      }}>
        <CardContent className="p-8 text-center">
          <p className="text-sm" style={{ color: 'rgb(var(--theme-muted))' }}>Loading recommendations...</p>
        </CardContent>
      </Card>
    );
  }

  if (!recommendations.audio.length && !recommendations.exercises.length) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
    >
      <Card className="mb-8 border-0 shadow-soft" style={{ 
        borderRadius: 'var(--r-xl)',
        backgroundColor: 'rgb(var(--surface))'
      }}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 icon-default" style={{ color: 'rgb(var(--theme-accent))' }} strokeWidth={2} />
              <CardTitle style={{ color: 'rgb(var(--text))' }}>Recommended for You</CardTitle>
            </div>
            <Badge variant="secondary" className="border-0" style={{ 
              borderRadius: 'var(--r-sm)',
              backgroundColor: 'rgb(var(--theme-accent) / 0.1)',
              color: 'rgb(var(--theme-accent))'
            }}>
              {recommendations.reason}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <AnimatePresence>
            {/* Audio Recommendations */}
            {recommendations.audio.map((audio, index) => (
              <motion.div
                key={`audio-${audio.id}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-4 transition-calm"
                style={{ 
                  borderRadius: 'var(--r-md)',
                  backgroundColor: 'rgb(var(--surface-2))',
                  border: '1px solid rgb(var(--theme-border))'
                }}
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 flex items-center justify-center flex-shrink-0" style={{ 
                    borderRadius: 'var(--r-md)',
                    backgroundColor: 'rgb(var(--calm) / 0.15)'
                  }}>
                    <Headphones className="w-6 h-6 icon-default" style={{ color: 'rgb(var(--calm))' }} strokeWidth={2} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold mb-1" style={{ color: 'rgb(var(--text))' }}>
                      {audio.title}
                    </h3>
                    <p className="text-sm mb-2" style={{ color: 'rgb(var(--theme-muted))' }}>
                      {audio.description}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap mb-3">
                      <Badge variant="outline" className="text-xs" style={{ 
                        borderRadius: 'var(--r-xs)',
                        borderColor: 'rgb(var(--theme-border))'
                      }}>
                        <Clock className="w-3 h-3 mr-1" strokeWidth={2} />
                        {audio.duration_minutes} min
                      </Badge>
                      <Badge variant="outline" className="text-xs capitalize" style={{ 
                        borderRadius: 'var(--r-xs)',
                        borderColor: 'rgb(var(--theme-border))'
                      }}>
                        {audio.category.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link to={createPageUrl('Exercises')}>
                        <Button size="sm" className="transition-calm" style={{ 
                          borderRadius: 'var(--r-sm)',
                          backgroundColor: 'rgb(var(--theme-accent))',
                          color: 'rgb(var(--accent-contrast))'
                        }}>
                          Listen Now
                        </Button>
                      </Link>
                      <div className="flex items-center gap-1 ml-2">
                        <button
                          onClick={() => handleRate('audio', audio.id, true)}
                          className="p-2 transition-calm hover:opacity-70"
                          style={{ 
                            borderRadius: 'var(--r-xs)',
                            backgroundColor: getRating('audio', audio.id) === true ? 'rgb(var(--success) / 0.15)' : 'transparent'
                          }}
                        >
                          <ThumbsUp className="w-4 h-4 icon-default" style={{ 
                            color: getRating('audio', audio.id) === true ? 'rgb(var(--success))' : 'rgb(var(--theme-muted))'
                          }} strokeWidth={2} />
                        <MobileActionLabel action="favorite" /></button>
                        <button
                          onClick={() => handleRate('audio', audio.id, false)}
                          className="p-2 transition-calm hover:opacity-70"
                          style={{ 
                            borderRadius: 'var(--r-xs)',
                            backgroundColor: getRating('audio', audio.id) === false ? 'rgb(var(--danger) / 0.15)' : 'transparent'
                          }}
                        >
                          <ThumbsDown className="w-4 h-4 icon-default" style={{ 
                            color: getRating('audio', audio.id) === false ? 'rgb(var(--danger))' : 'rgb(var(--theme-muted))'
                          }} strokeWidth={2} />
                        <MobileActionLabel action="remove" /></button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}

            {/* Exercise Recommendations */}
            {recommendations.exercises.map((exercise, index) => (
              <motion.div
                key={`exercise-${exercise.id}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: (recommendations.audio.length + index) * 0.1 }}
                className="p-4 transition-calm"
                style={{ 
                  borderRadius: 'var(--r-md)',
                  backgroundColor: 'rgb(var(--surface-2))',
                  border: '1px solid rgb(var(--theme-border))'
                }}
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 flex items-center justify-center flex-shrink-0" style={{ 
                    borderRadius: 'var(--r-md)',
                    backgroundColor: 'rgb(var(--success) / 0.15)'
                  }}>
                    <Dumbbell className="w-6 h-6 icon-default" style={{ color: 'rgb(var(--success))' }} strokeWidth={2} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold mb-1" style={{ color: 'rgb(var(--text))' }}>
                      {exercise.title}
                    </h3>
                    <p className="text-sm mb-2" style={{ color: 'rgb(var(--theme-muted))' }}>
                      {exercise.description}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap mb-3">
                      {exercise.duration_options?.length > 0 && (
                        <Badge variant="outline" className="text-xs" style={{ 
                          borderRadius: 'var(--r-xs)',
                          borderColor: 'rgb(var(--theme-border))'
                        }}>
                          <Clock className="w-3 h-3 mr-1" strokeWidth={2} />
                          {exercise.duration_options[0]} min
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-xs capitalize" style={{ 
                        borderRadius: 'var(--r-xs)',
                        borderColor: 'rgb(var(--theme-border))'
                      }}>
                        {exercise.category.replace('_', ' ')}
                      </Badge>
                      <Badge variant="outline" className="text-xs capitalize" style={{ 
                        borderRadius: 'var(--r-xs)',
                        borderColor: 'rgb(var(--theme-border))'
                      }}>
                        {exercise.difficulty}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link to={createPageUrl('Exercises')}>
                        <Button size="sm" className="transition-calm" style={{ 
                          borderRadius: 'var(--r-sm)',
                          backgroundColor: 'rgb(var(--theme-accent))',
                          color: 'rgb(var(--accent-contrast))'
                        }}>
                          Start Exercise
                        </Button>
                      </Link>
                      <div className="flex items-center gap-1 ml-2">
                        <button
                          onClick={() => handleRate('exercise', exercise.id, true)}
                          className="p-2 transition-calm hover:opacity-70"
                          style={{ 
                            borderRadius: 'var(--r-xs)',
                            backgroundColor: getRating('exercise', exercise.id) === true ? 'rgb(var(--success) / 0.15)' : 'transparent'
                          }}
                        >
                          <ThumbsUp className="w-4 h-4 icon-default" style={{ 
                            color: getRating('exercise', exercise.id) === true ? 'rgb(var(--success))' : 'rgb(var(--theme-muted))'
                          }} strokeWidth={2} />
                        <MobileActionLabel action="favorite" /></button>
                        <button
                          onClick={() => handleRate('exercise', exercise.id, false)}
                          className="p-2 transition-calm hover:opacity-70"
                          style={{ 
                            borderRadius: 'var(--r-xs)',
                            backgroundColor: getRating('exercise', exercise.id) === false ? 'rgb(var(--danger) / 0.15)' : 'transparent'
                          }}
                        >
                          <ThumbsDown className="w-4 h-4 icon-default" style={{ 
                            color: getRating('exercise', exercise.id) === false ? 'rgb(var(--danger))' : 'rgb(var(--theme-muted))'
                          }} strokeWidth={2} />
                        <MobileActionLabel action="remove" /></button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
}