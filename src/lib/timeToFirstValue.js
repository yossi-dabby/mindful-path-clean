import { base44 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';

const STORAGE_KEY = 'mindful_path_time_to_first_value_v1';

function getViewportType() {
  if (typeof window === 'undefined') return 'unknown';
  if (window.innerWidth < 640) return 'mobile';
  if (window.innerWidth < 1024) return 'tablet';
  return 'desktop';
}

function readMeasurement() {
  if (typeof window === 'undefined') return null;
  try {
    const value = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) || 'null');
    return value && Number.isFinite(value.startedAt) ? value : null;
  } catch (_) {
    return null;
  }
}

function writeMeasurement(value) {
  if (typeof window === 'undefined') return;
  try {
    if (value) window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    else window.sessionStorage.removeItem(STORAGE_KEY);
  } catch (_) {}
}

export function beginTimeToFirstValue({
  entryPoint,
  valueType,
  locale = 'en',
  conversationId = null,
  baselineAssistantCount = 0,
  restart = false,
}) {
  const existing = readMeasurement();
  if (existing && !restart) return existing;

  const measurement = {
    startedAt: Date.now(),
    entryPoint: entryPoint || 'unknown',
    valueType: valueType || 'unknown',
    locale,
    viewport: getViewportType(),
    conversationId,
    baselineAssistantCount: Math.max(0, Number(baselineAssistantCount) || 0),
  };
  writeMeasurement(measurement);
  return measurement;
}

export function bindTimeToFirstValueConversation(conversationId, baselineAssistantCount = 0) {
  const measurement = readMeasurement();
  if (!measurement || !conversationId) return null;
  const next = {
    ...measurement,
    conversationId,
    baselineAssistantCount: Math.max(0, Number(baselineAssistantCount) || 0),
  };
  writeMeasurement(next);
  return next;
}

export function completeTimeToFirstValue({
  valueType,
  locale = 'en',
  conversationId = null,
  assistantCount = null,
}) {
  const measurement = readMeasurement();
  if (!measurement) return null;
  if (measurement.conversationId && conversationId && measurement.conversationId !== conversationId) return null;
  if (
    Number.isFinite(assistantCount)
    && assistantCount <= (measurement.baselineAssistantCount || 0)
  ) return null;

  const durationMs = Math.max(0, Date.now() - measurement.startedAt);
  writeMeasurement(null);

  if (appParams.appId && !window.__DISABLE_ANALYTICS__) {
    Promise.resolve(base44.analytics.track({
      eventName: 'time_to_first_value_completed',
      properties: {
        duration_ms: durationMs,
        entry_point: measurement.entryPoint,
        value_type: valueType || measurement.valueType,
        locale: locale || measurement.locale,
        viewport: measurement.viewport,
      },
    })).catch(() => {});
  }

  return durationMs;
}

export function clearTimeToFirstValue() {
  writeMeasurement(null);
}
