import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import ts from 'typescript';

const source = readFileSync(
  resolve('base44/functions/generateSessionSummary/entry.ts'),
  'utf8',
);

function loadGateResolver() {
  const match = source.match(
    /function isGenerateSessionSummaryEnabled\([\s\S]*?\n}\n/,
  );

  expect(match, 'generateSessionSummary gate helper must exist').not.toBeNull();

  const transpiled = ts.transpileModule(
    `${match[0]}\nexport { isGenerateSessionSummaryEnabled };`,
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
  return module.exports.isGenerateSessionSummaryEnabled;
}

const isGenerateSessionSummaryEnabled = loadGateResolver();

function readEnvFrom(values) {
  return (name) => values[name];
}

describe('generateSessionSummary runtime-authority gate', () => {
  it('6. APPLY=true + VITE MASTER=true + VITE SUMMARIZATION=true → backend gate open', () => {
    const enabled = isGenerateSessionSummaryEnabled(
      readEnvFrom({
        THERAPIST_RUNTIME_APPLY_ENABLED: 'true',
        VITE_THERAPIST_UPGRADE_ENABLED: 'true',
        VITE_THERAPIST_UPGRADE_SUMMARIZATION_ENABLED: 'true',
        THERAPIST_UPGRADE_SUMMARIZATION_ENABLED: 'false',
      }),
    );

    expect(enabled).toBe(true);
  });

  it('7. APPLY=true + VITE MASTER=false + VITE SUMMARIZATION=true → gated', () => {
    const enabled = isGenerateSessionSummaryEnabled(
      readEnvFrom({
        THERAPIST_RUNTIME_APPLY_ENABLED: 'true',
        VITE_THERAPIST_UPGRADE_ENABLED: 'false',
        VITE_THERAPIST_UPGRADE_SUMMARIZATION_ENABLED: 'true',
        THERAPIST_UPGRADE_SUMMARIZATION_ENABLED: 'true',
      }),
    );

    expect(enabled).toBe(false);
  });

  it('8. APPLY=true + VITE MASTER=true + VITE SUMMARIZATION=false → gated', () => {
    const enabled = isGenerateSessionSummaryEnabled(
      readEnvFrom({
        THERAPIST_RUNTIME_APPLY_ENABLED: 'true',
        VITE_THERAPIST_UPGRADE_ENABLED: 'true',
        VITE_THERAPIST_UPGRADE_SUMMARIZATION_ENABLED: 'false',
        THERAPIST_UPGRADE_SUMMARIZATION_ENABLED: 'true',
      }),
    );

    expect(enabled).toBe(false);
  });

  it('9. APPLY=false preserves exact legacy backend gate semantics', () => {
    const legacyOn = isGenerateSessionSummaryEnabled(
      readEnvFrom({
        THERAPIST_RUNTIME_APPLY_ENABLED: 'false',
        THERAPIST_UPGRADE_SUMMARIZATION_ENABLED: 'true',
        VITE_THERAPIST_UPGRADE_ENABLED: 'false',
        VITE_THERAPIST_UPGRADE_SUMMARIZATION_ENABLED: 'false',
      }),
    );

    const legacyOff = isGenerateSessionSummaryEnabled(
      readEnvFrom({
        THERAPIST_RUNTIME_APPLY_ENABLED: 'false',
        THERAPIST_UPGRADE_SUMMARIZATION_ENABLED: 'false',
        VITE_THERAPIST_UPGRADE_ENABLED: 'true',
        VITE_THERAPIST_UPGRADE_SUMMARIZATION_ENABLED: 'true',
      }),
    );

    expect(legacyOn).toBe(true);
    expect(legacyOff).toBe(false);
  });

  it("10. absent/non-exact 'true' values fail closed in runtime-authority mode", () => {
    const masterMissing = isGenerateSessionSummaryEnabled(
      readEnvFrom({
        THERAPIST_RUNTIME_APPLY_ENABLED: 'true',
        VITE_THERAPIST_UPGRADE_SUMMARIZATION_ENABLED: 'true',
        THERAPIST_UPGRADE_SUMMARIZATION_ENABLED: 'true',
      }),
    );

    const summarizationNonExact = isGenerateSessionSummaryEnabled(
      readEnvFrom({
        THERAPIST_RUNTIME_APPLY_ENABLED: 'true',
        VITE_THERAPIST_UPGRADE_ENABLED: 'true',
        VITE_THERAPIST_UPGRADE_SUMMARIZATION_ENABLED: 'TRUE',
        THERAPIST_UPGRADE_SUMMARIZATION_ENABLED: 'true',
      }),
    );

    expect(masterMissing).toBe(false);
    expect(summarizationNonExact).toBe(false);
  });
});
