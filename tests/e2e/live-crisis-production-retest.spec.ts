import { expect, test, type Page, type Request } from '@playwright/test';
import { mockApi } from '../helpers/ui';
import { AGENT_BENCHMARK_CATALOG } from '../../scripts/agent-benchmark-catalog.mjs';

const BASE_URL = 'https://mindful-path-production-7704.up.railway.app';
const crisisScenario = AGENT_BENCHMARK_CATALOG.scenarios.find(
  ({ id }) => id === 'crisis_explicit_self_harm',
);

if (!crisisScenario) throw new Error('Canonical crisis scenario is missing');

const blockedNotice: Record<string, string> = {
  de: 'Deine Nachricht wurde nicht an die KI gesendet.',
  en: 'Your message was not sent to the AI.',
  es: 'Tu mensaje no se envió a la IA.',
  fr: 'Votre message n’a pas été envoyé à l’IA.',
  he: 'ההודעה לא נשלחה ל-AI.',
  it: 'Il messaggio non è stato inviato all’IA.',
  pt: 'A sua mensagem não foi enviada à IA.',
};

const testSession = {
  id: 'live-crisis-test-session',
  title: 'Live Crisis Test Session',
  current_challenge: 'Synthetic safety validation only',
  focus_area: 'general',
  stage: 'discovery',
  status: 'active',
  agent_conversation_id: 'live-crisis-test-conversation',
  action_plan: [],
  created_by: 'test@example.com',
  created_date: '2026-10-08T00:00:00.000Z',
};

type NetworkObservation = {
  agentWrites: string[];
  entityWrites: string[];
};

function observeWrites(page: Page) {
  const observation: NetworkObservation = { agentWrites: [], entityWrites: [] };
  let armed = false;
  const writeMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

  page.on('request', (request: Request) => {
    if (!armed || !writeMethods.has(request.method())) return;
    const url = request.url();
    if (url.includes('/agents/')) observation.agentWrites.push(url);
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

test.describe.configure({ mode: 'serial' });

const describeLive = process.env.RUN_LIVE_CRISIS_RETEST === 'true'
  ? test.describe
  : test.describe.skip;

describeLive('deployed production crisis hard-gate retest', () => {
  for (const language of AGENT_BENCHMARK_CATALOG.languages) {
    const prompt = crisisScenario.prompts[language];

    test(`Chat ${language}: intercepts before agent or entity write`, async ({ page }) => {
      test.setTimeout(60_000);
      await prepareBasePage(page, language);
      const capture = observeWrites(page);

      await page.goto(`${BASE_URL}/Chat`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      await expect(page.getByTestId('chat-root')).toBeVisible({ timeout: 20_000 });
      await expect(page.locator('html')).toHaveAttribute('lang', new RegExp(`^${language}`, 'i'));

      const input = page.getByTestId('therapist-chat-input');
      await expect(input).toBeVisible();
      await input.fill(prompt);
      capture.arm();
      await page.getByTestId('therapist-chat-send').click();

      const panel = page.getByTestId('inline-risk-panel');
      await expect(panel).toBeVisible({ timeout: 10_000 });
      await expect(page.getByTestId('risk-message-blocked-notice')).toContainText(blockedNotice[language]);
      await expect(input).toHaveValue('');
      await page.waitForTimeout(750);

      expect(capture.observation.agentWrites, 'messageSentToAgent must be false').toEqual([]);
      expect(capture.observation.entityWrites, 'entityWriteAttempts must equal 0').toEqual([]);
    });
  }

  for (const language of AGENT_BENCHMARK_CATALOG.languages) {
    const prompt = crisisScenario.prompts[language];

    test(`Coach ${language}: intercepts before agent or entity write`, async ({ page }) => {
      test.setTimeout(60_000);
      await prepareBasePage(page, language);

      await page.route('**/api/**/entities/CoachingSession**', async (route) => {
        const isItemRequest = route.request().url().includes(testSession.id);
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(isItemRequest ? testSession : [testSession]),
        });
      });
      await page.route('**/api/**/entities/CrisisAlert**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ id: 'blocked-live-test-alert' }),
        });
      });

      const capture = observeWrites(page);
      await page.goto(`${BASE_URL}/Coach`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      await expect(page.getByTestId('coach-page')).toBeVisible({ timeout: 20_000 });
      await page.getByText(testSession.title, { exact: true }).click();
      await expect(page.getByTestId('coach-chat')).toBeVisible({ timeout: 10_000 });
      await expect(page.locator('html')).toHaveAttribute('lang', new RegExp(`^${language}`, 'i'));

      const input = page.getByTestId('coach-chat-input');
      await input.fill(prompt);
      capture.arm();
      await page.getByTestId('coach-chat-send').click();

      await expect(page.getByTestId('inline-risk-panel')).toBeVisible({ timeout: 10_000 });
      await expect(page.getByTestId('risk-message-blocked-notice')).toContainText(blockedNotice[language]);
      await page.waitForTimeout(750);

      expect(capture.observation.agentWrites, 'messageSentToAgent must be false').toEqual([]);
      expect(capture.observation.entityWrites, 'entityWriteAttempts must equal 0').toEqual([]);
    });
  }
});
