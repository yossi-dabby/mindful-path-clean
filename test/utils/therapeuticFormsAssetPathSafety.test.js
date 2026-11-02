import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { THERAPEUTIC_FORMS_CONTENT_AVAILABLE } from '../../src/data/therapeuticForms/availability.js';

import { ALL_FORMS } from '../../src/data/therapeuticForms/index.js';

const ROOT = process.cwd();
const CHILDREN_SPECIALIZED_MODULE_WORKSHEET_COUNT = 10;

function toAbsoluteFromPublicUrl(fileUrl) {
  return path.join(ROOT, 'public', String(fileUrl || '').replace(/^\//, ''));
}

function toAbsoluteFromRepoPath(filePath) {
  return path.join(ROOT, String(filePath || ''));
}

function isAllowedDuplicateGroup(fileUrl, entries) {
  const isChildrenSpecializedEn = entries.every((entry) =>
    entry?.audience === 'children' &&
    entry?.language === 'en' &&
    entry?.category === 'children_cbt_specialized' &&
    String(entry?.filePath || entry?.file_path || '').startsWith('public/forms/')
  );

  if (!isChildrenSpecializedEn) return false;
  if (!/^\/forms\/en\/children\/cbt-specialized\/module-0[1-5]\//.test(String(fileUrl))) return false;

  const moduleEntries = entries.filter((entry) => entry?.type === 'module_pdf');
  const worksheetEntries = entries.filter((entry) => entry?.type === 'individual_worksheet');
  return moduleEntries.length === 1 && worksheetEntries.length === CHILDREN_SPECIALIZED_MODULE_WORKSHEET_COUNT;
}

describe('therapeutic forms asset path safety', () => {

  it('does not introduce undocumented duplicate runtime fileUrl values', () => {
    const byUrl = new Map();
    for (const form of ALL_FORMS.filter((entry) => entry?.approved === true)) {
      const fileUrl = String(form?.fileUrl || '').trim();
      if (!fileUrl) continue;
      if (!byUrl.has(fileUrl)) byUrl.set(fileUrl, []);
      byUrl.get(fileUrl).push(form);
    }

    const duplicateGroups = Array.from(byUrl.entries()).filter(([, entries]) => entries.length > 1);
    const unexpectedGroups = duplicateGroups.filter(([fileUrl, entries]) => !isAllowedDuplicateGroup(fileUrl, entries));

    expect(
      unexpectedGroups.map(([fileUrl, entries]) => `${fileUrl} => ${entries.map((entry) => entry.id).join(', ')}`)
    ).toEqual([]);
  });
});
