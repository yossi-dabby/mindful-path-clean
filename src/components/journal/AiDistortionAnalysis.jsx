import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Loader2, Lightbulb, BookOpen, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { safeInvokeLLM } from '../utils/safeInvokeLLM';

const distortionCatalog = [
  ['all_or_nothing', 'All-or-Nothing Thinking', 'Seeing things only in absolute categories'],
  ['overgeneralization', 'Overgeneralization', 'Drawing a broad conclusion from one event'],
  ['mental_filter', 'Mental Filter', 'Focusing only on negative details'],
  ['disqualifying_positive', 'Disqualifying the Positive', 'Rejecting positive evidence'],
  ['jumping_to_conclusions', 'Jumping to Conclusions', 'Mind reading or predicting without evidence'],
  ['catastrophizing', 'Catastrophizing', 'Expecting the worst possible outcome'],
  ['emotional_reasoning', 'Emotional Reasoning', 'Treating feelings as proof of facts'],
  ['should_statements', 'Should Statements', 'Applying rigid should or must rules'],
  ['labeling', 'Labeling', 'Attaching a global negative label'],
  ['personalization', 'Personalization', 'Taking responsibility for what is outside one’s control']
];

const canonicalById = Object.fromEntries(distortionCatalog.map(([id, canonical]) => [id, canonical]));
const stripHtml = (value) => String(value || '').replace(/<[^>]*>/g, '').slice(0, 1200);

export default function AiDistortionAnalysis({ entry, onApplyDistortions }) {
  const { t } = useTranslation();
  const languageName = t('journal_ui.ai.language_name');
  const [analysis, setAnalysis] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const hasAnalyzedRef = useRef(false);

  const analyzeDistortions = async () => {
    setIsLoading(true);
    setError(false);
    try {
      const catalog = distortionCatalog.map(([id, , description]) => ({ id, description }));
      const response = await safeInvokeLLM({
        prompt: [
          'You are a supportive CBT journaling guide. Review the limited journal context for potentially unhelpful thinking patterns.',
          'Write every user-visible field only in ' + languageName + '. Do not mix languages and never expose JSON keys.',
          'Use a tentative, non-diagnostic tone. Do not claim certainty. Do not invent facts or quote text that is not present.',
          'Return only patterns clearly supported by the entry. Keep each explanation and response concise.',
          'Allowed pattern IDs: ' + JSON.stringify(catalog),
          'Journal context: ' + JSON.stringify({
            situation: stripHtml(entry?.situation),
            automatic_thoughts: stripHtml(entry?.automatic_thoughts),
            emotions: Array.isArray(entry?.emotions) ? entry.emotions.slice(0, 8) : []
          })
        ].join('\n\n'),
        response_json_schema: {
          type: 'object',
          required: ['distortions_found', 'overall_assessment', 'suggested_reframe'],
          properties: {
            distortions_found: {
              type: 'array',
              maxItems: 4,
              items: {
                type: 'object',
                required: ['id', 'title', 'evidence', 'challenge'],
                properties: {
                  id: { type: 'string' },
                  title: { type: 'string', maxLength: 80 },
                  evidence: { type: 'string', maxLength: 320 },
                  challenge: { type: 'string', maxLength: 320 }
                }
              }
            },
            overall_assessment: { type: 'string', maxLength: 420 },
            suggested_reframe: { type: 'string', maxLength: 420 }
          }
        }
      }, true);

      const items = Array.isArray(response?.distortions_found)
        ? response.distortions_found.filter((item) => canonicalById[item?.id] && item?.title && item?.challenge).slice(0, 4)
        : [];
      if (!response?.overall_assessment) throw new Error('Invalid distortion analysis response');
      setAnalysis({ ...response, distortions_found: items });
    } catch (analysisError) {
      console.error('Failed to analyze thinking patterns:', analysisError);
      setError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (hasAnalyzedRef.current) return;
    hasAnalyzedRef.current = true;
    analyzeDistortions();
  }, []);

  const handleApply = () => {
    const names = analysis.distortions_found.map((item) => canonicalById[item.id]).filter(Boolean);
    onApplyDistortions(names, analysis.suggested_reframe);
  };

  if (isLoading) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="rounded-2xl border border-border bg-secondary/70 p-4" role="status">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 shrink-0 animate-spin text-primary" />
          <p className="text-sm font-medium text-foreground">{t('journal_ui.ai.distortion_loading')}</p>
        </div>
      </motion.div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4" role="alert">
        <p className="mb-3 text-sm text-foreground">{t('journal_ui.common.ai_error')}</p>
        <Button variant="outline" onClick={analyzeDistortions} className="min-h-11">
          <RefreshCw className="h-4 w-4" />{t('journal_ui.common.retry')}
        </Button>
      </div>
    );
  }

  return (
    <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="space-y-4" aria-labelledby="distortion-analysis-title">
      <Card className="border-border bg-[hsl(var(--card)/0.97)]">
        <CardContent className="p-4 sm:p-5">
          <h4 id="distortion-analysis-title" className="mb-2 flex items-center gap-2 text-base font-bold text-foreground">
            <AlertCircle className="h-5 w-5 text-primary" />{t('journal_ui.ai.distortion_title')}
          </h4>
          <p className="text-sm leading-relaxed text-foreground">{analysis.overall_assessment}</p>
          {analysis.distortions_found.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {analysis.distortions_found.map((item) => (
                <Badge key={item.id} variant="outline" className="border-amber-300 bg-secondary/70 text-foreground">{item.title}</Badge>
              ))}
            </div>
          ) : (
            <p className="mt-3 rounded-xl bg-secondary/70 p-3 text-sm font-medium text-foreground">
              {t('journal_ui.ai.no_distortions')}
            </p>
          )}
        </CardContent>
      </Card>

      {analysis.distortions_found.map((item) => (
        <Card key={item.id} className="border-border bg-[hsl(var(--card)/0.97)]">
          <CardContent className="p-4 sm:p-5">
            <h5 className="text-base font-bold text-foreground">{item.title}</h5>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border-s-4 border-amber-500 bg-secondary/70 p-3">
                <p className="mb-1 text-xs font-bold uppercase tracking-wide text-foreground">{t('journal_ui.ai.how_appears')}</p>
                <p className="text-sm leading-relaxed text-foreground">{item.evidence}</p>
              </div>
              <div className="rounded-xl border-s-4 border-emerald-500 bg-secondary/70 p-3">
                <p className="mb-1 text-xs font-bold uppercase tracking-wide text-foreground">{t('journal_ui.ai.challenge')}</p>
                <p className="text-sm leading-relaxed text-foreground">{item.challenge}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {analysis.suggested_reframe && (
        <Card className="border-border bg-secondary/70">
          <CardContent className="p-4 sm:p-5">
            <h4 className="mb-2 flex items-center gap-2 text-base font-bold text-foreground">
              <Lightbulb className="h-5 w-5 text-primary" />{t('journal_ui.ai.balanced_perspective')}
            </h4>
            <p className="text-sm leading-relaxed text-foreground">{analysis.suggested_reframe}</p>
          </CardContent>
        </Card>
      )}

      {analysis.distortions_found.length > 0 && (
        <Button onClick={handleApply} className="min-h-12 w-full rounded-xl bg-primary text-primary-foreground hover:bg-primary/90">
          <BookOpen className="h-5 w-5" />{t('journal_ui.ai.apply')}
        </Button>
      )}
      <p className="text-xs leading-relaxed text-foreground">{t('journal_ui.trends.professional_note')}</p>
    </motion.section>
  );
}
