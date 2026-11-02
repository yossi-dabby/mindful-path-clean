import PremiumOverlay from '@/components/ui/PremiumOverlay';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import BottomSheetSelect from '@/components/ui/bottom-sheet-select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight, Check, Target, Brain, AlertTriangle, Map, TrendingUp, RefreshCw, Lightbulb, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const GOAL_CATEGORY_OPTIONS = [
  { value: 'behavioral', labelKey: 'six_step_goal.categories.behavioral' },
  { value: 'emotional', labelKey: 'six_step_goal.categories.emotional' },
  { value: 'social', labelKey: 'six_step_goal.categories.social' },
  { value: 'cognitive', labelKey: 'six_step_goal.categories.cognitive' },
  { value: 'lifestyle', labelKey: 'six_step_goal.categories.lifestyle' },
];

const REVIEW_SCHEDULE_OPTIONS = [
  { value: 'weekly', labelKey: 'six_step_goal.schedules.weekly' },
  { value: 'biweekly', labelKey: 'six_step_goal.schedules.biweekly' },
  { value: 'monthly', labelKey: 'six_step_goal.schedules.monthly' },
];

const STEPS = [
  { 
    id: 1, 
    titleKey: 'six_step_goal.steps.1.title', 
    icon: Brain,
    descriptionKey: 'six_step_goal.steps.1.description'
  },
  { 
    id: 2, 
    titleKey: 'six_step_goal.steps.2.title', 
    icon: Target,
    descriptionKey: 'six_step_goal.steps.2.description'
  },
  { 
    id: 3, 
    titleKey: 'six_step_goal.steps.3.title', 
    icon: AlertTriangle,
    descriptionKey: 'six_step_goal.steps.3.description'
  },
  { 
    id: 4, 
    titleKey: 'six_step_goal.steps.4.title', 
    icon: Map,
    descriptionKey: 'six_step_goal.steps.4.description'
  },
  { 
    id: 5, 
    titleKey: 'six_step_goal.steps.5.title', 
    icon: TrendingUp,
    descriptionKey: 'six_step_goal.steps.5.description'
  },
  { 
    id: 6, 
    titleKey: 'six_step_goal.steps.6.title', 
    icon: RefreshCw,
    descriptionKey: 'six_step_goal.steps.6.description'
  }
];

