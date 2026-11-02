import MoreActions from '@/components/ui/MoreActions';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Edit, Trash2, TrendingDown, Image as ImageIcon, Mic, Tag, Sparkles, Download } from 'lucide-react';
import { exportThoughtRecordPdf } from './exportPdfUtils';
import { cn } from '@/lib/utils';
import AiJournalSuggestions from './AiJournalSuggestions';
import AiEntrySummary from './AiEntrySummary';
import { journalNumberOrNull } from './journalPresentation';
import DOMPurify from 'dompurify';

const stripHtml = (html) => {
  if (!html) return '';
  const temporary = document.createElement('div');
  temporary.innerHTML = html;
  return temporary.textContent || temporary.innerText || '';
};
const normalizeKey = (value = '') => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

function ThoughtRecordCard({ entry, onEdit }) {
  const { t, i18n } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [showAiSuggestions, setShowAiSuggestions] = useState(false);
  const [hasSummary, setHasSummary] = useState(Boolean(entry.ai_summary));
  const queryClient = useQueryClient();
  const itemLabel = t('journal_ui.cards.entry_item');
  const locale = i18n.resolvedLanguage || i18n.language || 'en';
  const formattedDate = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(entry.created_date));
  const localizeEmotion = (emotion) => t(`journal_ui.taxonomy.emotions.${normalizeKey(emotion)}`, {
    defaultValue: t(`mood_tracker.taxonomy.emotions.${normalizeKey(emotion)}`, { defaultValue: emotion })
  });
  const localizeDistortion = (distortion) => t(`journal_ui.taxonomy.distortions.${normalizeKey(distortion)}`, { defaultValue: distortion });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ThoughtJournal.delete(id),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['thoughtJournals'] });
    },
    // Keep the card mounted until the server confirms deletion so a failure
    // retains its actions and error message for a retry.
    onSuccess: (_data, id) => {
      queryClient.setQueriesData({ queryKey: ['thoughtJournals'] }, (old = []) =>
        Array.isArray(old) ? old.filter((journal) => journal.id !== id) : old
      );
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['thoughtJournals'] })
  });

  const beforeIntensity = journalNumberOrNull(entry.emotion_intensity);
  const afterIntensity = journalNumberOrNull(entry.outcome_emotion_intensity);
  const hasOutcome = beforeIntensity !== null && afterIntensity !== null;
  const intensityChange = hasOutcome ? beforeIntensity - afterIntensity : 0;
  const improvement = intensityChange > 0;

  return (
    <Card data-testid="journal-entry-card" data-entry-id={entry.id} className="w-full overflow-hidden border border-border/70 bg-[hsl(var(--card)/0.97)] shadow-md backdrop-blur-xl transition-shadow hover:shadow-lg">
      <CardContent className="overflow-x-hidden p-4 sm:p-5 md:p-6">
        {deleteMutation.isError && <p role="alert" className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-foreground">{t('journal_ui.cards.delete_error')}</p>}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <time className="mb-1 block text-sm text-muted-foreground" dateTime={entry.created_date}>{formattedDate}</time>
            {expanded ? (
              <RichSection title={t('journal_ui.form.situation_label')} html={entry.situation} />
            ) : hasSummary ? (
              <AiEntrySummary entry={entry} onSummaryGenerated={() => {
                setHasSummary(true);
                queryClient.invalidateQueries({ queryKey: ['thoughtJournals'] });
              }} />
            ) : (
              <p className="line-clamp-2 break-words font-semibold text-foreground" dir="auto">{stripHtml(entry.situation)}</p>
            )}
          </div>
          <div className="flex shrink-0 justify-end gap-1"><MoreActions deferActions>
            <Button variant="ghost" size="icon" className="min-h-11 min-w-11 rounded-full" onClick={() => exportThoughtRecordPdf(entry)}
              aria-label={t('journal_ui.common.export_pdf')} mobileLabelKey="download"><Download className="h-4 w-4 text-primary" /></Button>
            <Button variant="ghost" size="icon" className="min-h-11 min-w-11 rounded-full" onClick={(event) => onEdit(entry, event.currentTarget)}
              aria-label={t('journal_ui.common.edit_aria', { item: itemLabel })} mobileLabelKey="edit"><Edit className="h-4 w-4 text-blue-700" /></Button>
            <Button variant="ghost" size="icon" className="min-h-11 min-w-11 rounded-full text-red-600" onClick={() => {
              if (window.confirm(t('journal_ui.cards.delete_entry_confirm'))) deleteMutation.mutate(entry.id);
            }} disabled={deleteMutation.isPending} aria-label={t('journal_ui.common.delete_aria', { item: itemLabel })} mobileLabelKey="delete">
              <Trash2 className="h-4 w-4" />
            </Button>
          </MoreActions></div>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {(entry.emotions || []).slice(0, 3).map((emotion) => (
            <Badge key={emotion} variant="secondary" className="max-w-full rounded-full bg-secondary/70 text-foreground">{localizeEmotion(emotion)}</Badge>
          ))}
          {(entry.emotions || []).length > 3 && <Badge variant="secondary" className="rounded-full bg-secondary/70 text-foreground">
            {t('journal_ui.cards.more', { count: entry.emotions.length - 3 })}
          </Badge>}
          {(entry.tags || []).map((tag) => <Badge key={tag} variant="outline" className="max-w-full gap-1 rounded-full border-border bg-secondary/70 text-primary">
            <Tag className="h-3 w-3 shrink-0" /><span className="min-w-0 [overflow-wrap:anywhere]" dir="auto">{tag}</span>
          </Badge>)}
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          {hasOutcome && (
            <div className={cn('flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-semibold',
              improvement ? 'bg-primary/12 text-primary' : 'bg-secondary/70 text-foreground')}>
              {improvement && <TrendingDown className="h-4 w-4" />}
              {t('journal_ui.cards.intensity', { before: beforeIntensity, after: afterIntensity })}
              {improvement && <span>(-{intensityChange})</span>}
            </div>
          )}
          {(entry.images || []).length > 0 && <Badge variant="outline" className="rounded-full"><ImageIcon className="h-3 w-3" />
            {t(entry.images.length === 1 ? 'journal_ui.cards.images' : 'journal_ui.cards.images_plural', { count: entry.images.length })}
          </Badge>}
          {(entry.audio_notes || []).length > 0 && <Badge variant="outline" className="rounded-full"><Mic className="h-3 w-3" />
            {t(entry.audio_notes.length === 1 ? 'journal_ui.cards.audio' : 'journal_ui.cards.audio_plural', { count: entry.audio_notes.length })}
          </Badge>}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="ghost" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded}
            className="min-h-11 flex-1 rounded-xl text-primary hover:bg-secondary/70">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {expanded ? t('journal_ui.cards.show_less') : t('journal_ui.cards.show_full')}
          </Button>
          <Button variant="ghost" onClick={() => setShowAiSuggestions((value) => !value)} aria-expanded={showAiSuggestions}
            className="min-h-11 rounded-xl text-primary hover:bg-secondary/70 sm:w-auto">
            <Sparkles className="h-4 w-4" />{t('journal_ui.cards.ai_analysis')}
          </Button>
        </div>

        {expanded && (
          <div className="mt-4 space-y-4 border-t border-border pt-4">
            <RichSection title={t('journal_ui.cards.automatic_thoughts')} html={entry.automatic_thoughts} />
            {(entry.cognitive_distortions || []).length > 0 && (
              <section>
                <h3 className="mb-2 text-sm font-bold text-foreground">{t('journal_ui.cards.thinking_patterns')}</h3>
                <div className="flex flex-wrap gap-2">{entry.cognitive_distortions.map((distortion) =>
                  <Badge key={distortion} variant="outline" className="rounded-full text-xs">{localizeDistortion(distortion)}</Badge>)}</div>
              </section>
            )}
            {entry.evidence_for && <RichSection title={t('journal_ui.cards.evidence_for')} html={entry.evidence_for} />}
            {entry.evidence_against && <RichSection title={t('journal_ui.cards.evidence_against')} html={entry.evidence_against} />}
            {entry.balanced_thought && <RichSection title={t('journal_ui.cards.balanced_thought')} html={entry.balanced_thought}
              className="rounded-2xl border border-border bg-secondary/70 p-4" />}

            {(entry.homework_tasks || []).length > 0 && (
              <section className="rounded-2xl border border-border bg-secondary/70 p-4">
                <h3 className="mb-2 text-sm font-bold text-foreground">{t('journal_ui.cards.homework')}</h3>
                <ul className="space-y-3">{entry.homework_tasks.map((task, index) => (
                  <li key={index} className="border-s-2 border-primary/35 ps-3 text-sm text-foreground [overflow-wrap:anywhere]">
                    <p className="font-semibold">{task.task}</p>
                    {task.duration_minutes && <p className="mt-1 text-xs">{t('journal_ui.cards.duration', { count: task.duration_minutes })}</p>}
                    {task.success_criteria && <p className="text-xs">{t('journal_ui.cards.success', { text: task.success_criteria })}</p>}
                  </li>
                ))}</ul>
              </section>
            )}

            {(entry.images || []).length > 0 && (
              <section>
                <h3 className="mb-2 text-sm font-bold text-foreground">{t('journal_ui.cards.attached_images')}</h3>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{entry.images.map((url, index) => (
                  <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <img src={url} alt={t('journal_ui.cards.images', { count: index + 1 })} className="h-28 w-full rounded-xl object-cover" />
                  </a>
                ))}</div>
              </section>
            )}
            {(entry.audio_notes || []).length > 0 && (
              <section>
                <h3 className="mb-2 text-sm font-bold text-foreground">{t('journal_ui.cards.audio_notes')}</h3>
                <div className="space-y-2">{entry.audio_notes.map((url) => <audio key={url} src={url} controls className="h-11 w-full" />)}</div>
              </section>
            )}
          </div>
        )}

        {showAiSuggestions && <div className="mt-4 border-t border-border pt-4">
          <AiJournalSuggestions entry={entry} onClose={() => setShowAiSuggestions(false)} />
        </div>}
      </CardContent>
    </Card>
  );
}

function RichSection({ title, html, className = '' }) {
  return (
    <section className={className}>
      <h3 className="mb-1 text-sm font-bold text-foreground">{title}</h3>
      <div dir="auto" className="journal-rich-content prose prose-sm max-w-none text-foreground" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(String(html || ''), {
        USE_PROFILES: { html: true },
        FORBID_TAGS: ['img', 'video', 'audio', 'iframe', 'object', 'embed', 'svg', 'math'],
      }) }} />
    </section>
  );
}

export default React.memo(ThoughtRecordCard);
