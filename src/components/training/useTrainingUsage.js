import { useCallback, useEffect, useState } from 'react';

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
  const applyQuota = useCallback(value => {
    const valid = validTrainingQuota(value);
    if (valid) { setQuota(valid); setNow(Date.now()); }
  }, []);

  useEffect(() => {
    let active = true;
    invoke('evaluateTherapistResponse', { action: 'status' })
      .then(response => { if (active) applyQuota(response.data?.quota); })
      .catch(() => {}); // The evaluation endpoint still fails closed if its own quota check fails.
    return () => { active = false; };
  }, [invoke, applyQuota]);

  const until = quota ? Date.parse(quota.remaining === 0 ? quota.reset_at : quota.next_allowed_at) : 0;
  useEffect(() => {
    if (until <= Date.now()) return;
    let active = true;
    const delay = Math.min(until - Date.now(), quota.remaining === 0 ? 60000 : 1000);
    const timer = setTimeout(() => {
      setNow(Date.now());
      if (Date.now() >= until) {
        invoke('evaluateTherapistResponse', { action: 'status' })
          .then(response => { if (active) applyQuota(response.data?.quota); })
          .catch(() => {});
      }
    }, Math.max(1, delay));
    return () => { active = false; clearTimeout(timer); };
  }, [until, quota, now, invoke, applyQuota]);

  return { quota, applyQuota, blocked: until > now, seconds: Math.max(0, Math.ceil((until - now) / 1000)) };
}
