/**
 * @file src/lib/guardIsolationAudit.js
 *
 * Guard Isolation Audit — Phase 1: Deterministic Isolation
 * =========================================================
 *
 * Mode-aware wrappers for the two non-safety guards under audit:
 *   - applyFormulationGuardToConversationMessages
 *   - applyCurrentTurnGroundingGuardToConversationMessages
 *
 * Each wrapper supports three runtime modes (selectable via ?_s2= URL override):
 *   ENFORCE — guard evaluates; emits provenance with guard_decision/reason_codes; delivery authority revoked.
 *   SHADOW  — guard evaluates; emits provenance with guard_decision/reason_codes; delivery authority revoked.
 *             Both ENFORCE and SHADOW have identical delivery behavior post-Phase-1 remediation.
 *             ENFORCE is retained as the default mode label for telemetry continuity and to preserve
 *             the ability to distinguish intentional enforcement attempts from passive observation,
 *             should delivery authority be restored for a scoped guard in a future phase.
 *   OFF     — guard is skipped entirely; original messages pass through unchanged; provenance emitted
 *             with GUARD_DECISION.SKIPPED.
 *
 * Post-Phase-1 remediation: ENFORCE mode no longer has delivery authority for non-safety guards.
 * The guard_decision, reason_codes, and diagnostics still emit for telemetry in all modes.
 * Safety-critical output/crisis filtering is a separate pipeline and is unaffected.
 *
 * Bounded provenance emitted per assistant candidate (no transcript text, no PII):
 *   client_request_id, assistant_raw_index, assistant_id,
 *   user_raw_index, user_id, language,
 *   guard_name, guard_mode, guard_decision, reason_codes,
 *   replacement_created, replacement_terminal,
 *   response_correlated, safe_update_accepted, visible_commit_completed,
 *   delivery_source.
 *
 * Safety invariants:
 *   - No safety/crisis/unsafe-output control is affected by any mode.
 *   - SHADOW and OFF only suppress non-safety clinical guards.
 *   - The formulation guard and grounding guard are not safety controls.
 *   - No transcript text, clinical content or PII is emitted in provenance.
 *
 * @module guardIsolationAudit
 */

import {
  applyFormulationGuardToConversationMessages,
  applyCurrentTurnGroundingGuardToConversationMessages,
} from '../components/utils/formulationContractGuard.js';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Guard decision values emitted in provenance. */
export const GUARD_DECISION = Object.freeze({
  PASS: 'PASS',
  REPLACED: 'REPLACED',
  SKIPPED: 'SKIPPED',
});

/** Guard names for provenance logs. */
export const GUARD_NAME = Object.freeze({
  FORMULATION: 'applyFormulationGuardToConversationMessages',
  GROUNDING: 'applyCurrentTurnGroundingGuardToConversationMessages',
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns the stable string identity key for an assistant message, suitable for
 * provenance logs.  No content is included.
 *
 * @param {object|null|undefined} msg
 * @param {number} rawIndex
 * @returns {string|null}
 */
function _safeAssistantId(msg, rawIndex) {
  if (!msg) return null;
  if (typeof msg.id === 'string' && msg.id) return msg.id;
  if (typeof msg.created_at === 'string' && msg.created_at) {
    return `idx:${rawIndex}@${msg.created_at}`;
  }
  return `idx:${rawIndex}`;
}

/**
 * Returns the stable string identity key for a user message, suitable for
 * provenance logs.  No content is included.
 *
 * @param {object|null|undefined} msg
 * @param {number} rawIndex
 * @returns {string|null}
 */
function _safeUserId(msg, rawIndex) {
  if (!msg) return null;
  if (typeof msg.id === 'string' && msg.id) return msg.id;
  if (typeof msg.created_at === 'string' && msg.created_at) {
    return `idx:${rawIndex}@${msg.created_at}`;
  }
  return `idx:${rawIndex}`;
}

/**
 * Finds the raw index of the last assistant message whose metadata indicates
 * it was replaced by the given guard.
 *
 * @param {Array<object>} messages  — processed message array (may contain replacements)
 * @param {string}        metaKey   — e.g. 'formulation_guard_replaced'
 * @returns {number|null}
 */
function _findLastReplacedRawIndex(messages, metaKey) {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg?.role === 'assistant' && msg.metadata?.[metaKey] === true) {
      return Number.isInteger(msg.__rawIndex) ? msg.__rawIndex : i;
    }
  }
  return null;
}

