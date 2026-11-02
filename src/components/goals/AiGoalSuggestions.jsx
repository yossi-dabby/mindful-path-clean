import PremiumDialog from '@/components/ui/PremiumDialog';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2, Target, TrendingUp, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { normalizeGoalData, safeJoin, safeArray, safeText } from '@/components/utils/aiDataNormalizer';
import { safeInvokeLLM } from '../utils/safeInvokeLLM';
import { getStage11Copy } from '../i18n/stage11UiCopy.js';

export default function AiGoalSuggestions({ onSelectGoal, onClose }) {
  const { t, i18n } = useTranslation();
  const copy = getStage11Copy(i18n.resolvedLanguage || i18n.language);
  const [suggestions, setSuggestions] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const { data: journalEntries } = useQuery({
    queryKey: ['thoughtJournals'],
    queryFn: () => base44.entities.ThoughtJournal.list('-created_date', 15),
    initialData: []
  });

  const { data: moodEntries } = useQuery({
    queryKey: ['moodEntries'],
    queryFn: () => base44.entities.MoodEntry.list('-date', 10),
    initialData: []
  });

  const generateSuggestions = async () => {
    setIsLoading(true);
    try {
      const stripHtml = (html) => {
        if (!html || typeof html !== 'string') return '';
        return html.replace(/<[^>]*>/g, '');
      };

      // Prepare context from journal entries
      const journalContext = journalEntries.slice(0, 10).map(e => ({
        situation: stripHtml(e.situation)?.substring(0, 200),
        emotions: safeJoin(e.emotions),
        distortions: safeJoin(e.cognitive_distortions),
        tags: safeJoin(e.tags)
      }));

      // Prepare mood context
      const moodContext = moodEntries.map(m => ({
        mood: m.mood,
        emotions: safeJoin(m.emotions),
        triggers: safeJoin(m.triggers),
        activities: safeJoin(m.activities)
      }));

      const response = await safeInvokeLLM({
        prompt: `Based on the user's journal entries and mood tracking, suggest 3-4 SMART goals for personal growth.

**Recent Journal Entries:**
${JSON.stringify(journalContext, null, 2)}

**Recent Mood Patterns:**
${JSON.stringify(moodContext, null, 2)}

For each goal, provide:
1. **Title**: Clear, actionable goal title
2. **Category**: One of: behavioral, emotional, social, cognitive, lifestyle
3. **Description**: Brief description (2-3 sentences)
4. **SMART Breakdown**:
   - Specific: What exactly will be achieved?
   - Measurable: How will progress be measured?
   - Achievable: Why is this realistic?
   - Relevant: How does this align with their needs?
   - Time-bound: Suggested timeframe
5. **Initial Milestones**: 3-4 actionable first steps
6. **Why This Goal**: Brief explanation of why this goal was suggested based on their patterns

Focus on goals that address recurring patterns, emotional needs, or areas for growth identified in their entries.

LANGUAGE REQUIREMENT: Write every user-visible value in ${copy.languageName}. Keep the JSON property names unchanged.`,
        response_json_schema: {
          type: "object",
          properties: {
            goals: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  category: { type: "string" },
                  description: { type: "string" },
                  smart_breakdown: {
                    type: "object",
                    properties: {
                      specific: { type: "string" },
                      measurable: { type: "string" },
                      achievable: { type: "string" },
                      relevant: { type: "string" },
                      time_bound: { type: "string" }
                    }
                  },
                  initial_milestones: {
                    type: "array",
                    items: { type: "string" }
                  },
                  why_suggested: { type: "string" }
                }
              }
            }
          }
        }
      }, true); // Skip risk gate - system-generated prompt

      if (!response || !response.goals || response.goals.length === 0) {
        throw new Error(copy.goals.noSuggestions);
      }

      // Normalize all goal data to ensure arrays are valid
      const normalizedGoals = response.goals.map(normalizeGoalData).filter(Boolean);
      setSuggestions({ goals: normalizedGoals });
    } catch (error) {
      console.error('Failed to generate goal suggestions:', error.message, error.stack);
      alert(error.message || copy.goals.error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!suggestions && !isLoading) {
    return (
      <PremiumDialog onClose={onClose} label={copy.goals.introTitle}
        className="goal-dialog fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 pb-24"
        style={{
          paddingTop: 'env(safe-area-inset-top, 0px)',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 6rem)'
        }}
      >
        <Card className="w-full max-w-2xl border-0 shadow-2xl my-8" style={{ maxHeight: 'calc(100vh - 160px)' }}>
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">{copy.goals.introTitle}</h2>
            <p className="text-muted-foreground mb-6">
              {copy.goals.introText}
            </p>
            <div className="flex gap-3 justify-center">
              <Button
                onClick={() => generateSuggestions()}
                disabled={isLoading}
                className="bg-primary hover:bg-primary/90"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {copy.goals.generate}
              </Button>
              <Button onClick={() => onClose()} variant="outline">
                {copy.goals.cancel}
              </Button>
            </div>
          </CardContent>
        </Card>
      </PremiumDialog>
    );
  }

  if (isLoading) {
    return (
      <PremiumDialog onClose={onClose} label={copy.goals.introTitle}
        className="goal-dialog fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 pb-24"
        style={{
          paddingTop: 'env(safe-area-inset-top, 0px)',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 6rem)'
        }}
      >
        <Card className="w-full max-w-2xl border-0 shadow-2xl my-8" style={{ maxHeight: 'calc(100vh - 160px)' }}>
          <CardContent className="p-12 text-center">
            <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">{copy.goals.loading}</p>
          </CardContent>
        </Card>
      </PremiumDialog>
    );
  }

  return (
    <PremiumDialog onClose={onClose} label={copy.goals.introTitle}
      className="goal-dialog fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 pb-24 overflow-y-auto"
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 6rem)'
      }}
    >
      <div className="w-full max-w-4xl my-8" style={{ maxHeight: 'calc(100vh - 160px)' }}>
        <Card className="border-0 shadow-2xl flex flex-col overflow-hidden">
        <CardContent className="p-4 md:p-6 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between mb-6 flex-shrink-0">
            <div className="flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-bold text-foreground">{copy.goals.resultsTitle}</h2>
            </div>
            <Button onClick={onClose} variant="ghost">
              {copy.goals.close}
            </Button>
          </div>

          <div className="space-y-6 overflow-y-auto flex-1 pr-2" style={{ maxHeight: 'calc(100vh - 320px)' }}>
            {(Array.isArray(suggestions?.goals) ? suggestions.goals : []).map((goal, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="border border-border/70 bg-card">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-xl font-semibold text-foreground mb-1">{goal.title}</h3>
                        <Badge variant="outline" className="capitalize">
                          {t(`goals.categories.${goal.category}`, { defaultValue: goal.category })}
                        </Badge>
                      </div>
                      <Target className="w-6 h-6 text-primary" />
                    </div>

                    <p className="text-muted-foreground mb-4">{goal.description}</p>

                    {/* Why Suggested */}
                    <div className="bg-secondary/70 p-3 rounded-lg mb-4">
                      <p className="text-sm text-muted-foreground">
                        <span className="font-semibold text-primary">{copy.goals.why}: </span>
                        {goal.why_suggested}
                      </p>
                    </div>

                    {/* SMART Breakdown */}
                    {goal.smart_breakdown && (
                      <div className="bg-[hsl(var(--card)/0.97)] p-4 rounded-lg border mb-4">
                        <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          {copy.goals.smart}
                        </h4>
                        <div className="space-y-2 text-sm">
                          {goal.smart_breakdown.specific && (
                            <div>
                              <span className="font-semibold text-muted-foreground">{copy.goals.specific}:</span>
                              <p className="text-muted-foreground">{goal.smart_breakdown.specific}</p>
                            </div>
                          )}
                          {goal.smart_breakdown.measurable && (
                            <div>
                              <span className="font-semibold text-muted-foreground">{copy.goals.measurable}:</span>
                              <p className="text-muted-foreground">{goal.smart_breakdown.measurable}</p>
                            </div>
                          )}
                          {goal.smart_breakdown.achievable && (
                            <div>
                              <span className="font-semibold text-muted-foreground">{copy.goals.achievable}:</span>
                              <p className="text-muted-foreground">{goal.smart_breakdown.achievable}</p>
                            </div>
                          )}
                          {goal.smart_breakdown.relevant && (
                            <div>
                              <span className="font-semibold text-muted-foreground">{copy.goals.relevant}:</span>
                              <p className="text-muted-foreground">{goal.smart_breakdown.relevant}</p>
                            </div>
                          )}
                          {goal.smart_breakdown.time_bound && (
                            <div>
                              <span className="font-semibold text-muted-foreground">{copy.goals.timeBound}:</span>
                              <p className="text-muted-foreground">{goal.smart_breakdown.time_bound}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Initial Milestones */}
                    {safeArray(goal.milestones).length > 0 && (
                      <div className="bg-[hsl(var(--card)/0.97)] p-4 rounded-lg border mb-4">
                        <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-orange-600" />
                          {copy.goals.firstSteps}
                        </h4>
                        <ul className="space-y-1">
                          {safeArray(goal.milestones).map((milestone, i) => (
                            <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                              <span className="text-orange-600 mt-0.5">•</span>
                              <span>{typeof milestone === 'string' ? milestone : milestone.title || milestone.description || copy.goals.step}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <Button
                      onClick={() => onSelectGoal({
                        title: safeText(goal.title, copy.goals.newGoal),
                        category: safeText(goal.category, 'lifestyle'),
                        description: safeText(goal.description, ''),
                        milestones: safeArray(goal.milestones).map((m, idx) => ({ 
                          title: typeof m === 'string' ? safeText(m, `${copy.goals.step} ${idx + 1}`) : safeText(m.title || m.description || m.name, `${copy.goals.step} ${idx + 1}`), 
                          completed: false 
                        }))
                      })}
                      className="w-full bg-primary hover:bg-primary/90"
                    >
                      <Target className="w-4 h-4 mr-2" />
                      {copy.goals.create}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </CardContent>
        </Card>
      </div>
    </PremiumDialog>
  );
}