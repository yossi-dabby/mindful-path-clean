# Therapeutic Forms Ingestion Contract

This document locks the default, canonical therapeutic forms pipeline for all current and future languages.

## Canonical architecture (single source of truth)

All therapeutic forms must flow through one pipeline:

1. Uploaded PDF assets under `public/forms/...`
2. Manifest metadata (`manifest*.json`) where available
3. Generated canonical index: `src/generated/therapeutic-forms-index.json`
4. Canonical registry loader: `src/data/therapeuticForms/index.js` (`ALL_FORMS`)
5. Deterministic AI access layer: `src/data/therapeuticForms/aiFormsAccess.js`
6. Deterministic resolver integration in chat sanitization/routing
7. `generated_file` metadata attachment
8. UI actions: **Open** (inline viewer) and **Download** (intentional file download)

Do not create:
- AI-only catalogs
- preview-only or production-only catalogs
- hardcoded language-specific duplicate registries

## Upload locations

- Place therapeutic PDFs under `public/forms/{language}/{audience}/{group-or-category}/...`
- Keep URLs under `/forms/...` so they are usable by canonical open/download helpers.

## Required metadata contract for each form entry

Each form must be represented in the generated index with:

- `id`
- `title`
- `audience`
- `language`
- `category` (main category)
- `subcategory`/module grouping when applicable
- `therapeutic_goal`
- `when_to_use`
- `keywords`
- `ai_matching_summary` (recommended, see validation section)
- `safety_notes`
- `file_path`
- `preview_path` (if available)
- worksheet/module metadata for page-level forms

## Accepted language codes

Supported language codes:

- `en`
- `he`
- `es`
- `fr`
- `de`
- `it`
- `pt`

Future app-supported languages must be added centrally in taxonomy/config and then reflected in index validation rules.

## Accepted audience values

Current accepted audiences:

- `children`
- `adolescents`
- `adults`
- `older_adults`
- `parents`

## Category/subcategory conventions

- `category` is required and should represent the clinical/form family (for filtering and deterministic AI routing).
- `subcategory` should represent module/series grouping where applicable.
- Keep naming stable; add new values additively.

## Generate and validate the canonical index

```bash
npm run generate:forms-index
```

Validation is enforced during generation. It fails clearly on:

- duplicate IDs
- missing language
- unsupported language codes
- missing audience
- invalid audience values
- missing category
- missing file path / broken PDF path
- file paths outside `public/forms/...`
- missing AI matching metadata (`ai_matching_summary` / `therapeutic_goal` / `when_to_use` / `keywords`)

## CI guard for stale generated index

Use:

```bash
npm run check:forms-index
```

This regenerates the index and fails if `src/generated/therapeutic-forms-index.json` is stale or not committed.

## How AI discovers forms

Deterministic AI access is through:

- `listFormsForAI`
- `searchFormsForAI`
- `resolveFormForAIRequest`
- `createGeneratedFileFromResolvedForm`
- `getAvailableFormGroups`
- `getFormsRegistryStats`

The `[FORM:id]` marker remains backward-compatible fallback only.

## Language behavior and fallback

- Session language is used first.
- Explicit language requests are respected.
- If same-language forms are unavailable, the resolver must fail soft (no technical-failure messaging) and may offer available language alternatives per policy.
- Unsupported language requests must not crash global forms access.

## Open / Download verification

Expected invariant:

- **Open** uses viewer/new-tab behavior (no download attribute, no forced `?download=1`)
- **Download** uses explicit download behavior (`?download=1` and download flow)

Verify from:

- Forms Library
- AI-generated file cards
- Preview and Production flows

## Preview/Production parity checklist

- Same generated index source (`src/generated/therapeutic-forms-index.json`)
- Same canonical registry loader (`ALL_FORMS`)
- Same deterministic resolver path for AI form intents
- No environment-specific alternate catalog

## Testing checklist for new form packages

Run:

```bash
npm test
npm run build
```

Focus assertions:

- registry loads and is non-empty
- grouping by language/audience/category works
- deterministic list/search/resolve/send behaviors work
- generated_file metadata contract remains intact
- Open/Download separation remains correct

Last updated: 2026-05-24


## Empty baseline after illustrated-content retirement (2026-10-30)

The old illustrated collection, standby catalog and public upload manifests have
been removed from the current tree. There are no installed form files. The
canonical index and compatibility arrays are empty; the library stays under
revision. Do not refill the retired per-package JavaScript files or rebuild the
removed standby catalog. New approved assets and `items` manifests feed the same
canonical generator and resolver architecture.

Use new stable IDs/filenames for replacement content so that a historical link
cannot silently point to a different document. Keep test-only synthetic content
under `tests/fixtures`, never in the production catalog or `public/` directory.

For future activation: first add the reviewed files and metadata; explicitly
change content availability only as part of that reviewed release; generate and
validate the index; run ingestion, language/audience, AI intent, eligibility,
viewer, download and navigation tests. Empty-catalog tests describe the current
release and must be consciously updated when installing replacement content.

The retained generator now uses its declared `SUPPORTED_FORM_LANGUAGES` set in
fallback discovery; a real temporary-directory ingestion test across all seven
languages caught and fixed the previous undefined-constant error.
