import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { X, Plus, CheckCircle2, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import PremiumIcon from '@/components/ui/PremiumIcon';

export default function ActionPlanPanel({ session, onClose, onUpdate, className }) {
  const { t } = useTranslation();
  const [newAction, setNewAction] = useState({ action: '', timeline: '' });
  const [isAdding, setIsAdding] = useState(false);
  const queryClient = useQueryClient();

  const updateActionsMutation = useMutation({
    mutationFn: (actions) => base44.entities.CoachingSession.update(session.id, { action_plan: actions }),
    onMutate: async (actions) => {
      const sessionKey = ['coachingSession', session.id];
      await Promise.all([
        queryClient.cancelQueries({ queryKey: sessionKey }),
        queryClient.cancelQueries({ queryKey: ['coachingSessions'] })
      ]);
      const previousSession = queryClient.getQueryData(sessionKey) || session;
      queryClient.setQueryData(sessionKey, (current = session) => ({
        ...current,
        action_plan: actions
      }));
      return { previousSession, sessionKey };
    },
    onError: (_error, _actions, context) => {
      if (context) queryClient.setQueryData(context.sessionKey, context.previousSession);
    },
    onSuccess: (savedSession, actions, context) => {
      queryClient.setQueryData(context?.sessionKey || ['coachingSession', session.id], (current = session) => ({
        ...current,
        ...(savedSession || {}),
        action_plan: savedSession?.action_plan || actions
      }));
    },
    onSettled: () => {
      onUpdate?.();
      queryClient.invalidateQueries({ queryKey: ['coachingSession', session.id] });
      queryClient.invalidateQueries({ queryKey: ['coachingSessions'] });
    }
  });

  const toggleAction = (index) => {
    const updatedActions = (session.action_plan || []).map((action, actionIndex) =>
      actionIndex === index ? { ...action, completed: !action.completed } : action
    );
    updateActionsMutation.mutate(updatedActions);
  };

  const addAction = () => {
    if (!newAction.action.trim()) return;
    
    const updatedActions = [
      ...(session.action_plan || []),
      { ...newAction, completed: false }
    ];
    updateActionsMutation.mutate(updatedActions);
    setNewAction({ action: '', timeline: '' });
    setIsAdding(false);
  };

  const removeAction = (index) => {
    const updatedActions = session.action_plan.filter((_, i) => i !== index);
    updateActionsMutation.mutate(updatedActions);
  };

  const completedCount = session.action_plan?.filter(a => a.completed).length || 0;
  const totalCount = session.action_plan?.length || 0;

  return (
    <Card className={cn("h-full w-full overflow-y-auto rounded-none border-s border-border/70 bg-card shadow-[var(--shadow-md)] lg:w-96", className)}>
      <CardHeader className="border-b border-border/70 sticky top-0 bg-popover z-10">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-primary" />
            {t('coach.action_plan.title')}
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label={t('coach.action_plan.close_aria')} className="min-h-[44px] min-w-[44px]">
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all"
              style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
            />
          </div>
          <span className="text-sm font-medium text-muted-foreground">
            {completedCount}/{totalCount}
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        {session.action_plan?.map((action, index) => (
          <div
            key={index}
            className={cn(
              'p-3 rounded-[var(--radius-control)] border transition-all',
              action.completed 
                ? 'bg-primary/10 border-primary/20' 
                : 'bg-card border-border/70'
            )}
          >
            <div className="flex items-start gap-3">
              <Checkbox
                checked={action.completed}
                onCheckedChange={() => toggleAction(index)}
                disabled={updateActionsMutation.isPending}
                className="mt-1"
              />
              <div className="flex-1">
                <p className={cn(
                  'text-sm font-medium',
                  action.completed ? 'line-through text-muted-foreground' : 'text-foreground'
                )}>
                  {action.action}
                </p>
                {action.timeline && (
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground"><PremiumIcon name="calendar" size="sm" bare /><span>{action.timeline}</span></p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="min-h-[44px] min-w-[44px]"
                onClick={() => removeAction(index)}
                disabled={updateActionsMutation.isPending}
                aria-label={t('coach.action_plan.remove_aria', { number: index + 1 })}
               mobileLabel={t('coach.action_plan.remove_aria', { number: index + 1 })}>
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>
        ))}

        {isAdding ? (
          <Card className="border border-border/70 bg-secondary/45">
            <CardContent className="p-3 space-y-2">
              <Input
                value={newAction.action}
                onChange={(e) => setNewAction({ ...newAction, action: e.target.value })}
                placeholder={t('coach.action_plan.action_placeholder')}
              />
              <Input
                value={newAction.timeline}
                onChange={(e) => setNewAction({ ...newAction, timeline: e.target.value })}
                placeholder={t('coach.action_plan.timeline_placeholder')}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={addAction}
                  className="flex-1"
                >
                  {t('coach.action_plan.add')}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setIsAdding(false);
                    setNewAction({ action: '', timeline: '' });
                  }}
                >
                  {t('coach.action_plan.cancel')}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Button
            variant="outline"
            className="w-full border-dashed"
            onClick={() => setIsAdding(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('coach.action_plan.add_action')}
          </Button>
        )}

        {updateActionsMutation.isError && (
          <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
            {t('coach.action_plan.update_error')}
          </p>
        )}

        {(session.action_plan?.length || 0) === 0 && !isAdding && (
          <div className="text-center py-8 text-muted-foreground">
            <Circle className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
            <p className="text-sm font-medium">{t('coach.action_plan.none')}</p>
            <p className="mt-1 text-xs">{t('coach.action_plan.none_help')}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}