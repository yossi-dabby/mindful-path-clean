# SuperCbtAgent — Frequently Asked Questions

> **Status: SCAFFOLD COMPLETE — ACTIVATION PENDING HUMAN APPROVAL**  
> This FAQ covers the SuperCbtAgent design, configuration, licensing, language support,
> and operational questions.

---

## Table of Contents

- [General](#general)
- [Capabilities and Languages](#capabilities-and-languages)
- [Configuration and Licensing](#configuration-and-licensing)
- [Enabling and Testing](#enabling-and-testing)
- [Safety and Privacy](#safety-and-privacy)
- [Monitoring and Operations](#monitoring-and-operations)
- [Troubleshooting](#troubleshooting)

---

## General

### What is the SuperCbtAgent?

The SuperCbtAgent is a planned opt-in upgrade path for the existing `cbt_therapist` agent.
It is **not a new agent** — it is the same agent running on a more capable wiring configuration
that adds multilingual support, dynamic CBT sub-protocol selection, and cross-session
longitudinal context.

It is entirely backward-compatible.  When not enabled, the app routes to the standard therapist
path (exactly as before).

### How is the SuperCbtAgent different from the existing CBT Therapist?

| Aspect | Existing CBT Therapist (V5) | SuperCbtAgent |
|--------|----|----|
| Languages | English (primary) | All 7 app languages: en, he, es, fr, de, it, pt |
| CBT protocol | Standard CBT | Dynamic: standard CBT, ACT-informed, DBT-skills, MBSR-adjacent, or schema-focused |
| Session memory | Most recent session summary | Super-session context spanning multiple prior sessions |
| Workflow engine | Phase 3 engine (10 rules) | Extended rules with protocol-specific guidance |
| Safety filters | All Stage 2 safety layers | Identical — all inherited unchanged |
| Entity access | Stage 2 V5 matrix | Identical — no new entity access at scaffold time |

### Is the SuperCbtAgent a completely different code path?

No.  It composes the highest existing phase (Stage 2 V5) by spreading all its configuration
and layering additive markers on top.  The entity access matrix, safety filters, and crisis
detection behavior are identical to V5.

The composition chain is:

```
CBT_THERAPIST_WIRING_HYBRID
  └─ V1 → V2 → V3 → V4 → V5
                             └─ SUPER_CBT_AGENT_WIRING (this feature)
```

See [`docs/super-agent/architecture.md`](./architecture.md) for the full composition diagram.

### Which PR delivered the SuperCbtAgent?

The feature was delivered across six PRs (Tasks 1–6):

| Task | PR content | Status |
|------|-----------|--------|
| 1 | Repository inventory and agent mapping | ✅ Merged |
| 2 | Scaffold module (`src/lib/superCbtAgent.js`) | ✅ Merged |
| 3 | i18n keys for all 7 languages | ✅ Merged |
| 4 | Logic: locale resolution, i18n string resolution, session preamble | ✅ Merged |
| 5 | E2E tests (`tests/e2e/super-cbt-agent.spec.ts`) | ✅ Merged |
| 6 | Activation guide and FAQ (this document) | ✅ This PR |

---

## Capabilities and Languages

### Which languages does the SuperCbtAgent support?

All 7 languages defined in the app:

| Code | Language |
|------|----------|
| `en` | English |
| `he` | Hebrew |
| `es` | Spanish |
| `fr` | French |
| `de` | German |
| `it` | Italian |
| `pt` | Portuguese |

### How does language selection work in a session?

The super agent reads the `locale` (or `language`) field from the session context object at
the start of each session.  If the resolved value is not in the supported language list,
it falls back to English.

The function responsible is `resolveSessionLocale()` in `src/lib/superCbtAgent.js`:

```javascript
resolveSessionLocale({ locale: 'he' });   // → 'he'
resolveSessionLocale({ locale: 'xx' });   // → 'en' (fallback)
resolveSessionLocale(null);               // → 'en' (fallback)
```

### Does the super agent switch languages mid-session?

No.  The language is resolved once at session start and is stable for the lifetime of
the session.

### What happens if a translation is missing for a language?

`resolveAgentI18nStrings()` falls back to English if the target locale section is absent
from the translations map.  This ensures no empty strings are ever shown to users.

All 7 language sections are fully populated as of Task 3.  There are no missing translations.
Run `npx vitest run test/utils/superCbtAgentI18n.test.js` to verify.

### How do I add support for a new language?

> **This requires explicit repository-owner approval before any changes to translations or agent wiring.**

The steps would be:
1. Add the new language code to `SUPER_CBT_AGENT_LANGUAGES` in `src/lib/superCbtAgent.js`.
2. Add the `chat.super_cbt_agent` block for the new language in `src/components/i18n/translations.jsx`.
3. Add the new language to the existing i18n bootstrap and language selector.
4. Add a new test case in `test/utils/superCbtAgentI18n.test.js`.
5. Get a native speaker to review the new translations before activation.

---

## Configuration and Licensing

### What environment variables do I need to set?

Two variables control the super agent:

| Variable | Required value | Purpose |
|----------|---------------|---------|
| `VITE_THERAPIST_UPGRADE_ENABLED` | `true` | Master gate — must be true for any Stage 2 path |
| `VITE_SUPER_CBT_AGENT_ENABLED` | `true` | Super agent gate — routes to `SUPER_CBT_AGENT_WIRING` |

Both variables default to `false` in source code.

> `VITE_*` variables are baked into the static bundle at build time.  
> They **cannot** be changed at runtime — a rebuild is required after each change.

### Are there any licensing costs or Base44 configuration changes required?

The SuperCbtAgent uses the **same `cbt_therapist` Base44 agent** that is already active
in production.  It does not introduce a new agent, new Base44 entity, or new API endpoint.

No Base44 licensing changes are required to use the super agent.  The only configuration
changes are the environment variables listed above.

### Does the Base44 app need to be updated?

No Base44 app schema or configuration changes are required.  The super agent inherits
the existing entity access matrix from V5 without modification.

Any future capability that requires new entity access (e.g., expanded cross-session memory)
will require a separate approved PR and explicit repository-owner sign-off.  See
[`docs/ai-agent-access-policy.md`](../ai-agent-access-policy.md).

### Do I need a separate Base44 app for staging?

Yes.  Always use a **separate staging Base44 app** (`VITE_BASE44_APP_ID=<staging-id>`) for
testing.  Never test the super agent against the production Base44 app.

See [`docs/staging-deployment-guide.md`](../staging-deployment-guide.md) for platform setup.

### Can I enable the super agent in development mode?

Yes, for local development only:

```bash
VITE_THERAPIST_UPGRADE_ENABLED=true VITE_SUPER_CBT_AGENT_ENABLED=true npm run dev
```

This uses a `VITE_BASE44_APP_ID` that should point to your development/staging app.
Never use a production app ID in local development.

---

## Enabling and Testing

### What is the minimum test suite I must run before enabling the super agent?

```bash
npm test                    # Unit tests — must be 100% green
npm run lint                # Lint — must be zero errors
npm run build               # Build — must succeed
npm run test:e2e            # E2E tests — must pass (includes super-cbt-agent.spec.ts)
```

### How do I verify the super agent is active in the running app?

```javascript
// In the browser console or in a Vitest/Playwright test:
import { isSuperAgentEnabled } from './src/lib/superCbtAgent.js';
console.log(isSuperAgentEnabled()); // true when active
```

Or inspect the active wiring:

```javascript
import { ACTIVE_CBT_THERAPIST_WIRING } from './src/api/activeAgentWiring.js';
console.log(ACTIVE_CBT_THERAPIST_WIRING.super_agent); // true when super agent is routing
```

### What does "scaffold only — not active" mean in the code comments?

It means the super agent module (`src/lib/superCbtAgent.js`) exists and is importable,
but is not yet wired into the active routing path.  No user traffic routes through
`SUPER_CBT_AGENT_WIRING` until the Task 4 activation PR adds the routing branch to
`resolveTherapistWiring()` in `src/api/activeAgentWiring.js`.

### How do I run only the super agent unit tests?

```bash
npx vitest run test/utils/superCbtAgent.test.js test/utils/superCbtAgentLogic.test.js test/utils/superCbtAgentI18n.test.js
```

### How do I run only the super agent E2E tests?

```bash
npx playwright test tests/e2e/super-cbt-agent.spec.ts
```

### How do I test the multilingual preamble generation?

```javascript
import {
  buildSuperAgentSessionPreamble,
  SUPER_CBT_AGENT_WIRING,
} from './src/lib/superCbtAgent.js';
import { translations } from './src/components/i18n/translations.jsx';

// Simulate active wiring with multilingual enabled
const wiring = { ...SUPER_CBT_AGENT_WIRING, multilingual_context_enabled: true };

const preamble = buildSuperAgentSessionPreamble(wiring, 'he', translations);
console.log(preamble);
// Expected (when VITE_SUPER_CBT_AGENT_ENABLED=true):
// [SUPER_CBT_AGENT: מצב CBT מתקדם]
// המפגש שלך מופעל על ידי סוכן ה-CBT המתקדם עם תמיכה רב-לשונית מלאה.
// תמיכה מלאה ב-CBT רב-לשוני פעילה.
```

---

## Safety and Privacy

### Does the super agent change any safety filters?

No.  All safety filters are **inherited from Stage 2 V5** and cannot be bypassed:

| Safety layer | Source | Status |
|---|---|---|
| Crisis detection (`detectCrisisWithReason`) | Shared — all paths | Unchanged |
| Output sanitization (`validateAgentOutput`) | Shared — all paths | Unchanged |
| Backend safety filter (`postLlmSafetyFilter`) | Shared — all paths | Unchanged |
| Safety mode (`therapistSafetyMode.js`) | V5 | Inherited |
| Emergency resource layer | V5 | Inherited |

### Does the super agent access any new entity types?

No.  The entity access matrix is identical to V5.  No new entity access was introduced
at scaffold time.

Any future expansion of entity access requires:
1. Explicit written approval from the repository owner.
2. A separate reviewed PR.
3. A human reviewer who understands the Base44 runtime.
4. Confirmation that no private user entity is newly accessible.

See [`docs/ai-agent-access-policy.md`](../ai-agent-access-policy.md).

### Does the super agent expose any private user entities?

No.  The following private user entities are **never** indexed, retrieved, or exposed
in shared pipelines, and the super agent does not change this:

- `ThoughtJournal`
- `Conversation`
- `CaseFormulation`
- `MoodEntry`
- `CompanionMemory`
- `UserDeletedConversations`

### Is the super agent safe for vulnerable users?

The super agent inherits all safety constraints designed for the existing CBT Therapist.
Crisis detection, safety mode, and emergency resource delivery are all active and unchanged.

The super agent must never be enabled in production until:
1. All Phase 0–3 rollout gates in `docs/super-agent-rollout-checklist.md` are complete.
2. The repository owner has given explicit written approval.
3. The full test suite (unit + E2E) passes with zero failures.

### Can the AI Companion access super agent features?

No.  The super agent is exclusively an upgrade path for the `cbt_therapist` agent.
The AI Companion (`ai_companion`) wiring is frozen and unchanged.

---

## Monitoring and Operations

### How do I know if the super agent is handling sessions?

Look for these signals in your logs:

- `[superCbtAgent] preamble generated: locale=<lang>` — super agent session started
- `ACTIVE_CBT_THERAPIST_WIRING.super_agent === true` at runtime

### What metrics should I alert on?

| Metric | Alert threshold |
|--------|----------------|
| `super_agent.session_started` | Unexpected drop |
| `super_agent.preamble_generated` | Unexpected drop |
| `therapist.safety_mode_active` | Increase > 10% |
| `therapist.session_completed` | Drop > 5% |

See [`docs/super-agent-rollout-checklist.md`](../super-agent-rollout-checklist.md) §Telemetry for the
full metric inventory.

### How do I roll back if something goes wrong?

Fastest rollback (< 5 minutes):

1. Set `VITE_SUPER_CBT_AGENT_ENABLED=false` in your build environment.
2. Rebuild and redeploy.

To roll back the entire Stage 2 upgrade path:

1. Set `VITE_THERAPIST_UPGRADE_ENABLED=false`.
2. Rebuild and redeploy.

This is the single-switch rollback for all Stage 2 behavior including the super agent.
No user data is lost or corrupted by a rollback.

See [`docs/super-agent/activation-guide.md`](./activation-guide.md) §Rollback for the
verification checklist.

### How often should I review telemetry after activation?

- At 24h, 48h, and 72h after any rollout phase change.
- Continuously for the first 72 hours after full activation (Phase 4).
- See [`docs/super-agent-rollout-checklist.md`](../super-agent-rollout-checklist.md) for phase-specific
  review requirements.

---

## Troubleshooting

### The super agent flag is `true` but sessions still use the standard path

Most likely causes:
1. The wiring routing branch in `activeAgentWiring.js` has not been added yet (Task 4 activation PR).
2. `VITE_THERAPIST_UPGRADE_ENABLED` is `false` (master gate is off).
3. The env var was set after the build ran — a rebuild is required.

### The session preamble is not appearing

Most likely causes:
1. `multilingual_context_enabled` is `false` in `SUPER_CBT_AGENT_WIRING` (default in scaffold).
2. The i18n `session_intro` key is missing for the user's locale.

Run `npx vitest run test/utils/superCbtAgentI18n.test.js` to check translation completeness.

### The Hebrew session preamble appears in English

Most likely causes:
1. The user's session context does not have `locale: 'he'` — `resolveSessionLocale()` is
   falling back to `'en'`.
2. The Hebrew translation block is missing — verify with the i18n test.

### A test is failing that was previously passing

Run the super agent tests in isolation first:
```bash
npx vitest run test/utils/superCbtAgent.test.js test/utils/superCbtAgentLogic.test.js test/utils/superCbtAgentI18n.test.js
```

If isolation tests pass but the full suite fails, a shared-state issue is likely.  Check
for global variable mutations in other test files.

---

## Related Documents

- [`docs/super-agent/README.md`](./README.md) — Overview and capability roadmap
- [`docs/super-agent/architecture.md`](./architecture.md) — Composition and inheritance design
- [`docs/super-agent/activation-guide.md`](./activation-guide.md) — Step-by-step activation guide
- [`docs/super-agent-rollout-checklist.md`](../super-agent-rollout-checklist.md) — Phase-gate checklist
- [`docs/i18n-super-agent.md`](../i18n-super-agent.md) — i18n key documentation
- [`docs/analysis-super-agent.md`](../analysis-super-agent.md) — Agent and i18n inventory
- [`docs/copilot-safety-rules.md`](../copilot-safety-rules.md) — Safety rules
- [`docs/ai-agent-access-policy.md`](../ai-agent-access-policy.md) — Agent entity access policy
- `src/lib/superCbtAgent.js` — Scaffold module

---

*Last updated: 2026-04-08 — Task 6 (Docs and Activation Guide) PR*
