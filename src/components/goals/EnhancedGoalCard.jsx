import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Target, Brain, AlertTriangle, TrendingUp, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import GoalTrackingPanel from './GoalTrackingPanel';

export default function EnhancedGoalCard({ goal, onUpdate, onEdit }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const categoryColors = {
    behavioral: 'bg-blue-100 text-blue-800',
    emotional: 'bg-purple-100 text-purple-800',
    social: 'bg-green-100 text-green-800',
    cognitive: 'bg-yellow-100 text-yellow-800',
    lifestyle: 'bg-pink-100 text-pink-800'
  };

  const completedMilestones = goal.milestones?.filter(m => m.completed).length || 0;
  const totalMilestones = goal.milestones?.length || 0;
  const recentCheckIns = goal.tracking?.daily_check_ins?.slice(-3) || [];
  const latestAIInsight = goal.ai_conversation_insights?.[goal.ai_conversation_insights.length - 1];

  return (
    <Card className={cn(
      "transition-all",
      isExpanded && "ring-2 ring-purple-300"
    )}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-5 h-5 text-purple-600" />
              <CardTitle>{goal.title}</CardTitle>
            </div>
            <div className="flex flex-wrap gap-2 mb-3">
              <Badge className={categoryColors[goal.category]}>
                {goal.category}
              </Badge>
              {goal.target_date && (
                <Badge variant="outline" className="gap-1">
                  <Calendar className="w-3 h-3" />
                  {format(new Date(goal.target_date), 'MMM d, yyyy')}
                </Badge>
              )}
              <Badge variant="secondary">
                {completedMilestones}/{totalMilestones} milestones
              </Badge>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-semibold">{Math.round(goal.progress || 0)}%</span>
              </div>
              <Progress value={goal.progress || 0} className="h-2" />
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsExpanded(!isExpanded)}
            aria-label={isExpanded ? "Collapse goal details" : "Expand goal details"}
           mobileLabel={isExpanded ? "Collapse goal details" : "Expand goal details"}>
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </Button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-6 border-t pt-6">
          {/* Problem Definition */}
          {goal.problem_definition?.situation && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Brain className="w-4 h-4" />
                Original Problem
              </h4>
              <p className="text-sm text-muted-foreground">{goal.problem_definition.situation}</p>
              {goal.problem_definition.emotions?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {goal.problem_definition.emotions.map((emotion, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {emotion}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Obstacles & CBT */}
          {(goal.obstacles?.cognitive_distortions?.length > 0 || goal.obstacles?.balanced_thoughts?.length > 0) && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                CBT Work
              </h4>
              {goal.obstacles.cognitive_distortions?.length > 0 && (
                <div className="mb-2">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Distortions Identified:</p>
                  <div className="flex flex-wrap gap-1">
                    {goal.obstacles.cognitive_distortions.map((dist, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {dist}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {goal.obstacles.balanced_thoughts?.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Balanced Thoughts:</p>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    {goal.obstacles.balanced_thoughts.slice(0, 2).map((thought, i) => (
                      <li key={i}>{thought}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Latest AI Insight */}
          {latestAIInsight && (
            <div className="bg-purple-50 p-4 rounded-lg">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Brain className="w-4 h-4 text-purple-600" />
                AI Insight
              </h4>
              <p className="text-sm text-purple-900">{latestAIInsight.insight}</p>
              <p className="text-xs text-purple-600 mt-1">
                {format(new Date(latestAIInsight.date), 'MMM d, h:mm a')} via {latestAIInsight.agent_name}
              </p>
            </div>
          )}

          {/* Recent Check-Ins Summary */}
          {recentCheckIns.length > 0 && (
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Recent Activity
              </h4>
              <div className="grid grid-cols-3 gap-2 text-center">
                {recentCheckIns.slice().reverse().map((checkIn, i) => (
                  <div key={i} className="bg-[hsl(var(--card)/0.97)] p-2 rounded">
                    <p className="text-xs text-muted-foreground">{format(new Date(checkIn.date), 'MMM d')}</p>
                    <div className="flex flex-col gap-1 mt-1">
                      <p className="text-xs">Effort: <strong>{checkIn.effort_rating}/10</strong></p>
                      <p className="text-xs">Mood: <strong>{checkIn.mood_rating}/10</strong></p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tracking Panel */}
          <GoalTrackingPanel goal={goal} onUpdate={onUpdate} />

          {/* Actions */}
          <div className="flex gap-2">
            <Button onClick={onEdit} variant="outline" className="flex-1">
              Edit Goal
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}