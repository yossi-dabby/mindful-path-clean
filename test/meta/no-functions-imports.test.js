/**
 * Guard test: no test file may import platform-runtime code from functions/**
 *
 * The functions/ directory contains Deno runtime code. Vitest runs in Node.js,
 * so any import of functions/ code inside test/**\/*.test.js will either crash
 * at runtime (Deno APIs not available) or silently test the wrong thing.
 *
 * This test recursively scans all *.test.js files under test/ and fails if any
 * of them contain an import or require path that includes "functions/".
 * Explicitly named Web API modules are portable to Node; the pilot handler may
 * import only the dependency-free release contract, checked below.
 * its separate entry.ts still contains the platform SDK and remains forbidden.
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const TEST_DIR = path.resolve(import.meta.dirname, '..');

/**
 * Recursively collect all *.test.js files under a directory.
 * @param {string} dir
 * @returns {string[]} Absolute file paths
 */
function collectTestFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectTestFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.test.js')) {
      files.push(fullPath);
    }
  }
  return files;
}

const FUNCTIONS_IMPORT_RE = /(?:from\s+|require\(\s*|import\(\s*)['"]([^'"]*functions\/[^'"]*)['"]/g;
const PORTABLE_HELPER = path.resolve(TEST_DIR, '../base44/functions/getHebrewFormsPilot/handler.js');
const ACCESS_GUARD_IMPORT = "import { requireAccountAccess } from './accountAccessGuard.js';";
const PORTABLE_ACCESS = [
  '../base44/functions/accountAccess/handler.js',
  '../base44/functions/accountAccess/guard.js',
  '../base44/functions/transcribeMobileAudio/accountAccessGuard.js',
].map(file => path.resolve(TEST_DIR, file));
const PORTABLE_RELEASE = path.resolve(TEST_DIR, '../base44/functions/getHebrewFormsPilot/releases.js');

const PORTABLE_ATTACHMENTS = ['uploadAttachment', 'extractPdfText'].map((name) => path.resolve(TEST_DIR, `../base44/functions/${name}/handler.js`));

describe('meta: no test file imports from functions/ (Deno runtime code)', () => {
  const testFiles = collectTestFiles(TEST_DIR);

  it('found at least one test file to scan', () => {
    expect(testFiles.length).toBeGreaterThan(0);
  });

  it('the portable pilot helper imports only the dependency-free Web API release contract', () => {
    const source = fs.readFileSync(PORTABLE_HELPER, 'utf8');
    const allowedImport = "import { isPilotFileId, isPilotCatalogPath, validatePilotCatalog } from './releases.js';";
    expect(source.split(allowedImport)).toHaveLength(2);
    expect(source.replace(allowedImport, '').replace(ACCESS_GUARD_IMPORT, '')).not.toMatch(/\b(?:import|require|Deno)\b/);
    expect(fs.readFileSync(PORTABLE_RELEASE, 'utf8')).not.toMatch(/\b(?:import|require|Deno)\b/);
  });

  it('private attachment handlers are dependency-free Web API code', () => {
    for (const file of PORTABLE_ATTACHMENTS) {
      expect(fs.readFileSync(file, 'utf8').replace(ACCESS_GUARD_IMPORT, '')).not.toMatch(/\b(?:import|require|Deno)\b/);
    }
  });

  it('the explicitly allowed account access modules have no runtime imports or platform APIs', () => {
    for (const file of PORTABLE_ACCESS) {
      expect(fs.readFileSync(file, 'utf8')).not.toMatch(/\b(?:import|require|Deno)\b/);
    }
  });

  for (const filePath of testFiles) {
    // Skip this guard file itself — its source contains the regex as a literal
    // string, which would otherwise match its own pattern.
    const relativePath = path.relative(TEST_DIR, filePath);
    if (relativePath === path.join('meta', 'no-functions-imports.test.js')) {
      continue;
    }

    it(`${relativePath} does not import from functions/`, () => {
      const source = fs.readFileSync(filePath, 'utf8');
      for (const match of source.matchAll(FUNCTIONS_IMPORT_RE)) {
        expect(
          [PORTABLE_HELPER, PORTABLE_RELEASE, ...PORTABLE_ATTACHMENTS, ...PORTABLE_ACCESS],
          `Found forbidden platform functions/ import in ${relativePath}: "${match[0]}"`
        ).toContain(path.resolve(path.dirname(filePath), match[1]));
      }
    });
  }
});
