import BotanicalAccent from '@/components/brand/BotanicalAccent';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Play, CheckCircle, Clock, BookOpen, Lightbulb, Star, Video, Heart, Headphones, Eye } from 'lucide-react';
import BreathingVisual from '../components/exercises/BreathingVisual';
import AudioPlayer from '../components/audio/AudioPlayer';
import { motion } from 'framer-motion';
import PremiumBadge from '../components/subscription/PremiumBadge';
import ExerciseMediaBadge from '../components/exercises/ExerciseMediaBadge';

export default function ExerciseViewPage() {
  const { t, i18n } = useTranslation();
  const { exerciseId: pathId } = useParams();
  const [searchParams] = useSearchParams();
  const exerciseId = pathId || searchParams.get('id') || searchParams.get('exerciseId');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [completed, setCompleted] = useState(false);
  const [showBreathingVisual, setShowBreathingVisual] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  const { data: exercise, isLoading, isError, refetch } = useQuery({
    queryKey: ['exercise', exerciseId],
    enabled: !!exerciseId,
    queryFn: async () => {
      const exercises = await base44.entities.Exercise.filter({ id: exerciseId });
      return exercises[0] || null;
    }
  });

  const { data: audioContent } = useQuery({
    queryKey: ['audioContent', exerciseId],
    queryFn: () => base44.entities.AudioContent.filter({ linked_exercise_id: exerciseId }),
    initialData: [],
    enabled: !!exerciseId
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.Exercise.update(exerciseId, {
        favorite: !exercise.favorite
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercise', exerciseId] });
    }
  });

  const completeExerciseMutation = useMutation({
    mutationFn: async () => {
      const now = new Date().toISOString();
      await base44.entities.Exercise.update(exerciseId, {
        completed_count: (exercise.completed_count || 0) + 1,
        total_time_practiced: (exercise.total_time_practiced || 0) + (exercise.duration_minutes || 5),
        last_completed: now
      });
    },
    onSuccess: () => {
      setCompleted(true);
      queryClient.invalidateQueries({ queryKey: ['exercise', exerciseId] });
      setTimeout(() => {
        navigate(-1);
      }, 2000);
    }
  });

  const handleStartBreathing = (duration) => {
    setSelectedDuration(duration);
    setShowBreathingVisual(true);
  };

  const handleBreathingComplete = () => {
    completeExerciseMutation.mutate();
  };

  if (exerciseId && isLoading) {
    return (
      <div className="page-container flex min-h-[60dvh] items-center justify-center">
        <p className="text-muted-foreground">{t('tools_stage5.loading_exercise')}</p>
      </div>
    );
  }

  if (isError) {
    return <div className="page-container flex min-h-[60dvh] items-center justify-center"><div role="alert" className="garden-surface w-full max-w-xl p-8 text-center space-y-4"><p>{t('tools_stage5.load_error')}</p><Button onClick={() => refetch()}>{t('tools_stage5.retry')}</Button><Button variant="outline" onClick={() => navigate(-1)}>{t('exercise_view.go_back')}</Button></div></div>;
  }

  if (!exercise) {
    return (
      <div className="page-container flex min-h-[60dvh] items-center justify-center">
        <div className="garden-surface w-full max-w-xl p-8 text-center">
          <h1 className="mb-4 text-xl font-semibold text-foreground">{t('exercise_view.not_found')}</h1>
          <Button onClick={() => navigate(-1)}>{t('exercise_view.go_back')}</Button>
        </div>
      </div>
    );
  }

  if (showBreathingVisual && exercise.category === 'breathing') {
    return (
      <BreathingVisual
        exercise={exercise}
        duration={selectedDuration}
        onClose={() => setShowBreathingVisual(false)}
        onComplete={handleBreathingComplete}
      />
    );
  }

  return (
    <div className="min-h-dvh pb-24">
      {/* Header */}
      <div className="bg-card/95 border-b border-border shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto p-4">
          <div className="flex min-w-0 flex-wrap items-start gap-3">
            <Button variant="ghost" size="icon" className="shrink-0" onClick={() => navigate(-1)} aria-label={t('exercise_view.go_back_aria')}>
              <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
            </Button>
            <div className="order-3 min-w-0 basis-full lg:order-none lg:basis-auto lg:flex-1">
              <div className="botanical-title-row"><h1 className="min-w-0 break-words text-lg sm:text-xl font-semibold text-foreground">{exercise.title || t('exercise_view.untitled')}</h1><BotanicalAccent variant="leaves" className="botanical-title-art hidden sm:block" /></div>
            </div>
            <button
              onClick={() => toggleFavoriteMutation.mutate()}
              disabled={toggleFavoriteMutation.isPending}
              aria-pressed={!!exercise.favorite}
              className="ms-auto lg:ms-0 shrink-0 min-h-11 min-w-11 p-2 rounded-full hover:bg-secondary transition-colors"
              aria-label={t(exercise.favorite ? 'tools_stage5.remove_favorite' : 'tools_stage5.add_favorite')}
            >
              <Heart
                className={`w-5 h-5 ${exercise.favorite ? 'fill-red-500 text-red-500' : 'text-gray-400'}`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-4 md:p-6">
        {(toggleFavoriteMutation.isError || completeExerciseMutation.isError) && <p role="alert" className="mb-4 rounded-xl border border-destructive/40 bg-card p-3 text-foreground">{t('tools_stage5.load_error')}</p>}
        <div className="mb-4 flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="capitalize">
            {t('tools_stage5.' + (exercise.difficulty || 'beginner'))}
          </Badge>
          {exercise.difficulty === 'advanced' && <PremiumBadge />}
          <ExerciseMediaBadge mediaType={exercise.media_type} size="md" />
          {exercise.duration_options?.length > 0 ? (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {t('tools_stage5.duration_options', { values: exercise.duration_options.join(', ') })}
            </Badge>
          ) : exercise.duration_minutes && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {t('tools_stage5.minutes', { count: exercise.duration_minutes })}
            </Badge>
          )}
          {exercise.video_url && (
            <Badge className="flex items-center gap-1 bg-purple-100 text-purple-700">
              <Video className="w-3 h-3" />
              {t('tools_stage5.video')}
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] gap-6">
          {/* Main Content */}
          <div className="min-w-0 flex flex-col space-y-4 [overflow-wrap:anywhere]">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList className="flex h-auto w-full flex-wrap gap-1">
                <TabsTrigger value="overview" className="min-h-11 min-w-0 flex-1 basis-[30%] sm:basis-auto text-foreground data-[state=active]:text-foreground whitespace-normal px-2 gap-1 text-sm">
                  <BookOpen className="w-4 h-4 shrink-0" />
                  {t('exercise_view.tabs.overview')}
                </TabsTrigger>
                <TabsTrigger value="instructions" className="min-h-11 min-w-0 flex-1 basis-[30%] sm:basis-auto text-foreground data-[state=active]:text-foreground whitespace-normal px-2 gap-1 text-sm">
                  <Play className="w-4 h-4 shrink-0" />
                  {t('exercise_view.tabs.practice')}
                </TabsTrigger>
                {audioContent.length > 0 && (
                  <TabsTrigger value="audio" className="min-h-11 min-w-0 flex-1 basis-[30%] sm:basis-auto text-foreground data-[state=active]:text-foreground whitespace-normal px-2 gap-1 text-sm">
                    <Headphones className="w-4 h-4 shrink-0" />
                    {t('exercise_view.tabs.audio')}
                  </TabsTrigger>
                )}
                <TabsTrigger value="benefits" className="min-h-11 min-w-0 flex-1 basis-[30%] sm:basis-auto text-foreground data-[state=active]:text-foreground whitespace-normal px-2 gap-1 text-sm">
                  <Star className="w-4 h-4 shrink-0" />
                  {t('exercise_view.tabs.benefits')}
                </TabsTrigger>
                <TabsTrigger value="tips" className="min-h-11 min-w-0 flex-1 basis-[30%] sm:basis-auto text-foreground data-[state=active]:text-foreground whitespace-normal px-2 gap-1 text-sm">
                  <Lightbulb className="w-4 h-4 shrink-0" />
                  {t('exercise_view.tabs.tips')}
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-4">
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold text-foreground mb-2">{t('tools_stage5.about_exercise')}</h3>
                    <p className="text-muted-foreground leading-relaxed">{exercise.description || ''}</p>
                    {exercise.detailed_description && (
                      <p className="text-muted-foreground leading-relaxed mt-3">{exercise.detailed_description}</p>
                    )}
                  </CardContent>
                </Card>

                {exercise.media_type === 'visualization' && exercise.visualization_script && (
                  <Card className="bg-card border-indigo-200">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-2 mb-3">
                        <Eye className="w-5 h-5 text-indigo-600" />
                        <h3 className="text-lg font-semibold text-foreground">{t('tools_stage5.visualization')}</h3>
                      </div>
                      <p className="text-muted-foreground leading-relaxed italic">
                        "{exercise.visualization_script}"
                      </p>
                    </CardContent>
                  </Card>
                )}

                {exercise.video_url && (
                  <Card>
                    <CardContent className="p-6">
                      <h3 className="text-lg font-semibold text-foreground mb-3">{t('tools_stage5.video_demo')}</h3>
                      <div className="aspect-video rounded-xl overflow-hidden bg-gray-900">
                        <iframe
                          src={exercise.video_url}
                          className="w-full h-full"
                          allowFullScreen
                          title={exercise.title}
                        />
                      </div>
                    </CardContent>
                  </Card>
                )}

                {exercise.audio_url && (
                  <Card className="bg-card border-purple-200">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-2 mb-3">
                        <Headphones className="w-5 h-5 text-purple-600" />
                        <h3 className="text-lg font-semibold text-foreground">{t('tools_stage5.audio_guide')}</h3>
                      </div>
                      <audio 
                        controls 
                        className="w-full" 
                        src={exercise.audio_url}
                      >
                        {t('tools_stage5.media_error')}
                      </audio>
                    </CardContent>
                  </Card>
                )}

                {exercise.tags?.length > 0 && (
                  <Card>
                    <CardContent className="p-6">
                      <h3 className="text-sm font-medium text-muted-foreground mb-2">{t('tools_stage5.helps_with')}</h3>
                      <div className="flex flex-wrap gap-2">
                        {exercise.tags.filter(tag => tag && typeof tag === 'string').map((tag, i) => (
                          <Badge key={i} variant="secondary" className="capitalize">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Audio Tab */}
              {audioContent.length > 0 && (
                <TabsContent value="audio" className="space-y-4">
                  <Card>
                    <CardContent className="p-6">
                      <h3 className="text-lg font-semibold text-foreground mb-4">{t('tools_stage5.guided_audio')}</h3>
                      <p className="text-muted-foreground mb-4">
                        {t('tools_stage5.audio_intro')}
                      </p>
                      {audioContent.map((audio) => (
                        <div key={audio.id} className="mb-4">
                          <AudioPlayer 
                            audioContent={audio} 
                            onComplete={() => completeExerciseMutation.mutate()}
                          />
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </TabsContent>
              )}

              {/* Instructions Tab */}
              <TabsContent value="instructions" className="space-y-4">
                {exercise.detailed_steps?.length > 0 ? (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-foreground">{t('tools_stage5.step_guide')}</h3>
                    {exercise.detailed_steps.map((step, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="flex gap-4 bg-card rounded-xl p-4 border border-green-200"
                      >
                        <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center font-semibold flex-shrink-0">
                          {step.step_number || i + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          {step.title && (
                            <h4 className="font-semibold text-foreground mb-1">{step.title}</h4>
                          )}
                          <p className="text-muted-foreground">{step.description || ''}</p>
                          {step.duration_seconds && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {t('tools_stage5.seconds', { count: step.duration_seconds })}
                            </p>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="p-6">
                      <h3 className="text-lg font-semibold text-foreground mb-3">{t('tools_stage5.instructions')}</h3>
                      <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                        {exercise.instructions || ''}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {exercise.category === 'breathing' && exercise.duration_options?.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-3">{t('tools_stage5.choose_duration')}</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {exercise.duration_options.map((duration) => (
                        <Button
                          key={duration}
                          onClick={() => handleStartBreathing(duration)}
                          className="bg-primary hover:bg-primary/90 py-6 text-lg font-semibold"
                        >
                          {t('tools_stage5.minutes', { count: duration })}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* Benefits Tab */}
              <TabsContent value="benefits" className="space-y-4">
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold text-foreground mb-4">{t('tools_stage5.benefits')}</h3>
                    {exercise.benefits?.length > 0 ? (
                      <div className="space-y-3">
                        {exercise.benefits.filter(benefit => benefit && typeof benefit === 'string').map((benefit, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="flex items-start gap-3 bg-card rounded-lg p-4 border border-border"
                          >
                            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                            <p className="text-muted-foreground">{benefit}</p>
                          </motion.div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">
                        {t('tools_stage5.benefits_default')}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tips Tab */}
              <TabsContent value="tips" className="space-y-4">
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold text-foreground mb-4">{t('tools_stage5.tips')}</h3>
                    {exercise.tips?.length > 0 ? (
                      <div className="space-y-3">
                        {exercise.tips.filter(tip => tip && typeof tip === 'string').map((tip, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="flex items-start gap-3 bg-card rounded-lg p-4 border border-border"
                          >
                            <Lightbulb className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                            <p className="text-muted-foreground">{tip}</p>
                          </motion.div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">
                        {t('tools_stage5.tips_default')}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Mobile Action Buttons */}
            {exercise.category !== 'breathing' && (
              <div className="lg:hidden flex gap-3">
                {completed ? (
                  <div className="flex-1 bg-green-100 border border-green-300 rounded-xl p-4 flex items-center justify-center gap-2 text-green-700 font-medium">
                    <CheckCircle className="w-5 h-5" />
                    {t('tools_stage5.completed')}
                  </div>
                ) : (
                  <Button disabled={completeExerciseMutation.isPending} onClick={() => completeExerciseMutation.mutate()} className="flex-1 bg-primary hover:bg-primary/90">
                    <Play className="w-4 h-4 shrink-0" />
                    {t('tools_stage5.mark_complete')}
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Progress Sidebar - Desktop */}
          <div className="hidden lg:flex lg:flex-col gap-4 self-start sticky top-20">
            <Card className="bg-card border-2 border-green-200">
              <CardHeader>
                <CardTitle className="text-sm">{t('tools_stage5.progress')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-2xl font-bold text-green-600">{exercise.completed_count || 0}</p>
                    <p className="text-xs text-muted-foreground">{t('tools_stage5.times_completed')}</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-blue-600">{exercise.total_time_practiced || 0}</p>
                    <p className="text-xs text-muted-foreground">{t('tools_stage5.minutes_practiced')}</p>
                  </div>
                </div>
                {exercise.last_completed && (
                  <p className="text-xs text-muted-foreground mt-3">
                    {t('tools_stage5.last_practiced', { date: new Date(exercise.last_completed).toLocaleDateString(i18n.language, {
                      weekday: 'short',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    }) })}
                  </p>
                )}
              </CardContent>
            </Card>

            {exercise.category !== 'breathing' && (
              <div className="flex flex-col gap-3">
                {completed ? (
                  <div className="bg-green-100 border border-green-300 rounded-xl p-4 flex items-center justify-center gap-2 text-green-700 font-medium">
                    <CheckCircle className="w-5 h-5" />
                    {t('tools_stage5.completed')}
                  </div>
                ) : (
                  <Button disabled={completeExerciseMutation.isPending} onClick={() => completeExerciseMutation.mutate()} className="w-full bg-primary hover:bg-primary/90">
                    <Play className="w-4 h-4 shrink-0" />
                    {t('tools_stage5.mark_complete')}
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}