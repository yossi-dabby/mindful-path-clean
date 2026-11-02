import PremiumDialog from '@/components/ui/PremiumDialog';
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { X, Battery, Moon, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import PremiumMoodIcon from '@/components/ui/PremiumMoodIcon';

const moodsConfig = [
  { value: 'excellent', labelKey: 'mood_tracker.form.mood_excellent' },
  { value: 'good', labelKey: 'mood_tracker.form.mood_good' },
  { value: 'okay', labelKey: 'mood_tracker.form.mood_okay' },
  { value: 'low', labelKey: 'mood_tracker.form.mood_low' },
  { value: 'very_low', labelKey: 'mood_tracker.form.mood_very_low' }
];

const emotions = [
  'happy', 'sad', 'anxious', 'calm', 'angry', 'frustrated', 'excited', 'grateful',
  'lonely', 'hopeful', 'overwhelmed', 'peaceful', 'stressed', 'content', 'worried'
];

const commonTriggers = [
  'work', 'relationships', 'health', 'finances', 'sleep', 'family',
  'social media', 'news', 'weather', 'exercise', 'diet', 'isolation'
];

const commonActivities = [
  'exercise', 'meditation', 'socializing', 'work', 'hobbies', 'reading',
  'watching TV', 'gaming', 'cooking', 'outdoor activities', 'therapy', 'journaling'
];

const energyLevelsConfig = [
  { value: 'very_low', labelKey: 'mood_tracker.form.energy_very_low', icon: Battery },
  { value: 'low', labelKey: 'mood_tracker.form.energy_low', icon: Battery },
  { value: 'moderate', labelKey: 'mood_tracker.form.energy_moderate', icon: Battery },
  { value: 'high', labelKey: 'mood_tracker.form.energy_high', icon: Zap },
  { value: 'very_high', labelKey: 'mood_tracker.form.energy_very_high', icon: Zap }
];

const sleepQualitiesConfig = [
  { value: 'poor', labelKey: 'mood_tracker.form.sleep_poor', icon: Moon },
  { value: 'fair', labelKey: 'mood_tracker.form.sleep_fair', icon: Moon },
  { value: 'good', labelKey: 'mood_tracker.form.sleep_good', icon: Moon },
  { value: 'excellent', labelKey: 'mood_tracker.form.sleep_excellent', icon: Moon }
];

const getLocalDateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const toMoodPayload = (data) => ({
  date: data.date,
  mood: data.mood,
  emotions: Array.isArray(data.emotions) ? data.emotions : [],
  intensity: Math.max(1, Math.min(10, Number(data.intensity) || 5)),
  energy_level: data.energy_level,
  sleep_quality: data.sleep_quality,
  stress_level: Math.max(1, Math.min(10, Number(data.stress_level) || 5)),
  triggers: Array.isArray(data.triggers) ? data.triggers : [],
  activities: Array.isArray(data.activities) ? data.activities : [],
  notes: typeof data.notes === 'string' ? data.notes.trim() : ''
});

export default function DetailedMoodForm({ entry, onClose }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const today = getLocalDateKey();
  const dialogTitleId = React.useId();
  const dialogDescriptionId = React.useId();
  const taxonomyLabel = (group, value) => t(`mood_tracker.taxonomy.${group}.${value.replaceAll(' ', '_')}`);
  const isSavingRef = React.useRef(false);
  const [saveError, setSaveError] = React.useState(null);

  const [formData, setFormData] = useState(
    entry || {
      date: today,
      mood: 'okay',
      emotions: [],
      intensity: 5,
      energy_level: 'moderate',
      sleep_quality: 'good',
      stress_level: 5,
      triggers: [],
      activities: [],
      notes: ''
    }
  );

  const saveMutation = useMutation({
    mutationFn: (data) => {
      const payload = toMoodPayload(data);
      return entry
        ? base44.entities.MoodEntry.update(entry.id, payload)
        : base44.entities.MoodEntry.create(payload);
    },
    onMutate: async (data) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['moodEntries'] });
      await queryClient.cancelQueries({ queryKey: ['recentMood'] });
      await queryClient.cancelQueries({ queryKey: ['todayFlow'] });

      const previousMoodEntries = queryClient.getQueriesData({ queryKey: ['moodEntries'] });
      const previousRecentMood = queryClient.getQueryData(['recentMood']);
      const previousTodayFlow = queryClient.getQueryData(['todayFlow']);
      const validatedData = toMoodPayload(data);

      if (entry) {
        queryClient.setQueriesData({ queryKey: ['moodEntries'] }, (old) => {
          if (!Array.isArray(old)) return old;
          return old.map((item) => item.id === entry.id ? { ...item, ...validatedData } : item);
        });
      } else {
        const optimisticEntry = {
          id: `temp-${Date.now()}`,
          ...validatedData,
          created_date: new Date().toISOString()
        };
        queryClient.setQueriesData({ queryKey: ['moodEntries'] }, (old) => [optimisticEntry, ...(Array.isArray(old) ? old : [])]);
        queryClient.setQueryData(['recentMood'], (old) => [optimisticEntry, ...(Array.isArray(old) ? old : [])]);
      }

      return { previousMoodEntries, previousRecentMood, previousTodayFlow };
    },
    onSuccess: () => {
      isSavingRef.current = false;
      onClose();
    },
    onError: (error, variables, context) => {
      isSavingRef.current = false;
      // Rollback on error
      context?.previousMoodEntries?.forEach(([queryKey, value]) => {
        queryClient.setQueryData(queryKey, value);
      });
      if (context?.previousRecentMood !== undefined) {
        queryClient.setQueryData(['recentMood'], context.previousRecentMood);
      }
      if (context?.previousTodayFlow !== undefined) {
        queryClient.setQueryData(['todayFlow'], context.previousTodayFlow);
      }
      setSaveError(t('mood_tracker.form.save_error'));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['moodEntries'] });
      queryClient.invalidateQueries({ queryKey: ['recentMood'] });
      queryClient.invalidateQueries({ queryKey: ['todayFlow'] });
    }
  });

  const toggleItem = (field, item) => {
    const current = formData[field] || [];
    const updated = current.includes(item)
      ? current.filter(i => i !== item)
      : [...current, item];
    setFormData({ ...formData, [field]: updated });
  };


  return (
    <PremiumDialog localEscape onClose={onClose} label={t('mood_tracker.form.title')}
      role="dialog"
      aria-modal="true"
      aria-labelledby={dialogTitleId}
      aria-describedby={dialogDescriptionId}
      className="goal-dialog fixed inset-0 bg-[hsl(var(--overlay)/0.24)] backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden"
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 6rem)'
      }}
    >
      <Card className="w-full max-w-3xl border border-border/80 bg-card/95 backdrop-blur-xl shadow-[var(--shadow-lg)] rounded-b-none sm:rounded-[var(--radius-card)]" style={{ maxHeight: 'min(92dvh, 900px)' }} data-testid="mood-entry-dialog">
        <CardHeader className="border-b border-border/70 bg-secondary/35 px-4 py-4 sm:px-6 sticky top-0 z-10 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <CardTitle id={dialogTitleId} className="text-xl sm:text-2xl">{t('mood_tracker.form.title')}</CardTitle>
              <p id={dialogDescriptionId} className="text-xs sm:text-sm text-muted-foreground mt-1">{t('mood_tracker.form.dialog_description')}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} aria-label={t('mood_tracker.form.close_aria')}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 space-y-6 overflow-y-auto overscroll-contain" style={{ maxHeight: 'calc(min(92dvh, 900px) - 104px)', paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.5rem)' }}>
          {/* Date */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">{t('mood_tracker.form.date')}</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full border border-input/90 bg-[hsl(var(--surface-nested)/0.92)] rounded-xl px-3 py-2 text-sm text-foreground shadow-[var(--shadow-sm)] focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          {/* Mood Selection */}
          <div>
            <label className="text-sm font-medium text-foreground mb-3 block">{t('mood_tracker.form.overall_mood')}</label>
            <div className="grid grid-cols-5 gap-1 sm:gap-2 md:gap-3">
              {moodsConfig.map((mood) => (
                <button
                  key={mood.value}
                  type="button"
                  aria-pressed={formData.mood === mood.value}
                  onClick={() => setFormData({ ...formData, mood: mood.value })}
                  className={cn(
                    'flex flex-col items-center gap-1 sm:gap-2 p-2 sm:p-4 rounded-2xl border-2 transition-all',
                    formData.mood === mood.value
                      ? 'border-primary/40 bg-primary/10 shadow-[var(--shadow-sm)] scale-105'
                      : 'border-border/70 hover:border-border hover:bg-secondary/60'
                  )}
                >
                  <PremiumMoodIcon mood={mood.value} size="md" selected={formData.mood === mood.value} className="h-10 w-10 sm:h-12 sm:w-12" />
                  <span className="text-[10px] sm:text-xs font-medium text-foreground/85 break-words text-center leading-tight">{t(mood.labelKey)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Emotions */}
          <div>
            <label className="text-sm font-medium text-foreground mb-3 block">
              {t('mood_tracker.form.emotions_question')}
            </label>
            <div className="flex flex-wrap gap-2">
              {emotions.map((emotion) => (
                <button
                  key={emotion}
                  type="button"
                  aria-pressed={formData.emotions?.includes(emotion)}
                  onClick={() => toggleItem('emotions', emotion)}
                  className={cn(
                    'min-h-11 rounded-full border px-3 py-2 text-sm font-medium transition-all',
                    formData.emotions?.includes(emotion)
                      ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                      : 'border-border/70 bg-secondary text-foreground hover:bg-secondary/80'
                  )}
                >
                  {taxonomyLabel('emotions', emotion)}
                </button>
              ))}
            </div>
          </div>

          {/* Intensity */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              {t('mood_tracker.form.intensity_label')}: {formData.intensity}/10
            </label>
            <Slider
              value={[formData.intensity]}
              onValueChange={([value]) => setFormData({ ...formData, intensity: value })}
              min={1}
              max={10}
              step={1}
              className="w-full"
              aria-label={t('mood_tracker.form.intensity_label')}
              aria-valuetext={t('mood_tracker.form.value_out_of_ten', { label: t('mood_tracker.form.intensity_label'), value: formData.intensity })}
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>{t('mood_tracker.form.mild')}</span>
              <span>{t('mood_tracker.form.intense')}</span>
            </div>
          </div>

          {/* Energy Level */}
          <div>
            <label className="text-sm font-medium text-foreground mb-3 block">{t('mood_tracker.form.energy_level')}</label>
            <div className="grid grid-cols-5 gap-1 sm:gap-2">
              {energyLevelsConfig.map((level) => {
                const Icon = level.icon;
                return (
                  <button
                    key={level.value}
                    type="button"
                    aria-pressed={formData.energy_level === level.value}
                    onClick={() => setFormData({ ...formData, energy_level: level.value })}
                    className={cn(
                      'flex flex-col items-center gap-1 p-2 sm:p-3 rounded-xl border-2 transition-all',
                      formData.energy_level === level.value
                        ? 'border-primary/40 bg-primary/10'
                        : 'border-border/70 hover:border-border hover:bg-secondary/50'
                    )}
                  >
                    <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="text-[10px] sm:text-xs break-words text-center leading-tight">{t(level.labelKey)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sleep Quality */}
          <div>
            <label className="text-sm font-medium text-foreground mb-3 block">{t('mood_tracker.form.sleep_quality')}</label>
            <div className="grid grid-cols-4 gap-1 sm:gap-2">
              {sleepQualitiesConfig.map((quality) => {
                const Icon = quality.icon;
                return (
                  <button
                    key={quality.value}
                    type="button"
                    aria-pressed={formData.sleep_quality === quality.value}
                    onClick={() => setFormData({ ...formData, sleep_quality: quality.value })}
                    className={cn(
                      'flex flex-col items-center gap-1 p-2 sm:p-3 rounded-xl border-2 transition-all',
                      formData.sleep_quality === quality.value
                        ? 'border-primary/40 bg-primary/10'
                        : 'border-border/70 hover:border-border hover:bg-secondary/50'
                    )}
                  >
                    <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="text-[10px] sm:text-xs break-words text-center leading-tight">{t(quality.labelKey)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Stress Level */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              {t('mood_tracker.form.stress_level')}: {formData.stress_level}/10
            </label>
            <Slider
              value={[formData.stress_level]}
              onValueChange={([value]) => setFormData({ ...formData, stress_level: value })}
              min={1}
              max={10}
              step={1}
              className="w-full"
              aria-label={t('mood_tracker.form.stress_level')}
              aria-valuetext={t('mood_tracker.form.value_out_of_ten', { label: t('mood_tracker.form.stress_level'), value: formData.stress_level })}
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>{t('mood_tracker.form.relaxed')}</span>
              <span>{t('mood_tracker.form.very_stressed')}</span>
            </div>
          </div>

          {/* Triggers */}
          <div>
            <label className="text-sm font-medium text-foreground mb-3 block">
              {t('mood_tracker.form.triggers_question')}
            </label>
            <div className="flex flex-wrap gap-2">
              {commonTriggers.map((trigger) => (
                <button
                  key={trigger}
                  type="button"
                  aria-pressed={formData.triggers?.includes(trigger)}
                  onClick={() => toggleItem('triggers', trigger)}
                  className={cn(
                    'min-h-11 rounded-full border px-3 py-2 text-sm font-medium transition-all',
                    formData.triggers?.includes(trigger)
                      ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                      : 'border-border/70 bg-secondary text-foreground hover:bg-secondary/80'
                  )}
                >
                  {taxonomyLabel('triggers', trigger)}
                </button>
              ))}
            </div>
          </div>

          {/* Activities */}
          <div>
            <label className="text-sm font-medium text-foreground mb-3 block">
              {t('mood_tracker.form.activities_question')}
            </label>
            <div className="flex flex-wrap gap-2">
              {commonActivities.map((activity) => (
                <button
                  key={activity}
                  type="button"
                  aria-pressed={formData.activities?.includes(activity)}
                  onClick={() => toggleItem('activities', activity)}
                  className={cn(
                    'min-h-11 rounded-full border px-3 py-2 text-sm font-medium transition-all',
                    formData.activities?.includes(activity)
                      ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                      : 'border-border/70 bg-secondary text-foreground hover:bg-secondary/80'
                  )}
                >
                  {taxonomyLabel('activities', activity)}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              {t('mood_tracker.form.notes_label')}
            </label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder={t('mood_tracker.form.notes_placeholder')}
              className="h-32 rounded-xl"
            />
          </div>

          {/* Actions */}
          {saveError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 mb-3">
              {saveError}
            </div>
          )}
          <div className="sticky bottom-0 -mx-4 sm:-mx-6 px-4 sm:px-6 pt-4 pb-1 bg-card/95 backdrop-blur-xl border-t border-border/60 flex flex-col-reverse sm:flex-row gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1">
              {t('common.cancel')}
            </Button>
            <Button
              onClick={() => {
                if (isSavingRef.current || saveMutation.isPending) return;
                isSavingRef.current = true;
                setSaveError(null);
                saveMutation.mutate(formData);
              }}
              disabled={isSavingRef.current || saveMutation.isPending}
              className="flex-1 shadow-[var(--shadow-md)]"
            >
              {saveMutation.isPending ? t('mood_tracker.form.saving') : entry ? t('mood_tracker.form.update_entry') : t('mood_tracker.form.save_entry')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </PremiumDialog>
  );
}
