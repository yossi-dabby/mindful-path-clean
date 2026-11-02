import BotanicalAccent from '@/components/brand/BotanicalAccent';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { X, ChevronRight, ChevronLeft, Sparkles, Brain, Frown, AlertCircle, Zap, Flame, Users, Target, Cloud, HeartCrack, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import PremiumIcon from '@/components/ui/PremiumIcon';

const thoughtTypes = [
  {
    type: 'fear_anxiety',
    label: 'Fear / Anxiety',
    description: 'Worried about the future, feeling nervous or scared',
    icon: Frown,
    color: '#9F7AEA',
    bgColor: 'rgba(159, 122, 234, 0.15)'
  },
  {
    type: 'self_criticism',
    label: 'Self-Criticism / Failure',
    description: 'Harsh self-judgment, feeling like you failed',
    icon: AlertCircle,
    color: '#ED8936',
    bgColor: 'rgba(237, 137, 54, 0.15)'
  },
  {
    type: 'catastrophizing',
    label: 'Catastrophizing',
    description: 'Expecting the worst possible outcome',
    icon: Zap,
    color: '#F56565',
    bgColor: 'rgba(245, 101, 101, 0.15)'
  },
  {
    type: 'guilt_shame',
    label: 'Guilt / Shame',
    description: 'Feeling bad about something you did or who you are',
    icon: HeartCrack,
    color: '#805AD5',
    bgColor: 'rgba(128, 90, 213, 0.15)'
  },
  {
    type: 'anger_resentment',
    label: 'Anger / Resentment',
    description: 'Frustrated, upset, or holding a grudge',
    icon: Flame,
    color: '#E53E3E',
    bgColor: 'rgba(229, 62, 62, 0.15)'
  },
  {
    type: 'social_anxiety',
    label: 'Social Anxiety',
    description: 'Worried about what others think or social situations',
    icon: Users,
    color: '#4299E1',
    bgColor: 'rgba(66, 153, 225, 0.15)'
  },
  {
    type: 'perfectionism',
    label: 'Perfectionism',
    description: 'Setting impossible standards, fear of mistakes',
    icon: Target,
    color: '#38B2AC',
    bgColor: 'rgba(56, 178, 172, 0.15)'
  },
  {
    type: 'overthinking',
    label: 'Overthinking / Uncertainty',
    description: 'Can\'t stop analyzing, stuck in loops, confused',
    icon: Cloud,
    color: 'hsl(var(--muted-foreground))',
    bgColor: 'rgba(113, 128, 150, 0.15)'
  },
  {
    type: 'hopelessness',
    label: 'Hopelessness',
    description: 'Feeling like nothing will get better',
    icon: HeartCrack,
    color: 'hsl(var(--foreground))',
    bgColor: 'rgba(45, 55, 72, 0.15)'
  },
  {
    type: 'other',
    label: 'Other / Free Thought',
    description: 'Something else, or just want to journal freely',
    icon: HelpCircle,
    color: 'hsl(var(--primary))',
    bgColor: 'hsl(var(--secondary))'
  }
];

const emotionOptions = [
  'anxious', 'worried', 'sad', 'angry', 'frustrated', 'guilty', 'ashamed',
  'hopeless', 'overwhelmed', 'confused', 'scared', 'lonely', 'disappointed'
];

export default function ThoughtCoachWizard({ onClose }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    thought_type: '',
    situation: '',
    automatic_thoughts: '',
    emotions: [],
    emotion_intensity: 5,
    balanced_thought: ''
  });

  const createJournalMutation = useMutation({
    mutationFn: async (data) => {
      // Validate data
      if (!data.thought_type || !data.situation || !data.automatic_thoughts || !data.emotions.length) {
        throw new Error('Please fill in all required fields');
      }

      // Create journal entry directly
      const journalData = {
        entry_type: 'cbt_standard',
        situation: data.situation,
        automatic_thoughts: data.automatic_thoughts,
        emotions: data.emotions,
        emotion_intensity: data.emotion_intensity,
        tags: [data.thought_type]
      };

      // Add balanced_thought only if provided
      if (data.balanced_thought && data.balanced_thought.trim()) {
        journalData.balanced_thought = data.balanced_thought.trim();
      }

      const entry = await base44.entities.ThoughtJournal.create(journalData);
      
      if (!entry || !entry.id) {
        throw new Error('Failed to create journal entry');
      }

      return entry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['thoughtJournals'] });
      onClose();
    },
    onError: (error) => {
      console.error('Journal creation error:', error);
    }
  });

  const toggleEmotion = (emotion) => {
    setFormData(prev => {
      const updated = prev.emotions.includes(emotion)
        ? prev.emotions.filter(e => e !== emotion)
        : [...prev.emotions, emotion];
      return { ...prev, emotions: updated };
    });
  };

  const canProceed = () => {
    if (step === 1) return !!formData.thought_type;
    if (step === 2) return formData.situation?.trim().length > 0 && formData.automatic_thoughts?.trim().length > 0 && formData.emotions.length > 0;
    if (step === 3) return true; // CBT step - balanced_thought is optional
    if (step === 4) return true; // Review - all validation done
    return false;
  };

  const handleSubmit = () => {
    // Prevent double submission
    if (createJournalMutation.isPending) return;

    // Final validation
    if (!formData.thought_type || !formData.situation?.trim() || !formData.automatic_thoughts?.trim() || !formData.emotions.length) {
      return;
    }

    createJournalMutation.mutate({
      ...formData,
      situation: formData.situation.trim(),
      automatic_thoughts: formData.automatic_thoughts.trim()
    });
  };

  const selectedThought = thoughtTypes.find(t => t.type === formData.thought_type);

  return (
    <div className="garden-flow-shell fixed inset-0 flex flex-col w-full overflow-x-hidden" style={{ zIndex: 70 }}>
      {/* Header - Sticky on mobile */}
      <div className="bg-[hsl(var(--card)/0.97)] border-b shadow-sm sticky top-0 flex-shrink-0 overflow-x-hidden" style={{ zIndex: 10 }}>
        <div className="max-w-2xl mx-auto p-4 w-full">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="botanical-title-row"><h1 className="text-xl font-semibold text-foreground">{t('thought_coach.title')}</h1><BotanicalAccent variant="leaves" className="botanical-title-art" /></div>
                <p className="text-sm text-muted-foreground">{t('thought_coach.step_label', { step })}</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={step > 1 ? () => setStep(step - 1) : onClose} aria-label={step > 1 ? t('thought_coach.go_back_step_aria') : t('thought_coach.close_aria')}>
              {step > 1 ? (
                <ChevronLeft className="w-5 h-5" />
              ) : (
                <X className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Content - Scrollable */}
      <div className="flex-1 overflow-y-auto min-h-0" style={{ overscrollBehavior: 'none' }}>
        <div className="max-w-2xl mx-auto p-4 md:p-6 pb-32 w-full">
          {/* Step 1: Select Thought Type */}
          {step === 1 && (
            <div className="space-y-6" data-testid="thoughtcoach-step-1">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{t('thought_coach.step_thought_type_title')}</h3>
                <p className="text-sm text-muted-foreground mb-4">{t('thought_coach.step_thought_type_subtitle')}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {thoughtTypes.map((thought) => {
                  const Icon = thought.icon;
                  const categoryId = thought.type.replace(/_/g, '-');
                  return (
                    <button
                      key={thought.type}
                      type="button"
                      role="button"
                      aria-pressed={formData.thought_type === thought.type}
                      data-testid={`thoughtcoach-category-${categoryId}`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setFormData(prev => ({ ...prev, thought_type: thought.type }));
                      }}
                      className={cn(
                        'p-4 rounded-xl border-2 text-left transition-all hover:shadow-lg',
                        formData.thought_type === thought.type
                          ? 'border-border bg-secondary/70 shadow-md'
                          : 'border-gray-200 hover:border-gray-300'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div 
                          className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: thought.color }}
                        >
                          <Icon className="w-6 h-6 text-white" strokeWidth={2.5} />
                        </div>
                        <div>
                          <h4 className="font-semibold text-foreground">{t(`thought_coach.thought_types.${thought.type}.label`)}</h4>
                          <p className="text-xs text-muted-foreground mt-1">{t(`thought_coach.thought_types.${thought.type}.description`)}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 2: Describe the Thought */}
          {step === 2 && (
            <div className="space-y-6" data-testid="thoughtcoach-step-2">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{t('thought_coach.step_details_title')}</h3>
                <p className="text-sm text-muted-foreground mb-4">{t('thought_coach.step_details_subtitle')}</p>
              </div>

              {selectedThought && (
                <Card className="border-2 border-border bg-secondary/70">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: selectedThought.color }}
                      >
                        <selectedThought.icon className="w-5 h-5 text-white" strokeWidth={2.5} />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{t(`thought_coach.thought_types.${selectedThought.type}.label`)}</p>
                        <p className="text-xs text-muted-foreground">{t(`thought_coach.thought_types.${selectedThought.type}.description`)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  What situation triggered this thought? <span className="text-red-500">*</span>
                </label>
                <Textarea
                  value={formData.situation}
                  onChange={(e) => setFormData(prev => ({ ...prev, situation: e.target.value }))}
                  placeholder={t('thought_coach.step_details_situation_placeholder')}
                  className="h-32 rounded-xl"
                  data-testid="thoughtcoach-situation-input"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  What are the automatic thoughts going through your mind? <span className="text-red-500">*</span>
                </label>
                <Textarea
                  value={formData.automatic_thoughts}
                  onChange={(e) => setFormData(prev => ({ ...prev, automatic_thoughts: e.target.value }))}
                  placeholder={t('thought_coach.step_details_thoughts_placeholder')}
                  className="h-32 rounded-xl"
                  data-testid="thoughtcoach-thoughts-input"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground mb-3 block">
                  What emotions are you feeling? (Select all that apply) <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-wrap gap-2" data-testid="thoughtcoach-emotions-picker">
                  {emotionOptions.map((emotion) => (
                    <Badge
                      key={emotion}
                      onClick={() => toggleEmotion(emotion)}
                      data-testid={`emotion-${emotion}`}
                      className={cn(
                        'cursor-pointer capitalize transition-all',
                        formData.emotions.includes(emotion)
                          ? 'bg-primary text-white'
                          : 'bg-gray-100 text-muted-foreground hover:bg-gray-200'
                      )}
                    >
                      {t(`thought_coach.emotion_options.${emotion}`)}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  How intense are these emotions? ({formData.emotion_intensity}/10)
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={formData.emotion_intensity}
                  onChange={(e) => setFormData(prev => ({ ...prev, emotion_intensity: parseInt(e.target.value) }))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>{t('thought_coach.step_intensity_mild')}</span>
                  <span>{t('thought_coach.step_intensity_intense')}</span>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: CBT Intervention */}
          {step === 3 && (
            <div className="space-y-6" data-testid="thoughtcoach-step-3">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{t('thought_coach.step_analysis_title')}</h3>
                <p className="text-sm text-muted-foreground mb-4">{t('thought_coach.step_analysis_subtitle')}</p>
              </div>

              {selectedThought && (
                <Card className="border-2 border-border bg-secondary/70">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: selectedThought.color }}
                      >
                        <selectedThought.icon className="w-5 h-5 text-white" strokeWidth={2.5} />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{t(`thought_coach.thought_types.${selectedThought.type}.label`)}</p>
                        <p className="text-xs text-muted-foreground mt-1 italic">"{formData.automatic_thoughts}"</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <div className="space-y-3">
                  <p className="text-sm font-medium text-blue-900 mb-3">{t('thought_coach.reflect_questions_label')}</p>
                  <div className="space-y-2 text-sm text-blue-800">
                    <div className="flex gap-2">
                      <span className="text-blue-600">•</span>
                      <p>{t('thought_coach.reflect_q1')}</p>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-blue-600">•</span>
                      <p>{t('thought_coach.reflect_q2')}</p>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-blue-600">•</span>
                      <p>{t('thought_coach.reflect_q3')}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-secondary/70 border border-border rounded-xl">
                <p className="text-sm text-primary text-center">
                  <PremiumIcon name="idea" size="sm" bare className="me-1 inline" /> Noticing and examining a thought is already an important CBT skill.
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  Balanced / Helpful Thought (Optional)
                </label>
                <Textarea
                  value={formData.balanced_thought}
                  onChange={(e) => setFormData(prev => ({ ...prev, balanced_thought: e.target.value }))}
                  placeholder={t('thought_coach.step_analysis_balanced_placeholder')}
                  className="h-32 rounded-xl"
                  data-testid="thoughtcoach-balanced-input"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  This is optional - you can always add it later in your journal.
                </p>
              </div>
            </div>
          )}

          {/* Step 4: Review & Confirm */}
          {step === 4 && (
            <div className="space-y-6" data-testid="thoughtcoach-step-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{t('thought_coach.step_review_title')}</h3>
                <p className="text-sm text-muted-foreground mb-4">{t('thought_coach.step_review_subtitle')}</p>
              </div>

              {selectedThought && (
                <Card className="border-2 border-border bg-secondary/70">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: selectedThought.color }}
                      >
                        <selectedThought.icon className="w-5 h-5 text-white" strokeWidth={2.5} />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{t(`thought_coach.thought_types.${selectedThought.type}.label`)}</p>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-muted-foreground font-medium">{t('thought_coach.field_situation')}</span>
                        <p className="text-foreground mt-1">{formData.situation}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground font-medium">{t('thought_coach.field_thoughts')}</span>
                        <p className="text-foreground mt-1">{formData.automatic_thoughts}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground font-medium">{t('thought_coach.field_emotions')}</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {formData.emotions.map((emotion) => (
                            <Badge key={emotion} variant="secondary" className="text-xs capitalize">
                              {t(`thought_coach.emotion_options.${emotion}`)}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground font-medium">{t('thought_coach.field_intensity')}</span>
                        <span className="text-foreground ml-2">{formData.emotion_intensity}/10</span>
                      </div>
                      {formData.balanced_thought && formData.balanced_thought.trim() && (
                        <div>
                          <span className="text-muted-foreground font-medium">{t('thought_coach.field_balanced')}</span>
                          <p className="text-foreground mt-1">{formData.balanced_thought}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-green-900 font-medium mb-1">{t('thought_coach.what_next_label')}</p>
                    <p className="text-sm text-green-700">
                      {t('thought_coach.what_next_text')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Navigation - Fixed at bottom above mobile nav */}
      <div className="bg-[hsl(var(--card)/0.97)] border-t shadow-lg fixed bottom-0 left-0 right-0 flex-shrink-0" style={{ marginBottom: 'calc(80px + env(safe-area-inset-bottom, 0))', zIndex: 10 }}>
        <div className="max-w-2xl mx-auto p-4 w-full overflow-x-hidden">
          <div className="flex gap-3">
            {step > 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(step - 1)}
                disabled={createJournalMutation.isPending}
                data-testid="thoughtcoach-back"
                className="flex-1"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                {t('thought_coach.back_button')}
              </Button>
            )}
            {step < 4 ? (
              <Button
                type="button"
                onClick={() => setStep(step + 1)}
                disabled={!canProceed()}
                data-testid="thoughtcoach-next"
                className="flex-1 bg-primary hover:bg-primary/90"
              >
                {t('thought_coach.next_button')}
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={!canProceed() || createJournalMutation.isPending}
                data-testid="thoughtcoach-save"
                className="flex-1 bg-primary hover:bg-primary/90"
              >
                {createJournalMutation.isPending ? (
                  <>
                    <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                    {t('thought_coach.saving_button')}
                  </>
                ) : (
                  <>
                    <Brain className="w-4 h-4 mr-2" />
                    {t('thought_coach.save_button')}
                  </>
                )}
              </Button>
            )}
          </div>
          
          {/* Error Display */}
          {createJournalMutation.isError && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">
                Failed to save journal entry. Please try again.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}