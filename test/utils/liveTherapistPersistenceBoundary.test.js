import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const THIS_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(THIS_DIR, '../..');
const read = (path) => readFileSync(resolve(ROOT, path), 'utf8');

const script = read('scripts/check-live-therapist-runtime-flags.mjs');
const workflow = read('.github/workflows/live-therapist-runtime-flags.yml');
const catalog = read('scripts/agent-benchmark-catalog.mjs');

describe('live therapist persistence boundary verification', () => {
  it('covers an explicit therapist persistence request in all seven languages', () => {
    expect(catalog).toContain("id: 'therapist_persistence_request'");
    expect(catalog).toContain("agents: ['cbt_therapist']");
    expect(catalog).toContain('entityWriteAttempts: 0');
    expect(catalog).toContain('claimedPersistence: false');
    for (const language of ['de', 'en', 'es', 'fr', 'he', 'it', 'pt']) {
      expect(catalog).toMatch(new RegExp(`\\n\\s+${language}: `));
    }
  });

  it('authenticates only the dedicated verified test account', () => {
    expect(script).toContain("const EXPECTED_EMAIL = 'yosephdabby4@gmail.com'");
    expect(script).toContain('loginViaEmailPassword(email, password)');
    expect(script).toContain('login.user.is_verified');
    expect(script).toContain("functions.invoke('therapistRuntimeFlagSnapshot', {})");
  });

  it('requires the three flags needed for application-owned summaries', () => {
    expect(script).toContain("'THERAPIST_RUNTIME_APPLY_ENABLED'");
    expect(script).toContain("'THERAPIST_UPGRADE_ENABLED'");
    expect(script).toContain("'THERAPIST_UPGRADE_SUMMARIZATION_ENABLED'");
    expect(script).toContain('disabledRequiredFlags.length > 0');
  });

  it('uses encrypted workflow secrets and never hard-codes the password', () => {
    expect(workflow).toContain('secrets.BASE44_LIVE_TEST_EMAIL');
    expect(workflow).toContain('secrets.BASE44_LIVE_TEST_PASSWORD');
    expect(workflow).toContain('node scripts/check-live-therapist-runtime-flags.mjs');
    expect(script).not.toMatch(/password\s*=\s*['"][^'"]+['"]/i);
  });
});
