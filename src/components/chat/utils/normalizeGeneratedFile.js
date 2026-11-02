/**
 * Normalizes and validates a message.metadata.generated_file object.
 *
 * Contract (required fields):
 *   {
 *     type:                 'pdf',   // REQUIRED — only 'pdf' is supported in v1
 *     url:                  string,  // REQUIRED — file URL (Base44 or /forms/ path)
 *     name:                 string,  // REQUIRED — file name (default: 'worksheet.pdf')
 *   }
 *
 * Optional fields (passed through when present and valid):
 *   {
 *     title?:               string,
 *     description?:         string,
 *     therapeutic_purpose?: string,
 *     created_at?:          string,
 *     // TherapeuticForms library fields (Phase 3) — preserved as-is:
 *     source?:              string,  // e.g. 'therapeutic_forms_library'
 *     form_id?:             string,
 *     form_slug?:           string,
 *     audience?:            string,
 *     category?:            string,
 *     language?:            string,
 *   }
 *
 * Returns null when the object is absent, invalid, or has an unsupported type.
 * Never throws.
 */
export function normalizeGeneratedFile(raw) {
  if (!raw || typeof raw !== 'object') return null;
  if (raw.type !== 'pdf') return null;
  const url = typeof raw.url === 'string' && raw.url.trim() ? raw.url.trim() : null;
  if (!url) return null;
  const name = typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim() : 'worksheet.pdf';
  const title = typeof raw.title === 'string' && raw.title.trim() ? raw.title.trim() : null;
  const description = typeof raw.description === 'string' && raw.description.trim()
    ? raw.description.trim()
    : null;
  const therapeuticPurpose = typeof raw.therapeutic_purpose === 'string' && raw.therapeutic_purpose.trim()
    ? raw.therapeutic_purpose.trim()
    : null;

  // ── TherapeuticForms library fields (Phase 3) ─────────────────────────────
  // These are passed through unchanged when present and string-valued.
  // Preserving them allows downstream consumers (analytics, logging) to
  // distinguish library-sourced forms from dynamically generated files.
  const source     = typeof raw.source === 'string' && raw.source.trim() ? raw.source.trim() : null;
  const formId     = typeof raw.form_id === 'string' && raw.form_id.trim() ? raw.form_id.trim() : null;
  const formSlug   = typeof raw.form_slug === 'string' && raw.form_slug.trim() ? raw.form_slug.trim() : null;
  const audience   = typeof raw.audience === 'string' && raw.audience.trim() ? raw.audience.trim() : null;
  const category   = typeof raw.category === 'string' && raw.category.trim() ? raw.category.trim() : null;
  const language   = typeof raw.language === 'string' && raw.language.trim() ? raw.language.trim() : null;
  let isCombinedPdf = null;
  if (typeof raw.isCombinedPdf === 'boolean') {
    isCombinedPdf = raw.isCombinedPdf;
  } else if (typeof raw.is_combined_pdf === 'boolean') {
    isCombinedPdf = raw.is_combined_pdf;
  }

  const result = {
    type: 'pdf',
    url,
    name,
    title,
    description,
    therapeutic_purpose: therapeuticPurpose,
  };

  // Only include library fields when at least one is present (keeps the
  // normalized object lean for non-library generated files)
  if (source)   result.source    = source;
  if (formId)   result.form_id   = formId;
  if (formSlug) result.form_slug = formSlug;
  if (audience) result.audience  = audience;
  if (category) result.category  = category;
  if (language) result.language  = language;
  if (typeof isCombinedPdf === 'boolean') result.isCombinedPdf = isCombinedPdf;

  return result;
}
