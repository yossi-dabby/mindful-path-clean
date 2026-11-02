import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const THIS_DIR = dirname(fileURLToPath(import.meta.url));
const CONTRACT_PATH = resolve(THIS_DIR, '../../base44/functions/therapistRuntimeFlagSnapshot/runtimeFlagContract.ts');
const ENTRY_PATH = resolve(THIS_DIR, '../../base44/functions/therapistRuntimeFlagSnapshot/entry.ts');
const FRONTEND_TRANSPORT_PATH = resolve(THIS_DIR, '../../src/lib/therapistRuntimeFlagTransport.js');

const EXPECTED_FLAG_KEYS = [
  'THERAPIST_UPGRADE_ENABLED',
  'THERAPIST_UPGRADE_MEMORY_ENABLED',
  'THERAPIST_UPGRADE_SUMMARIZATION_ENABLED',
  'THERAPIST_UPGRADE_WORKFLOW_ENABLED',
  'THERAPIST_UPGRADE_RETRIEVAL_ORCHESTRATION_ENABLED',
  'THERAPIST_UPGRADE_ALLOWLIST_WRAPPER_ENABLED',
  'THERAPIST_UPGRADE_SAFETY_MODE_ENABLED',
  'THERAPIST_UPGRADE_FORMULATION_CONTEXT_ENABLED',
  'THERAPIST_UPGRADE_FORMULATION_LED_ENABLED',
  'THERAPIST_UPGRADE_CONTINUITY_ENABLED',
  'THERAPIST_UPGRADE_STRATEGY_ENABLED',
  'THERAPIST_UPGRADE_LONGITUDINAL_ENABLED',
  'THERAPIST_UPGRADE_KNOWLEDGE_ENABLED',
  'THERAPIST_UPGRADE_COMPETENCE_ENABLED',
  'THERAPIST_UPGRADE_PLANNER_FIRST_ENABLED',
  'CONTEXT_COMPOSER_V2_ENABLED',
  'CHAT_ORCHESTRATOR_V2_ENABLED',
];

function toStrictBoolean(rawValue) {
  return rawValue === 'true';
}

describe('therapistRuntimeFlagSnapshot backend contract', () => {
  it('uses schema therapist-runtime-flags-v1 in entry.ts', () => {
    const source = readFileSync(ENTRY_PATH, 'utf8');
    expect(source).toContain("THERAPIST_RUNTIME_FLAG_SCHEMA = 'therapist-runtime-flags-v1'");
  });

  it('uses fixed 17-key allowlist with expected VITE_* mappings in entry.ts', () => {
    const source = readFileSync(ENTRY_PATH, 'utf8');

    for (const key of EXPECTED_FLAG_KEYS) {
      expect(source).toContain(`${key}: 'VITE_${key}'`);
    }

    const mapEntries = source.match(/^[\s]{2}[A-Z0-9_]+:\s'VITE_[A-Z0-9_]+'/gm) ?? [];
    expect(mapEntries).toHaveLength(EXPECTED_FLAG_KEYS.length);
  });

  it('strict boolean semantics are exactly value === "true"', () => {
    expect(toStrictBoolean('true')).toBe(true);
    expect(toStrictBoolean('1')).toBe(false);
    expect(toStrictBoolean('TRUE')).toBe(false);
    expect(toStrictBoolean('false')).toBe(false);
    expect(toStrictBoolean(undefined)).toBe(false);
    expect(toStrictBoolean(null)).toBe(false);
  });

  it('entry handler enforces auth and performs read-only response', () => {
    const source = readFileSync(ENTRY_PATH, 'utf8');

    expect(source).toContain('const base44 = createClientFromRequest(req);');
    expect(source).toContain('const user = await base44.auth.me().catch(() => null);');
    expect(source).toContain('if (!user)');
    expect(source).toContain('status: 401');
    expect(source).toContain('buildTherapistRuntimeFlagSnapshot((envName) => Deno.env.get(envName))');
    expect(source).not.toContain('await req.json');
    expect(source).not.toContain('.create(');
    expect(source).not.toContain('.update(');
    expect(source).not.toContain('.delete(');
    expect(source).not.toContain('Deno.env.toObject');
  });

  it('entry source does not expose dynamic arbitrary env lookups', () => {
    const source = readFileSync(ENTRY_PATH, 'utf8');
    expect(source).not.toContain('Object.keys(Deno.env');
    expect(source).not.toContain('for (const key in Deno.env');
  });

  it('entry source has no local relative imports and keeps only Base44 SDK npm import', () => {
    const source = readFileSync(ENTRY_PATH, 'utf8');
    const importLines = source.match(/^import .*$/gm) ?? [];

    expect(importLines).toEqual([
      "import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';",
    ]);
    expect(source).not.toContain("from './");
    expect(source).not.toContain('from "../');
  });

  it('runtimeFlagContract.ts no longer exists under the function directory', () => {
    expect(existsSync(CONTRACT_PATH)).toBe(false);
  });

  it('frontend transport contract remains unchanged by backend packaging update', () => {
    const source = readFileSync(FRONTEND_TRANSPORT_PATH, 'utf8');
    expect(source).toContain("THERAPIST_RUNTIME_FLAG_SCHEMA = 'therapist-runtime-flags-v1'");
    expect(source).toContain("base44.functions.invoke('therapistRuntimeFlagSnapshot')");
    // Phase 0.2A: applied_to_active_wiring is now parameter-driven (no longer hardcoded false).
    // The diagnostic builder accepts appliedToActiveWiring so the gate can surface truth.
    expect(source).toContain('applied_to_active_wiring: appliedToActiveWiring === true');
  });
});
