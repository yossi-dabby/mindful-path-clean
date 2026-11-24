// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  captured: null,
  canvas: vi.fn(),
  save: vi.fn(),
  html: '<article lang="he" dir="rtl"><p style="color:green" onclick="window.bad=1">שלום <strong>safe text</strong></p><img src="https://example.invalid/pixel" onerror="window.bad=1"><svg onload="window.bad=1"></svg><iframe src="https://example.invalid"></iframe><script>window.bad=1</script></article>',
}));
vi.mock('html2canvas', () => ({ default: state.canvas }));
vi.mock('jspdf', () => ({
  jsPDF: class {
    internal = { pageSize: { getWidth: () => 210, getHeight: () => 297 } };
    addImage() {}
    addPage() {}
    save = state.save;
  },
}));
vi.mock('../../src/components/i18n/i18nConfig', () => ({
  default: { t: key => key, resolvedLanguage: 'he', dir: () => 'rtl' },
}));
// Simulate even a future builder returning active markup: the final DOM sink
// must enforce the safety boundary independently of upstream HTML escaping.
vi.mock('../../src/components/journal/journalExportHtml', () => ({
  buildThoughtRecordHtml: () => state.html,
  buildSessionSummaryHtml: () => state.html,
}));
import { exportThoughtRecordPdf, exportSessionSummaryPdf } from '../../src/components/journal/exportPdfUtils.jsx';

beforeEach(() => {
  document.body.innerHTML = '';
  state.save.mockReset();
  state.canvas.mockReset().mockImplementation(async element => {
    state.captured = element.cloneNode(true);
    expect(element.isConnected).toBe(true);
    return { width: 1588, height: 1200, toDataURL: () => 'data:image/png;base64,test' };
  });
});

describe('journal PDF final DOM boundary', () => {
  it.each([['thought', exportThoughtRecordPdf], ['summary', exportSessionSummaryPdf]])(
    'sanitizes the %s PDF before capture while preserving Hebrew, RTL and formatting',
    async (_name, exportPdf) => {
      await exportPdf({ created_date: '2026-11-24T12:00:00Z' });
      expect(state.captured.querySelector('script,img,svg,iframe')).toBeNull();
      expect(state.captured.querySelector('[onclick],[onerror],[onload]')).toBeNull();
      expect(state.captured.textContent).toContain('שלום safe text');
      expect(state.captured.querySelector('article').dir).toBe('rtl');
      expect(state.captured.querySelector('strong').textContent).toBe('safe text');
      expect(state.captured.querySelector('p').style.color).toBe('green');
      expect(state.save).toHaveBeenCalledOnce();
      expect(document.body.childElementCount).toBe(0);
    }
  );

  it('removes the temporary node when PDF capture fails', async () => {
    state.canvas.mockRejectedValueOnce(new Error('synthetic canvas failure'));
    await expect(exportThoughtRecordPdf({ created_date: '2026-11-24T12:00:00Z' })).rejects.toThrow('synthetic canvas failure');
    expect(document.body.childElementCount).toBe(0);
    expect(state.save).not.toHaveBeenCalled();
  });
});
