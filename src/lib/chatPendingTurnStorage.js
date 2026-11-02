const STORAGE_KEY_PREFIX = 'v2_pending_turn_';
const ALLOWED_STATUSES = new Set(['pending', 'sent', 'generating', 'timed_out']);
const POLICY_ALLOWED_STATUSES = new Set(['pending', 'applied', 'completed', 'abandoned']);

function getStorageKey(conversationId) {
  return `${STORAGE_KEY_PREFIX}${conversationId}`;
}


function sanitizeResponsePolicyMetadata(policy, conversationId) {
  if (!policy || typeof policy !== 'object') return null;
  const reasonCodes = Array.isArray(policy.reason_codes)
    ? policy.reason_codes.filter((item) => typeof item === 'string').slice(0, 6)
    : [];
  const status = typeof policy.status === 'string' && POLICY_ALLOWED_STATUSES.has(policy.status)
    ? policy.status
    : null;
  const generationIdentity =
    typeof policy.generation_identity === 'string' && policy.generation_identity.trim()
      ? policy.generation_identity.slice(0, 64)
      : null;
  const policyVersion =
    typeof policy.policy_version === 'string' && policy.policy_version.trim()
      ? policy.policy_version.slice(0, 64)
      : null;
  if (!policyVersion || !status) return null;
  return {
    policy_version: policyVersion,
    action_permitted: policy.action_permitted === true,
    intervention_mode: typeof policy.intervention_mode === 'string' ? policy.intervention_mode.slice(0, 64) : null,
    safety_override_required: policy.safety_override_required === true,
    policy_available: policy.policy_available !== false,
    reason_codes: reasonCodes,
    status,
    conversation_id: typeof policy.conversation_id === 'string' ? policy.conversation_id : conversationId,
    client_request_id: typeof policy.client_request_id === 'string' ? policy.client_request_id : null,
    generation_identity: generationIdentity,
  };
}

function getSessionStorage() {
  if (typeof window === 'undefined' || !window?.sessionStorage) return null;
  return window.sessionStorage;
}

export function persistPendingTurn(conversationId, turn) {
  if (!conversationId || !turn) return;
  const storage = getSessionStorage();
  if (!storage) return;

  const payload = {
    client_request_id: typeof turn.client_request_id === 'string' ? turn.client_request_id : null,
    conversation_id: typeof turn.conversation_id === 'string' ? turn.conversation_id : conversationId,
    created_at: typeof turn.created_at === 'string' ? turn.created_at : null,
    status: typeof turn.status === 'string' ? turn.status : null,
    response_policy: sanitizeResponsePolicyMetadata(turn.response_policy, conversationId),
  };

  if (!payload.client_request_id || !payload.conversation_id || !payload.created_at || !ALLOWED_STATUSES.has(payload.status)) {
    return;
  }

  try {
    storage.setItem(getStorageKey(conversationId), JSON.stringify(payload));
  } catch {
    // sessionStorage is best-effort only.
  }
}

export function restorePendingTurn(conversationId) {
  if (!conversationId) return null;
  const storage = getSessionStorage();
  if (!storage) return null;

  try {
    const raw = storage.getItem(getStorageKey(conversationId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      !parsed ||
      typeof parsed.client_request_id !== 'string' ||
      typeof parsed.conversation_id !== 'string' ||
      typeof parsed.created_at !== 'string' ||
      !ALLOWED_STATUSES.has(parsed.status)
    ) {
      return null;
    }
    return {
      ...parsed,
      response_policy: sanitizeResponsePolicyMetadata(parsed.response_policy, conversationId),
    };
  } catch {
    return null;
  }
}

export function clearPendingTurn(conversationId) {
  if (!conversationId) return;
  const storage = getSessionStorage();
  if (!storage) return;
  try {
    storage.removeItem(getStorageKey(conversationId));
  } catch {
    // sessionStorage is best-effort only.
  }
}
