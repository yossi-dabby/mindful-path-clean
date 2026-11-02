import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

import i18n from '../i18n/i18nConfig';
import { buildThoughtRecordHtml, buildSessionSummaryHtml } from './journalExportHtml';

const exportContext = () => ({ t: i18n.t.bind(i18n), locale: i18n.resolvedLanguage || i18n.language || 'en', dir: i18n.dir(), generatedAt: new Date().toISOString() });

// ─── Core PDF capture engine ──────────────────────────────────────────────────
// Renders HTML to a hidden DOM node, captures via html2canvas, saves as PDF.
// This approach supports ALL Unicode scripts and RTL languages natively.

const captureAndSavePdf = async (htmlContent, filename) => {
  const container = document.createElement('div');
  container.style.cssText = [
    'position:fixed',
    'left:-9999px',
    'top:0',
    'width:794px',
    'background:#ffffff',
    'font-family:Arial,"Noto Sans Hebrew","Noto Sans",sans-serif',
    'font-size:14px',
    'line-height:1.5',
    'color:#222',
  ].join(';');
  container.innerHTML = htmlContent;
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    });

    const pdf = new jsPDF({ format: 'a4', unit: 'mm' });
    const pdfW = pdf.internal.pageSize.getWidth();   // 210mm
    const pdfH = pdf.internal.pageSize.getHeight();  // 297mm

    // canvas dimensions are at scale:2, convert back to logical pixels
    const logicalW = canvas.width / 2;
    const logicalH = canvas.height / 2;

    // mm per logical pixel
    const mmPerPx = pdfW / logicalW;
    const totalMmH = logicalH * mmPerPx;

    const imgData = canvas.toDataURL('image/png');

    if (totalMmH <= pdfH) {
      pdf.addImage(imgData, 'PNG', 0, 0, pdfW, totalMmH);
    } else {
      // Slice content across pages
      const totalPages = Math.ceil(totalMmH / pdfH);
      for (let page = 0; page < totalPages; page++) {
        if (page > 0) pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, -(page * pdfH), pdfW, totalMmH);
      }
    }

    pdf.save(filename);
  } finally {
    document.body.removeChild(container);
  }
};

// ─── Public API ───────────────────────────────────────────────────────────────

export const exportThoughtRecordPdf = async (entry) => {
  const html = buildThoughtRecordHtml(entry, exportContext());
  const filename = `thought-record-${new Date(entry.created_date).toISOString().split('T')[0]}.pdf`;
  await captureAndSavePdf(html, filename);
};

export const exportSessionSummaryPdf = async (summary) => {
  const html = buildSessionSummaryHtml(summary, exportContext());
  const filename = `session-summary-${new Date(summary.created_date).toISOString().split('T')[0]}.pdf`;
  await captureAndSavePdf(html, filename);
};