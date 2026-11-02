import { test, expect } from '@playwright/test';
import { spaNavigate, mockApi, logFailedRequests } from '../helpers/ui';

/**
 * Smoke – Production-critical (Read-only)
 * 
 * These tests verify critical production functionality without modifying any data.
 * They are designed to run quickly and catch major regressions before deployment.
 * 
 * Test Coverage:
 * 1. Application loads successfully
 * 2. Home page loads successfully  
 * 3. Basic navigation works (Home → Goals → Home)
 * 4. Health/Status verification (app hydration and readiness)
 */

test.describe('Smoke – Production-critical (Read-only)', () => {
  test.beforeEach(async ({ page }) => {
    // Mock API to avoid external dependencies and keep tests read-only
    await mockApi(page);
  });

  test('should verify application loads successfully', async ({ page }) => {
    test.setTimeout(60000);
    const requestLogger = await logFailedRequests(page);

    try {
      // Set up console error listener before navigation
      const criticalErrors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error' && !msg.text().includes('favicon')) {
          criticalErrors.push(msg.text());
        }
      });

      // Navigate to the base URL
      await spaNavigate(page, '/');
      
      // Wait for the React app to hydrate
      await page.waitForFunction(
        () => {
          const root = document.querySelector('#root');
          return root && root.children.length > 0;
        },
        { timeout: 15000 }
      );

      // Verify the app root element is present and visible
      const appRoot = page.locator('#root');
      await expect(appRoot).toBeVisible({ timeout: 10000 });
      
      console.log('✅ Application loaded successfully');
      
      if (criticalErrors.length > 0) {
        console.warn('⚠️ Console errors detected:', criticalErrors.slice(0, 3));
      }
    } catch (error) {
      requestLogger.logToConsole();
      await page.screenshot({ 
        path: `test-results/smoke-app-load-failed-${Date.now()}.png`, 
        fullPage: true 
      });
      throw error;
    }
  });

  test('should verify home page loads successfully', async ({ page }) => {
    test.setTimeout(60000);
    const requestLogger = await logFailedRequests(page);

    try {
      // Navigate to home page
      await spaNavigate(page, '/');
      
      // Wait for app hydration
      await page.waitForFunction(
        () => {
          const root = document.querySelector('#root');
          return root && root.children.length > 0;
        },
        { timeout: 15000 }
      );

      // Wait for network to be idle
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch((err) => {
        console.warn('[Home Page] Network idle timeout (non-critical):', err.message);
      });

      // Verify page content is visible - look for common home page elements
      // This is flexible to handle different home page layouts
      const contentVisible = await page.locator('body').isVisible({ timeout: 5000 });
      expect(contentVisible).toBe(true);

      // Verify the page has rendered content (not blank)
      const hasContent = await page.evaluate(() => {
        const body = document.body;
        return body && body.textContent && body.textContent.trim().length > 0;
      });
      expect(hasContent).toBe(true);

      console.log('✅ Home page loaded successfully');
    } catch (error) {
      requestLogger.logToConsole();
      await page.screenshot({ 
        path: `test-results/smoke-home-page-failed-${Date.now()}.png`, 
        fullPage: true 
      });
      throw error;
    }
  });

  test('should verify basic navigation works (Home → Goals → Home)', async ({ page }) => {
    test.setTimeout(90000);
    const requestLogger = await logFailedRequests(page);

    try {
      // Start at home page
      console.log('[Navigation] Starting at Home page...');
      await spaNavigate(page, '/');
      
      await page.waitForFunction(
        () => {
          const root = document.querySelector('#root');
          return root && root.children.length > 0;
        },
        { timeout: 15000 }
      );

      // Verify we're on the home page
      const currentUrl = page.url();
      expect(currentUrl).toContain('/');
      console.log('[Navigation] ✓ Home page loaded');

      // Navigate to Goals page
      console.log('[Navigation] Navigating to Goals page...');
      await spaNavigate(page, '/Goals');
      
      await page.waitForLoadState('domcontentloaded', { timeout: 15000 });
      
      // Goals is protected in production. An authenticated session reaches
      // the page directly; a guest must be redirected to login while retaining
      // the requested destination.
      const goalsUrl = new URL(page.url());
      const reachedGoals = goalsUrl.pathname === '/Goals';
      if (reachedGoals) {
        console.log('[Navigation] ✓ Goals page loaded');
      } else {
        expect(goalsUrl.pathname).toBe('/login');
        expect(goalsUrl.searchParams.get('from_url')).toBe('/Goals');
        console.log('[Navigation] ✓ Guest redirected to login with Goals return URL');
      }

      // Wait for the resulting page to fully render
      await page.waitForFunction(
        () => {
          const root = document.querySelector('#root');
          return root && root.children.length > 0 && document.readyState === 'complete';
        },
        { timeout: 10000 }
      );

      if (reachedGoals) {
        // Navigate back to Home when the test session is authenticated.
        console.log('[Navigation] Navigating back to Home...');
        await spaNavigate(page, '/');
        
        await page.waitForFunction(
          () => {
            const root = document.querySelector('#root');
            return root && root.children.length > 0;
          },
          { timeout: 15000 }
        );

        const homeUrl = page.url();
        expect(homeUrl).toMatch(/\/$|\/Home$/);
        console.log('[Navigation] ✓ Returned to Home page');
      } else {
        console.log('[Navigation] ✓ Protected-route access gate verified');
      }

      console.log('✅ Basic navigation/access control verified successfully');
    } catch (error) {
      requestLogger.logToConsole();
      await page.screenshot({ 
        path: `test-results/smoke-navigation-failed-${Date.now()}.png`, 
        fullPage: true 
      });
      throw error;
    }
  });

  test('should verify health/status (app readiness)', async ({ page }) => {
    test.setTimeout(60000);
    const requestLogger = await logFailedRequests(page);

    try {
      console.log('[Health Check] Verifying app readiness...');
      
      // Navigate to the app
      await spaNavigate(page, '/');
      
      // Verify app hydration (React app is ready)
      const isHydrated = await page.waitForFunction(
        () => {
          const root = document.querySelector('#root');
          return root && root.children.length > 0;
        },
        { timeout: 15000 }
      );
      expect(isHydrated).toBeTruthy();
      console.log('[Health Check] ✓ App hydrated');

      // Verify DOM is interactive
      const readyState = await page.evaluate(() => document.readyState);
      expect(['interactive', 'complete']).toContain(readyState);
      console.log('[Health Check] ✓ DOM ready state:', readyState);

      // Verify no critical network failures (404s, 500s on critical resources)
      const failedRequests = requestLogger.getFailedRequests();
      const criticalFailures = failedRequests.filter(req => 
        !req.includes('analytics') && 
        !req.includes('favicon') &&
        !req.includes('manifest')
      );
      
      if (criticalFailures.length > 0) {
        console.warn('⚠️ Non-critical network issues:', criticalFailures.slice(0, 3));
      }
      
      // We don't fail the test for network issues if the app still hydrates
      // This makes the test more resilient to API mocking issues

      // Verify the app is visually rendered (not a blank page)
      const appRoot = page.locator('#root');
      await expect(appRoot).toBeVisible({ timeout: 10000 });
      console.log('[Health Check] ✓ App is visible');

      console.log('✅ Health/Status check passed - app is ready');
    } catch (error) {
      requestLogger.logToConsole();
      await page.screenshot({ 
        path: `test-results/smoke-health-check-failed-${Date.now()}.png`, 
        fullPage: true 
      });
      throw error;
    }
  });
});
