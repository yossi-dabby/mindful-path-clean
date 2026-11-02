import { describe, expect, it } from 'vitest';
import { pdfPageSlices } from '../../src/lib/pdfPagination.js';

describe('exercise PDF page boundaries', () => {
  it('keeps a section heading with its first content line', () => {
    const pages = pdfPageSlices(1600, 1000, [{ top: 950, bottom: 1030 }]);
    expect(pages).toEqual([{ top: 0, height: 950 }, { top: 950, height: 650 }]);
  });
  it('does not split a rendered line and preserves all source pixels', () => {
    const ranges = Array.from({ length: 80 }, (_, n) => ({ top: n * 24 + 1, bottom: n * 24 + 21 }));
    const pages = pdfPageSlices(1920, 500, ranges);
    expect(pages.reduce((sum, page) => sum + page.height, 0)).toBe(1920);
    for (let n = 0; n < pages.length; n++) {
      expect(pages[n].height).toBeGreaterThan(0); expect(pages[n].height).toBeLessThanOrEqual(500);
      expect(pages[n].top).toBe(n ? pages[n-1].top + pages[n-1].height : 0);
      const end = pages[n].top + pages[n].height;
      expect(ranges.some((range) => range.top < end && range.bottom > end)).toBe(false);
    }
  });
  it('handles overlapping heading/line ranges without leaving an orphan', () => {
    expect(pdfPageSlices(1400, 1000, [{ top: 970, bottom: 1020 }, { top: 945, bottom: 980 }])[0].height).toBe(945);
  });
  it('makes progress for an oversized section and rejects invalid dimensions', () => {
    expect(pdfPageSlices(2100, 1000, [{ top: 0, bottom: 2000 }])).toHaveLength(3);
    expect(() => pdfPageSlices(10, 0)).toThrow('Invalid PDF dimensions');
  });
});
