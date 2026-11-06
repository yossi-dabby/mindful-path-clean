// Render one explicitly scoped translation wave; no runtime assets are modified.
import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
const wave = process.argv.find(arg => arg.startsWith('--wave='))?.split('=')[1] || 'series-01';
if (!['series-01', 'series-02'].includes(wave)) throw new Error('Unknown English wave');
const manifest = JSON.parse(await readFile(new URL(`../content/forms-localization/waves/en-${wave}.json`, import.meta.url), 'utf8'));
const units = manifest.units.filter(unit => !manifest.preserveUnits.includes(unit));
let cursor = 0;
async function worker() {
  while (cursor < units.length) {
    const unit = units[cursor++];
    await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, ['scripts/render-forms-translation.mjs', `--unit=${unit}`, ...(process.argv.includes('--screenshots') ? ['--screenshots'] : [])], { stdio: 'inherit' });
      child.on('error', reject);
      child.on('exit', code => code === 0 ? resolve() : reject(new Error(`${unit}: render failed (${code})`)));
    });
  }
}
await Promise.all([worker(), worker()]);
console.log(`${units.length} units / ${manifest.newCount} new forms rendered and checked; all previously installed PDFs were preserved.`);
