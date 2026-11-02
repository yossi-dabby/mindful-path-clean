# Agent architecture hardening — 2026-10-08

## Executive decision

Mindful Path has two active in-app agents:

1. **cbt_therapist** — the clinical CBT chat at /Chat.
2. **ai_coach** — the goal and coaching chat created from the Coach screen.

Four additional agent names are retained only for backward compatibility:

- **ai_companion** is not mounted in the current application.
- **cbt_therapist_strict**, **cbt_therapist_standard**, and
  **cbt_therapist_lenient** are legacy names used to list historical
  conversations. Chat.jsx already blocks new messages to them.

Deleting these four names now could make historical conversations harder to
resolve. They are therefore archived rather than deleted.

## Runtime map

| Agent | Current runtime entry point | Decision | Data posture |
|---|---|---|---|
| cbt_therapist | src/pages/Chat.jsx | Active | Existing clinically reviewed wiring; curriculum function restored |
| ai_coach | CoachingSessionWizard.jsx → CoachingChat.jsx | Active | Dedicated read-only entity wiring; no direct entity writes |
| ai_companion | No mounted component | Archived | No tools |
| cbt_therapist_strict | Historical conversation lookup only | Archived | No tools |
| cbt_therapist_standard | Historical conversation lookup only | Archived | No tools |
| cbt_therapist_lenient | Historical conversation lookup only | Archived | No tools |

## Confirmed defects corrected

### Coach/Companion identity mismatch

The Coach wizard created an ai_coach conversation but supplied
ACTIVE_AI_COMPANION_WIRING.tool_configs. Coach message feedback was also
tagged as ai_companion.

The Coach now uses ACTIVE_AI_COACH_WIRING end-to-end and feedback is tagged
as ai_coach.

### Excessive Coach write access

The deployed Coach definition could create and update goals and companion
memory, and update exercises without an application-level confirmation
boundary.

The Coach is now read-only for CompanionMemory, Exercise, Goal, MoodEntry,
ThoughtJournal, and CoachingSession. It has no direct entity write capability.
Any future persistence must be implemented in application-owned code behind an
enforceable consent gate rather than relying on model or prompt compliance.

### Incomplete therapist tool registration

The therapist instructions required retrieveCurriculumUnit, but its agent tool
configuration did not expose the function. The function is now registered.
Every therapist backend function now has an operational description defining
its purpose and privacy/safety boundary.

### Placeholder-based legacy prompts

The three legacy therapist profiles contained text claiming that all other
instructions were “identical” to another agent. Base44 agent configuration does
not provide prompt inheritance through that text.

The profiles are now explicit archived stubs with no tools. This removes the
false inheritance while retaining their stable names for history.

## Crisis controls

The application already has code-level crisis enforcement; it is not prompt-only:

- detectCrisisWithReason runs before model delivery on both Therapist and Coach
  surfaces.
- Coach blocks the message, opens InlineRiskPanel, and records a non-blocking
  CrisisAlert.
- Therapist has the same detector plus its broader runtime safety mode.
- Agent prompts remain a fallback boundary, not the primary crisis control.

The hardening test verifies that Coach crisis detection and the risk panel occur
before base44.agents.addMessage.

## Model findings

The Base44 editor displayed **Automatic** for all six agents at audit time. The
repository agent schema contains no model field, so the exact provider/model
selected by Automatic is not inspectable or version-pinnable from Git.

Base44 publicly documents AI model selection as a plan feature, but does not
publish enough information to infer which concrete model Automatic used for a
particular response. A blind switch on a mental-wellness surface is therefore
not an evidence-based upgrade.

Recommended rollout:

1. Keep cbt_therapist and ai_coach on Automatic for the initial hardening
   release.
2. Build a de-identified multilingual benchmark covering safety, role
   boundaries, consent, warmth, latency, and tool accuracy.
3. Compare available Base44 model choices against the same benchmark.
4. Change only one agent at a time, starting with ai_coach, and retain an
   immediate rollback path.

## Base44 editor settings required after the Git PR deploys

These settings are Base44 control-plane metadata and are not represented in
base44/agents/*.jsonc; they must not be simulated in source code.

| Agent | Memory | Telegram | Model |
|---|---|---|---|
| cbt_therapist | **Per User Only** | Keep only if this is an intentionally supported, tested channel | Automatic pending benchmark |
| ai_coach | **Per User Only** | Disconnect unless Coach is intentionally offered through Telegram | Automatic pending benchmark |
| ai_companion | **Off** | Disconnect | Irrelevant while archived |
| Three legacy therapist profiles | **Off** | Disconnect | Irrelevant while archived |

Existing memory records must be reviewed in place; do not bulk-delete them.
Sensitive or cross-user records require a separate, auditable migration rather
than an unreviewed destructive action.

## Shared App Skill decision

A shared safety App Skill can reduce prompt duplication, but App Skills are not
represented in this repository's Base44 source schema. Creating one in the
editor and assuming Git will reproduce it would violate the repository's
source-of-truth rule.

Create and attach a shared safety App Skill only after Base44 provides an
exportable/versioned representation or after the team explicitly accepts that
the skill is control-plane configuration. Until then:

- safety remains enforced in application code;
- active prompts keep their own fallback safety boundary;
- archived agents have no tools;
- no placeholder text is treated as inheritance.

## Main therapist prompt

The active therapist prompt is approximately 142,779 characters and contains
substantial validated clinical behavior. It should not be shortened in the same
change that alters agent inventory and Coach permissions.

Prompt compaction should be a separate reviewed change with:

- a before/after multilingual golden set;
- crisis and false-positive scenarios;
- formulation-first and consent scenarios;
- domain-lock and continuity tests;
- latency and truncation measurements;
- a one-step rollback.

This separation prevents an architecture cleanup from silently changing
clinical behavior.
