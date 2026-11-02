# Chat Orchestrator Phase 0 Baseline

## Runtime functions now covered

`src/lib/chatRuntimeLifecycle.js` is now imported by `src/pages/Chat.jsx` and provides the shared runtime lifecycle helpers for:

- expected reply calculation (`calculateExpectedReplyCount`)
- assistant identity key selection (`getAssistantIdentityKey`)
- message deduplication (`deduplicateMessagesByLifecycleKeys`)
- subscription suppression while loading (`shouldSuppressSubscriptionEventWhileLoading`)
- polling schedule/timeout bounds (`getDefaultPollingLifecycle`, `getPollingDelayForAttempt`, `hasPollingAttemptTimedOut`)
- correction-block attachment (`buildPendingCorrectionPrefix`, `buildOutboundUserMessageContent`)
- correction-block sanitization detection (`wasCorrectionBlockSanitized`)
- final assistant-response selection (`selectLatestAssistantResponse`)

## Confirmed current behaviors (characterization)

The Phase 0 tests explicitly preserve/document current behavior, including known gaps:

- expected reply state is array-position based and can be overwritten by rapid sends
- `turn_id`, `reply_to_turn_id`, `client_request_id`, and `generation_id` are not used for turn correlation
- subscription events are suppressed while loading
- polling stops at the current bounded attempt threshold
- duplicate polling/subscription copies of the same assistant message are deduplicated
- correction blocks are prepended to stored outbound user messages
- correction blocks are sanitized from visible user content
- `action_permitted=false` has no deterministic post-generation response enforcement
- one assistant message yields one selected assistant identity
- formulation-led runtime diagnostic and injector behavior are compared in fixtures
- LTS absent/weak/warming states and continuity session counts are represented as distinct fixture states

## Privacy-safe diagnostic schema (`_s2debug=true` only)

When `_s2debug` is enabled, lifecycle diagnostics emitted from the active Chat runtime are bounded by `buildS2DebugLifecycleDiagnostic` and only include non-content fields:

- `correlation_mode`
- `active_request_count`
- `expected_reply_count`
- `delivery_source`
- `polling_attempt`
- `polling_exhausted`
- `subscription_event_suppressed`
- `assistant_identity_source`
- `correction_block_attached`
- `correction_block_sanitized`
- `action_permitted`
- `response_policy_enforced`
- `lts_read_state`
- `lts_warming_up`
- `formulation_led_configured`
- `formulation_led_injected`

No user/assistant text, clinical content, correction text, memory content, names, or personal identifiers are logged by this schema.

## Test matrix

- `test/utils/chatRuntimeLifecyclePhase0.test.js`
  - runtime lifecycle extraction coverage (shared module used by Chat)
  - known-gap characterization coverage
  - privacy-safe diagnostic fixture representation coverage

## Gaps intentionally not fixed in Phase 0

- no turn-correlation migration to server/client IDs
- no deterministic response-policy enforcement after generation
- no action-permitted blocker in post-generation validation
- no strategy/planner/prompt changes
- no schema/entity/memory migration changes

## `chatStabilityReport.js` dead code note

`src/lib/chatStabilityReport.js` remains unchanged in this phase. Diagnostics for this phase are wired through `src/lib/chatRuntimeLifecycle.js`, which is imported by `src/pages/Chat.jsx`.

## Phase 1 entry criteria

Phase 1 may start only when all of the following are true:

1. Phase 0 characterization tests are green and unskipped.
2. Shared lifecycle helpers are the single source for both Chat runtime and tests.
3. `_s2debug` diagnostics remain default-off and privacy-safe.
4. No user-visible chat behavior drift is observed from the extraction-only PR.
5. Required validation commands are passing on this branch.

Last updated: 2026-08-03
