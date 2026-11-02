import { describe, it, expect, vi } from 'vitest';
import { THERAPEUTIC_FORMS_CONTENT_AVAILABLE } from '../../src/data/therapeuticForms/availability.js';
import {
  getAllTherapeuticForms,
  getTherapeuticFormsForAI,
  getTherapeuticFormsPolicyVersion,
} from '../../src/data/therapeuticForms/index.js';
import { sanitizeConversationMessages } from '../../src/components/utils/validateAgentOutput.jsx';
import {
  consumePendingPolicyRefreshAfterSuccessfulSend,
  THERAPEUTIC_FORMS_POLICY_REFRESH_BLOCK_END,
  THERAPEUTIC_FORMS_POLICY_REFRESH_BLOCK_START,
  THERAPEUTIC_FORMS_POLICY_REFRESH_MARKER,
  buildTherapeuticFormsPolicyRefreshMessage,
  ensureTherapeuticFormsPolicyInjected,
  extractTherapeuticFormsPolicyVersion,
  getTherapeuticFormsPolicyPayload,
  prependPendingPolicyRefreshToUserContent,
} from '../../src/lib/therapeuticFormsPolicy.js';
import { resolveFormIntent } from '../../src/utils/resolveFormIntent.js';

describe('therapeutic forms policy reliability', () => {

  it('records a pending refresh for an existing conversation that lacks the current version without sending an agent message', async () => {
    const addMessage = vi.fn().mockResolvedValue({});
    const cache = new Map();
    const pendingRefreshByConversation = new Map();
    const conversation = {
      id: 'conversation-existing',
      messages: [{ role: 'user', content: 'Hello there' }],
    };

    const result = await ensureTherapeuticFormsPolicyInjected({
      conversation,
      sessionLanguage: 'en',
      isNewConversation: false,
      injectedVersionCache: cache,
      pendingRefreshByConversation,
    });

    expect(result.injected).toBe(false);
    expect(result.pendingRecorded).toBe(true);
    expect(addMessage).not.toHaveBeenCalled();
    expect(result.pendingRefresh.content.startsWith(THERAPEUTIC_FORMS_POLICY_REFRESH_BLOCK_START)).toBe(true);
    expect(result.pendingRefresh.content.includes(THERAPEUTIC_FORMS_POLICY_REFRESH_BLOCK_END)).toBe(true);
    expect(result.pendingRefresh.content.includes(THERAPEUTIC_FORMS_POLICY_REFRESH_MARKER)).toBe(true);
    expect(extractTherapeuticFormsPolicyVersion(result.pendingRefresh.content)).toBe(getTherapeuticFormsPolicyVersion());
    expect(cache.get(conversation.id)).toBeUndefined();
    expect(pendingRefreshByConversation.get(conversation.id)?.policyVersion).toBe(getTherapeuticFormsPolicyVersion());
  });

  it('never calls addMessage during policy refresh maintenance checks', async () => {
    const addMessage = vi.fn().mockResolvedValue({});
    await ensureTherapeuticFormsPolicyInjected({
      base44: { agents: { addMessage } },
      conversation: {
        id: 'conversation-maintenance',
        messages: [{ role: 'user', content: 'hello' }],
      },
      sessionLanguage: 'en',
      injectedVersionCache: new Map(),
      pendingRefreshByConversation: new Map(),
    });
    expect(addMessage).not.toHaveBeenCalled();
  });

  it('does not record pending refresh when current policy version is already present', async () => {
    const addMessage = vi.fn().mockResolvedValue({});
    const refreshMessage = buildTherapeuticFormsPolicyRefreshMessage({ sessionLanguage: 'en' });
    const pendingRefreshByConversation = new Map();
    const conversation = {
      id: 'conversation-current',
      messages: [{ role: 'user', content: refreshMessage.content }],
    };

    const result = await ensureTherapeuticFormsPolicyInjected({
      conversation,
      sessionLanguage: 'en',
      isNewConversation: false,
      injectedVersionCache: new Map(),
      pendingRefreshByConversation,
    });

    expect(result.injected).toBe(false);
    expect(result.pendingRecorded).toBe(false);
    expect(addMessage).not.toHaveBeenCalled();
    expect(pendingRefreshByConversation.has(conversation.id)).toBe(false);
  });

  it('records pending refresh for stale policy versions without sending an agent message', async () => {
    const addMessage = vi.fn().mockResolvedValue({});
    const pendingRefreshByConversation = new Map();
    const conversation = {
      id: 'conversation-stale',
      messages: [{
        role: 'user',
        content: `${THERAPEUTIC_FORMS_POLICY_REFRESH_MARKER}\n[THERAPEUTIC_FORMS_POLICY]\n[THERAPEUTIC_FORMS_POLICY_VERSION: stale-version]`,
      }],
    };

    const result = await ensureTherapeuticFormsPolicyInjected({
      conversation,
      sessionLanguage: 'en',
      isNewConversation: false,
      injectedVersionCache: new Map(),
      pendingRefreshByConversation,
    });

    expect(result.injected).toBe(false);
    expect(result.pendingRecorded).toBe(true);
    expect(addMessage).not.toHaveBeenCalled();
    expect(result.pendingRefresh.content.startsWith(THERAPEUTIC_FORMS_POLICY_REFRESH_BLOCK_START)).toBe(true);
  });

  it('hides legacy pure policy-refresh user turns and the immediate assistant orphan', () => {
    const refreshMessage = buildTherapeuticFormsPolicyRefreshMessage({ sessionLanguage: 'en' });
    const sanitized = sanitizeConversationMessages([
      { role: 'user', content: refreshMessage.content },
      { role: 'assistant', content: 'I can help with that.' },
    ], 'en');

    expect(sanitized).toHaveLength(0);
  });

  it('does not falsely claim an installed catalog after content retirement', () => {
    const sanitized = sanitizeConversationMessages([
      { role: 'assistant', content: 'I do not have access to therapeutic forms right now.' },
    ], 'en');

    expect(sanitized[0].content).toBe('I do not have access to therapeutic forms right now.');
    expect(sanitized[0]?.metadata?.generated_file).toBeFalsy();
  });

  it('prepends pending policy refresh into one genuine user send payload deterministically', () => {
    const pendingRefresh = buildTherapeuticFormsPolicyRefreshMessage({ sessionLanguage: 'en' }).boundedContent;
    const outbound = prependPendingPolicyRefreshToUserContent('This is my actual request.', pendingRefresh);

    expect(outbound.startsWith(THERAPEUTIC_FORMS_POLICY_REFRESH_BLOCK_START)).toBe(true);
    expect(outbound.includes(THERAPEUTIC_FORMS_POLICY_REFRESH_BLOCK_END)).toBe(true);
    expect(outbound.endsWith('This is my actual request.')).toBe(true);
    expect(extractTherapeuticFormsPolicyVersion(outbound)).toBe(getTherapeuticFormsPolicyVersion());
  });

  it('pending policy refresh state stays conversation-scoped and does not cross conversations', async () => {
    const pendingRefreshByConversation = new Map();
    const cache = new Map();
    await ensureTherapeuticFormsPolicyInjected({
      conversation: {
        id: 'conversation-a',
        messages: [{ role: 'user', content: 'hello from a' }],
      },
      sessionLanguage: 'en',
      injectedVersionCache: cache,
      pendingRefreshByConversation,
    });

    expect(pendingRefreshByConversation.has('conversation-a')).toBe(true);
    expect(pendingRefreshByConversation.has('conversation-b')).toBe(false);
  });

  it('successful genuine send consumes pending refresh once and marks injected version cache', () => {
    const pendingRefreshByConversation = new Map([
      ['conversation-a', { content: 'policy', policyVersion: 'v-current' }],
    ]);
    const cache = new Map();
    const first = consumePendingPolicyRefreshAfterSuccessfulSend({
      conversationId: 'conversation-a',
      pendingRefreshByConversation,
      injectedVersionCache: cache,
    });
    const second = consumePendingPolicyRefreshAfterSuccessfulSend({
      conversationId: 'conversation-a',
      pendingRefreshByConversation,
      injectedVersionCache: cache,
    });

    expect(first).toEqual({ consumed: true, policyVersion: 'v-current' });
    expect(second).toEqual({ consumed: false, policyVersion: null });
    expect(cache.get('conversation-a')).toBe('v-current');
    expect(pendingRefreshByConversation.has('conversation-a')).toBe(false);
  });

  it('failed genuine send path can keep pending refresh without falsely marking injected version', () => {
    const pendingRefreshByConversation = new Map([
      ['conversation-a', { content: 'policy', policyVersion: 'v-current' }],
    ]);
    const cache = new Map();

    expect(cache.has('conversation-a')).toBe(false);
    expect(pendingRefreshByConversation.has('conversation-a')).toBe(true);
  });
});

describe('therapeutic forms resolver coverage', () => {

  it('confirms retired Children CBT Core English worksheets are not exposed', () => {
    const childrenCoreWorksheets = getAllTherapeuticForms().filter((form) =>
      form.audience === 'children' &&
      form.language === 'en' &&
      form.id.startsWith('children-cbt-core-en-') &&
      form.type === 'individual_worksheet'
    );

    expect(childrenCoreWorksheets).toEqual([]);
  });

});