/**
 * Collects reason_codes from the last replaced assistant message.
 *
 * @param {Array<object>} messages
 * @param {string}        metaKey   — e.g. 'formulation_guard_reason_codes'
 * @returns {string[]}
 */
function _collectReasonCodes(messages, metaKey) {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg?.role === 'assistant' && Array.isArray(msg.metadata?.[metaKey])) {
      return msg.metadata[metaKey].slice(0, 8);
    }
  }
  return [];
}

/**
 * Returns true when any assistant message in `processed` differs from its
 * counterpart in `original` at the same array index.
 *
 * @param {Array<object>} original
 * @param {Array<object>} processed
 * @returns {boolean}
 */
function _anyReplacementApplied(original, processed) {
  for (let i = 0; i < processed.length && i < original.length; i++) {
    if (
      original[i]?.role === 'assistant' &&
      processed[i]?.role === 'assistant' &&
      processed[i]?.content !== original[i]?.content
    ) {
      return true;
    }
  }
  return false;
}

// ─── Candidate-scoped composite provenance key ───────────────────────────────

/**
 * Builds a deterministic composite key that uniquely identifies one guard
 * evaluation for one assistant candidate.
 *
 * The key is formed from four dimensions so that different assistant candidates
 * sharing the same client_request_id (e.g. multiple polling snapshots for a
 * single request) each produce a distinct key and can never cross-attribute
 * provenance.
 *
 * Dimensions:
 *   clientRequestId  — the active turn's client-side request identity.
 *   assistantId      — the stable identity key of the specific assistant message.
 *   userId           — the stable identity key of the paired user message.
 *   guardName        — which guard produced this record.
 *
 * Null-byte (\x00) is used as a field separator because it cannot appear in any
 * of the component strings (all are URL-safe IDs, ISO timestamps, or guard name
 * constants).
 *
 * @param {string|null} clientRequestId
 * @param {string|null} assistantId
 * @param {string|null} userId
 * @param {string|null} guardName
 * @returns {string}
 */
export function buildCompositeProvenanceKey(clientRequestId, assistantId, userId, guardName) {
  const r = typeof clientRequestId === 'string' && clientRequestId ? clientRequestId : '__no_request_id__';
  const a = typeof assistantId === 'string' && assistantId ? assistantId : '__no_assistant_id__';
  const u = typeof userId === 'string' && userId ? userId : '__no_user_id__';
  const g = typeof guardName === 'string' && guardName ? guardName : '__no_guard__';
  return `${r}\x00${a}\x00${u}\x00${g}`;
}

// ─── Provenance record builder ────────────────────────────────────────────────

/**
 * Builds a bounded, PII-free provenance record for one guard evaluation.
 *
 * All fields present in the record are safe to log to the console without
 * exposing transcript text, clinical content or PII.
 *
 * @param {object} opts
 * @param {string}          opts.guardName
 * @param {'ENFORCE'|'SHADOW'|'OFF'} opts.guardMode
 * @param {'PASS'|'REPLACED'|'SKIPPED'} opts.guardDecision
 * @param {string[]}        opts.reasonCodes
 * @param {boolean}         opts.replacementCreated
 * @param {boolean}         opts.replacementTerminal
 * @param {number|null}     opts.assistantRawIndex
 * @param {string|null}     opts.assistantId
 * @param {number|null}     opts.userRawIndex
 * @param {string|null}     opts.userId
 * @param {string}          opts.language
 * @param {string|null}     [opts.clientRequestId]
 * @param {string|null}     [opts.deliverySource]
 * @param {boolean|null}    [opts.responseCorrelated]
 * @param {boolean|null}    [opts.safeUpdateAccepted]
 * @param {boolean|null}    [opts.visibleCommitCompleted]
 * @returns {object}
 */
