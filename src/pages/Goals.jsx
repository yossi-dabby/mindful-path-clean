import BotanicalAccent from '@/components/brand/BotanicalAccent';
import MoreActions from '@/components/ui/MoreActions';
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useCrossTabInvalidation } from '../components/utils/useCrossTabInvalidation';
import { useToast } from '@/components/ui/use-toast';
import { emitEntityChange } from '../components/utils/crossTabSync';
import { isAuthError, shouldShowAuthError } from '../components/utils/authErrorHandler';
import AuthErrorBanner from '../components/utils/AuthErrorBanner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Target, Calendar as CalendarIcon, Sparkles, Lightbulb, Clock, LayoutGrid } from 'lucide-react';
import GoalForm from '../components/goals/GoalForm';
import GoalCard from '../components/goals/GoalCard';
import GoalCalendar from '../components/goals/GoalCalendar';
import GoalKanbanBoard from '../components/goals/GoalKanbanBoard';
import AiGoalSuggestions from '../components/goals/AiGoalSuggestions';
import AiGoalBreakdown from '../components/goals/AiGoalBreakdown';
import GoalMotivation from '../components/goals/GoalMotivation';
import AiGoalCoaching from '../components/goals/AiGoalCoaching';
import MilestonesTimeline from '../components/goals/MilestonesTimeline';
import GoalTemplateLibrary from '../components/goals/GoalTemplateLibrary';
import PullToRefresh from '../components/utils/PullToRefresh';
import { useTranslation } from 'react-i18next';

