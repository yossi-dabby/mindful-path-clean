import { defineConfig, devices } from '@playwright/test';
import baseConfig from './playwright.config';

const androidTablet = {
  userAgent:
    'Mozilla/5.0 (Linux; Android 14; Pixel Tablet) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  viewport: { width: 800, height: 1280 },
  screen: { width: 800, height: 1280 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  defaultBrowserType: 'chromium',
};

export default defineConfig({
  ...baseConfig,
  testDir: './tests/android',
  testMatch: ['**/stage14-native.android.spec.ts'],
  fullyParallel: false,
  workers: 2,
  projects: [
    {
      name: 'android-compact-portrait',
      use: {
        ...devices['Galaxy S9+'],
      },
    },
    {
      name: 'android-pixel5-portrait',
      use: {
        ...devices['Pixel 5'],
      },
    },
    {
      name: 'android-pixel5-landscape',
      use: {
        ...devices['Pixel 5'],
        viewport: { width: 851, height: 393 },
        screen: { width: 851, height: 393 },
      },
    },
    {
      name: 'android-tablet-portrait',
      use: androidTablet,
    },
    {
      name: 'android-tablet-landscape',
      use: {
        ...androidTablet,
        viewport: { width: 1280, height: 800 },
        screen: { width: 1280, height: 800 },
      },
    },
  ],
  use: {
    ...baseConfig.use,
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
});
