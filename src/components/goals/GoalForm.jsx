import PremiumDialog from '@/components/ui/PremiumDialog';
import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { isAuthError, shouldShowAuthError } from '../utils/authErrorHandler';
import AuthErrorBanner from '../utils/AuthErrorBanner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import BottomSheetSelect from '@/components/ui/bottom-sheet-select';
import { X, Plus, Trash2, Target, CheckCircle, Sparkles } from 'lucide-react';
import DatePickerMobile from '../ui/date-picker-mobile';
import { useTranslation } from 'react-i18next';

const CATEGORY_VALUES = ['behavioral', 'emotional', 'social', 'cognitive', 'lifestyle'];

export default function GoalForm({ goal, prefilledData, onClose }) {
  const { t } = useTranslation();
  const categories = CATEGORY_VALUES.map((value) => ({ value, label: t(`goals.form.categories.${value}`) }));
  const [currentTab, setCurrentTab] = useState('basic');
  const abortControllerRef = useRef(null);
  const mountedRef = useRef(true);
  const [formData, setFormData] = useState(
    goal || prefilledData || {
      title: '',
      description: '',
      category: 'behavioral',
      target_date: '',
      progress: 0,
      status: 'active',
      milestones: [],
      smart_criteria: {
        specific: '',
        measurable: '',
        achievable: '',
        relevant: '',
        time_bound: ''
      },
      motivation: '',
      rewards: []
    }
  );

  const [aiSuggesting, setAiSuggesting] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [showAuthError, setShowAuthError] = useState(false);
  const isSavingRef = useRef(false);
  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: (data) => {
      const validatedData = {
        ...data,
        progress: Math.max(0, Math.min(100, data.progress || 0))
      };
      return goal
        ? base44.entities.Goal.update(goal.id, validatedData)
        : base44.entities.Goal.create(validatedData);
    },
    onMutate: async (data) => {
      const validatedData = {
        ...data,
        progress: Math.max(0, Math.min(100, data.progress || 0))
      };
      await queryClient.cancelQueries({ queryKey: ['allGoals'] });
      const previousGoals = queryClient.getQueryData(['allGoals']);
      const optimisticGoal = {
        ...(goal || {}),
        ...validatedData,
        id: goal?.id || `temp-${Date.now()}`,
        created_date: goal?.created_date || new Date().toISOString(),
        updated_date: new Date().toISOString(),
        created_by: goal?.created_by
      };
      queryClient.setQueryData(['allGoals'], (old = []) =>
        goal ? old.map((item) => item.id === goal.id ? optimisticGoal : item) : [optimisticGoal, ...old]
      );
      return { previousGoals };
    },
    onSuccess: (savedGoal) => {
      isSavingRef.current = false;
      queryClient.setQueryData(['allGoals'], (old = []) =>
        goal
          ? old.map((item) => item.id === goal.id ? savedGoal : item)
          : [savedGoal, ...old.filter((item) => !String(item.id).startsWith('temp-'))]
      );
      onClose();
    },
    onError: (error, _data, context) => {
      isSavingRef.current = false;
      if (context?.previousGoals) {
        queryClient.setQueryData(['allGoals'], context.previousGoals);
      }
      if (isAuthError(error) && shouldShowAuthError()) {
        setShowAuthError(true);
      } else {
        setSaveError(error.message || t('goals.form.save_failed'));
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['allGoals'] });
    }
  });

  const generateSmartSuggestions = async () => {
    if (!formData.title.trim()) return;
    
    // Abort any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    
    setAiSuggesting(true);
    setSaveError(null);
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `${t('goals.form.ai_prompt_intro')}

**${t('goals.form.ai_prompt_goal')}:** ${formData.title}
**${t('goals.form.ai_prompt_description')}:** ${formData.description}
**${t('goals.form.ai_prompt_category')}:** ${t(`goals.form.categories.${formData.category}`)}
${formData.target_date ? `**${t('goals.form.ai_prompt_date')}:** ${formData.target_date}` : ''}

${t('goals.form.ai_prompt_request')}`,
        response_json_schema: {
          type: "object",
          properties: {
            specific: { type: "string" },
            measurable: { type: "string" },
            achievable: { type: "string" },
            relevant: { type: "string" },
            time_bound: { type: "string" },
            suggested_milestones: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" }
                }
              }
            }
          }
        }
      });

      if (!mountedRef.current) return;
      
      setFormData({
        ...formData,
        smart_criteria: {
          specific: response.specific,
          measurable: response.measurable,
          achievable: response.achievable,
          relevant: response.relevant,
          time_bound: response.time_bound
        },
        milestones: response.suggested_milestones?.map(m => ({ 
          title: m.title, 
          description: m.description,
          completed: false 
        })) || formData.milestones
      });
      setCurrentTab('smart');
    } catch (error) {
      if (error.name === 'AbortError') return;
      console.error('Failed to generate SMART suggestions:', error);
      if (!mountedRef.current) return;
      if (isAuthError(error) && shouldShowAuthError()) {
        setShowAuthError(true);
      } else {
        setSaveError(t('goals.form.ai_failed'));
      }
    } finally {
      if (mountedRef.current) {
        setAiSuggesting(false);
      }
    }
  };

  const addMilestone = () => {
    setFormData({
      ...formData,
      milestones: [...formData.milestones, { title: '', completed: false, due_date: '', description: '' }]
    });
  };

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const updateMilestone = (index, field, value) => {
    const newMilestones = [...formData.milestones];
    newMilestones[index] = { ...newMilestones[index], [field]: value };
    setFormData({ ...formData, milestones: newMilestones });
  };

  const removeMilestone = (index) => {
    setFormData({
      ...formData,
      milestones: formData.milestones.filter((_, i) => i !== index)
    });
  };

  return (
    <>
      {showAuthError && <AuthErrorBanner onDismiss={() => setShowAuthError(false)} />}
      <PremiumDialog onClose={onClose} label={goal ? t('goals.form.edit_title') : t('goals.form.create_title')}
        className="goal-dialog fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 pb-24 overflow-y-auto"
        style={{ 
          zIndex: 50,
          paddingTop: 'env(safe-area-inset-top, 0px)',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 6rem)'
        }}
      >
        <Card className="w-full max-w-3xl border-0 shadow-2xl my-8" style={{ maxHeight: 'calc(100vh - 160px)', zIndex: 55 }}>
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{goal ? t('goals.form.edit_title') : t('goals.form.create_title')}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">{t('goals.form.subtitle')}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} aria-label={t('goals.form.close_aria')}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4 md:p-6 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 260px)' }}>
          <Tabs value={currentTab} onValueChange={setCurrentTab} className="flex flex-col min-h-0">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="basic">{t('goals.form.tabs.basic')}</TabsTrigger>
              <TabsTrigger value="smart">{t('goals.form.tabs.smart')}</TabsTrigger>
              <TabsTrigger value="milestones">{t('goals.form.tabs.milestones')}</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="flex-1">
              <div className="space-y-6">
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">{t('goals.form.goal_title')}</label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder={t('goals.form.goal_title_placeholder')}
                    className="rounded-xl"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">{t('goals.form.description')}</label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder={t('goals.form.description_placeholder')}
                    className="h-24 rounded-xl"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-2 block">{t('goals.form.category')}</label>
                    <BottomSheetSelect
                      value={formData.category}
                      onValueChange={(value) => setFormData({ ...formData, category: value })}
                      options={categories}
                      title={t('goals.form.select_category')}
                      placeholder={t('goals.form.choose_category')}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-2 block">{t('goals.form.target_date')}</label>
                    <DatePickerMobile
                      value={formData.target_date}
                      onChange={(date) => setFormData({ ...formData, target_date: date })}
                      placeholder={t('goals.form.select_target_date')}
                      minDate={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">{t('goals.form.motivation')}</label>
                  <Textarea
                    value={formData.motivation || ''}
                    onChange={(e) => setFormData({ ...formData, motivation: e.target.value })}
                    placeholder={t('goals.form.motivation_placeholder')}
                    className="h-20 rounded-xl"
                  />
                </div>

                {goal && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-2 block">
                      {t('goals.form.progress')}: {formData.progress}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={formData.progress}
                      onChange={(e) => setFormData({ ...formData, progress: parseInt(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                )}

                <Button
                  type="button"
                  onClick={generateSmartSuggestions}
                  disabled={!formData.title || aiSuggesting}
                  variant="outline"
                  className="w-full"
                >
                  {aiSuggesting ? (
                    <>{t('goals.form.generating')}</>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      {t('goals.form.generate')}
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="smart" className="flex-1">
              <div className="space-y-6">
                <div className="bg-secondary/70 p-4 rounded-xl border border-border">
                  <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                    <Target className="w-5 h-5 text-primary" />
                    {t('goals.form.framework_title')}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t('goals.form.framework_description')}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-semibold text-muted-foreground mb-2 block">
                    {t('goals.form.specific_label')}
                  </label>
                  <Textarea
                    value={formData.smart_criteria?.specific || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      smart_criteria: { ...formData.smart_criteria, specific: e.target.value }
                    })}
                    placeholder={t('goals.form.specific_placeholder')}
                    className="h-20 rounded-xl"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-muted-foreground mb-2 block">
                    {t('goals.form.measurable_label')}
                  </label>
                  <Textarea
                    value={formData.smart_criteria?.measurable || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      smart_criteria: { ...formData.smart_criteria, measurable: e.target.value }
                    })}
                    placeholder={t('goals.form.measurable_placeholder')}
                    className="h-20 rounded-xl"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-muted-foreground mb-2 block">
                    {t('goals.form.achievable_label')}
                  </label>
                  <Textarea
                    value={formData.smart_criteria?.achievable || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      smart_criteria: { ...formData.smart_criteria, achievable: e.target.value }
                    })}
                    placeholder={t('goals.form.achievable_placeholder')}
                    className="h-20 rounded-xl"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-muted-foreground mb-2 block">
                    {t('goals.form.relevant_label')}
                  </label>
                  <Textarea
                    value={formData.smart_criteria?.relevant || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      smart_criteria: { ...formData.smart_criteria, relevant: e.target.value }
                    })}
                    placeholder={t('goals.form.relevant_placeholder')}
                    className="h-20 rounded-xl"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-muted-foreground mb-2 block">
                    {t('goals.form.time_bound_label')}
                  </label>
                  <Textarea
                    value={formData.smart_criteria?.time_bound || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      smart_criteria: { ...formData.smart_criteria, time_bound: e.target.value }
                    })}
                    placeholder={t('goals.form.time_bound_placeholder')}
                    className="h-20 rounded-xl"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="milestones" className="flex-1">
              <div className="space-y-6">

                <div className="bg-secondary/70 p-4 rounded-xl border border-border mb-4">
                  <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    {t('goals.form.breakdown_title')}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t('goals.form.breakdown_description')}
                  </p>
                </div>

                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-muted-foreground">{t('goals.form.action_steps')}</label>
                  <Button variant="outline" size="sm" onClick={addMilestone} className="rounded-lg">
                    <Plus className="w-4 h-4 mr-1" />
                    {t('goals.form.add_step')}
                  </Button>
                </div>

                <div className="space-y-3">
                  {formData.milestones.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      {t('goals.form.no_steps')}
                    </div>
                  )}
                  {formData.milestones.map((milestone, index) => (
                    <div key={index} className="p-4 border-2 rounded-xl bg-[hsl(var(--card)/0.97)] hover:border-primary/50 transition-colors">
                      <div className="flex gap-2 mb-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-semibold text-sm flex-shrink-0">
                          {index + 1}
                        </div>
                        <Input
                          value={milestone.title}
                          onChange={(e) => updateMilestone(index, 'title', e.target.value)}
                          placeholder={t('goals.form.step_placeholder', { number: index + 1 })}
                          className="flex-1 rounded-lg font-medium"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeMilestone(index)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                          aria-label={t('goals.form.remove_milestone', { number: index + 1 })}
                         mobileLabelKey="delete">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="ms-0 space-y-2 sm:ms-10">
                        <Textarea
                          value={milestone.description || ''}
                          onChange={(e) => updateMilestone(index, 'description', e.target.value)}
                          placeholder={t('goals.form.step_description_placeholder')}
                          className="rounded-lg text-sm"
                          rows={2}
                        />
                        <div className="flex gap-2">
                          <DatePickerMobile
                            value={milestone.due_date || ''}
                            onChange={(date) => updateMilestone(index, 'due_date', date)}
                            placeholder={t('goals.form.due_date')}
                            minDate={new Date().toISOString().split('T')[0]}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex flex-wrap gap-3 pt-6 border-t mt-6">
            {saveError && (
              <div className="w-full mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {saveError}
              </div>
            )}
            <Button variant="outline" onClick={onClose} className="flex-1">
              {t('goals.form.cancel')}
            </Button>
            <Button
              onClick={() => {
                if (!formData.title.trim() || isSavingRef.current || saveMutation.isPending) return;
                isSavingRef.current = true;
                setSaveError(null);
                saveMutation.mutate(formData);
              }}
              disabled={!formData.title.trim() || isSavingRef.current || saveMutation.isPending}
              className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {saveMutation.isPending ? t('goals.form.saving') : goal ? t('goals.form.update_goal') : t('goals.form.create_goal')}
            </Button>
          </div>
        </CardContent>
      </Card>
      </PremiumDialog>
    </>
  );
}