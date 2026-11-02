import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Brain, Lightbulb, Loader2, Sparkles, TrendingUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getCurrentAppLocale } from '@/components/i18n/appLocale';

const insightTypeStyles = {
  positive: 'border-emerald-300 bg-emerald-50/90',
  negative: 'border-rose-300 bg-rose-50/90',
  neutral: 'border-slate-300 bg-slate-50/90'
};

const asArray = (value) => Array.isArray(value) ? value : [];

export default function MoodInsights({ entries }) {
  const { t, i18n } = useTranslation();
  const [insights, setInsights] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const appLocale = getCurrentAppLocale(i18n);
  const outputLanguage = t('mood_tracker.insights.language_name');

  const generateInsights = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    setError('');

    try {
      const summaryData = entries.slice(0, 30).map((entry) => ({
        date: entry.date,
        mood: entry.mood,
        emotions: asArray(entry.emotions),
        triggers: asArray(entry.triggers),
        activities: asArray(entry.activities),
        stress: entry.stress_level,
        energy: entry.energy_level,
        sleep: entry.sleep_quality,
        notes: typeof entry.notes === 'string' ? entry.notes.slice(0, 800) : ''
      }));

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are analyzing the authenticated user's own mood check-ins.

Output language: ${outputLanguage} (locale: ${appLocale}).
Write every user-visible field exclusively in ${outputLanguage}. Do not mix languages and do not expose JSON keys in visible prose.
Use an empathetic, concise and practical tone. Base every claim only on the supplied data. Do not diagnose a medical or mental-health condition. If evidence is limited, say so clearly.

Mood data (up to 30 most recent entries):
${JSON.stringify(summaryData)}

Return:
1. A short overall summary.
2. Up to four notable trends.
3. Up to four likely negative triggers, with impact and one practical suggestion.
4. Up to four mood-boosting activities and their observed benefit.
5. Up to four personalised next steps, each with a category, action and reason.
6. Any patterns that deserve attention, only when supported by the data.
7. Positive progress that is supported by the data.`,
        response_json_schema: {
          type: 'object',
          required: ['summary', 'trends', 'key_triggers', 'mood_boosters', 'recommendations', 'concerns', 'positive_progress'],
          properties: {
            summary: { type: 'string' },
            trends: {
              type: 'array',
              maxItems: 4,
              items: {
                type: 'object',
                required: ['type', 'title', 'description'],
                properties: {
                  type: { type: 'string', enum: ['positive', 'negative', 'neutral'] },
                  title: { type: 'string' },
                  description: { type: 'string' }
                }
              }
            },
            key_triggers: {
              type: 'array',
              maxItems: 4,
              items: {
                type: 'object',
                required: ['trigger', 'impact', 'suggestion'],
                properties: {
                  trigger: { type: 'string' },
                  impact: { type: 'string' },
                  suggestion: { type: 'string' }
                }
              }
            },
            mood_boosters: {
              type: 'array',
              maxItems: 4,
              items: {
                type: 'object',
                required: ['activity', 'benefit'],
                properties: {
                  activity: { type: 'string' },
                  benefit: { type: 'string' }
                }
              }
            },
            recommendations: {
              type: 'array',
              maxItems: 4,
              items: {
                type: 'object',
                required: ['category', 'action', 'reason'],
                properties: {
                  category: { type: 'string' },
                  action: { type: 'string' },
                  reason: { type: 'string' }
                }
              }
            },
            concerns: { type: 'array', items: { type: 'string' } },
            positive_progress: { type: 'array', items: { type: 'string' } }
          }
        }
      });

      if (!result || typeof result !== 'object' || typeof result.summary !== 'string') {
        throw new Error('Invalid mood insight response');
      }

      setInsights({
        ...result,
        trends: asArray(result.trends),
        key_triggers: asArray(result.key_triggers),
        mood_boosters: asArray(result.mood_boosters),
        recommendations: asArray(result.recommendations),
        concerns: asArray(result.concerns),
        positive_progress: asArray(result.positive_progress)
      });
    } catch (generateError) {
      console.error('Error generating mood insights:', generateError);
      setError(t('mood_tracker.insights.error'));
    } finally {
      setIsGenerating(false);
    }
  };

  if (entries.length < 5) {
    return (
      <Card className="border border-border/75 bg-card/90 backdrop-blur-xl shadow-[var(--shadow-md)]" data-testid="mood-insights-empty">
        <CardContent className="px-5 py-10 text-center sm:p-12">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <Brain className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">{t('mood_tracker.insights.not_enough_title')}</h3>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
            {t('mood_tracker.insights.not_enough_description')}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6" data-testid="mood-insights">
      {!insights && (
        <Card className="overflow-hidden border border-primary/15 bg-card/90 backdrop-blur-xl shadow-[var(--shadow-lg)]">
          <CardContent className="relative px-5 py-9 text-center sm:p-10">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-emerald-300/10" aria-hidden="true" />
            <div className="relative">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/12 shadow-sm">
                <Brain className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground sm:text-2xl">{t('mood_tracker.insights.title')}</h3>
              <p className="mx-auto mb-6 mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                {t('mood_tracker.insights.description', { count: entries.length })}
              </p>
              {error && <p role="alert" className="mx-auto mb-4 max-w-xl rounded-xl border border-destructive/25 bg-destructive/8 p-3 text-sm text-destructive">{error}</p>}
              <Button onClick={generateInsights} disabled={isGenerating} className="min-h-12 w-full rounded-full px-7 sm:w-auto">
                {isGenerating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
                {isGenerating ? t('mood_tracker.insights.analyzing') : t('mood_tracker.insights.generate')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {insights && (
        <>
          <InsightSection icon={Brain} title={t('mood_tracker.insights.summary')}>
            <p dir="auto" className="text-base leading-7 text-foreground/85">{insights.summary}</p>
            {error && <p role="alert" className="mt-4 rounded-xl border border-destructive/25 bg-destructive/8 p-3 text-sm text-destructive">{error}</p>}
            <Button onClick={generateInsights} variant="outline" size="sm" className="mt-5 min-h-11 rounded-full" disabled={isGenerating}>
              {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {isGenerating ? t('mood_tracker.insights.analyzing') : t('mood_tracker.insights.regenerate')}
            </Button>
          </InsightSection>

          {insights.trends.length > 0 && (
            <InsightSection icon={TrendingUp} title={t('mood_tracker.insights.trends')}>
              <div className="grid gap-3 lg:grid-cols-2">
                {insights.trends.map((trend, index) => {
                  const type = ['positive', 'negative', 'neutral'].includes(trend.type) ? trend.type : 'neutral';
                  return (
                    <article key={`${trend.title}-${index}`} className={`rounded-2xl border p-4 ${insightTypeStyles[type]}`}>
                      <Badge variant="outline" className="mb-3 rounded-full bg-card/80">{t(`mood_tracker.insights.type.${type}`)}</Badge>
                      <h4 dir="auto" className="text-base font-semibold text-foreground sm:text-lg">{trend.title}</h4>
                      <p dir="auto" className="mt-1.5 text-sm leading-6 text-foreground/75">{trend.description}</p>
                    </article>
                  );
                })}
              </div>
            </InsightSection>
          )}

          {insights.key_triggers.length > 0 && (
            <InsightSection icon={AlertTriangle} title={t('mood_tracker.insights.key_triggers')} iconClassName="text-orange-600">
              <div className="grid gap-3 lg:grid-cols-2">
                {insights.key_triggers.map((item, index) => (
                  <article key={`${item.trigger}-${index}`} className="rounded-2xl border border-orange-200 bg-orange-50/85 p-4">
                    <h4 dir="auto" className="text-base font-semibold text-orange-950 sm:text-lg">{item.trigger}</h4>
                    <p dir="auto" className="mt-1.5 text-sm leading-6 text-foreground/75">{item.impact}</p>
                    <div className="mt-3 flex items-start gap-2 rounded-xl bg-card/65 p-3">
                      <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" />
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-orange-700">{t('mood_tracker.insights.suggestion_label')}</p>
                        <p dir="auto" className="mt-1 text-sm leading-6 text-foreground/75">{item.suggestion}</p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </InsightSection>
          )}

          {insights.mood_boosters.length > 0 && (
            <InsightSection icon={TrendingUp} title={t('mood_tracker.insights.boosters')} iconClassName="text-emerald-600">
              <div className="grid gap-3 md:grid-cols-2">
                {insights.mood_boosters.map((item, index) => (
                  <article key={`${item.activity}-${index}`} className="rounded-2xl border border-emerald-200 bg-emerald-50/85 p-4">
                    <h4 dir="auto" className="text-base font-semibold text-emerald-950 sm:text-lg">{item.activity}</h4>
                    <p dir="auto" className="mt-1.5 text-sm leading-6 text-foreground/75">{item.benefit}</p>
                  </article>
                ))}
              </div>
            </InsightSection>
          )}

          {insights.recommendations.length > 0 && (
            <InsightSection icon={Lightbulb} title={t('mood_tracker.insights.recommendations')} iconClassName="text-sky-600">
              <div className="grid gap-3 lg:grid-cols-2">
                {insights.recommendations.map((recommendation, index) => (
                  <article key={`${recommendation.action}-${index}`} className="rounded-2xl border border-sky-200 bg-sky-50/85 p-4">
                    <Badge variant="outline" className="mb-3 rounded-full bg-card/80 text-sky-800">{recommendation.category}</Badge>
                    <h4 dir="auto" className="text-base font-semibold text-sky-950 sm:text-lg">{recommendation.action}</h4>
                    <p dir="auto" className="mt-1.5 text-sm leading-6 text-foreground/75">{recommendation.reason}</p>
                  </article>
                ))}
              </div>
            </InsightSection>
          )}

          {insights.positive_progress.length > 0 && (
            <InsightSection icon={Sparkles} title={t('mood_tracker.insights.progress')} iconClassName="text-emerald-600">
              <ul className="grid gap-2 md:grid-cols-2">
                {insights.positive_progress.map((item, index) => (
                  <li key={index} className="flex items-start gap-2 rounded-xl bg-emerald-50/75 p-3 text-sm leading-6 text-foreground/80">
                    <span className="mt-0.5 text-emerald-600" aria-hidden="true">✓</span>
                    <span dir="auto">{item}</span>
                  </li>
                ))}
              </ul>
            </InsightSection>
          )}

          {insights.concerns.length > 0 && (
            <InsightSection icon={AlertTriangle} title={t('mood_tracker.insights.concerns')} iconClassName="text-rose-600">
              <ul className="space-y-2">
                {insights.concerns.map((concern, index) => (
                  <li key={index} className="flex items-start gap-2 rounded-xl bg-rose-50/80 p-3 text-sm leading-6 text-foreground/80">
                    <span className="mt-0.5 text-rose-600" aria-hidden="true">!</span>
                    <span dir="auto">{concern}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 border-t border-border/60 pt-4 text-sm leading-6 text-muted-foreground">
                {t('mood_tracker.insights.professional_note')}
              </p>
            </InsightSection>
          )}
        </>
      )}
    </div>
  );
}

function InsightSection({ icon: Icon, title, iconClassName = 'text-primary', children }) {
  return (
    <Card className="overflow-hidden border border-border/75 bg-card/90 backdrop-blur-xl shadow-[var(--shadow-md)]">
      <CardHeader className="border-b border-border/60 bg-secondary/35 px-4 py-4 sm:px-6">
        <CardTitle className="flex items-center gap-2 text-lg text-foreground sm:text-xl">
          <Icon className={`h-5 w-5 ${iconClassName}`} />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 sm:p-6">{children}</CardContent>
    </Card>
  );
}
