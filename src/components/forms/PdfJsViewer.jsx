/**
 * PdfJsViewer — renders a PDF file using PDF.js (canvas-based).
 *
 * Why PDF.js instead of <iframe>:
 *  - Android Chrome/WebView does not render PDFs inside iframes — it downloads
 *    them instead. PDF.js renders each page as an HTML <canvas>, which works on
 *    all platforms including installed Android PWAs.
 *
 * Worker configuration:
 *  - workerSrc is forced to the stable public worker path copied to
 *    /public/pdfjs/pdf.worker.min.js. This avoids runtime drift back to
 *    Vite asset URLs that can pick up the wrong MIME type on deployment.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import {
  createPdfJsWorkerDeploymentIssueKey,
  getPdfJsWorkerDeploymentIssue,
  loadPdfDocumentWithWorkerFallback,
} from './pdfJsViewerUtils';

const STABLE_PDF_WORKER_SRC = '/pdfjs/pdf.worker.min.js';

// Set worker to a stable public path served from /pdfjs/pdf.worker.min.js.
// This file is copied from node_modules at install/build time by
// scripts/copy-pdf-worker.cjs so it is always served as text/javascript,
// avoiding the application/octet-stream MIME mismatch that Base44 hosting
// applies to .mjs assets.
function enforceStablePdfWorkerSrc() {
  if (pdfjsLib.GlobalWorkerOptions.workerSrc !== STABLE_PDF_WORKER_SRC) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = STABLE_PDF_WORKER_SRC;
  }
  return pdfjsLib.GlobalWorkerOptions.workerSrc;
}

enforceStablePdfWorkerSrc();
console.log('[PDFJS_VERSION]', pdfjsLib.version || 'unknown');
console.log('[PDFJS_WORKER_URL]', enforceStablePdfWorkerSrc());

// ─── Build-version marker ──────────────────────────────────────────────────
// __PDF_VIEWER_BUILD__ is a build-time string injected by vite.config.js
// `define`. Logging it at mount confirms which Production bundle is running
// on Android (helps distinguish a stale cached build from the latest one).
/* global __PDF_VIEWER_BUILD__ */
/** @type {string} ISO timestamp set by vite.config.js define at build time */
const BUILD_MARKER =
  typeof __PDF_VIEWER_BUILD__ !== 'undefined'
    ? __PDF_VIEWER_BUILD__
    : 'dev';

const TEMP_ENABLE_PDF_WORKER_DEPLOYMENT_QA_SIGNAL =
  typeof import.meta !== 'undefined'
    ? import.meta.env?.VITE_ENABLE_TEMP_PDF_WORKER_DEPLOYMENT_QA_SIGNAL !== 'false'
    : true;

// ─── Internal helpers ──────────────────────────────────────────────────────

/** Pick canvas width: prefer container measurement, fall back to window width. */
function getContainerWidth(containerEl) {
  if (containerEl) {
    const w = containerEl.clientWidth;
    if (w > 0) return w;
  }
  return typeof window !== 'undefined' ? window.innerWidth : 800;
}

/** Render a single PDF page into a new <canvas> and append it to container. */
async function renderPage(page, containerEl, isFirst) {
  const containerWidth = getContainerWidth(containerEl);
  const baseViewport = page.getViewport({ scale: 1 });
  const scale = containerWidth / baseViewport.width;
  const scaledViewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  canvas.width = Math.floor(scaledViewport.width);
  canvas.height = Math.floor(scaledViewport.height);
  // Explicit CSS width makes canvas fluid on orientation change.
  canvas.style.width = '100%';
  canvas.style.display = 'block';
  if (!isFirst) {
    canvas.style.marginTop = '8px';
  }

  const ctx = canvas.getContext('2d');
  await page.render({ canvasContext: ctx, viewport: scaledViewport }).promise;
  containerEl.appendChild(canvas);
}

// ─── Component ─────────────────────────────────────────────────────────────

/**
 * @param {{ fileUrl: string|null }} props
 *   fileUrl — the fully-resolved PDF URL (static /forms/ path or signed HTTPS URL).
 *
 * Scrolling is delegated to the parent container (PdfViewer.jsx content area).
 * PdfJsViewer fills its container and does not create its own scroll context.
 */
