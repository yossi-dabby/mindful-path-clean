import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueries } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  ArrowRight,
  BookOpen,
  Brain,
  CirclePlay,
  Lightbulb,
  Loader2,
  RefreshCw,
  Sparkles,
  Target
} from 'lucide-react';

import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getCurrentAppLocale } from '@/components/i18n/appLocale';
import { createPageUrl } from '../../utils';
import { getRecommendationDestination, normalizeRecommendationPayload } from './recommendationData';

const LANGUAGE_NAMES = {
  en: 'English',
  he: 'Hebrew',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  it: 'Italian',
  pt: 'Portuguese'
};

const TYPE_ICONS = {
  exercise: CirclePlay,
  resource: BookOpen,
  video: CirclePlay,
  journal_prompt: Brain
};

function RecommendationState({ icon: Icon, title, description, actionLabel, onAction, busy = false, testId }) {
  return (
    <Card className="border border-border bg-[hsl(var(--card)/0.97)] shadow-sm" data-testid={testId}>
      <CardContent className="flex min-h-[230px] flex-col items-center justify-center px-5 py-9 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon className={busy ? 'h-7 w-7 animate-spin' : 'h-7 w-7'} />
        </div>
        <h3 className="text-lg font-bold text-foreground">{title}</h3>
        <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">{description}</p>
        {onAction && (
          <Button
            type="button"
            onClick={onAction}
            className="mt-5 min-h-12 rounded-full bg-primary px-6 text-primary-foreground hover:bg-primary"
           mobileLabelKey="refresh">
            <RefreshCw className="me-2 h-4 w-4" />
            {actionLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default function AiPersonalizedFeed() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const appLocale = getCurrentAppLocale(i18n);

  const dataQueries = useQueries({
    queries: [
      {
        queryKey: ['activeGoals'],
        queryFn: () => base44.entities.Goal.filter({ status: 'active' }, '-created_date', 5),
        staleTime: 1000 * 60 * 10,
        refetchOnWindowFocus: false,
        retry: 1
      },
      {
        queryKey: ['recentJournals'],
        queryFn: () => base44.entities.ThoughtJournal.list('-created_date', 10),
        staleTime: 1000 * 60 * 10,
        refetchOnWindowFocus: false,
        retry: 1
      },
      {
        queryKey: ['recentMoods'],
        queryFn: () => base44.entities.MoodEntry.list('-created_date', 7),
        staleTime: 1000 * 60 * 10,
        refetchOnWindowFocus: false,
        retry: 1
      },
      {
        queryKey: ['exercises'],
        queryFn: () => base44.entities.Exercise.list(),
        staleTime: 1000 * 60 * 30,
        refetchOnWindowFocus: false,
        retry: 1
      },
      {
        queryKey: ['resources', appLocale],
        queryFn: () => base44.entities.Resource.filter(
          { language: appLocale, status: 'active' },
          '-publication_date',
          100
        ),
        staleTime: 1000 * 60 * 30,
        refetchOnWindowFocus: false,
        retry: 1
      },
      {
        queryKey: ['videos'],
        queryFn: () => base44.entities.Video.list(),
        staleTime: 1000 * 60 * 30,
        refetchOnWindowFocus: false,
        retry: 1
      }
    ]
  });

  const [goalsQuery, journalsQuery, moodsQuery, exercisesQuery, resourcesQuery, videosQuery] = dataQueries;
  const dataReady = dataQueries.every((query) => query.isSuccess);
  const dataError = dataQueries.some((query) => query.isError);
  const dataLoading = !dataReady && !dataError;

  const goals = goalsQuery.data || [];
  const recentJournals = journalsQuery.data || [];
  const recentMoods = moodsQuery.data || [];
  const exercises = exercisesQuery.data || [];
  const resources = resourcesQuery.data || [];
  const videos = videosQuery.data || [];

  const aiQuery = useQuery({
    queryKey: ['aiRecommendations', appLocale],
    queryFn: async () => {
      if (!goals.length && !recentJournals.length && !recentMoods.length) {
        const breathingExercise = exercises.find((exercise) => exercise.category === 'breathing');
        return {
          recommendations: [
            {
              type: 'exercise',
              id: breathingExercise?.id || null,
              title: t('recommendations.premium.starter_exercise_title'),
              description: t('recommendations.premium.starter_exercise_description'),
              reason: t('recommendations.premium.starter_exercise_reason'),
              priority: 'high'
            },
            {
              type: 'journal_prompt',
              id: null,
              title: t('recommendations.premium.starter_reflection_title'),
              description: t('recommendations.premium.starter_reflection_description'),
              reason: t('recommendations.premium.starter_reflection_reason'),
              priority: 'medium'
            }
          ],
          insights: t('recommendations.premium.new_user_insights')
        };
      }

      const context = {
        goals: goals.map((goal) => ({ title: goal.title, category: goal.category, progress: goal.progress })),
        recent_emotions: recentMoods.map((mood) => ({
          mood: mood.mood,
          emotions: mood.emotions,
          stress_level: mood.stress_level
        })),
        journal_themes: recentJournals.map((journal) => ({
          cognitive_distortions: journal.cognitive_distortions,
          emotions: journal.emotions,
          emotion_intensity: journal.emotion_intensity,
          outcome_emotion_intensity: journal.outcome_emotion_intensity
        })),
        available_exercises: exercises.slice(0, 30).map((exercise) => ({
          id: exercise.id,
          title: exercise.title,
          category: exercise.category,
          tags: exercise.tags
        })),
        available_resources: resources.slice(0, 30).map((resource) => ({
          id: resource.id,
          title: resource.title,
          type: resource.type,
          category: resource.category
        })),
        available_videos: videos.slice(0, 30).map((video) => ({
          id: video.id,
          title: video.title,
          category: video.category
        }))
      };

      return base44.integrations.Core.InvokeLLM({
        prompt: `You are a careful CBT wellbeing assistant. Create 3-5 supportive content recommendations from the available items when possible.

User context:
${JSON.stringify({ goals: context.goals, recent_emotions: context.recent_emotions, journal_themes: context.journal_themes })}

Available content:
${JSON.stringify({ exercises: context.available_exercises, resources: context.available_resources, videos: context.available_videos })}

Return a JSON object with "recommendations" and "insights". Each recommendation must contain type, id, title, description, reason and priority. Allowed types: exercise, resource, video, journal_prompt. Allowed priorities: high, medium, low.

Safety and language requirements:
- Use warm, non-diagnostic language. Do not make clinical claims or imply certainty.
- Do not expose raw field names, JSON, or hidden reasoning in user-facing text.
- Write every user-facing field only in ${LANGUAGE_NAMES[appLocale] || 'English'} (${appLocale}). Do not mix languages.
- Keep titles short, descriptions to one sentence, reasons to one sentence and insights to two short sentences.
- Preserve the id of a selected available item exactly.`,
        response_json_schema: {
          type: 'object',
          properties: {
            recommendations: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: { type: 'string', enum: ['exercise', 'resource', 'video', 'journal_prompt'] },
                  id: { type: 'string' },
                  title: { type: 'string' },
                  description: { type: 'string' },
                  reason: { type: 'string' },
                  priority: { type: 'string', enum: ['high', 'medium', 'low'] }
                },
                required: ['type', 'title', 'description', 'reason', 'priority']
              }
            },
            insights: { type: 'string' }
          },
          required: ['recommendations', 'insights']
        }
      });
    },
    enabled: dataReady,
    staleTime: 1000 * 60 * 30,
    retry: 1
  });

  const normalized = normalizeRecommendationPayload(aiQuery.data);
  const retryData = () => dataQueries.forEach((query) => query.refetch());

  if (dataLoading || (dataReady && aiQuery.isPending)) {
    return (
      <RecommendationState
        icon={Loader2}
        title={t('recommendations.premium.loading_title')}
        description={t('recommendations.premium.loading_description')}
        busy
        testId="recommendations-loading"
      />
    );
  }

  if (dataError) {
    return (
      <RecommendationState
        icon={RefreshCw}
        title={t('recommendations.premium.data_error_title')}
        description={t('recommendations.premium.data_error_description')}
        actionLabel={t('recommendations.premium.try_again')}
        onAction={retryData}
        testId="recommendations-data-error"
      />
    );
  }

  if (aiQuery.isError) {
    return (
      <RecommendationState
        icon={RefreshCw}
        title={t('recommendations.premium.generation_error_title')}
        description={t('recommendations.premium.generation_error_description')}
        actionLabel={t('recommendations.premium.try_again')}
        onAction={() => aiQuery.refetch()}
        testId="recommendations-generation-error"
      />
    );
  }

  if (!normalized.recommendations.length) {
    return (
      <RecommendationState
        icon={Target}
        title={t('recommendations.premium.empty_title')}
        description={t('recommendations.premium.empty_description')}
        actionLabel={t('recommendations.premium.try_again')}
        onAction={() => aiQuery.refetch()}
        testId="recommendations-empty"
      />
    );
  }

  return (
    <Card className="overflow-hidden border border-border bg-[hsl(var(--card)/0.97)] shadow-[0_20px_50px_rgba(36,100,88,0.12)]" data-testid="recommendations-feed">
      <CardHeader className="border-b border-border bg-gradient-to-br from-white via-emerald-50/75 to-teal-50/80 p-5 sm:p-6">
        <div className="flex min-w-0 items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3 text-start">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-lg shadow-teal-900/15">
              <Sparkles className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <CardTitle className="break-words text-lg text-primary sm:text-xl">
                {t('quick_actions.recommended.title')}
              </CardTitle>
              <p className="mt-1 text-xs leading-5 text-muted-foreground sm:text-sm">
                {t('recommendations.premium.feed_subtitle')}
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => aiQuery.refetch()}
            disabled={aiQuery.isFetching}
            className="h-12 w-12 shrink-0 rounded-2xl border-border bg-[hsl(var(--card)/0.97)] text-primary hover:bg-[hsl(var(--card)/0.97)]"
            aria-label={aiQuery.isFetching ? t('recommendations.premium.refreshing') : t('recommendations.premium.refresh_aria')}
            title={aiQuery.isFetching ? t('recommendations.premium.refreshing') : t('recommendations.premium.refresh_aria')}
            data-testid="recommendations-refresh"
           mobileLabelKey="refresh">
            <RefreshCw className={aiQuery.isFetching ? 'h-5 w-5 animate-spin' : 'h-5 w-5'} />
          </Button>
        </div>

        {normalized.insights && (
          <div className="mt-5 rounded-2xl border border-violet-200/70 bg-violet-50/75 p-4 text-start" data-testid="recommendations-insights">
            <div className="flex items-start gap-3">
              <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-violet-600" />
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wide text-violet-700">
                  {t('recommendations.premium.insights_label')}
                </p>
                <p className="mt-1 break-words text-sm leading-6 text-muted-foreground">{normalized.insights}</p>
              </div>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-3 p-4 sm:p-6">
        {normalized.recommendations.map((recommendation) => {
          const Icon = TYPE_ICONS[recommendation.type] || Target;
          const typeLabel = t(`recommendations.premium.type_${recommendation.type}`);
          const destination = getRecommendationDestination(recommendation.type);

          return (
            <button
              type="button"
              key={recommendation.key}
              onClick={() => navigate(createPageUrl(destination.page, destination.query))}
              className="group w-full rounded-2xl border border-border bg-[hsl(var(--card)/0.97)] p-4 text-start shadow-sm transition hover:-translate-y-0.5 hover:border-border hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label={t('recommendations.premium.open_item', { type: typeLabel, title: recommendation.title })}
              data-testid="recommendation-item"
            >
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="border-border bg-secondary/70 text-[11px] text-primary">
                      {typeLabel}
                    </Badge>
                    {recommendation.priority === 'high' && (
                      <Badge variant="outline" className="border-amber-300/70 bg-amber-50 text-[11px] text-amber-800">
                        {t('recommendations.premium.best_match')}
                      </Badge>
                    )}
                  </div>
                  <h4 className="mt-2 break-words text-base font-bold leading-snug text-foreground">
                    {recommendation.title}
                  </h4>
                  {recommendation.description && (
                    <p className="mt-1 break-words text-sm leading-6 text-muted-foreground">{recommendation.description}</p>
                  )}
                  {recommendation.reason && (
                    <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                        {t('recommendations.premium.why_now')}
                      </p>
                      <p className="mt-1 break-words text-xs leading-5 text-muted-foreground">{recommendation.reason}</p>
                    </div>
                  )}
                </div>
                <ArrowRight className="mt-3 h-5 w-5 shrink-0 text-primary transition group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" />
              </div>
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}
