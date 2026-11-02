/**
 * E2E Test Helper - Shared utilities for Playwright tests
 * 
 * Helps diagnose and prevent page closure issues
 */

export const testHelpers = {
  /**
   * Mock analytics API to prevent crashes in test environment
   */
  async mockAnalytics(page) {
    await page.route('**/api/apps/*/analytics/**', route => {
      console.log('[MOCK] Intercepted analytics call:', route.request().url());
      route.fulfill({ status: 200, body: JSON.stringify({ success: true }) });
    });
  },

  /**
   * Mock Base44 API endpoints to prevent 404 errors during E2E tests
   */
  async mockBase44APIs(page) {
    // Mock ALL API calls with wildcard - catch everything
    await page.route('**/api/**', route => {
      const url = route.request().url();
      const method = route.request().method();
      console.log('[MOCK] API Call:', method, url);
      
      // Public settings
      if (url.includes('/public-settings/')) {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'test-app-id',
            appId: 'test-app-id',
            appName: 'Test App',
            isPublic: true,
            public_settings: {}
          })
        });
        return;
      }
      
      // Auth endpoints
      if (url.includes('/auth/me')) {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'test-user-id',
            email: 'test@example.com',
            full_name: 'Test User',
            role: 'user',
            preferences: {}
          })
        });
        return;
      }
      
      // Agent conversation endpoints
      if (url.includes('/agents/')) {
        if (method === 'GET') {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([])
          });
        } else if (method === 'POST') {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              id: 'test-conversation-id',
              messages: [],
              metadata: { name: 'Test Session' }
            })
          });
        } else {
          route.fulfill({ status: 200, body: '{}' });
        }
        return;
      }
      
      // Entity endpoints
      if (url.includes('/entities/')) {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([])
        });
        return;
      }
      
      // Default: return empty success for any other API call
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true })
      });
    });
  },

  /**
   * Safe page interaction with closure detection
   */
  async safePageAction(page, action, label = 'action') {
    if (page.isClosed?.()) {
      throw new Error(`[PAGE CLOSED] Cannot perform ${label} - page already closed`);
    }
    
    try {
      return await action();
    } catch (error) {
      if (error.message?.includes('closed') || error.message?.includes('Target page')) {
        throw new Error(`[PAGE CLOSED] ${label} failed: ${error.message}`);
      }
      throw error;
    }
  },

  /**
   * Setup page closure diagnostics
   */
  setupClosureDiagnostics(page) {
    const diagnostics = {
      closedAt: null,
      closeReason: null,
      lastUrl: page.url(),
      errors: [],
      navigationEvents: []
    };

    page.on('close', () => {
      diagnostics.closedAt = new Date().toISOString();
      diagnostics.closeReason = 'Page closed event fired';
      console.error('[PAGE CLOSED]', diagnostics);
    });

    page.on('error', (err) => {
      diagnostics.errors.push({ time: Date.now(), message: err.message });
      console.error('[PAGE ERROR]', err.message);
    });

    page.on('framenavigated', () => {
      const newUrl = page.url();
      if (newUrl !== diagnostics.lastUrl) {
        diagnostics.navigationEvents.push({
          from: diagnostics.lastUrl,
          to: newUrl,
          time: Date.now()
        });
        diagnostics.lastUrl = newUrl;
      }
    });

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.error('[APP ERROR]', msg.text());
      }
    });

    return diagnostics;
  },

  /**
   * Wait for chat input to be ready and interactable
   */
  async waitForChatReady(page, timeout = 10000) {
    if (page.isClosed?.()) {
      throw new Error('Page closed before chat ready check');
    }

    await page.waitForSelector('[data-testid="therapist-chat-input"]', { timeout });
    
    if (page.isClosed?.()) {
      throw new Error('Page closed while waiting for chat input');
    }

    const input = page.locator('[data-testid="therapist-chat-input"]');
    await input.waitFor({ state: 'visible', timeout: 5000 });

    if (page.isClosed?.()) {
      throw new Error('Page closed after locating chat input');
    }

    return input;
  },

  /**
   * Safely send chat message with fallback
   */
  async sendChatMessage(page, message, timeout = 10000) {
    if (page.isClosed?.()) {
      throw new Error('Page closed before send');
    }

    const input = page.locator('[data-testid="therapist-chat-input"]');
    const sendBtn = page.locator('[data-testid="therapist-chat-send"]');

    // Fill input
    await input.fill(message);
    
    if (page.isClosed?.()) {
      throw new Error('Page closed after filling input');
    }

    // Try button click first
    let sent = false;
    try {
      if (!page.isClosed?.()) {
        await sendBtn.click({ timeout: 5000 });
        sent = true;
      }
    } catch (e) {
      console.warn('[BUTTON CLICK FAILED]', e.message);
      // Fallback to Enter
      if (!page.isClosed?.()) {
        await input.press('Enter');
        sent = true;
      }
    }

    if (!sent) {
      throw new Error('Could not send message');
    }

    if (page.isClosed?.()) {
      throw new Error('Page closed after sending message');
    }

    return sent;
  },

  /**
   * Verify page health after action
   */
  async verifyPageHealth(page) {
    if (page.isClosed?.()) {
      return false;
    }

    try {
      const root = page.locator('[data-testid="chat-root"]');
      return await root.isVisible({ timeout: 1000 }).catch(() => false);
    } catch {
      return false;
    }
  },

  /**
   * Diagnostic loop with closure protection
   * Use this to safely iterate over elements without crashing on page closure
   */
  async safeDiagnosticLoop(page, locator, callback) {
    if (page.isClosed?.()) {
      console.warn('[SKIP] Page closed before diagnostic loop');
      return;
    }

    try {
      const count = await locator.count().catch(() => 0);
      
      for (let i = 0; i < count; i++) {
        if (page.isClosed?.()) {
          console.warn('[ABORT] Page closed during diagnostic loop');
          break;
        }
        
        try {
          await callback(locator.nth(i), i);
        } catch (e) {
          if (e.message?.includes('closed')) {
            console.warn('[ABORT] Page closed in loop iteration', i);
            break;
          }
          // Continue on non-closure errors
        }
      }
    } catch (e) {
      if (e.message?.includes('closed')) {
        console.warn('[ABORT] Page closed before count');
      } else {
        throw e;
      }
    }
  }
};

export default testHelpers;