export default function SixStepGoalWizard({ onComplete, onCancel, existingGoal = null }) {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [goalData, setGoalData] = useState({
    title: existingGoal?.title || '',
    category: existingGoal?.category || 'behavioral',
    target_date: existingGoal?.target_date || '',
    problem_definition: existingGoal?.problem_definition || {
      situation: '',
      impact: '',
      thoughts: '',
      emotions: [],
      behaviors: ''
    },
    smart_criteria: existingGoal?.smart_criteria || {
      specific: '',
      measurable: '',
      achievable: '',
      relevant: '',
      time_bound: ''
    },
    obstacles: existingGoal?.obstacles || {
      identified_obstacles: [],
      automatic_thoughts: [],
      cognitive_distortions: [],
      core_beliefs: '',
      balanced_thoughts: []
    },
    action_plan: existingGoal?.action_plan || {
      strategies: [],
      coping_skills: [],
      alternative_behaviors: [],
      support_system: []
    },
    milestones: existingGoal?.milestones || [],
    tracking: existingGoal?.tracking || {
      daily_check_ins: [],
      quantitative_metrics: []
    },
    review_and_adjust: existingGoal?.review_and_adjust || {
      review_schedule: 'weekly',
      reviews: []
    },
    motivation: existingGoal?.motivation || ''
  });

  const [tempInputs, setTempInputs] = useState({
    emotion: '',
    obstacle: '',
    automaticThought: '',
    distortion: '',
    balancedThought: '',
    strategy: '',
    copingSkill: '',
    alternativeBehavior: '',
    support: '',
    milestone: '',
    metricName: ''
  });

  const updateField = (path, value) => {
    setGoalData(prev => {
      const keys = path.split('.');
      const newData = { ...prev };
      let current = newData;
      
      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...current[keys[i]] };
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return newData;
    });
  };

  const addToArray = (path, value) => {
    if (!value.trim()) return;
    setGoalData(prev => {
      const keys = path.split('.');
      const newData = { ...prev };
      let current = newData;
      
      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...current[keys[i]] };
        current = current[keys[i]];
      }
      
      const arrayKey = keys[keys.length - 1];
      current[arrayKey] = [...(current[arrayKey] || []), value];
      return newData;
    });
  };

  const removeFromArray = (path, index) => {
    setGoalData(prev => {
      const keys = path.split('.');
      const newData = { ...prev };
      let current = newData;
      
      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...current[keys[i]] };
        current = current[keys[i]];
      }
      
      const arrayKey = keys[keys.length - 1];
      current[arrayKey] = current[arrayKey].filter((_, i) => i !== index);
      return newData;
    });
  };

  const handleNext = () => {
    if (currentStep < 6) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      if (existingGoal) {
        await base44.entities.Goal.update(existingGoal.id, goalData);
      } else {
        await base44.entities.Goal.create({
          ...goalData,
          status: 'active',
          progress: 0
        });
      }
      onComplete();
    } catch (error) {
      console.error('Failed to save goal:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>{t('six_step_goal.current_situation')}</Label>
              <Textarea
                value={goalData.problem_definition.situation}
                onChange={(e) => updateField('problem_definition.situation', e.target.value)}
                placeholder={t('six_step_goal.current_situation_placeholder')}
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('six_step_goal.impact')}</Label>
              <Textarea
                value={goalData.problem_definition.impact}
                onChange={(e) => updateField('problem_definition.impact', e.target.value)}
                placeholder={t('six_step_goal.impact_placeholder')}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('six_step_goal.thoughts')}</Label>
              <Textarea
                value={goalData.problem_definition.thoughts}
                onChange={(e) => updateField('problem_definition.thoughts', e.target.value)}
                placeholder={t('six_step_goal.thoughts_placeholder')}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('six_step_goal.emotions')}</Label>
              <div className="flex gap-2">
                <Input
                  value={tempInputs.emotion}
                  onChange={(e) => setTempInputs({ ...tempInputs, emotion: e.target.value })}
                  placeholder={t('six_step_goal.emotions_placeholder')}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      addToArray('problem_definition.emotions', tempInputs.emotion);
                      setTempInputs({ ...tempInputs, emotion: '' });
                    }
                  }}
                />
                <Button
                  type="button"
                  onClick={() => {
                    addToArray('problem_definition.emotions', tempInputs.emotion);
                    setTempInputs({ ...tempInputs, emotion: '' });
                  }}
                >
                  {t('six_step_goal.add')}
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {goalData.problem_definition.emotions.map((emotion, i) => (
                  <Badge key={i} variant="secondary" className="gap-1">
                    {emotion}
                    <button type="button" aria-label={t('six_step_goal.remove_item', { item: emotion })} onClick={() => removeFromArray('problem_definition.emotions', i)}>
                      <X className="w-3 h-3" aria-hidden="true" />
                    <span className="mobile-action-label md:hidden">{t('six_step_goal.remove_item', { item: emotion })}</span></button>
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t('six_step_goal.behaviors')}</Label>
              <Textarea
                value={goalData.problem_definition.behaviors}
                onChange={(e) => updateField('problem_definition.behaviors', e.target.value)}
                placeholder={t('six_step_goal.behaviors_placeholder')}
                rows={3}
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>{t('six_step_goal.goal_title')}</Label>
              <Input
                value={goalData.title}
                onChange={(e) => updateField('title', e.target.value)}
                placeholder={t('six_step_goal.goal_title_placeholder')}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('six_step_goal.category')}</Label>
              <BottomSheetSelect
                value={goalData.category}
                onValueChange={(value) => updateField('category', value)}
                options={GOAL_CATEGORY_OPTIONS.map((option) => ({ ...option, label: t(option.labelKey) }))}
                title={t('six_step_goal.goal_category')}
              />
            </div>

            <div className="bg-blue-50 p-4 rounded-lg space-y-4">
              <h4 className="font-semibold text-blue-900 flex items-center gap-2">
                <Lightbulb className="w-4 h-4" />
                {t('six_step_goal.smart')}
              </h4>

              <div className="space-y-2">
                <Label>{t('six_step_goal.specific')}</Label>
                <Textarea
                  value={goalData.smart_criteria.specific}
                  onChange={(e) => updateField('smart_criteria.specific', e.target.value)}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>{t('six_step_goal.measurable')}</Label>
                <Textarea
                  value={goalData.smart_criteria.measurable}
                  onChange={(e) => updateField('smart_criteria.measurable', e.target.value)}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>{t('six_step_goal.achievable')}</Label>
                <Textarea
                  value={goalData.smart_criteria.achievable}
                  onChange={(e) => updateField('smart_criteria.achievable', e.target.value)}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>{t('six_step_goal.relevant')}</Label>
                <Textarea
                  value={goalData.smart_criteria.relevant}
                  onChange={(e) => updateField('smart_criteria.relevant', e.target.value)}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>{t('six_step_goal.time_bound')}</Label>
                <Input
                  type="date"
                  value={goalData.target_date}
                  onChange={(e) => updateField('target_date', e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t('six_step_goal.motivation')}</Label>
              <Textarea
                value={goalData.motivation}
                onChange={(e) => updateField('motivation', e.target.value)}
                placeholder={t('six_step_goal.motivation_placeholder')}
                rows={3}
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>{t('six_step_goal.obstacles')}</Label>
              <div className="flex gap-2">
                <Input
                  value={tempInputs.obstacle}
                  onChange={(e) => setTempInputs({ ...tempInputs, obstacle: e.target.value })}
                  placeholder={t('six_step_goal.obstacles_placeholder')}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      addToArray('obstacles.identified_obstacles', tempInputs.obstacle);
                      setTempInputs({ ...tempInputs, obstacle: '' });
                    }
                  }}
                />
                <Button
                  type="button"
                  onClick={() => {
                    addToArray('obstacles.identified_obstacles', tempInputs.obstacle);
                    setTempInputs({ ...tempInputs, obstacle: '' });
                  }}
                >
                  {t('six_step_goal.add')}
                </Button>
              </div>
              <div className="space-y-1 mt-2">
                {goalData.obstacles.identified_obstacles.map((obs, i) => (
                  <div key={i} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                    <span className="text-sm">{obs}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFromArray('obstacles.identified_obstacles', i)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t('six_step_goal.automatic_thoughts')}</Label>
              <div className="flex gap-2">
                <Input
                  value={tempInputs.automaticThought}
                  onChange={(e) => setTempInputs({ ...tempInputs, automaticThought: e.target.value })}
                  placeholder={t('six_step_goal.automatic_thoughts_placeholder')}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      addToArray('obstacles.automatic_thoughts', tempInputs.automaticThought);
                      setTempInputs({ ...tempInputs, automaticThought: '' });
                    }
                  }}
                />
                <Button
                  type="button"
                  onClick={() => {
                    addToArray('obstacles.automatic_thoughts', tempInputs.automaticThought);
                    setTempInputs({ ...tempInputs, automaticThought: '' });
                  }}
                >
                  {t('six_step_goal.add')}
                </Button>
              </div>
              <div className="space-y-1 mt-2">
                {goalData.obstacles.automatic_thoughts.map((thought, i) => (
                  <div key={i} className="flex items-center justify-between bg-red-50 p-2 rounded">
                    <span className="text-sm">{thought}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFromArray('obstacles.automatic_thoughts', i)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t('six_step_goal.distortions')}</Label>
              <div className="flex gap-2">
                <Input
                  value={tempInputs.distortion}
                  onChange={(e) => setTempInputs({ ...tempInputs, distortion: e.target.value })}
                  placeholder={t('six_step_goal.distortions_placeholder')}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      addToArray('obstacles.cognitive_distortions', tempInputs.distortion);
                      setTempInputs({ ...tempInputs, distortion: '' });
                    }
                  }}
                />
                <Button
                  type="button"
                  onClick={() => {
                    addToArray('obstacles.cognitive_distortions', tempInputs.distortion);
                    setTempInputs({ ...tempInputs, distortion: '' });
                  }}
                >
                  {t('six_step_goal.add')}
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {goalData.obstacles.cognitive_distortions.map((dist, i) => (
                  <Badge key={i} variant="outline" className="gap-1">
                    {dist}
                    <button type="button" aria-label={t('six_step_goal.remove_item', { item: dist })} onClick={() => removeFromArray('obstacles.cognitive_distortions', i)}>
                      <X className="w-3 h-3" aria-hidden="true" />
                    <span className="mobile-action-label md:hidden">{t('six_step_goal.remove_item', { item: dist })}</span></button>
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t('six_step_goal.core_beliefs')}</Label>
              <Textarea
                value={goalData.obstacles.core_beliefs}
                onChange={(e) => updateField('obstacles.core_beliefs', e.target.value)}
                placeholder={t('six_step_goal.core_beliefs_placeholder')}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('six_step_goal.balanced_thoughts')}</Label>
              <div className="flex gap-2">
                <Input
                  value={tempInputs.balancedThought}
                  onChange={(e) => setTempInputs({ ...tempInputs, balancedThought: e.target.value })}
                  placeholder={t('six_step_goal.balanced_thoughts_placeholder')}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      addToArray('obstacles.balanced_thoughts', tempInputs.balancedThought);
                      setTempInputs({ ...tempInputs, balancedThought: '' });
                    }
                  }}
                />
                <Button
                  type="button"
                  onClick={() => {
                    addToArray('obstacles.balanced_thoughts', tempInputs.balancedThought);
                    setTempInputs({ ...tempInputs, balancedThought: '' });
                  }}
                >
                  {t('six_step_goal.add')}
                </Button>
              </div>
              <div className="space-y-1 mt-2">
                {goalData.obstacles.balanced_thoughts.map((thought, i) => (
                  <div key={i} className="flex items-center justify-between bg-green-50 p-2 rounded">
                    <span className="text-sm">{thought}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFromArray('obstacles.balanced_thoughts', i)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>{t('six_step_goal.strategies')}</Label>
              <div className="flex gap-2">
                <Input
                  value={tempInputs.strategy}
                  onChange={(e) => setTempInputs({ ...tempInputs, strategy: e.target.value })}
                  placeholder={t('six_step_goal.strategies_placeholder')}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      addToArray('action_plan.strategies', { strategy: tempInputs.strategy, cbt_technique: '', behavioral_experiment: '' });
                      setTempInputs({ ...tempInputs, strategy: '' });
                    }
                  }}
                />
                <Button
                  type="button"
                  onClick={() => {
                    addToArray('action_plan.strategies', { strategy: tempInputs.strategy, cbt_technique: '', behavioral_experiment: '' });
                    setTempInputs({ ...tempInputs, strategy: '' });
                  }}
                >
                  {t('six_step_goal.add')}
                </Button>
              </div>
              <div className="space-y-2 mt-2">
                {goalData.action_plan.strategies.map((strat, i) => (
                  <div key={i} className="bg-blue-50 p-3 rounded space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{strat.strategy}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFromArray('action_plan.strategies', i)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t('six_step_goal.coping_skills')}</Label>
              <div className="flex gap-2">
                <Input
                  value={tempInputs.copingSkill}
                  onChange={(e) => setTempInputs({ ...tempInputs, copingSkill: e.target.value })}
                  placeholder={t('six_step_goal.coping_skills_placeholder')}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      addToArray('action_plan.coping_skills', tempInputs.copingSkill);
                      setTempInputs({ ...tempInputs, copingSkill: '' });
                    }
                  }}
                />
                <Button
                  type="button"
                  onClick={() => {
                    addToArray('action_plan.coping_skills', tempInputs.copingSkill);
                    setTempInputs({ ...tempInputs, copingSkill: '' });
                  }}
                >
                  {t('six_step_goal.add')}
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {goalData.action_plan.coping_skills.map((skill, i) => (
                  <Badge key={i} className="gap-1">
                    {skill}
                    <button type="button" aria-label={t('six_step_goal.remove_item', { item: skill })} onClick={() => removeFromArray('action_plan.coping_skills', i)}>
                      <X className="w-3 h-3" aria-hidden="true" />
                    <span className="mobile-action-label md:hidden">{t('six_step_goal.remove_item', { item: skill })}</span></button>
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t('six_step_goal.alternative_behaviors')}</Label>
              <div className="flex gap-2">
                <Input
                  value={tempInputs.alternativeBehavior}
                  onChange={(e) => setTempInputs({ ...tempInputs, alternativeBehavior: e.target.value })}
                  placeholder={t('six_step_goal.alternative_behaviors_placeholder')}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      addToArray('action_plan.alternative_behaviors', tempInputs.alternativeBehavior);
                      setTempInputs({ ...tempInputs, alternativeBehavior: '' });
                    }
                  }}
                />
                <Button
                  type="button"
                  onClick={() => {
                    addToArray('action_plan.alternative_behaviors', tempInputs.alternativeBehavior);
                    setTempInputs({ ...tempInputs, alternativeBehavior: '' });
                  }}
                >
                  {t('six_step_goal.add')}
                </Button>
              </div>
              <div className="space-y-1 mt-2">
                {goalData.action_plan.alternative_behaviors.map((behavior, i) => (
                  <div key={i} className="flex items-center justify-between bg-purple-50 p-2 rounded">
                    <span className="text-sm">{behavior}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFromArray('action_plan.alternative_behaviors', i)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t('six_step_goal.support')}</Label>
              <div className="flex gap-2">
                <Input
                  value={tempInputs.support}
                  onChange={(e) => setTempInputs({ ...tempInputs, support: e.target.value })}
                  placeholder={t('six_step_goal.support_placeholder')}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      addToArray('action_plan.support_system', tempInputs.support);
                      setTempInputs({ ...tempInputs, support: '' });
                    }
                  }}
                />
                <Button
                  type="button"
                  onClick={() => {
                    addToArray('action_plan.support_system', tempInputs.support);
                    setTempInputs({ ...tempInputs, support: '' });
                  }}
                >
                  {t('six_step_goal.add')}
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {goalData.action_plan.support_system.map((support, i) => (
                  <Badge key={i} variant="secondary" className="gap-1">
                    {support}
                    <button type="button" aria-label={t('six_step_goal.remove_item', { item: support })} onClick={() => removeFromArray('action_plan.support_system', i)}>
                      <X className="w-3 h-3" aria-hidden="true" />
                    <span className="mobile-action-label md:hidden">{t('six_step_goal.remove_item', { item: support })}</span></button>
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <h4 className="font-semibold">{t('six_step_goal.milestones_metrics')}</h4>
              <div className="flex gap-2">
                <Input
                  value={tempInputs.milestone}
                  onChange={(e) => setTempInputs({ ...tempInputs, milestone: e.target.value })}
                  placeholder={t('six_step_goal.milestone_placeholder')}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      addToArray('milestones', { 
                        title: tempInputs.milestone, 
                        completed: false,
                        quantitative_metric: null
                      });
                      setTempInputs({ ...tempInputs, milestone: '' });
                    }
                  }}
                />
                <Button
                  type="button"
                  onClick={() => {
                    addToArray('milestones', { 
                      title: tempInputs.milestone, 
                      completed: false,
                      quantitative_metric: null
                    });
                    setTempInputs({ ...tempInputs, milestone: '' });
                  }}
                >
                  {t('six_step_goal.add')}
                </Button>
              </div>
              <div className="space-y-2">
                {goalData.milestones.map((milestone, i) => (
                  <div key={i} className="bg-gray-50 p-3 rounded">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{milestone.title}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFromArray('milestones', i)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold">{t('six_step_goal.tracking_metrics')}</h4>
              <div className="flex gap-2">
                <Input
                  value={tempInputs.metricName}
                  onChange={(e) => setTempInputs({ ...tempInputs, metricName: e.target.value })}
                  placeholder={t('six_step_goal.metric_placeholder')}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      addToArray('tracking.quantitative_metrics', { 
                        metric_name: tempInputs.metricName,
                        frequency: 'daily',
                        data_points: []
                      });
                      setTempInputs({ ...tempInputs, metricName: '' });
                    }
                  }}
                />
                <Button
                  type="button"
                  onClick={() => {
                    addToArray('tracking.quantitative_metrics', { 
                      metric_name: tempInputs.metricName,
                      frequency: 'daily',
                      data_points: []
                    });
                    setTempInputs({ ...tempInputs, metricName: '' });
                  }}
                >
                  {t('six_step_goal.add')}
                </Button>
              </div>
              <div className="space-y-2">
                {goalData.tracking.quantitative_metrics.map((metric, i) => (
                  <div key={i} className="bg-blue-50 p-3 rounded">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{metric.metric_name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFromArray('tracking.quantitative_metrics', i)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-amber-50 p-4 rounded-lg">
              <h4 className="font-semibold text-amber-900 mb-2">{t('six_step_goal.daily_checkins')}</h4>
              <p className="text-sm text-amber-800">
                {t('six_step_goal.daily_checkins_description')}
              </p>
              <ul className="list-disc list-inside text-sm text-amber-800 mt-2 space-y-1">
                <li>{t('six_step_goal.checkins.effort')}</li>
                <li>{t('six_step_goal.checkins.mood')}</li>
                <li>{t('six_step_goal.checkins.notes')}</li>
                <li>{t('six_step_goal.checkins.obstacles')}</li>
                <li>{t('six_step_goal.checkins.coping')}</li>
              </ul>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>{t('six_step_goal.review_schedule')}</Label>
              <BottomSheetSelect
                value={goalData.review_and_adjust.review_schedule}
                onValueChange={(value) => updateField('review_and_adjust.review_schedule', value)}
                options={REVIEW_SCHEDULE_OPTIONS.map((option) => ({ ...option, label: t(option.labelKey) }))}
                title={t('six_step_goal.review_schedule')}
              />
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-semibold text-green-900 mb-2">{t('six_step_goal.reviews_include')}</h4>
              <ul className="list-disc list-inside text-sm text-green-800 space-y-1">
                <li>{t('six_step_goal.reviews.progress')}</li>
                <li>{t('six_step_goal.reviews.working')}</li>
                <li>{t('six_step_goal.reviews.adjustment')}</li>
                <li>{t('six_step_goal.reviews.shifts')}</li>
                <li>{t('six_step_goal.reviews.modifications')}</li>
                <li>{t('six_step_goal.reviews.ai_insights')}</li>
              </ul>
            </div>

            <div className="bg-purple-50 p-4 rounded-lg">
              <h4 className="font-semibold text-purple-900 mb-2 flex items-center gap-2">
                <Brain className="w-5 h-5" />
                {t('six_step_goal.ai_support')}
              </h4>
              <p className="text-sm text-purple-800">
                {t('six_step_goal.ai_support_description')}
              </p>
              <ul className="list-disc list-inside text-sm text-purple-800 mt-2 space-y-1">
                <li>{t('six_step_goal.ai_items.adjustments')}</li>
                <li>{t('six_step_goal.ai_items.obstacles')}</li>
                <li>{t('six_step_goal.ai_items.techniques')}</li>
                <li>{t('six_step_goal.ai_items.shifts')}</li>
                <li>{t('six_step_goal.ai_items.celebrate')}</li>
              </ul>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2">{t('six_step_goal.summary')}</h4>
              <div className="space-y-2 text-sm text-blue-800">
                <p><strong>{t('six_step_goal.summary_labels.goal')}</strong> {goalData.title || t('six_step_goal.not_set')}</p>
                <p><strong>{t('six_step_goal.summary_labels.category')}</strong> {t(`six_step_goal.categories.${goalData.category}`)}</p>
                <p><strong>{t('six_step_goal.summary_labels.target_date')}</strong> {goalData.target_date || t('six_step_goal.not_set')}</p>
                <p><strong>{t('six_step_goal.summary_labels.obstacles')}</strong> {goalData.obstacles.identified_obstacles.length}</p>
                <p><strong>{t('six_step_goal.summary_labels.strategies')}</strong> {goalData.action_plan.strategies.length}</p>
                <p><strong>{t('six_step_goal.summary_labels.milestones')}</strong> {goalData.milestones.length}</p>
                <p><strong>{t('six_step_goal.summary_labels.review_schedule')}</strong> {t(`six_step_goal.schedules.${goalData.review_and_adjust.review_schedule}`)}</p>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 1:
        return goalData.problem_definition.situation.trim().length > 0;
      case 2:
        return goalData.title.trim().length > 0 && goalData.smart_criteria.specific.trim().length > 0;
      case 3:
        return goalData.obstacles.identified_obstacles.length > 0 || goalData.obstacles.automatic_thoughts.length > 0;
      case 4:
        return goalData.action_plan.strategies.length > 0;
      case 5:
        return goalData.milestones.length > 0;
      case 6:
        return true;
      default:
        return false;
    }
  };

  const StepIcon = STEPS[currentStep - 1].icon;

  return (
    <PremiumOverlay className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-600 to-emerald-700 flex items-center justify-center">
                <StepIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle>{t('six_step_goal.step_of', { step: currentStep, title: t(STEPS[currentStep - 1].titleKey) })}</CardTitle>
                <CardDescription>{t(STEPS[currentStep - 1].descriptionKey)}</CardDescription>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onCancel} aria-label={t('six_step_goal.cancel')}>
              <X className="w-5 h-5" />
            </Button>
          </div>
          <Progress value={(currentStep / 6) * 100} className="h-2" />
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {renderStep()}
            </motion.div>
          </AnimatePresence>
        </CardContent>

        <div className="p-6 border-t flex justify-between">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            {t('six_step_goal.back')}
          </Button>
          
          <div className="flex gap-2">
            {currentStep < 6 ? (
              <Button
                onClick={handleNext}
                disabled={!isStepValid()}
              >
                {t('six_step_goal.next')}
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || !isStepValid()}
                className="bg-gradient-to-r from-teal-600 to-emerald-700"
              >
                {isSubmitting ? t('six_step_goal.saving') : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    {t('six_step_goal.complete')}
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </Card>
    </PremiumOverlay>
  );
}