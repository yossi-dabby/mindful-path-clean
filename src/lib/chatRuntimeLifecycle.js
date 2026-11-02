const DEFAULT_POLL_DELAYS = Object.freeze([500, 1000, 2000, 4000, 6500]);
const DEFAULT_MAX_POLL_ATTEMPTS = 5;
const FINAL_ASSISTANT_STATUSES = new Set(['done', 'completed', 'complete', 'final', 'finished']);
const COMPLETED_TOOL_CALL_STATUSES = new Set([
  'success',
  'succeeded',
  'done',
  'completed',
  'complete',
  'finished',
]);
const POST_REPLY_PERSISTENCE_TOOL_NAMES = new Set(['writetherapistmemory']);
const ADMINISTRATIVE_ASSISTANT_ACK_PATTERNS = [
  // Hebrew
  /^הרישום הקליני עודכן(?:[\s.!?,—-]|$)/,
  // English
  /^The clinical record has been updated(?:[\s.!?,—-]|$)/i,
  /^(?:The\s+)?memory has been updated(?:[\s.!?,—-]|$)/i,
  /^(?:The\s+)?record has been updated(?:[\s.!?,—-]|$)/i,
  /^Memory updated(?:[\s.!?,—-]|$)/i,
  /^Record updated(?:[\s.!?,—-]|$)/i,
  // Spanish (es)
  /^El registro clínico ha sido actualizado(?:[\s.!?,—-]|$)/,
  /^Registro actualizado(?:[\s.!?,—-]|$)/i,
  /^Memoria actualizada(?:[\s.!?,—-]|$)/i,
  // French (fr)
  /^Le dossier clinique a été mis à jour(?:[\s.!?,—-]|$)/,
  /^Enregistrement mis à jour(?:[\s.!?,—-]|$)/i,
  /^Mémoire mise à jour(?:[\s.!?,—-]|$)/i,
  // German (de)
  /^Die klinische Akte wurde aktualisiert(?:[\s.!?,—-]|$)/,
  /^Eintrag aktualisiert(?:[\s.!?,—-]|$)/i,
  /^Erinnerung aktualisiert(?:[\s.!?,—-]|$)/i,
  // Italian (it)
  /^Il registro clinico è stato aggiornato(?:[\s.!?,—-]|$)/,
  /^Registro aggiornato(?:[\s.!?,—-]|$)/i,
  /^Memoria aggiornata(?:[\s.!?,—-]|$)/i,
  // Portuguese (pt)
  /^O registro clínico foi atualizado(?:[\s.!?,—-]|$)/,
  /^Registro atualizado(?:[\s.!?,—-]|$)/i,
  /^Memória atualizada(?:[\s.!?,—-]|$)/i,
];

export function calculateExpectedReplyCount(currentMessageCount) {
  return currentMessageCount + 2;
}

export function getAssistantIdentityKey(msg, index) {
  if (!msg || msg.role !== 'assistant') return null;
  const rawIndex = Number.isInteger(msg.__rawIndex) ? msg.__rawIndex : null;
  if (rawIndex !== null) return `raw:${rawIndex}`;
  if (msg.id) return `id:${msg.id}`;
  const createdAt = typeof msg.created_at === 'string' ? msg.created_at : null;
  if (createdAt) return `created:${createdAt}|idx:${index}`;
  return `idx:${index}|role:${msg.role}`;
}

export function getAssistantIdentitySource(msg) {
  if (!msg || msg.role !== 'assistant') return 'not_assistant';
  if (Number.isInteger(msg.__rawIndex)) return 'raw_index';
  if (msg.id) return 'id';
  if (typeof msg.created_at === 'string' && msg.created_at.length > 0) return 'created_at_index';
  return 'fallback_index';
}

export function deduplicateMessagesByLifecycleKeys(newMessages, options = {}) {
  const seen = new Set();
  const deduplicated = [];
  const duplicateKeys = [];
  let turnId = Number.isInteger(options.startingTurnId) ? options.startingTurnId : 0;

  for (let i = 0; i < newMessages.length; i++) {
    const msg = newMessages[i];

    let msgKey;
    if (msg.id) {
      msgKey = msg.id;
    } else if (msg.created_at) {
      msgKey = `${msg.role}-${msg.created_at}-${i}`;
    } else {
      if (msg.role === 'assistant' && !msg._turn_id) {
        turnId++;
        msg._turn_id = turnId;
      }
      msgKey = msg._turn_id ? `turn-${msg._turn_id}` : `idx-${i}-${msg.role}`;
    }

    if (!seen.has(msgKey)) {
      seen.add(msgKey);
      deduplicated.push(msg);
    } else {
      duplicateKeys.push(msgKey);
    }
  }

  return {
    deduplicated,
    duplicateKeys,
    duplicatesBlocked: duplicateKeys.length,
    nextTurnId: turnId,
  };
}