export function buildGuardProvenanceRecord({
  guardName,
  guardMode,
  guardDecision,
  reasonCodes,
  replacementCreated,
  replacementTerminal,
  assistantRawIndex,
  assistantId,
  userRawIndex,
  userId,
  language,
  clientRequestId = null,
  deliverySource = null,
  responseCorrelated = null,
  safeUpdateAccepted = null,
  visibleCommitCompleted = null,
}) {
  return Object.freeze({
    guard_name: guardName,
    guard_mode: guardMode,
    guard_decision: guardDecision,
    reason_codes: Array.isArray(reasonCodes) ? reasonCodes.slice(0, 8) : [],
    replacement_created: replacementCreated === true,
    replacement_terminal: replacementTerminal === true,
    assistant_raw_index: typeof assistantRawIndex === 'number' ? assistantRawIndex : null,
    assistant_id: typeof assistantId === 'string' ? assistantId : null,
    user_raw_index: typeof userRawIndex === 'number' ? userRawIndex : null,
    user_id: typeof userId === 'string' ? userId : null,
    language: typeof language === 'string' ? language : 'unknown',
    client_request_id: typeof clientRequestId === 'string' ? clientRequestId : null,
    delivery_source: typeof deliverySource === 'string' ? deliverySource : null,
    response_correlated: responseCorrelated,
    safe_update_accepted: safeUpdateAccepted,
    visible_commit_completed: visibleCommitCompleted,
  });
}

// ─── Mode-aware formulation guard wrapper ────────────────────────────────────

/**
 * Applies the formulation guard with the given mode.
 *
 * @param {Array<object>} rawMessages
 * @param {Array<object>} finalMessages   — message array entering the guard step
 * @param {object}        options
 * @param {string}        options.locale
 * @param {'ENFORCE'|'SHADOW'|'OFF'} options.mode
 * @param {string|null}   [options.clientRequestId]
 * @param {string|null}   [options.deliverySource]
 * @param {boolean|null}  [options.responseCorrelated]
 * @returns {{
 *   messages: Array<object>,
 *   pendingCorrection: object|null,
 *   provenance: object
 * }}
 */
