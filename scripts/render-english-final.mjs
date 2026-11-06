// Render one explicitly scoped translation wave; no runtime assets are modified.
import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
const wave = process.argv.find(arg => arg.startsWith('--wave='))?.split('=')[1] || 'series-03';
if (!['series-03'].includes(wave)) throw new Error('Unknown English wave');
const manifest = JSON.parse(await readFile(new URL(`../content/forms-localization/waves/en-${wave}.json`, import.meta.url), 'utf8'));
const units = manifest.packets.map(packet => packet.key);
let cursor = 0;
const failures = [];
async function worker() {
  while (cursor < units.length) {
    const unit = units[cursor++];
    try { await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, ['scripts/render-forms-final.mjs', `--unit=${unit}`, ...(process.argv.includes('--screenshots') ? ['--screenshots'] : [])], { stdio: 'inherit' });
      child.on('error', reject);
      child.on('exit', code => code === 0 ? resolve() : reject(new Error(`${unit}: render failed (${code})`)));
    }); } catch (error) { failures.push(unit); console.error(error.message); }
  }
}
await Promise.all([worker(), worker()]);
if (failures.length) throw new Error(`Failed packets: ${failures.join(', ')}`);
console.log(`${units.length} units / ${manifest.newCount} new forms rendered and checked; all previously installed PDFs were preserved.`);
