import { useTranslation } from 'react-i18next';
import PremiumDialog from '@/components/ui/PremiumDialog';
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, TrendingUp, Brain, Loader2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function AiGoalAdjustment({ goal, onApply, onClose }) {
  const { t } = useTranslation();
  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestions, setSuggestions] = useState(null);
  const [error, setError] = useState(null);

  // Fetch related journal entries
  const { data: journalEntries } = useQuery({
    queryKey: ['goalJournalEntries', goal.id],
    queryFn: async () => {
      const entries = await base44.entities.ThoughtJournal.list('-created_date', 20);
      return entries.filter(entry => 
        entry.tags?.some(tag => 
          goal.title.toLowerCase().includes(tag.toLowerCase()) ||
          tag.toLowerCase().includes(goal.category?.toLowerCase())
        )
      );
    },
    initialData: []
  });

  // Fetch mood trends
  const { data: moodEntries } = useQuery({
    queryKey: ['recentMoodForGoal'],
    queryFn: () => base44.entities.MoodEntry.list('-created_date', 30),
    initialData: []
  });

  const generateSuggestions = async () => {
    setIsGenerating(true);
    setError(null);
    
    try {
      // Analyze journal patterns
      const journalAnalysis = {
        total_entries: journalEntries.length,
        common_emotions: journalEntries.flatMap(e => e.emotions || [])
          .reduce((acc, emotion) => {
            acc[emotion] = (acc[emotion] || 0) + 1;
            return acc;
          }, {}),
        common_distortions: journalEntries.flatMap(e => e.cognitive_distortions || [])
          .reduce((acc, dist) => {
            acc[dist] = (acc[dist] || 0) + 1;
            return acc;
          }, {}),
        avg_emotion_improvement: journalEntries
          .filter(e => e.emotion_intensity && e.outcome_emotion_intensity)
          .reduce((sum, e) => sum + (e.emotion_intensity - e.outcome_emotion_intensity), 0) / 
          Math.max(journalEntries.filter(e => e.emotion_intensity && e.outcome_emotion_intensity).length, 1)
      };

      // Analyze mood trends
      const avgMood = moodEntries.reduce((sum, m) => {
        const moodValue = { excellent: 5, good: 4, okay: 3, low: 2, very_low: 1 }[m.mood] || 3;
        return sum + moodValue;
      }, 0) / Math.max(moodEntries.length, 1);

      // Generate AI suggestions
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze this goal and suggest adjustments based on user's journal data.

GOAL:
Title: ${goal.title}
Category: ${goal.category}
Current Progress: ${goal.progress}%
Target Date: ${(() => {
          if (!goal.target_date) return 'Not set';
          try {
            const date = new Date(goal.target_date);
            return !isNaN(date.getTime()) ? format(date, 'MMM d, yyyy') : 'Not set';
          } catch {
            return 'Not set';
          }
        })()}
Milestones: ${goal.milestones?.length || 0} (${goal.milestones?.filter(m => m.completed).length || 0} completed)

OBSTACLES:
${goal.obstacles?.identified_obstacles?.join(', ') || 'None identified'}
Cognitive Distortions: ${goal.obstacles?.cognitive_distortions?.join(', ') || 'None'}

JOURNAL DATA:
- Total related entries: ${journalAnalysis.total_entries}
- Common emotions: ${Object.entries(journalAnalysis.common_emotions).slice(0, 5).map(([e, c]) => `${e} (${c})`).join(', ')}
- Common distortions: ${Object.entries(journalAnalysis.common_distortions).slice(0, 5).map(([d, c]) => `${d} (${c})`).join(', ')}
- Avg emotion improvement per entry: ${journalAnalysis.avg_emotion_improvement.toFixed(1)} points

MOOD TRENDS:
- Average mood: ${avgMood.toFixed(1)}/5
- Recent mood entries: ${moodEntries.length}

Provide specific, actionable suggestions for:
1. Adjusting milestones (should they be broken down further, adjusted, or reordered?)
2. Addressing obstacles (based on journal patterns)
3. Timeline adjustment (is the target date realistic given progress?)
4. New strategies (based on what's working/not working in journal entries)

Be specific and reference the actual data. Keep each suggestion under 100 words.`,
        response_json_schema: {
          type: "object",
          properties: {
            milestone_adjustments: {
              type: "object",
              properties: {
                recommendation: { type: "string" },
                new_milestones: {
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
            },
            obstacle_strategies: {
              type: "object",
              properties: {
                recommendation: { type: "string" },
                new_coping_skills: {
                  type: "array",
                  items: { type: "string" }
                }
              }
            },
            timeline_adjustment: {
              type: "object",
              properties: {
                recommendation: { type: "string" },
                suggested_date: { type: "string" },
                reasoning: { type: "string" }
              }
            },
            new_strategies: {
              type: "object",
              properties: {
                recommendation: { type: "string" },
                strategies: {
                  type: "array",
                  items: { type: "string" }
                }
              }
            },
            overall_assessment: { type: "string" }
          }
        }
      });

      setSuggestions(response);
    } catch (err) {
      console.error('Failed to generate suggestions:', err);
      setError('Failed to generate suggestions. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const applyMilestones = () => {
    if (suggestions?.milestone_adjustments?.new_milestones) {
      onApply({
        milestones: suggestions.milestone_adjustments.new_milestones.map(m => ({
          title: m.title,
          description: m.description,
          completed: false
        }))
      });
    }
  };

  const applyTimeline = () => {
    if (suggestions?.timeline_adjustment?.suggested_date) {
      onApply({
        target_date: suggestions.timeline_adjustment.suggested_date
      });
    }
  };

  const applyStrategies = () => {
    if (suggestions?.new_strategies?.strategies) {
      const currentStrategies = goal.action_plan?.strategies || [];
      onApply({
        action_plan: {
          ...(goal.action_plan || {}),
          strategies: [
            ...currentStrategies,
            ...suggestions.new_strategies.strategies.map(s => ({ strategy: s }))
          ]
        }
      });
    }
  };

  return (
    <PremiumDialog onClose={onClose} label={t('goals.card.ai_adjust')}
      className="goal-dialog fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 6rem)'
      }}
    >
      <Card className="max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                <Brain className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle>AI Goal Adjustment</CardTitle>
                <p className="text-sm text-muted-foreground">Based on {journalEntries.length} journal entries</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">✕</Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {!suggestions && !isGenerating && (
            <div className="text-center py-8">
              <Sparkles className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Get AI-Powered Suggestions</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Analyze your journal entries and mood data to get personalized recommendations for adjusting this goal.
              </p>
              <Button
                onClick={generateSuggestions}
                disabled={isGenerating}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Suggestions
              </Button>
            </div>
          )}

          {isGenerating && (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Analyzing your journal data...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {suggestions && (
            <>
              {/* Overall Assessment */}
              <div className="bg-secondary/70 border border-border rounded-lg p-4">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Brain className="w-4 h-4 text-primary" />
                  Overall Assessment
                </h3>
                <p className="text-sm text-foreground">{suggestions.overall_assessment}</p>
              </div>

              {/* Milestone Adjustments */}
              {suggestions.milestone_adjustments && (
                <div className="border rounded-lg p-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold mb-1">Milestone Adjustments</h3>
                      <p className="text-sm text-muted-foreground">{suggestions.milestone_adjustments.recommendation}</p>
                    </div>
                    <Button size="sm" onClick={applyMilestones} className="shrink-0">Apply</Button>
                  </div>
                  {suggestions.milestone_adjustments.new_milestones?.length > 0 && (
                    <div className="space-y-2 mt-3">
                      {suggestions.milestone_adjustments.new_milestones.map((milestone, i) => (
                        <div key={i} data-testid="goal-adjustment-milestone" className="bg-secondary/70 p-3 rounded-lg">
                          <p className="font-medium text-sm">{milestone.title}</p>
                          {milestone.description && (
                            <p className="text-xs text-foreground mt-1">{milestone.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Timeline Adjustment */}
              {suggestions.timeline_adjustment && (
                <div className="border rounded-lg p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold mb-1">Timeline Adjustment</h3>
                      <p className="text-sm text-muted-foreground mb-2">{suggestions.timeline_adjustment.recommendation}</p>
                      {suggestions.timeline_adjustment.suggested_date && (() => {
                        try {
                          const date = new Date(suggestions.timeline_adjustment.suggested_date);
                          if (isNaN(date.getTime())) return null;
                          return (
                            <Badge variant="outline" className="flex items-center gap-1 w-fit">
                              New target: {format(date, 'MMM d, yyyy')}
                            </Badge>
                          );
                        } catch {
                          return null;
                        }
                      })()}
                      <p className="text-xs text-muted-foreground mt-2">{suggestions.timeline_adjustment.reasoning}</p>
                    </div>
                    <Button size="sm" onClick={applyTimeline} className="shrink-0">Apply</Button>
                  </div>
                </div>
              )}

              {/* Obstacle Strategies */}
              {suggestions.obstacle_strategies && (
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-2">Obstacle Management</h3>
                  <p className="text-sm text-muted-foreground mb-3">{suggestions.obstacle_strategies.recommendation}</p>
                  {suggestions.obstacle_strategies.new_coping_skills?.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Suggested Coping Skills:</p>
                      {suggestions.obstacle_strategies.new_coping_skills.map((skill, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 flex-shrink-0" />
                          <p className="text-sm text-muted-foreground">{skill}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* New Strategies */}
              {suggestions.new_strategies && (
                <div className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1">New Strategies</h3>
                      <p className="text-sm text-muted-foreground mb-3">{suggestions.new_strategies.recommendation}</p>
                      {suggestions.new_strategies.strategies?.length > 0 && (
                        <div className="space-y-2">
                          {suggestions.new_strategies.strategies.map((strategy, i) => (
                            <div key={i} className="flex items-start gap-2">
                              <TrendingUp className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                              <p className="text-sm text-muted-foreground">{strategy}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <Button size="sm" onClick={applyStrategies}>Apply</Button>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-4 border-t">
                <Button variant="outline" onClick={generateSuggestions} disabled={isGenerating}>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Regenerate
                </Button>
                <Button onClick={onClose} className="flex-1">Done</Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </PremiumDialog>
  );
}
