/**
 * worksheetOpenPopupFix.test.js
 *
 * Tests for the in-app same-tab worksheet Open behavior.
 *
 * Context: Open must navigate same-tab to /pdf-viewer (not open a popup or new tab).
 * This ensures the behavior works correctly in Android Chrome, installed PWA, and all
 * browsers without relying on popup/new-tab behavior.
 *
 *  1. All surfaces (GeneratedFileCard, TherapeuticForms, MessageBubble) navigate same-tab
 *     to the /pdf-viewer route with the file ref as a query param.
 *  2. Download remains a separate code path using downloadPdfFile.
 *  3. No window.open is used for the Open action.
 */

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

import { classifyWorksheetFileReference } from '../../src/components/chat/utils/worksheetFileResolver.js';
import { getFormOpenUrl, getFormDownloadUrl } from '../../src/components/chat/utils/formFileUrls.js';

const ROOT = path.resolve(process.cwd());

// ─── openFile — still present as a utility but no longer used by Open buttons ─

describe('openFile — source-code contracts (utility still present)', () => {
  const src = fs.readFileSync(`${ROOT}/src/components/chat/utils/openFile.js`, 'utf8');

  it('is not async — no async keyword', () => {
    expect(src).not.toMatch(/export\s+async\s+function\s+openFile/);
  });

  it('does not throw when window.open returns null', () => {
    expect(src).not.toContain('throw new Error');
  });

  it('still guards against falsy or non-string URL', () => {
    expect(src).toContain("typeof url !== 'string'");
  });
});

// ─── TherapeuticForms — same-tab navigate for all Open actions ────────────────

describe('TherapeuticForms — handleOpenForm navigates same-tab to /pdf-viewer', () => {
  const src = fs.readFileSync(`${ROOT}/src/pages/TherapeuticForms.jsx`, 'utf8');

  it('imports PDF_VIEWER_ROUTE_PATH for the viewer route', () => {
    expect(src).toContain('PDF_VIEWER_ROUTE_PATH');
  });

  it('uses navigate() for same-tab navigation — no window.open', () => {
    expect(src).toContain('navigate(');
    expect(src).not.toContain("window.open('', '_blank'");
  });

  it('does not call openFile — open is purely same-tab navigate', () => {
    expect(src).not.toContain('openFile(');
  });
});

// ─── GeneratedFileCard — same-tab navigate for Open action ───────────────────

describe('GeneratedFileCard — handleOpen navigates same-tab to /pdf-viewer', () => {
  const src = fs.readFileSync(`${ROOT}/src/components/chat/GeneratedFileCard.jsx`, 'utf8');

  it('imports PDF_VIEWER_ROUTE_PATH for the viewer route', () => {
    expect(src).toContain('PDF_VIEWER_ROUTE_PATH');
  });

  it('uses navigate() for same-tab navigation', () => {
    expect(src).toContain('navigate(');
  });

  it('does not call openFile or window.open for Open action', () => {
    expect(src).not.toContain('openFile(');
    expect(src).not.toContain("window.open('', '_blank'");
  });

  it('passes the file ref encoded in the pdf-viewer URL', () => {
    expect(src).toContain('encodeURIComponent(fileRef)');
  });
});

// ─── MessageBubble — same-tab navigate for PDF chips ─────────────────────────

describe('MessageBubble — handleAssistantPdfDownload navigates same-tab to /pdf-viewer', () => {
  const src = fs.readFileSync(`${ROOT}/src/components/chat/MessageBubble.jsx`, 'utf8');

  it('imports PDF_VIEWER_ROUTE_PATH for the viewer route', () => {
    expect(src).toContain('PDF_VIEWER_ROUTE_PATH');
  });

  it('uses navigate() for same-tab navigation — no window.open', () => {
    expect(src).toContain('navigate(');
    expect(src).not.toContain("window.open('', '_blank'");
  });

  it('does not call openFile', () => {
    expect(src).not.toContain('openFile(');
  });
});

// ─── /forms/ URL classification — never treated as raw UUID ──────────────────

describe('classifyWorksheetFileReference — /forms/ paths are static, never UUID', () => {
  const staticPaths = [
    '/forms/en/children/cbt-core/stage-01/children_cbt_core_en_module_01_emotions_and_body.pdf',
    '/forms/en/adolescents/cbt-core/series/adolescents-cbt-core-series-1-full-en.pdf',
    '/forms/he/children/cbt-core/stage-02/children_cbt_core_he_module_02.pdf',
  ];

  for (const filePath of staticPaths) {
    it(`classifies "${filePath.slice(0, 60)}..." as static_public_form_path`, () => {
      expect(classifyWorksheetFileReference(filePath)).toBe('static_public_form_path');
    });
  }

  it('classifies raw UUID as raw_uuid — never a static path', () => {
    expect(classifyWorksheetFileReference('550e8400-e29b-41d4-a716-446655440000')).toBe('raw_uuid');
  });

  it('a raw UUID is never passed as a /forms/ static path', () => {
    // Raw UUIDs must be rejected before reaching window.open with an unresolved value
    const uuid = '550e8400-e29b-41d4-a716-446655440000';
    expect(uuid.startsWith('/forms/')).toBe(false);
    expect(classifyWorksheetFileReference(uuid)).toBe('raw_uuid');
  });
});

// ─── formFileUrls — Open builds viewer URL; Download builds download URL ─────

describe('formFileUrls — Open and Download URL contracts for /forms/ paths', () => {
  const formsPath = '/forms/en/children/cbt-core/stage-01/children_cbt_core_en_module_01_emotions_and_body.pdf';

  it('getFormOpenUrl returns a viewer route with the forms path encoded', () => {
    const openUrl = getFormOpenUrl(formsPath);
    expect(openUrl).toContain('/pdf-viewer?file=');
    expect(openUrl).toContain(encodeURIComponent(formsPath));
  });

  it('getFormDownloadUrl returns the forms path with download=1', () => {
    const downloadUrl = getFormDownloadUrl(formsPath);
    expect(downloadUrl).toBe(`${formsPath}?download=1`);
  });

  it('getFormOpenUrl never returns null for a valid /forms/ path', () => {
    expect(getFormOpenUrl(formsPath)).not.toBeNull();
  });

  it('getFormDownloadUrl never returns null for a valid /forms/ path', () => {
    expect(getFormDownloadUrl(formsPath)).not.toBeNull();
  });
});

// ─── downloadPdfFile — same-origin /forms/ uses anchor download (no popup) ───

describe('downloadPdfFile — source contracts', () => {
  const src = fs.readFileSync(`${ROOT}/src/components/chat/utils/downloadPdfFile.js`, 'utf8');

  it('uses anchor.download attribute (not window.open) for same-origin paths', () => {
    expect(src).toContain('a.download = filename');
    expect(src).not.toContain('window.open');
  });

  it('treats /forms/... paths as same-origin and skips the fetch/blob path', () => {
    // isSameOrigin check for relative URLs starting with /
    expect(src).toMatch(/url\.startsWith\(['"]\/['"]\)/);
  });
});
