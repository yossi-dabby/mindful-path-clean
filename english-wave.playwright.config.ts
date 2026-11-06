import { defineConfig } from '@playwright/test';
import english from './english-pilot.playwright.config';
export default defineConfig({ ...english, testMatch: 'english-forms-wave.spec.ts' });
