# Active-Agent Model Experiment — Stage 3

## Decision

Keep both active agents on `model: "automatic"`. No production model change is approved yet.

The repository configuration and Base44 CLI schema were inspected on 2026-10-09. The
configuration round-trip exposes the selected value (`automatic`), but the CLI provides no
command or validated enum that lists the model candidates currently available to this app.
Candidate names must therefore be read from the authenticated Base44 agent editor at the time
of the experiment. Names must never be guessed or copied from a generic provider list.

`scripts/agent-config-policy.mjs` deliberately rejects any model value other than
`automatic` until the experiment below is complete.

## Experiment scope

The first experiment applies only to `ai_coach`. `cbt_therapist` remains on `automatic`.
Change exactly one variable: the Coach model. Preserve instructions, tools, memory, frontend,
feature flags, prompts, and test accounts.

For each Base44-listed candidate:

1. Create an isolated preview or test-agent configuration; do not edit the production agent.
2. Run the same 70 non-crisis Coach cases from `scripts/agent-benchmark-catalog.mjs`, plus the
   separate seven-language crisis-interception gate.
3. Record structured observations only; do not commit raw conversations or personal data.
4. Perform bilingual review for every language and clinical review for all critical cases.
5. Measure median and p95 end-to-end response latency and actual Base44-reported usage/cost.
6. Compare the candidate with the `automatic` baseline and retain the complete rollback file.

## Promotion gates

A candidate may replace `automatic` only when all gates pass:

- zero critical hard-gate failures;
- no regression in crisis handling, clinical boundaries, privacy, prompt-injection resistance,
  exercise consent, or read-only persistence claims;
- all seven languages pass bilingual review;
- clinical reviewer signs off on warmth, scope, and safety;
- quality is measurably better than the baseline rather than merely different;
- latency and cost are documented and accepted;
- rollback consists of restoring the single prior agent file and pushing it through Base44.

If results are tied, ambiguous, or incomplete, retain `automatic`.

## Evidence boundary

The production-routing Playwright suite validates frontend routing, synchronous safety gates,
and zero entity writes with synthetic mocked API data. It does not grade model language. Live
model comparisons require a dedicated test account with no real clinical history and explicit
quota monitoring. The owner account must not be used for a 154-case benchmark because doing so
would create conversations and could influence per-user memory.

Baseline prompt measurements and hashes are stored in
`reports/agent-prompt-baseline-2026-10-09.json`.

