import MoreActions from '@/components/ui/MoreActions';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, Calendar, Lightbulb, ClipboardList, BookOpen, Download } from 'lucide-react';
import { exportSessionSummaryPdf } from './exportPdfUtils';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';

export default function SessionSummaryCard({ summary, onDelete }) {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const itemLabel = t('journal_ui.cards.summary_item');
  const locale = i18n.resolvedLanguage || i18n.language || 'en';
  const date = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(summary.created_date));

  const deleteSummaryMutation = useMutation({
    mutationFn: (id) => base44.entities.SessionSummary.delete(id),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['sessionSummaries'] });
    },
    onSuccess: (_data, id) => {
      queryClient.setQueriesData({ queryKey: ['sessionSummaries'] }, (old = []) =>
        Array.isArray(old) ? old.filter((item) => item.id !== id) : old
      );
      queryClient.invalidateQueries({ queryKey: ['journalCount'] });
      toast.success(t('journal_ui.cards.summary_deleted'));
      onDelete?.(id);
    },
    onError: () => {
      toast.error(t('journal_ui.cards.summary_delete_error'));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['sessionSummaries'] })
  });

  return (
    <Card data-testid="session-summary-card" data-summary-id={summary.id} className="overflow-hidden border border-border/70 bg-[hsl(var(--card)/0.97)] shadow-md backdrop-blur-xl">
      <CardHeader className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-start sm:justify-between sm:p-6">
        <div className="min-w-0">
          <CardTitle className="flex items-center gap-2 text-lg font-bold text-primary">
            <BookOpen className="h-5 w-5 shrink-0 text-primary" />{t('journal_ui.cards.summary_title')}
          </CardTitle>
          <CardDescription className="mt-1 flex items-center gap-1 text-xs">
            <Calendar className="h-3 w-3 shrink-0" />
            <time dateTime={summary.created_date}>{date}</time>
            <span aria-hidden="true">·</span>
            <span>{t('journal_ui.cards.summary_subtitle')}</span>
          </CardDescription>
        </div>
        <div className="flex shrink-0 justify-end gap-1"><MoreActions deferActions>
          <Button variant="ghost" size="icon" className="min-h-11 min-w-11 rounded-full" onClick={() => exportSessionSummaryPdf(summary)}
            aria-label={t('journal_ui.common.export_pdf')} mobileLabelKey="download"><Download className="h-4 w-4 text-primary" /></Button>
          <Button variant="ghost" size="icon" className="min-h-11 min-w-11 rounded-full text-red-600" onClick={() => {
            if (window.confirm(t('journal_ui.cards.delete_summary_confirm'))) deleteSummaryMutation.mutate(summary.id);
          }} disabled={deleteSummaryMutation.isPending} aria-label={t('journal_ui.common.delete_aria', { item: itemLabel })} mobileLabelKey="delete">
            <Trash2 className="h-4 w-4" />
          </Button>
        </MoreActions></div>
      </CardHeader>
      <CardContent className="space-y-5 p-4 text-sm text-muted-foreground sm:p-6">
        {deleteSummaryMutation.isError && <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-foreground">{t('journal_ui.cards.summary_delete_error')}</p>}
        <div dir="auto" className="journal-rich-content prose prose-sm max-w-none">
          <ReactMarkdown>{summary.summary_content || ''}</ReactMarkdown>
        </div>
        <SummaryList icon={Lightbulb} title={t('journal_ui.cards.takeaways')} items={summary.key_takeaways} tone="amber" />
        <SummaryList icon={ClipboardList} title={t('journal_ui.cards.advice')} items={summary.actionable_advice} tone="blue" />
        {summary.recommended_resources?.length > 0 && (
          <section>
            <h3 className="mb-2 flex items-center gap-2 text-base font-bold text-foreground">
              <BookOpen className="h-4 w-4 text-emerald-700" />{t('journal_ui.cards.resources')}
            </h3>
            <ul className="list-inside list-disc space-y-1">
              {summary.recommended_resources.map((resource, index) => (
                <li key={index} className="break-words">
                  {resource.url ? <a href={resource.url} target="_blank" rel="noopener noreferrer" className="text-primary underline-offset-2 hover:underline">{resource.title}</a> : resource.title}
                </li>
              ))}
            </ul>
          </section>
        )}
      </CardContent>
    </Card>
  );
}

function SummaryList({ icon: Icon, title, items, tone }) {
  if (!items?.length) return null;
  const toneClass = tone === 'amber' ? 'text-amber-700' : 'text-blue-700';
  return (
    <section>
      <h3 className="mb-2 flex items-center gap-2 text-base font-bold text-foreground">
        <Icon className={`h-4 w-4 ${toneClass}`} />{title}
      </h3>
      <ul className="list-inside list-disc space-y-1">
        {items.map((item, index) => <li key={index} dir="auto" className="break-words">{item}</li>)}
      </ul>
    </section>
  );
}
