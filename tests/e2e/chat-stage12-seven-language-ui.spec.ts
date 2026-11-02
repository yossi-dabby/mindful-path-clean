import { test, expect, type Page } from '@playwright/test';
import { mockApi } from '../helpers/ui';
import {
  STAGE12_CHAT_SCENARIOS,
  STAGE12_SUPPORTED_LANGUAGES,
} from '../../src/lib/chatQualityStage12.js';

const BASE_URL =
  process.env.PLAYWRIGHT_TEST_BASE_URL ||
  process.env.E2E_BASE_URL ||
  process.env.BASE_URL ||
  'http://127.0.0.1:5173';

async function prepare(page: Page, language: string) {
  await mockApi(page);
  await page.addInitScript(({ language }) => {
    localStorage.setItem('language', language);
    localStorage.setItem('i18nextLng', language);
    localStorage.setItem('chat_consent_accepted', 'true');
    localStorage.setItem('age_verified', 'true');
    (window as Window & { __TEST_APP_ID__?: string }).__TEST_APP_ID__ = 'test-app-id';
    (window as Window & { __DISABLE_ANALYTICS__?: boolean }).__DISABLE_ANALYTICS__ = true;
  }, { language });
  await page.goto(`${BASE_URL}/Chat`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await expect(page.getByTestId('chat-root')).toBeVisible({ timeout: 20000 });
}

test.describe('Stage 12 seven-language chat UI gate', () => {
  for (const language of STAGE12_SUPPORTED_LANGUAGES) {
    test(`${language}: intent choices, direction, prompt input and TXT attachment are usable`, async ({ page }) => {
      await prepare(page, language);

      await expect(page.locator('html')).toHaveAttribute('lang', new RegExp(`^${language}`, 'i'));
      await expect(page.locator('html')).toHaveAttribute('dir', language === 'he' ? 'rtl' : 'ltr');

      const chooser = page.getByTestId('chat-intent-chooser');
      await expect(chooser).toBeVisible();
      await expect(chooser.getByRole('button')).toHaveCount(3);

      const prompt = STAGE12_CHAT_SCENARIOS.find(({ id }) => id === 'vent_only')?.prompts[language];
      expect(typeof prompt).toBe('string');
      const input = page.getByTestId('therapist-chat-input');
      await input.fill(prompt as string);
      await expect(input).toHaveValue(prompt as string);

      const fileInput = page.getByTestId('chat-file-input');
      await expect(fileInput).toHaveAttribute('accept', /\.txt/);
      await fileInput.setInputFiles({
        name: `stage12-${language}.txt`,
        mimeType: 'text/plain',
        buffer: Buffer.from(`Synthetic Stage 12 ${language} attachment`),
      });
      await expect(page.getByText(`stage12-${language}.txt`)).toBeVisible();
    });
  }
});