export function shouldSuppressSubscriptionEventWhileLoading(isLoading, options = {}) {
  if (isLoading !== true) return false;
  if (!options || !Object.prototype.hasOwnProperty.call(options, 'hasAuthoritativePolling')) {
    return true;
  }
  return options.hasAuthoritativePolling === true;
}

export function getDefaultPollingLifecycle() {
  return {
    pollDelays: DEFAULT_POLL_DELAYS,
    maxPollAttempts: DEFAULT_MAX_POLL_ATTEMPTS,
  };
}

export function getPollingDelayForAttempt(attemptIndex, pollDelays = DEFAULT_POLL_DELAYS) {
  return pollDelays[Math.min(attemptIndex, pollDelays.length - 1)];
}

export function hasPollingAttemptTimedOut(pollAttempts, maxPollAttempts = DEFAULT_MAX_POLL_ATTEMPTS) {
  return pollAttempts >= maxPollAttempts;
}

export function selectLatestAssistantResponse(msgs) {
  const assistantEntries = (Array.isArray(msgs) ? msgs : [])
    .map((msg, index) => ({ msg, index }))
    .filter(({ msg }) => msg && msg.role === 'assistant');
  return assistantEntries.length > 0 ? assistantEntries[assistantEntries.length - 1] : null;
}

function getAssistantContentText(msg) {
  return typeof msg?.content === 'string' ? msg.content.trim() : '';
}

function isExplicitlyFinalAssistantMessage(msg) {
  const status = typeof msg?.status === 'string' ? msg.status.trim().toLowerCase() : '';
  const metadataStatus =
    typeof msg?.metadata?.status === 'string' ? msg.metadata.status.trim().toLowerCase() : '';
  return (
    FINAL_ASSISTANT_STATUSES.has(status) ||
    FINAL_ASSISTANT_STATUSES.has(metadataStatus) ||
    msg?.metadata?.is_final === true ||
    msg?.metadata?.final === true ||
    msg?.metadata?.completed === true
  );
}

function isAdministrativeAssistantAcknowledgement(msg) {
  const content = getAssistantContentText(msg).replace(/\s+/g, ' ');
  if (!content) return false;
  if (content.length > 320) return false;
  return ADMINISTRATIVE_ASSISTANT_ACK_PATTERNS.some((pattern) => pattern.test(content));
}

function hasCompletedPostReplyPersistenceToolCall(msg) {
  const toolCalls = Array.isArray(msg?.tool_calls) ? msg.tool_calls : [];
  return toolCalls.some((toolCall) => {
    const name = typeof toolCall?.name === 'string' ? toolCall.name.trim().toLowerCase() : '';
    if (!POST_REPLY_PERSISTENCE_TOOL_NAMES.has(name)) return false;

    const status = typeof toolCall?.status === 'string' ? toolCall.status.trim().toLowerCase() : '';
    const hasResult =
      Object.prototype.hasOwnProperty.call(toolCall || {}, 'results') &&
      toolCall.results !== null &&
      toolCall.results !== undefined;
    return COMPLETED_TOOL_CALL_STATUSES.has(status) || hasResult;
  });
}

function hasHiddenAssistantBoundary(previousAssistant, nextAssistant) {
  const previousRawIndex = Number.isInteger(previousAssistant?.__rawIndex) ? previousAssistant.__rawIndex : null;
  const nextRawIndex = Number.isInteger(nextAssistant?.__rawIndex) ? nextAssistant.__rawIndex : null;
  if (previousRawIndex === null || nextRawIndex === null) return false;
  return nextRawIndex - previousRawIndex > 1;
}

function normalizeAssistantContentForComparison(content) {
  return typeof content === 'string' ? content.replace(/\s+/g, ' ').trim() : '';
}

