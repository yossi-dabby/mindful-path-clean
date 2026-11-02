import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import BottomSheetSelect from '@/components/ui/bottom-sheet-select';
import { Calendar, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { format, startOfDay, endOfDay, addDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { safeText } from '@/components/utils/aiDataNormalizer';

const DATE_FILTER_OPTIONS = [
  { value: 'all', label: 'All Dates' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'week', label: 'Next 7 Days' },
  { value: 'month', label: 'Next 30 Days' },
];

export default function MilestonesTimeline() {
  const queryClient = useQueryClient();
  
  // Fetch goals independently to ensure synchronization
  const { data: goals = [] } = useQuery({
    queryKey: ['allGoals'],
    queryFn: async () => {
      const result = await base44.entities.Goal.list('-created_date');
      return Array.isArray(result) 
        ? result.map(goal => ({
            ...goal,
            ...goal.data,
            id: goal.id,
            created_date: goal.created_date,
            updated_date: goal.updated_date,
            created_by: goal.created_by
          }))
        : [];
    },
    initialData: [],
    refetchOnWindowFocus: false,
    refetchOnMount: 'always',
    staleTime: 30000,
  });
  
  const [selectedGoalId, setSelectedGoalId] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');

  // Extract all milestones with goal info - now includes milestones without due_date
  const allMilestones = useMemo(() => {
    const milestones = [];
    
    goals.forEach(goal => {
      if (goal.status !== 'active') return;
      
      const milestoneList = Array.isArray(goal.milestones) ? goal.milestones : [];
      milestoneList.forEach((milestone, index) => {
        const ms = typeof milestone === 'object' ? milestone : { title: milestone };
        const completed = typeof ms.completed === 'string' ? ms.completed === 'true' : Boolean(ms.completed);
        milestones.push({
          ...ms,
          goalId: goal.id,
          goalTitle: goal.title,
          goalCategory: goal.category,
          milestoneIndex: index,
          completed,
          due_date: ms.due_date || null
        });
      });
    });

    return milestones.sort((a, b) => {
      // Sort: items with due_date first, then by date, then no due_date last
      if (!a.due_date && !b.due_date) return 0;
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date) - new Date(b.due_date);
    });
  }, [goals]);

  // Filter milestones
  const filteredMilestones = useMemo(() => {
    let filtered = allMilestones;

    // Filter by goal
    if (selectedGoalId !== 'all') {
      filtered = filtered.filter(m => m.goalId === selectedGoalId);
    }

    // Filter by date range
    const now = new Date();
    if (dateFilter === 'overdue') {
      filtered = filtered.filter(m => !m.completed && new Date(m.due_date) < startOfDay(now));
    } else if (dateFilter === 'week') {
      const weekEnd = addDays(now, 7);
      filtered = filtered.filter(m => {
        const date = new Date(m.due_date);
        return date >= startOfDay(now) && date <= endOfDay(weekEnd);
      });
    } else if (dateFilter === 'month') {
      const monthEnd = addDays(now, 30);
      filtered = filtered.filter(m => {
        const date = new Date(m.due_date);
        return date >= startOfDay(now) && date <= endOfDay(monthEnd);
      });
    }

    return filtered;
  }, [allMilestones, selectedGoalId, dateFilter]);

  const getMilestoneStatus = (milestone) => {
    if (milestone.completed) return 'completed';
    if (!milestone.due_date) return 'no-date';
    
    const dueDate = new Date(milestone.due_date);
    const now = new Date();
    const daysUntil = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));

    if (daysUntil < 0) return 'overdue';
    if (daysUntil <= 3) return 'due-soon';
    if (daysUntil <= 7) return 'upcoming';
    return 'future';
  };

  const statusConfig = {
    completed: {
      color: 'bg-green-500',
      textColor: 'text-green-700',
      bgColor: 'bg-secondary/70',
      borderColor: 'border-border',
      icon: CheckCircle2,
      label: 'Completed'
    },
    overdue: {
      color: 'bg-red-500',
      textColor: 'text-red-700',
      bgColor: 'bg-secondary/70',
      borderColor: 'border-border',
      icon: AlertCircle,
      label: 'Overdue'
    },
    'due-soon': {
      color: 'bg-amber-500',
      textColor: 'text-amber-700',
      bgColor: 'bg-secondary/70',
      borderColor: 'border-border',
      icon: Clock,
      label: 'Due Soon'
    },
    upcoming: {
      color: 'bg-blue-500',
      textColor: 'text-blue-700',
      bgColor: 'bg-secondary/70',
      borderColor: 'border-border',
      icon: Calendar,
      label: 'Upcoming'
    },
    future: {
      color: 'bg-gray-400',
      textColor: 'text-muted-foreground',
      bgColor: 'bg-secondary/70',
      borderColor: 'border-border',
      icon: Calendar,
      label: 'Future'
    },
    'no-date': {
      color: 'bg-slate-400',
      textColor: 'text-muted-foreground',
      bgColor: 'bg-secondary/70',
      borderColor: 'border-border',
      icon: Clock,
      label: 'No Date Set'
    }
  };

  const categoryColors = {
    behavioral: 'bg-blue-100 text-blue-700',
    emotional: 'bg-purple-100 text-purple-700',
    social: 'bg-green-100 text-green-700',
    cognitive: 'bg-orange-100 text-orange-700',
    lifestyle: 'bg-pink-100 text-pink-700'
  };

  const activeGoals = goals.filter(g => g.status === 'active');

  const stats = useMemo(() => {
    const completed = filteredMilestones.filter(m => m.completed).length;
    const overdue = filteredMilestones.filter(m => getMilestoneStatus(m) === 'overdue').length;
    const dueSoon = filteredMilestones.filter(m => getMilestoneStatus(m) === 'due-soon').length;
    const allCompleted = allMilestones.filter(m => m.completed).length;
    const allTotal = allMilestones.length;
    return { completed: allCompleted, overdue, dueSoon, total: allTotal };
  }, [filteredMilestones, allMilestones]);

  return (
    <Card className="border border-border/70 bg-card shadow-[var(--shadow-md)]">
      <CardHeader>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <CardTitle className="text-2xl font-bold">Milestones Timeline</CardTitle>
          
          <div className="flex flex-col lg:flex-row gap-2">
            <BottomSheetSelect
              value={selectedGoalId}
              onValueChange={setSelectedGoalId}
              options={[
                { value: 'all', label: 'All Goals' },
                ...activeGoals.map((goal) => ({ value: goal.id, label: goal.title })),
              ]}
              placeholder="Filter by goal"
              title="Filter by Goal"
              className="w-full md:w-[200px]"
            />

            <BottomSheetSelect
              value={dateFilter}
              onValueChange={setDateFilter}
              options={DATE_FILTER_OPTIONS}
              placeholder="Date range"
              title="Date Range"
              className="w-full md:w-[180px]"
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
          <div className="p-3 bg-secondary/70 rounded-lg border border-border">
            <div className="text-2xl font-bold text-foreground">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </div>
          <div className="p-3 bg-secondary/70 rounded-lg border border-border">
            <div className="text-2xl font-bold text-red-700">{stats.overdue}</div>
            <div className="text-xs text-red-600">Overdue</div>
          </div>
          <div className="p-3 bg-secondary/70 rounded-lg border border-border">
            <div className="text-2xl font-bold text-amber-700">{stats.dueSoon}</div>
            <div className="text-xs text-amber-600">Due Soon</div>
          </div>
          <div className="p-3 bg-secondary/70 rounded-lg border border-border">
            <div className="text-xl md:text-2xl font-bold text-green-700 truncate">
              {stats.completed}/{stats.total}
            </div>
            <div className="text-xs text-green-600">Completed</div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {filteredMilestones.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No milestones found with the selected filters</p>
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute start-6 top-0 bottom-0 w-0.5 bg-gray-200" />

            {/* Milestones */}
            <div className="space-y-6">
              {filteredMilestones.map((milestone, idx) => {
                const status = getMilestoneStatus(milestone);
                const config = statusConfig[status];
                const Icon = config.icon;
                const dueDate = new Date(milestone.due_date);
                const daysUntil = Math.ceil((dueDate - new Date()) / (1000 * 60 * 60 * 24));

                return (
                  <div key={`${milestone.goalId}-${milestone.milestoneIndex}`} className="relative flex gap-4">
                    {/* Timeline dot */}
                    <div className={cn(
                      "relative z-10 flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center border-4 border-border/70 shadow-md",
                      config.color
                    )}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>

                    {/* Content */}
                    <div className={cn(
                      "min-w-0 flex-1 p-4 rounded-lg border-2 transition-all",
                      config.bgColor,
                      config.borderColor,
                      milestone.completed && "opacity-75"
                    )}>
                      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-2 mb-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={cn(
                              "text-sm font-semibold",
                              milestone.completed && "line-through"
                            )}>
                              {safeText(milestone.title, 'Milestone')}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className={cn(categoryColors[milestone.goalCategory], "max-w-full whitespace-normal [overflow-wrap:anywhere]")} variant="secondary">
                              {milestone.goalTitle}
                            </Badge>
                            <Badge className={cn("text-xs", config.textColor)} variant="outline">
                              {config.label}
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="flex flex-col items-end gap-1">
                          {milestone.due_date ? (
                            <>
                              <div className="text-sm font-medium text-muted-foreground">
                                {format(dueDate, 'MMM d, yyyy')}
                              </div>
                              {!milestone.completed && daysUntil >= 0 && daysUntil <= 7 && (
                                <div className={cn("text-xs font-medium", config.textColor)}>
                                  {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil} days`}
                                </div>
                              )}
                              {!milestone.completed && daysUntil < 0 && (
                                <div className="text-xs font-medium text-red-600">
                                  {Math.abs(daysUntil)} days overdue
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="text-sm text-muted-foreground italic">
                              No due date
                            </div>
                          )}
                        </div>
                      </div>

                      {milestone.description && (
                        <p className="text-sm text-muted-foreground mt-2">
                          {safeText(milestone.description)}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
