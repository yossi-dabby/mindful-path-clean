import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import BottomSheetSelect from '@/components/ui/bottom-sheet-select';
import { Label } from '@/components/ui/label';
import { Sparkles, Loader2, RefreshCw, Wind, Anchor, Brain, TrendingUp, Heart, ThumbsUp, ThumbsDown, CheckCircle2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { normalizeExerciseRecommendations } from '@/components/utils/aiDataNormalizer';
import { useTranslation } from 'react-i18next';

const MOOD_VALUES = ['anxious', 'stressed', 'sad', 'overwhelmed', 'angry', 'restless', 'neutral', 'energized'];
const FOCUS_AREA_VALUES = ['reduce_anxiety', 'manage_stress', 'improve_mood', 'better_sleep', 'emotional_regulation', 'focus', 'self_compassion', 'confidence'];

const categoryIcons = {
  breathing: Wind,
  grounding: Anchor,
  cognitive_restructuring: Brain,
  behavioral_activation: TrendingUp,
  mindfulness: Sparkles,
  exposure: Heart
};

const categoryTranslationKeys = {
  breathing: 'breathing',
  grounding: 'grounding',
  cognitive_restructuring: 'cognitive',
  behavioral_activation: 'behavioral',
  mindfulness: 'mindfulness',
  exposure: 'exposure',
  sleep: 'sleep',
  relationships: 'relationships',
  stress_management: 'stress'
};

export default function AiExerciseRecommendations({ exercises, onSelectExercise }) {
  const [recommendations, setRecommendations] = useState(null);
  const [selectedMood, setSelectedMood] = useState('');
  const [selectedGoal, setSelectedGoal] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState({});
  const [isExpanded, setIsExpanded] = useState(true);
  const queryClient = useQueryClient();
  const { t, i18n } = useTranslation();
  const moodOptions = MOOD_VALUES.map((value) => ({
    value,
    label: t(`exercises.recommendations.moods.${value}`)
  }));
  const focusAreaOptions = FOCUS_AREA_VALUES.map((value) => ({
    value,
    label: t(`exercises.recommendations.focus.${value}`)
  }));
  const selectedMoodLabel = moodOptions.find((option) => option.value === selectedMood)?.label || selectedMood;
  const selectedGoalLabel = focusAreaOptions.find((option) => option.value === selectedGoal)?.label || selectedGoal;
  const recommendableExercises = exercises.filter(
    (exercise) => exercise.category !== 'breathing' && exercise.localization_available !== false
  );
  const localizedDifficulty = (difficulty = 'beginner') =>
    t(`exercises.difficulty.${String(difficulty).toLowerCase()}`);
  const localizedCategory = (category) =>
    t(`exercises.categories.${categoryTranslationKeys[category] || 'all'}`);

  // AI prose belongs to the language in which it was generated. Clear only
  // generated output on a language switch so stale copy never mixes locales.
  useEffect(() => {
    setRecommendations(null);
    setFeedbackGiven({});
  }, [i18n.resolvedLanguage, i18n.language]);

  // Fetch user context
  const { data: recentMoods = [] } = useQuery({
    queryKey: ['recentMoods'],
    queryFn: async () => {
      try {
        const moods = await base44.entities.MoodEntry.list('-created_date', 7);
        return moods;
      } catch {
        return [];
      }
    },
    initialData: []
  });

  const { data: activeGoals = [] } = useQuery({
    queryKey: ['activeGoals'],
    queryFn: async () => {
      try {
        return await base44.entities.Goal.filter({ status: 'active' });
      } catch {
        return [];
      }
    },
    initialData: []
  });

  const { data: feedbackHistory = [] } = useQuery({
    queryKey: ['exerciseFeedback'],
    queryFn: async () => {
      try {
        return await base44.entities.ExerciseRecommendationFeedback.list('-created_date', 50);
      } catch {
        return [];
      }
    },
    initialData: []
  });

  // Feedback mutation
  const feedbackMutation = useMutation({
    mutationFn: async ({ exerciseId, feedbackType, reason }) => {
      return await base44.entities.ExerciseRecommendationFeedback.create({
        exercise_id: exerciseId,
        recommendation_reason: reason,
        feedback_type: feedbackType,
        context: {
          mood: selectedMood,
          goal: selectedGoal,
          timestamp: new Date().toISOString()
        }
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['exerciseFeedback'] });
      setFeedbackGiven((prev) => ({ ...prev, [variables.exerciseId]: variables.feedbackType }));
      toast.success(t('exercises.recommendations.feedback_thanks'));
    }
  });

  // Generate recommendations
  const generateMutation = useMutation({
    mutationFn: async () => {
      const favoriteExercises = exercises.filter((e) => e.favorite).map((e) => e.title);
      const completedExercises = exercises.
      filter((e) => e.completed_count > 0).
      sort((a, b) => (b.completed_count || 0) - (a.completed_count || 0)).
      slice(0, 10).
      map((e) => ({
        title: e.title,
        count: e.completed_count,
        difficulty: e.difficulty || 'beginner',
        difficultyLabel: localizedDifficulty(e.difficulty),
        category: e.category
      }));

      // Calculate difficulty progression
      const completedDifficulties = completedExercises.map((e) => e.difficulty);
      const hasCompletedBeginner = completedDifficulties.includes('beginner');
      const hasCompletedIntermediate = completedDifficulties.includes('intermediate');
      const suggestedDifficulty = !hasCompletedBeginner
        ? localizedDifficulty('beginner')
        : !hasCompletedIntermediate
          ? `${localizedDifficulty('intermediate')} / ${localizedDifficulty('beginner')}`
          : `${localizedDifficulty('intermediate')} / ${localizedDifficulty('advanced')}`;

      const recentMoodSummary = recentMoods.length > 0 ?
      `Recent moods (last 7 entries): ${recentMoods.map((m) => `${m.mood_level}/10 — ${moodOptions.find((option) => option.value === m.primary_emotion)?.label || t('exercises.recommendations.moods.neutral')}`).join(', ')}` :
      'No recent mood data';

      const goalsSummary = activeGoals.length > 0 ?
      `Active goals: ${activeGoals.map((g) => g.title).join(', ')}` :
      'No active goals';

      // User feedback analysis
      const helpfulExercises = feedbackHistory.
      filter((f) => f.feedback_type === 'helpful').
      map((f) => f.exercise_id);
      const notRelevantExercises = feedbackHistory.
      filter((f) => f.feedback_type === 'not_relevant').
      map((f) => f.exercise_id);

      const feedbackSummary = feedbackHistory.length > 0 ?
      `User has marked ${helpfulExercises.length} exercises as helpful and ${notRelevantExercises.length} as not relevant. Avoid recommending exercises the user found not relevant.` :
      'No feedback history yet.';

      const availableExercises = recommendableExercises.map((e) => ({
        title: e.title || 'Untitled',
        category: localizedCategory(e.category),
        difficulty: localizedDifficulty(e.difficulty),
        description: e.description || '',
        tags: (e.tags || []).filter((t) => t && typeof t === 'string')
      }));

      const currentContext = selectedMood || selectedGoal ?
      `\n\nCURRENT CONTEXT (HIGH PRIORITY):\n${selectedMood ? `- Current feeling: ${selectedMoodLabel}` : ''}${selectedGoal ? `\n- Current focus: ${selectedGoalLabel}` : ''}\n` :
      '';

      const prompt = `You are a CBT therapy assistant. Based on the user's activity and needs, recommend 3-5 exercises from the available list.
${currentContext}
User History:
- Favorite exercises: ${favoriteExercises.length > 0 ? favoriteExercises.join(', ') : 'None yet'}
- Most completed: ${completedExercises.length > 0 ? completedExercises.map((e) => `${e.title} (${e.count}x, ${e.difficultyLabel})`).join(', ') : 'None yet'}
- ${recentMoodSummary}
- ${goalsSummary}
- ${feedbackSummary}
- Suggested difficulty based on progression: ${suggestedDifficulty}

Available exercises:
${JSON.stringify(availableExercises, null, 2)}

IMPORTANT GUIDELINES:
1. If user specified current mood/goal, prioritize exercises that directly address it
2. Consider difficulty progression - recommend exercises slightly more challenging than what they've mastered
3. Avoid exercises previously marked as "not relevant"
4. Provide specific, personalized reasons
5. Balance variety with proven preferences
6. Return exercise_title EXACTLY as it appears in Available exercises; do not translate, rephrase, add an English name, or add parentheses
7. Keep every user-facing field in the current interface language only; never mix languages

Provide recommendations with:
1. Why this exercise is recommended for this user specifically
2. How it relates to their current state, mood, goals, or progression
3. What benefit they can expect\n\n${t('exercises.recommendations.output_language')}`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            recommendations: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  exercise_title: { type: 'string' },
                  reason: { type: 'string' },
                  benefit: { type: 'string' },
                  priority: { type: 'string', enum: ['high', 'medium', 'low'] }
                }
              }
            }
          }
        }
      });

      const normalized = normalizeExerciseRecommendations(result.recommendations || []);
      return normalized
        .map((recommendation) => {
          const requestedTitle = (recommendation.exercise_title || '').trim().toLocaleLowerCase();
          const matchedExercise = recommendableExercises.find((exercise) => {
            const title = (exercise.title || '').trim().toLocaleLowerCase();
            return title === requestedTitle || title.includes(requestedTitle) || requestedTitle.includes(title);
          });
          return matchedExercise
            ? { ...recommendation, exercise_title: matchedExercise.title }
            : null;
        })
        .filter(Boolean);
    },
    onSuccess: (data) => {
      setRecommendations(data);
    }
  });

  const handleGenerate = () => {
    setFeedbackGiven({});
    setShowFilters(false);
    generateMutation.mutate();
  };

  const handleFeedback = (exerciseId, feedbackType, reason) => {
    feedbackMutation.mutate({ exerciseId, feedbackType, reason });
  };

  const getExerciseByTitle = (title) => {
    return recommendableExercises.find((e) =>
    (e.title || '').toLowerCase() === (title || '').toLowerCase() ||
    (e.title || '').toLowerCase().includes((title || '').toLowerCase())
    );
  };

  if (!isExpanded) {
    return (
      <Card className="exercise-card-art--subtle overflow-hidden rounded-[28px] border border-border/70 shadow-[var(--shadow-sm)]">
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          aria-label={t('exercises.recommendations.show_aria')}
          className="w-full min-h-[64px] px-4 py-3 flex items-center justify-between gap-3 text-start rounded-[var(--radius-card)] hover:bg-secondary/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <span className="flex items-center gap-2 text-primary font-semibold">
            <Sparkles className="w-5 h-5" />
            {t('exercises.recommendations.show')}
          </span>
          <span className="text-sm text-muted-foreground">{t('exercises.recommendations.title')}</span>
        </button>
      </Card>
    );
  }

  return (
    <Card className="exercise-card-art--subtle overflow-hidden rounded-[28px] border border-border/70 shadow-[var(--shadow-md)]">
      <CardHeader className="bg-secondary/35 p-4 sm:p-6 flex flex-col space-y-1.5 border-b border-border/70">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="text-primary lucide lucide-sparkles w-5 h-5" />
            <CardTitle className="text-primary text-xl font-semibold tracking-[-0.012em]">{t('exercises.recommendations.title')}</CardTitle>
          </div>
          <div className="exercise-recommendation-actions flex w-full xl:w-auto flex-wrap gap-2">
            <Button
              onClick={() => setShowFilters(!showFilters)}
              aria-expanded={showFilters}
              disabled={generateMutation.isPending}
              size="sm"
              variant="outline" className="order-2 bg-secondary/70 text-secondary-foreground px-3 text-xs font-medium tracking-[0.005em] rounded-2xl inline-flex items-center justify-center gap-2 whitespace-nowrap transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-border/70 shadow-[var(--shadow-sm)] hover:bg-secondary/92 hover:text-foreground active:bg-secondary/96 h-8 min-h-[44px] md:min-h-0 flex-1 sm:flex-none">


              <Sparkles className="w-4 h-4 sm:mr-2" />
              <span className="inline">{t('exercises.recommendations.customize')}</span>
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={generateMutation.isPending}
              size="sm" className="order-1 bg-primary text-primary-foreground px-3 text-xs font-medium tracking-[0.005em] rounded-2xl inline-flex items-center justify-center gap-2 whitespace-nowrap border border-transparent transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow-[var(--shadow-md)] hover:bg-primary/92 hover:shadow-[var(--shadow-lg)] active:bg-primary/95 h-8 min-h-[44px] md:min-h-0 flex-1 sm:flex-none">


              {generateMutation.isPending ?
              <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  <span>{t('exercises.recommendations.analyzing')}</span>
                </> :

              <>
                  <RefreshCw className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">{recommendations ? t('exercises.recommendations.refresh') : t('exercises.recommendations.get_recommendations')}</span>
                  <span className="sm:hidden">{recommendations ? t('exercises.recommendations.refresh') : t('exercises.recommendations.get')}</span>
                </>
              }
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(false)}
              aria-label={t('exercises.recommendations.close_aria')}
              className="order-3 min-h-[44px] px-3 text-primary hover:bg-secondary/70">
              <X className="w-4 h-4" />
              <span className="sm:hidden">{t('exercises.recommendations.close')}</span>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="bg-card p-4 sm:p-6 overflow-x-hidden">
        {/* Mood/Goal Filters */}
        <AnimatePresence>
          {showFilters &&
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 p-4 bg-secondary/35 rounded-[var(--radius-control)] border border-border/70">

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                <div>
                  <Label className="text-sm font-medium mb-2">{t('exercises.recommendations.feeling_question')}</Label>
                  <BottomSheetSelect
                    value={selectedMood}
                    onValueChange={setSelectedMood}
                    options={moodOptions}
                    placeholder={t('exercises.recommendations.mood_placeholder')}
                    title={t('exercises.recommendations.mood_title')}
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium mb-2">{t('exercises.recommendations.focus_question')}</Label>
                  <BottomSheetSelect
                    value={selectedGoal}
                    onValueChange={setSelectedGoal}
                    options={focusAreaOptions}
                    placeholder={t('exercises.recommendations.focus_placeholder')}
                    title={t('exercises.recommendations.focus_title')}
                  />
                </div>
              </div>
              {(selectedMood || selectedGoal) &&
            <div className="flex items-center gap-2 text-sm text-primary bg-secondary px-3 py-2 rounded-[var(--radius-control)]">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {selectedMood && selectedGoal ?
                t('exercises.recommendations.context_both', { goal: selectedGoalLabel, mood: selectedMoodLabel }) :
                selectedMood ?
                t('exercises.recommendations.context_mood', { mood: selectedMoodLabel }) :
                t('exercises.recommendations.context_goal', { goal: selectedGoalLabel })}
                  </span>
                  <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setSelectedMood('');
                  setSelectedGoal('');
                }}
                className="ml-auto h-6 px-2">

                    {t('exercises.recommendations.clear')}
                  </Button>
                </div>
            }
            </motion.div>
          }
        </AnimatePresence>

        {!recommendations && !generateMutation.isPending &&
        <div className="rounded-2xl border border-border/70 bg-secondary/25 px-4 py-6 text-center">
            <Sparkles className="text-primary mb-3 mx-auto lucide lucide-sparkles w-12 h-12" />
            <p className="text-primary mb-4 text-sm sm:text-base">{t('exercises.recommendations.intro')}</p>
          </div>
        }

        {generateMutation.isPending &&
        <div className="space-y-3">
            {[1, 2, 3].map((i) =>
          <div key={i} className="animate-pulse">
                <div className="h-24 bg-secondary rounded-xl" />
              </div>
          )}
          </div>
        }

        {generateMutation.isError &&
        <div className="text-center py-6">
            <p className="text-muted-foreground font-medium">{t('exercises.recommendations.fetch_error')}</p>
          </div>
        }

        {Array.isArray(recommendations) && recommendations.length > 0 &&
        <div className="space-y-3">
            {recommendations.map((rec, index) => {
            const exercise = getExerciseByTitle(rec.exercise_title);
            const Icon = exercise ? categoryIcons[exercise.category] : Sparkles;
            const priorityColors = {
              high: 'bg-red-100 text-red-700 border-red-300',
              medium: 'bg-yellow-100 text-yellow-700 border-yellow-300',
              low: 'bg-blue-100 text-blue-700 border-blue-300'
            };
            const feedbackKey = exercise ? exercise.id : `${rec.exercise_title}_${index}`;

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}>

                  <Card className="border border-border/80 bg-card transition-all">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-secondary text-primary flex items-center justify-center flex-shrink-0">
                          {Icon && <Icon className="w-5 h-5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h4 className="text-lg font-bold leading-snug text-foreground">
                              {exercise?.title || rec.exercise_title}
                            </h4>
                            <Badge className={`text-xs ${priorityColors[rec.priority] || priorityColors.medium}`}>
                              {t(`exercises.recommendations.priority.${rec.priority || 'medium'}`)}
                            </Badge>
                          </div>
                          {rec.reason ?
                        <div className="mb-3 rounded-lg border-s-4 border-border bg-secondary/70 px-3 py-2">
                              <p className="mb-1 text-xs font-bold uppercase tracking-wide text-primary">
                                {t('exercises.recommendations.reason_label')}
                              </p>
                              <p className="text-sm leading-relaxed text-muted-foreground">{rec.reason}</p>
                            </div> :
                        null}
                          {rec.benefit ?
                        <div className="rounded-lg border border-amber-200 bg-amber-50/85 px-3 py-2">
                              <div className="mb-1 flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-amber-600 flex-shrink-0" />
                                <p className="text-xs font-bold uppercase tracking-wide text-amber-800">
                                  {t('exercises.recommendations.benefit_label')}
                                </p>
                              </div>
                              <p className="text-sm leading-relaxed text-muted-foreground">{rec.benefit}</p>
                            </div> :
                        null}
                          {exercise ?
                        <>
                              <Button
                            size="sm"
                            className="mt-3 w-full bg-purple-600 hover:bg-purple-700"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectExercise(exercise);
                            }}>

                                {t('exercises.recommendations.try_exercise')}
                              </Button>

                              {/* Feedback Buttons */}
                              <div className="mt-2 flex gap-2">
                                <Button
                              size="sm"
                              variant="outline"
                              className={`flex-1 ${feedbackGiven[feedbackKey] === 'helpful' ? 'bg-green-50 border-green-300 text-green-700' : ''}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleFeedback(feedbackKey, 'helpful', rec.reason);
                              }}
                              disabled={!!feedbackGiven[feedbackKey]}>

                                  <ThumbsUp className="w-3 h-3 mr-1" />
                                  {t('exercises.recommendations.helpful')}
                                </Button>
                                <Button
                              size="sm"
                              variant="outline"
                              className={`flex-1 ${feedbackGiven[feedbackKey] === 'not_relevant' ? 'bg-red-50 border-red-300 text-red-700' : ''}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleFeedback(feedbackKey, 'not_relevant', rec.reason);
                              }}
                              disabled={!!feedbackGiven[feedbackKey]}>

                                  <ThumbsDown className="w-3 h-3 mr-1" />
                                  {t('exercises.recommendations.not_relevant')}
                                </Button>
                              </div>
                            </> :

                        <p className="mt-3 text-xs text-gray-400 italic">
                              {t('exercises.recommendations.not_found')}
                            </p>
                        }
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>);

          })}
          </div>
        }

        {Array.isArray(recommendations) && recommendations.length === 0 &&
        <div className="text-center py-6">
            <p className="text-muted-foreground">{t('exercises.recommendations.none')}</p>
          </div>
        }
      </CardContent>
    </Card>);

}
