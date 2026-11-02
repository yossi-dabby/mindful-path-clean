import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Generates a safe downloadable therapeutic PDF from structured text content.
 *
 * INPUT (JSON body)
 * -----------------
 * {
 *   title:                string,   // REQUIRED — document title
 *   sections:             Array<{   // REQUIRED — at least one section
 *     heading?: string,             // OPTIONAL section heading
 *     body:     string,             // REQUIRED section body text
 *   }>,
 *   therapeutic_purpose?: string,   // OPTIONAL — e.g. "cbt_thought_record"
 * }
 *
 * SAFETY RULES
 * ------------
 * - Input is plain structured text only — no raw HTML, no Markdown rendering.
 * - All string fields are length-limited before use.
 * - Title and body content are sanitized to prevent injection into the PDF.
 * - Output file is private to the authenticated user (uploaded via Base44 UploadFile).
 * - No user PII is written to the file beyond what the caller provides.
 * - The function does not read, access, or index any user entity data.
 *
 * OUTPUT
 * ------
 * {
 *   success:              true,
 *   file_url:             string,  // Base44 hosted PDF URL
 *   name:                 string,  // File name (e.g. "thought-record-2025-04-27.pdf")
 *   title:                string,
 *   therapeutic_purpose?: string,
 *   created_at:           string,  // ISO timestamp
 * }
 * On failure: { success: false, error: string }
 */

// ─── Constants ────────────────────────────────────────────────────────────────

const TITLE_MAX_LENGTH = 120;
const HEADING_MAX_LENGTH = 120;
const BODY_MAX_LENGTH = 2000;
const MAX_SECTIONS = 10;
const THERAPEUTIC_PURPOSE_MAX_LENGTH = 80;

// Allowed therapeutic_purpose slugs — prevents freeform injection into file metadata.
const ALLOWED_THERAPEUTIC_PURPOSES = new Set([
  'cbt_thought_record',
  'session_summary',
  'weekly_practice_plan',
  'grounding_exercise',
  'personalized_homework',
  'relapse_prevention_coping_plan',
  'mood_reflection_worksheet',
]);

// ─── Input sanitization ───────────────────────────────────────────────────────

/** Strip control characters and trim a string to a maximum length. */
function sanitizeText(value: unknown, maxLen: number): string {
  if (typeof value !== 'string') return '';
  // Remove control characters (except standard whitespace: \n, \r, \t)
  return value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim().slice(0, maxLen);
}

/** Validate and sanitize the therapeutic_purpose slug. */
function sanitizePurpose(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const cleaned = value.trim().toLowerCase().slice(0, THERAPEUTIC_PURPOSE_MAX_LENGTH);
  return ALLOWED_THERAPEUTIC_PURPOSES.has(cleaned) ? cleaned : undefined;
}

// ─── Minimal PDF builder ─────────────────────────────────────────────────────
//
// Builds a valid PDF 1.4 file from structured plain-text content.
// No external dependencies — the PDF structure is constructed manually.
//
// Limitations (acceptable for therapeutic worksheets):
//   - Font: PDF built-in Helvetica (no embedding, ASCII-only display)
//   - Page size: A4 (595 x 842 pt)
//   - Layout: single column, text wrapping is manual line-break only
//   - No images, no colour, no complex layout
//
// This approach avoids npm package dependencies in the Deno runtime and
// eliminates any code-injection surface from external library parsing.

const PAGE_WIDTH = 595;    // A4 width in points
const PAGE_HEIGHT = 842;   // A4 height in points
const MARGIN = 60;         // Page margin in points
const TEXT_WIDTH = PAGE_WIDTH - MARGIN * 2;  // Usable text width

const TITLE_FONT_SIZE = 18;
const HEADING_FONT_SIZE = 13;
const BODY_FONT_SIZE = 11;
const LINE_HEIGHT_MULTIPLIER = 1.4;

/** Rough character-per-line estimate for Helvetica at a given font size. */
function charsPerLine(fontSize: number): number {
  // Helvetica average character width ≈ 0.55 * fontSize
  return Math.floor(TEXT_WIDTH / (fontSize * 0.55));
}

/** Wrap a paragraph of text into individual lines no longer than maxChars. */
function wrapText(text: string, maxChars: number): string[] {
  const lines: string[] = [];
  for (const rawLine of text.split('\n')) {
    const trimmed = rawLine.trim();
    if (!trimmed) { lines.push(''); continue; }
    const words = trimmed.split(' ');
    let current = '';
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (candidate.length <= maxChars) {
        current = candidate;
      } else {
        if (current) lines.push(current);
        // Hard-wrap a single word that exceeds the line width
        if (word.length > maxChars) {
          let remaining = word;
          while (remaining.length > maxChars) {
            lines.push(remaining.slice(0, maxChars));
            remaining = remaining.slice(maxChars);
          }
          current = remaining;
        } else {
          current = word;
        }
      }
    }
    if (current) lines.push(current);
  }
  return lines;
}

