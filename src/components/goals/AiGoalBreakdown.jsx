import { useTranslation } from 'react-i18next';
import PremiumDialog from '@/components/ui/PremiumDialog';
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Target, CheckCircle, Plus } from 'lucide-react';
import { safeArray, safeText } from '@/components/utils/aiDataNormalizer';
import PremiumIcon from '@/components/ui/PremiumIcon';

// Structured result rows retain their fields; safeArray is for text-only lists.
const resultRows = (value) => Array.isArray(value) ? value.filter(Boolean) : safeArray(value);

export default function AiGoalBreakdown({ goal, onApplySteps, onClose }) {
  const { t } = useTranslation();
  const [breakdown, setBreakdown] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const generateBreakdown = async () => {
    setIsLoading(true);
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Break down this goal into actionable steps and milestones:

**Goal:** ${goal.title}
**Category:** ${goal.category}
**Description:** ${goal.description}
${goal.target_date ? `**Target Date:** ${goal.target_date}` : ''}

Provide:
1. **Action Plan**: 5-8 specific, actionable steps to achieve this goal
2. **Milestones**: 3-5 key milestones that indicate progress
3. **Quick Wins**: 2-3 small, immediate actions to build momentum
4. **Potential Obstacles**: 2-3 challenges and how to overcome them
5. **Success Metrics**: How to measure if the goal is being achieved

Make each step concrete and actionable, not vague.`,
        response_json_schema: {
          type: "object",
          properties: {
            action_plan: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  step: { type: "string" },
                  description: { type: "string" },
                  estimated_time: { type: "string" }
                }
              }
            },
            milestones: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" }
                }
              }
            },
            quick_wins: {
              type: "array",
              items: { type: "string" }
            },
            potential_obstacles: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  obstacle: { type: "string" },
                  solution: { type: "string" }
                }
              }
            },
            success_metrics: {
              type: "array",
              items: { type: "string" }
            }
          }
        }
      });

      setBreakdown(response);
    } catch (error) {
      console.error('Failed to generate breakdown:', error);
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    generateBreakdown();
  }, []);

  if (isLoading) {
    return (
      <PremiumDialog onClose={onClose} label={t('goals.break_down')}
        className="goal-dialog fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        style={{
          paddingTop: 'env(safe-area-inset-top, 0px)',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 6rem)'
        }}
      >
        <Card className="w-full max-w-2xl border-0 shadow-2xl">
          <CardContent className="p-12 text-center">
            <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Breaking down your goal into actionable steps...</p>
          </CardContent>
        </Card>
      </PremiumDialog>
    );
  }

  if (!breakdown) return null;

  return (
    <PremiumDialog onClose={onClose} label={t('goals.break_down')}
      className="goal-dialog fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 pb-24 overflow-y-auto"
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 6rem)'
      }}
    >
      <Card className="w-full max-w-3xl border-0 shadow-2xl my-8" style={{ maxHeight: 'calc(100vh - 160px)' }}>
        <CardContent className="p-4 md:p-6 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 240px)' }}>
          <div className="flex items-start justify-between gap-3 mb-6">
            <div className="min-w-0 flex-1">
              <h2 className="text-2xl font-bold text-foreground">{goal.title}</h2>
              <p className="text-sm text-muted-foreground">AI-Generated Action Plan</p>
            </div>
            <Button onClick={onClose} variant="ghost" className="shrink-0">
              Close
            </Button>
          </div>

          <div className="space-y-6">
            {/* Quick Wins */}
            <div data-testid="goal-breakdown-quick-wins" className="bg-secondary/70 p-4 rounded-xl border border-border">
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                Quick Wins (Start Here!)
              </h3>
              <ul className="space-y-2">
                {safeArray(breakdown.quick_wins).map((win, i) => (
                  <li key={i} className="text-sm text-foreground flex items-start gap-2">
                    <span className="text-green-600 mt-0.5">✓</span>
                    <span>{win}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Action Plan */}
            <div>
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                Detailed Action Plan
              </h3>
              <div className="space-y-3">
                {resultRows(breakdown.action_plan).map((action, i) => {
                  const act = typeof action === 'object' ? action : { step: safeText(action), description: '', estimated_time: '' };
                  return (
                  <div key={i} className="bg-[hsl(var(--card)/0.97)] p-4 rounded-lg border-2 border-border">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-foreground flex items-center gap-2">
                        <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">
                          {i + 1}
                        </span>
                        {safeText(act.step, `Step ${i + 1}`)}
                      </h4>
                      {act.estimated_time && (
                        <span className="text-xs text-muted-foreground">{safeText(act.estimated_time)}</span>
                      )}
                    </div>
                    {act.description && <p className="text-sm text-muted-foreground ml-8">{safeText(act.description)}</p>}
                  </div>
                );
                })}
              </div>
            </div>

            {/* Milestones */}
            <div>
              <h3 className="font-semibold text-foreground mb-3">Key Milestones</h3>
              <div className="space-y-2">
                {resultRows(breakdown.milestones).map((milestone, i) => {
                  const m = typeof milestone === 'object' ? milestone : { title: safeText(milestone), description: '' };
                  return (
                  <div key={i} data-testid="goal-breakdown-milestone" className="bg-secondary/70 p-3 rounded-lg border border-border">
                    <p className="font-medium text-foreground text-sm">{safeText(m.title, `Milestone ${i + 1}`)}</p>
                    {m.description && <p className="text-xs text-foreground mt-1">{safeText(m.description)}</p>}
                  </div>
                );
                })}
              </div>
            </div>

            {/* Potential Obstacles */}
            <div>
              <h3 className="font-semibold text-foreground mb-3">Prepare for Challenges</h3>
              <div className="space-y-2">
                {resultRows(breakdown.potential_obstacles).map((item, i) => {
                  const obs = typeof item === 'object' ? item : { obstacle: safeText(item), solution: '' };
                  return (
                  <div key={i} data-testid="goal-breakdown-obstacle" className="bg-secondary/70 p-3 rounded-lg border border-border">
                    <p className="flex items-start gap-2 font-medium text-foreground text-sm"><PremiumIcon name="alert" size="sm" bare className="mt-0.5 shrink-0" /><span>{safeText(obs.obstacle, `Obstacle ${i + 1}`)}</span></p>
                    {obs.solution && (
                      <p className="text-xs text-foreground mt-1">
                        <span className="font-semibold">Solution:</span> {safeText(obs.solution)}
                      </p>
                    )}
                  </div>
                );
                })}
              </div>
            </div>

            {/* Success Metrics */}
            <div className="bg-card p-4 rounded-xl border-2 border-border">
              <h3 className="font-semibold text-foreground mb-3">Measuring Success</h3>
              <ul className="space-y-1">
                {safeArray(breakdown.success_metrics).map((metric, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                    <PremiumIcon name="chart" size="sm" bare className="mt-0.5 shrink-0 text-primary" />
                    <span>{metric}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => onApplySteps(breakdown)}
                className="flex-1 bg-primary hover:bg-primary/90"
               mobileLabelKey="add">
                <Plus className="w-4 h-4 mr-2" />
                Apply These Steps to Goal
              </Button>
              <Button onClick={onClose} variant="outline">
                Cancel
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </PremiumDialog>
  );
}
