import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { base44 } from '@/api/base44Client';
import { runRetentionCleanup } from '@/lib/retentionCleanup';
import { Button } from '@/components/ui/button';
export default function RetentionCleanupPanel({ disabled = false }) {
  const { t } = useTranslation();
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const run = async () => {
    if (busy) return;
    setBusy(true); setResult(null);
    try { setResult(await runRetentionCleanup(base44, { force: true })); }
    catch { setResult({ success: false }); }
    finally { setBusy(false); }
  };
  return <section className="space-y-3 border-t pt-5" data-testid="retention-cleanup-panel">
    <p className="text-sm text-muted-foreground">{t('retention_cleanup.scope')}</p>
    <Button variant="outline" onClick={run} disabled={busy || disabled} data-testid="retention-cleanup-run">{t(busy ? 'retention_cleanup.running' : result?.success === false ? 'retention_cleanup.retry' : 'retention_cleanup.run')}</Button>
    {result && <div role={result.success ? 'status' : 'alert'} data-testid="retention-cleanup-result" className="text-sm">
      <p>{t(result.skipped ? 'retention_cleanup.skipped' : result.success ? 'retention_cleanup.success' : 'retention_cleanup.partial')}</p>
      {Number.isInteger(result.deletedMoodEntries) && <p>{t('retention_cleanup.counts', { moods: result.deletedMoodEntries, journals: result.deletedJournalEntries, conversations: result.archivedConversations })}</p>}
    </div>}
  </section>;
}
