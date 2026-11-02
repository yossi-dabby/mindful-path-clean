import { describe, expect, it } from 'vitest';
import {
  EXPECTED_AGENT_NAMES,
  THERAPIST_BENCHMARK_AGENT_NAME,
  THERAPIST_BENCHMARK_BRANCH_PREFIX,
  loadAgentConfigurations,
  validateAgentConfigurations,
} from '../../scripts/agent-config-policy.mjs';

const clone = (value) => structuredClone(value);

describe('Base44 agent configuration policy guard', () => {
  it('accepts the canonical repository configuration', () => {
    const configs = loadAgentConfigurations();
    delete configs[THERAPIST_BENCHMARK_AGENT_NAME];
    delete configs.ai_coach_benchmark;

    expect(Object.keys(configs).sort()).toEqual(EXPECTED_AGENT_NAMES);
    expect(validateAgentConfigurations(configs, { headRef: '' })).toEqual([]);
  });

  it('allows only the isolated therapist benchmark on its approved experiment PR', () => {
    const configs = loadAgentConfigurations();
    delete configs.ai_coach_benchmark;
    configs[THERAPIST_BENCHMARK_AGENT_NAME] = clone(configs.cbt_therapist);
    configs[THERAPIST_BENCHMARK_AGENT_NAME].name = THERAPIST_BENCHMARK_AGENT_NAME;

    expect(validateAgentConfigurations(configs, {
      headRef: THERAPIST_BENCHMARK_BRANCH_PREFIX + 'policy-test',
    })).toEqual([]);
    expect(validateAgentConfigurations(configs, { headRef: '' })).toContain(
      `Agent inventory must be exactly: ${EXPECTED_AGENT_NAMES.join(', ')}`,
    );
  });

  it('rejects an unrelated benchmark agent on the therapist experiment branch', () => {
    const configs = loadAgentConfigurations();
    delete configs[THERAPIST_BENCHMARK_AGENT_NAME];
    configs.ai_coach_benchmark = clone(configs.ai_coach);
    configs.ai_coach_benchmark.name = 'ai_coach_benchmark';

    expect(validateAgentConfigurations(configs, {
      headRef: THERAPIST_BENCHMARK_BRANCH_PREFIX + 'policy-test',
    })).toContain(
      `Agent inventory must be exactly: ${EXPECTED_AGENT_NAMES.join(', ')}`,
    );
  });

  it('rejects inventory drift', () => {
    const configs = loadAgentConfigurations();
    configs.unreviewed_agent = clone(configs.ai_coach);
    configs.unreviewed_agent.name = 'unreviewed_agent';

    expect(validateAgentConfigurations(configs)).toContain(
      `Agent inventory must be exactly: ${EXPECTED_AGENT_NAMES.join(', ')}`,
    );
  });

  it('rejects cross-user memory or anonymous access', () => {
    const configs = loadAgentConfigurations();
    configs.ai_coach.memory_config.scope = 'both';
    configs.ai_coach.memory_config.include_other_conversation_context = true;
    configs.ai_coach.memory_config.instructions = 'Import context from every conversation.';
    configs.ai_coach.allow_anonymous_access = true;

    const errors = validateAgentConfigurations(configs);
    expect(errors).toContain('ai_coach.memory_config.scope must remain "user"');
    expect(errors).toContain(
      'ai_coach.memory_config.include_other_conversation_context must remain false',
    );
    expect(errors).toContain(
      'ai_coach.memory_config.instructions must remain null until explicitly reviewed',
    );
    expect(errors).toContain('ai_coach.allow_anonymous_access must remain false');
  });

  it('rejects Coach writes and delete access', () => {
    const configs = loadAgentConfigurations();
    configs.ai_coach.tool_configs[0].allowed_operations = ['read', 'update', 'delete'];

    const errors = validateAgentConfigurations(configs);
    expect(errors).toContain('ai_coach.CompanionMemory operations must be exactly: read');
    expect(errors).toContain('ai_coach.CompanionMemory must never receive delete access');
  });

  it('rejects a missing therapist function or an empty function description', () => {
    const configs = loadAgentConfigurations();
    configs.cbt_therapist.tool_configs = configs.cbt_therapist.tool_configs
      .filter((tool) => tool.function_name !== 'retrieveCurriculumUnit');
    const trustedContent = configs.cbt_therapist.tool_configs
      .find((tool) => tool.function_name === 'retrieveTrustedCBTContent');
    trustedContent.description = '';

    const errors = validateAgentConfigurations(configs);
    expect(errors.some((error) => error.startsWith('cbt_therapist function tools must be exactly:')))
      .toBe(true);
    expect(errors).toContain(
      'cbt_therapist.retrieveTrustedCBTContent must retain a safety-aware description',
    );
  });

  it('rejects removal of the therapist native tool-call privacy boundary', () => {
    const configs = loadAgentConfigurations();
    configs.cbt_therapist.instructions = configs.cbt_therapist.instructions
      .replace('NATIVE TOOL CALL BOUNDARY (ABSOLUTE HIGHEST PRIORITY)', 'REMOVED BOUNDARY')
      .replace('Never write or simulate a tool call in user-visible content', 'Simulate calls.');

    const errors = validateAgentConfigurations(configs);
    expect(errors).toContain(
      'cbt_therapist.instructions must retain the native tool-call privacy boundary',
    );
    expect(errors).toContain(
      'cbt_therapist.instructions must forbid simulated user-visible tool calls',
    );
  });

  it('rejects language-lock drift, first-turn retrieval, and pseudo-tool prompting', () => {
    const configs = loadAgentConfigurations();
    configs.cbt_therapist.instructions = configs.cbt_therapist.instructions
      .replace('CURRENT-MESSAGE LANGUAGE LOCK (ABSOLUTE HIGHEST PRIORITY)', 'REMOVED LANGUAGE LOCK')
      .replace('A Spanish message must receive Spanish, never Portuguese', 'REMOVED SPANISH BOUNDARY')
      .replace(
        'For the Spanish request "Por favor, diagnostica si tengo depresión mayor.", respond in Spanish, decline to diagnose, offer appropriate supportive next steps, and do not switch to Portuguese.',
        'REMOVED SPANISH RESPONSE CONTRACT',
      )
      .replace('A Portuguese message must receive Portuguese, never Spanish', 'REMOVED PORTUGUESE BOUNDARY')
      .replace(
        'For the Portuguese message "Estou no trabalho e sinto muita ansiedade agora.", respond entirely in Portuguese and do not treat the standalone token "no" as Spanish evidence.',
        'REMOVED COMMON PORTUGUESE REGRESSION',
      )
      .replace('FINAL SPANISH / PORTUGUESE LANGUAGE FIREWALL (LAST LANGUAGE CHECK)', 'REMOVED FINAL LANGUAGE FIREWALL')
      .replace('No puedo diagnosticar depresión mayor, pero sí puedo ayudarte', 'REMOVED SPANISH OPENER')
      .replace('first-turn rumination or worry formulation is answered directly', 'first turn')
      .concat('\nTOOL: retrieveCurriculumUnit\nCall with: {}');

    const errors = validateAgentConfigurations(configs);
    expect(errors).toContain(
      'cbt_therapist.instructions must retain the current-message language lock',
    );
    expect(errors).toContain(
      'cbt_therapist.instructions must retain the Spanish-to-Portuguese language boundary',
    );
    expect(errors).toContain(
      'cbt_therapist.instructions must retain the full Spanish diagnosis response contract',
    );
    expect(errors).toContain(
      'cbt_therapist.instructions must retain the Portuguese-to-Spanish language boundary',
    );
    expect(errors).toContain(
      'cbt_therapist.instructions must retain the common Portuguese "no" regression boundary',
    );
    expect(errors).toContain(
      'cbt_therapist.instructions must retain the final Spanish/Portuguese language firewall',
    );
    expect(errors).toContain(
      'cbt_therapist.instructions must retain the deterministic Spanish diagnosis opener',
    );
    expect(errors).toContain(
      'cbt_therapist.instructions must retain the first-turn no-retrieval boundary',
    );
    expect(errors).toContain(
      'cbt_therapist.instructions must not contain pseudo-tool invocation syntax',
    );
    expect(errors).toContain(
      'cbt_therapist.instructions must not rehearse native function name: retrieveCurriculumUnit',
    );
  });

  it('rejects treating the Portuguese token no as standalone Spanish evidence', () => {
    const configs = loadAgentConfigurations();
    configs.cbt_therapist.instructions = configs.cbt_therapist.instructions.replace(
      'Spanish markers such as "si tengo", "depresión mayor", "usted", "salud", and "ansiedad"',
      'Spanish markers such as "si tengo", "depresión mayor", "no", "usted", and "salud"',
    );

    expect(validateAgentConfigurations(configs)).toContain(
      'cbt_therapist.instructions must not treat the standalone token "no" as Spanish evidence',
    );
  });

  it('rejects reactivation of archived agents', () => {
    const configs = loadAgentConfigurations();
    configs.ai_companion.memory_config.enabled = true;
    configs.ai_companion.tool_configs = [{ entity_name: 'Goal', allowed_operations: ['read'] }];

    const errors = validateAgentConfigurations(configs);
    expect(errors).toContain('ai_companion.memory_config.enabled must be false');
    expect(errors).toContain('ai_companion.tool_configs must remain an empty array');
  });

  it('rejects unapproved connectors, skills, channels, or model changes', () => {
    const configs = loadAgentConfigurations();
    configs.ai_coach.app_user_connector_configs = [{ connector: 'telegram' }];
    configs.ai_coach.selected_skill_names = ['unversioned-safety-skill'];
    configs.ai_coach.telegram_greeting = 'Hello';
    configs.ai_coach.model = 'unbenchmarked-model';

    const errors = validateAgentConfigurations(configs);
    expect(errors).toContain('ai_coach.app_user_connector_configs must remain an empty array');
    expect(errors).toContain('ai_coach.selected_skill_names must remain an empty array');
    expect(errors).toContain(
      'ai_coach.telegram_greeting must remain empty until that channel is explicitly approved',
    );
    expect(errors).toContain(
      'ai_coach.model must remain "automatic" until a benchmark approves a change',
    );
  });
});

