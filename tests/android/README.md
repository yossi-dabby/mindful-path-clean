# Android E2E Testing

This directory contains Android-specific end-to-end tests for the Mindful Path application. These tests are designed to verify production readiness on Android devices, focusing on critical user interactions and platform-specific behaviors.

## Overview

The Android E2E test suite covers:
- **Chat Stability**: Ensures the chat interface remains functional after repeated message sending
- **Goal Milestone Persistence**: Verifies that goal checkbox states persist across page reloads
- **Select Component Interactions**: Tests Radix UI Select components in Crisis Alerts filters and Health Data forms
- **Keyboard Layout**: Validates that the chat composer remains accessible when the virtual keyboard is displayed

## Test Files

- `chat.android.spec.ts` - Chat stability and composer visibility tests
- `goals.android.spec.ts` - Goal milestone checkbox persistence tests
- `selects.android.spec.ts` - Radix UI Select component interaction tests (Crisis Alerts & Health Data Form)
- `keyboard.android.spec.ts` - Chat composer keyboard layout tests
- `utils/androidHelpers.ts` - Shared helper functions for Android testing

## Running the Tests

### Prerequisites

1. Ensure you have Playwright installed:
   ```bash
   npm install
   ```

2. Install Playwright browsers (if not already installed):
   ```bash
   npx playwright install
   ```

### Run Android Tests

To run the Android E2E tests:

```bash
npm run test:e2e:android
```

This command uses the `playwright.android.config.ts` configuration which:
- Uses Pixel 5 device emulation
- Only runs tests in the `tests/android/` directory
- Enables tracing, video, and screenshots on failure

### Run Against a Different Environment

By default, tests run against `http://localhost:5173`. To test against a different environment (staging, preview, production):

```bash
E2E_BASE_URL=https://your-staging-url.com npm run test:e2e:android
```

### Additional Options

Run with UI mode for debugging:
```bash
npx playwright test -c playwright.android.config.ts --ui
```

Run a specific test file:
```bash
npx playwright test -c playwright.android.config.ts chat.android.spec.ts
```

Run in headed mode (see browser):
```bash
npx playwright test -c playwright.android.config.ts --headed
```

## Test Design Principles

### Graceful Skipping
Tests are designed to skip gracefully when preconditions aren't met rather than failing. For example:
- If a page element isn't found, the test will skip with a clear message
- If test data isn't available, the test skips rather than assumes specific data

### Resilience to Data Changes
Tests use generic selectors and don't assume specific goal titles or alert content, making them resilient to staging data sharing scenarios.

### Console Monitoring
All tests use `assertNoConsoleErrorsOrWarnings()` at the start to capture console errors and warnings throughout test execution. The returned function is called at the end to assert no issues occurred.

### Platform-Specific Validation
- `assertElementVisibleAndTappable()` checks that elements aren't obscured by the virtual keyboard
- Tests use Pixel 5 device emulation for accurate Android behavior

## Helper Functions

### `assertNoConsoleErrorsOrWarnings(page)`
Sets up monitoring for console errors and warnings. Returns a function that should be called at the end of the test to check for issues.

**Usage:**
```javascript
const checkConsole = assertNoConsoleErrorsOrWarnings(page);
// ... test actions ...
await checkConsole();
```

### `assertElementVisibleAndTappable(page, selector)`
Verifies an element is visible and its bottom edge is within the viewport (not hidden behind keyboard).

## Debugging Test Failures

When tests fail, Playwright automatically captures:
- **Traces**: Full execution trace for replay in Playwright Trace Viewer
- **Videos**: Screen recording of the test execution
- **Screenshots**: Screenshot at the point of failure

To view traces:
```bash
npx playwright show-trace test-results/path-to-trace.zip
```

## Configuration

The Android tests use a dedicated Playwright configuration (`playwright.android.config.ts`) that extends the base config. Key settings:

- **Device**: Pixel 5 emulation
- **Test Directory**: `./tests/android`
- **Tracing**: Enabled on failure
- **Video**: Captured on failure
- **Screenshots**: Taken on failure only

## Integration with CI/CD

To run these tests in your CI/CD pipeline:

```yaml
- name: Run Android E2E Tests
  run: npm run test:e2e:android
  env:
    E2E_BASE_URL: ${{ env.PREVIEW_URL }}
```

## Non-Goals

These tests are **additive** and do not:
- Modify existing E2E or smoke tests
- Change application runtime behavior
- Alter the main Playwright configuration
- Introduce breaking changes to the test infrastructure

## Maintenance

When adding new Android-specific tests:
1. Follow the existing pattern of graceful skipping
2. Use the helper functions in `utils/androidHelpers.ts`
3. Add console monitoring with `assertNoConsoleErrorsOrWarnings()`
4. Document any new test scenarios in this README
