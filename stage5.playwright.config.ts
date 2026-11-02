import {defineConfig} from '@playwright/test';
import path from 'node:path';

// Stage 5 synthetic-fixture regression and visual coverage runner.
const artifactRoot = process.env.STAGE5_ARTIFACT_ROOT || path.resolve('reports/stage5');
export default defineConfig({
  testDir:'./qa/stage5',testMatch:'e2e/tools-stage5-*.spec.ts',workers:2,fullyParallel:true,retries:0,timeout:60000,expect:{timeout:15000},
  outputDir:path.join(artifactRoot,`${process.env.STAGE5_RUN||'audit'}-results`),reporter:[['line'],['./qa/stage5/checkpointReporter.ts'],['json',{outputFile:path.join(artifactRoot,`${process.env.STAGE5_RUN||'audit'}-results.json`)}]],
  use:{actionTimeout:15000,baseURL:'http://127.0.0.1:5185',launchOptions:{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']}},
  webServer:{command:'VITE_BASE44_APP_BASE_URL=http://127.0.0.1:5199 VITE_BASE44_APP_ID=test-app-id npm run dev -- --host 127.0.0.1 --port 5185',url:'http://127.0.0.1:5185',reuseExistingServer:true,timeout:120000}
});
