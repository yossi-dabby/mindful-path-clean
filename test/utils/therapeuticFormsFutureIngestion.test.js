import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, it, expect } from 'vitest';

const script = path.resolve('scripts/generate-therapeutic-forms-index.mjs');

describe('retained forms ingestion pipeline', () => {
  it('accepts new manifest-backed PDFs in every language without restoring an old package', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'forms-future-ingestion-'));
    try {
      fs.mkdirSync(path.join(root, 'src/data/therapeuticForms'), { recursive: true });
      fs.writeFileSync(path.join(root, 'src/data/therapeuticForms/content-status.json'), JSON.stringify({ status: 'available', contentAvailable: true }));
      const items = [];
      for (const language of ['en', 'he', 'es', 'fr', 'de', 'it', 'pt']) {
        const filePath = `public/forms/${language}/adults/thought_records/qa-neutral-${language}.pdf`;
        fs.mkdirSync(path.dirname(path.join(root, filePath)), { recursive: true });
        // Test-only bytes validate discovery and metadata, not a PDF renderer.
        fs.writeFileSync(path.join(root, filePath), '%PDF-1.4\n%%EOF\n');
        items.push({ file_path: filePath, title_en: `Synthetic ${language}`, language, audience: 'adults', category: 'thought_records',
          therapeutic_goal: 'Synthetic reflection', when_to_use: 'Synthetic request', keywords_en: ['synthetic'], ai_matching_summary: 'Synthetic content only' });
      }
      fs.writeFileSync(path.join(root, 'public/forms/manifest.qa.json'), JSON.stringify({ items }));
      const result = spawnSync(process.execPath, [script], { cwd: root, encoding: 'utf8' });
      expect(result.status, result.stderr).toBe(0);
      const index = JSON.parse(fs.readFileSync(path.join(root, 'src/generated/therapeutic-forms-index.json'), 'utf8'));
      expect(index).toHaveLength(7);
      expect(new Set(index.map(form => form.language))).toEqual(new Set(['en', 'he', 'es', 'fr', 'de', 'it', 'pt']));
      for (const form of index) {
        expect(form.approved).toBe(true);
        expect(form.title).toBe(`Synthetic ${form.language}`);
        expect(form.fileUrl).toContain(`/forms/${form.language}/adults/thought_records/qa-neutral-`);
        expect(form.languages[form.language].rtl).toBe(form.language === 'he');
        expect(form.ai_matching_summary).toBe('Synthetic content only');
      }
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
