/**
 * Tests for Stripe webhook idempotency / replay-deduplication logic.
 *
 * The webhook handler in functions/stripeWebhook.ts runs on Deno and cannot be
 * imported directly into Vitest. The core deduplication logic is therefore
 * reproduced inline here so it can be exercised without any live Stripe calls,
 * secrets, or Base44 runtime access.
 *
 * Covers:
 *   - isEventAlreadyProcessed: returns false for unseen event IDs
 *   - isEventAlreadyProcessed: returns true for already-seen event IDs
 *   - isEventAlreadyProcessed: fail-open when the entity lookup throws
 *   - markEventAsProcessed: records the event ID in the store
 *   - markEventAsProcessed: swallows errors silently (must not throw)
 *   - Full handler flow: first-time event → processed + recorded
 *   - Full handler flow: duplicate event → skipped, no state changes
 *
 * All event IDs used here are synthetic (evt_test_*) and do not reach Stripe.
 * No secrets or credentials are required to run these tests.
 */

import { describe, it, expect, vi } from 'vitest';

// ─── CORE DEDUPLICATION LOGIC (mirrors functions/stripeWebhook.ts) ────────────
//
// These helpers are reproduced from the Deno function so they can be unit-tested.
// If the logic in stripeWebhook.ts changes, update these mirrors to match.

async function isEventAlreadyProcessed(base44, eventId) {
  try {
    const existing = await base44.asServiceRole.entities.StripeProcessedEvent.filter({
      stripe_event_id: eventId,
    });
    return existing.length > 0;
  } catch {
    // Fail-open: allow processing so legitimate events are never silently dropped.
    return false;
  }
}

