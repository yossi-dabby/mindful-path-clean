import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Calendar, TrendingUp, CheckCircle2, Plus, X } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function GoalTrackingPanel({ goal, onUpdate }) {
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [checkInData, setCheckInData] = useState({
    effort_rating: 5,
    mood_rating: 5,
    progress_notes: '',
    obstacles_faced: [],
    coping_strategies_used: []
  });
  const [tempInput, setTempInput] = useState('');
  
  // Local milestone state for instant UI feedback
  const [localMilestones, setLocalMilestones] = useState(goal.milestones || []);
  
  // Sync local state when goal prop changes
  React.useEffect(() => {
    setLocalMilestones(goal.milestones || []);
  }, [goal.milestones, goal.id]);

  const handleDailyCheckIn = async () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const updatedTracking = {
      ...goal.tracking,
      daily_check_ins: [
        ...(goal.tracking?.daily_check_ins || []),
        {
          date: today,
          ...checkInData
        }
      ]
    };

    await base44.entities.Goal.update(goal.id, {
      tracking: updatedTracking
    });

    setShowCheckIn(false);
    setCheckInData({
      effort_rating: 5,
      mood_rating: 5,
      progress_notes: '',
      obstacles_faced: [],
      coping_strategies_used: []
    });
    onUpdate();
  };

  const addMetricDataPoint = async (metricIndex, value) => {
    const updatedMetrics = [...(goal.tracking?.quantitative_metrics || [])];
    const metric = updatedMetrics[metricIndex];
    
    metric.data_points = [
      ...(metric.data_points || []),
      {
        date: format(new Date(), 'yyyy-MM-dd'),
        value: parseFloat(value)
      }
    ];

    await base44.entities.Goal.update(goal.id, {
      tracking: {
        ...goal.tracking,
        quantitative_metrics: updatedMetrics
      }
    });

    onUpdate();
  };

  const toggleMilestone = async (milestoneIndex) => {
    // Update local state first for instant feedback
    const updatedMilestones = localMilestones.map((m, i) =>
      i === milestoneIndex
        ? {
            ...m,
            completed: !m.completed,
            completed_date: !m.completed ? new Date().toISOString() : null
          }
        : m
    );
    
    setLocalMilestones(updatedMilestones);

    const completedCount = updatedMilestones.filter(m => m.completed).length;
    const progress = updatedMilestones.length > 0
      ? (completedCount / updatedMilestones.length) * 100
      : 0;

    try {
      await base44.entities.Goal.update(goal.id, {
        milestones: updatedMilestones,
        progress
      });

      onUpdate && onUpdate();
    } catch (error) {
      // Revert on error
      setLocalMilestones(goal.milestones || []);
      alert('Failed to update milestone. Please try again.');
    }
  };

  const recentCheckIns = goal.tracking?.daily_check_ins?.slice(-7) || [];
  const avgEffort = recentCheckIns.length > 0
    ? recentCheckIns.reduce((sum, ci) => sum + ci.effort_rating, 0) / recentCheckIns.length
    : 0;
  const avgMood = recentCheckIns.length > 0
    ? recentCheckIns.reduce((sum, ci) => sum + ci.mood_rating, 0) / recentCheckIns.length
    : 0;

  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Progress Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">{Math.round(goal.progress || 0)}%</p>
              <p className="text-sm text-muted-foreground">Overall Progress</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{avgEffort.toFixed(1)}/10</p>
              <p className="text-sm text-muted-foreground">Avg Effort (7d)</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{avgMood.toFixed(1)}/10</p>
              <p className="text-sm text-muted-foreground">Avg Mood (7d)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Milestones */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            Milestones ({localMilestones.filter(m => m.completed).length || 0}/{localMilestones.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {localMilestones.map((milestone, i) => (
            <div
              key={i}
              className={cn(
                "flex items-center justify-between p-3 rounded-lg border",
                milestone.completed ? "bg-green-50 border-green-200" : "bg-[hsl(var(--card)/0.97)]"
              )}
            >
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={Boolean(milestone.completed)}
                  onChange={() => toggleMilestone(i)}
                  className="w-5 h-5 cursor-pointer"
                />
                <div>
                  <p className={cn(
                    "font-medium",
                    milestone.completed && "line-through text-muted-foreground"
                  )}>
                    {milestone.title}
                  </p>
                  {milestone.completed && milestone.completed_date && (
                    <p className="text-xs text-muted-foreground">
                      Completed {format(new Date(milestone.completed_date), 'MMM d, yyyy')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Daily Check-In */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Daily Check-In
            </CardTitle>
            <Button
              onClick={() => setShowCheckIn(!showCheckIn)}
              size="sm"
            >
              {showCheckIn ? 'Cancel' : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Check-In
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showCheckIn ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Effort Rating: {checkInData.effort_rating}/10</Label>
                <Slider
                  value={[checkInData.effort_rating]}
                  onValueChange={([value]) => setCheckInData({ ...checkInData, effort_rating: value })}
                  min={1}
                  max={10}
                  step={1}
                />
              </div>

              <div className="space-y-2">
                <Label>Mood Rating: {checkInData.mood_rating}/10</Label>
                <Slider
                  value={[checkInData.mood_rating]}
                  onValueChange={([value]) => setCheckInData({ ...checkInData, mood_rating: value })}
                  min={1}
                  max={10}
                  step={1}
                />
              </div>

              <div className="space-y-2">
                <Label>Progress Notes</Label>
                <Textarea
                  value={checkInData.progress_notes}
                  onChange={(e) => setCheckInData({ ...checkInData, progress_notes: e.target.value })}
                  placeholder="What did you work on today? Any insights?"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Obstacles Faced</Label>
                <div className="flex gap-2">
                  <Input
                    value={tempInput}
                    onChange={(e) => setTempInput(e.target.value)}
                    placeholder="Add an obstacle"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && tempInput.trim()) {
                        setCheckInData({
                          ...checkInData,
                          obstacles_faced: [...checkInData.obstacles_faced, tempInput]
                        });
                        setTempInput('');
                      }
                    }}
                  />
                  <Button
                    type="button"
                    onClick={() => {
                      if (tempInput.trim()) {
                        setCheckInData({
                          ...checkInData,
                          obstacles_faced: [...checkInData.obstacles_faced, tempInput]
                        });
                        setTempInput('');
                      }
                    }}
                  >
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {checkInData.obstacles_faced.map((obs, i) => (
                    <Badge key={i} variant="secondary" className="gap-1">
                      {obs}
                      <button type="button" aria-label={`Remove ${obs}`} onClick={() => {
                        setCheckInData({
                          ...checkInData,
                          obstacles_faced: checkInData.obstacles_faced.filter((_, idx) => idx !== i)
                        });
                      }}>
                        <X className="w-3 h-3" aria-hidden="true" />
                      <span className="mobile-action-label md:hidden">{`Remove ${obs}`}</span></button>
                    </Badge>
                  ))}
                </div>
              </div>

              <Button onClick={handleDailyCheckIn} className="w-full">
                Save Check-In
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {recentCheckIns.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No check-ins yet. Start tracking your progress!
                </p>
              ) : (
                recentCheckIns.slice().reverse().map((checkIn, i) => (
                  <div key={i} className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium">{format(new Date(checkIn.date), 'MMM d, yyyy')}</p>
                      <div className="flex gap-2">
                        <Badge variant="outline">Effort: {checkIn.effort_rating}/10</Badge>
                        <Badge variant="outline">Mood: {checkIn.mood_rating}/10</Badge>
                      </div>
                    </div>
                    {checkIn.progress_notes && (
                      <p className="text-sm text-muted-foreground">{checkIn.progress_notes}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quantitative Metrics */}
      {goal.tracking?.quantitative_metrics?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Tracking Metrics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {goal.tracking.quantitative_metrics.map((metric, i) => {
              const latestValue = metric.data_points?.[metric.data_points.length - 1]?.value;
              return (
                <div key={i} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{metric.metric_name}</p>
                    <Badge>{latestValue || 'No data'}</Badge>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Enter value"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && e.target.value) {
                          addMetricDataPoint(i, e.target.value);
                          e.target.value = '';
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      onClick={(e) => {
                        const input = e.target.closest('.flex').querySelector('input');
                        if (input.value) {
                          addMetricDataPoint(i, input.value);
                          input.value = '';
                        }
                      }}
                    >
                      Log
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}