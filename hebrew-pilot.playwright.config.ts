import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/pilot',
  testMatch: 'hebrew-forms-pilot.spec.ts',
  workers: 1,
  timeout: 30000,
  use: {
    baseURL: 'http://127.0.0.1:5175',
    launchOptions: process.env.PILOT_CHROMIUM_PATH ? {
      executablePath: process.env.PILOT_CHROMIUM_PATH,
      args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    } : {},
  },
  projects: [
    { name: 'pilot-desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'pilot-mobile', use: { ...devices['Pixel 5'], viewport: { width: 390, height: 844 } } },
  ],
  webServer: [
    { command: 'node tests/fixtures/hebrew-pilot-server.mjs', url: 'http://127.0.0.1:3005/Tools', reuseExistingServer: false },
    { command: 'npx vite --host 127.0.0.1 --port 5175 --config tests/fixtures/hebrew-pilot.vite.config.mjs', url: 'http://127.0.0.1:5175/tests/fixtures/hebrew-pilot-preview.html', reuseExistingServer: false },
  ],
});
