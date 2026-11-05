import { describe, expect, it } from 'vitest';
import { clampPdfZoom, getPdfRenderGeometry, MAX_CANVAS_PIXELS, MAX_CANVAS_SIDE,
  capturePdfAnchor, restorePdfAnchor } from '../../src/components/forms/pdfReaderGeometry';

describe('PDF canvas backing resolution', () => {
  it.each([1, 2, 2.75, 3])('matches a %sx display without enlarging the CSS page', (dpr) => {
    const result = getPdfRenderGeometry(595, 842, 308, dpr);
    expect(result.width).toBe(308);
    expect(result.height).toBeCloseTo(435.85, 1);
    expect(result.pixelWidth).toBe(Math.floor(308 * dpr));
    expect(result.pixelHeight).toBe(Math.floor(result.height * dpr));
    expect(result.outputScale).toBe(dpr);
  });

  it.each([[1200, 3], [3600, 3], [20000, 4], [308, 100]])('bounds bitmap memory at width %s / DPR %s', (width, dpr) => {
    const result = getPdfRenderGeometry(595, 842, width, dpr);
    expect(result.width).toBe(width);
    expect(result.pixelWidth * result.pixelHeight).toBeLessThanOrEqual(MAX_CANVAS_PIXELS);
    expect(Math.max(result.pixelWidth, result.pixelHeight)).toBeLessThanOrEqual(MAX_CANVAS_SIDE);
    expect(result.outputScale).toBeLessThanOrEqual(dpr);
  });

  it('handles very tall pages and transient zero-sized containers', () => {
    for (const input of [[0, 0, 0, 0], [NaN, Infinity, -3, NaN], [300, 10000, 600, 3]]) {
      const result = getPdfRenderGeometry(...input);
      expect(result.pixelWidth).toBeGreaterThan(0);
      expect(result.pixelHeight).toBeGreaterThan(0);
      expect(result.pixelWidth * result.pixelHeight).toBeLessThanOrEqual(MAX_CANVAS_PIXELS);
      expect(Math.max(result.pixelWidth, result.pixelHeight)).toBeLessThanOrEqual(MAX_CANVAS_SIDE);
    }
  });

  it('renders additional source detail when the reader zooms in', () => {
    const fit = getPdfRenderGeometry(595, 842, 374, 2.75);
    const zoomed = getPdfRenderGeometry(595, 842, 748, 2.75);
    expect(zoomed.scale).toBe(fit.scale * 2);
    expect(zoomed.pixelWidth).toBe(fit.pixelWidth * 2 + 1);
    expect(zoomed.outputScale).toBe(2.75);
  });
});

describe('PDF reading gestures', () => {
  it('limits zoom to fit width through 300%', () => {
    expect([0, -1, 0.5, 1, 1.25, 3, 5, NaN].map(clampPdfZoom)).toEqual([1, 1, 1, 1, 1.25, 3, 3, 1]);
  });

  it('keeps a point on its page under the finger after zoom, independent of page gaps', () => {
    let rect = { left: 20, top: 100, width: 300, height: 450, bottom: 550 };
    const page = { isConnected: true, getBoundingClientRect: () => rect };
    const scroller = { scrollLeft: 0, scrollTop: 1100, querySelectorAll: () => [page] };
    const anchor = capturePdfAnchor(scroller, 170, 250);
    rect = { left: 20, top: 1200, width: 600, height: 900, bottom: 2100 };
    restorePdfAnchor(scroller, anchor);
    expect(scroller.scrollLeft).toBe(150);
    expect(scroller.scrollTop).toBe(2350);
  });

  it('ignores a page removed by closing or switching documents', () => {
    const scroller = { scrollLeft: 10, scrollTop: 20, querySelectorAll: () => [] };
    expect(capturePdfAnchor(scroller, 0, 0)).toBeNull();
    restorePdfAnchor(scroller, { element: { isConnected: false } });
    expect(scroller.scrollTop).toBe(20);
  });
});
