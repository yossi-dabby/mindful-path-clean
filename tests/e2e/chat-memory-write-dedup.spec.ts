import { test, expect } from '@playwright/test';
import { mockApi, spaNavigate } from '../helpers/ui';

async function openChat(page) {
  await page.addInitScript(() => {
    localStorage.setItem('language', 'en');
    localStorage.setItem('chat_consent_accepted', 'true');
    localStorage.setItem('age_verified', 'true');
    (window as any).__TEST_APP_ID__ = 'test-app-id';
    (window as any).__DISABLE_ANALYTICS__ = true;
  });

  await mockApi(page);
  await spaNavigate(page, '/Chat');
  await expect(page.locator('[data-testid="chat-root"]')).toBeVisible({
    timeout: 15000,
  });
}

test.describe('Chat memory-write dedup helper', () => {
  test('requestSummary twice for same conversation triggers one write', async ({ page }) => {
    await openChat(page);

    const triggerCount = await page.evaluate(async () => {
      const { triggerConversationMemoryWriteOnce } = await import('/src/lib/conversationMemoryWriteDedup.js');
      const tracker = new Set<string>();
      let count = 0;
      const trigger = () => {
        count += 1;
      };

      triggerConversationMemoryWriteOnce({
        writeTracker: tracker,
        conversationId: 'conv-e2e-1',
        conversationMeta: { name: 'Session 1' },
        trigger,
        invoker: 'chat_request_summary',
      });
      triggerConversationMemoryWriteOnce({
        writeTracker: tracker,
        conversationId: 'conv-e2e-1',
        conversationMeta: { name: 'Session 1' },
        trigger,
        invoker: 'chat_request_summary',
      });

      return count;
    });

    expect(triggerCount).toBe(1);
  });

  test('requestSummary then conversation switch still triggers one write total', async ({ page }) => {
    await openChat(page);

    const triggerCount = await page.evaluate(async () => {
      const { triggerConversationMemoryWriteOnce } = await import('/src/lib/conversationMemoryWriteDedup.js');
      const tracker = new Set<string>();
      let count = 0;
      const trigger = () => {
        count += 1;
      };

      triggerConversationMemoryWriteOnce({
        writeTracker: tracker,
        conversationId: 'conv-e2e-2',
        conversationMeta: { name: 'Session 2' },
        trigger,
        invoker: 'chat_request_summary',
      });
      triggerConversationMemoryWriteOnce({
        writeTracker: tracker,
        conversationId: 'conv-e2e-2',
        conversationMeta: { name: 'Session 2' },
        messages: [{ id: 1 }, { id: 2 }, { id: 3 }],
        minMessages: 3,
        trigger,
        invoker: 'chat_conversation_switch',
      });

      return count;
    });

    expect(triggerCount).toBe(1);
  });

  test('conversation switch then duplicate switch still triggers one write total', async ({ page }) => {
    await openChat(page);

    const triggerCount = await page.evaluate(async () => {
      const { triggerConversationMemoryWriteOnce } = await import('/src/lib/conversationMemoryWriteDedup.js');
      const tracker = new Set<string>();
      let count = 0;
      const trigger = () => {
        count += 1;
      };

      triggerConversationMemoryWriteOnce({
        writeTracker: tracker,
        conversationId: 'conv-e2e-3',
        conversationMeta: { name: 'Session 3' },
        messages: [{ id: 1 }, { id: 2 }, { id: 3 }],
        minMessages: 3,
        trigger,
        invoker: 'chat_conversation_switch',
      });
      triggerConversationMemoryWriteOnce({
        writeTracker: tracker,
        conversationId: 'conv-e2e-3',
        conversationMeta: { name: 'Session 3' },
        messages: [{ id: 1 }, { id: 2 }, { id: 3 }],
        minMessages: 3,
        trigger,
        invoker: 'chat_conversation_switch',
      });

      return count;
    });

    expect(triggerCount).toBe(1);
  });
});