function assistantMessageSupersedes(previousAssistant, nextAssistant) {
  const previousContent = normalizeAssistantContentForComparison(previousAssistant?.content);
  const nextContent = normalizeAssistantContentForComparison(nextAssistant?.content);
  if (!previousContent || !nextContent) return false;
  if (previousContent === nextContent) return true;
  if (nextContent.startsWith(previousContent)) return true;

  const previousId = typeof previousAssistant?.id === 'string' ? previousAssistant.id : null;
  const nextId = typeof nextAssistant?.id === 'string' ? nextAssistant.id : null;
  return previousId !== null && nextId !== null && previousId === nextId;
}

function mergeAssistantMessages(previousAssistant, nextAssistant) {
  const previousContent = getAssistantContentText(previousAssistant);
  const nextContent = getAssistantContentText(nextAssistant);
  if (!previousContent) return nextAssistant;
  if (!nextContent) return previousAssistant;
  if (assistantMessageSupersedes(previousAssistant, nextAssistant)) {
    return nextAssistant;
  }
  return {
    ...previousAssistant,
    ...nextAssistant,
    metadata: {
      ...(previousAssistant?.metadata || {}),
      ...(nextAssistant?.metadata || {}),
    },
    content: `${previousContent}\n\n${nextContent}`,
  };
}

function buildAssistantSegmentBlocks(segment) {
  const blocks = [];
  let currentBlock = null;

  for (let i = 0; i < segment.length; i++) {
    const entry = segment[i];
    if (!entry || entry.role !== 'assistant') {
      currentBlock = null;
      continue;
    }

    const previousAssistant = currentBlock?.messages?.[currentBlock.messages.length - 1] || null;
    const startNewBlock = !currentBlock || hasHiddenAssistantBoundary(previousAssistant, entry);
    if (startNewBlock) {
      currentBlock = { messages: [] };
      blocks.push(currentBlock);
    }
    currentBlock.messages.push(entry);
  }

  return blocks;
}

function selectCanonicalAssistantWithinBlock(blockMessages) {
  const messages = Array.isArray(blockMessages) ? blockMessages.filter(Boolean) : [];
  if (messages.length === 0) return null;

  // Priority 1: latest explicitly-final non-administrative message.
  // Priority 2: preserve a completed post-reply persistence boundary. Base44 can
  // persist the therapeutic answer and its writeTherapistMemory call in one
  // assistant record, then append a complementary assistant continuation in the
  // next raw record. Those two records are one user-facing answer even though
  // their raw indexes are contiguous.
  // Priority 3: latest non-administrative message (progress -> final collapse).
  // Priority 4: last message in the block.
  const explicitlyFinalNonAdminMessages = [];
  const nonAdministrativeMessages = [];

  for (let i = 0; i < messages.length; i++) {
    const candidate = messages[i];
    const isAdmin = isAdministrativeAssistantAcknowledgement(candidate);
    if (!isAdmin) {
      nonAdministrativeMessages.push(candidate);
      if (isExplicitlyFinalAssistantMessage(candidate)) {
        explicitlyFinalNonAdminMessages.push(candidate);
      }
    }
  }

  if (explicitlyFinalNonAdminMessages.length > 0) {
    let canonical = explicitlyFinalNonAdminMessages[0];
    for (let i = 1; i < explicitlyFinalNonAdminMessages.length; i++) {
      canonical = mergeAssistantMessages(canonical, explicitlyFinalNonAdminMessages[i]);
    }
    return canonical;
  }

  if (nonAdministrativeMessages.length > 1) {
    let persistenceBoundaryIndex = -1;
    for (let i = nonAdministrativeMessages.length - 2; i >= 0; i--) {
      if (hasCompletedPostReplyPersistenceToolCall(nonAdministrativeMessages[i])) {
        persistenceBoundaryIndex = i;
        break;
      }
    }

    if (persistenceBoundaryIndex >= 0) {
      let canonical = nonAdministrativeMessages[persistenceBoundaryIndex];
      for (let i = persistenceBoundaryIndex + 1; i < nonAdministrativeMessages.length; i++) {
        canonical = mergeAssistantMessages(canonical, nonAdministrativeMessages[i]);
      }
      return canonical;
    }
  }

  if (nonAdministrativeMessages.length > 0) {
    return nonAdministrativeMessages[nonAdministrativeMessages.length - 1];
  }
  return messages[messages.length - 1];
}

