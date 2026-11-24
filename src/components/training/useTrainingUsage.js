import { useCallback, useEffect, useRef, useState } from 'react';

export function validTrainingQuota(value) {
  return value && Number.isInteger(value.limit) && value.limit > 0 &&
    Number.isInteger(value.remaining) && value.remaining >= 0 && value.remaining <= value.limit &&
    Number.isFinite(Date.parse(value.reset_at)) && Number.isFinite(Date.parse(value.next_allowed_at))
    ? value : null;
}
export function trainingErrorKey(error) {
  const data = error?.response?.data ?? error?.data ?? {};
  return ({
    TRAINING_DAILY_LIMIT: 'stage6.training_daily_limit',
    TRAINING_RATE_LIMIT: 'stage6.training_cooldown',
    TRAINING_INVALID_INPUT: 'stage6.training_input_limit',
    TRAINING_INPUT_TOO_LARGE: 'stage6.training_input_limit',
    TRAINING_USAGE_UNAVAILABLE: 'stage6.training_usage_unavailable',
  })[data.code] || 'stage6.training_error';
}
export function useTrainingUsage(invoke) {
  const [quota, setQuota] = useState(null);
  const [now, setNow] = useState(Date.now);
  const mounted = useRef(false);
  const sequence = useRef(0);
  const applyQuota = useCallback(value => {
    const valid = validTrainingQuota(value);
    if (valid) { sequence.current++; setQuota(valid); setNow(Date.now()); }
  }, []);

  const refreshUsage = useCallback(async () => {
    const requestSequence = ++sequence.current;
    try {
      const response = await invoke('evaluateTherapistResponse', { action: 'status' });
      if (mounted.current && sequence.current === requestSequence) applyQuota(response.data?.quota);
    } catch { /* The evaluation endpoint still enforces the server quota. */ }
  }, [invoke, applyQuota]);

  useEffect(() => {
    mounted.current = true;
    refreshUsage();
    return () => { mounted.current = false; sequence.current++; };
  }, [refreshUsage]);

  const until = quota ? Date.parse(quota.remaining === 0 ? quota.reset_at : quota.next_allowed_at) : 0;
  useEffect(() => {
    if (!until) return;
    if (until <= Date.now()) { setNow(Date.now()); return; }
    let timer;
    const tick = () => {
      const timestamp = Date.now();
      setNow(timestamp);
      if (timestamp >= until) { refreshUsage(); return; }
      timer = setTimeout(tick, Math.max(1, Math.min(until - timestamp, quota.remaining === 0 ? 60000 : 1000)));
    };
    timer = setTimeout(tick, Math.max(1, Math.min(until - Date.now(), quota.remaining === 0 ? 60000 : 1000)));
    return () => clearTimeout(timer);
  }, [until, quota?.remaining, refreshUsage]);

  return { quota, applyQuota, blocked: until > now, seconds: Math.max(0, Math.ceil((until - now) / 1000)) };
}