async function markEventAsProcessed(base44, eventId, eventType) {
  try {
    await base44.asServiceRole.entities.StripeProcessedEvent.create({
      stripe_event_id: eventId,
      event_type: eventType,
      processed_at: new Date().toISOString(),
    });
  } catch {
    // Swallow — must not cause a non-2xx webhook response.
  }
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

/**
 * Builds a minimal mock Base44 client whose StripeProcessedEvent entity is
 * backed by the provided in-memory array of already-processed event records.
 *
 * @param {Array<{stripe_event_id: string, event_type: string, processed_at?: string}>} processedRecords
 *   Initial set of already-processed Stripe event records. Mutations made by
 *   `create` calls are pushed into this same array so callers can inspect them.
 */
function makeMockBase44(processedRecords = []) {
  return {
    asServiceRole: {
      entities: {
        StripeProcessedEvent: {
          filter: vi.fn(async ({ stripe_event_id }) =>
            processedRecords.filter((r) => r.stripe_event_id === stripe_event_id),
          ),
          create: vi.fn(async (record) => {
            processedRecords.push(record);
            return record;
          }),
        },
        // Subscription is not exercised by the deduplication helpers but is
        // referenced in the switch block; kept here for completeness.
        Subscription: {
          filter: vi.fn(async () => []),
          update: vi.fn(async () => ({})),
          create: vi.fn(async () => ({})),
        },
      },
    },
  };
}

// ─── TESTS — isEventAlreadyProcessed ─────────────────────────────────────────

describe('isEventAlreadyProcessed', () => {
  it('returns false when the processed event store is empty', async () => {
    const base44 = makeMockBase44([]);
    expect(await isEventAlreadyProcessed(base44, 'evt_test_001')).toBe(false);
  });

  it('returns false when the event ID is not in the processed store', async () => {
    const base44 = makeMockBase44([
      { stripe_event_id: 'evt_test_001', event_type: 'checkout.session.completed' },
    ]);
    expect(await isEventAlreadyProcessed(base44, 'evt_test_002')).toBe(false);
  });

  it('returns true when the event ID is already in the processed store', async () => {
    const base44 = makeMockBase44([
      { stripe_event_id: 'evt_test_001', event_type: 'checkout.session.completed' },
    ]);
    expect(await isEventAlreadyProcessed(base44, 'evt_test_001')).toBe(true);
  });

  it('distinguishes between different event IDs with the same event type', async () => {
    const base44 = makeMockBase44([
      { stripe_event_id: 'evt_test_aaa', event_type: 'customer.subscription.deleted' },
    ]);
    expect(await isEventAlreadyProcessed(base44, 'evt_test_aaa')).toBe(true);
    expect(await isEventAlreadyProcessed(base44, 'evt_test_aab')).toBe(false);
  });

  it('returns false (fail-open) when the entity lookup throws', async () => {
    const base44 = {
      asServiceRole: {
        entities: {
          StripeProcessedEvent: {
            filter: vi.fn(async () => { throw new Error('DB unavailable'); }),
          },
        },
      },
    };
    // Must not throw; must return false so the event is processed rather than
    // silently dropped.
    expect(await isEventAlreadyProcessed(base44, 'evt_test_001')).toBe(false);
  });
});

// ─── TESTS — markEventAsProcessed ────────────────────────────────────────────

describe('markEventAsProcessed', () => {
  it('creates a record in StripeProcessedEvent with the correct event ID', async () => {
    const store = [];
    const base44 = makeMockBase44(store);

    await markEventAsProcessed(base44, 'evt_test_001', 'checkout.session.completed');

    expect(store).toHaveLength(1);
    expect(store[0].stripe_event_id).toBe('evt_test_001');
    expect(store[0].event_type).toBe('checkout.session.completed');
  });

  it('does not throw when the entity create call fails', async () => {
    const base44 = {
      asServiceRole: {
        entities: {
          StripeProcessedEvent: {
            create: vi.fn(async () => { throw new Error('Write failed'); }),
          },
        },
      },
    };
    // Must not throw — a write failure must never break the webhook response.
    await expect(markEventAsProcessed(base44, 'evt_test_001', 'checkout.session.completed'))
      .resolves.toBeUndefined();
  });

  it('stores processed_at as a valid ISO timestamp string', async () => {
    const store = [];
    const base44 = makeMockBase44(store);

    await markEventAsProcessed(base44, 'evt_test_002', 'customer.subscription.updated');

    expect(typeof store[0].processed_at).toBe('string');
    expect(store[0].processed_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

// ─── TESTS — full handler deduplication flow ──────────────────────────────────

describe('Stripe webhook — first-time vs duplicate event flow', () => {
  it('processes a first-time event and records it', async () => {
    const store = [];
    const base44 = makeMockBase44(store);
    const eventId = 'evt_test_first_001';
    const eventType = 'customer.subscription.updated';

    const alreadyProcessed = await isEventAlreadyProcessed(base44, eventId);
    expect(alreadyProcessed).toBe(false);

    // Simulate the handler processing the event (state changes would happen here).

    await markEventAsProcessed(base44, eventId, eventType);

    expect(store).toHaveLength(1);
    expect(store[0].stripe_event_id).toBe(eventId);
  });

  it('skips a duplicate event and leaves the store unchanged', async () => {
    const store = [
      {
        stripe_event_id: 'evt_test_dup_001',
        event_type: 'customer.subscription.deleted',
        processed_at: new Date().toISOString(),
      },
    ];
    const base44 = makeMockBase44(store);
    const eventId = 'evt_test_dup_001';

    const alreadyProcessed = await isEventAlreadyProcessed(base44, eventId);

    // Duplicate detected — handler returns early without state changes or a new record.
    expect(alreadyProcessed).toBe(true);
    expect(store).toHaveLength(1); // no new record added
  });

  it('processes two different events independently without cross-contamination', async () => {
    const store = [];
    const base44 = makeMockBase44(store);

    const eventA = 'evt_test_multi_a';
    const eventB = 'evt_test_multi_b';

    // Process event A.
    expect(await isEventAlreadyProcessed(base44, eventA)).toBe(false);
    await markEventAsProcessed(base44, eventA, 'checkout.session.completed');

    // Process event B.
    expect(await isEventAlreadyProcessed(base44, eventB)).toBe(false);
    await markEventAsProcessed(base44, eventB, 'customer.subscription.updated');

    expect(store).toHaveLength(2);

    // Replaying event A is now a duplicate; event B is still fresh only by ID.
    expect(await isEventAlreadyProcessed(base44, eventA)).toBe(true);
    expect(await isEventAlreadyProcessed(base44, eventB)).toBe(true);
  });
});
