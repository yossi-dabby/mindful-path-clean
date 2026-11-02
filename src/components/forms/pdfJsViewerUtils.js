export function isValidPdfJsWorkerContentType(contentType = '') {
  return (
    contentType.includes('javascript') ||
    contentType.includes('ecmascript') ||
    contentType.includes('text/plain')
  );
}

export function isPdfJsWorkerRelatedError(error) {
  const message = error?.message || String(error);
  return /worker|dynamically imported module|fake worker/i.test(message);
}

export function parseWorkerContentTypeFromMessage(message = '') {
  const match = message.match(/wrong content-type "([^"]+)"/i);
  return match ? match[1] : null;
}

export function getPdfJsWorkerDeploymentIssue(error, { workerUrl } = {}) {
  const message = error?.message || String(error);
  const code = error?.code || '';
  const contentType =
    error?.contentType ||
    parseWorkerContentTypeFromMessage(message) ||
    null;

  const isInvalidContentType =
    code === 'PDFJS_WORKER_INVALID_CONTENT_TYPE' ||
    /wrong MIME type|wrong content-type/i.test(message);
  const isDynamicImportFailure = /failed to fetch dynamically imported module/i.test(
    message
  );

  if (!isInvalidContentType && !isDynamicImportFailure) {
    return null;
  }

  return {
    reason: isInvalidContentType
      ? 'invalid-worker-content-type'
      : 'worker-dynamic-import-failure',
    message,
    workerUrl: error?.workerUrl || workerUrl || null,
    contentType,
  };
}

export function createPdfJsWorkerDeploymentIssueKey(issue = {}) {
  return JSON.stringify({
    workerUrl: issue.workerUrl || 'unknown',
    reason: issue.reason || 'unknown',
  });
}

export async function validateWorkerUrl(
  workerUrl,
  signal,
  { fetchImpl = fetch, logger = console } = {}
) {
  logger.log('[PDFJS_WORKER_FETCH_TEST_START]', { workerUrl });

  try {
    const response = await fetchImpl(workerUrl, {
      method: 'GET',
      cache: 'no-store',
      signal,
    });

    if (!response.ok) {
      throw new Error(`Worker fetch returned HTTP ${response.status}`);
    }

    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/octet-stream')) {
      const error = new Error(
        'PDF.js worker is not served as JavaScript. Base44 is serving the worker with the wrong MIME type.'
      );
      error.code = 'PDFJS_WORKER_INVALID_CONTENT_TYPE';
      error.workerUrl = workerUrl;
      error.contentType = contentType;
      throw error;
    }

    if (!isValidPdfJsWorkerContentType(contentType)) {
      const error = new Error(
        `Worker URL returned wrong content-type "${contentType}" — likely served as HTML or SPA catch-all`
      );
      error.code = 'PDFJS_WORKER_INVALID_CONTENT_TYPE';
      error.workerUrl = workerUrl;
      error.contentType = contentType;
      throw error;
    }

    logger.log('[PDFJS_WORKER_FETCH_TEST_OK]', {
      workerUrl,
      status: response.status,
      contentType,
    });
  } catch (error) {
    logger.error('[PDFJS_WORKER_FETCH_TEST_FAILED]', {
      workerUrl,
      reason: error?.message || String(error),
    });
    throw error;
  }
}

/**
 * Pre-validates that a PDF URL actually serves a PDF file and not an HTML
 * SPA catch-all page. Uses a Range request to read only the first 5 bytes,
 * keeping the probe lightweight.
 *
 * Throws when the response definitively proves the URL is not a PDF
 * (e.g., Content-Type: text/html, or first bytes are not "%PDF").
 *
 * On network / CORS / timeout errors during the probe, logs a warning and
 * returns without throwing — the real PDF.js getDocument call will surface
 * the correct error in those cases.
 */
