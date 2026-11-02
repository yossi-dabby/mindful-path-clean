/* global __S2_V8_BUILD_SHA__, __S2_V8_BUILD_TIMESTAMP__ */

const DEFAULT_MAX_TURNS = 80;
const DEFAULT_MAX_EVENTS_PER_TURN = 12;

export function isS2DebugEnabledFromSearch(search) {
  const value = new URLSearchParams(search || '').get('_s2debug');
  if (!value) return false;
  const normalized = String(value).trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
}

/**
 * Merges the `_s2` and `_s2debug` params from an entry search string into a
 * (possibly modified) current search string, returning the merged `?...` string.
 *
 * Called by Chat before every internal replace-navigation so that the diagnostic
 * query params survive pdfViewerReturn, intent cleanup, and Base44 SDK routing.
 *
 * Rules:
 *  - Only `_s2` and `_s2debug` are ever copied from `entrySearch`.
 *  - If a key already exists in `currentSearch`, it is NOT overwritten.
 *  - If neither search has any params the result is `''`.
 *  - Never persists across browser sessions — only merges within one URL string.
 */
export function mergeEntryDiagnosticParams(currentSearch, entrySearch) {
  const current = new URLSearchParams(currentSearch || '');
  const entry = new URLSearchParams(entrySearch || '');
  for (const key of ['_s2', '_s2debug']) {
    if (entry.has(key) && !current.has(key)) {
      current.set(key, entry.get(key));
    }
  }
  const str = current.toString();
  return str ? `?${str}` : '';
}

export function hashBoundedText(value) {
  if (typeof value !== 'string' || value.length === 0) return null;
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a32:${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

export function normalizeSnippet(value, maxLen = 160) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const normalized = value
    .replace(/\s+/g, ' ')
    .replace(/\u200e|\u200f/g, '')
    .trim();
  return normalized.length > maxLen ? normalized.slice(0, maxLen) : normalized;
}

export function summarizeText(value) {
  if (typeof value !== 'string') return { length: 0, hash: null };
  return { length: value.length, hash: hashBoundedText(value) };
}

export function normalizeTraceSource(sourceLabel) {
  const label = String(sourceLabel || '').toLowerCase();
  if (label.includes('subscription')) return 'subscription';
  if (label.includes('polling')) return 'polling';
  if (label.includes('refetch')) return 'refetch';
  if (label.includes('hydrate') || label.includes('loadconversation')) return 'hydration';
  return 'unknown';
}

function createTraceSkeleton(buildSha, buildTimestamp) {
  return {
    schema: 's2-v8-trace-v1',
    build: {
      sha: buildSha || 'unknown',
      timestamp: buildTimestamp || 'unknown',
    },
    activeStage: null,
    turns: [],
  };
}

export function createS2V8TraceCollector(options = {}) {
  const enabled = options.enabled === true;
  const maxTurns = Number.isInteger(options.maxTurns) ? options.maxTurns : DEFAULT_MAX_TURNS;
  const maxEvents = Number.isInteger(options.maxEventsPerTurn)
    ? options.maxEventsPerTurn
    : DEFAULT_MAX_EVENTS_PER_TURN;
  const buildSha = options.buildSha
    || (typeof __S2_V8_BUILD_SHA__ !== 'undefined' ? __S2_V8_BUILD_SHA__ : null)
    || 'unknown';
  const buildTimestamp = options.buildTimestamp
    || (typeof __S2_V8_BUILD_TIMESTAMP__ !== 'undefined' ? __S2_V8_BUILD_TIMESTAMP__ : null)
    || 'unknown';

  const trace = createTraceSkeleton(buildSha, buildTimestamp);
  const indexByKey = new Map();

  const boundedClone = () => ({
    schema: trace.schema,
    build: { ...trace.build },
    activeStage: trace.activeStage,
    turns: trace.turns.map((turn) => ({
      assistantIdentity: { ...turn.assistantIdentity },
      events: turn.events.map((event) => ({ ...event })),
    })),
  });

  const ensureTurn = (assistantKey, assistantIdentity) => {
    if (!assistantKey) return null;
    const existingIndex = indexByKey.get(assistantKey);
    if (existingIndex !== undefined) {
      const existing = trace.turns[existingIndex];
      existing.assistantIdentity = {
        id: assistantIdentity?.id || existing.assistantIdentity.id || null,
        rawIndex: Number.isInteger(assistantIdentity?.rawIndex) ? assistantIdentity.rawIndex : existing.assistantIdentity.rawIndex,
        created_at: assistantIdentity?.created_at || existing.assistantIdentity.created_at || null,
        key: assistantKey,
      };
      return existing;
    }

    const turn = {
      assistantIdentity: {
        id: assistantIdentity?.id || null,
        rawIndex: Number.isInteger(assistantIdentity?.rawIndex) ? assistantIdentity.rawIndex : null,
        created_at: assistantIdentity?.created_at || null,
        key: assistantKey,
      },
      events: [],
    };
    trace.turns.push(turn);
    indexByKey.set(assistantKey, trace.turns.length - 1);

    while (trace.turns.length > maxTurns) {
      const removed = trace.turns.shift();
      if (removed?.assistantIdentity?.key) {
        indexByKey.delete(removed.assistantIdentity.key);
      }
      trace.turns.forEach((item, idx) => {
        if (item?.assistantIdentity?.key) indexByKey.set(item.assistantIdentity.key, idx);
      });
    }

    return turn;
  };

  const recordEvent = (eventInput = {}) => {
    if (!enabled) return false;
    const assistantKey = eventInput?.assistantIdentity?.key || null;
    if (!assistantKey) return false;
    const turn = ensureTurn(assistantKey, eventInput.assistantIdentity);
    if (!turn) return false;

    const event = {
      at: eventInput.at || new Date().toISOString(),
      source: normalizeTraceSource(eventInput.source),
      sourceLabel: eventInput.source || null,
      finality: eventInput.finality || null,
      pipeline: eventInput.pipeline || null,
      groundingGuard: eventInput.groundingGuard || null,
      pendingGroundingCorrection: eventInput.pendingGroundingCorrection === true,
      safeUpdate: eventInput.safeUpdate || null,
      finalizedIdentity: eventInput.finalizedIdentity || null,
      visibleCounts: eventInput.visibleCounts || null,
    };

    turn.events.push(event);
    while (turn.events.length > maxEvents) {
      turn.events.shift();
    }

    trace.activeStage = event.sourceLabel || event.source;
    return true;
  };

  const clearWindowExposure = (targetWindow) => {
    if (!targetWindow) return;
    delete targetWindow.__S2_V8_TRACE__;
    delete targetWindow.copyS2V8Trace;
  };

  const expose = (targetWindow) => {
    if (!targetWindow) return;
    if (!enabled) {
      clearWindowExposure(targetWindow);
      return;
    }
    targetWindow.__S2_V8_TRACE__ = trace;
    targetWindow.copyS2V8Trace = () => JSON.stringify(boundedClone(), null, 2);
  };

  return {
    enabled,
    recordEvent,
    expose,
    getSnapshot: boundedClone,
  };
}
