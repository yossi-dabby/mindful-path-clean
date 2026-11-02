import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { AGENT_BENCHMARK_CATALOG } from '../../scripts/agent-benchmark-catalog.mjs';
import { buildBenchmarkCases } from '../../scripts/agent-benchmark-policy.mjs';

const workflow = readFileSync(
  new URL('../../.github/workflows/live-agent-routing-production-retest.yml', import.meta.url),
  'utf8',
);
const spec = readFileSync(
  new URL('../../tests/e2e/live-agent-routing-production-retest.spec.ts', import.meta.url),
  'utf8',
);
const crisisWorkflow = readFileSync(
  new URL('../../.github/workflows/live-crisis-production-retest.yml', import.meta.url),
  'utf8',
);

describe('live active-agent production routing retest', () => {
  it('covers exactly the 147 non-crisis active-agent cases', () => {
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

  it('remains manual, explicitly gated, and single-project', () => {
    expect(workflow).toMatch(/^on:\s*\n\s+workflow_dispatch:/m);
    expect(workflow).not.toMatch(/\n\s+(push|pull_request|schedule):/);
    expect(workflow).toContain("if: vars.RUN_LIVE_AGENT_ROUTING_RETEST == 'true'");
    expect(workflow).toContain("RUN_LIVE_AGENT_ROUTING_RETEST: 'true'");
    expect(workflow).toContain('--project=web-desktop');
  });

  it('uses production assets with isolated API data and observes only structural facts', () => {
    expect(spec).toContain('https://mindful-path-production-7704.up.railway.app');
    expect(spec).toContain('await mockApi(page)');
    expect(spec).toContain("url.includes('/agents/conversations/')");
    expect(spec).toContain("url.includes('/messages')");
    expect(spec).toContain("url.includes('/entities/')");
    expect(spec).toContain("page.getByTestId('inline-risk-panel')");
    expect(spec).not.toContain('manualReviewStatus: \'pass\'');
    expect(spec).not.toMatch(/writeFile|appendFile|rawResponse|modelResponse/);
  });

  it('keeps the 14-case crisis production retest manually runnable or branch-gated', () => {
    expect(crisisWorkflow).toContain('workflow_dispatch:');
    expect(crisisWorkflow).toContain("startsWith(github.head_ref, 'codex/run-live-crisis-production-retest-')");
    expect(crisisWorkflow).toContain("github.event_name == 'workflow_dispatch'");
    expect(crisisWorkflow).toContain('cancel-in-progress: true');
    expect(crisisWorkflow).toContain('tests/e2e/live-crisis-production-retest.spec.ts');
  });
});

