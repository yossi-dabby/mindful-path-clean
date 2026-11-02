import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle, Brain, ChevronLeft, ChevronRight, Cloud, Flame, Frown,
  HeartCrack, HelpCircle, Sparkles, Target, Users, Zap
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { createPageUrl } from '@/utils';
import { PremiumCoachShell, PremiumStepHeading, premiumInputClass } from '@/components/coach/PremiumCoachShell';
import { buildThoughtJournalPayload } from '@/components/coach/coachWizardUtils';

const thoughtTypesMeta = [
  { type: 'fear_anxiety', icon: Frown, tone: 'from-violet-500 to-purple-700' },
  { type: 'self_criticism', icon: AlertCircle, tone: 'from-amber-500 to-orange-600' },
  { type: 'catastrophizing', icon: Zap, tone: 'from-rose-500 to-red-700' },
  { type: 'guilt_shame', icon: HeartCrack, tone: 'from-fuchsia-500 to-violet-700' },
  { type: 'anger_resentment', icon: Flame, tone: 'from-orange-500 to-rose-700' },
  { type: 'social_anxiety', icon: Users, tone: 'from-sky-500 to-blue-700' },
  { type: 'perfectionism', icon: Target, tone: 'from-teal-500 to-emerald-700' },
  { type: 'overthinking', icon: Cloud, tone: 'from-slate-500 to-slate-700' },
  { type: 'hopelessness', icon: HeartCrack, tone: 'from-indigo-500 to-slate-800' },
  { type: 'other', icon: HelpCircle, tone: 'from-cyan-500 to-teal-700' }
];

const emotionKeys = [
  'anxious', 'worried', 'sad', 'angry', 'frustrated', 'guilty', 'ashamed',
  'hopeless', 'overwhelmed', 'confused', 'scared', 'lonely', 'disappointed'
];

