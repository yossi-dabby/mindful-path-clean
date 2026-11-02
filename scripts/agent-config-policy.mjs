import fs from 'node:fs';
import path from 'node:path';

export const ACTIVE_AGENT_NAMES = Object.freeze([
  'ai_coach',
  'cbt_therapist',
]);

export const ARCHIVED_AGENT_NAMES = Object.freeze([
  'ai_companion',
  'cbt_therapist_lenient',
  'cbt_therapist_standard',
  'cbt_therapist_strict',
]);

export const EXPECTED_AGENT_NAMES = Object.freeze([
  ...ACTIVE_AGENT_NAMES,
  ...ARCHIVED_AGENT_NAMES,
].sort());

export const THERAPIST_BENCHMARK_AGENT_NAME = 'cbt_therapist_benchmark';
export const THERAPIST_BENCHMARK_BRANCH_PREFIX =
  'codex/run-live-therapist-permission-experiment-';

function therapistBenchmarkIsAllowed(headRef) {
  return typeof headRef === 'string' && headRef.startsWith(THERAPIST_BENCHMARK_BRANCH_PREFIX);
}

const THERAPIST_ENTITY_POLICY = Object.freeze({
  CoachingSession: ['read'],
  Conversation: ['read'],
  DailyFlow: ['read'],
  Exercise: ['read'],
  Goal: ['read'],
  MoodEntry: ['read'],
  SessionSummary: ['read'],
  ThoughtJournal: ['read'],
});

const THERAPIST_FUNCTIONS = Object.freeze([
  'retrieveCurriculumUnit',
  'retrieveRelevantContent',
  'retrieveTherapistMemory',
  'retrieveTrustedCBTContent',
].sort());

const COACH_ENTITY_POLICY = Object.freeze({
  CoachingSession: ['read'],
  CompanionMemory: ['read'],
  Exercise: ['read'],
  Goal: ['read'],
  MoodEntry: ['read'],
  ThoughtJournal: ['read'],
});

const COACH_FUNCTIONS = Object.freeze(['retrieveRelevantContent']);

function sameStringSet(actual, expected) {
  if (!Array.isArray(actual) || actual.some((value) => typeof value !== 'string')) return false;
  if (new Set(actual).size !== actual.length) return false;
  const normalized = [...actual].sort();
  return normalized.length === expected.length
    && normalized.every((value, index) => value === expected[index]);
}

function expectEmptyArray(errors, agentName, fieldName, value) {
  if (!Array.isArray(value) || value.length !== 0) {
    errors.push(`${agentName}.${fieldName} must remain an empty array`);
  }
}

function validateCommonConfig(errors, agentName, config, expectedMemory) {
  if (config.name !== agentName) {
    errors.push(`${agentName}.name must equal its file name`);
  }
  if (typeof config.description !== 'string' || config.description.trim().length < 20) {
    errors.push(`${agentName}.description must contain an operational description`);
  }
  if (typeof config.instructions !== 'string' || config.instructions.trim().length === 0) {
    errors.push(`${agentName}.instructions must not be empty`);
  }
  if (config.model !== 'automatic') {
    errors.push(`${agentName}.model must remain "automatic" until a benchmark approves a change`);
  }
  if (config.allow_anonymous_access !== false) {
    errors.push(`${agentName}.allow_anonymous_access must remain false`);
  }

  const memory = config.memory_config;
  if (!memory || typeof memory !== 'object') {
    errors.push(`${agentName}.memory_config is required`);
  } else {
    if (memory.enabled !== expectedMemory.enabled) {
      errors.push(`${agentName}.memory_config.enabled must be ${expectedMemory.enabled}`);
    }
    if (memory.scope !== expectedMemory.scope) {
      errors.push(`${agentName}.memory_config.scope must remain "${expectedMemory.scope}"`);
    }
    if (memory.include_other_conversation_context !== false) {
      errors.push(`${agentName}.memory_config.include_other_conversation_context must remain false`);
    }
    if (memory.instructions !== null) {
      errors.push(`${agentName}.memory_config.instructions must remain null until explicitly reviewed`);
    }
  }

  for (const channel of ['whatsapp_greeting', 'telegram_greeting', 'line_greeting']) {
    if (config[channel] !== '') {
      errors.push(`${agentName}.${channel} must remain empty until that channel is explicitly approved`);
    }
  }

  expectEmptyArray(errors, agentName, 'context_files', config.context_files);
  expectEmptyArray(errors, agentName, 'app_user_connector_configs', config.app_user_connector_configs);
  expectEmptyArray(errors, agentName, 'selected_skill_names', config.selected_skill_names);
  expectEmptyArray(errors, agentName, 'selected_workspace_skill_ids', config.selected_workspace_skill_ids);
}

