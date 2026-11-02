import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Brain, ChevronLeft, ChevronRight, GraduationCap, HeartHandshake, HeartPulse,
  ListChecks, Minus, Plus, Shapes, Sparkles, Target, Users
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { PremiumCoachShell, PremiumStepHeading, premiumInputClass } from '@/components/coach/PremiumCoachShell';
import { buildGoalPayload, formatLocalDate } from '@/components/coach/coachWizardUtils';

const goalCategories = [
  { key: 'cognitive-study-work', value: 'cognitive', i18nKey: 'study_work', icon: GraduationCap, tone: 'from-violet-500 to-purple-700' },
  { key: 'lifestyle-health-habits', value: 'lifestyle', i18nKey: 'health_habits', icon: HeartPulse, tone: 'from-teal-500 to-emerald-700' },
  { key: 'emotional-emotions-stress', value: 'emotional', i18nKey: 'emotions_stress', icon: HeartHandshake, tone: 'from-amber-500 to-orange-700' },
  { key: 'cognitive-thoughts-confidence', value: 'cognitive', i18nKey: 'thoughts_confidence', icon: Brain, tone: 'from-fuchsia-500 to-violet-700' },
  { key: 'social-relationships-social', value: 'social', i18nKey: 'relationships_social', icon: Users, tone: 'from-sky-500 to-blue-700' },
  { key: 'behavioral-routine-productivity', value: 'behavioral', i18nKey: 'routine_productivity', icon: ListChecks, tone: 'from-orange-500 to-amber-700' },
  { key: 'lifestyle-self-care-wellbeing', value: 'lifestyle', i18nKey: 'self_care', icon: Sparkles, tone: 'from-emerald-500 to-teal-700' },
  { key: 'behavioral-other', value: 'behavioral', i18nKey: 'other', icon: Shapes, tone: 'from-slate-500 to-slate-700' }
];

const emptyMilestone = () => ({ title: '', description: '', due_date: '' });

