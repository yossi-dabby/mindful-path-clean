import React, { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Flag } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

const REASONS = ['harmful_advice', 'hate_or_harassment', 'sexual_content', 'privacy', 'other'];
export default function AIContentReportButton({ conversationId, messageId, messageIndex, responseText }) {
  const { t, i18n } = useTranslation();
  const id = useId();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [snapshot, setSnapshot] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [sent, setSent] = useState(false);
  if (!conversationId || !Number.isSafeInteger(messageIndex) || typeof responseText !== 'string' || !responseText.trim()) return null;
  const submit = async event => {
    event.preventDefault();
    if (busy || !reason || !snapshot) return;
    setBusy(true); setError(false);
    try {
      const response = await base44.functions.invoke('aiContentReports', { action: 'submit', ...snapshot, reason, details });
      if (response?.data?.success !== true || !response.data.report_id) throw new Error('REPORT_UNCONFIRMED');
      setSent(true); setOpen(false); setDetails(''); setSnapshot(null);
    } catch { setError(true); }
    finally { setBusy(false); }
  };
  return <div className="mt-2">
    {sent ? <p role="status" data-testid="ai-report-success" className="text-xs text-muted-foreground">{t('ai_report.sent')}</p> :
      <button type="button" data-testid="ai-report-open" className="inline-flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm text-muted-foreground hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => {
        setSnapshot({ conversation_id: conversationId, message_id: messageId || undefined, message_index: messageIndex, response_text: responseText.slice(0, 6000) });
        setError(false); setOpen(true);
      }}><Flag className="h-4 w-4" aria-hidden="true" />{t('ai_report.open')}</button>}
    <Dialog open={open} onOpenChange={value => { if (!busy) setOpen(value); }}>
      <DialogContent dir={i18n.dir()} className="max-h-[85dvh] overflow-y-auto" data-testid="ai-report-dialog">
        <DialogHeader><DialogTitle>{t('ai_report.title')}</DialogTitle><DialogDescription>{t('ai_report.notice')}</DialogDescription></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <details><summary className="min-h-11 cursor-pointer py-2 text-sm">{t('ai_report.preview')}</summary><p className="whitespace-pre-wrap break-words rounded-xl bg-secondary p-3 text-sm">{snapshot?.response_text}</p></details>
          <label className="block text-sm" htmlFor={`${id}-reason`}>{t('ai_report.reason')}</label>
          <select id={`${id}-reason`} data-testid="ai-report-reason" required disabled={busy} value={reason} onChange={event => setReason(event.target.value)} className="min-h-11 w-full rounded-lg border border-border bg-background p-2">
            <option value="">{t('ai_report.choose')}</option>{REASONS.map(value => <option key={value} value={value}>{t(`ai_report.${value}`)}</option>)}
          </select>
          <label className="block text-sm" htmlFor={`${id}-details`}>{t('ai_report.details')}</label>
          <textarea id={`${id}-details`} data-testid="ai-report-details" disabled={busy} value={details} maxLength={1000} rows={3} onChange={event => setDetails(event.target.value)} className="w-full rounded-lg border border-border bg-background p-2" />
          <p className="text-xs text-muted-foreground">{t('ai_report.no_emergency')}</p>
          {error && <p role="alert" className="text-sm text-destructive">{t('ai_report.error')}</p>}
          <div className="flex flex-wrap gap-2"><Button type="submit" data-testid="ai-report-submit" disabled={busy || !reason}>{t(busy ? 'ai_report.sending' : 'ai_report.submit')}</Button><Button type="button" variant="outline" disabled={busy} onClick={() => setOpen(false)}>{t('ai_report.cancel')}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  </div>;
}
