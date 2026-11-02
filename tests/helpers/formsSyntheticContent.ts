import type { Page } from '@playwright/test';
import { SYNTHETIC_FORMS } from '../fixtures/therapeutic-forms.synthetic.js';

function syntheticPdf() {
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Contents 4 0 R >>',
    '<< /Length 0 >>\nstream\n\nendstream',
  ];
  let body = '%PDF-1.4\n';
  const offsets = [0];
  for (const [index, object] of objects.entries()) {
    offsets.push(Buffer.byteLength(body));
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
  }
  const xref = Buffer.byteLength(body);
  body += `xref\n0 5\n0000000000 65535 f \n${offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')}`;
  body += `trailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(body);
}

/** Exercise the unchanged library with isolated future content, never legacy files. */
export async function installSyntheticFormsContent(page: Page) {
  await page.route('**/src/generated/therapeutic-forms-index.json*', route => route.fulfill({
    status: 200, contentType: 'application/javascript', body: `export default ${JSON.stringify(SYNTHETIC_FORMS)};`,
  }));
  await page.route('**/src/data/therapeuticForms/content-status.json*', route => route.fulfill({
    status: 200, contentType: 'application/javascript', body: 'export default {status:"available",contentAvailable:true};',
  }));
  // Serve only declared test fixtures; missing/unregistered asset URLs still
  // reach the real server, so this cannot conceal a broken production path.
  const fixturePdfPaths = new Set(SYNTHETIC_FORMS.map(form => form.fileUrl));
  await page.route(url => fixturePdfPaths.has(url.pathname), route => route.fulfill({
    status: 200, contentType: 'application/pdf', body: syntheticPdf(),
  }));
}
