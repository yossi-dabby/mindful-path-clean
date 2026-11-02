import PremiumDialog from '@/components/ui/PremiumDialog';
import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { X, Play, CheckCircle, Clock, BookOpen, Lightbulb, Star, Video, Heart, Headphones, Eye, Download, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import BreathingVisual from './BreathingVisual';
import AudioPlayer from '../audio/AudioPlayer';
import { motion } from 'framer-motion';
import PremiumBadge from '../subscription/PremiumBadge';
import ExerciseMediaBadge from './ExerciseMediaBadge';
import { exportExercisePdf } from './exportExercisePdfUtils';

export default function ExerciseDetail({ exercise, onClose, onComplete, onToggleFavorite, favoritePending = false, favoriteError = false }) {
  const { t, i18n } = useTranslation();
  const [completed, setCompleted] = useState(false);
  const [completionPending, setCompletionPending] = useState(false);
  const [completionError, setCompletionError] = useState(false);
  const completionInFlight = useRef(false);
  const closeTimer = useRef();
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; clearTimeout(closeTimer.current); };
  }, []);
  const [showBreathingVisual, setShowBreathingVisual] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const pdfTextByLanguage = {
    en: {
      download: 'Download PDF',
      downloading: 'Preparing PDF...',
      subtitle: 'Printable exercise summary for offline practice',
      generatedOn: 'Generated on',
      details: 'Exercise Details',
      category: 'Category',
      difficulty: 'Difficulty',
      duration: 'Duration',
      minutes: 'min',
      progress: 'Your Progress',
      footer: 'For personal offline practice. Not a substitute for emergency or professional care.',
      noInstructions: 'No instructions available for this exercise yet.'
    },
    he: {
      download: 'הורדת PDF',
      downloading: 'מכין PDF...',
      subtitle: 'סיכום תרגיל להדפסה לשימוש לא מקוון',
      generatedOn: 'נוצר בתאריך',
      details: 'פרטי התרגיל',
      category: 'קטגוריה',
      difficulty: 'רמת קושי',
      duration: 'משך',
      minutes: 'דק׳',
      progress: 'ההתקדמות שלך',
      footer: 'לשימוש אישי לא מקוון בלבד. אינו מהווה תחליף לטיפול מקצועי או חירום.',
      noInstructions: 'עדיין אין הוראות זמינות לתרגיל זה.'
    },
    es: {
      download: 'Descargar PDF',
      downloading: 'Preparando PDF...',
      subtitle: 'Resumen imprimible del ejercicio para practicar sin conexión',
      generatedOn: 'Generado el',
      details: 'Detalles del ejercicio',
      category: 'Categoría',
      difficulty: 'Dificultad',
      duration: 'Duración',
      minutes: 'min',
      progress: 'Tu progreso',
      footer: 'Para práctica personal sin conexión. No sustituye la atención profesional o de emergencia.',
      noInstructions: 'Todavía no hay instrucciones disponibles para este ejercicio.'
    },
    fr: {
      download: 'Télécharger le PDF',
      downloading: 'Préparation du PDF...',
      subtitle: 'Résumé imprimable de l’exercice pour une pratique hors ligne',
      generatedOn: 'Généré le',
      details: 'Détails de l’exercice',
      category: 'Catégorie',
      difficulty: 'Difficulté',
      duration: 'Durée',
      minutes: 'min',
      progress: 'Votre progression',
      footer: 'Pour une pratique personnelle hors ligne. Ne remplace pas une aide professionnelle ou d’urgence.',
      noInstructions: 'Aucune instruction disponible pour cet exercice pour le moment.'
    },
    de: {
      download: 'PDF herunterladen',
      downloading: 'PDF wird vorbereitet...',
      subtitle: 'Druckbare Übungszusammenfassung für die Offline-Nutzung',
      generatedOn: 'Erstellt am',
      details: 'Übungsdetails',
      category: 'Kategorie',
      difficulty: 'Schwierigkeit',
      duration: 'Dauer',
      minutes: 'Min.',
      progress: 'Dein Fortschritt',
      footer: 'Für die persönliche Offline-Nutzung. Kein Ersatz für professionelle oder Notfallhilfe.',
      noInstructions: 'Für diese Übung sind noch keine Anweisungen verfügbar.'
    },
    it: {
      download: 'Scarica PDF',
      downloading: 'Preparazione PDF...',
      subtitle: 'Riepilogo stampabile dell’esercizio per l’uso offline',
      generatedOn: 'Generato il',
      details: 'Dettagli dell’esercizio',
      category: 'Categoria',
      difficulty: 'Difficoltà',
      duration: 'Durata',
      minutes: 'min',
      progress: 'I tuoi progressi',
      footer: 'Per pratica personale offline. Non sostituisce assistenza professionale o di emergenza.',
      noInstructions: 'Non ci sono ancora istruzioni disponibili per questo esercizio.'
    },
    pt: {
      download: 'Baixar PDF',
      downloading: 'Preparando PDF...',
      subtitle: 'Resumo imprimível do exercício para prática offline',
      generatedOn: 'Gerado em',
      details: 'Detalhes do exercício',
      category: 'Categoria',
      difficulty: 'Dificuldade',
      duration: 'Duração',
      minutes: 'min',
      progress: 'Seu progresso',
      footer: 'Para prática pessoal offline. Não substitui cuidados profissionais ou de emergência.',
      noInstructions: 'Ainda não há instruções disponíveis para este exercício.'
    }
  };

  const pdfText = pdfTextByLanguage[i18n.language] || pdfTextByLanguage.en;

  const instructionSteps = exercise.detailed_steps?.length > 0 ?
  exercise.detailed_steps :
  exercise.steps?.map((step, index) => ({
    step_number: index + 1,
    title: step.title,
    description: step.description
  })) || [];

  const instructionText = exercise.instructions?.trim() || (
  instructionSteps.length > 0 ?
  instructionSteps.map((step, index) => `${index + 1}. ${step.title ? `${step.title}: ` : ''}${step.description || ''}`).join('\n\n') :
  [exercise.description, exercise.detailed_description].filter(Boolean).join('\n\n'));

  // Fetch linked audio content
  const { data: audioContent } = useQuery({
    queryKey: ['audioContent', exercise.id],
    queryFn: () => base44.entities.AudioContent.filter({ linked_exercise_id: exercise.id }),
    initialData: []
  });

  const handleComplete = async () => {
    if (completionInFlight.current) return;
    completionInFlight.current = true;
    setCompletionPending(true);
    setCompletionError(false);
    try {
      await onComplete(selectedDuration || undefined);
      if (mounted.current) {
        setCompleted(true);
        closeTimer.current = setTimeout(onClose, 2000);
      }
    } catch (_error) {
      if (mounted.current) { setShowBreathingVisual(false); setCompletionError(true); }
    } finally {
      completionInFlight.current = false;
      if (mounted.current) setCompletionPending(false);
    }
  };

  const handleStartBreathing = (duration) => {
    setSelectedDuration(duration);
    setShowBreathingVisual(true);
  };

  const handleBreathingComplete = () => {
    handleComplete();
  };

  const handleDownloadPdf = async () => {
    setIsExportingPdf(true);
    try {
      await exportExercisePdf({
        exercise,
        language: i18n.language,
        labels: {
          subtitle: pdfText.subtitle,
          generatedOn: pdfText.generatedOn,
          details: pdfText.details,
          category: pdfText.category,
          difficulty: pdfText.difficulty,
          duration: pdfText.duration,
          minutes: pdfText.minutes,
          about: t('exercises.detail.about'),
          instructions: t('exercises.detail.instructions'),
          stepByStep: t('exercises.detail.step_by_step_guide'),
          benefits: t('exercises.detail.key_benefits'),
          tips: t('exercises.detail.helpful_tips'),
          helpsWith: t('exercises.detail.helps_with'),
          progress: pdfText.progress,
          timesCompleted: t('exercises.detail.times_completed'),
          minutesPracticed: t('exercises.detail.minutes_practiced'),
          lastPracticed: t('exercises.detail.last_practiced', { date: new Date().toLocaleDateString(i18n.language || undefined) }).replace(/:.*$/, ''),
          footer: pdfText.footer,
          noInstructions: pdfText.noInstructions,
          untitled: t('exercises.detail.untitled_exercise')
        }
      });
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <PremiumDialog
      onClose={onClose}
      label={exercise.title || t('exercise_view.untitled')}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 overflow-y-auto"
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 6rem)'
      }}>

      <div style={{ display: showBreathingVisual ? 'none' : undefined }} className="min-h-full flex items-start justify-center p-4 pt-6 pb-24 md:items-center md:p-6">
      <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-4xl my-0 md:my-8"
          style={{ maxHeight: 'calc(100vh - 32px)' }}>

        <Card className="overflow-hidden rounded-[28px] border border-border/70 shadow-2xl">
          {completionError && <p role="alert" className="m-4 rounded-xl border border-border bg-secondary p-3 text-foreground">{t('home_practice.completion_error')}</p>}
          <CardHeader className="bg-secondary/60 p-6 flex flex-col space-y-1.5 border-b from-green-50 to-blue-50">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1 basis-full sm:basis-0">
                <div className="flex items-start gap-3 mb-2">
                  <CardTitle className="min-w-0 flex-1 [overflow-wrap:anywhere] text-primary text-2xl font-semibold tracking-[-0.012em]">{exercise.title || t('exercise_view.untitled')}</CardTitle>
                  <button
                      type="button"
                      aria-pressed={!!exercise.favorite}
                      aria-label={exercise.favorite ? t('exercise_view.remove_favorite') : t('exercise_view.add_favorite')}
                      title={exercise.favorite ? t('exercise_view.remove_favorite') : t('exercise_view.add_favorite')}
                      disabled={!onToggleFavorite || favoritePending}
                      onClick={() => onToggleFavorite?.(exercise)}
                      data-favorite={exercise.favorite ? 'true' : 'false'}
                      className={`shrink-0 min-h-[44px] min-w-[44px] px-3 py-2 rounded-full border flex items-center justify-center shadow-[var(--shadow-sm)] transition-all duration-200 ${exercise.favorite ? 'bg-rose-100 border-rose-300 ring-2 ring-rose-200' : 'bg-card/95 border-border/70 hover:bg-rose-50'}`}>


                    <Heart className={`w-5 h-5 transition-transform duration-200 ${exercise.favorite ? 'fill-red-500 text-red-500 scale-110' : 'fill-none text-muted-foreground'}`} />
                  <span className="mobile-action-label md:hidden">{exercise.favorite ? t('exercise_view.remove_favorite') : t('exercise_view.add_favorite')}</span></button>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="bg-secondary text-primary px-2.5 py-1 font-medium capitalize tracking-[0.01em] leading-4 rounded-[var(--radius-chip)] inline-flex items-center border transition-colors focus:outline-none focus:ring-1 focus:ring-ring focus:ring-offset-1 border-border/70">
                    {t(`exercises.difficulty.${String(exercise.difficulty || 'beginner').toLowerCase()}`)}
                  </Badge>
                  {String(exercise.difficulty || '').toLowerCase() === 'advanced' && <PremiumBadge />}
                  <ExerciseMediaBadge mediaType={exercise.media_type} size="md" />
                  {exercise.duration_options?.length > 0 ?
                    <Badge variant="secondary" className="bg-secondary/86 text-primary px-2.5 py-1 font-medium tracking-[0.01em] leading-4 rounded-[var(--radius-chip)] border transition-colors focus:outline-none focus:ring-1 focus:ring-ring focus:ring-offset-1 border-border/60 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {exercise.duration_options.join(', ')} {t('exercises.detail.duration_options_suffix')}
                    </Badge> :
                    exercise.duration_minutes &&
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {exercise.duration_minutes} {t('exercises.detail.minutes_suffix')}
                    </Badge>
                    }
                  {exercise.video_url &&
                    <Badge className="flex items-center gap-1 bg-purple-100 text-purple-700">
                      <Video className="w-3 h-3" />
                      {t('exercises.detail.video_label')}
                    </Badge>
                    }
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2 ms-auto">
                <Button
                    variant="outline"
                    onClick={handleDownloadPdf}
                    disabled={isExportingPdf} className="bg-secondary text-secondary-foreground px-4 py-2 font-medium tracking-[0.005em] leading-none rounded-[var(--radius-control)] inline-flex items-center justify-center gap-2 whitespace-nowrap transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-border/70 shadow-[var(--shadow-sm)] hover:bg-secondary/92 hover:text-foreground active:bg-secondary/96 h-9 min-h-[44px] md:min-h-0">


                  {isExportingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  <span className="inline">{isExportingPdf ? pdfText.downloading : pdfText.download}</span>
                </Button>
                <Button variant="ghost" size="icon" onClick={onClose} aria-label={t('exercise_view.close')} className="text-primary font-medium tracking-[0.005em] leading-none rounded-[var(--radius-control)] inline-flex items-center justify-center gap-2 whitespace-nowrap border border-transparent transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow-none hover:bg-secondary/78 hover:text-foreground active:bg-secondary/88 h-9 w-9 min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0">
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="bg-card p-4 md:p-6">
            {favoriteError && <p role="alert" className="mb-4 rounded-xl border border-border bg-secondary p-3 text-foreground">{t('home_practice.favorite_error')}</p>}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
              {/* Left Column: Main Content */}
              <div className="flex flex-col space-y-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList className={`exercise-detail-tabs grid w-full ${audioContent.length > 0 ? 'grid-cols-5' : 'grid-cols-4'}`}>
                <TabsTrigger value="overview" className="text-foreground px-3 py-1 font-medium tracking-[0.003em] leading-none rounded-[calc(var(--radius-control)-2px)] inline-flex items-center justify-center whitespace-nowrap min-h-[44px] md:min-h-0 ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-45 hover:bg-secondary/65 hover:text-foreground data-[state=active]:border data-[state=active]:border-primary/12 data-[state=active]:bg-[hsl(var(--card)/0.96)] data-[state=active]:text-primary data-[state=active]:shadow-[var(--shadow-sm)]">
                  <BookOpen className="w-4 h-4 sm:mr-2" />
                  <span className="inline">{t('exercise_view.tabs.overview')}</span>
                </TabsTrigger>
                <TabsTrigger value="instructions" className="text-foreground px-3 py-1 font-medium tracking-[0.003em] leading-none rounded-[calc(var(--radius-control)-2px)] inline-flex items-center justify-center whitespace-nowrap min-h-[44px] md:min-h-0 ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-45 hover:bg-secondary/65 hover:text-foreground data-[state=active]:border data-[state=active]:border-primary/12 data-[state=active]:bg-[hsl(var(--card)/0.96)] data-[state=active]:text-primary data-[state=active]:shadow-[var(--shadow-sm)]">
                  <Play className="w-4 h-4 sm:mr-2" />
                  <span className="inline">{t('exercise_view.tabs.practice')}</span>
                </TabsTrigger>
                {audioContent.length > 0 &&
                      <TabsTrigger value="audio">
                    <Headphones className="w-4 h-4 sm:mr-2" />
                    <span className="inline">{t('exercise_view.tabs.audio')}</span>
                  </TabsTrigger>
                      }
                <TabsTrigger value="benefits" className="text-foreground px-3 py-1 font-medium tracking-[0.003em] leading-none rounded-[calc(var(--radius-control)-2px)] inline-flex items-center justify-center whitespace-nowrap min-h-[44px] md:min-h-0 ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-45 hover:bg-secondary/65 hover:text-foreground data-[state=active]:border data-[state=active]:border-primary/12 data-[state=active]:bg-[hsl(var(--card)/0.96)] data-[state=active]:text-primary data-[state=active]:shadow-[var(--shadow-sm)]">
                  <Star className="w-4 h-4 sm:mr-2" />
                  <span className="inline">{t('exercise_view.tabs.benefits')}</span>
                </TabsTrigger>
                <TabsTrigger value="tips" className="bg-secondary/60 text-foreground px-3 py-1 font-medium tracking-[0.003em] leading-none rounded-[calc(var(--radius-control)-2px)] inline-flex items-center justify-center whitespace-nowrap min-h-[44px] md:min-h-0 ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-45 hover:bg-secondary/65 hover:text-foreground data-[state=active]:border data-[state=active]:border-primary/12 data-[state=active]:bg-[hsl(var(--card)/0.96)] data-[state=active]:text-primary data-[state=active]:shadow-[var(--shadow-sm)]">
                  <Lightbulb className="text-foreground lucide lucide-lightbulb w-4 h-4 sm:mr-2" />
                  <span className="inline">{t('exercise_view.tabs.tips')}</span>
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-4 max-h-[50vh] overflow-y-auto">
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">{t('exercise_view.about')}</h3>
                  <p className="text-muted-foreground leading-relaxed">{exercise.description || ''}</p>
                  {exercise.detailed_description &&
                        <p className="text-muted-foreground leading-relaxed mt-3">{exercise.detailed_description}</p>
                        }
                </div>

                {/* Visualization Script */}
                {exercise.media_type === 'visualization' && exercise.visualization_script &&
                      <div className="bg-card rounded-xl p-4 border border-indigo-200">
                    <div className="flex items-center gap-2 mb-3">
                      <Eye className="w-5 h-5 text-indigo-600" />
                      <h3 className="text-lg font-semibold text-foreground">{t('exercise_view.guided_visualization')}</h3>
                    </div>
                    <p className="text-muted-foreground leading-relaxed italic">
                      "{exercise.visualization_script}"
                    </p>
                  </div>
                      }

                {/* Video Preview */}
                {exercise.video_url &&
                      <div>
                    <h3 className="text-lg font-semibold text-foreground mb-3">{t('exercise_view.video_demo')}</h3>
                    <div className="aspect-video rounded-xl overflow-hidden bg-gray-900">
                      <iframe
                            src={exercise.video_url}
                            className="w-full h-full"
                            allowFullScreen
                            title={exercise.title} />

                    </div>
                  </div>
                      }

                {/* Audio URL */}
                {exercise.audio_url &&
                      <div className="bg-card rounded-xl p-4 border border-purple-200">
                    <div className="flex items-center gap-2 mb-3">
                      <Headphones className="w-5 h-5 text-purple-600" />
                      <h3 className="text-lg font-semibold text-foreground">{t('exercise_view.audio_guide')}</h3>
                    </div>
                    <audio
                          controls
                          className="w-full"
                          src={exercise.audio_url}>

                      {t('exercise_view.audio_unsupported')}
                    </audio>
                  </div>
                      }

                {/* Tags */}
                {exercise.tags?.length > 0 &&
                      <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">{t('exercise_view.helps_with')}</h3>
                    <div className="flex flex-wrap gap-2">
                      {exercise.tags.filter((tag) => tag && typeof tag === 'string').map((tag, i) =>
                          <Badge key={i} variant="secondary" className="capitalize">
                          {tag}
                        </Badge>
                          )}
                    </div>
                  </div>
                      }
              </TabsContent>

              {/* Audio Tab */}
              {audioContent.length > 0 &&
                    <TabsContent value="audio" className="space-y-4 max-h-[50vh] overflow-y-auto">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-4">{t('exercise_view.guided_audio')}</h3>
                    <p className="text-muted-foreground mb-4">
                      {t('exercise_view.guided_audio_description')}
                    </p>
                    {audioContent.map((audio) =>
                        <div key={audio.id} className="mb-4">
                        <AudioPlayer
                            audioContent={audio}
                            onComplete={handleComplete} />

                      </div>
                        )}
                  </div>
                </TabsContent>
                    }

              {/* Instructions Tab */}
              <TabsContent value="instructions" className="space-y-4 max-h-[50vh] overflow-y-auto">
                {instructionSteps.length > 0 ?
                      <div>
                    <h3 className="text-lg font-semibold text-foreground mb-4">{t('exercise_view.step_guide')}</h3>
                    <div className="space-y-4">
                      {instructionSteps.map((step, i) =>
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.1 }} className="bg-secondary/60 p-4 rounded-xl flex gap-4 border border-border/60">


                          <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center font-semibold flex-shrink-0">
                            {step.step_number || i + 1}
                          </div>
                          <div className="flex-1">
                            {step.title &&
                              <h4 className="font-semibold text-foreground mb-1">{step.title}</h4>
                              }
                            <p className="text-muted-foreground">{step.description || ''}</p>
                            {step.duration_seconds &&
                              <p className="text-sm text-muted-foreground mt-1">
                                {t('exercise_view.step_duration', { seconds: step.duration_seconds })}
                              </p>
                              }
                          </div>
                        </motion.div>
                          )}
                    </div>
                  </div> :

                      <div>
                    <h3 className="text-lg font-semibold text-foreground mb-3">{t('exercise_view.instructions')}</h3>
                    <div className="bg-secondary/60 text-primary p-4 rounded-xl border border-gray-200">
                      <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                        {instructionText || t('exercise_view.instructions_soon')}
                      </p>
                    </div>
                  </div>
                      }

                {/* Duration Options for Breathing Exercises */}
                {exercise.category === 'breathing' && exercise.duration_options?.length > 0 &&
                      <div>
                    <h3 className="text-lg font-semibold text-foreground mb-3">{t('exercise_view.choose_duration')}</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {exercise.duration_options.map((duration) =>
                          <Button
                            key={duration}
                            onClick={() => handleStartBreathing(duration)}
                            className="bg-primary hover:bg-primary/90 py-6 text-lg font-semibold">

                          {t('exercise_view.minutes_short', { count: duration })}
                        </Button>
                          )}
                    </div>
                  </div>
                      }
              </TabsContent>

              {/* Benefits Tab */}
              <TabsContent value="benefits" className="space-y-4 max-h-[50vh] overflow-y-auto">
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-4">{t('exercise_view.key_benefits')}</h3>
                  {exercise.benefits?.length > 0 ?
                        <div className="space-y-3">
                      {exercise.benefits.filter((benefit) => benefit && typeof benefit === 'string').map((benefit, i) =>
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.1 }} className="bg-secondary/60 p-4 rounded-lg flex items-start gap-3 border border-green-200">


                          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                          <p className="text-muted-foreground">{benefit}</p>
                        </motion.div>
                          )}
                    </div> :

                        <p className="text-muted-foreground">
                      {t('exercise_view.benefits_fallback')}
                    </p>
                        }
                </div>
              </TabsContent>

              {/* Tips Tab */}
              <TabsContent value="tips" className="space-y-4 max-h-[50vh] overflow-y-auto">
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-4">{t('exercise_view.helpful_tips')}</h3>
                  {exercise.tips?.length > 0 ?
                        <div className="space-y-3">
                      {exercise.tips.filter((tip) => tip && typeof tip === 'string').map((tip, i) =>
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.1 }} className="bg-secondary/60 p-4 rounded-lg flex items-start gap-3 border border-blue-200">


                          <Lightbulb className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                          <p className="text-muted-foreground">{tip}</p>
                        </motion.div>
                          )}
                    </div> :

                        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <p className="text-muted-foreground">
                        {t('exercise_view.tips_fallback')}
                      </p>
                    </div>
                        }
                </div>
              </TabsContent>
            </Tabs>

                {/* Mobile: Progress Stats */}
                <div className="lg:hidden">
                  <div className="bg-secondary/60 p-6 rounded-xl from-green-50 to-blue-50 border-2 border-green-200">
                    <h3 className="text-sm font-semibold text-muted-foreground mb-3">{t('exercise_view.your_progress')}</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-2xl font-bold text-primary">{exercise.completed_count || 0}</p>
                        <p className="text-foreground text-xs">{t('exercise_view.times_completed')}</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-primary">{exercise.total_time_practiced || 0}</p>
                        <p className="text-foreground text-xs">{t('exercise_view.minutes_practiced')}</p>
                      </div>
                    </div>
                    {exercise.last_completed &&
                      <p className="text-xs text-muted-foreground mt-3">
                        {t('exercise_view.last_practiced', { date: new Date(exercise.last_completed).toLocaleDateString(i18n.resolvedLanguage || i18n.language, {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        }) })}
                      </p>
                      }
                  </div>
                </div>

                {/* Mobile: Action Buttons */}
                {exercise.category !== 'breathing' &&
                  <div className="lg:hidden flex gap-3">
                    {completed ?
                    <div className="flex-1 bg-green-100 border border-green-300 rounded-xl p-4 flex items-center justify-center gap-2 text-green-700 font-medium">
                        <CheckCircle className="w-5 h-5" />
                        {t('exercise_view.completed')}
                      </div> :

                    <>
                        <Button variant="outline" onClick={onClose} className="bg-secondary/60 text-foreground px-4 py-2 font-medium tracking-[0.005em] leading-none rounded-[var(--radius-control)] inline-flex items-center justify-center gap-2 whitespace-nowrap transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-border/70 shadow-[var(--shadow-sm)] hover:bg-secondary/92 hover:text-foreground active:bg-secondary/96 h-9 min-h-[44px] md:min-h-0 flex-1">
                          {t('exercise_view.close')}
                        </Button>
                        <Button onClick={handleComplete} disabled={completionPending} aria-busy={completionPending} className="bg-secondary/60 text-foreground px-4 py-2 font-medium tracking-[0.005em] leading-none rounded-[var(--radius-control)] inline-flex items-center justify-center gap-2 whitespace-nowrap border border-transparent transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow-[var(--shadow-md)] hover:shadow-[var(--shadow-lg)] active:bg-primary/95 h-9 min-h-[44px] md:min-h-0 flex-1 hover:bg-green-700">
                          <Play className="w-4 h-4 mr-2" />
                          {completionPending ? t('home_practice.saving') : t('exercise_view.mark_complete')}
                        </Button>
                      </>
                    }
                  </div>
                  }
              </div>

              {/* Right Column: Progress & Actions (Desktop) */}
              <div className="hidden lg:flex lg:flex-col gap-4 self-start">
                {/* Completion Stats */}
                <div className="bg-secondary/60 p-6 rounded-xl from-green-50 to-blue-50 border-2 border-green-200">
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3">{t('exercise_view.your_progress')}</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-2xl font-bold text-primary">{exercise.completed_count || 0}</p>
                      <p className="text-xs text-muted-foreground">{t('exercise_view.times_completed')}</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-primary">{exercise.total_time_practiced || 0}</p>
                      <p className="text-xs text-muted-foreground">{t('exercise_view.minutes_practiced')}</p>
                    </div>
                  </div>
                  {exercise.last_completed &&
                    <p className="text-xs text-muted-foreground mt-3">
                      {t('exercise_view.last_practiced', { date: new Date(exercise.last_completed).toLocaleDateString(i18n.resolvedLanguage || i18n.language, {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      }) })}
                    </p>
                    }
                </div>

                {/* Action Buttons - Desktop */}
                {exercise.category !== 'breathing' &&
                  <div className="flex flex-col gap-3">
                    {completed ?
                    <div className="bg-green-100 border border-green-300 rounded-xl p-4 flex items-center justify-center gap-2 text-green-700 font-medium">
                        <CheckCircle className="w-5 h-5" />
                        {t('exercise_view.completed')}
                      </div> :

                    <>
                        <Button onClick={handleComplete} disabled={completionPending} aria-busy={completionPending} className="bg-primary text-primary-foreground px-4 py-2 font-medium tracking-[0.005em] leading-none rounded-[var(--radius-control)] inline-flex items-center justify-center gap-2 whitespace-nowrap border border-transparent transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow-[var(--shadow-md)] hover:shadow-[var(--shadow-lg)] active:bg-primary/95 h-9 min-h-[44px] md:min-h-0 w-full hover:bg-green-700">
                          <Play className="w-4 h-4 mr-2" />
                          {completionPending ? t('home_practice.saving') : t('exercise_view.mark_complete')}
                        </Button>
                        <Button variant="outline" onClick={onClose} className="bg-secondary/60 text-secondary-foreground px-4 py-2 font-medium tracking-[0.005em] leading-none rounded-[var(--radius-control)] inline-flex items-center justify-center gap-2 whitespace-nowrap transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-border/70 shadow-[var(--shadow-sm)] hover:bg-secondary/92 hover:text-foreground active:bg-secondary/96 h-9 min-h-[44px] md:min-h-0 w-full">
                          {t('exercise_view.close')}
                        </Button>
                      </>
                    }
                  </div>
                  }
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
      </div>
      {showBreathingVisual && exercise.category === 'breathing' && (
        <BreathingVisual exercise={exercise} duration={selectedDuration}
          onClose={() => setShowBreathingVisual(false)} onComplete={handleBreathingComplete} />
      )}
    </PremiumDialog>
  );

}