import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readRefreshSnapshot, commitRefreshedSnapshot } from '../../src/lib/chatRefreshRecovery.js';
import { createChatOrchestratorV2, TURN_STATUS } from '../../src/lib/chatOrchestratorV2.js';

const user = { id: 'synthetic-user', role: 'user', content: 'Synthetic question' };
const reply = (content = 'Synthetic reply') => ({ id: 'synthetic-reply', role: 'assistant', content });
const options = (read) => ({ read, prepare: messages => messages, isCurrent: () => true, hasAssistantChanges: () => true, getAssistantKey: msg => msg.id, isExplicitlyFinal: msg => msg.status === 'completed' });

describe('bounded refresh finality', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('recovers a status-less reply only after two stable snapshots', async () => {
    const read = vi.fn(async () => ({ messages: [user, reply()] }));
    const task = readRefreshSnapshot(options(read));
    await vi.advanceTimersByTimeAsync(999);
    expect(read).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    const result = await task;
    expect(read).toHaveBeenCalledTimes(2);
    expect(result.finality).toEqual({ isFinal: true, reason: 'stable_across_poll_snapshots' });
    expect(result.messages[1].content).toBe('Synthetic reply');
  });

  it('never publishes a changing reply and stops after three reads', async () => {
    let revision = 0;
    const read = vi.fn(async () => ({ messages: [user, reply(`Synthetic revision ${++revision}`)] }));
    const rejected = expect(readRefreshSnapshot(options(read))).rejects.toThrow('not stable');
    await vi.advanceTimersByTimeAsync(10000);
    await rejected;
    expect(read).toHaveBeenCalledTimes(3);
  });

  it('does not reread explicit final or unchanged snapshots', async () => {
    const read = vi.fn(async () => ({ messages: [user, { ...reply(), status: 'completed' }] }));
    expect((await readRefreshSnapshot(options(read))).finality.isFinal).toBe(true);
    expect(read).toHaveBeenCalledTimes(1);
    const unchanged = vi.fn(async () => ({ messages: [user, reply()] }));
    await readRefreshSnapshot({ ...options(unchanged), hasAssistantChanges: () => false });
    expect(unchanged).toHaveBeenCalledTimes(1);
  });

  it('stops stability verification when a new send, selection or recording invalidates it', async () => {
    let current = true;
    const read = vi.fn(async () => ({ messages: [user, reply()] }));
    const task = readRefreshSnapshot({ ...options(read), isCurrent: () => current });
    await vi.advanceTimersByTimeAsync(500);
    current = false;
    await vi.advanceTimersByTimeAsync(1000);
    expect(await task).toBeNull();
    expect(read).toHaveBeenCalledTimes(1);
  });
});

describe('refresh delivery through the real V2 coordinator', () => {
  function setup() {
    const coordinator = createChatOrchestratorV2();
    const first = coordinator.registerSend({ conversationId: 'synthetic-conversation', executeSend: async () => {} }).turn;
    coordinator.recordUserMessageId(first.client_request_id, user.id);
    coordinator.markGenerating(first.client_request_id);
    const executeSend = vi.fn(async () => {});
    coordinator.registerSend({ conversationId: 'synthetic-conversation', executeSend });
    coordinator.markTimedOut(first.client_request_id);
    return { coordinator, executeSend, first };
  }

  it('commits a recovered late reply and drains a queued send exactly once', async () => {
    const { coordinator, executeSend, first } = setup();
    const commit = vi.fn(() => true);
    const args = { messages: [user, reply()], finality: { isFinal: true, reason: 'stable_across_poll_snapshots' }, coordinator, startingTurnId: 0, commit };
    const result = commitRefreshedSnapshot(args);
    expect(result.updated).toBe(true);
    expect(coordinator.getActiveTurn().client_request_id).not.toBe(first.client_request_id);
    expect(coordinator.getActiveTurn().status).toBe(TURN_STATUS.PENDING);
    expect(coordinator.getPendingTurnCount()).toBe(0);
    expect(commit).toHaveBeenCalledWith(expect.any(Array), { pollFinality: args.finality });
    await result.nextQueuedSend();
    expect(executeSend).toHaveBeenCalledTimes(1);
    expect(commitRefreshedSnapshot(args).nextQueuedSend).toBeNull();
    expect(commit).toHaveBeenCalledTimes(1);
  });

  it.each([false, true])('leaves the turn and queued draft intact when visible acceptance fails (final=%s)', (isFinal) => {
    const { coordinator, executeSend, first } = setup();
    const commit = vi.fn(() => false);
    const result = commitRefreshedSnapshot({ messages: [user, reply()], finality: { isFinal }, coordinator, commit });
    expect(result).toEqual({ updated: false, nextQueuedSend: null });
    expect(coordinator.getActiveTurn().client_request_id).toBe(first.client_request_id);
    expect(coordinator.getActiveTurn().status).toBe(TURN_STATUS.TIMED_OUT);
    expect(coordinator.getPendingTurnCount()).toBe(1);
    expect(executeSend).not.toHaveBeenCalled();
    if (!isFinal) expect(commit).not.toHaveBeenCalled();
  });

  it('keeps the legacy refresh path independent of coordinator state', () => {
    const commit = vi.fn(() => true);
    expect(commitRefreshedSnapshot({ messages: [user, reply()], finality: { isFinal: true }, coordinator: null, commit })).toEqual({ updated: true, nextQueuedSend: null });
    expect(commit).toHaveBeenCalledTimes(1);
  });
});
