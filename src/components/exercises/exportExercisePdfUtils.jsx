import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { measurePdfProtectedRanges, pdfPageSlices } from '@/lib/pdfPagination';

const stripHtml = (html) => {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .trim();
};

const sanitizeFilename = (value) => {
  if (!value) return 'exercise-summary';
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\u0590-\u05FF\u00C0-\u024F\s-]/gi, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 80) || 'exercise-summary';
};

const containsRTL = (...texts) => /[\u0590-\u05FF\u0600-\u06FF]/.test(texts.filter(Boolean).join(' '));

const getInstructionSteps = (exercise) => {
  if (exercise.detailed_steps?.length) return exercise.detailed_steps;
  if (exercise.steps?.length) {
    return exercise.steps.map((step, index) => ({
      step_number: index + 1,
      title: step.title,
      description: step.description,
    }));
  }
  return [];
};

const sectionHtml = (title, content) => {
  if (!content) return '';
  return `
    <div data-pdf-section style="margin-bottom:18px;">
      <div data-pdf-heading style="font-size:11px;font-weight:700;color:#1a3a34;letter-spacing:0.05em;margin-bottom:4px;">${title}</div>
      <div style="border-top:1px solid #b4dcd2;margin-bottom:8px;"></div>
      <div style="font-size:13px;color:#374151;white-space:pre-wrap;direction:inherit;unicode-bidi:plaintext;">${content}</div>
    </div>`;
};

const bulletListHtml = (title, items) => {
  if (!items?.length) return '';
  return `
    <div data-pdf-section style="margin-bottom:18px;">
      <div data-pdf-heading style="font-size:11px;font-weight:700;color:#1a3a34;letter-spacing:0.05em;margin-bottom:4px;">${title}</div>
      <div style="border-top:1px solid #b4dcd2;margin-bottom:8px;"></div>
      <ul style="margin:0;padding-inline-start:20px;font-size:13px;color:#374151;">
        ${items.map((item) => `<li style="margin-bottom:6px;direction:inherit;unicode-bidi:plaintext;">${item}</li>`).join('')}
      </ul>
    </div>`;
};

