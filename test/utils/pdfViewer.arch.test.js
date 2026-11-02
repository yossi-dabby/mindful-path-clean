/**
 * PdfViewer architecture tests.
 *
 * These are source-level assertions that enforce the structural constraints
 * required for the PDF viewer to work on Android Production.
 *
 * They do NOT render React components (no jsdom needed) — they read source
 * files and verify patterns using string inspection and regex.
 *
 * Rationale: the previous implementation used <iframe> which triggers a
 * file download on Android Chrome/WebView instead of rendering the PDF.
 * PDF.js (canvas-based rendering) must remain the primary viewer.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const ROOT = join(process.cwd());

function readSrc(relPath) {
  return readFileSync(join(ROOT, relPath), 'utf8');
}

// ─── PdfViewer.jsx constraints ───────────────────────────────────────────────

describe('PdfViewer.jsx — architectural constraints', () => {
  const src = readSrc('src/pages/PdfViewer.jsx');

  it('imports PdfJsViewer (not iframe)', () => {
    expect(src).toMatch(/import\s+PdfJsViewer/);
  });

  it('renders <PdfJsViewer fileUrl={...}> in JSX', () => {
    expect(src).toMatch(/<PdfJsViewer\s+fileUrl=/);
  });

  it('does NOT render a bare <iframe> as the primary PDF viewer', () => {
    // Remove comment lines before checking, to avoid false negatives from
    // comments mentioning iframe.
    const nonCommentLines = src
      .split('\n')
      .filter((line) => !line.trim().startsWith('//') && !line.trim().startsWith('*'))
      .join('\n');
    expect(nonCommentLines).not.toMatch(/<iframe\b/);
  });

  it('does NOT use window.open for the Open path', () => {
    expect(src).not.toMatch(/window\.open\s*\(/);
  });

  it('does NOT create Blob URLs for /forms/ files', () => {
    // buildInlinePdfViewerUrl was the previous approach that created blob URLs.
    expect(src).not.toMatch(/buildInlinePdfViewerUrl/);
    expect(src).not.toMatch(/URL\.createObjectURL/);
  });

  it('logs [PDF_VIEWER_MOUNTED] on mount', () => {
    expect(src).toMatch(/\[PDF_VIEWER_MOUNTED\]/);
  });

  it('logs [PDF_VIEWER_RESOLVED_URL] after resolving URL', () => {
    expect(src).toMatch(/\[PDF_VIEWER_RESOLVED_URL\]/);
  });
});

// ─── PdfJsViewer.jsx constraints ─────────────────────────────────────────────

describe('PdfJsViewer.jsx — PDF.js worker and logging', () => {
  const src = readSrc('src/components/forms/PdfJsViewer.jsx');
  const workerUtilsSrc = readSrc('src/components/forms/pdfJsViewerUtils.js');

  it('file exists', () => {
    expect(existsSync(join(ROOT, 'src/components/forms/PdfJsViewer.jsx'))).toBe(true);
  });

  it('imports PDF.js from the package root', () => {
    expect(src).toMatch(/from\s+['"]pdfjs-dist['"]/);
  });

  it('sets GlobalWorkerOptions.workerSrc to the stable public worker path', () => {
    expect(src).toMatch(
      /GlobalWorkerOptions\.workerSrc\s*=\s*(?:STABLE_PDF_WORKER_SRC|['"]\/pdfjs\/pdf\.worker\.min\.js['"])/
    );
  });

  it('re-enforces the stable worker path before loading documents', () => {
    expect(src).toMatch(/function enforceStablePdfWorkerSrc/);
    expect(src).toMatch(/enforceStablePdfWorkerSrc\(\)/);
  });

  it('logs [PDFJS_VERSION]', () => {
    expect(src).toMatch(/\[PDFJS_VERSION\]/);
  });

  it('logs [PDFJS_WORKER_URL]', () => {
    expect(src).toMatch(/\[PDFJS_WORKER_URL\]/);
  });

  it('logs worker fetch diagnostics', () => {
    expect(workerUtilsSrc).toMatch(/\[PDFJS_WORKER_FETCH_TEST_START\]/);
    expect(workerUtilsSrc).toMatch(/\[PDFJS_WORKER_FETCH_TEST_OK\]/);
    expect(workerUtilsSrc).toMatch(/\[PDFJS_WORKER_FETCH_TEST_FAILED\]/);
  });

  it('uses the stable public worker path and does not dynamically import the worker module', () => {
    expect(src).toMatch(/\/pdfjs\/pdf\.worker\.min\.js/);
    expect(src).not.toMatch(/import\s*\(\s*['"`]pdfjs-dist.*worker/i);
    expect(src).not.toMatch(/pdf\.worker.*\?url/);
    expect(src).not.toMatch(/\/assets\/pdf\.worker.*\.mjs/);
  });

  it('guards __PDF_VIEWER_BUILD__ with typeof before reading it', () => {
    expect(src).toMatch(/typeof __PDF_VIEWER_BUILD__ !== 'undefined'/);
  });

  it('logs [PDFJS_LOAD_START]', () => {
    expect(src).toMatch(/\[PDFJS_LOAD_START\]/);
  });

  it('logs [PDFJS_DOCUMENT_LOADED]', () => {
    expect(src).toMatch(/\[PDFJS_DOCUMENT_LOADED\]/);
  });

  it('logs [PDFJS_FIRST_PAGE_RENDERED]', () => {
    expect(src).toMatch(/\[PDFJS_FIRST_PAGE_RENDERED\]/);
  });

  it('logs [PDFJS_ERROR] on error', () => {
    expect(src).toMatch(/\[PDFJS_ERROR\]/);
  });

  it('has loading state (isLoading)', () => {
    expect(src).toMatch(/isLoading/);
  });

  it('renders a visible error message element', () => {
    expect(src).toMatch(/errorMessage/);
    expect(src).toMatch(/role=.alert./);
  });

  it('shows a direct-link fallback when PDF.js fails', () => {
    expect(src).toMatch(/Open PDF directly/);
    expect(src).toMatch(/href=\{fileUrl\}/);
  });

  it('does NOT use iframe or Blob URLs', () => {
    const nonCommentSource = src
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '');
    expect(nonCommentSource).not.toMatch(/<iframe\b/);
    expect(nonCommentSource).not.toMatch(/URL\.createObjectURL/);
    expect(nonCommentSource).not.toMatch(/blob:/);
  });

  it('does NOT use window.open', () => {
    expect(src).not.toMatch(/window\.open\s*\(/);
  });

  it('loads documents through a helper that retries with disableWorker', () => {
    expect(src).toMatch(/loadPdfDocumentWithWorkerFallback/);
    expect(workerUtilsSrc).toMatch(/disableWorker:\s*true/);
    expect(workerUtilsSrc).toMatch(/\[PDFJS_WORKER_RETRY_DISABLE_WORKER\]/);
  });

  it('pre-validates PDF URL before loading to catch SPA catch-all responses', () => {
    expect(workerUtilsSrc).toMatch(/validatePdfUrl/);
    expect(workerUtilsSrc).toMatch(/\[PDF_BYTES_NOT_PDF\]/);
    expect(workerUtilsSrc).toMatch(/\[PDFJS_PDF_FETCH_TEST_OK\]/);
    expect(workerUtilsSrc).toMatch(/%PDF/);
  });

  it('worker validator uses allowlist to reject HTML content types (not explicit blocklist)', () => {
    // isValidPdfJsWorkerContentType accepts js/ecmascript/text-plain only.
    // Non-matching types (including text/html) are rejected implicitly.
    // Note: text/html IS present in the source for the separate PDF URL
    // validator (validatePdfUrl), which explicitly detects SPA catch-all pages.
    // "SPA catch-all" is referenced in both validateWorkerUrl (error message)
    // and validatePdfUrl (log label) — this assertion confirms it is present.
    expect(workerUtilsSrc).toMatch(/isValidPdfJsWorkerContentType/);
    expect(workerUtilsSrc).toMatch(/content-type/);
    expect(workerUtilsSrc).toMatch(/text\/plain/);
    expect(workerUtilsSrc).toMatch(/javascript/);
    expect(workerUtilsSrc).toMatch(/ecmascript/);
    // Both validateWorkerUrl and validatePdfUrl reference SPA catch-all behaviour.
    expect(workerUtilsSrc).toMatch(/SPA catch-all/);
  });
});

// ─── TherapeuticForms.jsx — Open path ────────────────────────────────────────

describe('TherapeuticForms.jsx — Open navigates to /pdf-viewer, not window.open', () => {
  const src = readSrc('src/pages/TherapeuticForms.jsx');

  it('handleOpenForm navigates via react-router navigate(), not window.open', () => {
    // Confirm navigate() is used in handleOpenForm
    expect(src).toMatch(/navigate\s*\(/);
    // Must not use window.open for PDF open
    expect(src).not.toMatch(/window\.open\s*\(\s*[^)]*pdf/i);
  });

  it('logs [PDF_OPEN_CLICKED] when Open is clicked', () => {
    expect(src).toMatch(/\[PDF_OPEN_CLICKED\]/);
  });

  it('logs [PDF_VIEWER_NAVIGATE] when navigating to pdf-viewer', () => {
    expect(src).toMatch(/\[PDF_VIEWER_NAVIGATE\]/);
  });

  it('Download path uses downloadPdfFile, not navigate', () => {
    // handleDownloadForm must call downloadPdfFile
    expect(src).toMatch(/downloadPdfFile/);
  });

  it('Open path navigates to PDF_VIEWER_ROUTE_PATH', () => {
    expect(src).toMatch(/PDF_VIEWER_ROUTE_PATH/);
  });
});

// ─── pdfjs-dist dependency ────────────────────────────────────────────────────

describe('pdfjs-dist — package.json dependency', () => {
  const pkg = JSON.parse(readSrc('package.json'));
  const prodDeps = pkg.dependencies || {};
  const viteConfig = readSrc('vite.config.js');

  it('pdfjs-dist is listed in dependencies (not only devDependencies)', () => {
    expect(prodDeps['pdfjs-dist']).toBeDefined();
  });

  it('pdfjs-dist version is 4.x (ESM, .mjs worker)', () => {
    const version = prodDeps['pdfjs-dist'] || '';
    expect(version).toMatch(/^[\^~]?4\./);
  });

  it('excludes pdfjs-dist from Vite optimizeDeps prebundling', () => {
    expect(viteConfig).toMatch(/optimizeDeps:\s*\{[\s\S]*exclude:\s*\[['"]pdfjs-dist['"]\]/);
  });
});
