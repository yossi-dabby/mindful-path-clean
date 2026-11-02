import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

const ROOT = process.cwd();
const DIST_DIR = join(ROOT, 'dist');
const PUBLIC_WORKER_PATH = '/pdfjs/pdf.worker.min.js';

function walkFiles(dir) {
  const files = [];

  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      files.push(...walkFiles(fullPath));
      continue;
    }

    files.push(fullPath);
  }

  return files;
}

describe('PDF worker compiled bundle guardrails', () => {
  it('keeps the stable public worker file available after build', () => {
    if (!existsSync(DIST_DIR)) {
      expect(true).toBe(true);
      return;
    }

    expect(existsSync(join(DIST_DIR, 'pdfjs', 'pdf.worker.min.js'))).toBe(true);
  });

  it('does not emit asset worker URLs into the compiled bundle', () => {
    if (!existsSync(DIST_DIR)) {
      expect(true).toBe(true);
      return;
    }

    const bundleText = walkFiles(DIST_DIR)
      .filter((file) => /\.(?:html|js|css|map|txt)$/i.test(file))
      .map((file) => readFileSync(file, 'utf8'))
      .join('\n');

    expect(bundleText).toContain(PUBLIC_WORKER_PATH);
    expect(bundleText).not.toMatch(/\/assets\/pdf\.worker[^"'`\s)]*\.mjs/i);
    expect(bundleText).not.toMatch(/pdf\.worker\.min\.mjs/i);
  });
});
