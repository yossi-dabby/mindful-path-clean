import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/pilot',
  testMatch: 'pdf-reader.spec.ts',
  workers: 1,
  timeout: 45000,
  use: {
    baseURL: 'http://127.0.0.1:3005',
    launchOptions: process.env.PILOT_CHROMIUM_PATH ? {
      executablePath: process.env.PILOT_CHROMIUM_PATH,
      args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    } : {},
  },
  projects: [
    { name: 'reader-desktop', use: { ...devices['Desktop Chrome'], hasTouch: true } },
    { name: 'reader-tablet', use: { ...devices['iPad Mini'], browserName: 'chromium', viewport: { width: 768, height: 1024 } } },
    { name: 'reader-mobile', use: { ...devices['Pixel 5'], viewport: { width: 390, height: 844 } } },
  ],
  webServer: {
    command: 'node tests/fixtures/hebrew-pilot-server.mjs',
    url: 'http://127.0.0.1:3005/Tools',
    reuseExistingServer: false,
  },
});
