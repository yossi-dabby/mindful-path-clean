#!/usr/bin/env node

import {
  ACTIVE_AGENT_NAMES,
  ARCHIVED_AGENT_NAMES,
  loadAgentConfigurations,
  validateAgentConfigurations,
} from './agent-config-policy.mjs';

try {
  const configs = loadAgentConfigurations();
  const errors = validateAgentConfigurations(configs);

  if (errors.length > 0) {
    console.error('[agent-config] Policy validation failed:');
    for (const error of errors) console.error(`  - ${error}`);
    process.exitCode = 1;
  } else {
    console.log(
      `[agent-config] Validated ${ACTIVE_AGENT_NAMES.length} active and `
      + `${ARCHIVED_AGENT_NAMES.length} archived agents.`,
    );
  }
} catch (error) {
  console.error(`[agent-config] ${error.message}`);
  process.exitCode = 1;
}
