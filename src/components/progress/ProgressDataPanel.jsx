import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, Share2, ShieldCheck, Trash2, TrendingUp } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import {
  appendWellbeingOutcome,
  buildLocalProgressExport,
  clearWellbeingOutcomes,
  createWellbeingOutcome,
  getProgressDataCopy,
  readWellbeingOutcomes,
  summarizeWellbeingOutcomes
} from '../../lib/progressDataTools.js';
import { getAppFormattingLocale, getCurrentAppLocale } from '../i18n/appLocale.js';

const SliderField = ({ label, value, onChange, copy }) => (
  <label className="block space-y-2 text-sm font-medium text-foreground">
    <span className="flex items-center justify-between gap-3"><span>{label}</span><strong>{value}/10</strong></span>
    <input
      type="range"
      min="0"
      max="10"
      step="1"
      value={value}
      onChange={(event) => onChange(Number(event.target.value))}
      className="w-full accent-primary"
      aria-label={label}
    />
    <span className="flex justify-between text-xs font-normal text-muted-foreground"><span>{copy.low}</span><span>{copy.high}</span></span>
  </label>
);

function createProgressFile(payload) {
  const text = JSON.stringify(payload, null, 2);
  const blob = new Blob([text], { type: 'application/json' });
  const filename = `mindful-path-progress-${payload.exportedAt.slice(0, 10)}.json`;
  return { blob, filename, file: new File([blob], filename, { type: 'application/json' }) };
}

