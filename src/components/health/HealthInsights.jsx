import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2, TrendingUp, Activity, Heart, Brain, Lightbulb, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function HealthInsights() {
  const [insights, setInsights] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const { data: healthMetrics } = useQuery({
    queryKey: ['healthMetrics'],
    queryFn: () => base44.entities.HealthMetric.list('-date', 30),
    initialData: []
  });

  const { data: moodEntries } = useQuery({
    queryKey: ['moodEntries'],
    queryFn: () => base44.entities.MoodEntry.list('-date', 30),
    initialData: []
  });

  const { data: journalEntries } = useQuery({
    queryKey: ['thoughtJournals'],
    queryFn: () => base44.entities.ThoughtJournal.list('-created_date', 20),
    initialData: []
  });

  const generateInsights = async () => {
    setIsLoading(true);
    try {
      const stripHtml = (html) => html?.replace(/<[^>]*>/g, '') || '';

      // Prepare health data
      const healthData = healthMetrics.slice(0, 14).map(m => ({
        date: m.date,
        sleep_hours: m.sleep_hours,
        sleep_quality: m.sleep_quality,
        steps: m.steps,
        active_minutes: m.active_minutes,
        heart_rate_avg: m.heart_rate_avg,
        exercise_type: m.exercise_type
      }));

      // Prepare mood data
      const moodData = moodEntries.slice(0, 14).map(m => ({
        date: m.date,
        mood: m.mood,
        emotions: m.emotions?.join(', '),
        stress_level: m.stress_level,
        energy_level: m.energy_level
      }));

      // Prepare journal themes
      const journalThemes = journalEntries.slice(0, 10).map(j => ({
        date: j.created_date?.split('T')[0],
        emotions: j.emotions?.join(', '),
        tags: j.tags?.join(', '),
        situation_snippet: stripHtml(j.situation)?.substring(0, 100)
      }));

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze the correlation between physical health and mental well-being:

**Physical Health Data (Last 14 days):**
${JSON.stringify(healthData, null, 2)}

**Mood & Mental State (Last 14 days):**
${JSON.stringify(moodData, null, 2)}

**Journal Entry Themes:**
${JSON.stringify(journalThemes, null, 2)}

Provide holistic insights:

1. **Sleep-Mood Correlation**: How does sleep affect their mood and mental state?
2. **Activity-Energy Connection**: Relationship between physical activity and energy/stress levels
3. **Physical-Mental Patterns**: Specific patterns noticed (e.g., "Better mood on days with 8+ hours sleep and 30+ min activity")
4. **Heart Rate Insights**: If available, correlations with stress/anxiety levels
5. **Recommendations**: 3-4 actionable recommendations to improve both physical and mental health
6. **Warning Signs**: Any concerning patterns that need attention

Be specific with data points and focus on actionable insights.`,
        response_json_schema: {
          type: "object",
          properties: {
            sleep_mood_correlation: {
              type: "object",
              properties: {
                correlation_strength: { type: "string" },
                key_finding: { type: "string" },
                data_points: { type: "string" }
              }
            },
            activity_energy_connection: {
              type: "object",
              properties: {
                correlation_strength: { type: "string" },
                key_finding: { type: "string" },
                optimal_activity_level: { type: "string" }
              }
            },
            patterns: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  pattern: { type: "string" },
                  impact: { type: "string" },
                  frequency: { type: "string" }
                }
              }
            },
            heart_rate_insights: { type: "string" },
            recommendations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  priority: { type: "string" }
                }
              }
            },
            warning_signs: {
              type: "array",
              items: { type: "string" }
            },
            overall_health_score: {
              type: "object",
              properties: {
                score: { type: "number" },
                summary: { type: "string" }
              }
            }
          }
        }
      });

      setInsights(response);
    } catch (error) {
      console.error('Failed to generate insights:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (healthMetrics.length === 0 || moodEntries.length === 0) {
    return (
      <Card className="border-2 border-yellow-200 bg-gradient-to-br from-yellow-50 to-white">
        <CardContent className="p-6 text-center">
          <Activity className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
          <p className="text-muted-foreground mb-2">Track health data to unlock holistic insights</p>
          <p className="text-sm text-muted-foreground">
            Log your sleep, activity, and health metrics to see how they correlate with your mental well-being
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!insights && !isLoading) {
    return (
      <Card className="border-2 border-purple-200 bg-card">
        <CardContent className="p-6 text-center">
          <Sparkles className="w-12 h-12 text-purple-600 mx-auto mb-3" />
          <h3 className="font-semibold text-foreground mb-2">AI-Powered Holistic Analysis</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Discover how your physical health impacts your mental well-being
          </p>
          <Button
            onClick={generateInsights}
            className="bg-gradient-to-r from-teal-600 to-emerald-700 hover:bg-primary/90"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Generate Health Insights
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="border-2 border-purple-200">
        <CardContent className="p-8 text-center">
          <Loader2 className="w-8 h-8 text-purple-600 animate-spin mx-auto mb-3" />
          <p className="text-muted-foreground">Analyzing your health and mental well-being patterns...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Overall Health Score */}
      {insights.overall_health_score && (
        <Card className="border-2 border-indigo-200 bg-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-foreground mb-1">Holistic Health Score</h3>
                <p className="text-sm text-muted-foreground">{insights.overall_health_score.summary}</p>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-indigo-600">
                  {insights.overall_health_score.score}/10
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sleep-Mood Correlation */}
      <Card className="border-2 border-purple-200 bg-card">
        <CardContent className="p-4">
          <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-600" />
            Sleep-Mood Correlation
          </h4>
          <div className="space-y-2 text-sm">
            <div className="bg-[hsl(var(--card)/0.97)] p-3 rounded-lg">
              <p className="text-muted-foreground text-xs mb-1">Correlation Strength</p>
              <p className="font-medium text-foreground">{insights.sleep_mood_correlation.correlation_strength}</p>
            </div>
            <div className="bg-[hsl(var(--card)/0.97)] p-3 rounded-lg">
              <p className="text-muted-foreground">{insights.sleep_mood_correlation.key_finding}</p>
              <p className="text-muted-foreground text-xs mt-2">{insights.sleep_mood_correlation.data_points}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activity-Energy Connection */}
      <Card className="border-2 border-green-200 bg-card">
        <CardContent className="p-4">
          <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <Activity className="w-5 h-5 text-green-600" />
            Activity-Energy Connection
          </h4>
          <div className="space-y-2 text-sm">
            <div className="bg-[hsl(var(--card)/0.97)] p-3 rounded-lg">
              <p className="text-muted-foreground text-xs mb-1">Correlation Strength</p>
              <p className="font-medium text-foreground">{insights.activity_energy_connection.correlation_strength}</p>
            </div>
            <div className="bg-[hsl(var(--card)/0.97)] p-3 rounded-lg">
              <p className="text-muted-foreground">{insights.activity_energy_connection.key_finding}</p>
              <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground"><Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" /><span>{insights.activity_energy_connection.optimal_activity_level}</span></p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Patterns */}
      {insights.patterns?.length > 0 && (
        <Card className="border-2 border-blue-200 bg-card">
          <CardContent className="p-4">
            <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Key Patterns Identified
            </h4>
            <div className="space-y-2">
              {insights.patterns.map((p, i) => (
                <div key={i} className="bg-[hsl(var(--card)/0.97)] p-3 rounded-lg">
                  <div className="flex items-start justify-between mb-1">
                    <p className="font-medium text-foreground text-sm">{p.pattern}</p>
                    <span className="text-xs text-muted-foreground">{p.frequency}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{p.impact}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {insights.recommendations?.length > 0 && (
        <Card className="border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-white">
          <CardContent className="p-4">
            <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <Heart className="w-5 h-5 text-orange-600" />
              Personalized Recommendations
            </h4>
            <div className="space-y-2">
              {insights.recommendations.map((rec, i) => (
                <div key={i} className="bg-[hsl(var(--card)/0.97)] p-3 rounded-lg border-l-4 border-orange-400">
                  <div className="flex items-start justify-between mb-1">
                    <p className="font-medium text-foreground text-sm">{rec.title}</p>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                      {rec.priority}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{rec.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Warning Signs */}
      {insights.warning_signs?.length > 0 && (
        <Card className="border-2 border-red-200 bg-gradient-to-br from-red-50 to-white">
          <CardContent className="p-4">
            <h4 className="flex items-center gap-2 font-semibold text-foreground mb-3"><AlertTriangle className="h-4 w-4 text-red-600" aria-hidden="true" /> Areas Needing Attention</h4>
            <ul className="space-y-2">
              {insights.warning_signs.map((sign, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2 bg-[hsl(var(--card)/0.97)] p-2 rounded">
                  <span className="text-red-600">•</span>
                  <span>{sign}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Button
        onClick={generateInsights}
        variant="outline"
        className="w-full"
      >
        Refresh Insights
      </Button>
    </motion.div>
  );
}