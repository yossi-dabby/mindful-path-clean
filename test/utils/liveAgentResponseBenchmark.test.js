import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { AGENT_BENCHMARK_CATALOG } from '../../scripts/agent-benchmark-catalog.mjs';
import { buildBenchmarkCases } from '../../scripts/agent-benchmark-policy.mjs';

const runner = readFileSync(
  new URL('../../scripts/run-live-agent-response-benchmark.mjs', import.meta.url),
  'utf8',
);
const workflow = readFileSync(
  new URL('../../.github/workflows/live-agent-response-benchmark.yml', import.meta.url),
  'utf8',
);
const modelExperimentWorkflow = readFileSync(
  new URL('../../.github/workflows/live-agent-model-experiment.yml', import.meta.url),
  'utf8',
);
const therapistPermissionWorkflow = readFileSync(
  new URL('../../.github/workflows/live-therapist-permission-experiment.yml', import.meta.url),
  'utf8',
);
const guard = readFileSync(
  new URL('../../scripts/live-agent-response-guards.mjs', import.meta.url),
  'utf8',
);

describe('live agent response benchmark', () => {
  it('covers the 147 non-crisis live model cases across both agents and seven languages', () => {
    const cases = buildBenchmarkCases(AGENT_BENCHMARK_CATALOG)
      .filter(({ scenarioId }) => scenarioId !== 'crisis_explicit_self_harm');
    expect(cases).toHaveLength(147);
    expect(new Set(cases.map(({ agent }) => agent))).toEqual(
      new Set(['ai_coach', 'cbt_therapist']),
    );
    expect(new Set(cases.map(({ language }) => language))).toEqual(
      new Set(['de', 'en', 'es', 'fr', 'he', 'it', 'pt']),
    );
  });

  it('authenticates only the dedicated verified user and never logs credentials', () => {
    expect(runner).toContain("const EXPECTED_EMAIL = 'yosephdabby4@gmail.com'");
    expect(runner).toContain("requiredEnv('BASE44_LIVE_TEST_PASSWORD')");
    expect(runner).toContain('loginViaEmailPassword(email, password)');
    expect(runner).toContain('Authenticated as unexpected account');
    expect(runner).not.toMatch(/console\.log\([^\n]*(password|access_token)/i);
  });

  it('keeps raw responses out of retained evidence and requires human clinical sign-off', () => {
    const retainedResultsStart = runner.indexOf('const results = rawResults.map');
    const retainedResultsEnd = runner.indexOf('const summary = buildSummary', retainedResultsStart);
    const retainedResults = runner.slice(retainedResultsStart, retainedResultsEnd);

    expect(runner).toContain('responseSha256: item.responseSha256');
    expect(retainedResults).not.toContain('response: item.response');
    expect(runner).toContain('rawResponsesPublished: false');
    expect(runner).toContain('humanClinicalSignoffRequired: true');
    expect(runner).toContain('AI-assisted and preliminary');
  });

  it('records deterministic raw tool-call leakage as a release-blocking failure', () => {
    expect(runner).toContain("deterministicPolicyFailures: item.rawToolCallLeakage ? ['raw_tool_call_leakage'] : []");
    expect(runner).toContain('rawToolCallLeakageTypes: item.rawToolCallLeakageTypes');
    expect(runner).toContain('classifyRawToolCallLeakage(response)');
    expect(runner).toContain('overall_pass: false');
    expect(guard).toContain('function_calls');
    expect(guard).toContain('retrieveTherapistMemory');
  });

  it('keeps benchmark metadata on the conversation and lets Base44 populate message metadata', () => {
    const addMessageStart = runner.indexOf('base44.agents.addMessage');
    const addMessageEnd = runner.indexOf(');', addMessageStart);
    const addMessageCall = runner.slice(addMessageStart, addMessageEnd);

    expect(runner).toContain('base44.agents.createConversation');
    expect(runner).toContain('benchmark_case_id: benchmarkCase.caseId');
    expect(addMessageCall).toContain("role: 'user'");
    expect(addMessageCall).toContain('content: buildRuntimeFaithfulPrompt(benchmarkCase)');
    expect(addMessageCall).not.toContain('metadata:');
  });

  it('mirrors the production therapist language and Stage 12 session contracts', () => {
    expect(runner).toContain("if (benchmarkCase.agent !== 'cbt_therapist') return benchmarkCase.prompt");
    expect(runner).toContain("'[START_SESSION]'");
    expect(runner).toContain('[SESSION_LANGUAGE: ${benchmarkCase.language}. Open and respond entirely in ${languageName}');
    expect(runner).toContain('buildStage12SessionContract(benchmarkCase.language)');
    expect(runner).toContain('buildStage12TurnSupplement(benchmarkCase.prompt, benchmarkCase.language)');
    expect(runner).toContain('SPANISH_REGISTER: Use neutral international Spanish consistently');
    expect(runner).toContain('content: buildRuntimeFaithfulPrompt(benchmarkCase)');
  });

  it('is manually confirmed or isolated-branch triggered and uses encrypted secrets', () => {
    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).toContain("confirmation == 'RUN_147_LIVE_CASES'");
    expect(workflow).toContain("'codex/run-live-agent-response-benchmark-*'");
    expect(workflow).toContain('secrets.BASE44_LIVE_TEST_EMAIL');
    expect(workflow).toContain('secrets.BASE44_LIVE_TEST_PASSWORD');
    expect(workflow).toContain('timeout-minutes: 180');
    expect(workflow).toContain('retention-days: 14');
    expect(workflow).toContain('live-agent-response-benchmark-${{ github.event_name }}-${{ github.ref }}');
    expect(workflow).toContain('cancel-in-progress: true');
  });

  it('supports an isolated 70-case coach model experiment without rewiring production', () => {
    expect(runner).toContain('LIVE_AGENT_RESPONSE_LOGICAL_AGENT');
    expect(runner).toContain('LIVE_AGENT_RESPONSE_TARGET_AGENT');
    expect(runner).toContain('benchmark_runtime_agent: runtimeAgent');
    expect(runner).toContain('targetAgentOverride: TARGET_AGENT_OVERRIDE');
    expect(runner).toContain('experimentLabel: EXPERIMENT_LABEL');
    expect(runner).toContain('sourceRef: SOURCE_REF');
    expect(modelExperimentWorkflow).toContain("LIVE_AGENT_RESPONSE_LOGICAL_AGENT: 'ai_coach'");
    expect(modelExperimentWorkflow).toContain("LIVE_AGENT_RESPONSE_TARGET_AGENT: 'ai_coach_benchmark'");
    expect(modelExperimentWorkflow).toContain("LIVE_AGENT_RESPONSE_EXPECTED_CASES: '70'");
    expect(modelExperimentWorkflow).toContain('LIVE_AGENT_RESPONSE_EXPERIMENT_LABEL: ${{ github.head_ref || github.ref_name }}');
    expect(modelExperimentWorkflow).toContain("startsWith(github.head_ref, 'codex/run-live-agent-model-experiment-')");
    expect(modelExperimentWorkflow).toContain('secrets.BASE44_LIVE_TEST_EMAIL');
    expect(modelExperimentWorkflow).toContain('secrets.BASE44_LIVE_TEST_PASSWORD');
  });

  it('supports an isolated therapist permission experiment without changing production first', () => {
    expect(therapistPermissionWorkflow).toContain("LIVE_AGENT_RESPONSE_LOGICAL_AGENT: 'cbt_therapist'");
    expect(therapistPermissionWorkflow).toContain("LIVE_AGENT_RESPONSE_TARGET_AGENT: 'cbt_therapist_benchmark'");
    expect(therapistPermissionWorkflow).toContain("LIVE_AGENT_RESPONSE_EXPECTED_CASES: '77'");
    expect(therapistPermissionWorkflow).toContain(
      "startsWith(github.head_ref, 'codex/run-live-therapist-permission-experiment-')",
    );
    expect(therapistPermissionWorkflow).toContain('secrets.BASE44_LIVE_TEST_EMAIL');
    expect(therapistPermissionWorkflow).toContain('secrets.BASE44_LIVE_TEST_PASSWORD');
  });
});