function selectCanonicalAssistantForSegment(segment) {
  const assistantBlocks = buildAssistantSegmentBlocks(segment)
    .map((block) => selectCanonicalAssistantWithinBlock(block.messages))
    .filter(Boolean);
  if (assistantBlocks.length === 0) return null;

  const substantiveAssistants = assistantBlocks.filter((msg) => !isAdministrativeAssistantAcknowledgement(msg));
  const candidates = substantiveAssistants.length > 0 ? substantiveAssistants : assistantBlocks;

  let canonical = candidates[0];
  for (let i = 1; i < candidates.length; i++) {
    const candidate = candidates[i];
    if (isAdministrativeAssistantAcknowledgement(candidate) && !isAdministrativeAssistantAcknowledgement(canonical)) {
      continue;
    }
    if (assistantMessageSupersedes(canonical, candidate)) {
      canonical = candidate;
      continue;
    }
    canonical = mergeAssistantMessages(canonical, candidate);
  }

  return canonical;
}

export function normalizeLegacyVisibleAssistantBlocks(msgs) {
  const messages = Array.isArray(msgs) ? msgs : [];
  if (messages.length <= 1) return messages;

  const normalized = [];
  for (let i = 0; i < messages.length; i++) {
    const current = messages[i];
    if (!current || current.role !== 'user') {
      normalized.push(current);
      continue;
    }

    normalized.push(current);

    let segmentEnd = i + 1;
    while (segmentEnd < messages.length && messages[segmentEnd]?.role !== 'user') {
      segmentEnd++;
    }

    const segment = messages.slice(i + 1, segmentEnd);
    const canonicalAssistant = selectCanonicalAssistantForSegment(segment);
    const lastAssistantIndex = (() => {
      for (let j = segment.length - 1; j >= 0; j--) {
        if (segment[j]?.role === 'assistant') return j;
      }
      return -1;
    })();

    segment.forEach((entry, segmentIndex) => {
      if (!entry) return;
      if (entry.role !== 'assistant') {
        normalized.push(entry);
        return;
      }
      if (segmentIndex === lastAssistantIndex && canonicalAssistant) {
        normalized.push(canonicalAssistant);
      }
    });

    i = segmentEnd - 1;
  }

  return normalized;
}

export function applyLegacyVisibleAssistantNormalizationGate(finalMessages, chatOrchestratorV2Enabled) {
  // Correlation and orchestration operate on the raw snapshot. The visible layer
  // must still guarantee one canonical assistant bubble per user turn in both
  // legacy and V2 runtimes.
  void chatOrchestratorV2Enabled;
  return normalizeLegacyVisibleAssistantBlocks(finalMessages);
}

export function buildPendingCorrectionPrefix(correctionBlocks) {
  return correctionBlocks.length > 0 ? `${correctionBlocks.join('\n\n')}\n\n` : '';
}

export function buildOutboundUserMessageContent({
  runtimeSupplement,
  formulationSupplement,
  qualitySupplement,
  messageText,
}) {
  const workflowSupplement = runtimeSupplement || formulationSupplement;
  return [workflowSupplement, qualitySupplement, messageText]
    .filter(Boolean)
    .join('\n\n');
}

export function hasCorrectionBlockAttached(pendingCorrectionPrefix) {
  return typeof pendingCorrectionPrefix === 'string' && pendingCorrectionPrefix.length > 0;
}

const CORRECTION_BLOCK_PATTERN = /=== (?:FORMULATION CONTRACT CORRECTION|CURRENT-TURN GROUNDING CORRECTION) — NEXT TURN ONLY ===/;

export function containsCorrectionBlock(content) {
  if (typeof content !== 'string' || content.length === 0) return false;
  return CORRECTION_BLOCK_PATTERN.test(content);
}

export function wasCorrectionBlockSanitized(rawMessages, sanitizedMessages) {
  const raw = Array.isArray(rawMessages) ? rawMessages : [];
  const sanitized = Array.isArray(sanitizedMessages) ? sanitizedMessages : [];
  for (let i = 0; i < raw.length; i++) {
    const rawMsg = raw[i];
    if (!rawMsg || rawMsg.role !== 'user' || typeof rawMsg.content !== 'string') continue;
    if (!containsCorrectionBlock(rawMsg.content)) continue;
    const sanitizedMsg = sanitized[i];
    if (!sanitizedMsg || sanitizedMsg.role !== 'user') return true;
    if (!containsCorrectionBlock(sanitizedMsg.content)) return true;
  }
  return false;
}

