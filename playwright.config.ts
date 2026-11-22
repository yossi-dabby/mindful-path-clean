import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests', // Ensures Playwright looks in the tests folder
  use: {
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || process.env.E2E_BASE_URL || process.env.BASE_URL || 'http://127.0.0.1:5173',
  },
  webServer: process.env.PLAYWRIGHT_TEST_BASE_URL || process.env.E2E_BASE_URL || process.env.BASE_URL
    ? undefined
    : {
        command: 'npm run dev -- --host 127.0.0.1 --port 5173',
        url: 'http://127.0.0.1:5173',
        reuseExistingServer: true,
        timeout: 120_000,
      },
  testMatch: ['e2e/**/*.spec.ts'], // Ensures it finds tests/e2e/smoke.web.spec.ts
  projects: [
    {
      name: 'ios-webkit-readiness',
      testMatch: [
        'e2e/store-readiness-shell.spec.ts',
        'e2e/readiness-controls.spec.ts',
        'e2e/pull-to-refresh.spec.ts',
        'e2e/settings-delete-account.spec.ts',
        'ios/stage15-native.ios.spec.ts',
      ],
      use: {
        ...devices['iPhone 15 Pro'],
        browserName: 'webkit',
      },
    },
    {
      name: 'smoke-production-critical',
      testMatch: ['**/smoke-production-critical.spec.ts'],
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    {
      name: 'web-desktop',
      testIgnore: ['**/smoke-production-critical.spec.ts'],
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    {
      name: 'mobile-390x844',
      testIgnore: ['**/smoke-production-critical.spec.ts'],
      use: {
        ...devices['Pixel 5'],
        viewport: { width: 390, height: 844 },
      },
    },
  ],
  // Add more global config if needed.
});
