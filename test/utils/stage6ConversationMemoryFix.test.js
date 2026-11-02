import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

import {
  buildConversationSummaryInput,
  CONVERSATION_SUMMARY_MAX_TOTAL_CHARS,
} from '../../src/lib/sessionEndSummarization.js';
import {
  triggerConversationMemoryWriteOnce,
  waitForConversationMemoryWrite,
} from '../../src/lib/conversationMemoryWriteDedup.js';
import {
  buildCrossSessionContinuityBlockWithDiagnostic,
  CONTINUITY_FAILURE_REASONS,
} from '../../src/lib/crossSessionContinuity.js';

const chatSrc = readFileSync(resolve('src/pages/Chat.jsx'), 'utf8');
const backendSrc = readFileSync(
  resolve('base44/functions/generateSessionSummary/entry.ts'),
  'utf8',
);

afterEach(() => {
  vi.useRealTimers();
});

describe('Stage 6 — bounded ephemeral summary input', () => {
  it('keeps only finalized user/assistant text and removes internal/action content', () => {
    const result = buildConversationSummaryInput([
      { role: 'user', content: '[START_SESSION] hidden directive' },
      { role: 'system', content: 'system secret' },
      { role: 'assistant', content: '<actions><action>create_DailyFlow</action></actions>Visible reply' },
      { role: 'assistant', content: 'unfinished', streaming: true },
      { role: 'user', content: 'The reported fact.' },
    ]);

    expect(result.turns).toEqual([
      { role: 'assistant', content: 'Visible reply' },
      { role: 'user', content: 'The reported fact.' },
    ]);
    expect(JSON.stringify(result)).not.toContain('create_DailyFlow');
    expect(JSON.stringify(result)).not.toContain('system secret');
  });

  it('protects a latest correction when the total input cap is reached', () => {
    const filler = 'x'.repeat(1500);
    const messages = [
      { role: 'user', content: 'My anxiety decreased to 4/10.' },
      ...Array.from({ length: 10 }, () => ({ role: 'assistant', content: filler })),
      { role: 'user', content: 'Correction: it did not decrease; it stayed 6/10.' },
    ];

    const result = buildConversationSummaryInput(messages);
    const serialized = JSON.stringify(result);
    expect(serialized.length).toBeLessThan(CONVERSATION_SUMMARY_MAX_TOTAL_CHARS + 2000);
    expect(serialized).toContain('stayed 6/10');
    expect(serialized).not.toContain('decreased to 4/10');
  });
});

describe('Stage 6 — result-aware dedup and bounded sequencing', () => {
  it('shares one pending promise and marks success only after persistence succeeds', async () => {
    const tracker = new Map();
    let resolveWrite;
    const trigger = vi.fn(() => new Promise((resolvePromise) => {
      resolveWrite = resolvePromise;
    }));
    const args = {
      writeTracker: tracker,
      conversationId: 'conv-pending',
      messages: [{}, {}, {}],
      minMessages: 3,
      trigger,
    };

    const first = triggerConversationMemoryWriteOnce(args);
    const second = triggerConversationMemoryWriteOnce(args);
    expect(second).toBe(first);
    expect(trigger).toHaveBeenCalledTimes(1);
    expect(tracker.get('conv-pending').state).toBe('pending');

    resolveWrite({ success: true });
    await expect(first).resolves.toBe(true);
    expect(tracker.get('conv-pending')).toMatchObject({ state: 'succeeded', attempts: 1 });
  });

  it('retries once after an explicit failure and does not mark failure as success', async () => {
    const tracker = new Map();
    const trigger = vi
      .fn()
      .mockResolvedValueOnce({ success: false })
      .mockResolvedValueOnce({ success: true });

    await expect(triggerConversationMemoryWriteOnce({
      writeTracker: tracker,
      conversationId: 'conv-retry',
      trigger,
    })).resolves.toBe(true);

    expect(trigger).toHaveBeenCalledTimes(2);
    expect(tracker.get('conv-retry')).toMatchObject({ state: 'succeeded', attempts: 2 });
  });

  it('fails open after the bounded wait without cancelling the pending write', async () => {
    vi.useFakeTimers();
    const pending = new Promise(() => {});
    const resultPromise = waitForConversationMemoryWrite(pending, 25);
    await vi.advanceTimersByTimeAsync(25);
    await expect(resultPromise).resolves.toBe(false);
  });
});

describe('Stage 6 — runtime wiring and persistence boundaries', () => {
  it('awaits the bounded write before both new-session and conversation-load reads', () => {
    expect(chatSrc).toMatch(/await\s+waitForConversationMemoryWrite\([\s\S]*?maybeTriggerEndWrite/);
    expect((chatSrc.match(/await\s+waitForConversationMemoryWrite\(/g) || [])).toHaveLength(2);
    expect(chatSrc).toContain('messages,');
  });

  it('removes summary_input before record construction and persistence', () => {
    const removal = backendSrc.indexOf("delete persistableInput['summary_input']");
    const build = backendSrc.indexOf('buildSummaryRecord(persistableInput)');
    const persist = backendSrc.indexOf('CompanionMemory.create');
    expect(removal).toBeGreaterThan(-1);
    expect(build).toBeGreaterThan(removal);
    expect(persist).toBeGreaterThan(build);
    expect(backendSrc).toContain('Apply correction precedence');
    expect(backendSrc).toContain('omit every superseded value everywhere');
    expect(backendSrc).toContain('A therapist recommendation alone is not a task');
    expect(backendSrc).toContain('do not infer or fill it');
  });

  it('reports valid thin records but selects zero when no continuity block is emitted', async () => {
    const thinRecord = {
      therapist_memory_version: '1',
      session_id: 'thin-session',
      session_date: '2026-08-18T00:00:00.000Z',
      session_summary: '',
      core_patterns: [],
      triggers: [],
      automatic_thoughts: [],
      emotions: [],
      urges: [],
      actions: [],
      consequences: [],
      working_hypotheses: [],
      interventions_used: [],
      risk_flags: [],
      safety_plan_notes: '',
      follow_up_tasks: [],
      goals_referenced: [],
      last_summarized_date: '2026-08-18T00:00:00.000Z',
    };
    const entities = {
      CompanionMemory: {
        list: vi.fn().mockResolvedValue([
          { memory_type: 'therapist_session', content: JSON.stringify(thinRecord) },
        ]),
      },
    };

    const result = await buildCrossSessionContinuityBlockWithDiagnostic(entities);
    expect(result.block).toBe('');
    expect(result.diagnostic.valid_therapist_memory_record_count).toBe(1);
    expect(result.diagnostic.selected_prior_session_count).toBe(0);
    expect(result.diagnostic.continuity_block_emitted).toBe(false);
    expect(result.diagnostic.continuity_failure_reason_code).toBe(
      CONTINUITY_FAILURE_REASONS.no_useful_content,
    );
  });
});
