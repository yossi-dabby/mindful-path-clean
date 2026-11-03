import React, { useEffect, useRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import PdfJsViewer from '@/components/forms/PdfJsViewer';
import { requestPilotCatalog, requestPilotPdf } from '@/lib/hebrewFormsPilotClient';

const AGES = ['CH', 'TE', 'AD', 'OA'];
const TRACKS = { shared: 'טפסים משותפים', core: 'Core — יסודות', anxiety: 'Specialized — חרדה ודאגנות' };

// This review surface is intentionally Hebrew-only. Its private server catalog
// is never registered in ALL_FORMS or the AI attachment/search index.
export default function HebrewFormsPilot() {
  const { i18n, t } = useTranslation();
  const isHebrew = (i18n.resolvedLanguage || i18n.language || '').split('-')[0] === 'he';
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [catalog, setCatalog] = useState(null);
  const [expansionPending, setExpansionPending] = useState(false);
  const [age, setAge] = useState(null);
  const [track, setTrack] = useState(null);
  const [unit, setUnit] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null);
  const activeUrl = useRef(null);
  const actionAbort = useRef(null);
  const navigationRef = useRef(null);
  const returnFocus = useRef(null);
  const hadPreview = useRef(false);

  useEffect(() => {
    if (preview) {
      navigationRef.current?.scrollIntoView({ block: 'start' });
      navigationRef.current?.focus({ preventScroll: true });
    } else if (hadPreview.current) {
      returnFocus.current?.focus();
    }
    hadPreview.current = Boolean(preview);
  }, [preview]);

  const clearPreview = () => {
    if (activeUrl.current) URL.revokeObjectURL(activeUrl.current);
    activeUrl.current = null;
    setPreview(null);
  };

  useEffect(() => {
    const controller = new AbortController();
    setCatalog(null); setExpansionPending(false); setPreview(null); setBusy(false); setError('');
    setAge(null); setTrack(null); setUnit(null);
    if (isHebrew && isAdmin) {
      (async () => {
        try {
          const result = await requestPilotCatalog({ signal: controller.signal });
          if (!controller.signal.aborted) {
            setCatalog(result.catalog);
            setExpansionPending(result.expansionPending);
          }
        } catch (failure) {
          if (!controller.signal.aborted) setError(failure.message === 'PILOT_AUTH'
            ? 'אין הרשאת מנהל תקפה. יש להתחבר מחדש.'
            : 'חבילת הפיילוט אינה זמינה כרגע. נסו שוב בעוד זמן קצר.');
        }
      })();
    }
    return () => {
      controller.abort(); actionAbort.current?.abort();
      if (activeUrl.current) URL.revokeObjectURL(activeUrl.current);
      activeUrl.current = null;
    };
  }, [isHebrew, isAdmin, user?.id]);

  const fileAction = async (form, download) => {
    actionAbort.current?.abort();
    const controller = new AbortController();
    actionAbort.current = controller;
    setBusy(true); setError(''); clearPreview();
    try {
      const blob = await requestPilotPdf(form, { signal: controller.signal, download });
      if (controller.signal.aborted) return;
      const url = URL.createObjectURL(blob);
      if (download) {
        const link = document.createElement('a');
        link.href = url; link.download = `${form.id}.pdf`;
        document.body.appendChild(link); link.click(); link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      } else {
        activeUrl.current = url;
        setPreview({ url, title: form.title });
      }
    } catch (failure) {
      if (!controller.signal.aborted) setError(failure.message === 'PILOT_AUTH'
        ? 'אין הרשאת מנהל תקפה. יש להתחבר מחדש.'
        : 'לא ניתן לפתוח את הטופס. הקובץ לא הורד; נסו שוב.');
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  };

  if (!isHebrew || !isAdmin) return null;
  const tracks = { ...TRACKS, mood: t('therapeutic_forms.pilot_release.mood') };
  const forms = (catalog?.forms || []).filter((form) => form.age === age || form.age === 'ALL');
  const selectedForms = forms.filter((form) => form.track === track && form.unit === unit);
  const units = [...new Map(forms.filter((form) => form.track === track).map((form) => [form.unit, form.unitTitle])).entries()];
  const goBack = () => {
    actionAbort.current?.abort();
    setBusy(false); setError('');
    // A PDF (including one still loading) is one level above its form list.
    // Returning from it must preserve the selected age, track and unit.
    if (preview || busy) { clearPreview(); return; }
    if (unit) setUnit(null);
    else if (track) setTrack(null);
    else setAge(null);
  };
  const backLabel = t(`therapeutic_forms.pilot_navigation.${preview || busy ? 'forms' : unit ? 'units' : track ? 'tracks' : 'ages'}`);

  return (
    <section dir="rtl" className="my-6 min-w-0 rounded-[var(--radius-card)] border border-border bg-card p-4 md:p-6" data-testid="hebrew-forms-pilot">
      <h2 className="text-xl font-semibold text-primary">פיילוט טפסים בעברית — למנהל בלבד</h2>
      <p className="my-3 text-sm">{catalog && <><Trans i18nKey="therapeutic_forms.pilot_release.summary" values={{ count: catalog.forms.length, version: catalog.version }} components={{ version: <bdi dir="ltr" /> }} /> </>}טיוטות לסקירה מקצועית בלבד — לא להפצה וללא אישור קליני או אישור זכויות סופי.</p>
      {expansionPending && <p role="status" data-testid="pilot-expansion-pending" className="my-3 text-sm">{t('therapeutic_forms.pilot_release.pending')}</p>}
      {error && <p role="alert" className="my-3 text-destructive">{error}</p>}
      {!catalog && !error && <p role="status">טוען את חבילת הפיילוט…</p>}
      {catalog && <>
        <nav aria-label="מיקום בפיילוט" className="sticky top-[var(--mobile-header-height,60px)] z-20 my-4 rounded-lg border border-border bg-card p-3 text-sm md:top-0" data-testid="pilot-navigation">
          {age && <Button ref={navigationRef} type="button" variant="outline" className="mb-2 min-h-11 w-full justify-start sm:w-auto scroll-mt-[var(--mobile-header-height,60px)] md:scroll-mt-0" onClick={goBack} data-testid="pilot-back">
            <ArrowRight className="h-4 w-4" aria-hidden="true" />{backLabel}
          </Button>}
          <div className="flex flex-wrap items-center gap-2">
          <span>גיל</span>{age && <span>← {catalog.ageGroups[age].label}</span>}
          {track && <span>← {tracks[track]}</span>}{unit && <span>← {units.find(([id]) => id === unit)?.[1]}</span>}
          </div>
        </nav>
        {busy && <p role="status">בודק הרשאה וטוען קובץ…</p>}
        {preview && <div className="my-4 min-w-0" data-testid="pilot-pdf-preview">
          <h3 className="mb-3 font-semibold">{preview.title}</h3>
          <PdfJsViewer fileUrl={preview.url} />
        </div>}
        <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {!age && AGES.map((id) => <Button key={id} type="button" variant="outline" className="h-auto whitespace-normal p-5" onClick={() => setAge(id)} data-testid={`pilot-age-${id}`}>{catalog.ageGroups[id].label}</Button>)}
          {age && !track && Object.entries(tracks).filter(([id]) => forms.some((form) => form.track === id)).map(([id, title]) => <Button key={id} type="button" variant="outline" className="h-auto whitespace-normal p-5" onClick={() => setTrack(id)} data-testid={`pilot-track-${id}`}>{title}</Button>)}
          {track && !unit && units.map(([id, title]) => <Button key={id} type="button" variant="outline" className="h-auto whitespace-normal p-5" onClick={() => setUnit(id)} data-testid={`pilot-unit-${id}`}>{id} — {title}</Button>)}
          {unit && selectedForms.map((form) => <article key={form.id} className="min-w-0 rounded-lg border border-border p-4" data-testid={`pilot-form-${form.id}`}>
            <h3 className="font-semibold text-primary">{form.title}</h3>
            <p className="my-2 text-sm">{form.kind} · {form.audience}</p>
            <p className="break-all text-xs" dir="ltr">{form.id}</p>
            <p className="my-2 text-xs">{form.status}</p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" disabled={busy} onClick={(event) => { returnFocus.current = event.currentTarget; fileAction(form, false); }}>{t('therapeutic_forms.open_form')}</Button>
              <Button type="button" variant="outline" disabled={busy} onClick={() => fileAction(form, true)}>{t('therapeutic_forms.download_form')}</Button>
            </div>
          </article>)}
        </div>
      </>}
    </section>
  );
}
