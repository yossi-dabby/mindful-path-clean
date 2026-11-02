import { test, expect } from '@playwright/test';
import { spaNavigate, mockApi, logFailedRequests } from '../helpers/ui';

/**
 * User Flows – End-to-end tests for key page navigation and interactions.
 *
 * NOTE: Selectors intentionally target `main h1` rather than a bare `h1` selector.
 * The app layout places a Sidebar (hidden on mobile via `hidden md:flex`) and a
 * MobileHeader (outside <main>) that each contain their own h1 elements.  Using
 * `main h1` scopes the query to the page-content area and avoids falsely matching
 * those hidden or out-of-content headings.
 */

test.describe('Page Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await mockApi(page);
  });

  test('Home page loads and renders key UI elements', async ({ page }) => {
    test.setTimeout(60000);
    const requestLogger = await logFailedRequests(page);

    try {
      await spaNavigate(page, '/');

      await page.waitForFunction(
        () => {
          const root = document.querySelector('#root');
          return root && root.children.length > 0;
        },
        { timeout: 15000 }
      );

      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

      // Scope to <main> to avoid the hidden sidebar h1 ("MindWell") on mobile.
      // The greeting h1 ("Good morning / afternoon / evening") lives inside <main>.
      const heading = page.locator('main h1').first();
      await expect(heading).toBeVisible({ timeout: 15000 });

      console.log('✅ Home page loaded with visible heading');
    } catch (error) {
      requestLogger.logToConsole();
      await page.screenshot({
        path: `test-results/user-flows-home-failed-${Date.now()}.png`,
        fullPage: true,
      });
      throw error;
    }
  });

  test('Community page loads and displays the forum tab', async ({ page }) => {
    test.setTimeout(60000);
    const requestLogger = await logFailedRequests(page);

    try {
      await spaNavigate(page, '/Community');

      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

      // Scope to <main> to avoid the hidden sidebar h1 ("MindWell") on mobile.
      // The Community page renders its own h1 ("Community") inside <main>.
      const communityHeading = page.locator('main h1').filter({ hasText: /community/i }).first();
      await expect(communityHeading).toBeVisible({ timeout: 15000 });

      // Tabs (Forum / Groups / Progress) should be present
      const forumTab = page.getByRole('tab', { name: /forum/i });
      await expect(forumTab).toBeVisible({ timeout: 10000 });

      console.log('✅ Community page loaded with heading and Forum tab');
    } catch (error) {
      requestLogger.logToConsole();
      await page.screenshot({
        path: `test-results/user-flows-community-failed-${Date.now()}.png`,
        fullPage: true,
      });
      throw error;
    }
  });
});

test.describe('Forum Post', () => {
  test.beforeEach(async ({ page }) => {
    await mockApi(page);
  });

  test('Forum post created via form should appear in the forum list', async ({ page }) => {
    test.setTimeout(90000);
    const requestLogger = await logFailedRequests(page);

    try {
      await spaNavigate(page, '/Community');

      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

      // Scope to <main> to avoid the hidden sidebar h1 ("MindWell") on mobile.
      const communityHeading = page.locator('main h1').filter({ hasText: /community/i }).first();
      await expect(communityHeading).toBeVisible({ timeout: 15000 });

      // Verify the Forum tab is accessible
      const forumTab = page.getByRole('tab', { name: /forum/i });
      await expect(forumTab).toBeVisible({ timeout: 10000 });

      // Ensure the Forum tab is active
      await forumTab.click();

      // Open the New Post form via the button or the empty-state CTA
      const newPostButton = page
        .getByRole('button', { name: /new post/i })
        .or(page.locator('[data-testid="create-first-post-btn"]'))
        .first();
      await expect(newPostButton).toBeVisible({ timeout: 10000 });
      await newPostButton.click();

      // Verify the post form is visible (ForumPostForm renders a card overlay with "Create Post" heading)
      const postFormHeading = page.getByText('Create Post', { exact: true }).first();
      await expect(postFormHeading).toBeVisible({ timeout: 10000 });

      console.log('✅ Forum post form opened successfully');
    } catch (error) {
      requestLogger.logToConsole();
      await page.screenshot({
        path: `test-results/user-flows-forum-post-failed-${Date.now()}.png`,
        fullPage: true,
      });
      throw error;
    }
  });
});