/** Escape a string for use as a PDF text string literal (parentheses syntax). */
function escapePdfString(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

interface PdfSection {
  heading?: string;
  body: string;
}

interface PdfPage {
  streamLines: string[];   // BT…ET content stream lines for text
  streamLength: number;    // byte length of the stream
}

/**
 * Build a complete PDF document from structured content.
 * Returns a Uint8Array of the raw PDF bytes.
 */
function buildPdf(title: string, sections: PdfSection[], dateStr: string): Uint8Array {
  const encoder = new TextEncoder();

  // We collect cross-reference offsets as we write each object.
  const offsets: number[] = [];
  const parts: Uint8Array[] = [];
  let byteOffset = 0;

  function write(s: string): void {
    const bytes = encoder.encode(s);
    parts.push(bytes);
    byteOffset += bytes.length;
  }

  // ── Header ────────────────────────────────────────────────────────────────
  write('%PDF-1.4\n');

  // ── Build page content ────────────────────────────────────────────────────
  // We collect all lines to render, then paginate them.

  interface TextLine {
    text: string;
    fontSize: number;
    bold: boolean;
    spaceBefore: number;  // extra vertical space before this line (points)
  }

  const textLines: TextLine[] = [];

  // Date header (small, top of document)
  textLines.push({ text: dateStr, fontSize: 9, bold: false, spaceBefore: 0 });
  // Title
  textLines.push({ text: title, fontSize: TITLE_FONT_SIZE, bold: true, spaceBefore: 12 });
  // Divider (represented as blank space)
  textLines.push({ text: '', fontSize: BODY_FONT_SIZE, bold: false, spaceBefore: 6 });

  for (const section of sections) {
    if (section.heading) {
      textLines.push({ text: section.heading, fontSize: HEADING_FONT_SIZE, bold: true, spaceBefore: 14 });
    }
    const wrapped = wrapText(section.body, charsPerLine(BODY_FONT_SIZE));
    for (let i = 0; i < wrapped.length; i++) {
      textLines.push({ text: wrapped[i], fontSize: BODY_FONT_SIZE, bold: false, spaceBefore: i === 0 ? 4 : 0 });
    }
    // Blank line between sections
    textLines.push({ text: '', fontSize: BODY_FONT_SIZE, bold: false, spaceBefore: 0 });
  }

  // ── Paginate ───────────────────────────────────────────────────────────────
  const pages: PdfPage[] = [];
  let currentStreamLines: string[] = [];
  let y = PAGE_HEIGHT - MARGIN;

  function flushPage(): void {
    const stream = currentStreamLines.join('\n');
    const streamBytes = encoder.encode(stream);
    pages.push({ streamLines: currentStreamLines, streamLength: streamBytes.length });
    currentStreamLines = [];
    y = PAGE_HEIGHT - MARGIN;
  }

  for (const line of textLines) {
    const lineHeight = line.fontSize * LINE_HEIGHT_MULTIPLIER + line.spaceBefore;
    if (y - lineHeight < MARGIN && currentStreamLines.length > 0) {
      flushPage();
    }
    y -= line.spaceBefore;
    const font = line.bold ? '/F2' : '/F1';  // F2 = Helvetica-Bold, F1 = Helvetica
    const safeText = escapePdfString(line.text);
    currentStreamLines.push(`BT`);
    currentStreamLines.push(`  ${font} ${line.fontSize} Tf`);
    currentStreamLines.push(`  ${MARGIN} ${Math.round(y - line.fontSize)} Td`);
    currentStreamLines.push(`  (${safeText}) Tj`);
    currentStreamLines.push(`ET`);
    y -= line.fontSize * LINE_HEIGHT_MULTIPLIER;
  }
  if (currentStreamLines.length > 0) flushPage();

  // ── Catalog: object 1 ─────────────────────────────────────────────────────
  // Object layout:
  //   1: Catalog
  //   2: Pages
  //   3 + 2*i: Page i
  //   4 + 2*i: Content stream for page i
  //   last-1: Font F1 (Helvetica)
  //   last:   Font F2 (Helvetica-Bold)

  const pageCount = pages.length;
  const pageObjBase = 3;           // first page object number
  const fontF1ObjNum = pageObjBase + pageCount * 2;
  const fontF2ObjNum = fontF1ObjNum + 1;
  const totalObjects = fontF2ObjNum;

  // Object 1: Catalog
  offsets[1] = byteOffset;
  write(`1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`);

  // Object 2: Pages dictionary
  const kidsEntries = Array.from({ length: pageCount }, (_, i) =>
    `${pageObjBase + i * 2} 0 R`
  ).join(' ');
  offsets[2] = byteOffset;
  write(
    `2 0 obj\n<< /Type /Pages /Kids [${kidsEntries}] /Count ${pageCount} >>\nendobj\n`
  );

  // Objects 3+: pages and content streams
  for (let i = 0; i < pageCount; i++) {
    const pageObjNum = pageObjBase + i * 2;
    const contentObjNum = pageObjBase + i * 2 + 1;

    offsets[pageObjNum] = byteOffset;
    write(
      `${pageObjNum} 0 obj\n` +
      `<< /Type /Page /Parent 2 0 R ` +
      `/MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] ` +
      `/Contents ${contentObjNum} 0 R ` +
      `/Resources << /Font << /F1 ${fontF1ObjNum} 0 R /F2 ${fontF2ObjNum} 0 R >> >> >>\n` +
      `endobj\n`
    );

    const streamContent = pages[i].streamLines.join('\n');
    const streamBytes = encoder.encode(streamContent);
    offsets[contentObjNum] = byteOffset;
    write(`${contentObjNum} 0 obj\n<< /Length ${streamBytes.length} >>\nstream\n`);
    parts.push(streamBytes);
    byteOffset += streamBytes.length;
    write(`\nendstream\nendobj\n`);
  }

  // Font objects
  offsets[fontF1ObjNum] = byteOffset;
  write(
    `${fontF1ObjNum} 0 obj\n` +
    `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\n` +
    `endobj\n`
  );

  offsets[fontF2ObjNum] = byteOffset;
  write(
    `${fontF2ObjNum} 0 obj\n` +
    `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\n` +
    `endobj\n`
  );

  // ── Cross-reference table ──────────────────────────────────────────────────
  const xrefOffset = byteOffset;
  write(`xref\n0 ${totalObjects + 1}\n`);
  write(`0000000000 65535 f \n`);
  for (let n = 1; n <= totalObjects; n++) {
    const off = (offsets[n] ?? 0).toString().padStart(10, '0');
    write(`${off} 00000 n \n`);
  }

  // ── Trailer ───────────────────────────────────────────────────────────────
  write(
    `trailer\n<< /Size ${totalObjects + 1} /Root 1 0 R >>\n` +
    `startxref\n${xrefOffset}\n%%EOF\n`
  );

  // ── Assemble final bytes ──────────────────────────────────────────────────
  const totalLength = parts.reduce((sum, p) => sum + p.length, 0);
  const result = new Uint8Array(totalLength);
  let pos = 0;
  for (const part of parts) {
    result.set(part, pos);
    pos += part.length;
  }
  return result;
}

// ─── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    let rawInput: Record<string, unknown>;
    try {
      rawInput = await req.json();
    } catch (_) {
      return Response.json({ success: false, error: 'Invalid JSON body.' }, { status: 400 });
    }

    // ── Validate and sanitize input ───────────────────────────────────────────
    const title = sanitizeText(rawInput.title, TITLE_MAX_LENGTH);
    if (!title) {
      return Response.json({ success: false, error: 'title is required.' }, { status: 400 });
    }

    if (!Array.isArray(rawInput.sections) || rawInput.sections.length === 0) {
      return Response.json({ success: false, error: 'sections must be a non-empty array.' }, { status: 400 });
    }

    const sections: Array<{ heading?: string; body: string }> = [];
    for (const raw of rawInput.sections.slice(0, MAX_SECTIONS)) {
      if (typeof raw !== 'object' || raw === null) continue;
      const s = raw as Record<string, unknown>;
      const body = sanitizeText(s.body, BODY_MAX_LENGTH);
      if (!body) continue;
      const heading = s.heading ? sanitizeText(s.heading, HEADING_MAX_LENGTH) : undefined;
      sections.push({ heading: heading || undefined, body });
    }

    if (sections.length === 0) {
      return Response.json({ success: false, error: 'No valid sections provided.' }, { status: 400 });
    }

    const therapeuticPurpose = sanitizePurpose(rawInput.therapeutic_purpose);

    // ── Generate PDF ──────────────────────────────────────────────────────────
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);  // YYYY-MM-DD
    const pdfBytes = buildPdf(title, sections, dateStr);

    // ── Build safe file name ───────────────────────────────────────────────────
    const slugBase = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40);
    const fileName = `${slugBase || 'worksheet'}-${dateStr}.pdf`;

    // ── Upload to Base44 storage ───────────────────────────────────────────────
    const file = new File([pdfBytes], fileName, { type: 'application/pdf' });
    const uploadResult = await base44.integrations.Core.UploadFile({ file });

    if (!uploadResult?.file_url) {
      return Response.json({ success: false, error: 'File upload failed.' }, { status: 500 });
    }

    return Response.json({
      success: true,
      file_url: uploadResult.file_url,
      name: fileName,
      title,
      therapeutic_purpose: therapeuticPurpose,
      created_at: now.toISOString(),
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[generateTherapeuticPdf] Failed:', message);
    return Response.json({ success: false, error: message }, { status: 500 });
  }
});
