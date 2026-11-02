import {defineConfig} from '@playwright/test';
import stage5 from './stage5.playwright.config';
// The same synthetic-data server runs focused Stage 6 coverage or existing shell regressions.
const regression=Boolean(process.env.STAGE6_REGRESSION);
export default defineConfig({
 ...stage5,
 testDir:regression?'./tests':'./qa/stage6',
 testMatch:regression?['e2e/settings-responsive.spec.ts','e2e/settings-delete-account.spec.ts','e2e/sidebar-navigation.spec.ts']:['e2e/*.spec.ts'],
 use:{...stage5.use,baseURL:'http://127.0.0.1:5186'},
 webServer:{command:'VITE_BASE44_APP_BASE_URL=http://127.0.0.1:5199 VITE_BASE44_APP_ID=test-app-id npm run dev -- --host 127.0.0.1 --port 5186',url:'http://127.0.0.1:5186',reuseExistingServer:true,timeout:120000}
});
