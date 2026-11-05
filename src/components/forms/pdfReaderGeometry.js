// Bound each canvas independently of CSS zoom. Off-screen pages release their
// backing stores; these limits also protect mobile WebViews at high zoom/DPR.
export const MAX_CANVAS_PIXELS = 8_000_000;
export const MAX_CANVAS_SIDE = 4096;
export const MIN_PDF_ZOOM = 1;
export const MAX_PDF_ZOOM = 3;

const positive = (value, fallback) => Number.isFinite(value) && value > 0 ? value : fallback;

export function clampPdfZoom(value) {
  return Math.min(MAX_PDF_ZOOM, Math.max(MIN_PDF_ZOOM, positive(value, 1)));
}

export function getPdfRenderGeometry(pageWidth, pageHeight, cssWidth, pixelRatio = 1) {
  const width = positive(cssWidth, 1);
  const scale = width / positive(pageWidth, 595);
  const height = positive(pageHeight, 842) * scale;
  const outputScale = Math.min(
    positive(pixelRatio, 1),
    Math.sqrt(MAX_CANVAS_PIXELS / (width * height)),
    MAX_CANVAS_SIDE / width,
    MAX_CANVAS_SIDE / height,
  );
  return {
    scale,
    width,
    height,
    outputScale,
    pixelWidth: Math.max(1, Math.floor(width * outputScale)),
    pixelHeight: Math.max(1, Math.floor(height * outputScale)),
  };
}

// An anchor is relative to one page, not the entire document: page gaps and
// different page sizes must not make a zoom jump to another paragraph.
export function capturePdfAnchor(scroller, clientX, clientY) {
  const pages = [...scroller.querySelectorAll('[data-pdf-page]')];
  const page = pages.reduce((nearest, candidate) => {
    const rect = candidate.getBoundingClientRect();
    const distance = Math.max(rect.top - clientY, clientY - rect.bottom, 0);
    return !nearest || distance < nearest.distance ? { element: candidate, rect, distance } : nearest;
  }, null);
  if (!page || !page.rect.width || !page.rect.height) return null;
  return {
    element: page.element,
    x: (clientX - page.rect.left) / page.rect.width,
    y: (clientY - page.rect.top) / page.rect.height,
    clientX,
    clientY,
  };
}

export function restorePdfAnchor(scroller, anchor) {
  if (!anchor?.element.isConnected) return;
  const rect = anchor.element.getBoundingClientRect();
  scroller.scrollLeft += rect.left + anchor.x * rect.width - anchor.clientX;
  scroller.scrollTop += rect.top + anchor.y * rect.height - anchor.clientY;
}
