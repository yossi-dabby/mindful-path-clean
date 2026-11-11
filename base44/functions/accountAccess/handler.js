export const AGE_POLICY_VERSION = '2026-11-11';
const LANGUAGES = new Set(['en', 'he', 'es', 'fr', 'de', 'it', 'pt']);
const HEADERS = { 'Cache-Control': 'private, no-store', Vary: 'Authorization' };
const fail = (status, code) => Object.assign(new Error(code), { status, code });

async function readInput(req) {
  const reader = req.body?.getReader();
  if (!reader) throw fail(400, 'INVALID_REQUEST');
  let length = 0;
  const chunks = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 4096) throw fail(413, 'REQUEST_TOO_LARGE');
      chunks.push(value);
    }
  } catch (error) { await reader.cancel().catch(() => {}); throw error; }
  let input;
  try { input = JSON.parse(await new Blob(chunks).text()); }
  catch { throw fail(400, 'INVALID_REQUEST'); }
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw fail(400, 'INVALID_REQUEST');
  const allowed = {
    status: ['action'],
    attest: ['action', 'adult', 'policy_version', 'language'],
    lookup: ['action', 'email'],
    grant_forms: ['action', 'email', 'user_id'],
    revoke_forms: ['action', 'email', 'user_id'],
  }[input.action];
  if (!allowed || Object.keys(input).some(key => !allowed.includes(key))) throw fail(400, 'INVALID_REQUEST');
  return input;
}

async function readRecord(entity, userId) {
  const rows = await entity.filter({ subject_user_id: userId }, '-created_date', 2);
  // A duplicate must never silently choose the more permissive record. The
  // provider has no documented atomic upsert/unique constraint for this entity.
  if (!Array.isArray(rows) || rows.length > 1 || rows.some(row => row?.subject_user_id !== userId || !row?.id)) {
    throw fail(503, 'ACCESS_UNAVAILABLE');
  }
  return rows[0] || null;
}

function statusFor(user, record) {
  const current = record?.policy_version === AGE_POLICY_VERSION;
  const declined = record?.adult_status === 'declined';
  const eligible = current && record?.adult_status === 'confirmed' && !!record?.attested_at && user.mp_account_deletion_pending !== true;
  return {
    ...(user.mp_account_deletion_pending === true ? { deletion_pending: true } : {}),
    schema_version: 1,
    user_id: user.id,
    policy_version: AGE_POLICY_VERSION,
    adult_status: declined ? 'declined' : eligible ? 'confirmed' : 'pending',
    eligible,
    forms_review_allowed: eligible && (user.role === 'admin' || record?.forms_review_allowed === true),
  };
}

// AccountAccess remains the source of truth. Entity RLS cannot join that table,
// so publish only a locked, server-maintained projection on the built-in User.
// A missing projection denies direct entity calls until status succeeds.
async function syncRecordAccess(client, user, record) {
  const users = client.asServiceRole.entities.User;
  const currentUser = await users.get(user.id);
  if (currentUser?.id !== user.id || currentUser.disabled === true) throw fail(503, 'ACCESS_UNAVAILABLE');
  const status = statusFor(currentUser, record);
  const policy = status.eligible ? AGE_POLICY_VERSION : '';
  if (currentUser.mp_adult_policy !== policy || typeof currentUser.mp_account_deletion_pending !== 'boolean') {
    await users.update(user.id, { mp_adult_policy: policy,
      ...(typeof currentUser.mp_account_deletion_pending !== 'boolean' ? { mp_account_deletion_pending: false } : {}) });
  }
  // Detect a declaration/deletion changing while the projection was written.
  // Base44 has no documented multi-record transaction; never report a stale
  // grant as successful. Live concurrency verification remains a rollout gate.
  const latest = await readRecord(client.asServiceRole.entities.AccountAccess, user.id);
  const verifiedUser = await users.get(user.id);
  const verified = statusFor(verifiedUser || {}, latest);
  if (verifiedUser?.id !== user.id || verifiedUser.mp_adult_policy !== (verified.eligible ? AGE_POLICY_VERSION : '') ||
      status.eligible !== verified.eligible || latest?.id !== record?.id || latest?.adult_status !== record?.adult_status) {
    await users.update(user.id, { mp_adult_policy: '' });
    throw fail(503, 'ACCESS_UNAVAILABLE');
  }
  return verified;
}

