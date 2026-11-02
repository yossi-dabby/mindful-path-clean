import PremiumDialog from '@/components/ui/PremiumDialog';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2, RefreshCw, X, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { safeInvokeLLM } from '../utils/safeInvokeLLM';

export default function AiJournalPrompts({ onSelectPrompt, onClose }) {
  const { t, i18n } = useTranslation();
  const [prompts, setPrompts] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);
  const languageName = t('journal_ui.ai.language_name');

  const userQuery = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me(), staleTime: 300000 });
  const userEmail = userQuery.data?.email;
  const moodsQuery = useQuery({
    queryKey: ['recentMoods', userEmail],
    queryFn: () => base44.entities.MoodEntry.filter({ created_by: userEmail }, '-created_date', 5),
    enabled: Boolean(userEmail),
    initialData: []
  });
  const journalsQuery = useQuery({
    queryKey: ['recentJournals', userEmail],
    queryFn: () => base44.entities.ThoughtJournal.filter({ created_by: userEmail }, '-created_date', 5),
    enabled: Boolean(userEmail),
    initialData: []
  });

  const generatePrompts = async () => {
    setIsLoading(true);
    setError(false);
    try {
      const recentMoods = Array.isArray(moodsQuery.data) ? moodsQuery.data : [];
      const recentJournals = Array.isArray(journalsQuery.data) ? journalsQuery.data : [];
      const moodContext = recentMoods.slice(0, 5).map((mood) => ({
        mood: mood.mood,
        emotions: Array.isArray(mood.emotions) ? mood.emotions.slice(0, 6) : []
      }));
      const journalContext = recentJournals.slice(0, 5).map((entry) => ({
        situation: entry.situation?.replace(/<[^>]*>/g, '').slice(0, 180) || ''
      }));

      const response = await safeInvokeLLM({
        prompt: `You are a supportive CBT journaling guide.
Generate exactly four concise, personalised journal prompts from the limited context below.
Write every user-visible field only in ${languageName}. Do not mix languages and do not expose JSON keys.
Use a warm, non-diagnostic tone. Each title must be distinct from its explanatory prompt.

Recent mood context: ${JSON.stringify(moodContext)}
Recent journal context: ${JSON.stringify(journalContext)}

The prompts should support emotional processing, cognitive flexibility, self-reflection and a practical next step.`,
        response_json_schema: {
          type: 'object',
          required: ['prompts'],
          properties: {
            prompts: {
              type: 'array',
              minItems: 4,
              maxItems: 4,
              items: {
                type: 'object',
                required: ['title', 'prompt', 'focus'],
                properties: {
                  title: { type: 'string', maxLength: 90 },
                  prompt: { type: 'string', maxLength: 420 },
                  focus: { type: 'string', maxLength: 50 }
                }
              }
            }
          }
        }
      }, true);

      const validPrompts = Array.isArray(response?.prompts)
        ? response.prompts.filter((item) => item?.title && item?.prompt).slice(0, 4)
        : [];
      if (!validPrompts.length) throw new Error('Invalid prompt response');
      setPrompts(validPrompts);
    } catch (generationError) {
      console.error('Failed to generate journal prompts:', generationError);
      setError(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PremiumDialog localEscape onClose={onClose} label={t('journal_ui.prompts.title')} className="journal-dialog fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-slate-950/45 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog" aria-modal="true" aria-labelledby="ai-journal-prompts-title" aria-describedby="ai-journal-prompts-description">
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
        className="my-0 w-full max-w-2xl sm:my-8">
        <Card className="flex max-h-[100dvh] flex-col overflow-hidden rounded-b-none rounded-t-[28px] border-border/70 bg-[hsl(var(--card)/0.97)] shadow-2xl sm:max-h-[calc(100dvh-4rem)] sm:rounded-[28px]">
          <CardHeader className="shrink-0 border-b border-border bg-secondary/70 p-4 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary shadow-sm">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle id="ai-journal-prompts-title" className="text-xl font-bold text-primary sm:text-2xl">{t('journal_ui.prompts.title')}</CardTitle>
                  <p id="ai-journal-prompts-description" className="mt-1 text-sm leading-relaxed text-muted-foreground">{t('journal_ui.prompts.description')}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} className="min-h-11 min-w-11 rounded-full" aria-label={t('journal_ui.common.close_aria')}>
                <X className="h-5 w-5" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="flex-1 overflow-y-auto p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:p-6">
            {!prompts && !isLoading && (
              <div className="py-8 text-center">
                {error && (
                  <div className="mx-auto mb-5 flex max-w-md items-start gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-start text-sm text-foreground" role="alert">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />{t('journal_ui.prompts.error')}
                  </div>
                )}
                <Button onClick={generatePrompts} className="min-h-12 rounded-2xl bg-primary px-7 text-primary-foreground hover:bg-primary">
                  <Sparkles className="h-5 w-5" />{error ? t('journal_ui.common.retry') : t('journal_ui.prompts.generate')}
                </Button>
              </div>
            )}

            {isLoading && (
              <div className="py-12 text-center" role="status">
                <Loader2 className="mx-auto mb-3 h-9 w-9 animate-spin text-primary" />
                <p className="text-sm font-medium text-muted-foreground">{t('journal_ui.prompts.loading')}</p>
              </div>
            )}

            {prompts && (
              <div className="space-y-3">
                {prompts.map((prompt, index) => (
                  <motion.button key={`${prompt.title}-${index}`} type="button" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }} onClick={() => onSelectPrompt(prompt.prompt)}
                    aria-label={t('journal_ui.prompts.select_aria', { title: prompt.title })}
                    className="w-full rounded-2xl border border-border bg-[hsl(var(--card)/0.97)] p-4 text-start shadow-sm transition hover:border-border hover:bg-secondary/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <h3 className="text-base font-bold leading-snug text-foreground">{prompt.title}</h3>
                      {prompt.focus && <Badge variant="outline" className="w-fit shrink-0 rounded-full border-border bg-secondary/70 text-xs text-primary">{prompt.focus}</Badge>}
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{prompt.prompt}</p>
                  </motion.button>
                ))}

                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <Button variant="outline" onClick={generatePrompts} disabled={isLoading} className="min-h-12 flex-1 rounded-xl">
                    <RefreshCw className="h-4 w-4" />{t('journal_ui.prompts.refresh')}
                  </Button>
                  <Button variant="outline" onClick={() => onSelectPrompt('')} className="min-h-12 flex-1 rounded-xl">
                    {t('journal_ui.prompts.blank')}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </PremiumDialog>
  );
}
