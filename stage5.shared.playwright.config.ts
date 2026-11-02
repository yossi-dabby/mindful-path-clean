import {defineConfig} from '@playwright/test';
import stage5 from './stage5.playwright.config';
export default defineConfig({...stage5,testDir:'./tests',testMatch:['e2e/coach-flows-premium.spec.ts','e2e/coach-responsive.spec.ts','e2e/community-responsive.spec.ts','e2e/goalcoach.spec.ts','e2e/smoke-production-critical.spec.ts']});