export function applyFormulationGuardWithMode(rawMessages, finalMessages, options) {
  const locale = typeof options?.locale === 'string' ? options.locale : 'en';
  const mode = options?.mode === 'SHADOW' ? 'SHADOW'
    : options?.mode === 'OFF' ? 'OFF'
    : 'ENFORCE';
  const clientRequestId = options?.clientRequestId ?? null;
  const deliverySource = options?.deliverySource ?? null;
  const responseCorrelated = options?.responseCorrelated ?? null;

  const raw = Array.isArray(rawMessages) ? rawMessages : [];
  const final = Array.isArray(finalMessages) ? finalMessages : [];

  // ── OFF: skip guard entirely ───────────────────────────────────────────────
  if (mode === 'OFF') {
    const provenance = buildGuardProvenanceRecord({
      guardName: GUARD_NAME.FORMULATION,
      guardMode: 'OFF',
      guardDecision: GUARD_DECISION.SKIPPED,
      reasonCodes: [],
      replacementCreated: false,
      replacementTerminal: false,
      assistantRawIndex: null,
      assistantId: null,
      userRawIndex: null,
      userId: null,
      language: locale,
      clientRequestId,
      deliverySource,
      responseCorrelated,
      safeUpdateAccepted: null,
      visibleCommitCompleted: null,
    });
    return { messages: final, pendingCorrection: null, provenance };
  }

  // ── ENFORCE or SHADOW: run the guard ─────────────────────────────────────
  // guardResult.messages and guardResult.pendingCorrection are intentionally NOT
  // used for delivery — they are evaluated only to derive wasReplaced, guardDecision,
  // and reason_codes for provenance telemetry.  Do not "fix" this apparent discard:
  // restoring delivery of guardResult.messages would reintroduce the fallback bug.
  const guardResult = applyFormulationGuardToConversationMessages(raw, final, { locale });

  const replacedRawIndex = _findLastReplacedRawIndex(
    guardResult.messages,
    'formulation_guard_replaced'
  );
  const wasReplaced = replacedRawIndex !== null;
  const reasonCodes = wasReplaced
    ? _collectReasonCodes(guardResult.messages, 'formulation_guard_reason_codes')
    : [];

  const assistantRawIndex = (() => {
    // Use the replaced index when available; otherwise find the last assistant.
    if (wasReplaced) return replacedRawIndex;
    for (let i = final.length - 1; i >= 0; i--) {
      if (final[i]?.role === 'assistant') {
        return Number.isInteger(final[i].__rawIndex) ? final[i].__rawIndex : i;
      }
    }
    return null;
  })();

  const assistantMsg = assistantRawIndex !== null ? raw[assistantRawIndex] : null;
  const userRawIndex = (() => {
    if (assistantRawIndex === null) return null;
    for (let i = assistantRawIndex - 1; i >= 0; i--) {
      if (raw[i]?.role === 'user') return i;
    }
    return null;
  })();
  const userMsg = userRawIndex !== null ? raw[userRawIndex] : null;

  const guardDecision = wasReplaced ? GUARD_DECISION.REPLACED : GUARD_DECISION.PASS;

  // Non-safety guard delivery authority is revoked (Phase 1 remediation).
  // The guard evaluates and emits guard_decision, reason_codes, and diagnostics
  // for telemetry in all modes, but never applies a replacement to delivered messages.
  // Safety-critical output filtering is unaffected (separate pipeline).
  const provenance = buildGuardProvenanceRecord({
    guardName: GUARD_NAME.FORMULATION,
    guardMode: mode,
    guardDecision,
    reasonCodes,
    replacementCreated: false,
    replacementTerminal: false,
    assistantRawIndex,
    assistantId: _safeAssistantId(assistantMsg, assistantRawIndex),
    userRawIndex,
    userId: _safeUserId(userMsg, userRawIndex),
    language: locale,
    clientRequestId,
    deliverySource,
    responseCorrelated,
    safeUpdateAccepted: null,
    visibleCommitCompleted: null,
  });

  // ENFORCE and SHADOW: emit provenance for telemetry, but do NOT apply replacement.
  // Delivery authority of this non-safety guard is revoked; the original messages pass through.
  return { messages: final, pendingCorrection: null, provenance };
}

// ─── Mode-aware grounding guard wrapper ─────────────────────────────────────

/**
 * Applies the current-turn grounding guard with the given mode.
 *
 * @param {Array<object>} rawMessages
 * @param {Array<object>} finalMessages   — message array entering the guard step
 * @param {object}        options
 * @param {string}        options.locale
 * @param {'ENFORCE'|'SHADOW'|'OFF'} options.mode
 * @param {string|null}   [options.clientRequestId]
 * @param {string|null}   [options.deliverySource]
 * @param {boolean|null}  [options.responseCorrelated]
 * @returns {{
 *   messages: Array<object>,
 *   pendingCorrection: object|null,
 *   provenance: object
 * }}
 */
