#!/usr/bin/env node

import { AGENT_BENCHMARK_CATALOG } from './agent-benchmark-catalog.mjs';
import {
  buildBenchmarkCoverageReport,
  validateBenchmarkCatalog,
} from './agent-benchmark-policy.mjs';

const errors = validateBenchmarkCatalog(AGENT_BENCHMARK_CATALOG);

if (errors.length > 0) {
  console.error('[agent-benchmark] Catalog validation failed:');
  for (const error of errors) console.error(`  - ${error}`);
  process.exitCode = 1;
} else {
  const report = buildBenchmarkCoverageReport(AGENT_BENCHMARK_CATALOG);
  console.log(
    `[agent-benchmark] ${report.scenarioFamilies} families, `
    + `${report.localizedPrompts} localized prompts, `
    + `${report.executionCases} agent-language cases, `
    + `${report.hardGateCases} hard gates.`,
  );
  console.log(
    `[agent-benchmark] Agents: ${Object.entries(report.byAgent)
      .map(([agent, count]) => `${agent}=${count}`)
      .join(', ')}.`,
  );
}