export default function Goals() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showAiSuggestions, setShowAiSuggestions] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(null);
  const [showCoaching, setShowCoaching] = useState(null);
  const [prefilledGoal, setPrefilledGoal] = useState(null);
  const [showAuthError, setShowAuthError] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [showKanban, setShowKanban] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const queryClient = useQueryClient();

  // Enable cross-tab synchronization
  useCrossTabInvalidation();

  const { data: goals = [], isLoading, isError, error: goalsError, refetch } = useQuery({
    queryKey: ['allGoals'],
    queryFn: async () => {
      const result = await base44.entities.Goal.list('-created_date');
      return Array.isArray(result) ?
      result.map((goal) => ({
        ...goal,
        ...goal.data,
        id: goal.id,
        created_date: goal.created_date,
        updated_date: goal.updated_date,
        created_by: goal.created_by
      })) :
      [];
    },
    initialData: [],
    refetchOnWindowFocus: false,
    refetchOnMount: 'always', // Always fetch on mount to ensure fresh data
    staleTime: 30000
  });

  // React Query v5 removed onError from useQuery; handle it via the returned error instead.
  React.useEffect(() => {
    if (goalsError && isAuthError(goalsError) && shouldShowAuthError()) {
      setShowAuthError(true);
    }
  }, [goalsError]);

  const deleteGoalMutation = useMutation({
    mutationFn: (goalId) => base44.entities.Goal.delete(goalId),
    onMutate: async (goalId) => {
      await queryClient.cancelQueries({ queryKey: ['allGoals'] });
      const previousGoals = queryClient.getQueryData(['allGoals']);
      queryClient.setQueryData(['allGoals'], (old = []) => old.filter((goal) => goal.id !== goalId));
      return { previousGoals };
    },
    onSuccess: () => {
      emitEntityChange('Goal', 'delete');
    },
    onError: (error, _goalId, context) => {
      if (context?.previousGoals) {
        queryClient.setQueryData(['allGoals'], context.previousGoals);
      }
      if (isAuthError(error) && shouldShowAuthError()) {
        setShowAuthError(true);
      } else {
        alert('Failed to delete goal. Check your connection and try again.');
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['allGoals'] });
    }
  });

  const activeGoals = goals.filter((g) => g.status === 'active');
  const completedGoals = goals.filter((g) => g.status === 'completed');

  const handleEdit = (goal) => {
    setEditingGoal(goal);
    setShowForm(true);
  };

  const handleClose = () => {
    setShowForm(false);
    setEditingGoal(null);
    setPrefilledGoal(null);
    // Let react-query handle refetching naturally
  };

  const handleSelectAiGoal = (goalData) => {
    setPrefilledGoal(goalData);
    setShowAiSuggestions(false);
    setShowForm(true);
  };

  const handleSelectTemplate = (template) => {
    setPrefilledGoal({
      title: template.title,
      description: template.description,
      category: template.category,
      motivation: template.motivation,
      smart_criteria: template.smart_criteria,
      milestones: template.milestones?.map((m) => ({
        title: m.title,
        description: m.description,
        completed: false
      }))
    });
    setShowTemplates(false);
    setShowForm(true);
  };

  const updateGoalMutation = useMutation({
    mutationFn: ({ goalId, data }) => base44.entities.Goal.update(goalId, data),
    onMutate: async ({ goalId, data }) => {
      await queryClient.cancelQueries({ queryKey: ['allGoals'] });
      const previousGoals = queryClient.getQueryData(['allGoals']);
      queryClient.setQueryData(['allGoals'], (old = []) =>
        old.map((g) => g.id === goalId ? { ...g, ...data, updated_date: new Date().toISOString() } : g)
      );
      return { previousGoals };
    },
    onSuccess: (updatedGoal) => {
      if (updatedGoal?.id) {
        queryClient.setQueryData(['allGoals'], (old = []) =>
        old.map((g) => g.id === updatedGoal.id ? {
          ...updatedGoal,
          ...updatedGoal.data,
          id: updatedGoal.id,
          created_date: updatedGoal.created_date,
          updated_date: updatedGoal.updated_date,
          created_by: updatedGoal.created_by
        } : g)
        );
      }
      emitEntityChange('Goal', 'update');
    },
    onError: (error, _variables, context) => {
      if (context?.previousGoals) {
        queryClient.setQueryData(['allGoals'], context.previousGoals);
      }
      if (isAuthError(error) && shouldShowAuthError()) {
        setShowAuthError(true);
      } else {
        toast({ title: t('goals.update_error', 'Failed to update goal'), description: t('goals.update_error_desc', 'Check your connection and try again.'), variant: 'destructive' });
      }
      /* alert removed — was: alert('Failed to update goal...') */
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['allGoals'] });
    }
  });

  const handleApplyBreakdown = (breakdown) => {
    if (showBreakdown && breakdown.milestones) {
      updateGoalMutation.mutate({
        goalId: showBreakdown.id,
        data: {
          milestones: breakdown.milestones.map((m) => ({
            title: m.title,
            completed: false
          }))
        }
      });
      setShowBreakdown(null);
    }
  };

  return (
    <>
      {showAuthError && <AuthErrorBanner onDismiss={() => setShowAuthError(false)} />}
      <PullToRefresh queryKeys={['allGoals', 'recentGoals']}>
        <div data-testid="goals-page" className="p-4 md:p-8 pb-32 md:pb-24 max-w-5xl mx-auto" style={{ minHeight: '100dvh' }}>
      {/* Header */}
      <div className="garden-responsive-heading flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-8 mt-4">
        <div className="flex min-w-0 items-center gap-3">
          <Button
                variant="ghost"
                size="icon"
                onClick={() => window.history.back()}
                style={{ borderRadius: '50%' }}
                aria-label={t('goals.go_back_aria')}>

            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
          </Button>
          <div>
            <div className="botanical-title-row"><h1 className="mb-1 text-2xl font-medium md:text-3xl lg:text-4xl md:mb-2" style={{ color: 'hsl(var(--foreground))' }}>{t('goals.title')}</h1><BotanicalAccent variant="leaves" className="botanical-title-art" /></div>
            <p className="text-foreground text-sm font-medium text-start md:text-base" style={{ color: 'hsl(var(--muted-foreground))' }}>{t('goals.subtitle')}</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <MoreActions>
          <Button variant="outline" onClick={() => { setEditingGoal(null); setPrefilledGoal(null); setShowForm(true); }} data-testid="goal-create-manual">{t('goals.form.create_title')}</Button>
          <Button
                onClick={() => setShowCalendar(!showCalendar)}
                variant="outline" className="bg-primary text-primary-foreground px-3 text-sm font-medium tracking-[0.005em] rounded-[var(--radius-control)] inline-flex items-center justify-center gap-2 whitespace-nowrap transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-border/70 shadow-[var(--shadow-sm)] hover:bg-secondary/92 hover:text-foreground active:bg-secondary/96 h-8 min-h-[44px] md:min-h-0 md:text-base"

                size="sm"
                style={{ borderRadius: '24px' }}>

            <CalendarIcon className="w-4 h-4 md:w-5 md:h-5 md:mr-2" />
            <span className="inline">{t('goals.view_calendar')}</span>
          </Button>
          <Button
                onClick={() => setShowTimeline(!showTimeline)}
                variant="outline" className="bg-primary text-primary-foreground px-3 text-sm font-medium tracking-[0.005em] rounded-[var(--radius-control)] inline-flex items-center justify-center gap-2 whitespace-nowrap transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-border/70 shadow-[var(--shadow-sm)] hover:bg-secondary/92 hover:text-foreground active:bg-secondary/96 h-8 min-h-[44px] md:min-h-0 md:text-base"

                size="sm"
                style={{ borderRadius: '24px' }}>

            <Clock className="w-4 h-4 md:w-5 md:h-5 md:mr-2" />
            <span className="inline">{t('goals.view_timeline')}</span>
          </Button>
          <Button
                onClick={() => setShowKanban(!showKanban)}
                variant="outline" className="bg-primary text-primary-foreground px-3 text-sm font-medium tracking-[0.005em] rounded-[var(--radius-control)] inline-flex items-center justify-center gap-2 whitespace-nowrap transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-border/70 shadow-[var(--shadow-sm)] hover:bg-secondary/92 hover:text-foreground active:bg-secondary/96 h-8 min-h-[44px] md:min-h-0 md:text-base"

                size="sm"
                style={{ borderRadius: '24px' }}>

            <LayoutGrid className="w-4 h-4 md:w-5 md:h-5 md:mr-2" />
            <span className="inline">{t('goals.view_kanban')}</span>
          </Button>
          </MoreActions>
          <Button
                onClick={() => setShowTemplates(true)}
                variant="outline" className="bg-primary text-primary-foreground px-3 text-sm font-medium tracking-[0.005em] rounded-[var(--radius-control)] inline-flex items-center justify-center gap-2 whitespace-nowrap transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-border/70 shadow-[var(--shadow-sm)] hover:bg-secondary/92 hover:text-foreground active:bg-secondary/96 h-8 min-h-[44px] md:min-h-0 md:text-base"

                size="sm"
                style={{ borderRadius: '24px' }}>

            <Target className="w-4 h-4 md:w-5 md:h-5 md:mr-2" />
            <span className="inline">{t('goals.view_templates')}</span>
          </Button>
          <Button
                onClick={() => setShowAiSuggestions(true)}
                aria-label={t('goals.ai_suggestions')}
                variant="outline" className="bg-primary text-primary-foreground px-3 text-sm font-medium tracking-[0.005em] rounded-[var(--radius-control)] inline-flex items-center justify-center gap-2 whitespace-nowrap transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-border/70 shadow-[var(--shadow-sm)] hover:bg-secondary/92 hover:text-foreground active:bg-secondary/96 h-8 min-h-[44px] md:min-h-0 md:text-base"

                size="sm"
                style={{ borderRadius: '24px' }}>

            <Sparkles className="w-4 h-4 md:w-5 md:h-5 md:mr-2" />
            <span className="inline">{t('goals.ai_suggestions')}</span>
          </Button>
          <Button
                onClick={() => navigate('/Chat?intent=goal_work')} className="bg-primary text-primary-foreground px-3 text-sm font-medium tracking-[0.005em] rounded-[var(--radius-control)] inline-flex items-center justify-center gap-2 whitespace-nowrap border border-transparent transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow-[var(--shadow-md)] hover:bg-primary/92 hover:shadow-[var(--shadow-lg)] active:bg-primary/95 h-8 min-h-[44px] md:min-h-0 md:text-base"

                size="sm"
                style={{
                  borderRadius: '24px',
                  backgroundColor: 'hsl(var(--primary))',
                  boxShadow: 'var(--shadow-md)'
                }}>

            <Plus className="w-4 h-4 md:w-5 md:h-5 mr-1 md:mr-2" />
            {t('goals.new_goal')}
          </Button>
        </div>
      </div>

      {/* Goals List */}
      {isError ?
          <Card className="border-0" style={{
            borderRadius: '32px',
            background: 'hsl(var(--card))',
            boxShadow: '0 12px 40px rgba(239, 68, 68, 0.12)'
          }}>
          <CardContent className="p-5 sm:p-10 text-center">
            <div className="w-20 h-20 flex items-center justify-center mx-auto mb-4" style={{
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.1)'
              }}>
              <Target className="w-10 h-10 text-red-500" />
            </div>
            <h2 className="text-2xl font-semibold mb-2 text-foreground">{t('goals.error_title')}</h2>
            <p className="mb-6 text-muted-foreground">{t('goals.error_description')}</p>
            <Button
                onClick={() => refetch()}
                className="text-white px-8 py-6"
                style={{
                  borderRadius: '24px',
                  backgroundColor: 'hsl(var(--primary))',
                  boxShadow: 'var(--shadow-md)'
                }}>

              {t('goals.retry')}
            </Button>
          </CardContent>
        </Card> :
          isLoading ?
          <div className="text-center py-12">
          <p className="text-muted-foreground">{t('goals.loading')}</p>
        </div> :
          goals.length === 0 ?
          <Card className="border-0" style={{
            borderRadius: '32px',
            background: 'hsl(var(--card) / 0.97)',
            boxShadow: 'var(--shadow-md)'
          }}>
          <CardContent className="p-5 sm:p-10 text-center">
            <div className="w-20 h-20 flex items-center justify-center mx-auto mb-4" style={{
                borderRadius: '50%',
                background: 'hsl(var(--card) / 0.97)'
              }}>
              <Target className="w-10 h-10" style={{ color: 'hsl(var(--primary))' }} />
            </div>
            <h2 className="text-2xl font-semibold mb-2" style={{ color: 'hsl(var(--foreground))' }}>{t('goals.first_goal_title')}</h2>
            <p className="mb-6 max-w-md mx-auto" style={{ color: 'hsl(var(--muted-foreground))' }}>
              {t('goals.first_goal_description')}
            </p>
            <div className="flex flex-col gap-3 items-center max-w-md mx-auto">
              <Button
                  onClick={() => setShowTemplates(true)}
                  className="h-auto min-h-12 whitespace-normal text-primary-foreground px-4 py-3 text-base w-full"
                  style={{
                    borderRadius: '32px',
                    background: 'hsl(var(--primary))',
                    boxShadow: 'var(--shadow-md)'
                  }}>

                <Target className="w-5 h-5 mr-2" />
                {t('goals.browse_templates')}
              </Button>
              <Button
                  onClick={() => setShowAiSuggestions(true)}
                aria-label={t('goals.ai_suggestions')}
                  variant="outline"
                  className="h-auto min-h-12 whitespace-normal px-4 py-3 text-base w-full"
                  style={{ borderRadius: '32px' }}>

                <Sparkles className="w-5 h-5 mr-2" />
                {t('goals.get_ai_suggestions')}
              </Button>
              <Button
                  onClick={() => navigate('/Chat?intent=goal_work')}
                  variant="outline"
                  className="h-auto min-h-12 whitespace-normal px-4 py-3 text-base w-full"
                  style={{ borderRadius: '32px' }}>

                {t('goals.create_with_ai')}
              </Button>
            </div>
          </CardContent>
        </Card> :

          <div className="space-y-8">
          {/* Motivation */}
          <GoalMotivation goals={activeGoals} />

          {/* Calendar View */}
          {showCalendar &&
            <GoalCalendar goals={goals} />
            }

          {/* Timeline View */}
          {showTimeline &&
            <div className="mb-8">
              <MilestonesTimeline />
            </div>
            }

          {/* Kanban Board for All Goals */}
          {showKanban &&
            <div className="mb-8">
              {activeGoals.length > 0 ?
              activeGoals.map((goal) =>
              <div key={goal.id} className="mb-6">
                    <h3 className="text-lg font-semibold text-foreground mb-3">{goal.title}</h3>
                    <GoalKanbanBoard goal={goal} />
                  </div>
              ) :

              <Card className="border-0" style={{
                borderRadius: '24px',
                background: 'hsl(var(--card) / 0.97)',
                boxShadow: 'var(--shadow-md)'
              }}>
                  <CardContent className="p-8 text-center">
                    <LayoutGrid className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <p className="text-muted-foreground">{t('goals.no_active_kanban')}</p>
                  </CardContent>
                </Card>
              }
            </div>
            }

          {/* Active Goals */}
          {activeGoals.length > 0 &&
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <h2 className="text-xl font-semibold text-foreground">{t('goals.active_goals')}</h2>
                {activeGoals.length > 0 &&
                <Button
                  onClick={() => setShowAiSuggestions(true)}
                aria-label={t('goals.ai_suggestions')}
                  variant="outline"
                  size="sm" className="bg-primary text-primary-foreground px-3 text-base font-medium tracking-[0.005em] rounded-2xl inline-flex items-center justify-center whitespace-nowrap transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-border/70 shadow-[var(--shadow-sm)] hover:bg-secondary/92 hover:text-foreground active:bg-secondary/96 h-8 min-h-[44px] md:min-h-0 gap-2">


                    <Sparkles className="w-4 h-4" />
                    {t('goals.get_more_suggestions')}
                  </Button>
                }
              </div>
              <div className="space-y-4">
                {activeGoals.map((goal) =>
                <div key={goal.id}>
                   <GoalCard goal={goal} onEdit={handleEdit} onDelete={deleteGoalMutation.mutate} isDeleting={deleteGoalMutation.isPending} />
                   <div className="flex flex-col md:flex-row gap-2 mt-2">
                     <Button
                      onClick={() => setShowBreakdown(goal)}
                      variant="outline"
                      size="sm" className="bg-primary text-primary-foreground px-3 text-xs font-medium tracking-[0.005em] rounded-2xl inline-flex items-center justify-center whitespace-nowrap transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-border/70 shadow-[var(--shadow-sm)] hover:bg-secondary/92 hover:text-foreground active:bg-secondary/96 h-8 min-h-[44px] md:min-h-0 gap-2 w-full md:w-auto">


                       <Lightbulb className="w-4 h-4" />
                       {t('goals.break_down')}
                     </Button>
                     <Button
                      onClick={() => setShowCoaching(goal)}
                      variant="outline"
                      size="sm" className="bg-[hsl(var(--card)/0.88)] text-secondary-foreground px-3 text-xs font-medium tracking-[0.005em] rounded-2xl inline-flex items-center justify-center whitespace-nowrap transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-border/70 shadow-[var(--shadow-sm)] hover:bg-secondary/92 hover:text-foreground active:bg-secondary/96 h-8 min-h-[44px] md:min-h-0 gap-2 w-full md:w-auto"

                      style={{ borderColor: 'hsl(var(--primary))', color: 'hsl(var(--primary))' }}>

                       <Sparkles className="w-4 h-4" />
                       {t('goals.coach_button')}
                     </Button>
                   </div>
                 </div>
                )}
              </div>
            </div>
            }

          {/* Completed Goals */}
          {completedGoals.length > 0 &&
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-4">{t('goals.completed_goals')}</h2>
              <div className="space-y-4">
                {completedGoals.map((goal) =>
                <GoalCard key={goal.id} goal={goal} onEdit={handleEdit} onDelete={deleteGoalMutation.mutate} isDeleting={deleteGoalMutation.isPending} />
                )}
              </div>
            </div>
            }
        </div>
          }

      {/* Goal Form Modal */}
      {showForm && <GoalForm goal={editingGoal} prefilledData={prefilledGoal} onClose={handleClose} />}

      {/* AI Goal Suggestions */}
      {showAiSuggestions &&
          <AiGoalSuggestions
            onSelectGoal={handleSelectAiGoal}
            onClose={() => setShowAiSuggestions(false)} />

          }

      {/* AI Goal Breakdown */}
      {showBreakdown &&
          <AiGoalBreakdown
            goal={showBreakdown}
            onApplySteps={handleApplyBreakdown}
            onClose={() => setShowBreakdown(null)} />

          }

      {/* AI Goal Coaching */}
      {showCoaching &&
          <AiGoalCoaching
            goal={showCoaching}
            onClose={() => setShowCoaching(null)} />

          }

      {/* Goal Template Library */}
      {showTemplates &&
          <GoalTemplateLibrary
            onSelectTemplate={handleSelectTemplate}
            onClose={() => setShowTemplates(false)} />

          }
        </div>
      </PullToRefresh>
    </>);

}