const buildExercisePdfHtml = ({ exercise, labels, language }) => {
  const steps = getInstructionSteps(exercise);
  const fallbackInstructionText = steps.length > 0
    ? steps.map((step, index) => `${index + 1}. ${step.title ? `${step.title}: ` : ''}${step.description || ''}`).join('\n\n')
    : labels.noInstructions;

  const instructionText = exercise.instructions?.trim() || fallbackInstructionText;
  const durationText = exercise.duration_options?.length
    ? exercise.duration_options.join(', ')
    : exercise.duration_minutes || null;

  const metadata = [
    exercise.category ? `${labels.category}: ${exercise.category}` : null,
    exercise.difficulty ? `${labels.difficulty}: ${exercise.difficulty}` : null,
    durationText ? `${labels.duration}: ${durationText} ${labels.minutes}` : null,
  ].filter(Boolean);

  const rtl = language === 'he' || containsRTL(
    exercise.title,
    exercise.description,
    exercise.instructions,
    ...(exercise.benefits || []),
    ...(exercise.tips || []),
  );

  const generatedDate = new Date().toLocaleDateString(language || undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const progressItems = [
    `${labels.timesCompleted}: ${exercise.completed_count || 0}`,
    `${labels.minutesPracticed}: ${exercise.total_time_practiced || 0}`,
    exercise.last_completed ? `${labels.lastPracticed}: ${new Date(exercise.last_completed).toLocaleDateString(language || undefined)}` : null,
  ].filter(Boolean);

  const stepList = steps.length > 0
    ? steps.map((step, index) => `${index + 1}. ${step.title ? `${step.title}: ` : ''}${step.description || ''}`).join('\n\n')
    : null;

  return `
    <div dir="${rtl ? 'rtl' : 'ltr'}" style="width:794px;background:#ffffff;color:#1f2937;font-family:Arial, 'Noto Sans Hebrew', 'Noto Sans', sans-serif;line-height:1.55;">
      <div style="background:#26a69a;color:#ffffff;padding:20px 24px;">
        <div style="font-size:22px;font-weight:700;margin-bottom:4px;direction:inherit;unicode-bidi:plaintext;">${stripHtml(exercise.title || labels.untitled)}</div>
        <div style="font-size:12px;opacity:0.92;direction:inherit;unicode-bidi:plaintext;">${labels.subtitle}</div>
        <div style="font-size:11px;opacity:0.82;margin-top:6px;direction:inherit;unicode-bidi:plaintext;">${labels.generatedOn}: ${generatedDate}</div>
      </div>
      <div style="padding:24px;">
        ${metadata.length ? sectionHtml(labels.details, metadata.join(' • ')) : ''}
        ${sectionHtml(labels.about, stripHtml([exercise.description, exercise.detailed_description].filter(Boolean).join('\n\n')))}
        ${sectionHtml(labels.instructions, stripHtml(instructionText))}
        ${stepList ? sectionHtml(labels.stepByStep, stripHtml(stepList)) : ''}
        ${bulletListHtml(labels.benefits, exercise.benefits || [])}
        ${bulletListHtml(labels.tips, exercise.tips || [])}
        ${bulletListHtml(labels.helpsWith, exercise.tags || [])}
        ${bulletListHtml(labels.progress, progressItems)}
      </div>
      <div data-pdf-footer style="padding:0 24px 20px;color:#6b7280;font-size:10px;border-top:1px solid #e5e7eb;direction:inherit;unicode-bidi:plaintext;">
        <div style="padding-top:12px;">${labels.footer}</div>
      </div>
    </div>`;
};

const captureAndSavePdf = async (htmlContent, filename) => {
  const container = document.createElement('div');
  container.style.cssText = [
    'position:fixed',
    'left:-9999px',
    'top:0',
    'width:794px',
    'background:#ffffff',
    'z-index:-1',
  ].join(';');
  container.innerHTML = htmlContent;
  document.body.appendChild(container);

  try {
    await document.fonts.ready;
    const protectedRanges = measurePdfProtectedRanges(container);
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    });

    const pdf = new jsPDF({ format: 'a4', unit: 'mm' });
    const pdfW = pdf.internal.pageSize.getWidth();
    const pdfH = pdf.internal.pageSize.getHeight();
    const scale = canvas.width / container.getBoundingClientRect().width;
    const mmPerPixel = pdfW / canvas.width;
    const margin = 24 * scale * mmPerPixel;
    const pageHeight = Math.floor((pdfH - margin * 2) / mmPerPixel);
    const ranges = protectedRanges.map(({ top, bottom }) => ({ top: Math.floor(top * scale), bottom: Math.ceil(bottom * scale) }));
    const pages = pdfPageSlices(canvas.height, pageHeight, ranges);
    pages.forEach(({ top, height }, index) => {
      if (index) pdf.addPage();
      const slice = document.createElement('canvas');
      slice.width = canvas.width;
      slice.height = height;
      const context = slice.getContext('2d');
      if (!context) throw new Error('Unable to prepare PDF page');
      context.drawImage(canvas, 0, top, canvas.width, height, 0, 0, canvas.width, height);
      pdf.addImage(slice.toDataURL('image/png'), 'PNG', 0, margin, pdfW, height * mmPerPixel);
    });

    pdf.save(filename);
  } finally {
    document.body.removeChild(container);
  }
};

export const exportExercisePdf = async ({ exercise, labels, language }) => {
  const html = buildExercisePdfHtml({ exercise, labels, language });
  const filename = `${sanitizeFilename(exercise.slug || exercise.title || labels.untitled)}.pdf`;
  await captureAndSavePdf(html, filename);
};