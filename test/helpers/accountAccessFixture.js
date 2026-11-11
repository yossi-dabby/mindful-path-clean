// External accountAccess service response for tests of downstream functions.
// The service's real handler, denial and grant/revocation are tested separately.
export const accountAccessResult = (user, forms = user?.role === 'admin') => ({ data: {
  schema_version: 1, user_id: user?.id, policy_version: '2026-11-11',
  adult_status: 'confirmed', eligible: true, forms_review_allowed: forms,
} });
