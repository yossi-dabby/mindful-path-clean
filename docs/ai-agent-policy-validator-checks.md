# AI Agent Policy Validator — Check Reference

> **File:** `functions/validateAgentPolicy.ts`
> **Tests:** `test/utils/validateAgentPolicy.test.js`
> **Policy source:** `docs/ai-agent-enforcement-spec.md` §F (Validation Rules)

This document summarises each check performed by the validator. No runtime
behaviour is modified; the validator is additive-only.

---

## Supported agents

| `name` value | Canonical key |
|---|---|
| `cbt_therapist` | CBT Therapist |
| `ai_companion` | AI Companion |

Agent names are matched case-insensitively with spaces or underscores.

---

## Check 1 — System-prohibited entities (both agents)

**Rule:** `Subscription`, `UserDeletedConversations`, `AppNotification`, and
`MindGameActivity` must never appear in any agent's `tool_configs`.

**Trigger:** Any `tool_config` entry whose `entity_name` matches one of the
four prohibited entities.

**Source:** Enforcement spec §E, §F (Both agents).

---

## Check 2 — CBT Therapist: restricted entities must not be preferred

**Rule:** `MoodEntry`, `CompanionMemory`, `CaseFormulation`, and `Conversation`
are restricted for the CBT Therapist. Setting `access_level: "preferred"` on
any of them violates policy.

**Trigger:** A `tool_config` for one of those four entities with
`access_level === "preferred"`.

**Source:** Enforcement spec §F (CBT Therapist).

---

## Check 3 — CBT Therapist: Conversation must not precede SessionSummary

**Rule:** `SessionSummary` must appear earlier in the source order than
`Conversation`. `SessionSummary` is the required default recall source;
`Conversation` is the last resort.

**Trigger:** Both entities have a numeric `source_order` and
`Conversation.source_order < SessionSummary.source_order`.

**Source:** Enforcement spec §F (CBT Therapist), §C.

---

## Check 4 — CBT Therapist: CaseFormulation must not be unrestricted

**Rule:** `CaseFormulation` is gated behind read-only, clinical-review-confirmed
access. It must never be made unrestricted.

**Trigger:** A `tool_config` for `CaseFormulation` with `unrestricted: true`.

**Source:** Enforcement spec §F (CBT Therapist), §D.

---

## Check 5 — AI Companion: agent-specific prohibited entities

**Rule:** `ThoughtJournal`, `CoachingSession`, and `CaseFormulation` are
prohibited for the AI Companion (clinical reasoning is outside its role).

**Trigger:** Any `tool_config` entry with `entity_name` matching one of those
three entities.

**Source:** Enforcement spec §E, §B, §F (AI Companion).

---

## Check 6 — AI Companion: restricted entities must not be preferred

**Rule:** `Goal`, `SessionSummary`, and `Conversation` are restricted for the
AI Companion. Setting `access_level: "preferred"` on any of them violates policy.

**Trigger:** A `tool_config` for one of those three entities with
`access_level === "preferred"`.

**Source:** Enforcement spec §F (AI Companion).

---

## Check 7 — AI Companion: Conversation must not precede SessionSummary

**Rule:** `Conversation` may only be loaded when `CompanionMemory` and
`SessionSummary` are both insufficient. Its `source_order` must be greater than
`SessionSummary`'s.

**Trigger:** Both entities have a numeric `source_order` and
`Conversation.source_order < SessionSummary.source_order`.

**Source:** Enforcement spec §F (AI Companion), §C.

---

## Check 8 — AI Companion: CompanionMemory must not drive clinical reasoning

**Rule:** `CompanionMemory` drives personalisation and tone only. It must not
be flagged as a clinical reasoning source.

**Trigger:** A `tool_config` for `CompanionMemory` with
`use_for_clinical_reasoning: true`.

**Source:** Enforcement spec §F (AI Companion).

---

## Check 9 — Both agents: CaseFormulation cannot be unrestricted

**Rule:** No agent may configure `CaseFormulation` as an unrestricted live
guidance source.

**Trigger:** A `tool_config` for `CaseFormulation` with `unrestricted: true`
(for non-CBT Therapist agents; CBT Therapist is already covered by Check 4).

**Source:** Enforcement spec §F (Both agents).

---

## Request / response format

```json
POST /validateAgentPolicy
{
  "name": "cbt_therapist",
  "tool_configs": [
    {
      "entity_name": "ThoughtJournal",
      "access_level": "preferred",
      "source_order": 3
    },
    {
      "entity_name": "CompanionMemory",
      "access_level": "restricted",
      "source_order": 1,
      "use_for_clinical_reasoning": false
    },
    {
      "entity_name": "CaseFormulation",
      "access_level": "restricted",
      "unrestricted": false
    }
  ]
}
```

**200 OK** — all checks pass:
```json
{ "valid": true, "agent": "cbt_therapist", "violations": [] }
```

**400 Bad Request** — one or more checks fail:
```json
{
  "valid": false,
  "agent": "cbt_therapist",
  "violations": [
    "CBT Therapist: \"Conversation\" (source_order 1) must not appear before \"SessionSummary\" (source_order 5) ..."
  ]
}
```