export function buildS2DebugLifecycleDiagnostic(fields = {}) {
  const payload = {};
  if (typeof fields.correlation_mode === 'string') payload.correlation_mode = fields.correlation_mode;
  if (Number.isFinite(fields.active_request_count)) payload.active_request_count = fields.active_request_count;
  if (Number.isFinite(fields.expected_reply_count)) payload.expected_reply_count = fields.expected_reply_count;
  if (typeof fields.delivery_source === 'string') payload.delivery_source = fields.delivery_source;
  if (Number.isFinite(fields.polling_attempt)) payload.polling_attempt = fields.polling_attempt;
  if (typeof fields.polling_exhausted === 'boolean') payload.polling_exhausted = fields.polling_exhausted;
  if (typeof fields.subscription_event_suppressed === 'boolean') {
    payload.subscription_event_suppressed = fields.subscription_event_suppressed;
  }
  if (typeof fields.assistant_identity_source === 'string') {
    payload.assistant_identity_source = fields.assistant_identity_source;
  }
  if (typeof fields.correction_block_sanitized === 'boolean') {
    payload.correction_block_sanitized = fields.correction_block_sanitized;
  }
  if (typeof fields.internal_correction_pending === 'boolean') {
    payload.internal_correction_pending = fields.internal_correction_pending;
  }
  if (typeof fields.correction_type === 'string' || fields.correction_type === null) {
    payload.correction_type = fields.correction_type;
  }
  if (typeof fields.instruction_channel === 'string') {
    payload.instruction_channel = fields.instruction_channel;
  }
  if (typeof fields.outbound_content_clean === 'boolean') {
    payload.outbound_content_clean = fields.outbound_content_clean;
  }
  if (typeof fields.historical_block_detected === 'boolean') {
    payload.historical_block_detected = fields.historical_block_detected;
  }
  if (typeof fields.historical_block_sanitized === 'boolean') {
    payload.historical_block_sanitized = fields.historical_block_sanitized;
  }
  if (typeof fields.correction_consumed === 'boolean') {
    payload.correction_consumed = fields.correction_consumed;
  }
  if (typeof fields.conversation_scope_match === 'boolean') {
    payload.conversation_scope_match = fields.conversation_scope_match;
  }
  if (typeof fields.action_permitted === 'boolean' || fields.action_permitted === null) {
    payload.action_permitted = fields.action_permitted;
  }
  if (typeof fields.response_policy_enforced === 'boolean') {
    payload.response_policy_enforced = fields.response_policy_enforced;
  }
  if (typeof fields.lts_read_state === 'string') payload.lts_read_state = fields.lts_read_state;
  if (typeof fields.lts_warming_up === 'boolean') payload.lts_warming_up = fields.lts_warming_up;
  if (typeof fields.formulation_led_configured === 'boolean') {
    payload.formulation_led_configured = fields.formulation_led_configured;
  }
  if (typeof fields.formulation_led_injected === 'boolean') {
    payload.formulation_led_injected = fields.formulation_led_injected;
  }
  // Bounded V2 lifecycle fields (no message or clinical content).
  if (typeof fields.client_request_id === 'string' || fields.client_request_id === null) {
    payload.client_request_id = fields.client_request_id;
  }
  if (typeof fields.phase === 'string') payload.phase = fields.phase;
  if (typeof fields.response_correlated === 'boolean') payload.response_correlated = fields.response_correlated;
  if (typeof fields.safe_update_accepted === 'boolean') payload.safe_update_accepted = fields.safe_update_accepted;
  if (typeof fields.visible_commit_completed === 'boolean') payload.visible_commit_completed = fields.visible_commit_completed;
  if (typeof fields.active_turn_status === 'string' || fields.active_turn_status === null) {
    payload.active_turn_status = fields.active_turn_status;
  }
  if (typeof fields.polling_continues === 'boolean') payload.polling_continues = fields.polling_continues;
  if (typeof fields.rejection_reason === 'string') payload.rejection_reason = fields.rejection_reason;
  if (typeof fields.terminal_reason === 'string') payload.terminal_reason = fields.terminal_reason;
  return payload;
}