export function applyGroundingGuardWithMode(rawMessages, finalMessages, options) {
  const locale = typeof options?.locale === 'string' ? options.locale : 'en';
  const mode = options?.mode === 'SHADOW' ? 'SHADOW'
    : options?.mode === 'OFF' ? 'OFF'
    : 'ENFORCE';
  const clientRequestId = options?.clientRequestId ?? null;
  const deliverySource = options?.deliverySource ?? null;
  const responseCorrelated = options?.responseCorrelated ?? null;

  const raw = Array.isArray(rawMessages) ? rawMessages : [];
  const final = Array.isArray(finalMessages) ? finalMessages : [];

  // ── OFF: skip guard entirely ───────────────────────────────────────────────
  if (mode === 'OFF') {
    const provenance = buildGuardProvenanceRecord({
      guardName: GUARD_NAME.GROUNDING,
      guardMode: 'OFF',
      guardDecision: GUARD_DECISION.SKIPPED,
      reasonCodes: [],
      replacementCreated: false,
      replacementTerminal: false,
      assistantRawIndex: null,
      assistantId: null,
      userRawIndex: null,
      userId: null,
      language: locale,
      clientRequestId,
      deliverySource,
      responseCorrelated,
      safeUpdateAccepted: null,
      visibleCommitCompleted: null,
    });
    return { messages: final, pendingCorrection: null, provenance };
  }

  // ── ENFORCE or SHADOW: run the guard ─────────────────────────────────────
  // guardResult.messages and guardResult.pendingCorrection are intentionally NOT
  // used for delivery — they are evaluated only to derive wasReplaced, guardDecision,
  // and reason_codes for provenance telemetry.  Do not "fix" this apparent discard:
  // restoring delivery of guardResult.messages would reintroduce the fallback bug.
  const guardResult = applyCurrentTurnGroundingGuardToConversationMessages(raw, final, { locale });

  const replacedRawIndex = _findLastReplacedRawIndex(
    guardResult.messages,
    'current_turn_grounding_guard_replaced'
  );
  const wasReplaced = replacedRawIndex !== null;
  const reasonCodes = wasReplaced
    ? _collectReasonCodes(guardResult.messages, 'current_turn_grounding_guard_reason_codes')
    : [];

  const assistantRawIndex = (() => {
    if (wasReplaced) return replacedRawIndex;
    for (let i = final.length - 1; i >= 0; i--) {
      if (final[i]?.role === 'assistant') {
        return Number.isInteger(final[i].__rawIndex) ? final[i].__rawIndex : i;
      }
    }
    return null;
  })();

  const assistantMsg = assistantRawIndex !== null ? raw[assistantRawIndex] : null;
  const userRawIndex = (() => {
    if (assistantRawIndex === null) return null;
    for (let i = assistantRawIndex - 1; i >= 0; i--) {
      if (raw[i]?.role === 'user') return i;
    }
    return null;
  })();
  const userMsg = userRawIndex !== null ? raw[userRawIndex] : null;

  const guardDecision = wasReplaced ? GUARD_DECISION.REPLACED : GUARD_DECISION.PASS;

  // Non-safety guard delivery authority is revoked (Phase 1 remediation).
  // The guard evaluates and emits guard_decision, reason_codes, and diagnostics
  // for telemetry in all modes, but never applies a replacement to delivered messages.
  // Safety-critical output filtering is unaffected (separate pipeline).
  const provenance = buildGuardProvenanceRecord({
    guardName: GUARD_NAME.GROUNDING,
    guardMode: mode,
    guardDecision,
    reasonCodes,
    replacementCreated: false,
    replacementTerminal: false,
    assistantRawIndex,
    assistantId: _safeAssistantId(assistantMsg, assistantRawIndex),
    userRawIndex,
    userId: _safeUserId(userMsg, userRawIndex),
    language: locale,
    clientRequestId,
    deliverySource,
    responseCorrelated,
    safeUpdateAccepted: null,
    visibleCommitCompleted: null,
  });

  // ENFORCE and SHADOW: emit provenance for telemetry, but do NOT apply replacement.
  // Delivery authority of this non-safety guard is revoked; the original messages pass through.
  return { messages: final, pendingCorrection: null, provenance };
}

// ─── Provenance augmentation ─────────────────────────────────────────────────

/**
 * Returns a copy of a provenance record augmented with lifecycle outcome fields.
 *
 * Call this after safeUpdateMessages and the visible_commit reconcileSnapshot
 * call to complete the provenance chain.
 *
 * @param {object}       provenance        — record returned by applyFormulationGuardWithMode / applyGroundingGuardWithMode
 * @param {object}       lifecycle
 * @param {boolean|null} lifecycle.responseCorrelated
 * @param {boolean|null} lifecycle.safeUpdateAccepted
 * @param {boolean|null} lifecycle.visibleCommitCompleted
 * @param {string|null}  [lifecycle.deliverySource]       — actual delivery path (subscription/polling/etc.)
 * @returns {object}
 */
