import { defineConfig, devices } from '@playwright/test';
import baseConfig from './playwright.config';

export default defineConfig({
  ...baseConfig,
  testDir: './tests/ios',
  testMatch: ['**/stage15-native.ios.spec.ts'],
  fullyParallel: false,
  workers: 2,
  projects: [
    {
      name: 'ios-iphone-se-portrait',
      use: { ...devices['iPhone SE (3rd gen)'] },
    },
    {
      name: 'ios-iphone15-pro-portrait',
      use: { ...devices['iPhone 15 Pro'] },
    },
    {
      name: 'ios-iphone15-pro-landscape',
      use: { ...devices['iPhone 15 Pro landscape'] },
    },
    {
      name: 'ios-ipad-pro11-portrait',
      use: { ...devices['iPad Pro 11'] },
    },
    {
      name: 'ios-ipad-pro11-landscape',
      use: { ...devices['iPad Pro 11 landscape'] },
    },
  ],
  use: {
    ...baseConfig.use,
    browserName: 'webkit',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
});
