import { test, expect } from '@playwright/test';
import { mockApi } from '../helpers/ui';

test.describe.configure({ mode: 'parallel' });

async function prepare(page, language = 'en') {
  await mockApi(page);
  await page.addInitScript(language => {
    localStorage.setItem('language', language);
    localStorage.setItem('i18nextLng', language);
    localStorage.setItem('chat_consent_accepted', 'true');
    localStorage.setItem('age_verified', 'true');
    (window as any).__TEST_APP_ID__ = 'test-app-id';
    (window as any).__DISABLE_ANALYTICS__ = true;
  }, language);
}

for (const language of ['en', 'he', 'es', 'fr', 'de', 'it', 'pt']) {
  test(`tool choices remain readable, illustrated and navigable in ${language}`, async ({ page }) => {
    await prepare(page, language);
    await page.goto('/Tools');
    const cards = page.locator('.botanical-tool-card');
    await expect(cards).toHaveCount(6);
    for (const width of [360, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      const boxes = await cards.evaluateAll(elements => elements.map(el => {
        const card = el.getBoundingClientRect();
        const title = el.querySelector('h2')!;
        const description = el.querySelector('p')!;
        const art = el.querySelector('.botanical-tool-art')!.getBoundingClientRect();
        const titleBox = title.getBoundingClientRect();
        const icon = el.querySelector('.botanical-tool-icon')!.getBoundingClientRect();
        return {
          left: card.left, right: card.right, top: card.top,
          description: description.textContent,
          titleFits: title.scrollWidth <= title.clientWidth + 1,
          descriptionFits: description.scrollWidth <= description.clientWidth + 1,
          artworkFits: art.left >= card.left && art.right <= card.right,
          iconOverlapsArt: icon.left < art.right && icon.right > art.left && icon.top < art.bottom && icon.bottom > art.top,
          titleLeft: titleBox.left, titleRight: titleBox.right,
        };
      }));
      for (const box of boxes) {
        expect(box.left).toBeGreaterThanOrEqual(0);
        expect(box.right).toBeLessThanOrEqual(width + 1);
        expect(box.titleFits).toBe(true);
        expect(box.descriptionFits).toBe(true);
        expect(box.artworkFits).toBe(true);
        expect(box.iconOverlapsArt).toBe(false);
        expect(box.description).not.toMatch(/tools_hub\./);
        expect(box.description!.length).toBeGreaterThan(10);
      }
      // Three balanced columns on desktop, two beside the tablet sidebar,
      // one spacious row per choice on mobile.
      expect(boxes.filter(box => Math.abs(box.top - boxes[0].top) < 1)).toHaveLength(width >= 1101 ? 3 : width >= 768 ? 2 : 1);
    }
    const destinations = ['Exercises', 'TherapeuticForms', 'Videos', 'ExperientialGames', 'Journeys', 'Resources'];
    for (const destination of destinations) {
      await expect(page.locator(`.botanical-tool-link[href="/${destination}"]`)).toHaveAccessibleName(/\S/);
    }
    await page.locator('.botanical-tool-link[href="/Exercises"]').click();
    await expect(page).toHaveURL(/\/Exercises$/);
  });
}

test('shared surfaces do not inject hidden landscapes and navigation uses one palette', async ({ page }) => {
  await prepare(page);
  for (const route of ['/Home', '/MyPath', '/Tools', '/Journal', '/Settings']) {
    await page.goto(route);
    await expect(page.locator('#app-scroll-container')).toBeVisible();
    await expect(page.locator('.botanical-card-corner-art,.botanical-card-header-art')).toHaveCount(0);
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  const sidebar = page.locator('.garden-sidebar');
  const desktopColor = await sidebar.evaluate(el => getComputedStyle(el).backgroundColor);
  await page.setViewportSize({ width: 360, height: 800 });
  await page.getByTestId('mobile-menu-button').click();
  const drawer = page.getByTestId('mobile-drawer');
  await expect(drawer).toBeVisible();
  expect(await drawer.evaluate(el => getComputedStyle(el).backgroundColor)).toBe(desktopColor);
  await expect(drawer.locator('a[aria-current="page"]')).toHaveCount(1);
});

test('daily choices open onto the garden and keep readable surfaces in dark mode', async ({ page }) => {
  await prepare(page);
  await page.goto('/Home');
  const dailyPath = page.getByTestId('daily-path');
  await expect(page.getByTestId('daily-path-checkin')).toBeVisible();
  expect(await dailyPath.evaluate(el => getComputedStyle(el).backgroundColor)).toBe('rgba(0, 0, 0, 0)');
  expect(await dailyPath.evaluate(el => getComputedStyle(el).backgroundImage)).toBe('none');
  for (const route of ['/Home', '/MyPath', '/Tools']) {
    await page.goto(route);
    await expect(page.locator('#app-scroll-container')).toBeVisible();
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    const surfaces = page.locator('.botanical-section-heading,.botanical-navigation-card,.botanical-tool-card');
    for (const surface of await surfaces.all()) {
      // Existing cards animate their colors; verify the settled dark surface.
      await expect.poll(async () => {
        const rgb = await surface.evaluate(el => getComputedStyle(el).backgroundColor);
        return Number(rgb.match(/\d+/)![0]);
      }).toBeLessThan(70);
    }
  }
});

test('exercise recommendations and catalog cards keep a quiet surface', async ({ page }) => {
  await prepare(page);
  await page.goto('/Exercises');
  const recommendations = page.locator('.exercise-card-art--subtle').first();
  await expect(recommendations).toBeVisible();
  expect(await recommendations.evaluate(el => getComputedStyle(el).backgroundImage)).toBe('none');
  const content = recommendations.locator('[data-ui="card-content"]');
  expect(await content.evaluate(el => getComputedStyle(el).backgroundColor)).toBe(
    await recommendations.evaluate(el => getComputedStyle(el).backgroundColor)
  );
  await expect(recommendations.getByRole('button', { name: /Customize/i })).toBeEnabled();
});

test('tablet headings retain room for words beside the sidebar', async ({ page }) => {
  await prepare(page);
  await page.setViewportSize({ width: 768, height: 1024 });
  for (const route of ['/Goals', '/Videos', '/Coach', '/Resources', '/ExperientialGames']) {
    await page.goto(route);
    const heading = page.locator('#app-scroll-container h1:visible').first();
    await expect(heading).toBeVisible();
    const box = await heading.boundingBox();
    expect(box!.width, route).toBeGreaterThan(130);
    // Measure the rendered line count, not just document overflow: clipped
    // one-letter columns can otherwise pass a viewport-width test.
    const lines = await heading.evaluate(el => el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight));
    expect(lines, route).toBeLessThanOrEqual(4.1);
    if (route === '/Resources') {
      const guide = page.getByTestId('resource-ai-guide');
      await expect(guide).toBeVisible();
      const copy = guide.locator('p').first();
      expect((await copy.boundingBox())!.width).toBeGreaterThan(220);
    }
    if (route === '/ExperientialGames') {
      const titles = page.getByTestId('mindgames-recommendations').locator('h3');
      await expect(titles).toHaveCount(3);
      for (const title of await titles.all()) {
        expect((await title.boundingBox())!.width).toBeGreaterThan(120);
      }
    }
  }
});
