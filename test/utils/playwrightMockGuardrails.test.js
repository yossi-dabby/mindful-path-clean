/**
 * Playwright mock and assertion hardening — static source-contract guardrails
 *
 * These tests analyze the E2E test source code at the text/AST level to enforce
 * rules that prevent recurring Playwright / E2E failure patterns identified in
 * the stabilization sprint (PR-8).
 *
 * They do NOT run a browser. They are fast, deterministic Vitest unit tests.
 *
 * Rules enforced:
 *   1. mockApi must NOT use a broad page.route('**\/*') catch-all.
 *   2. mockApi must NOT mock static PDF or /public/forms/ asset paths.
 *   3. mockApi must have the JS-module MIME guard that prevents JSON responses
 *      being served for JS/TS source files.
 *   4. mockApi must scope its primary route handler to /api/ paths only.
 *   5. The conversation route ordering comment must be present (documents that
 *      POST /messages is checked before the broader GET by-ID handler).
 *   6. No committed E2E spec file may contain test.skip(…).
 *   7. No committed E2E spec file may contain test.fixme(…).
 *   8. No E2E spec file may use a bare page.route('**\/*') catch-all without
 *      an explicit justification comment on the same or preceding line.
 *
 * Design notes:
 *   - Text-based checks are used intentionally; they are fast and do not require
 *     a build step. The patterns are anchored to specific call syntax to avoid
 *     false positives from comments or string literals.
 *   - If a rule needs to be temporarily relaxed for a documented reason, update
 *     this file with an inline explanation rather than deleting the guard.
 */

import { describe, test, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../../');

function readRepoFile(relPath) {
  return fs.readFileSync(path.join(REPO_ROOT, relPath), 'utf8');
}

function listE2ESpecs() {
  const dir = path.join(REPO_ROOT, 'tests/e2e');
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.spec.ts'))
    .map((f) => ({ name: f, content: fs.readFileSync(path.join(dir, f), 'utf8') }));
}

// ---------------------------------------------------------------------------
// mockApi helper source-contract
// ---------------------------------------------------------------------------

describe('mockApi helper — source-contract', () => {
  const src = readRepoFile('tests/helpers/ui.ts');

  test('does not register a broad page.route(**/*) catch-all', () => {
    // A route('**/*') without qualification intercepts ALL requests, including
    // static assets, JS modules, CSS, and PDF files, breaking the app silently.
    expect(src).not.toMatch(/page\.route\(\s*['"`]\*\*\/\*['"`]/);
  });

  test('primary route handler is scoped to the /api/ namespace', () => {
    // The handler pattern must contain /api/ so that non-API URLs are never
    // routed through the JSON mock by default.
    expect(src).toMatch(/\*\*\/api\/\*\*/);
  });

  test('has a JS/TS module file guard that calls route.continue()', () => {
    // Without this guard the **/api/** pattern can match source files whose
    // path contains "api" (e.g. /src/api/base44Client.js) and return JSON,
    // which triggers a strict-MIME-type browser error for module scripts.
    expect(src).toMatch(/\.(js|jsx|ts|tsx|mjs|cjs)/);
    expect(src).toMatch(/route\.continue\(\)/);
  });

  test('does not mock /public/forms/ static asset paths', () => {
    // PDF files under /public/forms/ must resolve as real static files in
    // tests. Mocking them would hide missing-asset regressions silently.
    expect(src).not.toMatch(/\/public\/forms\//);
  });

  test('does not add JSON mock responses for .pdf paths', () => {
    // The mockApi helper must never intercept PDF file requests and return
    // JSON. PDF paths must pass through to the real static file server.
    // (This check ignores the import/require lines and comments.)
    const nonCommentLines = src
      .split('\n')
      .filter((l) => !l.trimStart().startsWith('//') && !l.trimStart().startsWith('*'))
      .join('\n');
    expect(nonCommentLines).not.toMatch(/['"`][^'"`]*\.pdf['"`]/);
  });

  test('documents the conversation route ordering requirement', () => {
    // The comment explaining that POST /messages must be checked before the
    // broader GET by-ID handler must be present. It serves as an inline
    // safety note for future contributors.
    expect(src).toMatch(/More-specific patterns must be checked before less-specific/);
  });
});

// ---------------------------------------------------------------------------
// E2E spec files — anti-pattern guard
// ---------------------------------------------------------------------------

describe('E2E spec files — anti-pattern guard', () => {
  const specs = listE2ESpecs();

  test('no spec file contains test.skip(…)', () => {
    // test.skip is a signal that a test is broken but unaddressed.
    // Committed stabilization specs must never be skipped; fix the root cause.
    //
    // Note: the conditional runtime form test.skip(booleanCondition, reason)
    // used INSIDE a test body is acceptable (it skips only when an element is
    // absent at runtime).  We only flag the DECLARATION form
    // test.skip('title', fn) which permanently removes a test from the suite.
    const violations = specs
      .filter(({ content }) => /\btest\.skip\s*\(\s*['"`]/.test(content))
      .map(({ name }) => name);
    expect(
      violations,
      `test.skip declaration found in: ${violations.join(', ')}`
    ).toHaveLength(0);
  });

  test('no spec file contains test.fixme(…)', () => {
    // test.fixme is a deferred-failure shortcut that removes a regression gate.
    // Committed specs must not use it; address the underlying issue instead.
    const violations = specs
      .filter(({ content }) => /\btest\.fixme\s*\(/.test(content))
      .map(({ name }) => name);
    expect(
      violations,
      `test.fixme found in: ${violations.join(', ')}`
    ).toHaveLength(0);
  });

  test('no spec file uses a bare page.route(**/*) catch-all', () => {
    // page.route('**/*') intercepts ALL network requests, including static
    // assets and Vite module scripts. Use narrow /api/**-scoped patterns.
    // If a specific test genuinely needs a catch-all, add a justification
    // comment on the same line and update this guard to allow it.
    const violations = specs
      .filter(({ content }) => /page\.route\(\s*['"`]\*\*\/\*['"`]/.test(content))
      .map(({ name }) => name);
    expect(
      violations,
      `Broad page.route('**/*') catch-all found in: ${violations.join(', ')}`
    ).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Safe conversation route pattern constants — presence guard
// ---------------------------------------------------------------------------

describe('safe conversation route pattern constants', () => {
  const src = readRepoFile('tests/helpers/ui.ts');

  test('SAFE_CONVERSATION_ROUTE_PATTERNS is exported from the helper', () => {
    // The constants provide a canonical, narrow route pattern for Chat E2E
    // tests to use instead of hand-rolling potentially broad patterns.
    expect(src).toMatch(/export\s+(const\s+)?SAFE_CONVERSATION_ROUTE_PATTERNS/);
  });
});
