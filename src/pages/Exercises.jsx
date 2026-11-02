import LibraryPageHeader from '@/components/ui/LibraryPageHeader';
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Wind, Anchor, Brain, TrendingUp, Sparkles, Heart, Search, Star, Moon, Users, Zap, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { createPageUrl } from '../utils';
import ExerciseDetail from '../components/exercises/ExerciseDetail';
import ExerciseLibrary from '../components/exercises/ExerciseLibrary';
import AiExerciseRecommendations from '../components/exercises/AiExerciseRecommendations';
import AiExerciseCoaching from '../components/exercises/AiExerciseCoaching';
import QuickStartPanel from '../components/exercises/QuickStartPanel';
import InteractiveBreathingTool from '../components/exercises/InteractiveBreathingTool';
import PullToRefresh from '../components/utils/PullToRefresh';
import { mergeExercises, validateExercisesTaxonomy } from '../components/exercises/exercisesData';
import { localizeExerciseCollection } from '../components/exercises/exerciseLocalization';
import { getCurrentAppLocale } from '../components/i18n/appLocale';
import { mergeExerciseProgress } from '../lib/exerciseProgress';

const categoryIcons = {
  breathing: Wind,
  grounding: Anchor,
  cognitive_restructuring: Brain,
  behavioral_activation: TrendingUp,
  mindfulness: Sparkles,
  exposure: Heart,
  sleep: Moon,
  relationships: Users,
  stress_management: Zap
};

const categoryColors = {
  breathing: 'bg-secondary/70 text-primary border border-border',
  grounding: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  cognitive_restructuring: 'bg-cyan-100 text-cyan-700 border border-cyan-200',
  behavioral_activation: 'bg-amber-100 text-amber-700 border border-amber-200',
  mindfulness: 'bg-sky-100 text-sky-700 border border-sky-200',
  exposure: 'bg-rose-100 text-rose-700 border border-rose-200',
  sleep: 'bg-indigo-100 text-indigo-700 border border-indigo-200',
  relationships: 'bg-secondary/70 text-primary border border-border',
  stress_management: 'bg-orange-100 text-orange-700 border border-orange-200'
};

