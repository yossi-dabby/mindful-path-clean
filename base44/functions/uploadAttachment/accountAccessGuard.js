// Canonical guard. Local copies are required by the function bundler; the
// packaging test checks exact parity. Never load a sibling function at runtime.
export async function requireAccountAccess(client, user, { forms = false } = {}) {
  let result;
  try { result = await client.functions.invoke('accountAccess', { action: 'status' }); }
  catch (cause) {
    const status = cause?.response?.status ?? cause?.status;
    throw Object.assign(new Error([401, 403].includes(status) ? 'ACCESS_REQUIRED' : 'ACCESS_UNAVAILABLE'), {
      safe: true, status: [401, 403].includes(status) ? status : 503,
    });
  }
  const access = result?.data;
  if (typeof user?.id !== 'string' || !user.id || access?.schema_version !== 1 || access.user_id !== user?.id || access.policy_version !== '2026-11-11' || typeof access.eligible !== 'boolean') {
    throw Object.assign(new Error('ACCESS_UNAVAILABLE'), { safe: true, status: 503 });
  }
  if (!access.eligible || access.adult_status !== 'confirmed' || (forms && access.forms_review_allowed !== true)) {
    throw Object.assign(new Error('ACCESS_REQUIRED'), { safe: true, status: 403 });
  }
  return access;
}
