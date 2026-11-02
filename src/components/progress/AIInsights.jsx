import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, TrendingUp, AlertTriangle, Lightbulb, Target, Loader2, RefreshCw } from 'lucide-react';

export default function AIInsights({ moodEntries, journalEntries, exercises }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [insights, setInsights] = useState(null);

  const generateInsights = async () => {
    setIsGenerating(true);
    
    try {
      // Prepare data for AI analysis
      const recentMoods = moodEntries.slice(0, 14).map(m => ({
        date: m.date,
        mood: m.mood,
        emotions: m.emotions,
        intensity: m.intensity,
        triggers: m.triggers
      }));

      const recentJournals = journalEntries.slice(0, 10).map(j => ({
        date: j.created_date,
        situation: j.situation,
        automatic_thoughts: j.automatic_thoughts,
        emotions: j.emotions,
        cognitive_distortions: j.cognitive_distortions,
        balanced_thought: j.balanced_thought,
        intensity_change: j.emotion_intensity - (j.outcome_emotion_intensity || j.emotion_intensity)
      }));

      const exerciseData = exercises
        .filter(e => e.completed_count > 0)
        .map(e => ({
          title: e.title,
          category: e.category,
          completed_count: e.completed_count,
          last_completed: e.last_completed
        }));

      const prompt = `You are a CBT therapist analyzing a client's mental health data. Provide a comprehensive analysis with actionable insights.

**Recent Mood Data (last 14 days):**
${JSON.stringify(recentMoods, null, 2)}

**Recent Journal Entries (last 10):**
${JSON.stringify(recentJournals, null, 2)}

**Completed Exercises:**
${JSON.stringify(exerciseData, null, 2)}

Based on this data, provide:
1. **Mood Trend Analysis**: Identify patterns, trends, and any concerning shifts
2. **Predictive Insights**: Predict potential mood changes based on patterns (e.g., "You tend to feel low on weekends")
3. **Journal Patterns**: Identify recurring cognitive distortions and themes in their thinking
4. **Exercise Effectiveness**: Analyze which exercises correlate with mood improvements
5. **Proactive Strategies**: Suggest 3 specific, actionable coping strategies based on their data
6. **Early Warning Signs**: Identify any red flags or patterns that need attention
7. **Celebration**: Highlight positive progress and wins

Be warm, encouraging, and specific. Reference actual data points.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            mood_trend: {
              type: "object",
              properties: {
                summary: { type: "string" },
                trend_direction: { type: "string", enum: ["improving", "stable", "declining", "mixed"] },
                key_observations: { type: "array", items: { type: "string" } }
              }
            },
            predictions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  pattern: { type: "string" },
                  likelihood: { type: "string", enum: ["high", "moderate", "low"] },
                  recommendation: { type: "string" }
                }
              }
            },
            journal_insights: {
              type: "object",
              properties: {
                common_distortions: { type: "array", items: { type: "string" } },
                recurring_themes: { type: "array", items: { type: "string" } },
                progress_indicators: { type: "array", items: { type: "string" } }
              }
            },
            exercise_analysis: {
              type: "object",
              properties: {
                most_helpful: { type: "string" },
                suggestions: { type: "array", items: { type: "string" } }
              }
            },
            proactive_strategies: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  strategy: { type: "string" },
                  when_to_use: { type: "string" },
                  why_it_helps: { type: "string" }
                }
              }
            },
            warning_signs: {
              type: "array",
              items: { type: "string" }
            },
            positive_highlights: {
              type: "array",
              items: { type: "string" }
            }
          }
        }
      });

      setInsights(response);
    } catch (error) {
      console.error('Failed to generate insights:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const trendColors = {
    improving: 'bg-green-100 text-green-700 border-green-300',
    stable: 'bg-blue-100 text-blue-700 border-blue-300',
    declining: 'bg-orange-100 text-orange-700 border-orange-300',
    mixed: 'bg-purple-100 text-purple-700 border-purple-300'
  };

  const likelihoodColors = {
    high: 'bg-red-100 text-red-700',
    moderate: 'bg-yellow-100 text-yellow-700',
    low: 'bg-green-100 text-green-700'
  };

  if (!insights && !isGenerating) {
    return (
      <Card className="border-0 shadow-lg bg-card">
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-8 h-8 text-purple-600" />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">AI-Powered Insights</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Get personalized analysis of your mood trends, journal patterns, and predictive insights to help you stay ahead of challenges.
          </p>
          <Button
            onClick={generateInsights}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Generate Insights
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isGenerating) {
    return (
      <Card className="border-0 shadow-lg">
        <CardContent className="p-12 text-center">
          <Loader2 className="w-12 h-12 text-purple-600 animate-spin mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Analyzing Your Data...</h3>
          <p className="text-sm text-muted-foreground">This may take a few moments</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Mood Trend Overview */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-600" />
              Mood Trend Analysis
            </CardTitle>
            <Button
              onClick={generateInsights}
              variant="outline"
              size="sm"
              disabled={isGenerating}
             mobileLabelKey="refresh">
              <RefreshCw className="w-4 h-4 mr-1" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className={`p-4 rounded-lg border-2 ${trendColors[insights.mood_trend.trend_direction]}`}>
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5" />
              <span className="font-semibold capitalize">{insights.mood_trend.trend_direction}</span>
            </div>
            <p className="text-sm">{insights.mood_trend.summary}</p>
          </div>
          
          {insights.mood_trend.key_observations.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-muted-foreground mb-2">Key Observations:</h4>
              <ul className="space-y-1">
                {insights.mood_trend.key_observations.map((obs, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-purple-600 mt-1">•</span>
                    <span>{obs}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Predictive Insights */}
      {insights.predictions?.length > 0 && (
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              Predictive Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {insights.predictions.map((pred, i) => (
              <div key={i} className="p-4 rounded-lg bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="font-semibold text-foreground">{pred.pattern}</p>
                  <Badge className={likelihoodColors[pred.likelihood]}>
                    {pred.likelihood} likelihood
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{pred.recommendation}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Journal Insights */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-yellow-600" />
            Journal Patterns
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {insights.journal_insights.common_distortions?.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-muted-foreground mb-2">Common Thinking Patterns:</h4>
              <div className="flex flex-wrap gap-2">
                {insights.journal_insights.common_distortions.map((dist, i) => (
                  <Badge key={i} variant="outline" className="bg-yellow-50">
                    {dist}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
          {insights.journal_insights.recurring_themes?.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-muted-foreground mb-2">Recurring Themes:</h4>
              <ul className="space-y-1">
                {insights.journal_insights.recurring_themes.map((theme, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-yellow-600 mt-1">•</span>
                    <span>{theme}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {insights.journal_insights.progress_indicators?.length > 0 && (
            <div className="bg-green-50 p-3 rounded-lg border border-green-200">
              <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-green-800"><Sparkles className="h-4 w-4" aria-hidden="true" /> Progress Indicators:</h4>
              <ul className="space-y-1">
                {insights.journal_insights.progress_indicators.map((indicator, i) => (
                  <li key={i} className="text-sm text-green-700">• {indicator}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Proactive Strategies */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-600" />
            Personalized Strategies
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {insights.proactive_strategies.map((strategy, i) => (
            <div key={i} className="p-4 rounded-lg bg-blue-50 border border-blue-200">
              <h4 className="font-semibold text-foreground mb-1">{strategy.strategy}</h4>
              <p className="text-sm text-muted-foreground mb-2">
                <span className="font-medium">When to use:</span> {strategy.when_to_use}
              </p>
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">Why it helps:</span> {strategy.why_it_helps}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Warning Signs */}
      {insights.warning_signs?.length > 0 && (
        <Card className="border-0 shadow-lg border-2 border-orange-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-700">
              <AlertTriangle className="w-5 h-5" />
              Areas to Watch
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {insights.warning_signs.map((warning, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                  <AlertTriangle className="mt-1 h-4 w-4 shrink-0 text-orange-600" aria-hidden="true" />
                  <span>{warning}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Positive Highlights */}
      {insights.positive_highlights?.length > 0 && (
        <Card className="border-0 shadow-lg bg-card border-2 border-green-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800">
              <Sparkles className="w-5 h-5" />
              Celebrating Your Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {insights.positive_highlights.map((highlight, i) => (
                <li key={i} className="text-sm text-green-800 flex items-start gap-2">
                  <Sparkles className="mt-1 h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{highlight}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}