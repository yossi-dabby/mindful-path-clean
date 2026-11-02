import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const chatSource = readFileSync(
  new URL('../../src/pages/Chat.jsx', import.meta.url),
  'utf8',
);

describe('V10 Gate 1 — live Chat runtime wiring', () => {
  it('connects the finalized-assistant lifecycle to the bounded formulation writer', () => {
    expect(chatSource).toContain("from '@/lib/caseFormulationInvocation.js'");
    expect(chatSource).toContain('maybePersistCaseFormulationUpdatesForMessages(');
  });

  it('persists the polling snapshot after safeUpdateMessages has tagged it final', () => {
    expect(chatSource).toMatch(
      /const updated = [\s\S]*?safeUpdateMessages\(guardedPoll, 'Polling', \{ pollFinality \}\);[\s\S]*?if \(updated\) \{[\s\S]*?const committedPoll = lastConfirmedMessagesRef\.current;[\s\S]*?persistFinalizedCaseFormulationUpdates\(convId, committedPoll\);/,
    );
    expect(chatSource).not.toContain('persistFinalizedCaseFormulationUpdates(convId, guardedPoll);');
  });

  it('creates and stores a canonical session_instance_id on every conversation path', () => {
    const createCalls = chatSource.match(/agents\.createConversation\(\{/g) ?? [];
    const metadataBindings = chatSource.match(/session_instance_id:\s*newSessionInstanceId/g) ?? [];

    expect(createCalls).toHaveLength(4);
    expect(metadataBindings).toHaveLength(4);
  });

  it('threads conversation and session identity into every session-start builder call', () => {
    const builderCalls = chatSource.match(/buildActionFirstDemotedSessionContentAsync\(/g) ?? [];
    const conversationBindings = chatSource.match(/conversation_id:\s*(?:conversation\.id|convId)/g) ?? [];
    const sessionBindings = chatSource.match(/continuation_session_id:\s*newSessionInstanceId/g) ?? [];

    expect(builderCalls).toHaveLength(4);
    expect(conversationBindings.length).toBeGreaterThanOrEqual(4);
    expect(sessionBindings).toHaveLength(4);
    expect(chatSource).toMatch(
      /buildV10TurnKnowledgeContextAsync\([\s\S]*?conversation_id:\s*convId,[\s\S]*?continuation_session_id:\s*resolveConversationSessionInstanceId\(conversation\)/,
    );
  });
});