export default function Exercises() {
  const { t, i18n } = useTranslation();
  const appLocale = getCurrentAppLocale(i18n);
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [showCoaching, setShowCoaching] = useState(false);
  const [showBreathingTool, setShowBreathingTool] = useState(false);
  const queryClient = useQueryClient();
  const tabsListRef = useRef(null);
  const categoryScrollerRef = useRef(null);
  const breathingTriggerRef = useRef(null);

  useEffect(() => {
    const tabsList = tabsListRef.current;
    if (!tabsList) return undefined;

    let frameId;
    const keepActiveCategoryVisible = () => {
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(() => {
        const activeTab = tabsList.querySelector('[data-state="active"]');
        const scroller = categoryScrollerRef.current;
        if (!activeTab || !scroller) return;

        const centeredOffset = activeTab.offsetLeft - ((scroller.clientWidth - activeTab.offsetWidth) / 2);
        scroller.scrollTo({ left: Math.max(0, centeredOffset), behavior: 'auto' });
      });
    };

    keepActiveCategoryVisible();
    const resizeTarget = categoryScrollerRef.current;
    const resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(keepActiveCategoryVisible)
      : null;
    if (resizeTarget) resizeObserver?.observe(resizeTarget);
    window.addEventListener('resize', keepActiveCategoryVisible);

    return () => {
      cancelAnimationFrame(frameId);
      resizeObserver?.disconnect();
      window.removeEventListener('resize', keepActiveCategoryVisible);
    };
  }, [selectedCategory, appLocale]);

  const getStoredLocalFavorites = () => {
    try {
      return JSON.parse(localStorage.getItem('local_exercise_favorites') || '{}');
    } catch {
      return {};
    }
  };

  const applyLocalExerciseState = (exerciseList) => {
    const localFavorites = getStoredLocalFavorites();
    return exerciseList.map((exercise) =>
    exercise.id?.startsWith('local-') ?
    { ...exercise, favorite: localFavorites[exercise.id] ?? exercise.favorite ?? false } :
    exercise
    );
  };

  const { data: rawExercises, isLoading } = useQuery({
    queryKey: ['exercises'],
    queryFn: async () => {
      try {
        const [apiExercises, userProgress] = await Promise.all([
          base44.entities.Exercise.list(),
          base44.entities.UserExerciseProgress.list('-updated_date', 500)
        ]);
        return mergeExerciseProgress(
          applyLocalExerciseState(mergeExercises(apiExercises)),
          userProgress
        );
      } catch (error) {
        console.error('Error fetching exercises:', error);
        return applyLocalExerciseState(mergeExercises([]));
      }
    },
    initialData: applyLocalExerciseState(mergeExercises([]))
  });

  const exercises = useMemo(
    () => localizeExerciseCollection(rawExercises, appLocale),
    [rawExercises, appLocale]
  );

  useEffect(() => {
    setSelectedExercise((current) => current ? exercises.find((exercise) => exercise.id === current.id) || current : current);
  }, [exercises]);

  // Dev-only taxonomy validation — runs once after exercises data is ready
  useEffect(() => {
    if (exercises && exercises.length > 0) {
      validateExercisesTaxonomy(exercises);
    }
  }, [exercises]);

  const completeMutation = useMutation({
    mutationFn: async ({ exercise, duration }) => {
      try {
        return await base44.entities.Exercise.update(exercise.id, {
          completed_count: (exercise.completed_count || 0) + 1,
          last_completed: new Date().toISOString(),
          total_time_practiced: (exercise.total_time_practiced || 0) + (duration || 0)
        });
      } catch (error) {
        console.error('Error updating exercise:', error);
        throw error;
      }
    },
    onMutate: async ({ exercise, duration }) => {
      await queryClient.cancelQueries({ queryKey: ['exercises'] });
      const previousExercises = queryClient.getQueryData(['exercises']);
      const previousSelectedExercise = selectedExercise;
      const optimisticExercise = {
        ...exercise,
        completed_count: (exercise.completed_count || 0) + 1,
        last_completed: new Date().toISOString(),
        total_time_practiced: (exercise.total_time_practiced || 0) + (duration || 0)
      };
      queryClient.setQueryData(['exercises'], (current = []) =>
        current.map((item) => item.id === exercise.id ? optimisticExercise : item)
      );
      setSelectedExercise((current) => current?.id === exercise.id ? optimisticExercise : current);
      return { previousExercises, previousSelectedExercise };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousExercises) {
        queryClient.setQueryData(['exercises'], context.previousExercises);
      }
      if (context?.previousSelectedExercise !== undefined) {
        setSelectedExercise(context.previousSelectedExercise);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] });
    }
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: async (exercise) => {
      try {
        return await base44.entities.Exercise.update(exercise.id, {
          favorite: !exercise.favorite
        });
      } catch (error) {
        console.error('Error toggling favorite:', error);
        throw error;
      }
    },
    onMutate: async (exercise) => {
      const previousExercises = queryClient.getQueryData(['exercises']);
      const previousSelectedExercise = selectedExercise;
      queryClient.setQueryData(['exercises'], (current = []) =>
      current.map((item) => item.id === exercise.id ? { ...item, favorite: !item.favorite } : item)
      );
      setSelectedExercise((current) => current?.id === exercise.id ? { ...current, favorite: !current.favorite } : current);
      return { previousExercises, previousSelectedExercise };
    },
    onError: (_error, _exercise, context) => {
      if (context?.previousExercises) {
        queryClient.setQueryData(['exercises'], context.previousExercises);
      }
      if (context?.previousSelectedExercise) {
        setSelectedExercise(context.previousSelectedExercise);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] });
    }
  });

  const filteredExercises = exercises.filter((exercise) => {
    // Breathing exercises are handled by the new Interactive Breathing Tool
    if (exercise.category === 'breathing') return false;
    const matchesCategory = selectedCategory === 'all' || exercise.category === selectedCategory;
    const matchesSearch = !searchQuery ||
    exercise.title && exercise.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    exercise.description && exercise.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    exercise.tags && exercise.tags.some((tag) => tag && typeof tag === 'string' && tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesFavorite = !showFavoritesOnly || exercise.favorite;

    return matchesCategory && matchesSearch && matchesFavorite;
  });

  const categories = [
  { value: 'all', label: t('exercises.categories.all') },
  { value: 'breathing', label: t('exercises.categories.breathing') },
  { value: 'grounding', label: t('exercises.categories.grounding') },
  { value: 'cognitive_restructuring', label: t('exercises.categories.cognitive') },
  { value: 'behavioral_activation', label: t('exercises.categories.behavioral') },
  { value: 'mindfulness', label: t('exercises.categories.mindfulness') },
  { value: 'exposure', label: t('exercises.categories.exposure') },
  { value: 'sleep', label: t('exercises.categories.sleep') },
  { value: 'relationships', label: t('exercises.categories.relationships') },
  { value: 'stress_management', label: t('exercises.categories.stress') }];

  const resetFilters = useCallback(() => {
    setShowFavoritesOnly(false);
    setSearchQuery('');
    setSelectedCategory('all');
  }, []);

  const handleCategoryChange = useCallback((category) => {
    setSelectedCategory(category);
    if (category === 'breathing') {
      // Radix tabs activate on pointer-down, before the browser's default focus.
      // Focus the trigger before mounting the dialog so dismissal restores it.
      breathingTriggerRef.current?.focus({ preventScroll: true });
      setShowFavoritesOnly(false);
      setSearchQuery('');
      setShowBreathingTool(true);
    }
  }, []);

  const closeBreathingTool = useCallback(() => {
    setShowBreathingTool(false);
    setSelectedCategory('all');
  }, []);


  if (isLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center p-4">
        <div className="w-full max-w-2xl text-center space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{t('exercises.loading')}</p>
        </div>
      </div>);

  }

  return (
    <PullToRefresh queryKeys={['exercises']}>
      <div className="min-h-dvh w-full bg-transparent">
        <div className="mx-auto pb-32 p-4 md:p-8 md:pb-24 max-w-6xl w-full">
      <LibraryPageHeader title={t('exercises.page_title')} subtitle={t('exercises.page_subtitle_full')} onBack={() => navigate('/')} backLabel={t('exercises.go_back_aria')}>
        <Button variant="outline" onClick={() => setShowCoaching(true)} className="h-auto whitespace-normal"><Sparkles className="h-4 w-4" />{t('exercises.ai_plan')}</Button>
        <Button variant={showFavoritesOnly ? 'secondary' : 'outline'} aria-pressed={showFavoritesOnly} onClick={() => setShowFavoritesOnly(!showFavoritesOnly)} className="h-auto whitespace-normal"><Star className="h-4 w-4" />{t('exercises.favorites')}{showFavoritesOnly && ` (${exercises.filter((e) => e.favorite).length})`}</Button>
      </LibraryPageHeader>

        {/* Search Bar */}
      <div className="mb-5">
        <div className="relative">
          <Search className="text-primary lucide lucide-search absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 w-5 h-5" />
          <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('exercises.search_placeholder')} className="bg-secondary/70 text-foreground px-8 py-1 font-normal tracking-[0.001em] leading-6 rounded-[var(--radius-control)] flex h-9 w-full border border-input/90 shadow-[var(--shadow-sm)] transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 rtl:pl-3 rtl:pr-10"

                style={{ borderRadius: '28px' }} />

        </div>
      </div>

      {/* Category Filter */}
      <div className="relative mb-7">
        <div
              ref={categoryScrollerRef}
              dir="ltr"
              id="exercises_category_switcher"
              className="overflow-x-auto px-6 lg:px-0"
              style={{ overscrollBehaviorX: 'contain', scrollbarWidth: 'thin' }}>

        {/* Focus restoration must not activate the breathing modal. Keyboard
            users explicitly activate categories with Enter or Space. */}
        <Tabs activationMode="manual" value={selectedCategory} onValueChange={handleCategoryChange}>
          <TabsList ref={tabsListRef} className="inline-flex w-max min-w-full">
            {categories.map((cat) =>
                <TabsTrigger
                  key={cat.value}
                  ref={cat.value === 'breathing' ? breathingTriggerRef : undefined}
                  onKeyDown={cat.value === 'breathing' ? (event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      // Prevent the same key from clicking the newly focused
                      // close button after the dialog opens.
                      event.preventDefault();
                      handleCategoryChange('breathing');
                    }
                  } : undefined}
                  value={cat.value} className="text-primary px-3 py-1 text-sm font-medium tracking-[0.003em] rounded-[calc(var(--radius-control)-2px)] inline-flex items-center justify-center min-h-[44px] md:min-h-0 ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-45 hover:bg-secondary/65 hover:text-foreground data-[state=active]:border data-[state=active]:border-primary/12 data-[state=active]:bg-[hsl(var(--card)/0.96)] data-[state=active]:text-primary data-[state=active]:shadow-[var(--shadow-sm)] whitespace-nowrap">


                {cat.label}
              </TabsTrigger>
                )}
          </TabsList>
        </Tabs>
        </div>
        <div aria-hidden="true" className="pointer-events-none absolute inset-y-1 left-0 z-10 flex w-7 items-center justify-start bg-gradient-to-r from-teal-100 via-teal-100/90 to-transparent lg:hidden">
          <ChevronLeft className="h-4 w-4 text-primary" />
        </div>
        <div aria-hidden="true" className="pointer-events-none absolute inset-y-1 right-0 z-10 flex w-7 items-center justify-end bg-gradient-to-l from-teal-100 via-teal-100/90 to-transparent lg:hidden">
          <ChevronRight className="h-4 w-4 text-primary" />
        </div>
      </div>

      {/* Quick Start Panel */}
      {!showFavoritesOnly && !searchQuery && selectedCategory === 'all' &&
          <QuickStartPanel
            exercises={exercises}
            onSelectExercise={setSelectedExercise} />

          }

      {/* AI Recommendations */}
      {!showFavoritesOnly && !searchQuery && selectedCategory === 'all' &&
          <div className="mb-6">
          <AiExerciseRecommendations
              exercises={exercises}
              onSelectExercise={setSelectedExercise} />

        </div>
          }

      {/* Exercises Grid */}
      {filteredExercises.length === 0 ?
          <Card className="surface-secondary rounded-[var(--radius-card)] border-border/70 shadow-[var(--shadow-md)]">
          <CardContent className="p-12 text-center">
            <div className="bg-primary text-primary-foreground mb-4 mx-auto rounded-full w-20 h-20 flex items-center justify-center shadow-[var(--shadow-sm)]">
              <Sparkles className="w-10 h-10" />
            </div>
            <h2 className="text-foreground mb-2 text-2xl font-semibold">
              {showFavoritesOnly ? t('exercises.empty_state.favorites_title') : t('exercises.empty_state.no_results_title')}
            </h2>
            <p className="text-primary text-lg font-medium">
              {showFavoritesOnly ?
                t('exercises.empty_state.favorites_message') :
                searchQuery ?
                t('exercises.empty_state.search_message') :
                t('exercises.empty_state.no_exercises_message')}
            </p>
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-2.5">
              {(showFavoritesOnly || searchQuery || selectedCategory !== 'all') && (
                <Button variant="outline" onClick={resetFilters} className="w-full sm:w-auto">
                  {t('exercises.categories.all')}
                </Button>
              )}
              <Link to={createPageUrl('Videos')} className="w-full sm:w-auto">
                <Button variant="outline" className="w-full sm:w-auto">
                  {t('quick_actions.video_library.title')}
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card> :

          <ExerciseLibrary
            exercises={filteredExercises}
            categoryIcons={categoryIcons}
            categoryColors={categoryColors}
            onSelectExercise={setSelectedExercise}
            onToggleFavorite={(exercise) => { if (!toggleFavoriteMutation.isPending) toggleFavoriteMutation.mutate(exercise); }} />

          }

        {/* Exercise Detail Modal */}
        {selectedExercise &&
          <ExerciseDetail
            exercise={selectedExercise}
            onClose={() => setSelectedExercise(null)}
            onComplete={(duration) => completeMutation.mutateAsync({ exercise: selectedExercise, duration })}
            favoritePending={toggleFavoriteMutation.isPending}
            favoriteError={toggleFavoriteMutation.isError}
            onToggleFavorite={(exercise) => { if (!toggleFavoriteMutation.isPending) toggleFavoriteMutation.mutate(exercise); }} />

          }

        {/* AI Exercise Coaching */}
        {showCoaching &&
          <AiExerciseCoaching
            exercises={exercises}
            onClose={() => setShowCoaching(false)}
            onSelectExercise={(exercise) => setSelectedExercise(exercise)} />

          }

        {/* Interactive Breathing Tool */}
        {showBreathingTool &&
          <InteractiveBreathingTool
            onClose={closeBreathingTool}
            onComplete={closeBreathingTool} />

          }
        </div>
      </div>
    </PullToRefresh>);

}
