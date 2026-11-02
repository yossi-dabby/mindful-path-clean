import { isGoalDateOverdue } from './goalDatePresentation';
import { useTranslation } from 'react-i18next';
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar, GripVertical } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toBackendMilestone } from './milestoneSchemaAdapter';
import { emitEntityChange } from '@/components/utils/crossTabSync';

const statusColumns = {
  todo: { title: 'To Do', color: 'bg-secondary/70', badge: 'bg-muted-foreground' },
  in_progress: { title: 'In Progress', color: 'bg-secondary/70', badge: 'bg-primary' },
  completed: { title: 'Completed', color: 'bg-secondary/70', badge: 'bg-primary' }
};

export default function GoalKanbanBoard({ goal }) {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [localMilestones, setLocalMilestones] = useState(() => {
    if (!goal.milestones || goal.milestones.length === 0) return [];
    return goal.milestones.map((m, i) => ({
      ...m,
      id: `milestone-${i}`,
      index: i,
      status: m.completed ? 'completed' : (m.status || 'todo')
    }));
  });
  const isMutatingRef = React.useRef(false);

  // Sync from server when goal.milestones changes, but NOT during our own mutation
  React.useEffect(() => {
    if (isMutatingRef.current) return;
    
    if (!goal.milestones || goal.milestones.length === 0) {
      setLocalMilestones([]);
      return;
    }
    const synced = goal.milestones.map((m, i) => ({
      ...m,
      id: `milestone-${i}`,
      index: i,
      status: m.completed ? 'completed' : (m.status || 'todo')
    }));
    setLocalMilestones(synced);
  }, [goal.milestones]);

  const updateMilestone = useMutation({
    mutationFn: async ({ milestones, progress }) => {
      const result = await base44.entities.Goal.update(goal.id, { milestones, progress });
      return result;
    },
    onMutate: async ({ milestones, progress }) => {
      isMutatingRef.current = true;
      await queryClient.cancelQueries({ queryKey: ['allGoals'] });
      const previousGoals = queryClient.getQueryData(['allGoals']);
      queryClient.setQueryData(['allGoals'], (old = []) => 
        old.map((g) => g.id === goal.id ? { 
          ...g, 
          milestones: [...milestones], 
          progress,
          updated_date: new Date().toISOString()
        } : g)
      );
      return { previousGoals };
    },
    onSuccess: () => {
      // Broadcast change to other components and tabs
      emitEntityChange('Goal', 'update');
      // Mark mutation as complete after a brief delay
      setTimeout(() => {
        isMutatingRef.current = false;
      }, 100);
    },
    onError: (_err, _vars, context) => {
      isMutatingRef.current = false;
      if (context?.previousGoals) {
        queryClient.setQueryData(['allGoals'], context.previousGoals);
      }
    }
  });

  const handleDragEnd = (result) => {
    const { destination, source, draggableId } = result;
    
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const newStatus = destination.droppableId;
    
    const updatedMilestones = localMilestones.map(m => {
      if (m.id === draggableId) {
        return {
          ...m,
          status: newStatus,
          completed: newStatus === 'completed',
          completed_date: newStatus === 'completed' ? new Date().toISOString() : null
        };
      }
      return m;
    });
    
    const completedCount = updatedMilestones.filter(m => m.completed).length;
    const newProgress = Math.round((completedCount / updatedMilestones.length) * 100);
    
    // Optimistic update
    setLocalMilestones(updatedMilestones);
    
    // Save to backend
    const milestonesForDb = updatedMilestones.map(toBackendMilestone);
    
    updateMilestone.mutate({ milestones: milestonesForDb, progress: newProgress });
  };

  const toggleMilestoneComplete = (milestoneId, checked) => {
    const updatedMilestones = localMilestones.map(m => {
      if (m.id === milestoneId) {
        return {
          ...m,
          status: checked ? 'completed' : 'todo',
          completed: checked,
          completed_date: checked ? new Date().toISOString() : null
        };
      }
      return m;
    });
    
    const completedCount = updatedMilestones.filter(m => m.completed).length;
    const newProgress = Math.round((completedCount / updatedMilestones.length) * 100);
    
    // Optimistic update
    setLocalMilestones(updatedMilestones);
    
    // Save to backend
    const milestonesForDb = updatedMilestones.map(toBackendMilestone);
    
    updateMilestone.mutate({ milestones: milestonesForDb, progress: newProgress });
  };

  const getMilestonesByStatus = (status) => {
    return localMilestones.filter(m => m.status === status);
  };

  if (!goal.milestones || goal.milestones.length === 0) {
    return (
      <Card className="border border-border/70 bg-card shadow-[var(--shadow-md)]">
        <CardContent className="p-8 text-center text-muted-foreground">
          {t('path_ui.no_tasks')}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-border/70 bg-card shadow-[var(--shadow-md)]">
      <CardHeader>
        <CardTitle className="text-lg">{t('path_ui.board')}</CardTitle>
        <p className="text-sm text-muted-foreground">{t('path_ui.board_hint')}</p>
      </CardHeader>
      <CardContent>
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {Object.entries(statusColumns).map(([status, config]) => {
              const tasks = getMilestonesByStatus(status);
              return (
                <div key={status} className="flex min-w-0 flex-col">
                  <div className={cn('rounded-t-lg p-3 flex items-center justify-between', config.color)}>
                    <h3 className="font-semibold text-sm">{t(`path_ui.${status}`)}</h3>
                    <Badge className={cn('text-white', config.badge)}>
                      {tasks.length}
                    </Badge>
                  </div>
                  
                  <Droppable droppableId={status}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={cn(
                          'min-h-[200px] p-2 rounded-b-lg border-2 border-t-0 transition-colors',
                          snapshot.isDraggingOver ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-gray-50'
                        )}
                      >
                        <div className="space-y-2">
                          {tasks.map((milestone, index) => {
                            const isOverdue = (() => {
                              if (!milestone.due_date || milestone.completed) return false;
                              try {
                                const dueDate = new Date(milestone.due_date);
                                return !isNaN(dueDate.getTime()) && isGoalDateOverdue(milestone.due_date);
                              } catch {
                                return false;
                              }
                            })();

                            return (
                              <Draggable
                                key={milestone.id}
                                draggableId={milestone.id}
                                index={index}
                              >
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    className={cn(
                                      'bg-[hsl(var(--card)/0.97)] rounded-lg p-3 shadow-sm border transition-all',
                                      snapshot.isDragging && 'shadow-lg rotate-2',
                                      isOverdue && 'border-red-300'
                                    )}
                                  >
                                    <div className="flex items-start gap-2">
                                      <Checkbox
                                        checked={milestone.completed}
                                        onCheckedChange={(checked) => toggleMilestoneComplete(milestone.id, checked)}
                                        className="mt-0.5"
                                        id={`kanban-${milestone.id}`}
                                        onClick={(e) => e.stopPropagation()}
                                      />
                                      <div {...provided.dragHandleProps} className="mt-1 cursor-grab active:cursor-grabbing">
                                        <GripVertical className="w-4 h-4 text-gray-400" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className={cn(
                                          'text-sm font-medium',
                                          milestone.completed && 'line-through text-gray-400'
                                        )}>
                                          {milestone.title}
                                        </p>
                                        {milestone.description && (
                                          <p className="text-xs text-muted-foreground mt-1">
                                            {milestone.description}
                                          </p>
                                        )}
                                        {milestone.due_date && (() => {
                                          try {
                                            const date = new Date(milestone.due_date);
                                            if (isNaN(date.getTime())) return null;
                                            return (
                                              <div className={cn(
                                                'flex items-center gap-1 mt-2 text-xs',
                                                isOverdue ? 'text-red-600' : 'text-muted-foreground'
                                              )}>
                                                <Calendar className="w-3 h-3" />
                                                {format(date, 'MMM d')}
                                                {isOverdue && <span className="ml-1 font-semibold">Overdue</span>}
                                              </div>
                                            );
                                          } catch {
                                            return null;
                                          }
                                        })()}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </Draggable>
                            );
                          })}
                          {provided.placeholder}
                        </div>
                        {tasks.length === 0 && (
                          <div className="text-center py-8 text-sm text-gray-400">
                            Drag tasks here
                          </div>
                        )}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </DragDropContext>
      </CardContent>
    </Card>
  );
}