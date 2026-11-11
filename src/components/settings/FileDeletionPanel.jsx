import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';

export default function FileDeletionPanel() {
  const { t } = useTranslation();
  const [confirmed, setConfirmed] = useState(false);
  const [requests, setRequests] = useState([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const run = async action => {
    setBusy(true); setMessage('');
    try {
      const { data } = await base44.functions.invoke('fileDeletion', { action });
      if (action === 'status') {
        if (!Array.isArray(data?.requests)) throw new Error('Invalid response');
        setRequests(data.requests); setMessage(data.requests.length ? '' : 'empty');
      } else {
        if (!['requested', 'submitted', 'confirmed', 'nothing_to_delete'].includes(data?.status)) throw new Error('Invalid response');
        setMessage(data.status === 'nothing_to_delete' ? 'empty' : 'request_saved');
        if (data.id) setRequests([data]);
        setConfirmed(false);
      }
    } catch { setMessage('error'); }
    finally { setBusy(false); }
  };
  return <section className="space-y-3 border-t pt-6" data-testid="file-deletion-panel">
    <h3 className="font-semibold">{t('file_deletion.title')}</h3>
    <p className="text-sm">{t('file_deletion.notice')}</p>
    <p className="text-sm text-muted-foreground">{t('file_deletion.scope')}</p>
    <label className="flex items-start gap-2 text-sm">
      <input type="checkbox" checked={confirmed} disabled={busy} onChange={event => setConfirmed(event.target.checked)} />
      {t('file_deletion.request_confirm')}
    </label>
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" disabled={busy || !confirmed} onClick={() => run('request')}>{t('file_deletion.request')}</Button>
      <Button variant="outline" disabled={busy} onClick={() => run('status')}>{t('file_deletion.refresh')}</Button>
    </div>
    {message && <p role={message === 'error' ? 'alert' : 'status'}>{t(`file_deletion.${message}`)}</p>}
    <ul className="space-y-2">{requests.map(request => <li key={request.id} className="rounded-xl border p-3 text-sm">
      <p>{t(`file_deletion.state_${request.status}`)}</p>
      <p>{t('file_deletion.count', { count: request.file_count })}</p>
      {request.incomplete && <p>{t('file_deletion.incomplete')}</p>}
    </li>)}</ul>
  </section>;
}
