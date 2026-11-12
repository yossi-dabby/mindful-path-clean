const inFlight = new Map();
const DAY = 86400000;
const RETRY_DELAY = 5 * 60000;
const ALLOWED_DAYS = [30, 90, 365, 999999];

// Only timestamps are cached; never cache content. Bind them to account AND
// policy, so switching users or shortening retention cannot suppress cleanup.
export async function runRetentionCleanup(client, { force = false, storage, now = Date.now } = {}) {
  const user = await client.auth.me();
  if (!user?.id) throw new Error('UNAUTHORIZED');
  const configured = Number(user.preferences?.data_retention_days);
  const days = ALLOWED_DAYS.includes(configured) ? configured : 365;
  const key = `mp_retention_v2:${user.id}:${days}`;
  if (inFlight.has(key)) return inFlight.get(key);
  let cache = storage;
  if (cache === undefined) { try { cache = globalThis.localStorage; } catch { /* Storage is optional. */ } }
  const read = suffix => { try { return Number(cache?.getItem(`${key}:${suffix}`)); } catch { return 0; } };
  const write = suffix => { try { cache?.setItem(`${key}:${suffix}`, String(now())); } catch { /* Server result is authoritative. */ } };
  const elapsed = timestamp => timestamp > 0 && timestamp <= now() ? now() - timestamp : Infinity;
  if (!force && (elapsed(read('success')) < DAY || elapsed(read('attempt')) < RETRY_DELAY)) return { deferred: true };
  const task = (async () => {
    write('attempt');
    const cursor = read('conversation_offset');
    const response = await client.functions.invoke('retentionCleanup', Number.isSafeInteger(cursor) && cursor > 0 ? { conversation_offset: cursor } : {});
    const result = response?.data ?? response;
    if (!result || typeof result.success !== 'boolean') throw new Error('CLEANUP_UNAVAILABLE');
    try { cache?.setItem(`${key}:conversation_offset`, String(Number.isSafeInteger(result.nextConversationOffset) && result.nextConversationOffset >= 0 ? result.nextConversationOffset : 0)); } catch { /* Optional resume hint. */ }
    if (result.success === true && result.partial !== true && !result.errors?.length && !result.pending?.length) write('success');
    else return { ...result, success: false };
    return result;
  })();
  inFlight.set(key, task);
  try { return await task; } finally { inFlight.delete(key); }
}