export function augmentProvenanceWithLifecycle(provenance, lifecycle) {
  if (!provenance || typeof provenance !== 'object') return provenance;
  const hasLifecycle = lifecycle !== null && lifecycle !== undefined;
  return Object.freeze({
    ...provenance,
    response_correlated: hasLifecycle
      ? (lifecycle.responseCorrelated !== undefined ? lifecycle.responseCorrelated : null)
      : provenance.response_correlated,
    safe_update_accepted: hasLifecycle
      ? (lifecycle.safeUpdateAccepted !== undefined ? lifecycle.safeUpdateAccepted : null)
      : provenance.safe_update_accepted,
    visible_commit_completed: hasLifecycle
      ? (lifecycle.visibleCommitCompleted !== undefined ? lifecycle.visibleCommitCompleted : null)
      : provenance.visible_commit_completed,
    // delivery_source: always record the actual lifecycle delivery path.
    delivery_source: hasLifecycle && typeof lifecycle.deliverySource === 'string'
      ? lifecycle.deliverySource
      : provenance.delivery_source,
  });
}

// ─── Causal evidence assessment ───────────────────────────────────────────────

/**
 * Assesses whether a guard family is PROVEN causal based on paired ENFORCE/SHADOW
 * runtime evidence.
 *
 * In SHADOW mode the guard still evaluates the candidate — it just does not apply
 * the replacement.  Therefore, when the guard fires on a given candidate, SHADOW
 * must also emit guard_decision=REPLACED (with replacement_created=false).  The
 * strong causal signal is therefore ENFORCE=REPLACED + SHADOW=REPLACED.
 *
 * Decision table:
 *
 *   ENFORCE=REPLACED  SHADOW=REPLACED  → causal=true  ('proven_causal')
 *     • ENFORCE: guard fired, replacement applied (replacement_created=true),
 *       safe_update_accepted=false and/or visible_commit_completed=false.
 *     • SHADOW: guard fired on the same candidate (replacement_created=false),
 *       same reason_codes, safe_update_accepted=true, visible_commit_completed=true.
 *
 *   ENFORCE=REPLACED  SHADOW=PASS      → causal=false ('non_deterministic_not_proven')
 *     • The underlying model candidate may differ between ENFORCE and SHADOW runs.
 *       The guard firing in ENFORCE but not in SHADOW cannot be attributed to the
 *       guard itself — it is more likely a consequence of a different model output.
 *
 *   ENFORCE=PASS      SHADOW=PASS      → causal=false ('enforce_passed_no_causal_signal')
 *   ENFORCE=PASS      SHADOW=REPLACED  → causal=false ('enforce_passed_shadow_replaced_inconsistent')
 *   either missing                     → causal=false ('missing_paired_evidence')
 *
 * @param {object|null} enforceRecord  — augmented provenance from the ENFORCE run
 * @param {object|null} shadowRecord   — augmented provenance from the SHADOW run
 * @returns {{ causal: boolean, reason: string }}
 */
export function assessCausalEvidence(enforceRecord, shadowRecord) {
  if (!enforceRecord || !shadowRecord) {
    return { causal: false, reason: 'missing_paired_evidence' };
  }
  const enforceReplaced = enforceRecord.guard_decision === GUARD_DECISION.REPLACED;
  const shadowReplaced = shadowRecord.guard_decision === GUARD_DECISION.REPLACED;
  const shadowPass = shadowRecord.guard_decision === GUARD_DECISION.PASS;

  if (enforceReplaced && shadowReplaced) {
    // Strong causal signal: ENFORCE replaced the candidate and SHADOW also detected
    // the violation (replacement_created=false in SHADOW because the mode suppresses
    // the actual replacement but the guard still fires).
    return { causal: true, reason: 'proven_causal' };
  }
  if (enforceReplaced && shadowPass) {
    // ENFORCE replaced but SHADOW passed — the underlying model candidate likely
    // differed between the two runs.  Cannot attribute causality to the guard.
    return { causal: false, reason: 'non_deterministic_not_proven' };
  }
  if (!enforceReplaced && shadowReplaced) {
    // ENFORCE=PASS, SHADOW=REPLACED — inconsistent: the guard fires in SHADOW but not
    // in ENFORCE.  This is not a recognisable causal pattern.
    return { causal: false, reason: 'enforce_passed_shadow_replaced_inconsistent' };
  }
  // Both PASS — no replacement signal in either run.
  void shadowPass; // exhaustiveness note: only remaining case
  return { causal: false, reason: 'enforce_passed_no_causal_signal' };
}
