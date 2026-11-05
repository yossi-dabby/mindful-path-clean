import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Maximize2, Minus, Plus, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import PdfDocumentPages from './PdfDocumentPages';
import { capturePdfAnchor, restorePdfAnchor, clampPdfZoom, MIN_PDF_ZOOM, MAX_PDF_ZOOM } from './pdfReaderGeometry';

function ReadingPanel({ pdf, aspectRatio, onRendered, onError }) {
  const { t, i18n } = useTranslation();
  const [zoom, setZoom] = useState(1);
  const zoomRef = useRef(1);
  const scrollRef = useRef(null);
  const anchorRef = useRef(null);

  const changeZoom = useCallback((value, clientX, clientY) => {
    const next = clampPdfZoom(value);
    if (next === zoomRef.current) return;
    const scroller = scrollRef.current;
    const rect = scroller.getBoundingClientRect();
    anchorRef.current = capturePdfAnchor(scroller, clientX ?? rect.left + rect.width / 2, clientY ?? rect.top + rect.height / 2);
    zoomRef.current = next;
    setZoom(next);
  }, []);

  useLayoutEffect(() => {
    restorePdfAnchor(scrollRef.current, anchorRef.current);
    anchorRef.current = null;
  }, [zoom]);

  useEffect(() => {
    const scroller = scrollRef.current;
    let gesture = null;
    const points = (event) => {
      const [a, b] = event.touches;
      return { distance: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY),
        x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 };
    };
    const start = (event) => {
      if (event.touches.length !== 2) return;
      const point = points(event);
      gesture = { distance: Math.max(1, point.distance), zoom: zoomRef.current };
      event.preventDefault();
    };
    const move = (event) => {
      if (!gesture || event.touches.length !== 2) return;
      event.preventDefault();
      const point = points(event);
      changeZoom(gesture.zoom * point.distance / gesture.distance, point.x, point.y);
    };
    const end = () => { gesture = null; };
    const wheel = (event) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      changeZoom(zoomRef.current * Math.exp(-event.deltaY * 0.01), event.clientX, event.clientY);
    };
    scroller.addEventListener('touchstart', start, { passive: false });
    scroller.addEventListener('touchmove', move, { passive: false });
    scroller.addEventListener('touchend', end);
    scroller.addEventListener('touchcancel', end);
    scroller.addEventListener('wheel', wheel, { passive: false });
    return () => {
      scroller.removeEventListener('touchstart', start);
      scroller.removeEventListener('touchmove', move);
      scroller.removeEventListener('touchend', end);
      scroller.removeEventListener('touchcancel', end);
      scroller.removeEventListener('wheel', wheel);
    };
  }, [changeZoom]);

  return <>
    <header dir={i18n.dir()} className="shrink-0 border-b border-border bg-card px-3 pb-2"
      style={{ paddingTop: 'max(8px, env(safe-area-inset-top))' }}>
      <div className="flex items-center justify-between gap-2">
        <Dialog.Title className="font-semibold">{t('pdf_reader.title')}</Dialog.Title>
        <Dialog.Close asChild><Button type="button" variant="ghost" className="min-h-11 gap-2" data-testid="pdf-reader-close">
          <X className="h-4 w-4" aria-hidden="true" />{t('pdf_reader.close')}
        </Button></Dialog.Close>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2" role="group" aria-label={t('pdf_reader.zoom')}>
        <Button type="button" variant="outline" className="h-11 w-11 p-0" disabled={zoom <= MIN_PDF_ZOOM}
          aria-label={t('pdf_reader.zoom_out')} data-testid="pdf-zoom-out" onClick={() => changeZoom(zoomRef.current - 0.25)}>
          <Minus className="h-4 w-4" aria-hidden="true" />
        </Button>
        <output className="min-w-14 text-center tabular-nums" dir="ltr" aria-label={t('pdf_reader.zoom')} data-testid="pdf-zoom-value">{Math.round(zoom * 100)}%</output>
        <Button type="button" variant="outline" className="h-11 w-11 p-0" disabled={zoom >= MAX_PDF_ZOOM}
          aria-label={t('pdf_reader.zoom_in')} data-testid="pdf-zoom-in" onClick={() => changeZoom(zoomRef.current + 0.25)}>
          <Plus className="h-4 w-4" aria-hidden="true" />
        </Button>
        <Button type="button" variant="outline" className="min-h-11" data-testid="pdf-fit-width" onClick={() => changeZoom(1)}>{t('pdf_reader.fit_width')}</Button>
      </div>
      <Dialog.Description className="mt-2 text-center text-sm text-muted-foreground">{t('pdf_reader.hint')}</Dialog.Description>
    </header>
    <div ref={scrollRef} dir="ltr" data-testid="pdf-reader-scroll" className="min-h-0 flex-1 overflow-auto bg-muted/20 p-2"
      style={{ touchAction: 'pan-x pan-y', overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch',
        paddingBottom: 'max(8px, env(safe-area-inset-bottom))', paddingLeft: 'max(8px, env(safe-area-inset-left))', paddingRight: 'max(8px, env(safe-area-inset-right))' }}>
      <PdfDocumentPages pdf={pdf} aspectRatio={aspectRatio} zoom={zoom} onRendered={onRendered} onError={onError} />
    </div>
  </>;
}

export default function PdfReadingMode({ pdf, aspectRatio, onRendered, onError }) {
  const [expanded, setExpanded] = useState(false);
  const { t } = useTranslation();
  return <Dialog.Root open={expanded} onOpenChange={setExpanded}>
    <Dialog.Trigger asChild><Button type="button" variant="outline" className="mb-3 min-h-11 w-full gap-2 sm:w-auto"
      data-testid="pdf-reader-open"><Maximize2 className="h-4 w-4" aria-hidden="true" />{t('pdf_reader.open')}</Button></Dialog.Trigger>
    {/* The inline first page must finish even below the fold; otherwise the
        loading indicator itself can keep it outside the observer's margin. */}
    {!expanded && <PdfDocumentPages pdf={pdf} aspectRatio={aspectRatio} eagerFirstPage onRendered={onRendered} onError={onError} />}
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-[199] bg-background" />
      <Dialog.Content className="fixed inset-0 z-[200] flex flex-col bg-background text-foreground"
        style={{ height: '100dvh', overflow: 'hidden' }} data-testid="pdf-reader-dialog">
        <ReadingPanel pdf={pdf} aspectRatio={aspectRatio} onRendered={onRendered} onError={onError} />
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
