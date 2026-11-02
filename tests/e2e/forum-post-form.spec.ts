import { test, expect } from '@playwright/test';
import { spaNavigate, mockApi, logFailedRequests } from '../helpers/ui';

/**
 * Integration Tests – ForumPostForm ↔ Base44 SDK
 *
 * These tests verify the interaction between the ForumPostForm component
 * (src/components/community/ForumPostForm.jsx) and the
 * base44.entities.ForumPost.create() API method.
 *
 * The API layer is mocked via the shared mockApi helper so no real network
 * calls leave the browser, but the actual HTTP request objects are still
 * captured and inspected so we can assert that the component composes the
 * correct payload before handing it off to the SDK.
 */

/** Helper: navigate to Community, activate Forum tab, and open ForumPostForm. */
async function openForumPostForm(page: any) {
  await spaNavigate(page, '/Community');
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

  const communityHeading = page.locator('main h1').filter({ hasText: /community/i }).first();
  await expect(communityHeading).toBeVisible({ timeout: 15000 });

  const forumTab = page.getByRole('tab', { name: /forum/i });
  await expect(forumTab).toBeVisible({ timeout: 10000 });
  await forumTab.click();

  const newPostButton = page
    .getByRole('button', { name: /new post/i })
    .or(page.locator('[data-testid="create-first-post-btn"]'))
    .first();
  await expect(newPostButton).toBeVisible({ timeout: 10000 });
  await newPostButton.click();

  const postFormHeading = page.getByText('Create Post', { exact: true }).first();
  await expect(postFormHeading).toBeVisible({ timeout: 10000 });

  return postFormHeading;
}

