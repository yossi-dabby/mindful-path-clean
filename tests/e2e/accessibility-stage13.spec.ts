import { test, expect, type Page } from '@playwright/test';
import { mockApi } from '../helpers/ui';

const BASE_URL =
  process.env.PLAYWRIGHT_TEST_BASE_URL ||
  process.env.E2E_BASE_URL ||
  process.env.BASE_URL ||
  'http://127.0.0.1:5173';

async function prepare(page: Page, language = 'he', viewport = { width: 1440, height: 900 }) {
  await page.setViewportSize(viewport);
  await page.addInitScript(({ language }) => {
    localStorage.setItem('language', language);
    localStorage.setItem('i18nextLng', language);
    localStorage.setItem('age_verified', 'true');
    localStorage.setItem('chat_consent_accepted', 'true');
    (window as Window & { __TEST_APP_ID__?: string }).__TEST_APP_ID__ = 'test-app-id';
    (window as Window & { __DISABLE_ANALYTICS__?: boolean }).__DISABLE_ANALYTICS__ = true;
  }, { language });
  await mockApi(page);
  await page.goto(BASE_URL + '/Settings', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await expect(page.getByTestId('settings-hero')).toBeVisible({ timeout: 20000 });
}

function contrastRatio(foreground: number[], background: number[]) {
  const luminance = (color: number[]) => {
    const values = color.map((channel) => {
      const normalized = channel / 255;
      return normalized <= 0.04045
        ? normalized / 12.92
        : Math.pow((normalized + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * values[0] + 0.7152 * values[1] + 0.0722 * values[2];
  };
  const first = luminance(foreground);
  const second = luminance(background);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

test.describe('Stage 13 accessibility and bidirectional layout', () => {
  test('mirrors the desktop shell in Hebrew and restores LTR in English', async ({ page }) => {
    await prepare(page, 'he');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    const rtl = await page.evaluate(() => {
      const sidebar = document.querySelector('nav');
      const main = document.querySelector('#app-scroll-container');
      return {
        sidebarX: sidebar?.getBoundingClientRect().x,
        mainPaddingRight: main ? parseFloat(getComputedStyle(main).paddingRight) : 0,
      };
    });
    expect(rtl.sidebarX).toBeGreaterThan(1100);
    expect(rtl.mainPaddingRight).toBeGreaterThanOrEqual(287);

    const ltr = await page.evaluate(() => {
      document.documentElement.dir = 'ltr';
      document.documentElement.lang = 'en';
      const sidebar = document.querySelector('nav');
      const main = document.querySelector('#app-scroll-container');
      return {
        sidebarX: sidebar?.getBoundingClientRect().x,
        mainPaddingLeft: main ? parseFloat(getComputedStyle(main).paddingLeft) : 0,
      };
    });
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    expect(ltr.sidebarX).toBeLessThanOrEqual(1);
    expect(ltr.mainPaddingLeft).toBeGreaterThanOrEqual(287);
  });

  test('supports skip navigation, focus management and route announcements', async ({ page }) => {
    await prepare(page);
    const main = page.locator('#app-scroll-container');
    await expect(main).toBeFocused();

    const announcer = page.locator('[data-a11y-route-announcer]');
    await expect(announcer).not.toBeEmpty();

    const skip = page.getByRole('link', { name: /דלגו לתוכן הראשי|Skip to main content/i });
    await skip.focus();
    await expect(skip).toBeFocused();
    await skip.press('Enter');
    await expect(main).toBeFocused();
  });

  test('exposes named landmarks and no unnamed visible buttons', async ({ page }) => {
    await prepare(page);
    await expect(page.getByRole('main')).toHaveCount(1);
    await expect(page.getByRole('navigation').first()).toBeVisible();

    const unnamed = await page.locator('button:visible').evaluateAll((buttons) =>
      buttons.filter((button) => {
        const text = button.textContent?.trim();
        const label = button.getAttribute('aria-label') || button.getAttribute('aria-labelledby');
        return !text && !label;
      }).length
    );
    expect(unnamed).toBe(0);
  });

  test('keeps controls touch-safe at desktop and mobile sizes', async ({ page }) => {
    await prepare(page);
    for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
      await page.setViewportSize(viewport);
      const undersized = await page
        .locator('button:visible:not([role="switch"]):not([role="checkbox"]), nav a:visible, input:visible, select:visible, textarea:visible')
        .evaluateAll((elements) =>
          elements
            .map((element) => {
              const box = element.getBoundingClientRect();
              return { tag: element.tagName, width: box.width, height: box.height };
            })
            .filter(({ width, height }) => width < 43.5 || height < 43.5)
        );
      expect(undersized).toEqual([]);
    }

    const switches = page.getByRole('switch');
    const count = await switches.count();
    expect(count).toBeGreaterThan(0);
    for (let index = 0; index < count; index += 1) {
      const metrics = await switches.nth(index).evaluate((element) => {
        const box = element.getBoundingClientRect();
        const after = getComputedStyle(element, '::after');
        return { width: box.width, height: box.height, top: parseFloat(after.top), bottom: parseFloat(after.bottom) };
      });
      expect(metrics.width).toBeGreaterThanOrEqual(43.5);
      expect(metrics.height + Math.abs(metrics.top) + Math.abs(metrics.bottom)).toBeGreaterThanOrEqual(43.5);
    }
  });

  test('meets normal-text contrast for visible navigation labels', async ({ page }) => {
    await prepare(page);
    for (const route of ['/Settings', '/Tools']) {
      await page.goto(BASE_URL + route);
      for (const viewport of [{ width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 1440, height: 900 }]) {
        await page.setViewportSize(viewport);
        // Follow the visible navigation and its text, regardless of palette
        // utility names. Cover both active and inactive labels/descriptions.
        const labels = page.locator('nav a:visible p, nav a:visible > span');
        await expect(labels.first()).toBeVisible();
        await expect.poll(async () => {
          const colors = await labels.evaluateAll(elements => elements.map(element => {
            const parse = (value: string) => (value.match(/[\d.]+/g) || []).map(Number);
            let background = [255, 255, 255];
            const ancestors: Element[] = [];
            for (let node: Element | null = element; node; node = node.parentElement) ancestors.unshift(node);
            for (const node of ancestors) {
              const [r, g, b, alpha = 1] = parse(getComputedStyle(node).backgroundColor);
              background = [r, g, b].map((channel, index) => channel * alpha + background[index] * (1 - alpha));
            }
            const [r, g, b, alpha = 1] = parse(getComputedStyle(element).color);
            const foreground = [r, g, b].map((channel, index) => channel * alpha + background[index] * (1 - alpha));
            return { foreground, background };
          }));
          return Math.min(...colors.map(({ foreground, background }) => contrastRatio(foreground, background)));
        }, { message: `navigation contrast at ${route}, ${viewport.width}px` }).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  test('respects reduced-motion preference', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await prepare(page);
    const motion = await page.locator('[data-app-page-transition]').evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        transform: style.transform,
        transitionDuration: style.transitionDuration,
        animationDuration: style.animationDuration,
      };
    });
    expect(motion.transform).toBe('none');
    expect(parseFloat(motion.transitionDuration)).toBeLessThanOrEqual(0.01);
    expect(parseFloat(motion.animationDuration)).toBeLessThanOrEqual(0.01);
  });

  test('supports 200 percent text scaling without document overflow', async ({ page }) => {
    await prepare(page, 'he', { width: 768, height: 1024 });
    const result = await page.evaluate(() => {
      document.documentElement.style.fontSize = '200%';
      const input = document.querySelector('input');
      return {
        rootFont: parseFloat(getComputedStyle(document.documentElement).fontSize),
        inputHeight: input?.getBoundingClientRect().height || 0,
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      };
    });
    expect(result.rootFont).toBe(32);
    expect(result.inputHeight).toBeGreaterThanOrEqual(80);
    expect(result.scrollWidth).toBeLessThanOrEqual(result.clientWidth + 2);
  });

  test('applies automatic direction to mixed text fields', async ({ page }) => {
    await prepare(page, 'he');
    const fields = await page.locator('input:visible').evaluateAll((inputs) =>
      inputs.map((input) => ({
        type: input.getAttribute('type') || 'text',
        dir: input.getAttribute('dir'),
        direction: getComputedStyle(input).direction,
      }))
    );
    expect(fields.every((field) => field.dir === 'auto')).toBe(true);
    const email = fields.find((field) => field.type === 'email');
    if (email) expect(email.direction).toBe('ltr');
  });

  test('has no horizontal overflow on mobile, tablet and desktop', async ({ page }) => {
    await prepare(page);
    for (const viewport of [
      { width: 360, height: 780 },
      { width: 768, height: 1024 },
      { width: 1440, height: 900 },
    ]) {
      await page.setViewportSize(viewport);
      const dimensions = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 2);
    }
  });
});
