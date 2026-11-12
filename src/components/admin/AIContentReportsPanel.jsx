import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
const STATES = ['open', 'reviewing', 'resolved', 'dismissed'];
function ReportReview({ report, onSaved }) {
  const { t } = useTranslation();
  const [status, setStatus] = useState(report.status);
  const [resolution, setResolution] = useState(report.resolution || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const save = async () => {
    if (busy) return;
    setBusy(true); setError(false);
    try {
      const response = await base44.functions.invoke('aiContentReports', { action: 'review', report_id: report.id, status, resolution });
      if (response?.data?.success !== true) throw new Error('UNCONFIRMED');
      onSaved();
    } catch { setError(true); }
    finally { setBusy(false); }
  };
  return <article className="space-y-3 rounded-xl border border-border p-4" data-testid="ai-report-review">
    <h3 className="font-semibold">{t(`ai_report.${report.reason}`)}</h3><p className="text-xs text-muted-foreground">{report.reported_at} · {report.agent_name}</p>
    <details><summary className="min-h-11 cursor-pointer py-2">{t('ai_report.preview')}</summary><p className="whitespace-pre-wrap break-words text-sm">{report.response_text}</p>{report.details && <p className="mt-3 whitespace-pre-wrap break-words text-sm">{report.details}</p>}</details>
    <label className="block">{t('ai_report.status')}<select disabled={busy} value={status} onChange={event => setStatus(event.target.value)} className="mt-2 min-h-11 w-full rounded-lg border bg-background p-2">{STATES.map(value => <option key={value} value={value}>{t(`ai_report.status_${value}`)}</option>)}</select></label>
    <label className="block">{t('ai_report.resolution')}<textarea disabled={busy} value={resolution} maxLength={1000} rows={2} onChange={event => setResolution(event.target.value)} className="mt-2 w-full rounded-lg border bg-background p-2" /></label>
    {error && <p role="alert">{t('ai_report.admin_error')}</p>}
    <Button onClick={save} disabled={busy || (['resolved', 'dismissed'].includes(status) && !resolution.trim())}>{t('ai_report.save')}</Button>
  </article>;
}
export default function AIContentReportsPanel() {
  const { t } = useTranslation();
  const [reports, setReports] = useState([]);
  const [filter, setFilter] = useState('open');
  const [offset, setOffset] = useState(0);
  const [next, setNext] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [version, setVersion] = useState(0);
  const refresh = useCallback(() => setVersion(value => value + 1), []);
  useEffect(() => {
    let active = true;
    setBusy(true); setError(false); setReports([]);
    base44.functions.invoke('aiContentReports', { action: 'list', status: filter, offset }).then(response => {
      if (!Array.isArray(response?.data?.reports)) throw new Error('UNAVAILABLE');
      if (active) { setReports(response.data.reports); setNext(response.data.next_offset); }
    }).catch(() => { if (active) setError(true); }).finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [filter, offset, version]);
  return <section className="space-y-4 rounded-2xl border border-border p-4" data-testid="ai-reports-admin">
    <h2 className="text-xl font-semibold">{t('ai_report.admin_title')}</h2><p className="text-sm text-muted-foreground">{t('ai_report.admin_notice')}</p>
    <label className="block">{t('ai_report.status')}<select value={filter} onChange={event => { setFilter(event.target.value); setOffset(0); }} className="mt-2 min-h-11 w-full rounded-lg border bg-background p-2">{STATES.map(value => <option key={value} value={value}>{t(`ai_report.status_${value}`)}</option>)}</select></label>
    <Button variant="outline" disabled={busy} onClick={refresh}>{t('ai_report.refresh')}</Button>
    {busy ? <p role="status">{t('ai_report.loading')}</p> : error ? <p role="alert">{t('ai_report.admin_error')}</p> : reports.length ? reports.map(report => <ReportReview key={`${report.id}:${version}`} report={report} onSaved={refresh} />) : <p>{t('ai_report.empty')}</p>}
    <div className="flex gap-2"><Button variant="outline" disabled={busy || offset === 0} onClick={() => setOffset(value => Math.max(0, value - 50))}>{t('ai_report.previous')}</Button><Button variant="outline" disabled={busy || error || next === null} onClick={() => setOffset(next)}>{t('ai_report.next')}</Button></div>
  </section>;
}
