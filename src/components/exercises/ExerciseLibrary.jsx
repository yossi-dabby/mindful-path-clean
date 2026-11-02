import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Play, Heart, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import ExerciseMediaBadge from './ExerciseMediaBadge';

function ExerciseLibrary({ exercises, categoryIcons, categoryColors, onSelectExercise, onToggleFavorite }) {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-7">
      {exercises.map((exercise, index) => {
        const Icon = categoryIcons[exercise.category] || Play;
        const colorClass = categoryColors[exercise.category] || 'bg-gray-100 text-muted-foreground';

        return (
          <motion.div
            key={exercise.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}>

            <Card className="bg-card text-card-foreground rounded-[32px] backdrop-blur-[10px] border border-border/80 shadow-[var(--shadow-md)] hover:shadow-[var(--shadow-lg)] transition-all cursor-pointer group relative overflow-hidden"

            onClick={() => onSelectExercise(exercise)}>

              {/* Favorite Button */}
              <button
                type="button"
                aria-pressed={!!exercise.favorite}
                aria-label={t(exercise.favorite ? 'exercises.remove_favorite' : 'exercises.add_favorite')}
                title={t(exercise.favorite ? 'exercises.remove_favorite' : 'exercises.add_favorite')}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onToggleFavorite?.(exercise);
                }}
                data-favorite={exercise.favorite ? 'true' : 'false'}
                className={`mx-1 p-2.5 min-h-[44px] min-w-[44px] rounded-full absolute top-3 right-3 z-10 shadow-[var(--shadow-sm)] transition-all duration-200 border flex items-center justify-center ${exercise.favorite ? 'bg-rose-100 border-rose-300 ring-2 ring-rose-200' : 'border-border/70 bg-card/95 hover:bg-card'}`}>
                
                <Heart className={`w-5 h-5 transition-transform duration-200 ${exercise.favorite ? 'fill-red-500 text-red-500 scale-110' : 'text-muted-foreground'}`} />
              <span className="mobile-action-label md:hidden">{t(exercise.favorite ? 'exercises.remove_favorite' : 'exercises.add_favorite')}</span></button>

              {/* Image/Video Thumbnail */}
              {exercise.image_url &&
              <div className="h-40 overflow-hidden relative">
                  <img
                  src={exercise.image_url}
                  alt={exercise.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />

                  {exercise.video_url &&
                <div className="absolute inset-0 bg-[hsl(var(--overlay)/0.12)] flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-card/90 flex items-center justify-center">
                        <Play className="w-6 h-6 text-foreground ml-1" />
                      </div>
                    </div>
                }
                </div>
              }

              <CardContent className="exercise-card-art p-4 md:p-5 rounded-3xl">
                <div className="mr-8 mb-3 flex items-start justify-between">
                  <div className="bg-secondary text-primary rounded-xl w-9 h-9 border border-border/60 flex items-center justify-center group-hover:scale-110 transition-transform mx-5">
                    <Icon className="text-primary lucide lucide-trending-up lucide-anchor w-5 h-5" />
                  </div>
                  {exercise.completed_count > 0 &&
                  <Badge variant="secondary" className="bg-green-100 text-green-700 mx-auto my-1 px-2 py-1 text-xs font-medium tracking-[0.01em] rounded-[var(--radius-chip)] inline-flex items-center border transition-colors focus:outline-none focus:ring-1 focus:ring-ring focus:ring-offset-1 border-border/60">
                      ✓ {t('exercises.completed_times', { count: exercise.completed_count })}
                    </Badge>
                  }
                </div>

                <div className="mb-2">
                  <h3 className="font-semibold text-foreground text-lg leading-snug group-hover:text-foreground transition-colors line-clamp-2 break-words">
                    {exercise.title || t('exercises.detail.untitled_exercise')}
                  </h3>
                </div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <ExerciseMediaBadge mediaType={exercise.media_type} />
                  {exercise.completed_count > 0 &&
                  <span className="text-xs text-muted-foreground font-medium">
                    {exercise.total_time_practiced || 0} {t('common.minutes_short')}
                  </span>
                  }
                </div>
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{exercise.description || ''}</p>

                {/* Tags */}
                {exercise.tags?.length > 0 &&
                <div className="flex flex-wrap gap-1 mb-3">
                    {exercise.tags.filter((tag) => tag && typeof tag === 'string').slice(0, 2).map((tag, i) =>
                  <Badge key={i} variant="outline" className="bg-secondary/70 text-muted-foreground px-2 py-0.5 text-xs font-medium tracking-[0.01em] rounded-3xl inline-flex items-center border transition-colors focus:outline-none focus:ring-1 focus:ring-ring focus:ring-offset-1 border-border/70">
                        {tag}
                      </Badge>
                  )}
                  </div>
                }

                <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t border-border/60">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {exercise.duration_options?.length > 0 ?
                    `${exercise.duration_options[0]}-${exercise.duration_options[exercise.duration_options.length - 1]} ${t('common.minutes_short')}` :
                    t('exercises.library.flexible')}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-secondary/70 text-muted-foreground px-2 py-0.5 text-[11px] font-medium capitalize tracking-[0.01em] rounded-3xl inline-flex items-center border transition-colors focus:outline-none focus:ring-1 focus:ring-ring focus:ring-offset-1 border-border/70">
                      {t(`exercises.difficulty.${String(exercise.difficulty || 'beginner').toLowerCase()}`)}
                    </Badge>
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-border/70 bg-card/85">
                      <ChevronRight className="w-3 h-3 text-muted-foreground" />
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                {exercise.completed_count > 0 &&
                <div className="mt-2.5">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                      <span>{t('journeys.card.progress')}</span>
                      <span>{exercise.total_time_practiced || 0} {t('common.minutes_short')}</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-1.5">
                      <div
                      className="bg-primary h-1.5 rounded-full transition-all"
                      style={{
                        width: `${Math.min(exercise.completed_count / 10 * 100, 100)}%`
                      }} />

                    </div>
                  </div>
                }
              </CardContent>
            </Card>
          </motion.div>);

      })}
    </div>);

}

export default React.memo(ExerciseLibrary);