import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Brain, TrendingUp, Target, Book, Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { normalizeCoachingInsights, safeArray, safeText } from '@/components/utils/aiDataNormalizer';
import { useTranslation } from 'react-i18next';
import PremiumIcon from '@/components/ui/PremiumIcon';

export default function PersonalizedInsights({ onStartSession }) {
  const { t, i18n } = useTranslation();
  const [insights, setInsights] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState(false);

  const { data: goals } = useQuery({
    queryKey: ['activeGoals'],
    queryFn: () => base44.entities.Goal.filter({ status: 'active' }),
    initialData: []
  });

  const { data: journals } = useQuery({
    queryKey: ['recentJournals'],
    queryFn: () => base44.entities.ThoughtJournal.list('-created_date', 10),
    initialData: []
  });

  const { data: moods } = useQuery({
    queryKey: ['recentMoods'],
    queryFn: () => base44.entities.MoodEntry.list('-date', 14),
    initialData: []
  });

  const { data: exercises } = useQuery({
    queryKey: ['exercises'],
    queryFn: () => base44.entities.Exercise.list(),
    initialData: []
  });

  // Check for inactive patterns
  const lastJournalDate = journals[0]?.created_date;
  const daysSinceJournal = lastJournalDate ?
  Math.floor((Date.now() - new Date(lastJournalDate)) / (1000 * 60 * 60 * 24)) :
  null;

  const lastMoodDate = moods[0]?.date;
  const daysSinceMood = lastMoodDate ?
  Math.floor((Date.now() - new Date(lastMoodDate)) / (1000 * 60 * 60 * 24)) :
  null;

  const staleGoals = goals.filter((g) => {
    const daysSinceUpdate = Math.floor((Date.now() - new Date(g.updated_date)) / (1000 * 60 * 60 * 24));
    return daysSinceUpdate >= 7;
  });

  const generateInsights = async () => {
    setIsGenerating(true);
    setGenerationError(false);
    try {
      const stripHtml = (html) => {
        if (!html || typeof html !== 'string') return '';
        return html.replace(/<[^>]*>/g, '');
      };

      const journalPatterns = journals.slice(0, 10).map((j) => ({
        date: j.created_date?.split('T')[0],
        emotions: j.emotions?.join(', '),
        cognitive_distortions: j.cognitive_distortions?.join(', '),
        automatic_thoughts: stripHtml(j.automatic_thoughts)?.substring(0, 150),
        balanced_thought: stripHtml(j.balanced_thought)?.substring(0, 150)
      }));

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Respond entirely in ${t('coach.insights.language_name')} (${i18n.resolvedLanguage || i18n.language}). As an AI wellness coach, analyze this user's data to provide personalized insights and recommendations:

**Active Goals:**
${goals.map((g) => `- ${g.title} (${g.category}, ${g.progress}% complete, updated: ${g.updated_date})`).join('\n')}

**Recent Journal Entries (Last 10):**
${JSON.stringify(journalPatterns, null, 2)}

**Recent Mood Trend (Last 14 days):**
${moods.map((m) => `${m.date}: ${m.mood}, stress: ${m.stress_level}/10, energy: ${m.energy_level}`).join('\n')}

**Inactivity Alerts:**
- Days since last journal: ${daysSinceJournal || 'N/A'}
- Days since last mood check: ${daysSinceMood || 'N/A'}
- Goals not updated in 7+ days: ${staleGoals.length}

Provide:
1. **Recurring Thought Patterns**: Identify specific cognitive distortions or negative thought patterns
2. **Targeted CBT Recommendations**: Suggest 2-3 specific exercise categories (breathing, grounding, cognitive_restructuring, mindfulness, etc.) and WHY they would help
3. **Goal Alignment**: How their journal themes relate to their active goals
4. **Engagement Nudges**: Personalized messages to encourage journaling, mood tracking, or goal updates if they've been inactive
5. **Progress Recognition**: Positive patterns or improvements you notice

Be specific, encouraging, and reference their actual data.`,
        response_json_schema: {
          type: "object",
          properties: {
            recurring_patterns: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  pattern: { type: "string" },
                  frequency: { type: "string" },
                  impact: { type: "string" }
                }
              }
            },
            cbt_recommendations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  exercise_category: { type: "string" },
                  reason: { type: "string" },
                  expected_benefit: { type: "string" }
                }
              }
            },
            goal_insights: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  goal_title: { type: "string" },
                  connection: { type: "string" },
                  suggestion: { type: "string" }
                }
              }
            },
            engagement_nudges: {
              type: "array",
              items: { type: "string" }
            },
            positive_progress: {
              type: "array",
              items: { type: "string" }
            }
          }
        }
      });

      const normalized = normalizeCoachingInsights(response);
      setInsights(normalized);
    } catch (error) {
      console.error('Failed to generate insights:', error);
      setGenerationError(true);
    } finally {
      setIsGenerating(false);
    }
  };

  const matchedExercises = safeArray(insights?.cbt_recommendations).map((rec) => {
    return exercises.find((ex) => ex.category === rec.exercise_category);
  }).filter(Boolean);

  return (
    <div className="space-y-4">
      {/* Quick Alerts */}
      {(daysSinceJournal > 5 || daysSinceMood > 3 || staleGoals.length > 0) &&
      <Card className="border border-border/80 bg-card shadow-[var(--shadow-sm)]">
          <CardContent className="bg-secondary/70 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="mb-2 font-semibold text-foreground">{t('coach.insights.activity_title')}</h3>
                <ul className="space-y-1 text-sm text-foreground/85">
                  {daysSinceJournal > 5 &&
                <li>• {t('coach.insights.journal_days', { count: daysSinceJournal })}</li>
                }
                  {daysSinceMood > 3 &&
                <li>• {t('coach.insights.mood_days', { count: daysSinceMood })}</li>
                }
                  {staleGoals.length > 0 &&
                <li>• {t('coach.insights.goals_stale', { count: staleGoals.length })}</li>
                }
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      }

      {/* Generate Insights */}
      {!insights && !isGenerating &&
      <Card className="border border-border/80 bg-card shadow-[var(--shadow-md)]">
          <CardContent className="bg-secondary/70 p-6 text-center">
            <Brain className="text-primary mb-3 mx-auto lucide lucide-brain w-12 h-12" />
            <h3 className="mb-2 text-lg font-bold text-foreground">{t('coach.insights.title')}</h3>
            <p className="mx-auto mb-4 max-w-xl text-sm leading-6 text-muted-foreground">{t('coach.insights.description')}</p>
            <Button
            onClick={generateInsights} className="bg-primary text-primary-foreground px-4 py-2 font-medium tracking-[0.005em] leading-none rounded-3xl inline-flex items-center justify-center gap-2 whitespace-nowrap border border-transparent transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow-[var(--shadow-md)] hover:bg-primary/92 hover:shadow-[var(--shadow-lg)] active:bg-primary/95 h-9 min-h-[44px] md:min-h-0">

              <Sparkles className="w-4 h-4 mr-2" />
              {t('coach.insights.generate')}
            </Button>
          </CardContent>
        </Card>
      }

      {isGenerating &&
      <Card className="border border-border/80 bg-card shadow-[var(--shadow-sm)]">
          <CardContent className="p-8 text-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-3" />
            <p className="text-muted-foreground" role="status" aria-live="polite">{t('coach.insights.analyzing')}</p>
          </CardContent>
        </Card>
      }

      {generationError && !isGenerating && (
        <Card className="border border-red-200 bg-[hsl(var(--card)/0.97)] shadow-sm">
          <CardContent className="flex flex-col items-center gap-3 p-5 text-center">
            <AlertCircle className="h-6 w-6 text-red-500" />
            <p className="text-sm text-red-700" role="alert">{t('coach.insights.error')}</p>
            <Button variant="outline" onClick={generateInsights}>{t('coach.retry')}</Button>
          </CardContent>
        </Card>
      )}

      {insights &&
      <>
          {/* Positive Progress */}
          {safeArray(insights.positive_progress).length > 0 &&
        <Card className="border border-border/80 bg-card shadow-[var(--shadow-sm)]">
              <CardContent className="p-4">
                <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  {t('coach.insights.progress')}
                </h4>
                <ul className="space-y-2">
                  {safeArray(insights.positive_progress).map((item, i) => {
                const text = safeText(item);
                return text ?
                <li key={i} className="text-sm text-foreground/85 flex items-start gap-2">
                        <span className="text-primary mt-0.5">✓</span>
                        <span>{text}</span>
                      </li> :
                null;
              })}
                </ul>
              </CardContent>
            </Card>
        }

          {/* Recurring Patterns */}
          {safeArray(insights.recurring_patterns).filter((p) => p && (p.pattern || typeof p === 'string')).length > 0 &&
        <Card className="border border-border/80 bg-card shadow-[var(--shadow-sm)]">
              <CardContent className="p-4">
                <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Brain className="w-5 h-5 text-primary" />
                  {t('coach.insights.patterns')}
                </h4>
                <div className="space-y-3">
                  {safeArray(insights.recurring_patterns).filter((p) => p && (p.pattern || typeof p === 'string')).map((pattern, i) =>
              <div key={i} className="bg-secondary/45 p-3 rounded-[var(--radius-control)] border border-border/60">
                      <div className="flex items-start justify-between mb-1">
                        <p className="font-medium text-foreground text-sm">
                          {typeof pattern === 'string' ? pattern : pattern.pattern}
                        </p>
                        {typeof pattern === 'object' && pattern.frequency &&
                  <span className="text-xs text-muted-foreground">{pattern.frequency}</span>
                  }
                      </div>
                      {typeof pattern === 'object' && pattern.impact &&
                <p className="text-xs text-muted-foreground">{pattern.impact}</p>
                }
                    </div>
              )}
                </div>
              </CardContent>
            </Card>
        }

          {/* CBT Recommendations */}
          {safeArray(insights.cbt_recommendations).filter((r) => r && (r.exercise_category || typeof r === 'string')).length > 0 &&
        <Card className="border border-border/80 bg-card shadow-[var(--shadow-sm)]">
              <CardContent className="p-4">
                <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Book className="w-5 h-5 text-primary" />
                  {t('coach.insights.recommendations')}
                </h4>
                <div className="space-y-3">
                  {safeArray(insights.cbt_recommendations).filter((r) => r && (r.exercise_category || typeof r === 'string')).map((rec, i) =>
              <div key={i} className="bg-secondary/45 p-3 rounded-[var(--radius-control)] border border-border/60">
                      <p className="font-medium text-foreground text-sm capitalize mb-1">
                        {typeof rec === 'string' ? rec : (rec.exercise_category || '').replace(/_/g, ' ')}
                      </p>
                      {typeof rec === 'object' && rec.reason &&
                <p className="text-xs text-muted-foreground mb-2">{rec.reason}</p>
                }
                      {typeof rec === 'object' && rec.expected_benefit &&
                <p className="flex items-start gap-1.5 text-xs text-primary italic"><PremiumIcon name="idea" size="sm" bare className="mt-0.5 shrink-0" /><span>{rec.expected_benefit}</span></p>
                }
                      {matchedExercises[i] &&
                <p className="text-xs text-muted-foreground mt-2">
                          {t('coach.insights.try')}: <span className="font-medium">{matchedExercises[i].title}</span>
                        </p>
                }
                    </div>
              )}
                </div>
              </CardContent>
            </Card>
        }

          {/* Goal Insights */}
          {safeArray(insights.goal_insights).filter((g) => g && (g.goal_title || typeof g === 'string')).length > 0 &&
        <Card className="border border-border/80 bg-card shadow-[var(--shadow-sm)]">
              <CardContent className="p-4">
                <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary" />
                  {t('coach.insights.goal_alignment')}
                </h4>
                <div className="space-y-3">
                  {safeArray(insights.goal_insights).filter((g) => g && (g.goal_title || typeof g === 'string')).map((insight, i) =>
              <div key={i} className="bg-secondary/45 p-3 rounded-[var(--radius-control)] border border-border/60">
                      <p className="font-medium text-foreground text-sm mb-1">
                        {typeof insight === 'string' ? insight : insight.goal_title}
                      </p>
                      {typeof insight === 'object' && insight.connection &&
                <p className="text-xs text-muted-foreground mb-2">{insight.connection}</p>
                }
                      {typeof insight === 'object' && insight.suggestion &&
                <p className="text-xs text-primary">→ {insight.suggestion}</p>
                }
                    </div>
              )}
                </div>
              </CardContent>
            </Card>
        }

          {/* Engagement Nudges */}
          {safeArray(insights.engagement_nudges).length > 0 &&
        <Card className="border border-border/80 bg-card shadow-[var(--shadow-sm)]">
              <CardContent className="p-4">
                <h4 className="mb-3 font-semibold text-foreground">{t('coach.insights.reminders')}</h4>
                <ul className="space-y-2">
                  {safeArray(insights.engagement_nudges).map((nudge, i) => {
                const text = safeText(nudge);
                return text ?
                <li key={i} className="text-sm text-foreground/85 flex items-start gap-2">
                        <PremiumIcon name="thought" size="sm" bare className="mt-0.5 shrink-0" />
                        <span>{text}</span>
                      </li> :
                null;
              })}
                </ul>
              </CardContent>
            </Card>
        }

          <Button onClick={generateInsights} variant="outline" className="w-full">
            {t('coach.insights.refresh')}
          </Button>
        </>
      }
    </div>);

}