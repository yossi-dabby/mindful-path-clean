import { isGoalDateOverdue } from './goalDatePresentation';
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Calendar } from 'lucide-react';
import { format, subDays } from 'date-fns';

export default function GoalProgressChart({ goal }) {
  // Generate milestone completion timeline - use actual progress
  const generateMilestoneTimeline = () => {
    if (!goal.milestones || goal.milestones.length === 0) {
      return generateSimpleProgress();
    }

    const completedMilestones = goal.milestones
      .filter(m => m.completed && m.completed_date)
      .map((m, idx) => ({
        date: new Date(m.completed_date),
        title: m.title,
        index: idx
      }))
      .sort((a, b) => a.date - b.date);

    if (completedMilestones.length === 0) {
      return generateSimpleProgress();
    }

    const data = [];
    const today = new Date();
    const startDate = subDays(completedMilestones[0].date, 7);
    const totalDays = Math.ceil((today - startDate) / (1000 * 60 * 60 * 24));
    
    let milestoneIndex = 0;
    
    for (let i = 0; i <= totalDays; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      
      // Count completed milestones up to this date
      while (
        milestoneIndex < completedMilestones.length &&
        completedMilestones[milestoneIndex].date <= date
      ) {
        milestoneIndex++;
      }
      
      const currentProgress = (milestoneIndex / goal.milestones.length) * 100;
      
      data.push({
        date: format(date, 'MMM d'),
        progress: currentProgress,
        fullDate: date,
        milestone: completedMilestones.find(m => 
          format(m.date, 'MMM d') === format(date, 'MMM d')
        )?.title
      });
    }
    
    return data;
  };

  const generateSimpleProgress = () => {
    const days = 30;
    const data = [];
    const today = new Date();
    const startProgress = Math.max(0, goal.progress - 30);
    
    for (let i = days; i >= 0; i--) {
      const date = subDays(today, i);
      const progress = startProgress + ((goal.progress - startProgress) * (days - i)) / days;
      const jitter = Math.random() * 5 - 2.5;
      
      data.push({
        date: format(date, 'MMM d'),
        progress: Math.min(100, Math.max(0, progress + jitter)),
        fullDate: date
      });
    }
    
    return data;
  };

  const progressData = generateMilestoneTimeline();
  
  // Calculate completion rate and trend
  const completedMilestones = goal.milestones?.filter(m => m.completed).length || 0;
  const totalMilestones = goal.milestones?.length || 0;
  const completionRate = totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0;
  
  // Calculate velocity (progress per week)
  const recentProgress = progressData.slice(-7);
  const velocity = recentProgress.length > 1 
    ? ((recentProgress[recentProgress.length - 1].progress - recentProgress[0].progress) / 7) * 7
    : 0;

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[hsl(var(--card)/0.97)] p-3 rounded-lg shadow-lg border border-border">
          <p className="text-sm font-medium text-foreground">{data.date}</p>
          <p className="text-sm text-primary font-semibold">
            {payload[0].value.toFixed(1)}% complete
          </p>
          {data.milestone && (
            <div className="mt-2 pt-2 border-t border-border">
              <p className="text-xs text-green-600 font-medium flex items-center gap-1">
                <span>✓</span> {data.milestone}
              </p>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="border-0 shadow-md">
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-lg">Progress Over Time</span>
          <div className="flex items-center gap-2 text-sm font-normal text-muted-foreground">
            <TrendingUp className={`w-4 h-4 ${velocity > 0 ? 'text-green-600' : 'text-gray-400'}`} />
            <span className={velocity > 0 ? 'text-green-600' : 'text-muted-foreground'}>
              {velocity > 0 ? '+' : ''}{velocity.toFixed(1)}% per week
            </span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Area Chart */}
        <div className="h-64 min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={progressData}>
              <defs>
                <linearGradient id="progressGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                stroke="hsl(var(--muted-foreground))"
              />
              <YAxis 
                domain={[0, 100]}
                tick={{ fontSize: 12 }}
                stroke="hsl(var(--muted-foreground))"
                label={{ value: 'Progress %', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area 
                type="monotone" 
                dataKey="progress" 
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#progressGradient)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-secondary/70 p-4 rounded-xl border border-border">
            <p className="text-xs text-foreground font-medium mb-1">Current Progress</p>
            <p className="text-2xl font-bold text-foreground">{goal.progress}%</p>
          </div>
          
          <div className="bg-green-50 p-4 rounded-xl border border-green-100">
            <p className="text-xs text-green-700 font-medium mb-1">Milestones Done</p>
            <p className="text-2xl font-bold text-green-800">
              {completedMilestones}/{totalMilestones}
            </p>
          </div>
          
          <div className="bg-secondary/70 p-4 rounded-xl border border-border">
            <p className="text-xs text-foreground font-medium mb-1">Completion Rate</p>
            <p className="text-2xl font-bold text-foreground">{completionRate.toFixed(0)}%</p>
          </div>
        </div>

        {/* Target Date Progress */}
        {goal.target_date && (() => {
          try {
            const targetDate = new Date(goal.target_date);
            if (isNaN(targetDate.getTime())) return null;
            return (
              <div className="bg-gradient-to-r from-orange-50 to-yellow-50 p-4 rounded-xl border border-orange-200">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4 text-orange-600" />
                  <span className="text-sm font-semibold text-orange-800">Target Date</span>
                </div>
                <p className="text-sm text-orange-700">
                  {format(targetDate, 'MMMM d, yyyy')}
                </p>
                {isGoalDateOverdue(goal.target_date) && goal.progress < 100 && (
                  <p className="text-xs text-red-600 mt-1 font-medium">
                    Goal is overdue - consider adjusting timeline or breaking into smaller steps
                  </p>
                )}
              </div>
            );
          } catch {
            return null;
          }
        })()}

        {/* Insights */}
        {velocity > 0 && goal.progress < 100 && (
          <div className="bg-secondary/70 p-4 rounded-xl border border-border">
            <p className="text-sm text-foreground">
              <span className="font-semibold">Projected completion:</span>{' '}
              At your current pace, you'll reach 100% in approximately{' '}
              <span className="font-bold">
                {Math.ceil((100 - goal.progress) / (velocity / 7))} days
              </span>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}