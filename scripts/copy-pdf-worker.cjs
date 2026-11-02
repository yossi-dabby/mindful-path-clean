/**
 * copy-pdf-worker.cjs
 *
 * Copies the PDF.js worker file from node_modules to public/pdfjs/pdf.worker.min.js
 * so it is served from a stable .js URL with a JavaScript MIME type.
 *
 * Base44 / custom-domain hosting serves files with .mjs extension as
 * application/octet-stream, which browsers refuse to load as an ES module worker.
 * Serving the same file content under a .js URL resolves the MIME mismatch.
 *
 * Candidate source paths (tried in order):
 *   1. node_modules/pdfjs-dist/build/pdf.worker.min.mjs   (pdfjs-dist v4/v5)
 *   2. node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs
 *
 * Run via:
 *   node scripts/copy-pdf-worker.cjs
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DEST = path.join(ROOT, 'public', 'pdfjs', 'pdf.worker.min.js');

const CANDIDATES = [
  path.join(ROOT, 'node_modules', 'pdfjs-dist', 'build', 'pdf.worker.min.mjs'),
  path.join(ROOT, 'node_modules', 'pdfjs-dist', 'legacy', 'build', 'pdf.worker.min.mjs'),
];

function main() {
  let src = null;
  for (const candidate of CANDIDATES) {
    if (fs.existsSync(candidate)) {
      src = candidate;
      break;
    }
  }

  if (!src) {
    console.error(
      '[copy-pdf-worker] ERROR: Could not find PDF.js worker file.\n' +
      'Tried:\n' +
      CANDIDATES.map((c) => `  ${c}`).join('\n') + '\n' +
      'Ensure pdfjs-dist is installed (npm install).'
    );
    process.exit(1);
  }

  const destDir = path.dirname(DEST);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  fs.copyFileSync(src, DEST);
  console.log(`[copy-pdf-worker] Copied\n  ${src}\n  → ${DEST}`);
}

main();
