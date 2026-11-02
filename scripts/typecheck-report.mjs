/**
 * scripts/typecheck-report.mjs
 *
 * Informational typecheck report script.
 * Runs tsc, prints a summary of error count and top files,
 * and always exits 0 (non-blocking).
 *
 * Usage:
 *   npm run typecheck:report
 *
 * This script is intentionally non-blocking. It is for visibility only.
 * Do not make this script a required CI gate.
 */

import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(import.meta.url), "../..");
const tscBin = resolve(root, "node_modules/.bin/tsc");

const result = spawnSync(tscBin, ["-p", "jsconfig.json"], {
  cwd: root,
  encoding: "utf8",
  maxBuffer: 20 * 1024 * 1024,
});

const output = (result.stdout || "") + (result.stderr || "");

// tsc non-TTY format: "src/foo/bar.jsx(12,34): error TS2322: ..."
// Count "error TS" occurrences for total errors
const errorLines = output.split("\n").filter((l) => / error TS\d+:/.test(l));
const errorCount = errorLines.length;

if (errorCount === 0) {
  console.log("[typecheck:report] ✅  No typecheck errors found.");
  process.exit(0);
}

// Count errors per file — match "src/path/to/file.jsx(line,col):"
const fileErrorCounts = {};
for (const line of errorLines) {
  const m = line.match(/^(src\/[^(]+\.(?:jsx?|tsx?))\(/);
  if (m) {
    const file = m[1];
    fileErrorCounts[file] = (fileErrorCounts[file] || 0) + 1;
  }
}

const affectedFiles = Object.keys(fileErrorCounts).length;

const topFiles = Object.entries(fileErrorCounts)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10);

// Count by TS error code
const codeCounts = {};
for (const line of errorLines) {
  const m = line.match(/error (TS\d+):/);
  if (m) {
    codeCounts[m[1]] = (codeCounts[m[1]] || 0) + 1;
  }
}

const topCodes = Object.entries(codeCounts)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 8);

console.log("");
console.log("╔══════════════════════════════════════════════════════╗");
console.log("║         Typecheck Report — Mindful Path CBT           ║");
console.log("╚══════════════════════════════════════════════════════╝");
console.log("");
console.log(`  Total errors  : ${errorCount}`);
console.log(`  Files affected: ${affectedFiles}`);
console.log(`  Status        : INFORMATIONAL — not a CI gate`);
console.log("");

if (topCodes.length > 0) {
  console.log("  Top error codes:");
  for (const [code, count] of topCodes) {
    console.log(`    ${code.padEnd(10)} ${count}`);
  }
  console.log("");
}

if (topFiles.length > 0) {
  console.log("  Top files by error count:");
  for (const [file, count] of topFiles) {
    console.log(`    ${String(count).padStart(4)}  ${file}`);
  }
  console.log("");
}

console.log("  See docs/typecheck-debt-baseline.md for the full baseline,");
console.log("  no-growth policy, and burn-down roadmap.");
console.log("");

// Always exit 0 — this is a report, not a gate.
process.exit(0);