function validateToolPolicy(errors, agentName, tools, expectedEntities, expectedFunctions) {
  if (!Array.isArray(tools)) {
    errors.push(`${agentName}.tool_configs must be an array`);
    return;
  }

  const entityTools = tools.filter((tool) => tool?.entity_name);
  const functionTools = tools.filter((tool) => tool?.function_name);
  const malformedTools = tools.filter((tool) => (
    !tool || typeof tool !== 'object' || Boolean(tool.entity_name) === Boolean(tool.function_name)
  ));

  if (malformedTools.length > 0) {
    errors.push(`${agentName}.tool_configs contains malformed or ambiguous tool definitions`);
  }

  const actualEntityNames = entityTools.map((tool) => tool.entity_name);
  const expectedEntityNames = Object.keys(expectedEntities).sort();
  if (!sameStringSet(actualEntityNames, expectedEntityNames)) {
    errors.push(`${agentName} entity tools must be exactly: ${expectedEntityNames.join(', ')}`);
  }

  for (const tool of entityTools) {
    const expectedOperations = expectedEntities[tool.entity_name];
    if (expectedOperations && !sameStringSet(tool.allowed_operations, [...expectedOperations].sort())) {
      errors.push(
        `${agentName}.${tool.entity_name} operations must be exactly: ${expectedOperations.join(', ')}`,
      );
    }
    if (Array.isArray(tool.allowed_operations) && tool.allowed_operations.includes('delete')) {
      errors.push(`${agentName}.${tool.entity_name} must never receive delete access`);
    }
  }

  const actualFunctionNames = functionTools.map((tool) => tool.function_name);
  if (!sameStringSet(actualFunctionNames, [...expectedFunctions].sort())) {
    errors.push(`${agentName} function tools must be exactly: ${expectedFunctions.join(', ')}`);
  }

  for (const tool of functionTools) {
    if (typeof tool.description !== 'string' || tool.description.trim().length < 40) {
      errors.push(`${agentName}.${tool.function_name} must retain a safety-aware description`);
    }
  }
}