export default function PdfJsViewer({ fileUrl }) {
  const { t } = useTranslation();
  const containerRef = useRef(null);
  const qaSignalDedupeRef = useRef(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [workerDeploymentIssue, setWorkerDeploymentIssue] = useState(null);

  const handleWorkerDeploymentIssue = useCallback((issue) => {
    if (!TEMP_ENABLE_PDF_WORKER_DEPLOYMENT_QA_SIGNAL || !issue) return;

    const dedupeKey = createPdfJsWorkerDeploymentIssueKey(issue);
    if (qaSignalDedupeRef.current.has(dedupeKey)) return;
    qaSignalDedupeRef.current.add(dedupeKey);

    const payload = {
      ...issue,
      build: BUILD_MARKER,
    };
    setWorkerDeploymentIssue(payload);
    console.error('[PDFJS_QA_DEPLOYMENT_SIGNAL]', {
      workerUrl: payload.workerUrl || null,
      contentType: payload.contentType || null,
      reason: payload.reason,
      build: payload.build,
    });
  }, []);

  const renderPdf = useCallback(async (url, signal) => {
    if (!url) return;

    const container = containerRef.current;
    if (!container) return;

    setIsLoading(true);
    setErrorMessage(null);
    container.innerHTML = '';
    const workerSrc = enforceStablePdfWorkerSrc();

    console.log('[PDFJS_LOAD_START]', {
      fileUrl: url,
      build: BUILD_MARKER,
      workerSrc,
      containerWidth: getContainerWidth(container),
    });

    try {
      console.log('[PDFJS_WORKER_URL]', workerSrc);
      const pdf = await loadPdfDocumentWithWorkerFallback({
        url,
        signal,
        workerSrc,
        getDocument: pdfjsLib.getDocument,
        onWorkerDeploymentIssue: handleWorkerDeploymentIssue,
        logger: console,
      });
      if (signal.aborted) return;

      console.log('[PDFJS_DOCUMENT_LOADED]', { pageCount: pdf.numPages });

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        if (signal.aborted) return;
        const page = await pdf.getPage(pageNum);
        if (signal.aborted) return;
        await renderPage(page, container, pageNum === 1);
        if (pageNum === 1) {
          console.log('[PDFJS_FIRST_PAGE_RENDERED]');
          setIsLoading(false);
        }
      }

      if (pdf.numPages === 0) {
        setIsLoading(false);
      }
    } catch (err) {
      if (signal.aborted) return;
      console.error('[PDFJS_ERROR]', err);
      const issue = getPdfJsWorkerDeploymentIssue(err, {
        workerUrl: workerSrc,
      });
      if (issue) {
        handleWorkerDeploymentIssue(issue);
      }
      setErrorMessage(err?.message || 'Unknown PDF error');
      setIsLoading(false);
    }
  }, [handleWorkerDeploymentIssue]);

  useEffect(() => {
    if (!fileUrl) {
      setIsLoading(false);
      return;
    }

    const ac = new AbortController();
    renderPdf(fileUrl, ac.signal);
    return () => ac.abort();
  }, [fileUrl, renderPdf, retryCount]);

  // Re-render on resize / orientation change so canvas widths stay correct.
  useEffect(() => {
    if (!fileUrl) return;

    let debounceTimer = null;
    let debounceAc = null;

    const onResize = () => {
      clearTimeout(debounceTimer);
      if (debounceAc) debounceAc.abort();
      debounceAc = new AbortController();
      // Capture `debounceAc` into a local `ac` so the setTimeout closure holds
      // a stable reference even if a second resize fires and reassigns `debounceAc`
      // before the 200ms delay elapses.
      const ac = debounceAc;
      debounceTimer = setTimeout(() => {
        renderPdf(fileUrl, ac.signal);
      }, 200);
    };

    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      clearTimeout(debounceTimer);
      if (debounceAc) debounceAc.abort();
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, [fileUrl, renderPdf]);

  return (
    <div style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}>
      {TEMP_ENABLE_PDF_WORKER_DEPLOYMENT_QA_SIGNAL && workerDeploymentIssue && (
        <div
          role="status"
          data-testid="pdfjs-worker-deployment-qa-banner"
          style={{
            border: '1px solid #f59e0b',
            background: '#fffbeb',
            color: '#92400e',
            borderRadius: '8px',
            padding: '0.75rem',
            marginBottom: '0.75rem',
            fontSize: '0.875rem',
          }}
        >
          <p style={{ margin: 0, fontWeight: 600 }}>PDF viewer deployment issue</p>
          <p style={{ margin: '0.25rem 0 0 0' }}>
            {workerDeploymentIssue.reason === 'worker-dynamic-import-failure'
              ? 'PDF worker failed to load from the deployment asset URL. This is likely a platform deployment/config issue, not a worksheet content issue.'
              : 'PDF worker is served with invalid content-type. This is likely a platform deployment/config issue, not a worksheet content issue.'}
          </p>
          <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.75rem', opacity: 0.85 }}>
            worker: {workerDeploymentIssue.workerUrl || 'unknown'} | content-type:{' '}
            {workerDeploymentIssue.contentType || 'unknown'} | build:{' '}
            {workerDeploymentIssue.build || BUILD_MARKER}
          </p>
        </div>
      )}

      {isLoading && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            paddingTop: '4rem',
          }}
          aria-label={t('common.loading', 'Loading...')}
        >
          <Loader2
            className="h-7 w-7 animate-spin text-muted-foreground"
            aria-hidden="true"
          />
        </div>
      )}

      {!isLoading && errorMessage && (
        <div
          role="alert"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.75rem',
            paddingTop: '4rem',
            textAlign: 'center',
            color: 'hsl(var(--foreground))',
          }}
        >
          <p style={{ margin: 0 }}>
            {t('pdf_viewer.error_loading', 'Could not load the PDF.')}
          </p>
          <p
            data-testid="pdfjs-error-message"
            style={{ margin: 0, fontSize: '0.75rem', opacity: 0.75 }}
          >
            {t('pdf_ui.load_error')}
          </p>
          <Button type="button" variant="outline" onClick={() => setRetryCount((count) => count + 1)}>{t('common.retry')}</Button>
          {fileUrl && (
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: '0.875rem', textDecoration: 'underline' }}
            >
              {t('common.open_pdf_directly', 'Open PDF directly')}
            </a>
          )}
        </div>
      )}

      {/* Canvas pages are appended here by the render loop */}
      <div ref={containerRef} />
    </div>
  );
}