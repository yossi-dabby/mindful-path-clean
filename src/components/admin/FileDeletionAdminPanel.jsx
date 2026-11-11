import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function FileDeletionAdminPanel() {
  const { t } = useTranslation();
  const [requests, setRequests] = useState([]);
  const [snapshot, setSnapshot] = useState(null);
  const [ticket, setTicket] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [nextOffset, setNextOffset] = useState(null);
  const run = async (action, requestId, offset = 0) => {
    setBusy(true); setError(false);
    try {
      const { data } = await base44.functions.invoke('fileDeletion', {
        action, ...(action === 'list' ? { offset } : { request_id: requestId }),
        ...(['submitted', 'confirm', 'clear_references'].includes(action) ? { manifest_hash: snapshot.manifest_hash } : {}),
        ...(['submitted', 'confirm'].includes(action) ? { ticket_reference: ticket.trim() } : {}),
        ...(action === 'confirm' ? { all_files_confirmed: confirmed } : {}),
      });
      if (action === 'list') {
        if (!Array.isArray(data?.requests)) throw new Error('Invalid response');
        setRequests(old => offset ? [...old, ...data.requests] : data.requests); setNextOffset(data.next_offset);
        setSnapshot(null); setConfirmed(false); setTicket('');
      } else if (action === 'export') {
        if (data?.request_id !== requestId || !data.manifest_hash || !Array.isArray(data.manifest?.file_uris)) throw new Error('Invalid response');
        const url = URL.createObjectURL(new Blob([JSON.stringify(data.manifest, null, 2)], { type: 'application/json' }));
        const link = document.createElement('a'); link.href = url; link.download = `mindful-path-file-deletion-${requestId}.json`;
        document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
        // Keep only the fingerprint, never storage paths in React state.
        setSnapshot({ request_id: requestId, manifest_hash: data.manifest_hash, status: data.status, incomplete: data.incomplete });
        setTicket(''); setConfirmed(false);
      } else {
        if (data?.id !== requestId || !data.status) throw new Error('Invalid response');
        setRequests(old => old.map(row => row.id === requestId ? { ...row, status: data.status } : row));
        setSnapshot(old => ({ ...old, status: data.status })); setConfirmed(false);
      }
    } catch { setError(true); setSnapshot(null); setConfirmed(false); }
    finally { setBusy(false); }
  };
  return <Card data-testid="file-deletion-admin">
    <CardHeader><CardTitle>{t('file_deletion.admin_title')}</CardTitle></CardHeader>
    <CardContent className="space-y-4">
      <p className="text-sm">{t('file_deletion.admin_notice')}</p>
      <Button disabled={busy} variant="outline" onClick={() => run('list')}>{t('file_deletion.refresh')}</Button>
      {error && <p role="alert">{t('file_deletion.error')}</p>}
      <ul className="space-y-3">{requests.map(row => <li key={row.id} className="rounded-xl border p-3 text-sm space-y-2">
        <p dir="ltr" className="break-all">{row.subject_email || row.id}</p>
        <p>{t(`file_deletion.state_${row.status}`)}</p>
        <p>{t('file_deletion.count', { count: row.file_count })}</p>
        {row.status !== 'references_cleared' && <Button disabled={busy} variant="outline" onClick={() => run('export', row.id)}>{t('file_deletion.export')}</Button>}
      </li>)}</ul>
      {nextOffset !== null && <Button disabled={busy} onClick={() => run('list', null, nextOffset)}>{t('file_deletion.more')}</Button>}
      {snapshot && snapshot.status !== 'references_cleared' && <div className="space-y-3 rounded-xl border p-4">
        <p dir="ltr" className="break-all">{snapshot.request_id}</p>
        {snapshot.incomplete && <p role="status">{t('file_deletion.incomplete')}</p>}
        <label htmlFor="deletion-ticket">{t('file_deletion.ticket')}</label>
        <Input id="deletion-ticket" dir="ltr" value={ticket} disabled={busy} maxLength={160} onChange={event => setTicket(event.target.value)} />
        {snapshot.status === 'requested' && <Button disabled={busy || snapshot.incomplete || ticket.trim().length < 3} onClick={() => run('submitted', snapshot.request_id)}>{t('file_deletion.submitted')}</Button>}
        {snapshot.status === 'submitted' && <>
          <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={confirmed} disabled={busy} onChange={event => setConfirmed(event.target.checked)} />{t('file_deletion.support_confirm')}</label>
          <Button disabled={busy || snapshot.incomplete || !confirmed || ticket.trim().length < 3} onClick={() => run('confirm', snapshot.request_id)}>{t('file_deletion.confirm')}</Button>
        </>}
        {snapshot.status === 'confirmed' && <Button disabled={busy || snapshot.incomplete} onClick={() => run('clear_references', snapshot.request_id)}>{t('file_deletion.clear')}</Button>}
      </div>}
    </CardContent>
  </Card>;
}
