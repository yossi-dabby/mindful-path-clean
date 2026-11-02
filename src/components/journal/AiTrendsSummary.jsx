import PremiumDialog from '@/components/ui/PremiumDialog';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Calendar, Brain, Heart, Loader2, BarChart3, Sparkles, X, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { safeInvokeLLM } from '../utils/safeInvokeLLM';

export default function AiTrendsSummary({ onClose }) {
  const { t } = useTranslation();
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [timeframe, setTimeframe] = useState('30');
  const [error, setError] = useState(false);
  const languageName = t('journal_ui.ai.language_name');

  const userQuery = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me(), staleTime: 300000 });
  const userEmail = userQuery.data?.email;
  const entriesQuery = useQuery({
    queryKey: ['thoughtJournals', userEmail],
    queryFn: () => base44.entities.ThoughtJournal.filter({ created_by: userEmail }, '-created_date', 100),
    enabled: Boolean(userEmail),
    initialData: []
  });
  const moodsQuery = useQuery({
    queryKey: ['moodEntries', userEmail],
    queryFn: () => base44.entities.MoodEntry.filter({ created_by: userEmail }, '-date', 100),
    enabled: Boolean(userEmail),
    initialData: []
  });

  const selectedEntries = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - Number(timeframe));
    return (Array.isArray(entriesQuery.data) ? entriesQuery.data : []).filter((entry) =>
      entry.created_date && new Date(entry.created_date) >= cutoff
    );
  }, [entriesQuery.data, timeframe]);

  const generateSummary = async () => {
    setIsLoading(true);
    setError(false);
    try {
      const stripHtml = (html) => html?.replace(/<[^>]*>/g, '').trim() || '';
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - Number(timeframe));
      const recentEntries = selectedEntries.slice(0, 60).map((entry) => ({
        date: entry.created_date,
        situation: stripHtml(entry.situation).slice(0, 240),
        emotions: Array.isArray(entry.emotions) ? entry.emotions.slice(0, 8) : [],
        intensity: entry.emotion_intensity,
        patterns: Array.isArray(entry.cognitive_distortions) ? entry.cognitive_distortions.slice(0, 8) : [],
        outcomeIntensity: entry.outcome_emotion_intensity
      }));
      const recentMoods = (Array.isArray(moodsQuery.data) ? moodsQuery.data : []).filter((mood) =>
        mood.date && new Date(mood.date) >= cutoff
      ).slice(0, 60).map((mood) => ({
        date: mood.date,
        mood: mood.mood,
        emotions: Array.isArray(mood.emotions) ? mood.emotions.slice(0, 8) : [],
        triggers: Array.isArray(mood.triggers) ? mood.triggers.slice(0, 8) : []
      }));

      const response = await safeInvokeLLM({
        prompt: `You are a supportive CBT journaling guide.
Review only the limited journal and mood context below. Identify patterns without diagnosing, predicting or making claims unsupported by the data.
Write every user-visible field only in ${languageName}. Do not mix languages and do not expose JSON keys.
Use clear headings and concise explanations. Include strengths and practical next steps.

Period: last ${timeframe} days
Journal context: ${JSON.stringify(recentEntries)}
Mood context: ${JSON.stringify(recentMoods)}`,
        response_json_schema: {
          type: 'object',
          required: ['summary', 'key_themes', 'emotional_patterns', 'cognitive_patterns', 'notable_insights', 'recommendations'],
          properties: {
            summary: { type: 'string', maxLength: 700 },
            key_themes: { type: 'array', maxItems: 5, items: { type: 'object', required: ['theme', 'description'], properties: {
              theme: { type: 'string', maxLength: 90 }, description: { type: 'string', maxLength: 350 }, frequency: { type: 'string', maxLength: 40 }
            }}},
            emotional_patterns: { type: 'object', required: ['analysis'], properties: {
              common_emotions: { type: 'array', maxItems: 8, items: { type: 'string' } },
              intensity_trend: { type: 'string', maxLength: 180 },
              trend_direction: { type: 'string', enum: ['improving', 'stable', 'challenging'] },
              common_triggers: { type: 'array', maxItems: 8, items: { type: 'string' } },
              analysis: { type: 'string', maxLength: 500 }
            }},
            cognitive_patterns: { type: 'object', required: ['progress_assessment'], properties: {
              frequent_distortions: { type: 'array', maxItems: 8, items: { type: 'string' } },
              progress_assessment: { type: 'string', maxLength: 500 },
              areas_for_growth: { type: 'array', maxItems: 5, items: { type: 'string' } }
            }},
            notable_insights: { type: 'array', maxItems: 5, items: { type: 'string' } },
            recommendations: { type: 'array', maxItems: 4, items: { type: 'object', required: ['title', 'description'], properties: {
              title: { type: 'string', maxLength: 90 }, description: { type: 'string', maxLength: 350 }
            }}}
          }
        }
      }, true);

      if (!response?.summary) throw new Error('Invalid trend response');
      setSummary(response);
    } catch (generationError) {
      console.error('Failed to generate journal trends:', generationError);
      setError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const TrendDirectionIcon = summary?.emotional_patterns?.trend_direction === 'improving' ? TrendingUp : TrendingDown;

  return (
    <PremiumDialog localEscape onClose={onClose} label={t('journal_ui.trends.title')} className="journal-dialog fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-slate-950/45 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog" aria-modal="true" aria-labelledby="journal-trends-title" aria-describedby="journal-trends-description">
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="my-0 w-full max-w-4xl sm:my-8">
        <Card className="flex max-h-[100dvh] flex-col overflow-hidden rounded-b-none rounded-t-[28px] border-border/70 bg-[hsl(var(--card)/0.97)] shadow-2xl sm:max-h-[calc(100dvh-4rem)] sm:rounded-[28px]">
          <div className="journal-dialog-header flex shrink-0 items-start justify-between gap-3 border-b border-border bg-secondary/70 p-4 sm:p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary">
                <BarChart3 className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 id="journal-trends-title" className="text-xl font-bold text-foreground sm:text-2xl">{t('journal_ui.trends.title')}</h2>
                <p id="journal-trends-description" className="mt-1 text-sm text-foreground">{t('journal_ui.trends.intro_description')}</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="min-h-11 min-w-11 rounded-full" aria-label={t('journal_ui.common.close_aria')}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          <CardContent className="flex-1 overflow-y-auto p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:p-6">
            {!summary && !isLoading && (
              <div className="py-6 text-center sm:py-8">
                <Sparkles className="mx-auto mb-4 h-14 w-14 text-primary" />
                <h3 className="text-xl font-bold text-foreground">{t('journal_ui.trends.intro_title')}</h3>

                <div className="mx-auto my-6 grid max-w-md grid-cols-3 gap-2" role="group" aria-label={t('journal_ui.dashboard.range_aria')}>
                  {['7', '30', '90'].map((days) => (
                    <Button key={days} onClick={() => setTimeframe(days)} aria-pressed={timeframe === days}
                      variant={timeframe === days ? 'default' : 'outline'}
                      className={`min-h-11 rounded-xl px-2 text-xs sm:text-sm ${timeframe === days ? 'bg-primary text-primary-foreground hover:bg-primary' : ''}`}>
                      <Calendar className="h-4 w-4" />{t('journal_ui.trends.last_days', { days })}
                    </Button>
                  ))}
                </div>

                {error && (
                  <div className="mx-auto mb-5 flex max-w-md items-start gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-start text-sm text-foreground" role="alert">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />{t('journal_ui.trends.error')}
                  </div>
                )}

                <Button onClick={generateSummary} disabled={!selectedEntries.length}
                  className="min-h-12 rounded-2xl bg-primary px-8 text-primary-foreground hover:bg-primary">
                  <Sparkles className="h-5 w-5" />{error ? t('journal_ui.common.retry') : t('journal_ui.trends.generate')}
                </Button>
                <p className="mt-4 text-sm text-foreground">{t('journal_ui.trends.entry_count', { count: selectedEntries.length })}</p>
              </div>
            )}

            {isLoading && (
              <div className="py-14 text-center" role="status">
                <Loader2 className="mx-auto mb-4 h-11 w-11 animate-spin text-primary" />
                <p className="font-medium text-foreground">{t('journal_ui.trends.loading')}</p>
              </div>
            )}

            {summary && (
              <div className="space-y-4">
                <InsightCard tone="teal" title={t('journal_ui.trends.overview')} icon={Sparkles}>
                  <p>{summary.summary}</p>
                </InsightCard>

                {summary.key_themes?.length > 0 && (
                  <InsightCard tone="blue" title={t('journal_ui.trends.key_themes')} icon={TrendingUp}>
                    <div className="space-y-3">
                      {summary.key_themes.map((theme, index) => (
                        <div key={index} className="rounded-xl border border-border bg-[hsl(var(--card)/0.97)] p-3">
                          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                            <h4 className="font-bold text-foreground">{theme.theme}</h4>
                            {theme.frequency && <Badge variant="outline" className="w-fit rounded-full text-xs">{theme.frequency}</Badge>}
                          </div>
                          <p className="mt-1 text-sm leading-relaxed text-foreground">{theme.description}</p>
                        </div>
                      ))}
                    </div>
                  </InsightCard>
                )}

                {summary.emotional_patterns && (
                  <InsightCard tone="pink" title={t('journal_ui.trends.emotional_patterns')} icon={Heart}>
                    {summary.emotional_patterns.common_emotions?.length > 0 && (
                      <div>
                        <h4 className="mb-2 text-sm font-bold text-foreground">{t('journal_ui.trends.common_emotions')}</h4>
                        <div className="flex flex-wrap gap-2">
                          {summary.emotional_patterns.common_emotions.map((emotion, index) => <Badge key={index} className="rounded-full bg-pink-100 text-pink-900">{emotion}</Badge>)}
                        </div>
                      </div>
                    )}
                    {summary.emotional_patterns.intensity_trend && (
                      <div className="mt-3 flex items-start gap-2 rounded-xl bg-[hsl(var(--card)/0.97)] p-3">
                        <TrendDirectionIcon className="mt-0.5 h-5 w-5 shrink-0 text-pink-700" />
                        <p className="text-sm font-medium text-foreground">{summary.emotional_patterns.intensity_trend}</p>
                      </div>
                    )}
                    <p className="mt-3 text-sm leading-relaxed text-foreground">{summary.emotional_patterns.analysis}</p>
                    {summary.emotional_patterns.common_triggers?.length > 0 && (
                      <div className="mt-3">
                        <h4 className="mb-2 text-sm font-bold text-foreground">{t('journal_ui.trends.common_triggers')}</h4>
                        <div className="flex flex-wrap gap-2">{summary.emotional_patterns.common_triggers.map((trigger, index) => <Badge key={index} variant="outline" className="rounded-full">{trigger}</Badge>)}</div>
                      </div>
                    )}
                  </InsightCard>
                )}

                {summary.cognitive_patterns && (
                  <InsightCard tone="amber" title={t('journal_ui.trends.cognitive_patterns')} icon={Brain}>
                    {summary.cognitive_patterns.frequent_distortions?.length > 0 && (
                      <div>
                        <h4 className="mb-2 text-sm font-bold text-foreground">{t('journal_ui.trends.frequent_distortions')}</h4>
                        <div className="flex flex-wrap gap-2">{summary.cognitive_patterns.frequent_distortions.map((pattern, index) => <Badge key={index} variant="outline" className="rounded-full">{pattern}</Badge>)}</div>
                      </div>
                    )}
                    <p className="mt-3 text-sm leading-relaxed text-foreground">{summary.cognitive_patterns.progress_assessment}</p>
                    {summary.cognitive_patterns.areas_for_growth?.length > 0 && (
                      <div className="mt-3">
                        <h4 className="mb-2 text-sm font-bold text-foreground">{t('journal_ui.trends.growth_areas')}</h4>
                        <ul className="space-y-2">{summary.cognitive_patterns.areas_for_growth.map((area, index) => <li key={index} className="flex items-start gap-2 text-sm text-foreground"><span className="text-primary">•</span>{area}</li>)}</ul>
                      </div>
                    )}
                  </InsightCard>
                )}

                {summary.notable_insights?.length > 0 && (
                  <InsightCard tone="teal" title={t('journal_ui.trends.notable')} icon={Sparkles}>
                    <ol className="space-y-2">{summary.notable_insights.map((insight, index) => <li key={index} className="flex items-start gap-2 rounded-xl bg-[hsl(var(--card)/0.97)] p-3 text-sm text-foreground"><span className="font-bold text-primary">{index + 1}.</span>{insight}</li>)}</ol>
                  </InsightCard>
                )}

                {summary.recommendations?.length > 0 && (
                  <InsightCard tone="green" title={t('journal_ui.trends.recommendations')} icon={TrendingUp}>
                    <div className="space-y-3">{summary.recommendations.map((recommendation, index) => (
                      <div key={index} className="rounded-xl border border-border bg-[hsl(var(--card)/0.97)] p-3">
                        <h4 className="font-bold text-foreground">{recommendation.title}</h4>
                        <p className="mt-1 text-sm leading-relaxed text-foreground">{recommendation.description}</p>
                      </div>
                    ))}</div>
                  </InsightCard>
                )}

                <p className="rounded-xl border border-border bg-secondary/70 p-3 text-xs leading-relaxed text-foreground">
                  {t('journal_ui.trends.professional_note')}
                </p>
                <Button onClick={() => { setSummary(null); setError(false); }} variant="outline" className="min-h-12 w-full rounded-xl">
                  {t('journal_ui.trends.new_analysis')}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </PremiumDialog>
  );
}

const toneClasses = {
  teal: 'border-border bg-secondary/70',
  blue: 'border-border bg-secondary/70',
  pink: 'border-border bg-secondary/70',
  amber: 'border-border bg-secondary/70',
  green: 'border-border bg-secondary/70'
};

function InsightCard({ title, icon: Icon, tone, children }) {
  return (
    <Card className={`border shadow-none ${toneClasses[tone] || toneClasses.teal}`}>
      <CardContent className="p-4 sm:p-5">
        <h3 className="mb-3 flex items-center gap-2 text-base font-bold text-foreground">
          <Icon className="h-5 w-5 text-primary" />{title}
        </h3>
        <div className="text-sm leading-relaxed text-foreground">{children}</div>
      </CardContent>
    </Card>
  );
}
