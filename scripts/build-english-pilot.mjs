// Build metadata from the reviewed, committed PDFs. Never regenerate PDF bytes.
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { auditFormSources } from './audit-form-sources.mjs';
import { buildTranslationReviewCatalog } from '../src/lib/formsLocalization.js';
import { canonicalCatalog } from '../base44/functions/getHebrewFormsPilot/releases.js';

const root = new URL('../', import.meta.url);
const packet = JSON.parse(await readFile(new URL('content/forms-localization/en/mood-03.json', root), 'utf8'));
const sources = await auditFormSources();
const review = buildTranslationReviewCatalog(sources, packet.forms, 'en');
if (review.stale.length || review.forms.length !== 9) throw new Error('English draft needs source review');
const ageGroups = {
  CH: { label: 'Children, approximately ages 6 to 11', adaptation: 'Short, concrete questions; little writing; therapist support and the child’s own voice; coordinate parent involvement as needed.' },
  TE: { label: 'Adolescents, approximately ages 12 to 17', adaptation: 'Direct, respectful language; autonomy, belonging and privacy; examples from learning, relationships and family.' },
  AD: { label: 'Adults', adaptation: 'Examples from work, relationships, family and daily functioning; personal goals and practical exercises.' },
  OA: { label: 'Older adults', adaptation: 'Readable, spacious text; answering in conversation is an option; adapt to needs and preferences without assuming reduced ability.' },
  ALL: { label: 'Shared across age groups', adaptation: 'Shared wording with adaptations as needed. Therapist guides include separate notes for all four age groups.' },
};
const catalog = { version: '0.1-en-mood-03', language: 'en', sourceCatalogVersion: sources.catalogVersion,
  coverage: { available: 9, total: sources.total, unavailable: sources.total - 9 }, ageGroups, forms: [] };
for (const draft of review.forms) {
  const pdf = await readFile(new URL(`server/private/forms-en/${draft.id}.pdf`, root));
  if (pdf.subarray(0, 5).toString() !== '%PDF-' || pdf.length > 1024 * 1024) throw new Error('Invalid English PDF');
  catalog.forms.push({ ...draft, kindCode: draft.kind,
    kind: { G: 'Therapist guide', W: 'Worksheet', P: 'Practice sheet' }[draft.kind],
    ageLabel: ageGroups[draft.age].label,
    audience: draft.age === 'ALL' ? 'Therapist' : `${ageGroups[draft.age].label} and therapist`,
    status: 'Review draft - not for distribution', contentVersion: draft.translationVersion,
    bytes: pdf.length, sha256: createHash('sha256').update(pdf).digest('hex') });
}
if (Buffer.byteLength(JSON.stringify(catalog)) >= 512 * 1024) throw new Error('Catalog exceeds transport bound');
const text = JSON.stringify(catalog, null, 2) + '\n';
const target = new URL('server/private/english-pilot-mood-03-catalog.json', root);
if (process.argv.includes('--write')) await writeFile(target, text);
else if (await readFile(target, 'utf8') !== text) throw new Error('English catalog is stale');
console.log(`9 English draft PDFs; catalog SHA-256 ${createHash('sha256').update(canonicalCatalog(catalog)).digest('hex')}`);
