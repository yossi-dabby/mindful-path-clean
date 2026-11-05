import { defineConfig } from '@playwright/test';
import pilot from './hebrew-pilot.playwright.config';
import reader from './pdf-reader.playwright.config';

export default defineConfig({
  ...pilot,
  testMatch: 'english-forms-pilot.spec.ts',
  timeout: 90000,
  projects: reader.projects,
});