export default function GoalCoachWizard({ onClose }) {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    ui_category_key: '', category: '', title: '', motivation: '', description: '', target_date: '',
    milestones: [emptyMilestone()],
    smart_criteria: { specific: '', measurable: '', achievable: '', relevant: '', time_bound: '' },
    rewards: ['']
  });

  const selectedCategory = useMemo(
    () => goalCategories.find((category) => category.key === formData.ui_category_key),
    [formData.ui_category_key]
  );
  const SelectedIcon = selectedCategory?.icon;
  const locale = i18n.resolvedLanguage || i18n.language || 'en';

  const createGoalMutation = useMutation({
    mutationFn: async (data) => {
      const goal = await base44.entities.Goal.create(buildGoalPayload(data));
      if (!goal?.id) throw new Error('goal_create_failed');
      return goal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allGoals'] });
      queryClient.invalidateQueries({ queryKey: ['recentGoals'] });
      onClose();
    },
    onError: (error) => console.error('Goal creation error:', error)
  });

  const canProceed = step === 1
    ? Boolean(formData.category && formData.ui_category_key)
    : step === 2
      ? Boolean(formData.title.trim() && formData.motivation.trim())
      : true;

  const updateSmart = (field, value) => setFormData((current) => ({ ...current, smart_criteria: { ...current.smart_criteria, [field]: value } }));
  const updateMilestone = (index, field, value) => setFormData((current) => ({ ...current, milestones: current.milestones.map((milestone, itemIndex) => itemIndex === index ? { ...milestone, [field]: value } : milestone) }));
  const removeMilestone = (index) => setFormData((current) => ({ ...current, milestones: current.milestones.filter((_, itemIndex) => itemIndex !== index) }));
  const updateReward = (index, value) => setFormData((current) => ({ ...current, rewards: current.rewards.map((reward, itemIndex) => itemIndex === index ? value : reward) }));
  const removeReward = (index) => setFormData((current) => {
    const rewards = current.rewards.filter((_, itemIndex) => itemIndex !== index);
    return { ...current, rewards: rewards.length ? rewards : [''] };
  });

  const footer = (
    <div>
      <div className="flex gap-3">
        {step > 1 && (
          <Button type="button" variant="outline" onClick={() => setStep((current) => current - 1)} disabled={createGoalMutation.isPending} data-testid="goalcoach-back" className="min-h-12 flex-1 rounded-2xl border-border bg-[hsl(var(--card)/0.97)] text-primary hover:bg-[hsl(var(--card)/0.97)]">
            <ChevronLeft className="me-2 h-4 w-4 rtl:rotate-180" aria-hidden="true" />{t('goal_coach_wizard.back_button')}
          </Button>
        )}
        {step < 4 ? (
          <Button type="button" onClick={() => canProceed && setStep((current) => current + 1)} disabled={!canProceed} data-testid="goalcoach-next" className="min-h-12 flex-1 rounded-2xl bg-primary text-primary-foreground shadow-[0_12px_24px_rgba(13,148,136,0.22)] hover:bg-primary/90">
            {t('goal_coach_wizard.next_button')}<ChevronRight className="ms-2 h-4 w-4 rtl:rotate-180" aria-hidden="true" />
          </Button>
        ) : (
          <Button type="button" onClick={() => !createGoalMutation.isPending && createGoalMutation.mutate(formData)} disabled={!canProceed || createGoalMutation.isPending} data-testid="goalcoach-save" className="min-h-12 flex-1 rounded-2xl bg-primary text-primary-foreground shadow-[0_12px_24px_rgba(13,148,136,0.22)] hover:bg-primary/90">
            <Target className={`me-2 h-4 w-4 ${createGoalMutation.isPending ? 'animate-spin' : ''}`} aria-hidden="true" />{createGoalMutation.isPending ? t('goal_coach_wizard.saving_button') : t('goal_coach_wizard.save_button')}
          </Button>
        )}
      </div>
      {createGoalMutation.isError && <p className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-800" role="alert">{t('goal_coach_wizard.error_save')}</p>}
    </div>
  );

  return (
    <PremiumCoachShell
      icon={Target} title={t('goal_coach_wizard.title')} step={step}
      stepLabel={t('goal_coach_wizard.step_of', { step })}
      onBack={() => setStep((current) => Math.max(1, current - 1))} onClose={onClose}
      backAriaLabel={t('goal_coach_wizard.go_back_aria')} closeAriaLabel={t('goal_coach_wizard.close_aria')}
      footer={footer} testId="goalcoach-flow"
    >
      {step === 1 && (
        <div data-testid="goalcoach-step-1">
          <PremiumStepHeading title={t('goal_coach_wizard.step1_title')} subtitle={t('goal_coach_wizard.step1_subtitle')} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {goalCategories.map((category) => {
              const Icon = category.icon;
              const selected = formData.ui_category_key === category.key;
              return (
                <button key={category.key} type="button" aria-pressed={selected} data-testid={`goalcoach-category-${category.key}`} onClick={() => setFormData((current) => ({ ...current, category: category.value, ui_category_key: category.key }))} className={cn('min-h-[108px] rounded-2xl border p-4 text-start shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2', selected ? 'border-border bg-secondary/70 shadow-md' : 'border-border bg-[hsl(var(--card)/0.97)] hover:-translate-y-0.5 hover:border-border hover:bg-[hsl(var(--card)/0.97)] hover:shadow-md')}>
                  <span className="flex items-start gap-3"><span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${category.tone} text-white shadow-sm`}><Icon className="h-6 w-6" aria-hidden="true" /></span><span className="min-w-0"><span className="block font-bold leading-5 text-primary">{t(`goal_coach_wizard.categories.${category.i18nKey}.label`)}</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">{t(`goal_coach_wizard.categories.${category.i18nKey}.subtitle`)}</span></span></span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {step === 2 && (
        <div data-testid="goalcoach-step-2">
          <PremiumStepHeading title={t('goal_coach_wizard.step2_title')} subtitle={t('goal_coach_wizard.step2_subtitle')} />
          {selectedCategory && <div className="mb-5 flex items-center gap-3 rounded-2xl border border-border bg-secondary/70 p-4"><span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${selectedCategory.tone} text-white`}><SelectedIcon className="h-5 w-5" aria-hidden="true" /></span><div><p className="font-bold text-primary">{t(`goal_coach_wizard.categories.${selectedCategory.i18nKey}.label`)}</p><p className="text-xs leading-5 text-muted-foreground">{t(`goal_coach_wizard.categories.${selectedCategory.i18nKey}.subtitle`)}</p></div></div>}
          <div className="space-y-5">
            <label className="block text-sm font-semibold text-primary">{t('goal_coach_wizard.goal_title_label')} <span className="text-rose-600" aria-hidden="true">*</span><Input value={formData.title} onChange={(event) => setFormData((current) => ({ ...current, title: event.target.value }))} placeholder={t('goal_coach_wizard.goal_title_placeholder')} className={`${premiumInputClass} mt-2`} data-testid="goalcoach-title-input" required /></label>
            <label className="block text-sm font-semibold text-primary">{t('goal_coach_wizard.motivation_label')} <span className="text-rose-600" aria-hidden="true">*</span><Textarea value={formData.motivation} onChange={(event) => setFormData((current) => ({ ...current, motivation: event.target.value }))} placeholder={t('goal_coach_wizard.motivation_placeholder')} className={`${premiumInputClass} mt-2 min-h-28 resize-y`} data-testid="goalcoach-motivation-input" required /></label>
            <div className="space-y-4 rounded-2xl border border-border bg-secondary/70 p-4"><p className="font-bold text-primary">{t('goal_coach_wizard.additional_details')}</p>
              <label className="block text-sm font-semibold text-muted-foreground">{t('goal_coach_wizard.description_label')}<Textarea value={formData.description} onChange={(event) => setFormData((current) => ({ ...current, description: event.target.value }))} placeholder={t('goal_coach_wizard.description_placeholder')} className={`${premiumInputClass} mt-2 min-h-24 resize-y`} data-testid="goalcoach-description-input" /></label>
              <label className="block text-sm font-semibold text-muted-foreground">{t('goal_coach_wizard.target_date_label')}<Input type="date" value={formData.target_date} onChange={(event) => setFormData((current) => ({ ...current, target_date: event.target.value }))} className={`${premiumInputClass} mt-2`} data-testid="goalcoach-target-date" /></label>
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div data-testid="goalcoach-step-3">
          <PremiumStepHeading title={t('goal_coach_wizard.step3_title')} subtitle={t('goal_coach_wizard.step3_subtitle')} />
          <div className="space-y-5">
            <div className="rounded-2xl border border-border bg-secondary/70 p-4"><p className="font-bold text-foreground">{t('goal_coach_wizard.reflect_title')}</p><ul className="mt-3 list-disc space-y-2 ps-5 text-sm leading-6 text-muted-foreground"><li>{t('goal_coach_wizard.reflect_q1')}</li><li>{t('goal_coach_wizard.reflect_q2')}</li><li>{t('goal_coach_wizard.reflect_q3')}</li></ul></div>
            <fieldset className="rounded-2xl border border-border/70 bg-secondary/40 p-4"><legend className="px-1 font-bold text-foreground">{t('goal_coach_wizard.smart_title')}</legend><div className="mt-2 grid gap-3 sm:grid-cols-2">
              {['specific', 'measurable', 'achievable', 'relevant', 'time_bound'].map((field) => <Input key={field} value={formData.smart_criteria[field]} onChange={(event) => updateSmart(field, event.target.value)} placeholder={t(`goal_coach_wizard.smart_${field}_placeholder`)} className={premiumInputClass} data-testid={`goalcoach-smart-${field}`} />)}
            </div></fieldset>
            <fieldset className="rounded-2xl border border-border bg-[hsl(var(--card)/0.97)] p-4"><legend className="px-1 font-bold text-primary">{t('goal_coach_wizard.milestones_label')}</legend><p className="mb-3 text-sm leading-6 text-muted-foreground">{t('goal_coach_wizard.milestones_subtitle')}</p><div className="space-y-3">
              {formData.milestones.map((milestone, index) => <div key={index} className="space-y-3 rounded-2xl border border-border bg-secondary/70 p-3"><div className="flex gap-2"><Input value={milestone.title} onChange={(event) => updateMilestone(index, 'title', event.target.value)} placeholder={t('goal_coach_wizard.milestone_placeholder', { n: index + 1 })} className={`${premiumInputClass} flex-1`} data-testid={`goalcoach-milestone-title-${index}`} />{formData.milestones.length > 1 && <Button type="button" variant="outline" size="icon" onClick={() => removeMilestone(index)} className="h-12 w-12 shrink-0 rounded-2xl border-rose-200 bg-[hsl(var(--card)/0.97)] text-rose-700 hover:bg-rose-50" aria-label={t('goal_coach_wizard.remove_milestone_aria', { n: index + 1 })} mobileLabelKey="remove"><Minus className="h-4 w-4" aria-hidden="true" /></Button>}</div><Textarea value={milestone.description} onChange={(event) => updateMilestone(index, 'description', event.target.value)} placeholder={t('goal_coach_wizard.milestone_details_placeholder')} className={`${premiumInputClass} min-h-20 resize-y`} /><Input type="date" value={milestone.due_date} onChange={(event) => updateMilestone(index, 'due_date', event.target.value)} className={premiumInputClass} /></div>)}
              {formData.milestones.length < 5 && <Button type="button" variant="outline" onClick={() => setFormData((current) => ({ ...current, milestones: [...current.milestones, emptyMilestone()] }))} className="min-h-12 w-full rounded-2xl border-border bg-[hsl(var(--card)/0.97)] text-primary hover:bg-[hsl(var(--card)/0.97)]"><Plus className="me-2 h-4 w-4" aria-hidden="true" />{t('goal_coach_wizard.add_milestone')}</Button>}
            </div></fieldset>
            <fieldset className="rounded-2xl border border-border bg-[hsl(var(--card)/0.97)] p-4"><legend className="px-1 font-bold text-primary">{t('goal_coach_wizard.rewards_label')}</legend><p className="mb-3 text-sm leading-6 text-muted-foreground">{t('goal_coach_wizard.rewards_subtitle')}</p><div className="space-y-3">{formData.rewards.map((reward, index) => <div key={index} className="flex gap-2"><Input value={reward} onChange={(event) => updateReward(index, event.target.value)} placeholder={t('goal_coach_wizard.reward_placeholder', { n: index + 1 })} className={`${premiumInputClass} flex-1`} />{formData.rewards.length > 1 && <Button type="button" variant="outline" size="icon" onClick={() => removeReward(index)} className="h-12 w-12 shrink-0 rounded-2xl border-rose-200 bg-[hsl(var(--card)/0.97)] text-rose-700 hover:bg-rose-50" aria-label={t('goal_coach_wizard.remove_reward_aria', { n: index + 1 })} mobileLabelKey="remove"><Minus className="h-4 w-4" aria-hidden="true" /></Button>}</div>)}{formData.rewards.length < 3 && <Button type="button" variant="outline" onClick={() => setFormData((current) => ({ ...current, rewards: [...current.rewards, ''] }))} className="min-h-12 w-full rounded-2xl border-border bg-[hsl(var(--card)/0.97)] text-primary hover:bg-[hsl(var(--card)/0.97)]"><Plus className="me-2 h-4 w-4" aria-hidden="true" />{t('goal_coach_wizard.add_reward')}</Button>}</div></fieldset>
          </div>
        </div>
      )}

      {step === 4 && (
        <div data-testid="goalcoach-step-4">
          <PremiumStepHeading title={t('goal_coach_wizard.step4_title')} subtitle={t('goal_coach_wizard.step4_subtitle')} />
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-[hsl(var(--card)/0.97)] p-4 shadow-sm"><div className="mb-4 flex items-center gap-3">{selectedCategory && <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${selectedCategory.tone} text-white`}><SelectedIcon className="h-5 w-5" aria-hidden="true" /></span>}<div><p className="font-bold text-primary">{selectedCategory && t(`goal_coach_wizard.categories.${selectedCategory.i18nKey}.label`)}</p></div></div><div className="space-y-4 text-sm leading-6">
              <div><p className="font-bold text-primary">{t('goal_coach_wizard.review_goal_label')}</p><p className="mt-1 break-words text-muted-foreground">{formData.title}</p></div>
              <div><p className="font-bold text-primary">{t('goal_coach_wizard.review_motivation_label')}</p><p className="mt-1 break-words text-muted-foreground">{formData.motivation}</p></div>
              {formData.description.trim() && <div><p className="font-bold text-primary">{t('goal_coach_wizard.review_details_label')}</p><p className="mt-1 break-words text-muted-foreground">{formData.description}</p></div>}
              {formData.target_date && <div><p className="font-bold text-primary">{t('goal_coach_wizard.review_target_label')}</p><p className="mt-1 text-muted-foreground">{formatLocalDate(formData.target_date, locale)}</p></div>}
              {formData.milestones.some((milestone) => milestone.title.trim()) && <div><p className="font-bold text-primary">{t('goal_coach_wizard.review_milestones_label')}</p><ul className="mt-2 space-y-2">{formData.milestones.filter((milestone) => milestone.title.trim()).map((milestone, index) => <li key={index} className="rounded-xl bg-secondary/70 p-3 text-muted-foreground"><span className="font-semibold">{milestone.title}</span>{milestone.description && <p className="mt-1 text-xs">{milestone.description}</p>}{milestone.due_date && <p className="mt-1 text-xs text-muted-foreground">{t('goal_coach_wizard.review_due_prefix')} {formatLocalDate(milestone.due_date, locale)}</p>}</li>)}</ul></div>}
              {formData.rewards.some((reward) => reward.trim()) && <div><p className="font-bold text-primary">{t('goal_coach_wizard.review_rewards_label')}</p><ul className="mt-1 list-disc ps-5 text-muted-foreground">{formData.rewards.filter((reward) => reward.trim()).map((reward, index) => <li key={index}>{reward}</li>)}</ul></div>}
              {Object.values(formData.smart_criteria).some((value) => value.trim()) && <div><p className="font-bold text-primary">{t('goal_coach_wizard.review_smart_label')}</p><div className="mt-2 space-y-1 rounded-xl bg-secondary/40 p-3 text-muted-foreground">{Object.entries(formData.smart_criteria).filter(([, value]) => value.trim()).map(([key, value]) => <p key={key}><span className="font-bold uppercase">{key === 'time_bound' ? 'T' : key[0]}:</span> {value}</p>)}</div></div>}
            </div></div>
            <div className="flex items-start gap-3 rounded-2xl border border-border bg-secondary/70 p-4"><Target className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" aria-hidden="true" /><div><p className="font-bold text-foreground">{t('goal_coach_wizard.what_next_title')}</p><p className="mt-1 text-sm leading-6 text-muted-foreground">{t('goal_coach_wizard.what_next_text')}</p></div></div>
          </div>
        </div>
      )}
    </PremiumCoachShell>
  );
}
