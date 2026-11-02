import { defineConfig, devices } from '@playwright/test';
import baseConfig from './playwright.config';

/**
 * Playwright configuration for Android-focused E2E testing.
 * 
 * This config extends the base Playwright config and focuses on Android Chrome
 * readiness testing. It should only be used when explicitly invoked via:
 *   npx playwright test -c playwright.android.config.ts
 * 
 * Features:
 * - Uses Pixel 5 device emulation for Android-specific behavior
 * - Targets tests in ./tests/android directory
 * - Enables tracing, video, and screenshots on failure for debugging
 */
export default defineConfig({
  ...baseConfig,
  testDir: './tests/android',
  testMatch: ['**/*.android.spec.ts'], // Match Android-specific test files
  projects: [
    {
      name: 'android-chrome',
      use: {
        ...devices['Pixel 5'],
      },
    },
  ],
  use: {
    ...baseConfig.use,
    // Enable tracing on failure for debugging
    trace: 'retain-on-failure',
    // Capture video on failure
    video: 'retain-on-failure',
    // Take screenshots on failure
    screenshot: 'only-on-failure',
  },
});