export default function ThoughtCoachPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    thought_type: '', situation: '', automatic_thoughts: '', emotions: [],
    emotion_intensity: 5, balanced_thought: ''
  });

  const thoughtTypes = useMemo(() => thoughtTypesMeta.map((meta) => ({
    ...meta,
    label: t(`thought_coach.thought_types.${meta.type}.label`),
    description: t(`thought_coach.thought_types.${meta.type}.description`)
  })), [t]);
  const selectedThought = thoughtTypes.find((thought) => thought.type === formData.thought_type);
  const SelectedIcon = selectedThought?.icon;

  const createJournalMutation = useMutation({
    mutationFn: async (data) => {
      const entry = await base44.entities.ThoughtJournal.create(buildThoughtJournalPayload(data));
      if (!entry?.id) throw new Error('journal_create_failed');
      return entry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['thoughtJournals'] });
      navigate(createPageUrl('Home'));
    },
    onError: (error) => console.error('Journal creation error:', error)
  });

  const canProceed = step === 1
    ? Boolean(formData.thought_type)
    : step === 2
      ? Boolean(formData.situation.trim() && formData.automatic_thoughts.trim() && formData.emotions.length)
      : true;

  const toggleEmotion = (emotion) => setFormData((current) => ({
    ...current,
    emotions: current.emotions.includes(emotion)
      ? current.emotions.filter((item) => item !== emotion)
      : [...current.emotions, emotion]
  }));

  const footer = (
    <div>
      <div className="flex gap-3">
        {step > 1 && (
          <Button type="button" variant="outline" onClick={() => setStep((current) => current - 1)} disabled={createJournalMutation.isPending} className="min-h-12 flex-1 rounded-2xl border-border bg-[hsl(var(--card)/0.97)] text-primary hover:bg-[hsl(var(--card)/0.97)]" data-testid="thoughtcoach-back">
            <ChevronLeft className="me-2 h-4 w-4 rtl:rotate-180" aria-hidden="true" />{t('thought_coach.back_button')}
          </Button>
        )}
        {step < 4 ? (
          <Button type="button" onClick={() => canProceed && setStep((current) => current + 1)} disabled={!canProceed} className="min-h-12 flex-1 rounded-2xl bg-primary text-primary-foreground shadow-[0_12px_24px_rgba(13,148,136,0.22)] hover:bg-primary/90" data-testid="thoughtcoach-next">
            {t('thought_coach.next_button')}<ChevronRight className="ms-2 h-4 w-4 rtl:rotate-180" aria-hidden="true" />
          </Button>
        ) : (
          <Button type="button" onClick={() => !createJournalMutation.isPending && createJournalMutation.mutate(formData)} disabled={!canProceed || createJournalMutation.isPending} className="min-h-12 flex-1 rounded-2xl bg-primary text-primary-foreground shadow-[0_12px_24px_rgba(13,148,136,0.22)] hover:bg-primary/90" data-testid="thoughtcoach-save">
            {createJournalMutation.isPending ? <Sparkles className="me-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <Brain className="me-2 h-4 w-4" aria-hidden="true" />}
            {createJournalMutation.isPending ? t('thought_coach.saving_button') : t('thought_coach.save_button')}
          </Button>
        )}
      </div>
      {createJournalMutation.isError && <p className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-800" role="alert">{t('thought_coach.error_save')}</p>}
    </div>
  );

  return (
    <PremiumCoachShell
      icon={Brain} title={t('thought_coach.title')} step={step}
      stepLabel={t('thought_coach.step_label', { step })}
      onBack={() => setStep((current) => Math.max(1, current - 1))}
      onClose={() => navigate(createPageUrl('Home'))}
      backAriaLabel={t('thought_coach.go_back_step_aria')}
      closeAriaLabel={t('thought_coach.go_back_nav_aria')}
      footer={footer} testId="thoughtcoach-flow"
    >
      {step === 1 && (
        <div data-testid="thoughtcoach-step-1">
          <PremiumStepHeading title={t('thought_coach.step_thought_type_title')} subtitle={t('thought_coach.step_thought_type_subtitle')} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {thoughtTypes.map((thought) => {
              const Icon = thought.icon;
              const selected = formData.thought_type === thought.type;
              return (
                <button key={thought.type} type="button" onClick={() => setFormData((current) => ({ ...current, thought_type: thought.type }))} aria-pressed={selected} data-testid={`thoughtcoach-category-${thought.type.replaceAll('_', '-')}`} className={cn('group min-h-[108px] rounded-2xl border p-4 text-start shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2', selected ? 'border-border bg-secondary/70 shadow-md' : 'border-border bg-[hsl(var(--card)/0.97)] hover:-translate-y-0.5 hover:border-border hover:bg-[hsl(var(--card)/0.97)] hover:shadow-md')}>
                  <span className="flex items-start gap-3">
                    <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${thought.tone} text-white shadow-sm`}><Icon className="h-6 w-6" aria-hidden="true" /></span>
                    <span className="min-w-0"><span className="block font-bold leading-5 text-primary">{thought.label}</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">{thought.description}</span></span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {step === 2 && (
        <div data-testid="thoughtcoach-step-2">
          <PremiumStepHeading title={t('thought_coach.step_details_title')} subtitle={t('thought_coach.step_details_subtitle')} />
          {selectedThought && (
            <div className="mb-5 flex items-center gap-3 rounded-2xl border border-border bg-secondary/70 p-4">
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${selectedThought.tone} text-white`}><SelectedIcon className="h-5 w-5" aria-hidden="true" /></span>
              <div className="min-w-0"><p className="font-bold text-primary">{selectedThought.label}</p><p className="text-xs leading-5 text-muted-foreground">{selectedThought.description}</p></div>
            </div>
          )}
          <div className="space-y-5">
            <label className="block text-sm font-semibold text-primary">{t('thought_coach.step_details_situation_label')} <span className="text-rose-600" aria-hidden="true">*</span>
              <Textarea value={formData.situation} onChange={(event) => setFormData((current) => ({ ...current, situation: event.target.value }))} placeholder={t('thought_coach.step_details_situation_placeholder')} className={`${premiumInputClass} mt-2 min-h-28 resize-y`} data-testid="thoughtcoach-situation-input" required />
            </label>
            <label className="block text-sm font-semibold text-primary">{t('thought_coach.step_details_thoughts_label')} <span className="text-rose-600" aria-hidden="true">*</span>
              <Textarea value={formData.automatic_thoughts} onChange={(event) => setFormData((current) => ({ ...current, automatic_thoughts: event.target.value }))} placeholder={t('thought_coach.step_details_thoughts_placeholder')} className={`${premiumInputClass} mt-2 min-h-28 resize-y`} data-testid="thoughtcoach-thoughts-input" required />
            </label>
            <fieldset>
              <legend className="text-sm font-semibold text-primary">{t('thought_coach.step_details_emotions_label')} <span className="text-rose-600" aria-hidden="true">*</span></legend>
              <div className="mt-3 flex flex-wrap gap-2" data-testid="thoughtcoach-emotions-picker">
                {emotionKeys.map((emotion) => {
                  const selected = formData.emotions.includes(emotion);
                  return <button key={emotion} type="button" onClick={() => toggleEmotion(emotion)} aria-pressed={selected} data-testid={`thoughtcoach-emotion-${emotion}`} className={cn('min-h-11 rounded-full border px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', selected ? 'border-border bg-primary text-primary-foreground shadow-sm' : 'border-border bg-[hsl(var(--card)/0.97)] text-primary hover:bg-[hsl(var(--card)/0.97)]')}>{t(`thought_coach.emotion_options.${emotion}`)}</button>;
                })}
              </div>
            </fieldset>
            <label className="block text-sm font-semibold text-primary">{t('thought_coach.step_intensity_label', { value: formData.emotion_intensity })}
              <input type="range" min="1" max="10" value={formData.emotion_intensity} onChange={(event) => setFormData((current) => ({ ...current, emotion_intensity: Number(event.target.value) }))} className="mt-4 h-2 w-full cursor-pointer accent-teal-600" data-testid="thoughtcoach-intensity" />
              <span className="mt-2 flex justify-between text-xs font-medium text-muted-foreground"><span>{t('thought_coach.step_intensity_mild')}</span><span>{t('thought_coach.step_intensity_intense')}</span></span>
            </label>
          </div>
        </div>
      )}

      {step === 3 && (
        <div data-testid="thoughtcoach-step-3">
          <PremiumStepHeading title={t('thought_coach.step_analysis_title')} subtitle={t('thought_coach.step_analysis_subtitle')} />
          <div className="space-y-5">
            <div className="rounded-2xl border border-border bg-secondary/70 p-4"><p className="font-bold text-foreground">{t('thought_coach.reflect_questions_label')}</p><ul className="mt-3 list-disc space-y-2 ps-5 text-sm leading-6 text-foreground"><li>{t('thought_coach.reflect_q1')}</li><li>{t('thought_coach.reflect_q2')}</li><li>{t('thought_coach.reflect_q3')}</li></ul></div>
            <p className="rounded-2xl border border-border bg-secondary/70 p-4 text-center text-sm font-medium leading-6 text-primary">{t('thought_coach.step_analysis_cbt_note')}</p>
            <label className="block text-sm font-semibold text-primary">{t('thought_coach.step_analysis_balanced_label')}
              <Textarea value={formData.balanced_thought} onChange={(event) => setFormData((current) => ({ ...current, balanced_thought: event.target.value }))} placeholder={t('thought_coach.step_analysis_balanced_placeholder')} className={`${premiumInputClass} mt-2 min-h-32 resize-y`} data-testid="thoughtcoach-balanced-input" />
              <span className="mt-2 block text-xs font-normal leading-5 text-muted-foreground">{t('thought_coach.step_analysis_balanced_optional')}</span>
            </label>
          </div>
        </div>
      )}

      {step === 4 && (
        <div data-testid="thoughtcoach-step-4">
          <PremiumStepHeading title={t('thought_coach.step_review_title')} subtitle={t('thought_coach.step_review_subtitle')} />
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-[hsl(var(--card)/0.97)] p-4 shadow-sm">
              <div className="space-y-4 text-sm leading-6">
                <div><p className="font-bold text-primary">{t('thought_coach.field_situation')}</p><p className="mt-1 break-words text-muted-foreground">{formData.situation}</p></div>
                <div><p className="font-bold text-primary">{t('thought_coach.field_thoughts')}</p><p className="mt-1 break-words text-muted-foreground">{formData.automatic_thoughts}</p></div>
                <div><p className="font-bold text-primary">{t('thought_coach.field_emotions')}</p><div className="mt-2 flex flex-wrap gap-2">{formData.emotions.map((emotion) => <span key={emotion} className="rounded-full bg-secondary/70 px-3 py-1 text-xs font-semibold text-primary">{t(`thought_coach.emotion_options.${emotion}`)}</span>)}</div></div>
                <div><p className="font-bold text-primary">{t('thought_coach.field_intensity')}</p><p className="mt-1 text-muted-foreground">{formData.emotion_intensity}/10</p></div>
                {formData.balanced_thought.trim() && <div><p className="font-bold text-primary">{t('thought_coach.field_balanced')}</p><p className="mt-1 break-words text-muted-foreground">{formData.balanced_thought}</p></div>}
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-2xl border border-border bg-secondary/70 p-4"><Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" aria-hidden="true" /><div><p className="font-bold text-foreground">{t('thought_coach.what_next_label')}</p><p className="mt-1 text-sm leading-6 text-foreground">{t('thought_coach.what_next_text')}</p></div></div>
          </div>
        </div>
      )}
    </PremiumCoachShell>
  );
}