export async function handleAccountAccess(req, { createClientFromRequest, now = () => new Date().toISOString() }) {
  const reply = (body, status = 200) => Response.json(body, { status, headers: HEADERS });
  if (req.method !== 'POST') return reply({ error: 'METHOD_NOT_ALLOWED' }, 405);
  let client, user, checkedInput = false;
  try {
    client = createClientFromRequest(req);
    try { user = await client.auth.me(); }
    catch (error) {
      if ([401, 403].includes(error?.status ?? error?.response?.status)) throw fail(401, 'UNAUTHORIZED');
      throw fail(503, 'ACCESS_UNAVAILABLE');
    }
    if (!user?.id || !user?.email || user.disabled === true) throw fail(401, 'UNAUTHORIZED');
    const input = await readInput(req);
    checkedInput = true;
    const entity = client.asServiceRole.entities.AccountAccess;
    const record = await readRecord(entity, user.id);
    const self = await syncRecordAccess(client, user, record);
    if (input.action === 'status') return reply(self);
    if (input.action === 'attest') {
      if (typeof input.adult !== 'boolean' || input.policy_version !== AGE_POLICY_VERSION || !LANGUAGES.has(input.language)) {
        throw fail(400, 'INVALID_ATTESTATION');
      }
      // A prior under-18 declaration cannot be cleared by a new browser or a
      // second click. A correction needs a support review, not a client flag.
      if (self.adult_status === 'declined') throw fail(403, 'AGE_RESTRICTED');
      if (self.eligible && input.adult) return reply(self);
      if (user.mp_account_deletion_pending === true) throw fail(403, 'AGE_RESTRICTED');
      // Revoke before changing the source, including an adult -> under-18 declaration.
      await client.asServiceRole.entities.User.update(user.id, { mp_adult_policy: '' });
      const values = {
        subject_user_id: user.id,
        adult_status: input.adult ? 'confirmed' : 'declined',
        policy_version: AGE_POLICY_VERSION,
        attested_at: now(),
        attestation_language: input.language,
      };
      if (record) await entity.update(record.id, values);
      else await entity.create({ ...values, forms_review_allowed: false });
      // Re-read so concurrent first submissions fail closed on duplicates.
      return reply(await syncRecordAccess(client, user, await readRecord(entity, user.id)));
    }
    if (user.role !== 'admin' || !self.eligible) throw fail(403, 'FORBIDDEN');
    if (typeof input.email !== 'string' || input.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
      throw fail(400, 'INVALID_REQUEST');
    }
    const email = input.email.toLowerCase();
    const matches = await client.asServiceRole.entities.User.filter({ email }, '-created_date', 2);
    if (!Array.isArray(matches) || matches.length !== 1 || !matches[0]?.id || matches[0]?.email?.toLowerCase() !== email) {
      throw fail(404, 'ACCOUNT_NOT_FOUND');
    }
    const target = matches[0];
    if (target.disabled === true) throw fail(403, 'ACCOUNT_DISABLED');
    const targetRecord = await readRecord(entity, target.id);
    const targetStatus = statusFor(target, targetRecord);
    if (input.action !== 'lookup') {
      if (input.user_id !== target.id) throw fail(409, 'ACCOUNT_CHANGED');
      // Admin access follows the platform role; this panel only grants the
      // narrow forms-review capability and never modifies a platform role.
      if (target.role === 'admin') throw fail(409, 'ADMIN_ROLE_ACCESS');
      if (!targetRecord || (input.action === 'grant_forms' && !targetStatus.eligible)) throw fail(409, 'ADULT_CONFIRMATION_REQUIRED');
      await entity.update(targetRecord.id, {
        forms_review_allowed: input.action === 'grant_forms',
        forms_updated_at: now(),
        forms_updated_by: user.id,
      });
    }
    return reply({ ...statusFor(target, await readRecord(entity, target.id)), email: target.email, administrator: target.role === 'admin' });
  } catch (error) {
    if (checkedInput && user?.id && (!error?.code || error.code === 'ACCESS_UNAVAILABLE')) {
      // Best-effort revocation if the source could not be verified. A provider
      // outage can also prevent this write; no claim of transactional revocation.
      try { await client.asServiceRole.entities.User.update(user.id, { mp_adult_policy: '' }); } catch { /* return closed */ }
    }
    const known = ['INVALID_REQUEST', 'REQUEST_TOO_LARGE', 'ACCESS_UNAVAILABLE', 'UNAUTHORIZED', 'INVALID_ATTESTATION', 'AGE_RESTRICTED', 'FORBIDDEN', 'ACCOUNT_NOT_FOUND', 'ACCOUNT_DISABLED', 'ACCOUNT_CHANGED', 'ADMIN_ROLE_ACCESS', 'ADULT_CONFIRMATION_REQUIRED'];
    return reply({ error: known.includes(error?.code) ? error.code : 'ACCESS_UNAVAILABLE' }, known.includes(error?.code) ? error.status : 503);
  }
}
