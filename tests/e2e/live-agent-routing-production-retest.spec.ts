import { expect, test, type Page, type Request } from '@playwright/test';
import { mockApi } from '../helpers/ui';
import { AGENT_BENCHMARK_CATALOG } from '../../scripts/agent-benchmark-catalog.mjs';
import { buildBenchmarkCases } from '../../scripts/agent-benchmark-policy.mjs';

const BASE_URL = 'https://mindful-path-production-7704.up.railway.app';
const CRISIS_SCENARIO_ID = 'crisis_explicit_self_harm';

const testSession = {
  id: 'live-routing-test-session',
  title: 'Synthetic routing validation',
  current_challenge: 'Synthetic routing validation only',
  focus_area: 'general',
  stage: 'discovery',
  status: 'active',
  agent_conversation_id: 'live-routing-test-conversation',
  action_plan: [],
  created_by: 'test@example.com',
  created_date: '2026-10-09T00:00:00.000Z',
};

type NetworkObservation = {
  agentMessageWrites: string[];
  entityWrites: string[];
};

function observeWrites(page: Page) {
  const observation: NetworkObservation = { agentMessageWrites: [], entityWrites: [] };
  const writeMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
  let armed = false;

  page.on('request', (request: Request) => {
    if (!armed || !writeMethods.has(request.method())) return;
    const url = request.url();
    if (url.includes('/agents/conversations/') && url.includes('/messages')) {
      observation.agentMessageWrites.push(url);
    }
    if (url.includes('/entities/')) observation.entityWrites.push(url);
  });

  return {
    observation,
    arm: () => { armed = true; },
  };
}

async function prepareBasePage(page: Page, language: string) {
  await mockApi(page);
  await page.addInitScript(({ language }) => {
    localStorage.setItem('language', language);
    localStorage.setItem('i18nextLng', language);
    localStorage.setItem('chat_consent_accepted', 'true');
    localStorage.setItem('age_verified', 'true');
    localStorage.removeItem('mindful_path_emergency_region');
    (window as Window & { __TEST_APP_ID__?: string }).__TEST_APP_ID__ = 'test-app-id';
    (window as Window & { __DISABLE_ANALYTICS__?: boolean }).__DISABLE_ANALYTICS__ = true;
  }, { language });
}

async function expectAgentRoute(capture: ReturnType<typeof observeWrites>, page: Page) {
  await expect.poll(
    () => capture.observation.agentMessageWrites.length,
    { timeout: 10_000 },
  ).toBe(1);
  await page.waitForTimeout(150);
  expect(capture.observation.entityWrites, 'agent prompts must not write entities').toEqual([]);
  await expect(page.getByTestId('inline-risk-panel')).toHaveCount(0);
}

const cases = buildBenchmarkCases(AGENT_BENCHMARK_CATALOG)
  .filter(({ scenarioId }) => scenarioId !== CRISIS_SCENARIO_ID);

const describeLive = process.env.RUN_LIVE_AGENT_ROUTING_RETEST === 'true'
  ? test.describe
  : test.describe.skip;

describeLive('deployed production active-agent routing benchmark', () => {
  for (const benchmarkCase of cases) {
    const label = `${benchmarkCase.scenarioId} ${benchmarkCase.agent} ${benchmarkCase.language}`;

    test(`${label}: routes once without entity writes`, async ({ page }) => {
      test.setTimeout(60_000);
      await prepareBasePage(page, benchmarkCase.language);

      if (benchmarkCase.agent === 'cbt_therapist') {
        const capture = observeWrites(page);
        await page.goto(`${BASE_URL}/Chat`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
        await expect(page.getByTestId('chat-root')).toBeVisible({ timeout: 20_000 });
        await expect(page.locator('html')).toHaveAttribute(
          'lang',
          new RegExp(`^${benchmarkCase.language}`, 'i'),
        );

        const input = page.getByTestId('therapist-chat-input');
        await expect(input).toBeVisible();
        await input.fill(benchmarkCase.prompt);
        capture.arm();
        await page.getByTestId('therapist-chat-send').click();
        await expectAgentRoute(capture, page);
        return;
      }

      await page.route('**/api/**/entities/CoachingSession**', async (route) => {
        const isItemRequest = route.request().url().includes(testSession.id);
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(isItemRequest ? testSession : [testSession]),
        });
      });

      const capture = observeWrites(page);
      await page.goto(`${BASE_URL}/Coach`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      await expect(page.getByTestId('coach-page')).toBeVisible({ timeout: 20_000 });
      await page.getByText(testSession.title, { exact: true }).click();
      await expect(page.getByTestId('coach-chat')).toBeVisible({ timeout: 10_000 });
      await expect(page.locator('html')).toHaveAttribute(
        'lang',
        new RegExp(`^${benchmarkCase.language}`, 'i'),
      );

      const input = page.getByTestId('coach-chat-input');
      await input.fill(benchmarkCase.prompt);
      capture.arm();
      await page.getByTestId('coach-chat-send').click();
      await expectAgentRoute(capture, page);
    });
  }
});

