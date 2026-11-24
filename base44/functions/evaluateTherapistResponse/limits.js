export const DAILY_LIMIT = 20;
export const MIN_INTERVAL_MS = 15000;
export const QUOTA_TIME_ZONE = 'Asia/Jerusalem';
const MAX_BODY_BYTES = 128 * 1024;
const dayFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: QUOTA_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
});

export class TrainingLimitError extends Error {
  constructor(status, code, quota = undefined, retryAfter = undefined) {
    super(code);
    Object.assign(this, { status, code, quota, retryAfter });
  }
}
const fail = (status, code) => new TrainingLimitError(status, code);
export const quotaDay = (now) => {
  const parts = Object.fromEntries(dayFormat.formatToParts(new Date(now)).map(p => [p.type, p.value]));
  return parts.year + '-' + parts.month + '-' + parts.day;
};

// Find the next local midnight without assuming a 24-hour day (Israel DST).
export function nextQuotaReset(now) {
  const day = quotaDay(now);
  let low = Math.floor(now / 1000), high = low + 27 * 3600;
  while (high - low > 1) {
    const mid = Math.floor((low + high) / 2);
    if (quotaDay(mid * 1000) === day) low = mid;
    else high = mid;
  }
  return high * 1000;
}

function stateFrom(row, userId, now) {
  if (!row || row.id !== userId || row.disabled === true || row.mp_account_deletion_pending === true) {
    throw fail(403, 'TRAINING_UNAVAILABLE');
  }
  const state = {
    day: row.mp_training_day ?? '',
    count: row.mp_training_count ?? 0,
    nextAt: row.mp_training_next_at ?? 0,
    revision: row.mp_training_revision ?? 0,
  };
  if (!Number.isSafeInteger(state.count) || state.count < 0 || state.count > DAILY_LIMIT ||
      !Number.isSafeInteger(state.nextAt) || state.nextAt < 0 ||
      !Number.isSafeInteger(state.revision) || state.revision < 0 || state.revision >= Number.MAX_SAFE_INTEGER ||
      typeof state.day !== 'string' || (state.day && !/^\d{4}-\d{2}-\d{2}$/.test(state.day)) ||
      state.day > quotaDay(now) || (!state.day && state.count !== 0)) {
    throw fail(503, 'TRAINING_USAGE_UNAVAILABLE');
  }
  return state;
}

function metadata(state, now) {
  return {
    limit: DAILY_LIMIT,
    remaining: DAILY_LIMIT - (state.day === quotaDay(now) ? state.count : 0),
    reset_at: new Date(nextQuotaReset(now)).toISOString(),
    next_allowed_at: new Date(state.nextAt).toISOString(),
    min_interval_seconds: MIN_INTERVAL_MS / 1000,
    time_zone: QUOTA_TIME_ZONE,
  };
}

export async function trainingUsage(users, userId, clock = Date.now) {
  const row = await users.get(userId);
  const now = clock();
  return metadata(stateFrom(row, userId, now), now);
}

export async function reserveTrainingUsage(users, userId, clock = Date.now) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const row = await users.get(userId);
    const now = clock();
    const state = stateFrom(row, userId, now);
    const quota = metadata(state, now);
    if (quota.remaining === 0) {
      throw new TrainingLimitError(429, 'TRAINING_DAILY_LIMIT', quota,
        Math.max(1, Math.ceil((Date.parse(quota.reset_at) - now) / 1000)));
    }
    if (state.nextAt > now) {
      throw new TrainingLimitError(429, 'TRAINING_RATE_LIMIT', quota,
        Math.max(1, Math.ceil((state.nextAt - now) / 1000)));
    }

    const next = {
      day: quotaDay(now), count: DAILY_LIMIT - quota.remaining + 1,
      nextAt: now + MIN_INTERVAL_MS, revision: state.revision + 1,
    };
    // Base44 rechecks conditions atomically only with ONE plain id.
    // Use the pre-existing User record: no upsert/create race on first use.
    const query = row.mp_training_revision == null
      ? { id: userId, $or: [
          { mp_training_revision: { $exists: false } },
          { mp_training_revision: null },
        ] }
      : { id: userId, mp_training_revision: state.revision };
    const result = await users.updateMany(query, { $set: {
      mp_training_day: next.day,
      mp_training_count: next.count,
      mp_training_next_at: next.nextAt,
      mp_training_revision: next.revision,
    } });
    if (result?.updated === 1) return metadata(next, now);
    if (result?.updated !== 0) throw fail(503, 'TRAINING_USAGE_UNAVAILABLE');
    // A concurrent caller won. Read fresh state and apply its new limit/cooldown.
  }
  throw fail(503, 'TRAINING_USAGE_UNAVAILABLE');
}

export async function readTrainingInput(req) {
  const reader = req.body?.getReader();
  if (!reader) throw fail(400, 'TRAINING_INVALID_INPUT');
  const chunks = [];
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_BODY_BYTES) throw fail(413, 'TRAINING_INPUT_TOO_LARGE');
      chunks.push(value);
    }
  } catch (error) {
    await reader.cancel().catch(() => {});
    throw error;
  }
  let body;
  try { body = JSON.parse(await new Blob(chunks).text()); }
  catch { throw fail(400, 'TRAINING_INVALID_INPUT'); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw fail(400, 'TRAINING_INVALID_INPUT');
  if (body.action === 'status' && Object.keys(body).length === 1) return { action: 'status' };
  if (Object.keys(body).some(key => !['scenario', 'conversationHistory', 'therapistResponse'].includes(key))) {
    throw fail(400, 'TRAINING_INVALID_INPUT');
  }
  const text = (value, max) => typeof value === 'string' && value.trim().length > 0 && value.length <= max;
  if (!text(body.scenario?.description, 4000) || !text(body.scenario?.patientProfile, 8000) ||
      !text(body.therapistResponse, 4000) || !Array.isArray(body.conversationHistory) ||
      body.conversationHistory.length > 24 || body.conversationHistory.some(message =>
        !message || !['patient', 'therapist'].includes(message.role) || !text(message.content, 4000)) ||
      body.conversationHistory.reduce((total, message) => total + message.content.length, 0) > 30000) {
    throw fail(400, 'TRAINING_INVALID_INPUT');
  }
  return {
    scenario: { description: body.scenario.description, patientProfile: body.scenario.patientProfile },
    therapistResponse: body.therapistResponse.trim(),
    conversationHistory: body.conversationHistory.map(({ role, content }) => ({ role, content })),
  };
}
