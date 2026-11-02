import { isGoalDateOverdue } from './goalDatePresentation';
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Edit, Calendar, CheckCircle2, ChevronDown, ChevronUp, TrendingUp, BookOpen, Trash2, Sparkles, Bell, LayoutGrid } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getCurrentAppLocale } from '@/components/i18n/appLocale';
import { cn } from '@/lib/utils';
import { safeText } from '@/components/utils/aiDataNormalizer';
import { toBackendMilestone } from './milestoneSchemaAdapter';
import GoalProgressChart from './GoalProgressChart';
import GoalKanbanBoard from './GoalKanbanBoard';
import LinkedJournalEntries from './LinkedJournalEntries';
import AiGoalAdjustment from './AiGoalAdjustment';
import ReminderSettings from './ReminderSettings';
import { emitEntityChange } from '@/components/utils/crossTabSync';

const categoryColors = {
  behavioral: 'bg-blue-100 text-blue-700',
  emotional: 'bg-purple-100 text-purple-700',
  social: 'bg-green-100 text-green-700',
  cognitive: 'bg-orange-100 text-orange-700',
  lifestyle: 'bg-pink-100 text-pink-700'
};

function GoalCard({ goal, onEdit, onDelete, isDeleting }) {
  const { t, i18n } = useTranslation();
  const appLocale = getCurrentAppLocale(i18n);
  const formatGoalDate = (date, options) => new Intl.DateTimeFormat(appLocale, options).format(date);
  const [showChart, setShowChart] = useState(false);
  const [showKanban, setShowKanban] = useState(false);
  const [showJournalEntries, setShowJournalEntries] = useState(false);
  const [showObstacles, setShowObstacles] = useState(false);
  const [showAiAdjustment, setShowAiAdjustment] = useState(false);
  const [showReminders, setShowReminders] = useState(false);

  const queryClient = useQueryClient();

  // Normalize milestones from goal prop and sync to local state
  const getNormalizedMilestones = (milestones) => {
    const source = Array.isArray(milestones) ? milestones : [];
    return source.map((m, i) => {
      if (typeof m === 'string') {
        return { title: m, completed: false, description: '', due_date: null };
      }
      const completed =
      typeof m.completed === 'string' ?
      m.completed === 'true' :
      Boolean(m.completed);
      return {
        title: safeText(m.title || m, t('goals.card.step_default', { number: i + 1 })),
        description: safeText(m.description, ''),
        completed,
        due_date: m.due_date || null,
        completed_date: m.completed_date || null
      };
    });
  };

  const [localMilestones, setLocalMilestones] = useState(() => getNormalizedMilestones(goal.milestones));
  const isMutatingRef = React.useRef(false);

  // Mutation with optimistic update
  const updateMilestone = useMutation({
    mutationFn: async ({ updatedMilestones, newProgress }) => {
      return await base44.entities.Goal.update(goal.id, {
        milestones: updatedMilestones,
        progress: newProgress
      });
    },
    onMutate: async ({ updatedMilestones, newProgress }) => {
      isMutatingRef.current = true;
      await queryClient.cancelQueries({ queryKey: ['allGoals'] });
      const previousGoals = queryClient.getQueryData(['allGoals']);
      queryClient.setQueryData(['allGoals'], (old) => {
        if (!old) return old;
        return old.map((g) => g.id === goal.id ? {
          ...g,
          milestones: [...updatedMilestones],
          progress: newProgress,
          updated_date: new Date().toISOString()
        } : g);
      });
      return { previousGoals };
    },
    onSuccess: () => {
      // Broadcast change to other components and tabs
      emitEntityChange('Goal', 'update');
    },
    onError: (err, _vars, context) => {
      if (context?.previousGoals) {
        queryClient.setQueryData(['allGoals'], context.previousGoals);
      }
      // Revert local state on error
      setLocalMilestones(getNormalizedMilestones(goal.milestones));
      alert(t('goals.card.update_failed', { error: err.message || t('goals.card.unknown_error') }));
    },
    onSettled: () => {
      // Invalidate and refetch to ensure the cache reflects the true server state.
      // This runs after both success and error, releasing the mutation lock.
      queryClient.invalidateQueries({ queryKey: ['allGoals'] });
      isMutatingRef.current = false;
    }
  });

  // Sync local state when goal.milestones changes, but NOT during our own mutation
  React.useEffect(() => {
    if (!isMutatingRef.current) {
      const normalized = getNormalizedMilestones(goal.milestones);
      setLocalMilestones(normalized);
    }
  }, [goal.milestones]);

  const localProgress = React.useMemo(() => {
    if (localMilestones.length === 0) return 0;
    const completed = localMilestones.filter((m) => m.completed).length;
    return Math.round(completed / localMilestones.length * 100);
  }, [localMilestones]);

  const toggleMilestone = (index, checked) => {
    // Normalize checked value (handle "indeterminate" and other edge cases)
    const isChecked = checked === true;

    // Immediately update local state for instant UI feedback
    const updatedMilestones = localMilestones.map((m, i) =>
    i === index ?
    { ...m, completed: isChecked, completed_date: isChecked ? new Date().toISOString() : null } :
    m
    );

    setLocalMilestones(updatedMilestones);

    const completedCount = updatedMilestones.filter((m) => m.completed).length;
    const newProgress = updatedMilestones.length > 0 ?
    Math.round(completedCount / updatedMilestones.length * 100) :
    0;

    // Convert to backend-compatible format
    const milestonesForDb = updatedMilestones.map(toBackendMilestone);

    // Send to server
    updateMilestone.mutate({ updatedMilestones: milestonesForDb, newProgress });
  };

  const isCompleted = goal.status === 'completed';
  const isOverdue = (() => {
    if (!goal.target_date || isCompleted) return false;
    try {
      const targetDate = new Date(goal.target_date);
      return !isNaN(targetDate.getTime()) && isGoalDateOverdue(goal.target_date);
    } catch {
      return false;
    }
  })();

  const handleApplyAdjustment = async (updates) => {
    try {
      const updatedGoal = await base44.entities.Goal.update(goal.id, updates);
      // Optimistically update cache instead of invalidating
      if (updatedGoal?.id) {
        queryClient.setQueryData(['allGoals'], (old = []) =>
        old.map((g) => g.id === updatedGoal.id ? updatedGoal : g)
        );
        queryClient.setQueryData(['goals'], (old = []) =>
        old?.map((g) => g.id === updatedGoal.id ? updatedGoal : g)
        );
      }
      setShowAiAdjustment(false);
    } catch (error) {
      console.error('Failed to apply adjustment:', error);
      alert(t('goals.card.adjustment_failed'));
    }
  };

  return (
    <Card className={cn('border border-border/70 bg-card shadow-[var(--shadow-md)] w-full min-w-0', isCompleted && 'opacity-75')}>
      <CardContent className="p-4 md:p-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 md:gap-0 mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-foreground text-xl font-semibold break-words [overflow-wrap:anywhere]">
                {goal.title}
              </h3>
              {isCompleted && <CheckCircle2 className="w-5 h-5 text-green-600" />}
            </div>
            {goal.description &&
            <p className="text-sm text-muted-foreground mb-3 break-words [overflow-wrap:anywhere]">{goal.description}</p>
            }
            <div className="flex items-center gap-2 flex-wrap">
                {goal.category &&
                <Badge className="bg-orange-100 text-orange-700 px-2.5 py-1 font-medium tracking-[0.01em] leading-4 rounded-2xl inline-flex items-center border transition-colors focus:outline-none focus:ring-1 focus:ring-ring focus:ring-offset-1 border-border/60" variant="secondary">
                  {t(`goals.card.categories.${goal.category}`, { defaultValue: goal.category })}
                </Badge>
                }
                {goal.target_date && (() => {
                try {
                  const date = new Date(goal.target_date);
                  if (isNaN(date.getTime())) return null;
                  return (
                    <Badge
                      variant="outline" className={cn("bg-card text-muted-foreground px-2.5 py-1 font-medium leading-4 rounded-2xl border flex items-center gap-1 border-border", isOverdue && "text-destructive border-destructive/40")}>





                        <Calendar className="w-3 h-3" />
                        {formatGoalDate(date, { year: 'numeric', month: 'short', day: 'numeric' })}
                      </Badge>);

                } catch {
                  return null;
                }
              })()}
              </div>
            </div>
            <div className="flex gap-1 flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(goal);
              }}
              aria-label={t('goals.card.edit_aria')} mobileLabelKey="edit">

              <Edit className="w-4 h-4 text-gray-400" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                if (isDeleting) return;
                if (confirm(t('goals.card.delete_confirm', { title: goal.title }))) {
                  onDelete(goal.id);
                }
              }}
              disabled={isDeleting}
              aria-label={t('goals.card.delete_aria')} mobileLabelKey="delete">

              <Trash2 className="w-4 h-4 text-red-400 hover:text-red-600" />
            </Button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
           <div className="flex items-center justify-between mb-2">
             <span className="text-sm font-medium text-muted-foreground">{t('goals.card.progress')} {updateMilestone.isPending && <span className="text-xs text-muted-foreground ml-2">{t('goals.card.saving')}</span>}</span>
             <span className="text-sm font-bold text-primary">{localProgress}%</span>
           </div>
           <Progress
            value={localProgress}
            className="h-3" />

        </div>

        {/* Milestones */}
        {localMilestones.length > 0 &&
        <div className="space-y-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-muted-foreground">{t('goals.card.tasks')}</p>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-sm font-medium">
                  {localMilestones.filter((m) => m.completed).length}/{localMilestones.length}
                </span>
                <div className="w-20 h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{
                    width: `${localMilestones.length > 0 ? localMilestones.filter((m) => m.completed).length / localMilestones.length * 100 : 0}%`
                  }} />

                </div>
              </div>
            </div>
            {localMilestones.map((milestone, index) => {
            const isOverdue = (() => {
              if (!milestone.due_date || milestone.completed) return false;
              try {
                const dueDate = new Date(milestone.due_date);
                return !isNaN(dueDate.getTime()) && isGoalDateOverdue(milestone.due_date);
              } catch {
                return false;
              }
            })();

            const isDueSoon = (() => {
              if (!milestone.due_date || milestone.completed) return false;
              try {
                const dueDate = new Date(milestone.due_date);
                const daysUntil = Math.ceil((dueDate - new Date()) / (1000 * 60 * 60 * 24));
                return daysUntil >= 0 && daysUntil <= 3;
              } catch {
                return false;
              }
            })();

            return (
              <div
                key={index}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg border transition-colors relative",
                  milestone.completed ? "border-green-100 bg-green-50/30" : "border-border hover:bg-secondary/50",
                  isOverdue && "border-red-200 bg-red-50/30",
                  isDueSoon && !isOverdue && "border-amber-200 bg-amber-50/30",
                  updateMilestone.isPending && "opacity-60"
                )}>

                {milestone.completed &&
                <div className="absolute top-2 end-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  </div>
                }
                <Checkbox
                  checked={Boolean(milestone.completed)}
                  onCheckedChange={(checked) => toggleMilestone(index, checked)} className="bg-card mt-0.5 rounded-sm peer h-4 w-4 shrink-0 border border-primary shadow focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground flex-shrink-0"

                  id={`milestone-${goal.id}-${index}`} />

                <label
                  htmlFor={`milestone-${goal.id}-${index}`}
                  className="flex-1 min-w-0 cursor-pointer">

                  <span
                    className={cn(
                      'text-sm font-medium block break-words [overflow-wrap:anywhere]',
                      milestone.completed ?
                      'line-through text-muted-foreground' :
                      'text-muted-foreground'
                    )}>

                    {safeText(milestone.title, t('goals.card.step_default', { number: index + 1 }))}
                  </span>
                  {milestone.description &&
                  <p className="text-xs text-muted-foreground mt-0.5">{safeText(milestone.description)}</p>
                  }
                  {milestone.due_date && (() => {
                    try {
                      const date = new Date(milestone.due_date);
                      if (isNaN(date.getTime())) return null;
                      const daysUntil = Math.ceil((date - new Date()) / (1000 * 60 * 60 * 24));
                      return (
                        <Badge
                          variant="outline"
                          className={cn(
                            "mt-1 text-xs pointer-events-none",
                            isOverdue && "border-red-300 bg-red-100 text-red-700",
                            isDueSoon && !isOverdue && "border-amber-300 bg-amber-100 text-amber-700"
                          )}>

                          <Calendar className="w-3 h-3 mr-1" />
                          {formatGoalDate(date, { month: 'short', day: 'numeric' })}
                          {!milestone.completed && daysUntil >= 0 && daysUntil <= 7 &&
                          <span className="ml-1">• {daysUntil === 0 ? t('goals.card.today') : t('goals.card.days_short', { count: daysUntil })}</span>
                          }
                          {isOverdue && <span className="ml-1">• {t('goals.card.overdue')}</span>}
                        </Badge>);

                    } catch {
                      return null;
                    }
                  })()}
                </label>
              </div>);

          })}
          </div>
        }

        {/* Obstacles Section */}
        {(goal.obstacles?.identified_obstacles?.length > 0 || goal.obstacles?.cognitive_distortions?.length > 0) &&
        <div className="mt-4">
            <Button
            variant="outline"
            onClick={() => setShowObstacles(!showObstacles)}
            className="flex items-center justify-center gap-2 w-full min-w-0">

              <span className="flex-1 text-left font-medium min-w-0 break-words">{t('goals.card.obstacles_work')}</span>
              {showObstacles ? <ChevronUp className="w-4 h-4 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 flex-shrink-0" />}
            </Button>
            {showObstacles &&
          <div className="mt-3 p-4 bg-amber-50 rounded-lg border border-amber-200 space-y-3">
                {goal.obstacles.identified_obstacles?.length > 0 &&
            <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">{t('goals.card.identified_obstacles')}</p>
                    <ul className="space-y-1">
                      {goal.obstacles.identified_obstacles.map((obstacle, i) =>
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-amber-600 mt-1">•</span>
                          <span>{obstacle}</span>
                        </li>
                )}
                    </ul>
                  </div>
            }
                {goal.obstacles.cognitive_distortions?.length > 0 &&
            <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">{t('goals.card.thinking_patterns')}</p>
                    <div className="flex flex-wrap gap-1">
                      {goal.obstacles.cognitive_distortions.map((dist, i) =>
                <Badge key={i} variant="outline" className="text-xs bg-[hsl(var(--card)/0.97)]">
                          {dist}
                        </Badge>
                )}
                    </div>
                  </div>
            }
                {goal.obstacles.balanced_thoughts?.length > 0 &&
            <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">{t('goals.card.balanced_thoughts')}</p>
                    <ul className="space-y-1">
                      {goal.obstacles.balanced_thoughts.slice(0, 3).map((thought, i) =>
                <li key={i} className="text-sm text-green-700 flex items-start gap-2">
                          <span className="text-green-600 mt-1">✓</span>
                          <span>{thought}</span>
                        </li>
                )}
                    </ul>
                  </div>
            }
              </div>
          }
          </div>
        }

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 mt-4">
          <Button
            variant="outline"
            onClick={() => setShowChart(!showChart)} className="bg-primary text-primary-foreground px-3 text-sm font-medium tracking-[0.005em] rounded-2xl justify-center whitespace-nowrap transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-border/70 shadow-[var(--shadow-sm)] hover:bg-secondary/92 hover:text-foreground active:bg-secondary/96 h-8 min-h-[44px] md:min-h-0 flex items-center gap-1.5"

            size="sm">

            <TrendingUp className="w-4 h-4" />
            <span>{t(showChart ? 'goals.card.hide' : 'goals.card.show')} {t('goals.card.chart')}</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowKanban(!showKanban)} className="bg-secondary text-secondary-foreground px-3 text-sm font-medium tracking-[0.005em] rounded-2xl justify-center whitespace-nowrap transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-border/70 shadow-[var(--shadow-sm)] hover:bg-secondary/92 hover:text-foreground active:bg-secondary/96 h-8 min-h-[44px] md:min-h-0 flex items-center gap-1.5"

            size="sm">

            <LayoutGrid className="w-4 h-4" />
            <span>{t(showKanban ? 'goals.card.hide' : 'goals.card.show')} {t('goals.card.board')}</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowJournalEntries(!showJournalEntries)} className="bg-primary text-primary-foreground px-3 text-sm font-medium tracking-[0.005em] rounded-2xl justify-center whitespace-nowrap transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-border/70 shadow-[var(--shadow-sm)] hover:bg-secondary/92 hover:text-foreground active:bg-secondary/96 h-8 min-h-[44px] md:min-h-0 flex items-center gap-1.5"

            size="sm">

            <BookOpen className="w-4 h-4" />
            <span>{t(showJournalEntries ? 'goals.card.hide' : 'goals.card.show')} {t('goals.card.journal')}</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowAiAdjustment(true)} className="bg-primary text-primary-foreground px-3 text-sm font-medium tracking-[0.005em] rounded-2xl justify-center whitespace-nowrap transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border shadow-[var(--shadow-sm)] hover:text-foreground active:bg-secondary/96 h-8 min-h-[44px] md:min-h-0 flex items-center gap-1.5 border-border hover:bg-primary/90"

            size="sm">

            <Sparkles className="w-4 h-4" />
            <span>{t('goals.card.ai_adjust')}</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowReminders(true)} className="bg-primary text-primary-foreground px-3 text-sm font-medium tracking-[0.005em] rounded-2xl justify-center whitespace-nowrap transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-border/70 shadow-[var(--shadow-sm)] hover:bg-secondary/92 hover:text-foreground active:bg-secondary/96 h-8 min-h-[44px] md:min-h-0 flex items-center gap-1.5"

            size="sm">

            <Bell className="w-4 h-4" />
            <span>{t('goals.card.reminders')}</span>
          </Button>
        </div>

        {/* Progress Chart */}
        {showChart &&
        <div className="mt-4 pt-4 border-t">
            <GoalProgressChart goal={goal} />
          </div>
        }

        {/* Kanban Board */}
        {showKanban &&
        <div className="mt-4 pt-4 border-t">
            <GoalKanbanBoard goal={goal} />
          </div>
        }

        {/* Linked Journal Entries */}
        {showJournalEntries &&
        <div className="mt-4 pt-4 border-t">
            <LinkedJournalEntries goalId={goal.id} />
          </div>
        }
      </CardContent>

      {/* AI Adjustment Modal */}
      {showAiAdjustment &&
      <AiGoalAdjustment
        goal={goal}
        onApply={handleApplyAdjustment}
        onClose={() => setShowAiAdjustment(false)} />

      }

      {/* Reminder Settings Modal */}
      {showReminders &&
      <ReminderSettings
        goal={goal}
        onClose={() => setShowReminders(false)} />

      }
    </Card>);

}

export default React.memo(GoalCard);