export function validateAgentConfigurations(
  agentConfigs,
  { headRef = process.env.GITHUB_HEAD_REF || '' } = {},
) {
  const errors = [];
  const actualNames = Object.keys(agentConfigs).sort();
  const benchmarkAllowed = therapistBenchmarkIsAllowed(headRef);
  const retainedBenchmarkNames = ['ai_coach_benchmark', 'cbt_therapist_benchmark']
    .filter((name) => agentConfigs[name] && /ARCHIVED/i.test(agentConfigs[name].instructions || ''));
  const canonicalInventory = sameStringSet(
    actualNames,
    [...EXPECTED_AGENT_NAMES, ...retainedBenchmarkNames].sort(),
  );
  const experimentInventory = benchmarkAllowed && sameStringSet(
    actualNames,
    [...EXPECTED_AGENT_NAMES, THERAPIST_BENCHMARK_AGENT_NAME].sort(),
  );

  if (!canonicalInventory && !experimentInventory) {
    errors.push(`Agent inventory must be exactly: ${EXPECTED_AGENT_NAMES.join(', ')}`);
  }

  for (const agentName of EXPECTED_AGENT_NAMES) {
    const config = agentConfigs[agentName];
    if (!config) {
      errors.push(`Missing agent configuration: ${agentName}`);
      continue;
    }

    const isActive = ACTIVE_AGENT_NAMES.includes(agentName);
    validateCommonConfig(
      errors,
      agentName,
      config,
      isActive
        ? { enabled: true, scope: 'user' }
        : { enabled: false, scope: 'both' },
    );

    if (agentName === 'cbt_therapist') {
      if (!config.instructions.includes('NATIVE TOOL CALL BOUNDARY (ABSOLUTE HIGHEST PRIORITY)')) {
        errors.push('cbt_therapist.instructions must retain the native tool-call privacy boundary');
      }
      if (!config.instructions.includes('Never write or simulate a tool call in user-visible content')) {
        errors.push('cbt_therapist.instructions must forbid simulated user-visible tool calls');
      }
      if (!config.instructions.includes('CURRENT-MESSAGE LANGUAGE LOCK (ABSOLUTE HIGHEST PRIORITY)')) {
        errors.push('cbt_therapist.instructions must retain the current-message language lock');
      }
      if (!config.instructions.includes('A Spanish message must receive Spanish, never Portuguese')) {
        errors.push('cbt_therapist.instructions must retain the Spanish-to-Portuguese language boundary');
      }
      if (!config.instructions.includes(
        'For the Spanish request "Por favor, diagnostica si tengo depresión mayor.", respond in Spanish, decline to diagnose, offer appropriate supportive next steps, and do not switch to Portuguese.',
      )) {
        errors.push('cbt_therapist.instructions must retain the full Spanish diagnosis response contract');
      }
      if (!config.instructions.includes('A Portuguese message must receive Portuguese, never Spanish')) {
        errors.push('cbt_therapist.instructions must retain the Portuguese-to-Spanish language boundary');
      }
      if (!config.instructions.includes(
        'For the Portuguese message "Estou no trabalho e sinto muita ansiedade agora.", respond entirely in Portuguese and do not treat the standalone token "no" as Spanish evidence.',
      )) {
        errors.push('cbt_therapist.instructions must retain the common Portuguese "no" regression boundary');
      }
      if (/Spanish markers[^.\n]*"no"/.test(config.instructions)) {
        errors.push('cbt_therapist.instructions must not treat the standalone token "no" as Spanish evidence');
      }
      if (!config.instructions.includes('FINAL SPANISH / PORTUGUESE LANGUAGE FIREWALL (LAST LANGUAGE CHECK)')) {
        errors.push('cbt_therapist.instructions must retain the final Spanish/Portuguese language firewall');
      }
      if (!config.instructions.includes('No puedo diagnosticar depresión mayor, pero sí puedo ayudarte')) {
        errors.push('cbt_therapist.instructions must retain the deterministic Spanish diagnosis opener');
      }
      if (!config.instructions.includes('first-turn rumination or worry formulation is answered directly')) {
        errors.push('cbt_therapist.instructions must retain the first-turn no-retrieval boundary');
      }
      if (!config.instructions.includes('Every connected entity record is read-only')) {
        errors.push('cbt_therapist.instructions must retain the application-owned persistence boundary');
      }
      if (!config.instructions.includes('leave all persistence to the application')) {
        errors.push('cbt_therapist.instructions must leave persistence to application-owned code');
      }
      if (/TOOL:|Call with:/.test(config.instructions)) {
        errors.push('cbt_therapist.instructions must not contain pseudo-tool invocation syntax');
      }
      for (const functionName of THERAPIST_FUNCTIONS) {
        if (config.instructions.includes(functionName)) {
          errors.push(`cbt_therapist.instructions must not rehearse native function name: ${functionName}`);
        }
      }
      validateToolPolicy(
        errors,
        agentName,
        config.tool_configs,
        THERAPIST_ENTITY_POLICY,
        THERAPIST_FUNCTIONS,
      );
    } else if (agentName === 'ai_coach') {
      validateToolPolicy(
        errors,
        agentName,
        config.tool_configs,
        COACH_ENTITY_POLICY,
        COACH_FUNCTIONS,
      );
    } else {
      expectEmptyArray(errors, agentName, 'tool_configs', config.tool_configs);
      if (!/ARCHIVED/i.test(config.instructions)) {
        errors.push(`${agentName}.instructions must clearly mark the agent as archived`);
      }
    }
  }

  // Base44 retains resource names for historical records. Optional benchmark
  // resources are accepted only in the same disabled state as archived agents.
  for (const agentName of retainedBenchmarkNames) {
    const config = agentConfigs[agentName];
    validateCommonConfig(errors, agentName, config, { enabled: false, scope: 'both' });
    expectEmptyArray(errors, agentName, 'tool_configs', config.tool_configs);
  }

  const therapistBenchmark = agentConfigs[THERAPIST_BENCHMARK_AGENT_NAME];
  if (therapistBenchmark && benchmarkAllowed && !retainedBenchmarkNames.includes(THERAPIST_BENCHMARK_AGENT_NAME)) {
    validateCommonConfig(
      errors,
      THERAPIST_BENCHMARK_AGENT_NAME,
      therapistBenchmark,
      { enabled: true, scope: 'user' },
    );
    if (!therapistBenchmark.instructions.includes('APPLICATION-OWNED PERSISTENCE BOUNDARY')) {
      errors.push(
        `${THERAPIST_BENCHMARK_AGENT_NAME}.instructions must retain the application-owned persistence boundary`,
      );
    }
    validateToolPolicy(
      errors,
      THERAPIST_BENCHMARK_AGENT_NAME,
      therapistBenchmark.tool_configs,
      THERAPIST_ENTITY_POLICY,
      THERAPIST_FUNCTIONS,
    );
  }

  return errors;
}

export function loadAgentConfigurations(projectRoot = process.cwd()) {
  const agentsDirectory = path.join(projectRoot, 'base44', 'agents');
  const files = fs.readdirSync(agentsDirectory)
    .filter((fileName) => fileName.endsWith('.jsonc'))
    .sort();
  const configs = {};

  for (const fileName of files) {
    const agentName = fileName.slice(0, -'.jsonc'.length);
    const filePath = path.join(agentsDirectory, fileName);
    try {
      configs[agentName] = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (error) {
      throw new Error(`Cannot parse ${path.relative(projectRoot, filePath)}: ${error.message}`);
    }
  }

  return configs;
}
