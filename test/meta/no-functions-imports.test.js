/**
 * Guard test: no test file may import from functions/**
 *
 * The functions/ directory contains Deno runtime code. Vitest runs in Node.js,
 * so any import of functions/ code inside test/**\/*.test.js will either crash
 * at runtime (Deno APIs not available) or silently test the wrong thing.
 *
 * This test recursively scans all *.test.js files under test/ and fails if any
 * of them contain an import or require path that includes "functions/".
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

const FUNCTIONS_IMPORT_RE = /(from\s+['"].*functions\/|require\(['"].*functions\/)/;

describe('meta: no test file imports from functions/ (Deno runtime code)', () => {
  const testFiles = collectTestFiles(TEST_DIR);

  it('found at least one test file to scan', () => {
    expect(testFiles.length).toBeGreaterThan(0);
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
      const match = FUNCTIONS_IMPORT_RE.exec(source);
      expect(
        match,
        `Found forbidden functions/ import in ${relativePath}: "${match?.[0]}"`
      ).toBeNull();
    });
  }
});
