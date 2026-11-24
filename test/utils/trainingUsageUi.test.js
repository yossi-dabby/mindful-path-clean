// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useTrainingUsage, trainingErrorKey, validTrainingQuota } from '../../src/components/training/useTrainingUsage.js';
import { stage6UiCopy } from '../../src/components/i18n/stage6UiTranslations.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root, current;
const start = Date.parse('2026-11-24T21:59:45Z');
const quota = (overrides = {}) => ({
  limit:20, remaining:19, reset_at:'2026-11-24T22:00:00.000Z',
  next_allowed_at:'2026-11-24T21:59:50.000Z', ...overrides,
});
async function render(invoke) {
  const element = document.createElement('div');
  document.body.append(element);
  root=createRoot(element);
  function Probe() { current=useTrainingUsage(invoke); return React.createElement('span',null,String(current.blocked)); }
  await act(async () => root.render(React.createElement(Probe)));
}
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(start); });
afterEach(async () => { if(root) await act(async()=>root.unmount()); root=null; document.body.innerHTML=''; vi.useRealTimers(); });

describe('training quota UI', () => {
  it('loads server status without starting an AI evaluation and releases cooldown', async () => {
    const invoke=vi.fn(async()=>({data:{quota:quota()}}));
    await render(invoke);
    expect(invoke).toHaveBeenCalledWith('evaluateTherapistResponse',{action:'status'});
    expect(current.blocked).toBe(true);
    expect(current.seconds).toBe(5);
    await act(async()=>vi.advanceTimersByTimeAsync(5000));
    expect(current.blocked).toBe(false);
    expect(invoke).toHaveBeenCalledTimes(2);
  });
  it('refreshes a daily limit at its server reset time', async () => {
    const invoke=vi.fn()
      .mockResolvedValueOnce({data:{quota:quota({remaining:0})}})
      .mockResolvedValueOnce({data:{quota:quota({remaining:20,reset_at:'2026-11-25T22:00:00Z',next_allowed_at:'1970-01-01T00:00:00Z'})}});
    await render(invoke);
    expect(current.blocked).toBe(true);
    await act(async()=>vi.advanceTimersByTimeAsync(15000));
    expect(current.quota.remaining).toBe(20);
    expect(current.blocked).toBe(false);
  });
  it('does not overwrite a newer evaluation quota with a delayed status response', async () => {
    let resolve;
    const invoke=vi.fn(()=>new Promise(r=>{resolve=r;}));
    await render(invoke);
    await act(async()=>current.applyQuota(quota({remaining:18})));
    await act(async()=>resolve({data:{quota:quota({remaining:20})}}));
    expect(current.quota.remaining).toBe(18);
  });
  it('cleans up timers on unmount and tolerates status lookup failure', async () => {
    const invoke=vi.fn().mockRejectedValue(new Error('offline'));
    await render(invoke);
    expect(current.blocked).toBe(false);
    await act(async()=>current.applyQuota(quota()));
    await act(async()=>root.unmount()); root=null;
    await act(async()=>vi.advanceTimersByTimeAsync(10000));
    expect(invoke).toHaveBeenCalledTimes(1);
  });
  it('maps SDK error shapes and validates quota metadata', () => {
    expect(trainingErrorKey({response:{data:{code:'TRAINING_DAILY_LIMIT'}}})).toBe('stage6.training_daily_limit');
    expect(trainingErrorKey({data:{code:'TRAINING_RATE_LIMIT'}})).toBe('stage6.training_cooldown');
    expect(trainingErrorKey({data:{code:'TRAINING_USAGE_UNAVAILABLE'}})).toBe('stage6.training_usage_unavailable');
    expect(trainingErrorKey({})).toBe('stage6.training_error');
    expect(validTrainingQuota(quota())).toBeTruthy();
    expect(validTrainingQuota(quota({remaining:-1}))).toBeNull();
    expect(validTrainingQuota(quota({reset_at:'bad'}))).toBeNull();
  });
  it('provides matching quota messages and placeholders in all seven languages', () => {
    const keys=Object.keys(stage6UiCopy.en).filter(key=>key.startsWith('training_'));
    for(const language of ['en','he','es','fr','de','it','pt']) for(const key of keys) {
      expect(stage6UiCopy[language][key]).toBeTruthy();
      expect(stage6UiCopy[language][key].match(/{{[^}]+}}/g)||[]).toEqual(stage6UiCopy.en[key].match(/{{[^}]+}}/g)||[]);
    }
  });
});
