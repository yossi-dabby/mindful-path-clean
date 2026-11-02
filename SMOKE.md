# Smoke – Production-critical (Read-only) Tests

## Overview

The smoke test suite provides fast, production-critical validation of the application's core functionality. These tests are **read-only** and designed to catch major regressions before deployment without modifying any data.

## Test Coverage

The smoke test suite verifies:

1. **Application Load**: The app loads successfully and React hydrates properly
2. **Home Page**: The landing page renders without errors
3. **Basic Navigation**: Users can navigate between pages (Home → Goals → Home)
4. **Health/Status**: App readiness verification (hydration, DOM ready, no critical failures)

## Key Characteristics

- ✅ **Read-only**: No data creation, modification, or deletion
- ✅ **Fast**: Typically completes in under 2 minutes
- ✅ **Production-safe**: Safe to run against production environments
- ✅ **Isolated**: Uses API mocking to avoid external dependencies
- ✅ **Stable**: Designed with appropriate waits to avoid flakiness

## Running Smoke Tests

### Locally

Run the smoke test suite only:

```bash
npm run test:e2e -- --project=smoke-production-critical
```

Run with UI mode for debugging:

```bash
npm run test:e2e -- --project=smoke-production-critical --ui
```

Run with headed browser (visible):

```bash
npm run test:e2e -- --project=smoke-production-critical --headed
```

### In CI

The smoke tests run automatically on every push and pull request to the `main` branch. They are configured in `.github/workflows/playwright.yml`.

To run only smoke tests in CI:

```bash
npm run test:e2e -- --project=smoke-production-critical
```

### Against a Specific URL

To test against a deployed environment:

**Mac/Linux:**
```bash
BASE_URL=https://your-app.example.com npm run test:e2e -- --project=smoke-production-critical
```

**PowerShell:**
```powershell
$env:BASE_URL="https://your-app.example.com"; npm run test:e2e -- --project=smoke-production-critical
```

## Test Structure

The smoke tests are located in:
- **File**: `tests/e2e/smoke-production-critical.spec.ts`
- **Project**: `smoke-production-critical` (Playwright project)
- **Helpers**: Uses shared helpers from `tests/helpers/ui.ts`

## Integration with Existing Tests

The smoke tests are configured as a separate Playwright project to:
- Allow selective execution (`--project=smoke-production-critical`)
- Enable different CI workflows (e.g., run smoke tests on every commit, full E2E nightly)
- Provide clear separation between smoke and comprehensive E2E tests

Other test projects (e.g., `web-desktop`, `mobile-390x844`) automatically exclude the smoke tests to avoid duplication.

## Debugging Failed Tests

If a smoke test fails:

1. **Review the error message**: The test output will show which assertion failed
2. **Check screenshots**: Screenshots are automatically saved to `test-results/` with timestamps
3. **Run in UI mode**: Use `--ui` flag for step-by-step debugging
4. **Check network logs**: Failed requests are logged by the `logFailedRequests` helper

Example debugging session:

```bash
# Run in UI mode to debug interactively
npm run test:e2e -- --project=smoke-production-critical --ui

# Run with trace for detailed debugging
npm run test:e2e -- --project=smoke-production-critical --trace on
```

## Best Practices

When maintaining or extending smoke tests:

1. **Keep them fast**: Smoke tests should complete quickly (< 2 minutes total)
2. **Keep them read-only**: Never create, update, or delete data
3. **Keep them stable**: Use appropriate waits and robust selectors
4. **Keep them focused**: Test critical paths only, not edge cases
5. **Use API mocking**: Avoid external dependencies for speed and reliability

## Example: Adding a New Smoke Test

```typescript
test('should verify new critical feature', async ({ page }) => {
  test.setTimeout(60000);
  const requestLogger = await logFailedRequests(page);

  try {
    // Navigate to the feature
    await spaNavigate(page, '/NewFeature');
    
    // Verify it loads
    await page.waitForLoadState('domcontentloaded');
    
    // Check critical element is visible (read-only check)
    const criticalElement = page.locator('[data-testid="critical-element"]');
    await expect(criticalElement).toBeVisible({ timeout: 10000 });
    
    console.log('✅ New critical feature verified');
  } catch (error) {
    requestLogger.logToConsole();
    await page.screenshot({ 
      path: `test-results/smoke-feature-failed-${Date.now()}.png`,
      fullPage: true 
    });
    throw error;
  }
});
```

## FAQ

**Q: Why are the smoke tests in a separate project?**  
A: This allows you to run just the smoke tests quickly without running the full E2E suite.

**Q: Can I run smoke tests against production?**  
A: Yes! The tests are read-only and use API mocking, so they're safe for production.

**Q: How often should smoke tests run?**  
A: We recommend running them on every commit and before every deployment.

**Q: What's the difference between smoke tests and E2E tests?**  
A: Smoke tests are fast, read-only checks of critical paths. E2E tests are comprehensive and may include write operations.

**Q: Can I run both smoke and E2E tests together?**  
A: Yes, just run `npm run test:e2e` without the `--project` flag to run all test projects.

## Related Documentation

- [E2E Testing Overview](README.md#running-e2e-tests)
- [Playwright Documentation](https://playwright.dev)
- [Test Helpers](tests/helpers/ui.ts)