test.describe('ForumPostForm Integration', () => {
  test.beforeEach(async ({ page }) => {
    await mockApi(page);

    // The base44 SDK resolves base44.auth.me() via GET /entities/User/me.
    // The generic catch-all in mockApi returns [] for any unknown entity GET,
    // which would make `user` an array and `user.full_name` undefined.
    // Register a specific handler AFTER mockApi (Playwright evaluates routes in
    // LIFO order, so this handler takes precedence for this URL).
    await page.route('**/entities/User/me', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-user-123',
          email: 'test@example.com',
          full_name: 'Test User',
          role: 'user',
          created_date: new Date().toISOString(),
        }),
      });
    });
  });

  test('submits valid form data and calls ForumPost.create with the correct payload', async ({ page }) => {
    test.setTimeout(90000);
    const requestLogger = await logFailedRequests(page);

    try {
      const postFormHeading = await openForumPostForm(page);

      // Fill in title and content
      await page.getByPlaceholder("What's on your mind?").fill('My Integration Test Post');
      await page
        .getByPlaceholder('Share your thoughts, experiences, or questions...')
        .fill('This is a test post created by the integration test.');

      // Listen for the ForumPost create API request before submitting
      const forumPostRequestPromise = page.waitForRequest(
        (req: any) =>
          req.method() === 'POST' && req.url().includes('/entities/ForumPost'),
        { timeout: 20000 }
      );

      // Submit the form
      const postButton = page.getByRole('button', { name: /^post$/i });
      await expect(postButton).toBeEnabled({ timeout: 10000 });
      await postButton.click();

      // Assert API call was made with the correct payload
      const request = await forumPostRequestPromise;
      const requestBody = request.postDataJSON();

      expect(requestBody).toMatchObject({
        title: 'My Integration Test Post',
        content: 'This is a test post created by the integration test.',
        category: 'general',
        is_anonymous: false,
        author_display_name: 'Test User',
      });

      // Assert UI feedback: form closes after successful submission
      await expect(postFormHeading).not.toBeVisible({ timeout: 15000 });

      console.log('✅ ForumPostForm: form submitted with correct payload and form closed');
    } catch (error) {
      requestLogger.logToConsole();
      await page.screenshot({
        path: `test-results/forum-post-form-submit-failed-${Date.now()}.png`,
        fullPage: true,
      });
      throw error;
    }
  });

  test('sends author_display_name as "Anonymous User" when anonymous toggle is enabled', async ({ page }) => {
    test.setTimeout(90000);
    const requestLogger = await logFailedRequests(page);

    try {
      const postFormHeading = await openForumPostForm(page);

      // Fill in required fields
      await page.getByPlaceholder("What's on your mind?").fill('Anonymous Test Post');
      await page
        .getByPlaceholder('Share your thoughts, experiences, or questions...')
        .fill('This post should be published anonymously.');

      // Enable anonymous mode via the Switch
      const anonymousSwitch = page.getByRole('switch');
      await expect(anonymousSwitch).toBeVisible({ timeout: 5000 });
      await anonymousSwitch.click();

      // Capture the API request before submitting
      const forumPostRequestPromise = page.waitForRequest(
        (req: any) =>
          req.method() === 'POST' && req.url().includes('/entities/ForumPost'),
        { timeout: 20000 }
      );

      // Submit
      const postButton = page.getByRole('button', { name: /^post$/i });
      await expect(postButton).toBeEnabled({ timeout: 10000 });
      await postButton.click();

      // Assert payload contains anonymous flag and hidden author name
      const request = await forumPostRequestPromise;
      const requestBody = request.postDataJSON();

      expect(requestBody).toMatchObject({
        title: 'Anonymous Test Post',
        is_anonymous: true,
        author_display_name: 'Anonymous User',
      });

      // Form should close after successful submission
      await expect(postFormHeading).not.toBeVisible({ timeout: 15000 });

      console.log('✅ ForumPostForm: anonymous post submitted with author_display_name "Anonymous User"');
    } catch (error) {
      requestLogger.logToConsole();
      await page.screenshot({
        path: `test-results/forum-post-form-anonymous-failed-${Date.now()}.png`,
        fullPage: true,
      });
      throw error;
    }
  });

  test('includes added tags in the ForumPost.create payload', async ({ page }) => {
    test.setTimeout(90000);
    const requestLogger = await logFailedRequests(page);

    try {
      const postFormHeading = await openForumPostForm(page);

      // Fill required fields
      await page.getByPlaceholder("What's on your mind?").fill('Tagged Post Test');
      await page
        .getByPlaceholder('Share your thoughts, experiences, or questions...')
        .fill('This post has tags.');

      // Add two tags via the tag input
      const tagInput = page.getByPlaceholder('Add a tag...');
      await tagInput.fill('mindfulness');
      await page.getByRole('button', { name: /add tag/i }).click();

      await tagInput.fill('wellness');
      await tagInput.press('Enter');

      // Capture the API request
      const forumPostRequestPromise = page.waitForRequest(
        (req: any) =>
          req.method() === 'POST' && req.url().includes('/entities/ForumPost'),
        { timeout: 20000 }
      );

      // Submit
      const postButton = page.getByRole('button', { name: /^post$/i });
      await expect(postButton).toBeEnabled({ timeout: 10000 });
      await postButton.click();

      // Assert the tags are present in the payload
      const request = await forumPostRequestPromise;
      const requestBody = request.postDataJSON();

      expect(requestBody.tags).toEqual(expect.arrayContaining(['mindfulness', 'wellness']));

      // Form should close
      await expect(postFormHeading).not.toBeVisible({ timeout: 15000 });

      console.log('✅ ForumPostForm: tags included in ForumPost.create payload');
    } catch (error) {
      requestLogger.logToConsole();
      await page.screenshot({
        path: `test-results/forum-post-form-tags-failed-${Date.now()}.png`,
        fullPage: true,
      });
      throw error;
    }
  });

  test('Post button is disabled while title or content is empty', async ({ page }) => {
    test.setTimeout(60000);
    const requestLogger = await logFailedRequests(page);

    try {
      await openForumPostForm(page);

      const postButton = page.getByRole('button', { name: /^post$/i });

      // Initially disabled (both fields empty)
      await expect(postButton).toBeDisabled({ timeout: 5000 });

      // Fill title only – still disabled
      await page.getByPlaceholder("What's on your mind?").fill('Title only');
      await expect(postButton).toBeDisabled({ timeout: 5000 });

      // Fill content as well – now enabled
      await page
        .getByPlaceholder('Share your thoughts, experiences, or questions...')
        .fill('Some content');
      await expect(postButton).toBeEnabled({ timeout: 5000 });

      console.log('✅ ForumPostForm: Post button correctly disabled until both fields are filled');
    } catch (error) {
      requestLogger.logToConsole();
      await page.screenshot({
        path: `test-results/forum-post-form-disabled-btn-failed-${Date.now()}.png`,
        fullPage: true,
      });
      throw error;
    }
  });

  test('closes the form when the Cancel button is clicked without making an API call', async ({ page }) => {
    test.setTimeout(60000);
    const requestLogger = await logFailedRequests(page);

    try {
      const postFormHeading = await openForumPostForm(page);

      // Track whether any ForumPost create request is accidentally fired
      let createCallCount = 0;
      page.on('request', (req: any) => {
        if (req.method() === 'POST' && req.url().includes('/entities/ForumPost')) {
          createCallCount++;
        }
      });

      // Fill some content then cancel
      await page.getByPlaceholder("What's on your mind?").fill('Draft that will be cancelled');
      const cancelButton = page.getByRole('button', { name: /cancel/i });
      await expect(cancelButton).toBeVisible({ timeout: 5000 });
      await cancelButton.click();

      // Form closes, no API call made
      await expect(postFormHeading).not.toBeVisible({ timeout: 10000 });
      expect(createCallCount).toBe(0);

      console.log('✅ ForumPostForm: form closes on Cancel with no API call');
    } catch (error) {
      requestLogger.logToConsole();
      await page.screenshot({
        path: `test-results/forum-post-form-cancel-failed-${Date.now()}.png`,
        fullPage: true,
      });
      throw error;
    }
  });
});