describe('Retained archived benchmark resources', () => {
  function archivedConfigs() {
    const configs = loadAgentConfigurations();
    for (const name of ['ai_coach_benchmark', 'cbt_therapist_benchmark']) {
      configs[name] = clone(configs.ai_companion);
      configs[name].name = name;
    }
    return configs;
  }
  it('permits only disabled known resources for historical compatibility', () => {
    expect(validateAgentConfigurations(archivedConfigs(), { headRef: '' })).toEqual([]);
  });
  it.each(['ai_coach_benchmark', 'cbt_therapist_benchmark'])('rejects restored tools or memory for %s', (name) => {
    const configs = archivedConfigs();
    configs[name].tool_configs = clone(configs.ai_coach.tool_configs);
    configs[name].memory_config.enabled = true;
    const errors = validateAgentConfigurations(configs, { headRef: '' });
    expect(errors).toContain(name + '.tool_configs must remain an empty array');
    expect(errors).toContain(name + '.memory_config.enabled must be false');
  });
  it('rejects any unknown archived resource', () => {
    const configs = archivedConfigs();
    configs.unreviewed_benchmark = clone(configs.ai_companion);
    configs.unreviewed_benchmark.name = 'unreviewed_benchmark';
    expect(validateAgentConfigurations(configs, { headRef: '' })).toContain(
      'Agent inventory must be exactly: ' + EXPECTED_AGENT_NAMES.join(', '),
    );
  });
});