export async function validatePdfUrl(
  pdfUrl,
  signal,
  { fetchImpl = fetch, logger = console } = {}
) {
  logger.log('[PDFJS_PDF_FETCH_TEST_START]', { pdfUrl });
  try {
    const response = await fetchImpl(pdfUrl, {
      method: 'GET',
      headers: { Range: 'bytes=0-4' },
      cache: 'no-store',
      signal,
    });

    // Accept 200 (server ignores Range) or 206 (partial content).
    if (!response.ok) {
      logger.warn('[PDFJS_PDF_FETCH_TEST_FAILED]', {
        pdfUrl,
        status: response.status,
        reason: `HTTP ${response.status}`,
      });
      return; // Non-blocking: let PDF.js produce the authoritative load error.
    }

    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('text/html')) {
      logger.error('[PDF_BYTES_NOT_PDF]', {
        pdfUrl,
        contentType,
        reason: 'Response has HTML content-type — likely SPA catch-all',
      });
      throw new Error(
        `PDF URL returned wrong content-type "${contentType}" — URL is serving an HTML page instead of a PDF file`
      );
    }

    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer).slice(0, 5);
    const firstFive = String.fromCharCode(...bytes);

    if (!firstFive.startsWith('%PDF')) {
      logger.error('[PDF_BYTES_NOT_PDF]', {
        pdfUrl,
        contentType,
        firstFive,
        reason: 'First bytes are not %PDF — response may be an HTML page',
      });
      throw new Error(
        `PDF URL did not return a valid PDF file (first bytes: "${firstFive}") — may be serving an HTML page`
      );
    }

    logger.log('[PDFJS_PDF_FETCH_TEST_OK]', {
      pdfUrl,
      status: response.status,
      contentType,
      firstFive,
    });
  } catch (error) {
    if (signal?.aborted || error.name === 'AbortError') return;
    // Re-throw definitive content errors (HTML or non-PDF bytes).
    if (
      error.message.includes('wrong content-type') ||
      error.message.includes('did not return a valid PDF')
    ) {
      throw error;
    }
    // Network / CORS / timeout errors: log but do not block the actual load.
    logger.warn('[PDFJS_PDF_FETCH_TEST_FAILED]', {
      pdfUrl,
      reason: error?.message || String(error),
    });
  }
}

export async function loadPdfDocumentWithWorkerFallback({
  url,
  signal,
  workerSrc,
  getDocument,
  validateWorker = validateWorkerUrl,
  validatePdf = validatePdfUrl,
  onWorkerDeploymentIssue,
  logger = console,
}) {
  // Pre-validate the PDF URL. Throws if the URL definitively returns non-PDF
  // content (e.g. an HTML SPA catch-all). On network errors, logs and continues
  // so that PDF.js can produce the authoritative error message.
  await validatePdf(url, signal, { logger });

  const loadDocument = async (options) => {
    const loadingTask = getDocument(options);

    let abortHandler = null;
    if (signal) {
      abortHandler = () => loadingTask.destroy();
      signal.addEventListener('abort', abortHandler, { once: true });
    }

    try {
      return await loadingTask.promise;
    } finally {
      if (signal && abortHandler) {
        signal.removeEventListener('abort', abortHandler);
      }
    }
  };

  try {
    await validateWorker(workerSrc, signal, { logger });
    return await loadDocument({ url });
  } catch (error) {
    const deploymentIssue = getPdfJsWorkerDeploymentIssue(error, {
      workerUrl: workerSrc,
    });
    if (deploymentIssue && onWorkerDeploymentIssue) {
      onWorkerDeploymentIssue(deploymentIssue);
    }

    if (!isPdfJsWorkerRelatedError(error)) {
      throw error;
    }

    logger.warn('[PDFJS_WORKER_RETRY_DISABLE_WORKER]', {
      fileUrl: url,
      reason: error?.message || String(error),
    });

    return await loadDocument({ url, disableWorker: true });
  }
}
