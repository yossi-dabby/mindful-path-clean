const DEFAULT_CONTEXT_COMPOSER_V2_VERSION = '2.0.0';

// Safe default budget rationale:
//   Provider / model context limit: UNKNOWN from this repository.  The application
//   calls Base44 InvokeLLM without specifying a model or context window contract.
//   No authoritative upper bound is available in source code.
//
//   Measured V12 output sizes (deterministic, bounded scenarios):
//     - Empty entities, all layers active:                  ~69,731 chars
//     - Populated (LTS + continuity + formulation, no KB):  ~74,163 chars
//     - Maximum deterministic bounded scenario measured:     ~74,163 chars
//
//   120,000 was selected because it is ≥45,000 chars above the largest measured
//   populated scenario, providing substantial headroom for future section additions
//   while remaining a reasonable application-level limit regardless of provider.
//   The previous default of 32,000 was below even the empty-entities V12 output and
//   caused clinical-personalisation sections to be evicted on every ordinary session.
//   Budget eviction is still exercisable by injecting an explicit low budget in tests.
const DEFAULT_CONTEXT_COMPOSER_V2_BUDGET_CHARS = 120000;
const SECTION_SEPARATOR = '\n\n';

export const CONTEXT_COMPOSER_V2_VERSION = DEFAULT_CONTEXT_COMPOSER_V2_VERSION;
export const CONTEXT_COMPOSER_V2_BUDGET_CHARS = DEFAULT_CONTEXT_COMPOSER_V2_BUDGET_CHARS;

export const CONTEXT_COMPOSER_V2_OMISSION_REASONS = Object.freeze({
  budget: 'budget',
  duplicate: 'duplicate_id',
  not_emitted: 'not_emitted',
  empty: 'empty_content',
});

export const CONTEXT_COMPOSER_V2_FALLBACK_REASONS = Object.freeze({
  parity_mismatch: 'parity_mismatch_under_budget',
  none: null,
});

/**
 * Bounded parity status codes emitted in the diagnostic.
 *
 * - exact_match              — composedRendered === fallbackRendered (or no fallback
 *                              was provided and budget was not exceeded).
 * - intentional_budget_difference — budget was exceeded; composed output is intentionally
 *                              shorter than the full legacy output.
 * - invariant_mismatch       — composed output differs from legacy under budget;
 *                              invariant violation — failed open to legacy fallback.
 * - not_compared             — no fallbackRendered was supplied; parity was not checked.
 */
export const CONTEXT_COMPOSER_V2_PARITY_STATUS = Object.freeze({
  exact_match: 'exact_match',
  intentional_budget_difference: 'intentional_budget_difference',
  invariant_mismatch: 'invariant_mismatch',
  not_compared: 'not_compared',
});

function freezeSection(section) {
  return Object.freeze({ ...section });
}

