import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BarChart3, Dumbbell, Lightbulb, Loader2, MessageSquare, RefreshCw, Sparkles, Target, TrendingUp } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { createPageUrl } from '../../utils';
import { safeInvokeLLM } from '../utils/safeInvokeLLM';

const stripHtml = (value) => String(value || '').replace(/<[^>]*>/g, '').slice(0, 700);
const validCategories = ['breathing', 'grounding', 'cognitive_restructuring', 'behavioral_activation', 'mindfulness', 'exposure'];

export default function AiJournalSuggestions({ entry, onClose }) {
  const { t } = useTranslation();
  const languageName = t('journal_ui.ai.language_name');
  const [suggestions, setSuggestions] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const requestStartedRef = useRef(false);
  const titleId = useId();

  const userQuery = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: 300000
  });
  const userEmail = userQuery.data?.email;

  const exercisesQuery = useQuery({
    queryKey: ['exercises'],
    queryFn: () => base44.entities.Exercise.list(),
    placeholderData: [],
    staleTime: 300000
  });
  const goalsQuery = useQuery({
    queryKey: ['goals', userEmail, 'active'],
    queryFn: () => base44.entities.Goal.filter({ created_by: userEmail, status: 'active' }),
    enabled: Boolean(userEmail),
    initialData: [],
    staleTime: 300000
  });
  const entriesQuery = useQuery({
    queryKey: ['thoughtJournals', userEmail, 'recent'],
    queryFn: () => base44.entities.ThoughtJournal.filter({ created_by: userEmail }, '-created_date', 12),
    enabled: Boolean(userEmail),
    initialData: [],
    staleTime: 60000
  });

  const generateSuggestions = useCallback(async (force = false) => {
    if (!userEmail || !entry?.id || (!force && requestStartedRef.current)) return;
    requestStartedRef.current = true;
    setIsLoading(true);
    setError(false);
    try {
      const pastEntries = (Array.isArray(entriesQuery.data) ? entriesQuery.data : [])
        .filter((item) => item.id !== entry.id)
        .slice(0, 6)
        .map((item) => ({
          situation: stripHtml(item.situation).slice(0, 240),
          emotions: Array.isArray(item.emotions) ? item.emotions.slice(0, 6) : [],
          distortions: Array.isArray(item.cognitive_distortions) ? item.cognitive_distortions.slice(0, 5) : []
        }));
      const goals = (Array.isArray(goalsQuery.data) ? goalsQuery.data : []).slice(0, 8).map((goal) => ({
        title: String(goal.title || '').slice(0, 100),
        category: String(goal.category || '').slice(0, 60)
      }));

      const response = await safeInvokeLLM({
        prompt: [
          'You are a supportive CBT journaling guide. Offer concise reflective insights based only on the limited context below.',
          'Write every user-visible field only in ' + languageName + '. Do not mix languages and never expose JSON keys.',
          'Use a warm, tentative, non-diagnostic tone. Do not infer a clinical condition or promise outcomes.',
          'Return at most three recurring themes, three reflection questions and three practice recommendations.',
          'For practice category_id use only one of: ' + validCategories.join(', ') + '.',
          'Current entry: ' + JSON.stringify({
            situation: stripHtml(entry.situation),
            automatic_thoughts: stripHtml(entry.automatic_thoughts),
            emotions: Array.isArray(entry.emotions) ? entry.emotions.slice(0, 8) : [],
            intensity: Number(entry.emotion_intensity) || null,
            distortions: Array.isArray(entry.cognitive_distortions) ? entry.cognitive_distortions.slice(0, 6) : []
          }),
          'Recent entries: ' + JSON.stringify(pastEntries),
          'Active goals: ' + JSON.stringify(goals)
        ].join('\n\n'),
        response_json_schema: {
          type: 'object',
          required: ['entry_overview', 'recurring_themes', 'reflection_questions', 'exercise_recommendations', 'progress_insights'],
          properties: {
            entry_overview: {
              type: 'object',
              required: ['sentiment', 'topic', 'intensity_trend', 'summary'],
              properties: {
                sentiment: { type: 'string', maxLength: 60 },
                topic: { type: 'string', maxLength: 80 },
                intensity_trend: { type: 'string', maxLength: 80 },
                summary: { type: 'string', maxLength: 420 }
              }
            },
            recurring_themes: {
              type: 'array',
              maxItems: 3,
              items: {
                type: 'object',
                required: ['title', 'description'],
                properties: {
                  title: { type: 'string', maxLength: 90 },
                  description: { type: 'string', maxLength: 320 }
                }
              }
            },
            reflection_questions: { type: 'array', maxItems: 3, items: { type: 'string', maxLength: 300 } },
            exercise_recommendations: {
              type: 'array',
              maxItems: 3,
              items: {
                type: 'object',
                required: ['category_id', 'title', 'reason'],
                properties: {
                  category_id: { type: 'string' },
                  title: { type: 'string', maxLength: 90 },
                  reason: { type: 'string', maxLength: 320 }
                }
              }
            },
            progress_insights: { type: 'string', maxLength: 420 },
            goal_alignment: {
              type: 'object',
              properties: {
                related_goal: { type: 'string', maxLength: 100 },
                connection: { type: 'string', maxLength: 320 },
                suggested_action: { type: 'string', maxLength: 240 }
              }
            }
          }
        }
      }, true);

      if (!response?.entry_overview?.summary) throw new Error('Invalid journal insights response');
      setSuggestions({
        ...response,
        recurring_themes: Array.isArray(response.recurring_themes) ? response.recurring_themes.slice(0, 3) : [],
        reflection_questions: Array.isArray(response.reflection_questions) ? response.reflection_questions.filter(Boolean).slice(0, 3) : [],
        exercise_recommendations: Array.isArray(response.exercise_recommendations)
          ? response.exercise_recommendations.filter((item) => validCategories.includes(item?.category_id) && item?.reason).slice(0, 3)
          : []
      });
    } catch (generationError) {
      console.error('Failed to generate journal reflections:', generationError);
      setError(true);
    } finally {
      setIsLoading(false);
    }
  }, [entry, entriesQuery.data, goalsQuery.data, languageName, userEmail]);

  useEffect(() => {
    if (!userEmail || entriesQuery.isLoading || goalsQuery.isLoading) return;
    generateSuggestions();
  }, [userEmail, entriesQuery.isLoading, goalsQuery.isLoading, generateSuggestions]);

  const retry = () => {
    requestStartedRef.current = false;
    generateSuggestions(true);
  };

  if (isLoading) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="mb-4 rounded-2xl border border-border bg-secondary/70 p-5" role="status">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 shrink-0 animate-spin text-primary" />
          <p className="text-sm font-medium text-foreground">{t('journal_ui.ai.analysis_loading')}</p>
        </div>
      </motion.div>
    );
  }

  if (error || !suggestions) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4" role="alert">
        <p className="mb-3 text-sm text-foreground">{t('journal_ui.common.ai_error')}</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={retry} className="min-h-11 flex-1">
            <RefreshCw className="h-4 w-4" />{t('journal_ui.common.retry')}
          </Button>
          <Button variant="ghost" onClick={onClose} className="min-h-11 flex-1">{t('journal_ui.ai.close_suggestions')}</Button>
        </div>
      </div>
    );
  }

  const recommendations = suggestions.exercise_recommendations || [];
  const availableCategories = new Set((exercisesQuery.data || []).map((exercise) => exercise.category));
  const hasMatchingExercise = recommendations.some((item) => availableCategories.has(item.category_id));

  return (
    <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="mt-6 space-y-4" data-testid="journal-ai-reflections" aria-labelledby={titleId}>
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/70">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <h3 id={titleId} className="text-xl font-bold text-foreground">
          {t('journal_ui.ai.analysis_title')}
        </h3>
      </div>

      <Card className="border-border bg-[hsl(var(--card)/0.97)]">
        <CardContent className="p-4 sm:p-5">
          <h4 className="mb-3 flex items-center gap-2 text-base font-bold text-foreground">
            <BarChart3 className="h-5 w-5 text-primary" />{t('journal_ui.ai.entry_analysis')}
          </h4>
          <dl className="grid gap-3 sm:grid-cols-3">
            {[
              [t('journal_ui.ai.sentiment'), suggestions.entry_overview.sentiment],
              [t('journal_ui.ai.topic'), suggestions.entry_overview.topic],
              [t('journal_ui.ai.intensity_trend'), suggestions.entry_overview.intensity_trend]
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl bg-secondary/70 p-3">
                <dt className="text-xs font-bold uppercase tracking-wide text-foreground">{label}</dt>
                <dd className="mt-1 text-sm text-foreground">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 border-t border-border pt-4 text-sm leading-relaxed text-foreground">
            {suggestions.entry_overview.summary}
          </p>
        </CardContent>
      </Card>

      {suggestions.recurring_themes.length > 0 && (
        <Card className="border-border bg-[hsl(var(--card)/0.97)]">
          <CardContent className="p-4 sm:p-5">
            <h4 className="mb-3 flex items-center gap-2 text-base font-bold text-foreground">
              <TrendingUp className="h-5 w-5 text-primary" />{t('journal_ui.ai.recurring_themes')}
            </h4>
            <div className="grid gap-3 sm:grid-cols-2">
              {suggestions.recurring_themes.map((theme, index) => (
                <article key={index} className="rounded-xl border border-border bg-secondary/70 p-3">
                  <h5 className="font-bold text-foreground">{theme.title}</h5>
                  <p className="mt-1 text-sm leading-relaxed text-foreground">{theme.description}</p>
                </article>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {suggestions.reflection_questions.length > 0 && (
        <Card className="border-border bg-[hsl(var(--card)/0.97)]">
          <CardContent className="p-4 sm:p-5">
            <h4 className="mb-3 flex items-center gap-2 text-base font-bold text-foreground">
              <Lightbulb className="h-5 w-5 text-primary" />{t('journal_ui.ai.reflection_questions')}
            </h4>
            <ol className="space-y-2">
              {suggestions.reflection_questions.map((question, index) => (
                <li key={index} className="flex gap-3 rounded-xl bg-secondary/70 p-3 text-sm leading-relaxed text-foreground">
                  <span className="font-bold text-primary">{index + 1}.</span><span>{question}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      {recommendations.length > 0 && (
        <Card className="border-border bg-[hsl(var(--card)/0.97)]">
          <CardContent className="p-4 sm:p-5">
            <h4 className="mb-3 flex items-center gap-2 text-base font-bold text-foreground">
              <Dumbbell className="h-5 w-5 text-primary" />{t('journal_ui.ai.exercise_recommendations')}
            </h4>
            <div className="space-y-3">
              {recommendations.map((item, index) => (
                <article key={index} className="rounded-xl border border-border bg-secondary/70 p-3">
                  <Badge variant="outline" className="border-emerald-300 bg-[hsl(var(--card)/0.97)] text-foreground">{item.title}</Badge>
                  <p className="mt-2 text-sm leading-relaxed text-foreground">{item.reason}</p>
                </article>
              ))}
              {hasMatchingExercise && (
                <Button asChild variant="outline" className="min-h-11 w-full">
                  <Link to={createPageUrl('Exercises')}>{t('journal_ui.ai.browse_exercises')}</Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {suggestions.progress_insights && (
        <Card className="border-border bg-[hsl(var(--card)/0.97)]">
          <CardContent className="p-4 sm:p-5">
            <h4 className="mb-2 flex items-center gap-2 text-base font-bold text-foreground">
              <MessageSquare className="h-5 w-5 text-primary" />{t('journal_ui.ai.progress_insights')}
            </h4>
            <p className="text-sm leading-relaxed text-foreground">{suggestions.progress_insights}</p>
          </CardContent>
        </Card>
      )}

      {suggestions.goal_alignment?.related_goal && (
        <Card className="border-orange-200 bg-[hsl(var(--card)/0.97)]">
          <CardContent className="p-4 sm:p-5">
            <h4 className="mb-3 flex items-center gap-2 text-base font-bold text-foreground">
              <Target className="h-5 w-5 text-primary" />
              {t('journal_ui.ai.goal_connection', { goal: suggestions.goal_alignment.related_goal })}
            </h4>
            <h5 className="text-xs font-bold uppercase tracking-wide text-foreground">{t('journal_ui.ai.how_related')}</h5>
            <p className="mt-1 text-sm leading-relaxed text-foreground">{suggestions.goal_alignment.connection}</p>
            {suggestions.goal_alignment.suggested_action && (
              <>
                <h5 className="mt-3 text-xs font-bold uppercase tracking-wide text-foreground">{t('journal_ui.ai.suggested_action')}</h5>
                <p className="mt-1 text-sm font-medium text-foreground">{suggestions.goal_alignment.suggested_action}</p>
              </>
            )}
            <Button asChild variant="outline" className="mt-4 min-h-11 w-full">
              <Link to={createPageUrl('Goals')}>{t('journal_ui.ai.view_goals')}</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <p className="rounded-xl bg-secondary/70 p-3 text-xs leading-relaxed text-foreground">
        {t('journal_ui.trends.professional_note')}
      </p>
      <Button variant="outline" onClick={onClose} className="min-h-12 w-full">{t('journal_ui.ai.close_suggestions')}</Button>
    </motion.section>
  );
}
