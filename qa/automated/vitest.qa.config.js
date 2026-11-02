/**
 * Vitest configuration for QA automated scaffold tests.
 * This is a separate config from the main vitest.config.js to keep
 * QA scaffold tests isolated from the production test suite.
 *
 * Usage:
 *   npx vitest run --config qa/automated/vitest.qa.config.js
 *
 * The main test suite (npm test) runs test/**\/*.test.js only.
 * This config runs qa/automated/**\/*.test.js only.
 */

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['qa/automated/**/*.test.js'],
    exclude: ['node_modules', 'dist'],
  },
});