function sanitizeOmissionReason(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function renderSections(sections) {
  return sections
    .filter((section) => section.emitted === true)
    .sort((left, right) => left.order - right.order)
    .map((section) => section.content)
    .join(SECTION_SEPARATOR);
}

function buildSectionRecord({
  id,
  order,
  retention_priority,
  required,
  source_layer,
  content,
  emitted,
  omission_reason,
}) {
  const text = typeof content === 'string' ? content : '';
  return freezeSection({
    id,
    order,
    retention_priority,
    required: required === true,
    source_layer,
    content: text,
    char_count: text.length,
    emitted: emitted === true,
    omission_reason: sanitizeOmissionReason(omission_reason),
  });
}

function buildImmutableResult({
  version,
  budget_chars,
  budget_exceeded,
  duplicate_section_detected,
  fallback_used,
  fallback_reason,
  output_parity_expected,
  parity_status,
  sections,
  renderedOverride,
}) {
  const rendered = typeof renderedOverride === 'string' ? renderedOverride : renderSections(sections);
  const emittedSections = sections.filter((section) => section.emitted === true);
  const omittedSections = sections.filter((section) => section.emitted !== true);
  const diagnostic = Object.freeze({
    context_composer_used: true,
    context_composer_version: version,
    section_count: sections.length,
    emitted_section_count: emittedSections.length,
    emitted_section_ids: Object.freeze(emittedSections.map((section) => section.id)),
    omitted_section_ids: Object.freeze(omittedSections.map((section) => section.id)),
    omission_reason_codes: Object.freeze(
      Array.from(new Set(omittedSections.map((section) => section.omission_reason).filter(Boolean))),
    ),
    duplicate_section_detected: duplicate_section_detected === true,
    total_chars: rendered.length,
    budget_chars,
    budget_exceeded: budget_exceeded === true,
    fallback_used: fallback_used === true,
    fallback_reason: fallback_reason ?? null,
    parity_match: parity_status === CONTEXT_COMPOSER_V2_PARITY_STATUS.exact_match,
    parity_status: parity_status ?? CONTEXT_COMPOSER_V2_PARITY_STATUS.not_compared,
    output_parity_expected: output_parity_expected === true,
  });

  return Object.freeze({
    version,
    sections: Object.freeze(sections),
    rendered,
    diagnostic,
  });
}

export function createContextComposerV2(options = {}) {
  const version =
    typeof options.version === 'string' && options.version.trim()
      ? options.version.trim()
      : CONTEXT_COMPOSER_V2_VERSION;
  const budget_chars =
    Number.isInteger(options.budget_chars) && options.budget_chars > 0
      ? options.budget_chars
      : CONTEXT_COMPOSER_V2_BUDGET_CHARS;
  const output_parity_expected = options.output_parity_expected !== false;
  const registry = new Map();
  let duplicate_section_detected = false;
  let finalizedResult = null;

  function registerSection(sectionInput) {
    if (finalizedResult) {
      throw new Error('ContextComposerV2 is already finalized');
    }

    const section = sectionInput && typeof sectionInput === 'object' ? sectionInput : null;
    const id = typeof section?.id === 'string' ? section.id.trim() : '';
    if (!id) {
      throw new Error('ContextComposerV2 section id is required');
    }
    if (registry.has(id)) {
      duplicate_section_detected = true;
      throw new Error(`Duplicate context composer section id: ${id}`);
    }

    const order = Number.isInteger(section?.order) ? section.order : null;
    const retentionPriority = Number.isInteger(section?.retention_priority)
      ? section.retention_priority
      : null;
    if (order === null || retentionPriority === null) {
      throw new Error(`ContextComposerV2 section ${id} requires explicit order and retention_priority`);
    }

    registry.set(
      id,
      Object.freeze({
        id,
        order,
        retention_priority: retentionPriority,
        required: section?.required === true,
        source_layer:
          typeof section?.source_layer === 'string' && section.source_layer.trim()
            ? section.source_layer.trim()
            : 'unknown',
        content: typeof section?.content === 'string' ? section.content : '',
        omission_reason: sanitizeOmissionReason(section?.omission_reason),
        emitted: section?.emitted !== false,
      }),
    );
  }

  function finalize(finalizeOptions = {}) {
    if (finalizedResult) return finalizedResult;

    const fallbackRendered =
      typeof finalizeOptions.fallbackRendered === 'string' ? finalizeOptions.fallbackRendered : null;
    const rawSections = Array.from(registry.values()).sort((left, right) => left.order - right.order);
    let sections = rawSections.map((section) =>
      buildSectionRecord({
        ...section,
        emitted: section.emitted !== false && section.content.length > 0,
        omission_reason:
          section.emitted === false
            ? section.omission_reason
            : section.content.length > 0
              ? null
              : CONTEXT_COMPOSER_V2_OMISSION_REASONS.empty,
      }),
    );

    const requiredSections = sections.filter((section) => section.required === true && section.emitted === true);
    const requiredChars = renderSections(requiredSections).length;
    let budget_exceeded = false;

    if (requiredChars <= budget_chars) {
      let renderedLength = renderSections(sections).length;
      if (renderedLength > budget_chars) {
        budget_exceeded = true;
        const optionalSections = sections
          .filter((section) => section.required !== true && section.emitted === true)
          .sort((left, right) => {
            if (left.retention_priority !== right.retention_priority) {
              return left.retention_priority - right.retention_priority;
            }
            return right.order - left.order;
          });

        const droppedIds = new Set();
        for (const section of optionalSections) {
          if (renderedLength <= budget_chars) break;
          droppedIds.add(section.id);
          renderedLength = renderSections(
            sections.filter((candidate) => candidate.emitted === true && !droppedIds.has(candidate.id)),
          ).length;
        }

        if (droppedIds.size > 0) {
          sections = sections.map((section) =>
            droppedIds.has(section.id)
              ? buildSectionRecord({
                  ...section,
                  emitted: false,
                  omission_reason: CONTEXT_COMPOSER_V2_OMISSION_REASONS.budget,
                })
              : section,
          );
        }
      }
    } else {
      // Required sections alone exceed budget — still evict all optionals to minimize output
      budget_exceeded = true;
      const allOptionalIds = new Set(
        sections
          .filter((section) => section.required !== true && section.emitted === true)
          .map((section) => section.id),
      );
      if (allOptionalIds.size > 0) {
        sections = sections.map((section) =>
          allOptionalIds.has(section.id)
            ? buildSectionRecord({
                ...section,
                emitted: false,
                omission_reason: CONTEXT_COMPOSER_V2_OMISSION_REASONS.budget,
              })
            : section,
        );
      }
    }

    const composedRendered = renderSections(sections);

    // Fallback logic:
    // - Under budget (budget_exceeded=false): composed output MUST equal legacy.
    //   A difference is an invariant failure — fail open to the already-computed
    //   legacy output with explicit bounded reason code.
    // - Budget eviction (budget_exceeded=true): intentional — return composed,
    //   reduced output.  Never fall back to full legacy output.
    // - Required-only exceeds budget: return composed output (required sections only).
    let fallbackUsed = false;
    let fallbackReason = null;
    let renderedOverride = null;

    // Compute parity_status from the actual comparison, not from fallback_used.
    let parityStatus;
    if (budget_exceeded) {
      // Budget eviction is an intentional reduction — not a parity failure.
      parityStatus = CONTEXT_COMPOSER_V2_PARITY_STATUS.intentional_budget_difference;
    } else if (fallbackRendered === null) {
      // No legacy output was provided — parity was not checked.
      parityStatus = CONTEXT_COMPOSER_V2_PARITY_STATUS.not_compared;
    } else if (composedRendered === fallbackRendered) {
      parityStatus = CONTEXT_COMPOSER_V2_PARITY_STATUS.exact_match;
    } else {
      // Differs from legacy under budget — invariant failure: fail open to legacy.
      parityStatus = CONTEXT_COMPOSER_V2_PARITY_STATUS.invariant_mismatch;
      fallbackUsed = true;
      fallbackReason = CONTEXT_COMPOSER_V2_FALLBACK_REASONS.parity_mismatch;
      renderedOverride = fallbackRendered;
    }

    finalizedResult = buildImmutableResult({
      version,
      budget_chars,
      budget_exceeded,
      duplicate_section_detected,
      fallback_used: fallbackUsed,
      fallback_reason: fallbackReason,
      output_parity_expected,
      parity_status: parityStatus,
      sections,
      renderedOverride,
    });
    return finalizedResult;
  }

  return Object.freeze({
    version,
    budget_chars,
    registerSection,
    finalize,
  });
}
