# Therapeutic Forms Multilingual Registry (Stage 1)

## Architecture choice

Stage 1 uses a **hybrid backward-compatible model**:

- Keep the existing **flat runtime registry**.
- Keep `ALL_FORMS` sourced from `src/generated/therapeutic-forms-index.json`.
- Keep all existing form IDs unchanged.
- Add multilingual-link fields as additive metadata only.
- Do not introduce a second registry.

## Why existing IDs must not be renamed

Existing IDs are stable keys across:

- forms UI cards and test selectors,
- deterministic AI resolver matching,
- `[FORM:...]` marker resolution,
- `generated_file` metadata and tests.

Renaming IDs would risk broad runtime/test regressions.

## Additive multilingual fields

Optional fields supported on each form entry:

- `logical_form_id` — language-neutral clinical identity.
- `variant_language` — language code of this concrete variant entry.
- `available_languages` — installed languages for the same logical form.
- `sibling_variant_ids` — IDs of sibling variants.
- `source_language` — original language (usually `en`).
- `is_language_variant` — boolean.
- `variant_group_id` — group key (can equal `logical_form_id`).

These are additive. Existing consumers remain valid if they ignore them.

## Language codes

Supported codes for therapeutic forms:

- `en`, `he`, `es`, `fr`, `de`, `it`, `pt`

## Manifest example shape (documentation example)

```json
{
  "id": "children_cbt_specialized_he_4.1_ocd",
  "logical_form_id": "children_cbt_specialized_04_01_ocd",
  "variant_language": "he",
  "source_language": "en",
  "is_language_variant": true,
  "variant_group_id": "children_cbt_specialized_04_01_ocd",
  "available_languages": ["en", "he"],
  "sibling_variant_ids": ["children_cbt_specialized_en_4.1_ocd"],
  "language": "he",
  "audience": "children",
  "main_category": "children_cbt_specialized",
  "subcategory": "OCD",
  "file_path": "public/forms/children/he/cbt-specialized/children_cbt_specialized_he_4.1_ocd.pdf",
  "title_he": "...",
  "keywords_he": ["..."],
  "ai_matching_summary_he": "...",
  "safety_notes": "..."
}
```

Use this only when the referenced PDF really exists in `public/forms`.

## Folder/path convention

Recommended language-aware path convention:

- `/public/forms/{audience}/{language}/{pack-or-category}/...`

Legacy paths already in production stay valid and must not be rewritten in Stage 1.

## AI variant selection policy

Variant selection order:

1. Explicit user-requested language.
2. Active app/session language.
3. Allowed fallback policy (typically English).
4. If no same-language variant exists, return a clear result with `available_languages`.

Audience/category constraints must still be enforced.

## Fallback behavior

- Missing requested variant must not produce technical-failure messaging.
- Use policy fallback safely and disclose available languages.

## How to add a new language variant safely

1. Ensure the PDF file exists under `public/forms`.
2. Add/update manifest and/or curated metadata with additive multilingual fields.
3. Run generator and validate output.
4. Run tests and confirm deterministic AI + Open/Download behavior.
5. Do not rename existing IDs.

## Validation and test commands

- `npm run check:forms-index`
- `npm run build`
- `npm test`
- `npm run lint`
- `npm run test:e2e` (when applicable)

## Do-not-touch rules for PDFs

- Do not edit visual PDF content in this stage.
- Do not point registry entries to missing PDFs.
- Do not create fake production entries for non-existent translated files.

---

Last updated: 2026-05-24
