/**
 * @file test/utils/backendMemoryLTSRuntimeAuthority.test.js
 *
 * PR #923 — Runtime authority bridge for therapist memory / continuity / LTS
 *
 * Tests the new runtime-authority gate functions in:
 *   - base44/functions/retrieveTherapistMemory/entry.ts
 *   - base44/functions/writeTherapistMemory/entry.ts
 *   - base44/functions/writeLTSSnapshot/entry.ts
 *
 * Test numbers match the PR #923 spec:
 *
 * BACKEND MEMORY (tests 13–16):
 *  13. APPLY=true + VITE MASTER=true + VITE MEMORY=true  → enabled
 *  14. APPLY=true + MASTER=false                          → disabled
 *  15. APPLY=true + MEMORY=false                          → disabled
 *  16. APPLY=false                                        → legacy THERAPIST_UPGRADE_MEMORY_ENABLED semantics
 *
 * BACKEND LTS (tests 17–21):
 *  17. APPLY=true + MASTER=true + SUM=true + LONGITUDINAL=true → enabled
 *  18. MASTER=false → disabled
 *  19. SUM=false    → disabled
 *  20. LONGITUDINAL=false → disabled
 *  21. APPLY=false  → exact legacy longitudinal semantics
 *
 * CONSTRAINTS:
 * - No capability flags activated.
 * - No live backend required (gate functions are extracted via TS transpilation).
 * - No skip / fixme.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import ts from 'typescript';

// ─── Gate function loader helpers ─────────────────────────────────────────────

function loadGateFunctionFromSource(source, fnName) {
  const match = source.match(
    new RegExp(`function ${fnName}\\([\\s\\S]*?\\n}\\n`),
  );
  expect(match, `${fnName} gate helper must exist in source`).not.toBeNull();

  const transpiled = ts.transpileModule(
    `${match[0]}\nexport { ${fnName} };`,
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
      },
    },
  );

  const module = { exports: {} };
  const runModule = new Function('module', 'exports', transpiled.outputText);
  runModule(module, module.exports);
  return module.exports[fnName];
}

function readEnvFrom(values) {
  return (name) => values[name];
}

// ─── Load gate functions ──────────────────────────────────────────────────────

const retrieveSource = readFileSync(
  resolve('base44/functions/retrieveTherapistMemory/entry.ts'),
  'utf8',
);

const writeMemSource = readFileSync(
  resolve('base44/functions/writeTherapistMemory/entry.ts'),
  'utf8',
);

const writeLTSSource = readFileSync(
  resolve('base44/functions/writeLTSSnapshot/entry.ts'),
  'utf8',
);

const isRetrieveTherapistMemoryEnabled = loadGateFunctionFromSource(
  retrieveSource,
  'isRetrieveTherapistMemoryEnabled',
);

const isWriteTherapistMemoryEnabled = loadGateFunctionFromSource(
  writeMemSource,
  'isWriteTherapistMemoryEnabled',
);

const isWriteLTSSnapshotEnabled = loadGateFunctionFromSource(
  writeLTSSource,
  'isWriteLTSSnapshotEnabled',
);

// ─── BACKEND MEMORY tests (13–16): retrieveTherapistMemory ───────────────────

describe('isRetrieveTherapistMemoryEnabled — Test 13: APPLY=true + VITE MASTER=true + VITE MEMORY=true → enabled', () => {
  it('13. retrieve gate open when all runtime flags true', () => {
    const enabled = isRetrieveTherapistMemoryEnabled(readEnvFrom({
      THERAPIST_RUNTIME_APPLY_ENABLED: 'true',
      VITE_THERAPIST_UPGRADE_ENABLED: 'true',
      VITE_THERAPIST_UPGRADE_MEMORY_ENABLED: 'true',
      THERAPIST_UPGRADE_MEMORY_ENABLED: 'false',
    }));
    expect(enabled).toBe(true);
  });
});

describe('isRetrieveTherapistMemoryEnabled — Test 14: APPLY=true + MASTER=false → disabled', () => {
  it('14. retrieve gate closed when VITE MASTER is false', () => {
    const enabled = isRetrieveTherapistMemoryEnabled(readEnvFrom({
      THERAPIST_RUNTIME_APPLY_ENABLED: 'true',
      VITE_THERAPIST_UPGRADE_ENABLED: 'false',
      VITE_THERAPIST_UPGRADE_MEMORY_ENABLED: 'true',
      THERAPIST_UPGRADE_MEMORY_ENABLED: 'true',
    }));
    expect(enabled).toBe(false);
  });
});

describe('isRetrieveTherapistMemoryEnabled — Test 15: APPLY=true + MEMORY=false → disabled', () => {
  it('15. retrieve gate closed when VITE MEMORY is false', () => {
    const enabled = isRetrieveTherapistMemoryEnabled(readEnvFrom({
      THERAPIST_RUNTIME_APPLY_ENABLED: 'true',
      VITE_THERAPIST_UPGRADE_ENABLED: 'true',
      VITE_THERAPIST_UPGRADE_MEMORY_ENABLED: 'false',
      THERAPIST_UPGRADE_MEMORY_ENABLED: 'true',
    }));
    expect(enabled).toBe(false);
  });
});

describe('isRetrieveTherapistMemoryEnabled — Test 16: APPLY=false → legacy semantics', () => {
  it('16a. APPLY=false + legacy MEMORY=true → retrieve enabled (legacy)', () => {
    const enabled = isRetrieveTherapistMemoryEnabled(readEnvFrom({
      THERAPIST_RUNTIME_APPLY_ENABLED: 'false',
      THERAPIST_UPGRADE_MEMORY_ENABLED: 'true',
      VITE_THERAPIST_UPGRADE_ENABLED: 'false',
      VITE_THERAPIST_UPGRADE_MEMORY_ENABLED: 'false',
    }));
    expect(enabled).toBe(true);
  });

  it('16b. APPLY=false + legacy MEMORY=false → retrieve disabled (legacy)', () => {
    const enabled = isRetrieveTherapistMemoryEnabled(readEnvFrom({
      THERAPIST_RUNTIME_APPLY_ENABLED: 'false',
      THERAPIST_UPGRADE_MEMORY_ENABLED: 'false',
      VITE_THERAPIST_UPGRADE_ENABLED: 'true',
      VITE_THERAPIST_UPGRADE_MEMORY_ENABLED: 'true',
    }));
    expect(enabled).toBe(false);
  });

  it("16c. absent APPLY (not 'true') → legacy path", () => {
    const enabled = isRetrieveTherapistMemoryEnabled(readEnvFrom({
      THERAPIST_UPGRADE_MEMORY_ENABLED: 'true',
    }));
    expect(enabled).toBe(true);
  });
});

// ─── BACKEND MEMORY tests (13–16): writeTherapistMemory ──────────────────────

describe('isWriteTherapistMemoryEnabled — Test 13: APPLY=true + VITE MASTER=true + VITE MEMORY=true → enabled', () => {
  it('13-write. write gate open when all runtime flags true', () => {
    const enabled = isWriteTherapistMemoryEnabled(readEnvFrom({
      THERAPIST_RUNTIME_APPLY_ENABLED: 'true',
      VITE_THERAPIST_UPGRADE_ENABLED: 'true',
      VITE_THERAPIST_UPGRADE_MEMORY_ENABLED: 'true',
      THERAPIST_UPGRADE_MEMORY_ENABLED: 'false',
    }));
    expect(enabled).toBe(true);
  });
});

describe('isWriteTherapistMemoryEnabled — Test 14: APPLY=true + MASTER=false → disabled', () => {
  it('14-write. write gate closed when VITE MASTER is false', () => {
    const enabled = isWriteTherapistMemoryEnabled(readEnvFrom({
      THERAPIST_RUNTIME_APPLY_ENABLED: 'true',
      VITE_THERAPIST_UPGRADE_ENABLED: 'false',
      VITE_THERAPIST_UPGRADE_MEMORY_ENABLED: 'true',
      THERAPIST_UPGRADE_MEMORY_ENABLED: 'true',
    }));
    expect(enabled).toBe(false);
  });
});

describe('isWriteTherapistMemoryEnabled — Test 15: APPLY=true + MEMORY=false → disabled', () => {
  it('15-write. write gate closed when VITE MEMORY is false', () => {
    const enabled = isWriteTherapistMemoryEnabled(readEnvFrom({
      THERAPIST_RUNTIME_APPLY_ENABLED: 'true',
      VITE_THERAPIST_UPGRADE_ENABLED: 'true',
      VITE_THERAPIST_UPGRADE_MEMORY_ENABLED: 'false',
      THERAPIST_UPGRADE_MEMORY_ENABLED: 'true',
    }));
    expect(enabled).toBe(false);
  });
});

describe('isWriteTherapistMemoryEnabled — Test 16: APPLY=false → legacy semantics', () => {
  it('16-write-a. APPLY=false + legacy MEMORY=true → write enabled (legacy)', () => {
    const enabled = isWriteTherapistMemoryEnabled(readEnvFrom({
      THERAPIST_RUNTIME_APPLY_ENABLED: 'false',
      THERAPIST_UPGRADE_MEMORY_ENABLED: 'true',
      VITE_THERAPIST_UPGRADE_ENABLED: 'false',
      VITE_THERAPIST_UPGRADE_MEMORY_ENABLED: 'false',
    }));
    expect(enabled).toBe(true);
  });

  it('16-write-b. APPLY=false + legacy MEMORY=false → write disabled (legacy)', () => {
    const enabled = isWriteTherapistMemoryEnabled(readEnvFrom({
      THERAPIST_RUNTIME_APPLY_ENABLED: 'false',
      THERAPIST_UPGRADE_MEMORY_ENABLED: 'false',
      VITE_THERAPIST_UPGRADE_ENABLED: 'true',
      VITE_THERAPIST_UPGRADE_MEMORY_ENABLED: 'true',
    }));
    expect(enabled).toBe(false);
  });
});

// ─── BACKEND LTS tests (17–21): writeLTSSnapshot ─────────────────────────────

describe('isWriteLTSSnapshotEnabled — Test 17: all runtime flags true → enabled', () => {
  it('17. LTS write gate open when APPLY=true + MASTER=true + SUM=true + LONGITUDINAL=true', () => {
    const enabled = isWriteLTSSnapshotEnabled(readEnvFrom({
      THERAPIST_RUNTIME_APPLY_ENABLED: 'true',
      VITE_THERAPIST_UPGRADE_ENABLED: 'true',
      VITE_THERAPIST_UPGRADE_SUMMARIZATION_ENABLED: 'true',
      VITE_THERAPIST_UPGRADE_LONGITUDINAL_ENABLED: 'true',
      THERAPIST_UPGRADE_LONGITUDINAL_ENABLED: 'false',
    }));
    expect(enabled).toBe(true);
  });
});

describe('isWriteLTSSnapshotEnabled — Test 18: MASTER=false → disabled', () => {
  it('18. LTS write gate closed when VITE MASTER is false', () => {
    const enabled = isWriteLTSSnapshotEnabled(readEnvFrom({
      THERAPIST_RUNTIME_APPLY_ENABLED: 'true',
      VITE_THERAPIST_UPGRADE_ENABLED: 'false',
      VITE_THERAPIST_UPGRADE_SUMMARIZATION_ENABLED: 'true',
      VITE_THERAPIST_UPGRADE_LONGITUDINAL_ENABLED: 'true',
      THERAPIST_UPGRADE_LONGITUDINAL_ENABLED: 'true',
    }));
    expect(enabled).toBe(false);
  });
});

describe('isWriteLTSSnapshotEnabled — Test 19: SUM=false → disabled', () => {
  it('19. LTS write gate closed when VITE SUM is false', () => {
    const enabled = isWriteLTSSnapshotEnabled(readEnvFrom({
      THERAPIST_RUNTIME_APPLY_ENABLED: 'true',
      VITE_THERAPIST_UPGRADE_ENABLED: 'true',
      VITE_THERAPIST_UPGRADE_SUMMARIZATION_ENABLED: 'false',
      VITE_THERAPIST_UPGRADE_LONGITUDINAL_ENABLED: 'true',
      THERAPIST_UPGRADE_LONGITUDINAL_ENABLED: 'true',
    }));
    expect(enabled).toBe(false);
  });
});

describe('isWriteLTSSnapshotEnabled — Test 20: LONGITUDINAL=false → disabled', () => {
  it('20. LTS write gate closed when VITE LONGITUDINAL is false', () => {
    const enabled = isWriteLTSSnapshotEnabled(readEnvFrom({
      THERAPIST_RUNTIME_APPLY_ENABLED: 'true',
      VITE_THERAPIST_UPGRADE_ENABLED: 'true',
      VITE_THERAPIST_UPGRADE_SUMMARIZATION_ENABLED: 'true',
      VITE_THERAPIST_UPGRADE_LONGITUDINAL_ENABLED: 'false',
      THERAPIST_UPGRADE_LONGITUDINAL_ENABLED: 'true',
    }));
    expect(enabled).toBe(false);
  });
});

describe('isWriteLTSSnapshotEnabled — Test 21: APPLY=false → exact legacy semantics', () => {
  it('21a. APPLY=false + legacy LONGITUDINAL=true → LTS enabled (legacy)', () => {
    const enabled = isWriteLTSSnapshotEnabled(readEnvFrom({
      THERAPIST_RUNTIME_APPLY_ENABLED: 'false',
      THERAPIST_UPGRADE_LONGITUDINAL_ENABLED: 'true',
      VITE_THERAPIST_UPGRADE_ENABLED: 'false',
      VITE_THERAPIST_UPGRADE_SUMMARIZATION_ENABLED: 'false',
      VITE_THERAPIST_UPGRADE_LONGITUDINAL_ENABLED: 'false',
    }));
    expect(enabled).toBe(true);
  });

  it('21b. APPLY=false + legacy LONGITUDINAL=false → LTS disabled (legacy)', () => {
    const enabled = isWriteLTSSnapshotEnabled(readEnvFrom({
      THERAPIST_RUNTIME_APPLY_ENABLED: 'false',
      THERAPIST_UPGRADE_LONGITUDINAL_ENABLED: 'false',
      VITE_THERAPIST_UPGRADE_ENABLED: 'true',
      VITE_THERAPIST_UPGRADE_SUMMARIZATION_ENABLED: 'true',
      VITE_THERAPIST_UPGRADE_LONGITUDINAL_ENABLED: 'true',
    }));
    expect(enabled).toBe(false);
  });

  it("21c. absent APPLY (not 'true') → legacy path", () => {
    const enabled = isWriteLTSSnapshotEnabled(readEnvFrom({
      THERAPIST_UPGRADE_LONGITUDINAL_ENABLED: 'true',
    }));
    expect(enabled).toBe(true);
  });
});

// ─── Strict string semantics ──────────────────────────────────────────────────

describe('Strict string semantics — non-exact values fail closed', () => {
  it('VITE MASTER non-exact (TRUE) fails closed for retrieve', () => {
    const enabled = isRetrieveTherapistMemoryEnabled(readEnvFrom({
      THERAPIST_RUNTIME_APPLY_ENABLED: 'true',
      VITE_THERAPIST_UPGRADE_ENABLED: 'TRUE',
      VITE_THERAPIST_UPGRADE_MEMORY_ENABLED: 'true',
    }));
    expect(enabled).toBe(false);
  });

  it('VITE LONGITUDINAL non-exact (1) fails closed for LTS', () => {
    const enabled = isWriteLTSSnapshotEnabled(readEnvFrom({
      THERAPIST_RUNTIME_APPLY_ENABLED: 'true',
      VITE_THERAPIST_UPGRADE_ENABLED: 'true',
      VITE_THERAPIST_UPGRADE_SUMMARIZATION_ENABLED: 'true',
      VITE_THERAPIST_UPGRADE_LONGITUDINAL_ENABLED: '1',
    }));
    expect(enabled).toBe(false);
  });
});
