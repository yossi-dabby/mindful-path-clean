export const INTERNAL_CORRECTION_CHANNEL = Object.freeze({
  PROVEN_HIDDEN: 'proven_hidden',
  LOCAL_GUARD_ONLY: 'local_guard_only',
});

export const INTERNAL_CORRECTION_TYPES = Object.freeze({
  GROUNDING: 'grounding',
  FORMULATION: 'formulation',
});

function normalizeCorrectionType(value) {
  return value === INTERNAL_CORRECTION_TYPES.GROUNDING || value === INTERNAL_CORRECTION_TYPES.FORMULATION
    ? value
    : null;
}

function normalizeInstructionChannel(value) {
  return value === INTERNAL_CORRECTION_CHANNEL.PROVEN_HIDDEN || value === INTERNAL_CORRECTION_CHANNEL.LOCAL_GUARD_ONLY
    ? value
    : INTERNAL_CORRECTION_CHANNEL.LOCAL_GUARD_ONLY;
}

export function createInternalCorrectionIntent({
  correctionType,
  canonicalPreviousResponseAvailable = false,
  instructionChannel = INTERNAL_CORRECTION_CHANNEL.LOCAL_GUARD_ONLY,
  consumed = false,
  conversationScopeKey = null,
} = {}) {
  const normalizedType = normalizeCorrectionType(correctionType);
  if (!normalizedType) return null;
  // Store an opaque scope key so the intent can be verified against the active
  // conversation without logging or persisting the raw conversation ID.
  const scopeKey = typeof conversationScopeKey === 'string' && conversationScopeKey.trim()
    ? conversationScopeKey.trim()
    : null;
  return {
    correction_type: normalizedType,
    canonical_previous_response_available: canonicalPreviousResponseAvailable === true,
    instruction_channel: normalizeInstructionChannel(instructionChannel),
    consumed: consumed === true,
    _scope_key: scopeKey,
  };
}

export function hasInternalCorrectionIntent(intent) {
  return !!createInternalCorrectionIntent({
    correctionType: intent?.correction_type,
    canonicalPreviousResponseAvailable: intent?.canonical_previous_response_available,
    instructionChannel: intent?.instruction_channel,
    consumed: intent?.consumed,
    conversationScopeKey: intent?._scope_key,
  });
}

/**
 * Returns true only when the intent is structurally valid AND has not yet been
 * consumed (consumed !== true).  Use this wherever the send path needs to
 * decide whether a pending correction must be delivered.
 */
export function hasPendingInternalCorrectionIntent(intent) {
  if (!hasInternalCorrectionIntent(intent)) return false;
  return intent.consumed !== true;
}

export function consumeInternalCorrectionIntent(intent) {
  const normalized = createInternalCorrectionIntent({
    correctionType: intent?.correction_type,
    canonicalPreviousResponseAvailable: intent?.canonical_previous_response_available,
    instructionChannel: intent?.instruction_channel,
    consumed: true,
    conversationScopeKey: intent?._scope_key,
  });
  return normalized;
}

/**
 * Returns true when the intent's scope key matches the provided conversation ID.
 * An intent with no scope key never matches (stale or unscoped — treat as mismatch).
 */
export function internalCorrectionScopeMatches(intent, conversationId) {
  if (!intent || !intent._scope_key) return false;
  if (typeof conversationId !== 'string' || !conversationId.trim()) return false;
  return intent._scope_key === conversationId.trim();
}

export function buildInternalCorrectionDiagnostic(intent, fields = {}) {
  const normalized = createInternalCorrectionIntent({
    correctionType: intent?.correction_type,
    canonicalPreviousResponseAvailable: intent?.canonical_previous_response_available,
    instructionChannel: intent?.instruction_channel,
    consumed: intent?.consumed,
    conversationScopeKey: intent?._scope_key,
  });
  return {
    internal_correction_pending: normalized ? normalized.consumed !== true : false,
    correction_type: normalized?.correction_type || null,
    instruction_channel: normalized?.instruction_channel || INTERNAL_CORRECTION_CHANNEL.LOCAL_GUARD_ONLY,
    correction_consumed: normalized ? normalized.consumed === true : false,
    conversation_scope_match: fields.conversationScopeMatch === true,
    outbound_content_clean: fields.outboundContentClean === true,
    historical_block_detected: fields.historicalBlockDetected === true,
    historical_block_sanitized: fields.historicalBlockSanitized === true,
  };
}
