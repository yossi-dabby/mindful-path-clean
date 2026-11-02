// @ts-check
import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';
import { normalizeEntityList } from '@/lib/entityListNormalizer';
import { installExerciseProgressAdapter } from '@/lib/exerciseProgress';
import { resolveBase44AuthBaseUrl } from '@/lib/base44AuthUrl';

const { appId, token, functionsVersion } = appParams;

// OAuth must start on the app-specific Base44 host. The public Railway host
// serves the SPA and the verified Android callback, but it does not implement
// Base44's /api/apps/auth/login endpoint.
const AUTH_BASE_URL = resolveBase44AuthBaseUrl({
  configuredAuthBaseUrl: import.meta.env.VITE_BASE44_AUTH_BASE_URL,
  runtimeOrigin: typeof window !== 'undefined' ? window.location.origin : undefined,
});

//Create a client with authentication required
export const base44 = createClient({
  appId: appId || undefined,
  token,
  functionsVersion,
  requiresAuth: false,
  appBaseUrl: AUTH_BASE_URL,
});

// Prevent /api/apps/null/analytics/track/batch requests when appId is missing or falsy.
// cleanup() stops the heartbeat processor and the internal batch flush loop.
// Note: cleanup() exists on the runtime analytics instance but is not declared in
// the public AnalyticsModule interface — use a local type that extends the SDK type.
if (!appId) {
  // cleanup() stops the heartbeat processor and the internal batch flush loop.
  // It exists on the runtime analytics instance but is not declared in the
  // public AnalyticsModule interface — cast to any for the runtime guard.
  const analytics = /** @type {any} */ (base44.analytics);
  if (typeof analytics.cleanup === 'function') {
    analytics.cleanup();
  }
  base44.analytics = /** @type {import('@base44/sdk').AnalyticsModule} */ ({ track: () => {} });
}

// ---------------------------------------------------------------------------
// Override base44.auth.updateMe to use the entity SDK instead of raw fetch.
//
// The Base44 SDK's updateMe convenience method sends a request that returns
// 405 in this deployment. Using entities.User.update() with the current
// user's ID is functionally equivalent and uses the SDK's own auth session.
// ---------------------------------------------------------------------------
if (appId) {
  base44.auth.updateMe = async (data) => {
    const me = await base44.auth.me();
    return base44.entities.User.update(me.id, data);
  };
}

// ---------------------------------------------------------------------------
// Shared entity-response normalization
//
// Wrap every entity's .list() and .filter() methods so that paginated
// envelopes ({ count, results }) are transparently converted to bare arrays.
// All other entity methods (create, update, delete, get, …) are untouched.
// See src/lib/entityListNormalizer.js for the normalizer logic and rationale.
// ---------------------------------------------------------------------------
try {
  const entities = base44.entities;
  if (entities && typeof entities === 'object') {
    Object.keys(entities).forEach((entityName) => {
      const entity = entities[entityName];
      if (!entity || typeof entity !== 'object') return;
      ['list', 'filter'].forEach((method) => {
        const original = entity[method];
        if (typeof original !== 'function') return;
        entity[method] = (...args) =>
          Promise.resolve(original.apply(entity, args)).then((result) =>
            normalizeEntityList(result, {
              entityName,
              method,
              diagnosticKey:
                entityName === 'Goal' && method === 'filter'
                  ? 'client_goal_response_shape'
                  : '',
            })
          );
      });
    });
  }
} catch (_) {
  // Normalization patching is best-effort — never crash client initialization.
}

// Keep the Exercise entity as an admin-managed content catalog. User-specific
// favorites and completion metrics are transparently stored in the owner-only
// UserExerciseProgress entity while existing UI callers keep the same API.
try {
  installExerciseProgressAdapter(base44);
} catch (_) {
  // Adapter setup is best-effort; catalog reads must never crash app startup.
}
