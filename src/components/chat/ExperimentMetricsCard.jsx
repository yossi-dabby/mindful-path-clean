import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { base44 } from '../../api/base44Client';
import { buildExperimentJournalEntry } from '../../lib/experimentMetrics';

export default function ExperimentMetricsCard({ structuredData, conversationId, messageIndex }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [anxietyAfter, setAnxietyAfter] = useState(5);
  const [beliefAfter, setBeliefAfter] = useState(5);
  const [observedOutcome, setObservedOutcome] = useState('');
  const [learning, setLearning] = useState('');
  const [status, setStatus] = useState('idle');
  const canSave = observedOutcome.trim() && learning.trim() && status !== 'saving' && status !== 'saved';

  const save = async () => {
    if (!canSave) return;
    setStatus('saving');
    try {
      await base44.entities.ThoughtJournal.create(buildExperimentJournalEntry({
        structuredData, conversationId, messageIndex, anxietyAfter, beliefAfter, observedOutcome, learning,
      }));
      setStatus('saved');
    } catch {
      setStatus('failed');
    }
  };

  if (!expanded) {
    return <button type="button" onClick={() => setExpanded(true)} className="mt-3 text-xs underline underline-offset-2">{t('chat.experiment_metrics.open')}</button>;
  }

  return (
    <div className="mt-3 rounded-xl border border-border bg-secondary/50 p-3 space-y-3">
      <p className="text-sm font-medium">{t('chat.experiment_metrics.title')}</p>
      {structuredData?.emotion_ratings?.anxiety != null && <p className="text-xs">{t('chat.experiment_metrics.anxiety_before')}: {structuredData.emotion_ratings.anxiety}/10</p>}
      <label className="block text-xs">{t('chat.experiment_metrics.anxiety_after')}: {anxietyAfter}/10<input className="w-full" type="range" min="0" max="10" value={anxietyAfter} onChange={(event) => setAnxietyAfter(event.target.value)} /></label>
      <label className="block text-xs">{t('chat.experiment_metrics.belief_after')}: {beliefAfter}/10<input className="w-full" type="range" min="0" max="10" value={beliefAfter} onChange={(event) => setBeliefAfter(event.target.value)} /></label>
      <textarea className="w-full rounded-md border border-input bg-card p-2 text-sm text-foreground" value={observedOutcome} onChange={(event) => setObservedOutcome(event.target.value)} placeholder={t('chat.experiment_metrics.outcome')} />
      <textarea className="w-full rounded-md border border-input bg-card p-2 text-sm text-foreground" value={learning} onChange={(event) => setLearning(event.target.value)} placeholder={t('chat.experiment_metrics.learning')} />
      <button type="button" disabled={!canSave} onClick={save} className="rounded-md bg-primary px-3 py-2 text-xs text-primary-foreground disabled:opacity-50">{status === 'saving' ? t('chat.experiment_metrics.saving') : t('chat.experiment_metrics.save')}</button>
      {status === 'saved' && <p role="status" className="text-xs">{t('chat.experiment_metrics.saved')}</p>}
      {status === 'failed' && <p role="alert" className="text-xs text-destructive">{t('chat.experiment_metrics.failed')}</p>}
    </div>
  );
}
