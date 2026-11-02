import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sparkles,
  Loader2,
  RefreshCw,
  ExternalLink,
  Bookmark,
  BookmarkCheck,
  EyeOff,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

const languageNames = {
  en: 'English',
  he: 'Hebrew',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  it: 'Italian',
  pt: 'Portuguese'
};

export default function AIResourceRecommendations({
  resources,
  onSaveResource,
  savedResourceIds
}) {
  const { t, i18n } = useTranslation();
  const language = (i18n.resolvedLanguage || i18n.language || 'en').split('-')[0];
  const [recommendations, setRecommendations] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [error, setError] = useState('');

  const generateRecommendations = async () => {
    setIsGenerating(true);
    setError('');
    setIsCollapsed(false);

    try {
      const availableResources = resources.map((resource) => ({
        id: resource.id,
        title: resource.title,
        description: resource.description,
        category: resource.category,
        type: resource.type,
        source: resource.source,
        publication_date: resource.publication_date
      }));

      const prompt = `Choose 3 varied starting points from this verified public resource catalog.
Use only IDs from the list. Prefer a mix of topics, explain the practical value without diagnosing anyone,
and write overall_insight and every relevance_reason only in ${languageNames[language] || 'English'}.
Return JSON matching the supplied schema.
Public resource catalog: ${JSON.stringify(availableResources)}`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            recommendations: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  resource_id: { type: 'string' },
                  relevance_reason: { type: 'string' },
                  priority: { type: 'string', enum: ['high', 'medium', 'low'] }
                },
                required: ['resource_id', 'relevance_reason', 'priority']
              }
            },
            overall_insight: { type: 'string' }
          },
          required: ['recommendations']
        }
      });

      setRecommendations({
        overall_insight: typeof response?.overall_insight === 'string'
          ? response.overall_insight
          : '',
        recommendations: Array.isArray(response?.recommendations)
          ? response.recommendations
          : []
      });
    } catch (requestError) {
      console.error('Failed to generate resource recommendations:', requestError);
      setError(t('resources_ui.ai.error'));
    } finally {
      setIsGenerating(false);
    }
  };

  if (isCollapsed) {
    return (
      <div className="mb-8 flex justify-center">
        <Button
          type="button"
          variant="outline"
          onClick={() => setIsCollapsed(false)}
          className="min-h-11 rounded-full bg-card/90 px-5 shadow-sm"
        >
          <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
          {t('resources_ui.ai.show')}
        </Button>
      </div>
    );
  }

  if (!recommendations && !isGenerating && !error) {
    return (
      <Card className="mb-8 overflow-hidden border border-primary/20 bg-gradient-to-br from-card via-card to-primary/5 shadow-[var(--shadow-md)]">
        <CardContent data-testid="resource-ai-guide" className="grid gap-5 p-5 sm:p-6 xl:grid-cols-[auto,1fr,auto] xl:items-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Sparkles className="h-7 w-7" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-semibold text-foreground">
              {t('resources_ui.ai.title')}
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-foreground">
              {t('resources_ui.ai.subtitle')}
            </p>
            <p className="mt-2 flex items-start gap-2 text-xs leading-5 text-foreground">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              {t('resources_ui.ai.privacy')}
            </p>
          </div>
          <Button
            type="button"
            onClick={generateRecommendations}
            className="min-h-11 w-full rounded-xl xl:w-auto"
            disabled={resources.length === 0}
          >
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            {t('resources_ui.ai.generate')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isGenerating) {
    return (
      <Card className="mb-8 border border-primary/20 bg-card/95 shadow-[var(--shadow-md)]" role="status" aria-live="polite">
        <CardContent className="p-8 text-center sm:p-10">
          <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-primary" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-foreground">
            {t('resources_ui.ai.loading_title')}
          </h2>
          <p className="mt-2 text-sm text-foreground">
            {t('resources_ui.ai.loading_text')}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="mb-8 border border-destructive/30 bg-card/95 shadow-sm" role="alert">
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
          <AlertCircle className="h-6 w-6 shrink-0 text-destructive" aria-hidden="true" />
          <p className="flex-1 text-sm text-foreground">{error}</p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={generateRecommendations}>
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              {t('resources_ui.retry')}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setIsCollapsed(true)}>
              <EyeOff className="h-4 w-4" aria-hidden="true" />
              {t('resources_ui.ai.close')}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const recommendedResources = (recommendations?.recommendations || [])
    .map((recommendation) => ({
      ...recommendation,
      resource: resources.find((resource) => resource.id === recommendation.resource_id)
    }))
    .filter((recommendation) => recommendation.resource);

  return (
    <Card className="mb-8 overflow-hidden border border-primary/20 bg-card/95 shadow-[var(--shadow-md)]">
      <CardHeader className="border-b border-border/60 bg-primary/5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="h-5 w-5 text-primary" aria-hidden="true" />
            {t('resources_ui.ai.results_title')}
          </CardTitle>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={generateRecommendations} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              {t('resources_ui.ai.refresh')}
            </Button>
            <Button type="button" onClick={() => setIsCollapsed(true)} variant="ghost" size="sm">
              <EyeOff className="h-4 w-4" aria-hidden="true" />
              {t('resources_ui.ai.close')}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 p-5 sm:p-6">
        {recommendations?.overall_insight && (
          <p className="rounded-xl border border-primary/15 bg-primary/5 p-4 text-sm leading-6 text-foreground">
            {recommendations.overall_insight}
          </p>
        )}

        {recommendedResources.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-5 text-center text-sm text-foreground">
            {t('resources_ui.ai.no_results')}
          </p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {recommendedResources.map((recommendation) => {
              const isSaved = savedResourceIds.includes(recommendation.resource.id);
              return (
                <article
                  key={recommendation.resource.id}
                  className="flex min-w-0 flex-col rounded-2xl border border-border/80 bg-background/80 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h3 className="min-w-0 flex-1 font-semibold leading-snug text-foreground">
                      {recommendation.resource.title}
                    </h3>
                    <Badge variant="secondary">
                      {t(`resources_ui.ai.priority.${recommendation.priority}`)}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-foreground">
                    {recommendation.resource.description}
                  </p>
                  <div className="my-4 rounded-xl border border-primary/15 bg-primary/5 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                      {t('resources_ui.ai.why')}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-foreground">
                      {recommendation.relevance_reason}
                    </p>
                  </div>
                  <div className="mt-auto flex gap-2">
                    <Button asChild size="sm" className="min-h-10 flex-1">
                      <a
                        href={recommendation.resource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${t('resources_ui.card.open')}: ${recommendation.resource.title}. ${t('resources_ui.card.opens_new')}`}
                      >
                        <ExternalLink className="h-4 w-4" aria-hidden="true" />
                        {t('resources_ui.card.open')}
                      </a>
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className="h-10 w-10 shrink-0"
                      onClick={() => onSaveResource(recommendation.resource)}
                      aria-pressed={isSaved}
                      aria-label={t(isSaved ? 'resources_ui.card.remove' : 'resources_ui.card.save', {
                        title: recommendation.resource.title
                      })}
                     mobileLabel={t(isSaved ? 'resources_ui.card.remove' : 'resources_ui.card.save', {
                        title: recommendation.resource.title
                      })}>
                      {isSaved ? (
                        <BookmarkCheck className="h-4 w-4 fill-primary text-primary" aria-hidden="true" />
                      ) : (
                        <Bookmark className="h-4 w-4" aria-hidden="true" />
                      )}
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
