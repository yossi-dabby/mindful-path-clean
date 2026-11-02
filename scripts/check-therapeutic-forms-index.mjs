import { spawnSync } from 'node:child_process';
import path from 'node:path';

const ROOT = process.cwd();
const GENERATOR = path.join(ROOT, 'scripts', 'generate-therapeutic-forms-index.mjs');
const GENERATED_INDEX = 'src/generated/therapeutic-forms-index.json';

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    stdio: 'inherit',
    env: process.env,
  });
  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

run(process.execPath, [GENERATOR]);
run('git', ['diff', '--exit-code', '--', GENERATED_INDEX]);
