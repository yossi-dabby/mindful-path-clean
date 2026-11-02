const RECOVERABLE_AUTH_ERROR_TYPES = new Set(['auth_timeout', 'unknown']);

export function shouldRecoverAuthOnOnline(authError) {
  return RECOVERABLE_AUTH_ERROR_TYPES.has(authError?.type);
}
