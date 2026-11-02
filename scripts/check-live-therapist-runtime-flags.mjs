import { createClient } from '@base44/sdk';

const APP_ID = process.env.BASE44_APP_ID || '69504b725a07f5aa75aeaf7d';
const EXPECTED_EMAIL = 'yosephdabby4@gmail.com';
const REQUIRED_FLAGS = Object.freeze([
  'THERAPIST_RUNTIME_APPLY_ENABLED',
  'THERAPIST_UPGRADE_ENABLED',
  'THERAPIST_UPGRADE_SUMMARIZATION_ENABLED',
]);
const INFORMATIONAL_FLAGS = Object.freeze([
  'THERAPIST_UPGRADE_CONTINUITY_ENABLED',
  'THERAPIST_UPGRADE_LONGITUDINAL_ENABLED',
]);

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required secret: ${name}`);
  return value;
}

async function main() {
  const email = requiredEnv('BASE44_LIVE_TEST_EMAIL').toLowerCase();
  const password = requiredEnv('BASE44_LIVE_TEST_PASSWORD');
  if (email !== EXPECTED_EMAIL) {
    throw new Error(`Refusing to run: test email must be exactly ${EXPECTED_EMAIL}`);
  }

  const base44 = createClient({ appId: APP_ID });
  const login = await base44.auth.loginViaEmailPassword(email, password);
  const authenticatedEmail = login?.user?.email?.toLowerCase();
  if (authenticatedEmail !== EXPECTED_EMAIL) {
    throw new Error(`Authenticated as unexpected account: ${authenticatedEmail || '<unknown>'}`);
  }
  if (login.user.disabled) throw new Error('The dedicated test account is disabled');
  if (!login.user.is_verified) throw new Error('The dedicated test account is not verified');

  const response = await base44.functions.invoke('therapistRuntimeFlagSnapshot', {});
  const payload = response?.data ?? response;
  if (payload?.schema !== 'therapist-runtime-flags-v1' || !payload.flags) {
    throw new Error('Runtime flag snapshot is unavailable or has an unexpected schema');
  }

  for (const flag of [...REQUIRED_FLAGS, ...INFORMATIONAL_FLAGS]) {
    console.log(`[therapist-runtime-flags] ${flag}=${payload.flags[flag] === true}`);
  }

  const disabledRequiredFlags = REQUIRED_FLAGS.filter((flag) => payload.flags[flag] !== true);
  if (disabledRequiredFlags.length > 0) {
    throw new Error(
      `Application-owned therapist persistence is not active; disabled required flags: ${disabledRequiredFlags.join(', ')}`,
    );
  }

  console.log('[therapist-runtime-flags] required persistence flags are active');
}

main().catch((error) => {
  console.error(`[therapist-runtime-flags] failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
