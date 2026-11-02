import BotanicalAccent from '@/components/brand/BotanicalAccent';
import React, { useEffect, useRef, useState } from 'react';
import PremiumDialog from '@/components/ui/PremiumDialog';
import { base44 } from '@/api/base44Client';
import { ACTIVE_AI_COACH_WIRING } from '@/api/activeAgentWiring.js';
import { buildCompanionSessionStartContextAsync } from '@/lib/companionContinuity.js';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { X, ChevronRight, ChevronLeft, Sparkles, Target, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import PremiumIcon from '@/components/ui/PremiumIcon';

const focusAreaDefinitions = [
  { value: 'mood_improvement', icon: 'sun' },
  { value: 'stress_management', icon: 'waves' },
  { value: 'goal_achievement', icon: 'target' },
  { value: 'behavior_change', icon: 'movement' },
  { value: 'relationship', icon: 'heart' },
  { value: 'self_esteem', icon: 'sparkle' },
  { value: 'general', icon: 'star' }
];


export default function CoachingSessionWizard({ onClose, onSessionCreated }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const contentScrollRef = useRef(null);
  const focusAreas = focusAreaDefinitions.map((area) => ({
    ...area,
    label: t(`coach.focus.${area.value}.label`),
    description: t(`coach.focus.${area.value}.description`)
  }));
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    title: '',
    focus_area: '',
    current_challenge: '',
    desired_outcome: '',
    related_goals: [],
    stage: 'discovery'
  });

  const { data: recentMoods } = useQuery({
    queryKey: ['recentMoods'],
    queryFn: () => base44.entities.MoodEntry.list('-date', 7),
    initialData: []
  });

  const { data: goals } = useQuery({
    queryKey: ['activeGoals'],
    queryFn: () => base44.entities.Goal.filter({ status: 'active' }),
    initialData: []
  });

  const { data: recentJournals } = useQuery({
    queryKey: ['recentJournals'],
    queryFn: () => base44.entities.ThoughtJournal.list('-created_date', 5),
    initialData: []
  });

  const createSessionMutation = useMutation({
    mutationFn: async (data) => {
      // Validate data
      if (!data.title || !data.focus_area || !data.current_challenge || !data.desired_outcome) {
        throw new Error('Missing required fields');
      }

      // Create session with proper field mapping
      const sessionData = {
        title: data.title,
        focus_area: data.focus_area,
        current_challenge: data.current_challenge,
        desired_outcome: data.desired_outcome,
        related_goals: data.related_goals || [],
        status: 'active',
        stage: 'discovery',
        current_stage: 'understanding',
        action_plan: []
      };

      const session = await base44.entities.CoachingSession.create(sessionData);

      if (!session || !session.id) {
        throw new Error('Failed to create coaching session');
      }

      // Create AI conversation
      try {
        let memoryContext = '';
        try {
          memoryContext = await buildCompanionSessionStartContextAsync(
            base44.entities,
            ACTIVE_AI_COACH_WIRING,
          );
        } catch {
          // Fail-closed: session start continues without context
        }

        const conversation = await base44.agents.createConversation({
          agent_name: ACTIVE_AI_COACH_WIRING.name,
          tool_configs: ACTIVE_AI_COACH_WIRING.tool_configs,
          metadata: {
            name: `Coaching: ${data.title}`,
            type: 'coaching_session',
            session_id: session.id,
            memory_context: memoryContext,
          }
        });

        if (conversation && conversation.id) {
          // Update session with conversation ID
          await base44.entities.CoachingSession.update(session.id, {
            agent_conversation_id: conversation.id
          });
          session.agent_conversation_id = conversation.id;

          // Send initial coaching message
          await base44.agents.addMessage(conversation, {
            role: 'user',
            content: t('coach.wizard.ai_opening', {
              focus: t(`coach.focus.${data.focus_area}.label`),
              challenge: data.current_challenge,
              outcome: data.desired_outcome
            })
          });
        }
      } catch (convError) {
        console.error('Conversation creation failed, but session was created:', convError);
        // Continue anyway - session is created
      }

      return session;
    },
    onSuccess: (session) => {
      queryClient.invalidateQueries({ queryKey: ['coachingSessions'] });
      if (onSessionCreated) onSessionCreated(session);
      else onClose();
    },
    onError: (error) => {
      console.error('Session creation error:', error);
    }
  });

  const moodInsight = recentMoods.length >= 3 &&
  recentMoods.slice(0, 3).every((m) => ['low', 'very_low'].includes(m.mood)) ?
  t('coach.wizard.mood_insight') :
  null;

  const toggleGoal = (goalId) => {
    const updated = formData.related_goals.includes(goalId) ?
    formData.related_goals.filter((id) => id !== goalId) :
    [...formData.related_goals, goalId];
    setFormData({ ...formData, related_goals: updated });
  };

  useEffect(() => {
    // Each wizard stage starts at its heading, even after scrolling on iOS.
    if (contentScrollRef.current) contentScrollRef.current.scrollTop = 0;
  }, [step]);

  const canProceed = () => {
    if (step === 1) return formData.focus_area;
    if (step === 2) return formData.current_challenge && formData.desired_outcome;
    if (step === 3) return formData.title;
    return false;
  };

  const handleSubmit = () => {
    // Prevent double submission
    if (createSessionMutation.isPending) return;

    // Final validation
    if (!formData.title?.trim() || !formData.focus_area || !formData.current_challenge?.trim() || !formData.desired_outcome?.trim()) {
      return;
    }

    createSessionMutation.mutate({
      ...formData,
      title: formData.title.trim(),
      current_challenge: formData.current_challenge.trim(),
      desired_outcome: formData.desired_outcome.trim()
    });
  };

  return (
    <PremiumDialog label={t('coach.wizard.title')} onClose={onClose} localEscape data-testid="coach-wizard" className="garden-flow-shell flex w-full flex-col bg-background text-foreground" style={{ position: 'fixed', inset: 0, height: '100dvh', overflow: 'hidden', zIndex: 70, paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      {/* Header */}
      <div className="border-b border-border/70 bg-card/95 shadow-[0_10px_30px_rgba(42,103,91,0.08)] backdrop-blur-xl flex-shrink-0" style={{ zIndex: 10 }}>
        <div className="max-w-3xl mx-auto px-4 py-3 sm:px-6 sm:py-4 w-full">
          <div className="flex min-w-0 items-center justify-between gap-3">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="h-12 w-12 shrink-0 rounded-2xl bg-primary text-primary-foreground shadow-[0_12px_24px_rgba(13,148,136,0.24)] flex items-center justify-center">
                <Target className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="botanical-title-row"><h1 className="break-words text-lg font-bold leading-tight tracking-tight text-foreground sm:text-xl">{t('coach.wizard.title')}</h1><BotanicalAccent variant="leaves" className="botanical-title-art" /></div>
                <p className="text-sm font-semibold text-primary">{t('coach.wizard.step', { step })}</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={step > 1 ? () => setStep(step - 1) : onClose} aria-label={step > 1 ? t('coach.wizard.back_aria') : t('coach.wizard.close_aria')} className="shrink-0 text-foreground font-medium tracking-[0.005em] leading-none rounded-[var(--radius-control)] inline-flex items-center justify-center gap-2 whitespace-nowrap border border-transparent transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow-none hover:bg-secondary/78 hover:text-foreground active:bg-secondary/88 h-9 w-9 min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0">
              {step > 1 ?
              <ChevronLeft className="h-5 w-5 rtl:scale-x-[-1]" /> :

              <X className="w-5 h-5" />
              }
            </Button>
          </div>
          <div className="mt-3 flex items-center gap-2" aria-hidden="true">
            {[1, 2, 3].map((item) => (
              <span key={item} className={`h-1.5 flex-1 rounded-full transition-colors ${item <= step ? 'bg-primary' : 'bg-teal-900/10'}`} />
            ))}
          </div>
        </div>
      </div>

      {/* Content - Scrollable */}
      <div ref={contentScrollRef} className="flex-1 overflow-y-auto" style={{ minHeight: 0, overscrollBehavior: 'none', WebkitOverflowScrolling: 'touch' }}>
        <div className="mx-auto w-full max-w-3xl px-4 py-5 pb-8 sm:px-6 sm:py-7">
          {/* Step 1: Focus Area */}
          {step === 1 &&
          <div className="space-y-6 rounded-[28px] border border-border/70 bg-card/95 p-4 shadow-[0_24px_60px_rgba(42,103,91,0.13)] backdrop-blur-xl sm:p-7">
              <div>
                <h2 className="mb-2 text-xl font-bold tracking-tight text-foreground sm:text-2xl">{t('coach.wizard.focus_title')}</h2>
                <p className="mb-4 text-sm leading-6 text-muted-foreground">{t('coach.wizard.focus_description')}</p>
              </div>

              {moodInsight &&
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-3">
                  <Lightbulb className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-amber-800 dark:text-amber-300">{moodInsight}</p>
                </div>
            }

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {focusAreas.map((area) =>
              <button
                key={area.value}
                data-testid={`coach-focus-${area.value}`}
                onClick={() => setFormData({ ...formData, focus_area: area.value })}
                type="button"
                aria-pressed={formData.focus_area === area.value}
                className={cn(
                  'min-h-[100px] p-4 rounded-[20px] border text-start transition-all hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                  formData.focus_area === area.value ?
                  'border-border bg-secondary/70 shadow-[0_12px_28px_rgba(42,103,91,0.14)] ring-1 ring-ring' :
                  'border-border bg-card/95 shadow-sm hover:border-border'
                )}>

                    <div className="flex items-start gap-3">
                      <PremiumIcon name={area.icon} size="md" className="shrink-0" />
                      <div>
                        <h4 className="font-semibold text-foreground">{area.label}</h4>
                        <p className="text-xs text-muted-foreground mt-1">{area.description}</p>
                      </div>
                    </div>
                  </button>
              )}
              </div>
            </div>
          }

          {/* Step 2: Challenge & Outcome */}
          {step === 2 &&
          <div className="space-y-6 rounded-[28px] border border-border/70 bg-card/95 p-4 shadow-[0_24px_60px_rgba(42,103,91,0.13)] backdrop-blur-xl sm:p-7">
              <div>
                <h2 className="mb-2 text-xl font-bold tracking-tight text-foreground sm:text-2xl">{t('coach.wizard.details_title')}</h2>
                <p className="mb-4 text-sm leading-6 text-muted-foreground">{t('coach.wizard.details_description')}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  {t('coach.wizard.challenge_label')}
                </label>
                <Textarea
                value={formData.current_challenge}
                onChange={(e) => setFormData({ ...formData, current_challenge: e.target.value })}
                placeholder={t('coach.wizard.challenge_placeholder')}
                className="min-h-32 rounded-2xl border-border bg-[hsl(var(--card)/0.97)] text-base text-foreground shadow-sm placeholder:text-slate-400 focus-visible:border-border focus-visible:ring-ring" />

              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  {t('coach.wizard.outcome_label')}
                </label>
                <Textarea
                value={formData.desired_outcome}
                onChange={(e) => setFormData({ ...formData, desired_outcome: e.target.value })}
                placeholder={t('coach.wizard.outcome_placeholder')}
                className="min-h-32 rounded-2xl border-border bg-[hsl(var(--card)/0.97)] text-base text-foreground shadow-sm placeholder:text-slate-400 focus-visible:border-border focus-visible:ring-ring" />

              </div>

              {goals.length > 0 &&
            <div>
                  <label className="text-sm font-medium text-foreground mb-3 block">
                    {t('coach.wizard.related_goals')}
                  </label>
                  <div className="space-y-2">
                    {goals.map((goal) =>
                <button
                  type="button"
                  key={goal.id}
                  onClick={() => toggleGoal(goal.id)}
                  aria-pressed={formData.related_goals.includes(goal.id)}
                  className={cn(
                    'w-full p-3 rounded-xl border-2 cursor-pointer text-start transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                    formData.related_goals.includes(goal.id) ?
                    'border-primary bg-primary/8' :
                    'border-border bg-card/95 shadow-sm hover:border-border'
                  )}>

                        <div className="flex items-center justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                              <Target className="w-4 h-4 text-primary" />
                            </div>
                            <span className="truncate font-medium text-foreground">{goal.title}</span>
                          </div>
                          {formData.related_goals.includes(goal.id) &&
                    <Badge className="shrink-0 bg-primary">{t('coach.wizard.selected')}</Badge>
                    }
                        </div>
                      </button>
                )}
                  </div>
                </div>
            }
            </div>
          }

          {/* Step 3: Title & Confirm */}
          {step === 3 &&
          <div className="space-y-6 rounded-[28px] border border-border/70 bg-card/95 p-4 shadow-[0_24px_60px_rgba(42,103,91,0.13)] backdrop-blur-xl sm:p-7">
              <div>
                <h2 className="mb-2 text-xl font-bold tracking-tight text-foreground sm:text-2xl">{t('coach.wizard.almost_title')}</h2>
                <p className="mb-4 text-sm leading-6 text-muted-foreground">{t('coach.wizard.almost_description')}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  {t('coach.wizard.session_title')}
                </label>
                <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder={t('coach.wizard.session_title_placeholder')}
                className="min-h-[48px] rounded-2xl border-border bg-[hsl(var(--card)/0.97)] text-base text-foreground shadow-sm placeholder:text-slate-400 focus-visible:border-border focus-visible:ring-ring" />

              </div>

              <Card className="rounded-[24px] border border-border bg-secondary/70 shadow-sm">
                <CardContent className="p-4 space-y-3">
                  <h3 className="font-semibold text-foreground">{t('coach.wizard.overview')}</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('coach.wizard.focus')}:</span>
                      <span className="font-medium text-foreground">
                        {focusAreas.find((a) => a.value === formData.focus_area)?.label}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('coach.wizard.related_goals_count')}:</span>
                      <span className="font-medium text-foreground">
                        {formData.related_goals.length}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="p-5 bg-card/95 border border-border rounded-[24px] shadow-sm">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="mb-1 text-sm font-semibold text-foreground">{t('coach.wizard.next_title')}</h3>
                    <p className="text-sm leading-6 text-muted-foreground">{t('coach.wizard.next_description')}</p>
                  </div>
                </div>
              </div>
            </div>
          }

        </div>
      </div>

      {/* Navigation - Sticky at bottom of fixed container */}
      <div className="border-t border-border/70 bg-card/95 shadow-[0_-10px_30px_rgba(42,103,91,0.08)] backdrop-blur-xl flex-shrink-0 safe-bottom-nav" style={{ zIndex: 10 }}>
        <div className="max-w-3xl mx-auto px-4 py-3 sm:px-6">
          <div className="flex gap-3">
            {step > 1 &&
            <Button
              variant="outline"
              onClick={() => setStep(step - 1)}
              disabled={createSessionMutation.isPending}
              className="min-h-12 flex-1 rounded-2xl border-border bg-card/95 text-primary hover:bg-[hsl(var(--card)/0.97)]">

                <ChevronLeft className="h-4 w-4 rtl:scale-x-[-1]" />
                {t('coach.wizard.back')}
              </Button>
            }
            {step < 3 ?
            <Button
              data-testid="coach-wizard-next"
              onClick={() => setStep(step + 1)}
              disabled={!canProceed()}
              className="min-h-12 flex-1 rounded-2xl bg-primary text-primary-foreground shadow-[0_12px_24px_rgba(13,148,136,0.2)] hover:bg-primary/90">

                {t('coach.wizard.next')}
                <ChevronRight className="h-4 w-4 rtl:scale-x-[-1]" />
              </Button> :

            <Button
              onClick={handleSubmit}
              disabled={!canProceed() || createSessionMutation.isPending}
              className="min-h-12 flex-1 rounded-2xl bg-primary text-primary-foreground shadow-[0_12px_24px_rgba(13,148,136,0.2)] hover:bg-primary/90">

                {createSessionMutation.isPending ?
              <>
                    <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                    {t('coach.wizard.starting')}
                  </> :

              <>
                    <Target className="w-4 h-4 mr-2" />
                    {t('coach.wizard.start')}
                  </>
              }
              </Button>
            }
          </div>
          
          {/* Error Display */}
          {createSessionMutation.isError &&
          <div className="mt-3 p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
              <p className="text-sm text-destructive">
                {t('coach.wizard.create_error')}
              </p>
            </div>
          }
        </div>
      </div>
    </PremiumDialog>
  );

}