export default function ProgressDataPanel({ moodEntries, journalEntries, goals, exercises }) {
  const { i18n } = useTranslation();
  const locale = getCurrentAppLocale(i18n);
  const copy = getProgressDataCopy(locale);
  const formattingLocale = getAppFormattingLocale(locale);
  const [wellbeing, setWellbeing] = useState(5);
  const [distress, setDistress] = useState(5);
  const [functioning, setFunctioning] = useState(5);
  const [outcomes, setOutcomes] = useState(() => readWellbeingOutcomes());
  const [outcomeMessage, setOutcomeMessage] = useState('');
  const [exportConsent, setExportConsent] = useState(false);
  const [includeNarrative, setIncludeNarrative] = useState(false);
  const [exportMessage, setExportMessage] = useState('');

  const trend = useMemo(() => summarizeWellbeingOutcomes(outcomes), [outcomes]);
  const latest = outcomes[outcomes.length - 1];

  const saveOutcome = () => {
    const outcome = createWellbeingOutcome({ wellbeing, distress, functioning });
    if (!appendWellbeingOutcome(outcome)) {
      setOutcomeMessage(copy.saveFailed);
      return;
    }
    setOutcomes(readWellbeingOutcomes());
    setOutcomeMessage(copy.saved);
  };

  const deleteOutcomes = () => {
    if (!globalThis.confirm?.(copy.deleteConfirm)) return;
    if (clearWellbeingOutcomes()) {
      setOutcomes([]);
      setOutcomeMessage(copy.deleted);
    }
  };

  const prepareExport = () => buildLocalProgressExport({
    locale,
    moodEntries,
    journalEntries,
    goals,
    exercises,
    outcomeEntries: outcomes,
    includeNarrative
  });

  const resetExportConsent = () => {
    setExportConsent(false);
    setIncludeNarrative(false);
  };

  const downloadExport = () => {
    try {
      const { blob, filename } = createProgressFile(prepareExport());
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setExportMessage(copy.exportReady);
      resetExportConsent();
    } catch (_) {
      setExportMessage(copy.exportFailed);
    }
  };

  const shareExport = async () => {
    try {
      const { file } = createProgressFile(prepareExport());
      if (!navigator.share || (navigator.canShare && !navigator.canShare({ files: [file] }))) {
        setExportMessage(copy.shareUnavailable);
        return;
      }
      await navigator.share({ files: [file], title: copy.exportTitle });
      setExportMessage(copy.exportReady);
      resetExportConsent();
    } catch (error) {
      if (error?.name !== 'AbortError') setExportMessage(copy.exportFailed);
    }
  };

  const describeDelta = (value, kind) => {
    if (value === 0) return `0 — ${copy.unchanged}`;
    const favourable = kind === 'distress' ? value < 0 : value > 0;
    const word = favourable ? copy.improved : (value > 0 ? copy.increased : copy.decreased);
    return `${value > 0 ? '+' : ''}${value} — ${word}`;
  };

  return (
    <section className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2" data-testid="progress-data-panel">
      <Card className="border border-border/80 bg-card shadow-[var(--shadow-md)]">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-foreground">
            <TrendingUp className="h-5 w-5 text-primary" aria-hidden="true" />
            {copy.outcomeTitle}
          </CardTitle>
          <p className="text-sm leading-6 text-muted-foreground">{copy.outcomeDescription}</p>
        </CardHeader>
        <CardContent className="space-y-5 p-4 pt-0 sm:p-6 sm:pt-0">
          <SliderField label={copy.wellbeing} value={wellbeing} onChange={setWellbeing} copy={copy} />
          <SliderField label={copy.distress} value={distress} onChange={setDistress} copy={copy} />
          <SliderField label={copy.functioning} value={functioning} onChange={setFunctioning} copy={copy} />
          <Button type="button" onClick={saveOutcome} className="min-h-11 w-full sm:w-auto">
            {copy.saveCheckIn}
          </Button>
          {outcomeMessage && <p role="status" className="text-sm text-foreground">{outcomeMessage}</p>}

          <div className="rounded-xl border border-border bg-muted/40 p-4">
            <p className="font-semibold text-foreground">{copy.history}: {outcomes.length} {copy.count}</p>
            {latest && <p className="mt-1 text-xs text-muted-foreground">{copy.latest}: {new Date(latest.recordedAt).toLocaleString(formattingLocale)}</p>}
            {trend.hasTrend ? (
              <div className="mt-3 space-y-1 text-sm">
                <p className="font-medium">{copy.firstToLatest}</p>
                <p>{copy.wellbeing}: {describeDelta(trend.wellbeingDelta, 'wellbeing')}</p>
                <p>{copy.distress}: {describeDelta(trend.distressDelta, 'distress')}</p>
                <p>{copy.functioning}: {describeDelta(trend.functioningDelta, 'functioning')}</p>
              </div>
            ) : <p className="mt-2 text-sm text-muted-foreground">{copy.noTrend}</p>}
          </div>

          {outcomes.length > 0 && (
            <Button type="button" variant="outline" onClick={deleteOutcomes} className="min-h-11 gap-2 border-destructive/30 text-destructive" mobileLabelKey="delete">
              <Trash2 className="h-4 w-4" aria-hidden="true" />{copy.deleteHistory}
            </Button>
          )}
          <p className="rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900">{copy.outcomeDisclaimer}</p>
        </CardContent>
      </Card>

      <Card className="border border-border/80 bg-card shadow-[var(--shadow-md)]">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-foreground">
            <ShieldCheck className="h-5 w-5 text-primary" aria-hidden="true" />
            {copy.exportTitle}
          </CardTitle>
          <p className="text-sm leading-6 text-muted-foreground">{copy.exportDescription}</p>
        </CardHeader>
        <CardContent className="space-y-4 p-4 pt-0 sm:p-6 sm:pt-0">
          <div className="rounded-xl border border-border bg-muted/40 p-4">
            <p className="font-medium text-foreground">{copy.summaryOnly}</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{copy.privacyNote}</p>
          </div>

          <label className="flex min-h-11 items-start gap-3 rounded-xl border border-border p-3 text-sm text-foreground">
            <input
              type="checkbox"
              checked={includeNarrative}
              onChange={(event) => setIncludeNarrative(event.target.checked)}
              className="mt-1 h-4 w-4 accent-primary"
            />
            <span><strong className="block">{copy.includeNarrative}</strong><span className="mt-1 block text-xs leading-5 text-muted-foreground">{copy.includeNarrativeHint}</span></span>
          </label>

          <label className="flex min-h-11 items-start gap-3 rounded-xl border border-primary/30 bg-primary/5 p-3 text-sm text-foreground">
            <input
              type="checkbox"
              checked={exportConsent}
              onChange={(event) => setExportConsent(event.target.checked)}
              className="mt-1 h-4 w-4 accent-primary"
              data-testid="progress-export-consent"
            />
            <span>{copy.exportConsent}</span>
          </label>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button type="button" disabled={!exportConsent} onClick={downloadExport} className="min-h-11 gap-2" data-testid="progress-export-download">
              <Download className="h-4 w-4" aria-hidden="true" />{copy.download}
            </Button>
            <Button type="button" disabled={!exportConsent} variant="outline" onClick={shareExport} className="min-h-11 gap-2">
              <Share2 className="h-4 w-4" aria-hidden="true" />{copy.share}
            </Button>
          </div>
          {exportMessage && <p role="status" className="text-sm text-foreground">{exportMessage}</p>}
          <p className="text-xs text-muted-foreground">{copy.notDiagnostic}</p>
        </CardContent>
      </Card>
    </section>
  );
}
