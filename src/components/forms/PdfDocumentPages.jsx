import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getPdfRenderGeometry } from './pdfReaderGeometry';

const releaseCanvas = (canvas) => {
  canvas.width = 0;
  canvas.height = 0;
  canvas.style.visibility = 'hidden';
};

function PdfPage({ pdf, number, width, pixelRatio, aspectRatio, eager, onRendered, onError }) {
  const holderRef = useRef(null);
  const [active, setActive] = useState(number === 1);
  const [ratio, setRatio] = useState(aspectRatio);
  const shouldRender = active || eager;
  const { t } = useTranslation();

  useLayoutEffect(() => {
    const holder = holderRef.current;
    const placeholder = document.createElement('canvas');
    placeholder.style.width = '100%';
    placeholder.style.height = '100%';
    placeholder.style.display = 'block';
    placeholder.setAttribute('aria-hidden', 'true');
    releaseCanvas(placeholder);
    holder.appendChild(placeholder);
    return () => holder.querySelectorAll('canvas').forEach(releaseCanvas);
  }, []);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') { setActive(true); return; }
    const observer = new IntersectionObserver(([entry]) => setActive(entry.isIntersecting), {
      rootMargin: '240px 0px',
    });
    observer.observe(holderRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const holder = holderRef.current;
    if (!shouldRender) {
      holder.querySelectorAll('canvas').forEach(releaseCanvas);
      holder.dataset.rendered = 'false';
      return;
    }
    if (!width) return;
    let disposed = false;
    let task;
    let canvas;
    let committed = false;
    holder.setAttribute('aria-busy', 'true');
    // Retain the previous bitmap during a gesture, then replace it with a fresh
    // PDF render. Never run two PDF.js tasks against the same canvas.
    const timer = window.setTimeout(async () => {
      try {
        const page = await pdf.getPage(number);
        if (disposed) return;
        const base = page.getViewport({ scale: 1 });
        setRatio(base.height / base.width);
        const geometry = getPdfRenderGeometry(base.width, base.height, width, pixelRatio);
        const viewport = page.getViewport({ scale: geometry.scale });
        canvas = document.createElement('canvas');
        canvas.width = geometry.pixelWidth;
        canvas.height = geometry.pixelHeight;
        canvas.style.cssText = 'display:block;width:100%;height:100%';
        canvas.setAttribute('aria-hidden', 'true');
        task = page.render({
          canvasContext: canvas.getContext('2d'),
          viewport,
          transform: [geometry.outputScale, 0, 0, geometry.outputScale, 0, 0],
        });
        await task.promise;
        if (disposed) return;
        holder.querySelectorAll('canvas').forEach(releaseCanvas);
        holder.replaceChildren(canvas);
        committed = true;
        holder.dataset.rendered = 'true';
        holder.dataset.renderWidth = String(width);
        holder.setAttribute('aria-busy', 'false');
        onRendered(number);
      } catch (error) {
        if (!disposed && error?.name !== 'RenderingCancelledException') onError(error);
      } finally {
        if (canvas && !committed) releaseCanvas(canvas);
      }
    }, 100);
    return () => {
      disposed = true;
      clearTimeout(timer);
      task?.cancel();
    };
  }, [pdf, number, width, pixelRatio, shouldRender, onRendered, onError]);

  return <div ref={holderRef} data-pdf-page={number} role="img"
    aria-label={t('pdf_reader.page', { page: number, count: pdf.numPages })}
    className="relative bg-white shadow-sm"
    style={{ width, height: width * ratio, marginBottom: 8 }} />;
}

export default function PdfDocumentPages({ pdf, aspectRatio, zoom = 1, eagerFirstPage = false, onRendered, onError }) {
  const measureRef = useRef(null);
  const [size, setSize] = useState({ width: 0, pixelRatio: 1 });
  useLayoutEffect(() => {
    const element = measureRef.current;
    const measure = () => {
      const width = element.clientWidth;
      const pixelRatio = (window.devicePixelRatio || 1) * (window.visualViewport?.scale || 1);
      setSize((previous) => previous.width === width && previous.pixelRatio === pixelRatio
        ? previous : { width, pixelRatio });
    };
    measure();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    observer?.observe(element);
    window.addEventListener('resize', measure);
    window.visualViewport?.addEventListener('resize', measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', measure);
      window.visualViewport?.removeEventListener('resize', measure);
    };
  }, []);

  return <div ref={measureRef} dir="ltr" className="w-full" data-testid="pdf-pages" data-zoom={zoom}>
    {Array.from({ length: pdf.numPages }, (_, index) => <PdfPage key={index + 1}
      pdf={pdf} number={index + 1} width={size.width * zoom} pixelRatio={size.pixelRatio}
      aspectRatio={aspectRatio} eager={eagerFirstPage && index === 0} onRendered={onRendered} onError={onError} />)}
  </div>;
}
