# Active-Agent Work Status — updated 2026-10-11

| Stage | Status | Evidence / remaining gate |
|---|---|---|
| 1. Configuration protection | Complete | CI enforces exactly two active agents, inert archives, per-user memory, approved tools, no unplanned connectors/channels, and `automatic` models |
| 2. Quality benchmark | Corrected live baseline completed | PR #1013 / run 37946159587: 140/140 passed preliminary live-response review. PR #1020 / run 37969173230: production crisis workflow succeeded. Human bilingual/clinical review remains pending |
| 3. Coach model experiment | Completed; promotion pending human review | Automatic, GPT-6 Luna, GPT-6 Sol: 70/70. Claude Sonnet 5: 69/70, rejected for Portuguese/Spanish mismatch. See ai-coach-model-comparison-2026-10-09.md. Production stays automatic |
| 4. Coach improvement | #1028 merged; MAIN Preview wording refinement verified | Historical #1023 rejected. Current Coach: silent retrieval, concise opening, no unsolicited history, tentative outcome review in seven languages. Automatic retained; human/clinical review pending |
| 5. Therapist compaction | Preliminary live comparison passed; human review pending | #1024 / run 38071607703: 77/77, 11/11 per language, zero hard-gate failures. Formatting candidate 150,256 → 142,599 characters; no latency/length improvement demonstrated. Production unchanged |
| 6. Legacy cleanup | First UI cleanup PR prepared | #1025 removes the unmounted draggable widget; 158 targeted unit tests and 8 archive SDK read fixtures pass. Four archived agents and all data retained; full CI and human web/Android smoke remain |

## Live response benchmark runner

The repository now includes a manually gated live-response runner for the 140 non-crisis
agent/language cases. It authenticates only as the dedicated verified test user
`yosephdabby4@gmail.com`, creates a fresh conversation per synthetic case, and performs a
batched AI-assisted bilingual and clinical-safety screen. Retained evidence contains response
hashes, model/usage/latency metadata, scores, and short rationales, but no raw response text or
credentials.

The runner cannot replace licensed-clinician review. Any model change or wide release remains
blocked until a qualified clinician reviews the critical cases. The workflow requires the
repository secrets `BASE44_LIVE_TEST_EMAIL` and `BASE44_LIVE_TEST_PASSWORD`; the latter must be
the Mindful Path/Base44 app password, never the user's Google password.

## Controlled-release gate

No wide release follows automatically from these engineering stages. Every behavioral change
still requires local tests, Test Suite, Playwright, Base44 preview, manual web/Android checks,
a limited tester cohort, and then an explicit release decision.


## Post-#1019 verification — 2026-10-10

Base44 source checkpoint: `945294067616dd0f8841a2d2d9554d8f18a0c678`.

- Agent policy: 2 active, 4 archived; no mutable entity tools.
- Targeted memory/summarization/continuity unit tests: 264/264 passed.
- Browser continuity suite: 12/12 passed across desktop and mobile, with mocked backend surfaces.
- #1022 / run 38071364970 proves a live synthetic app-owned summary write and fresh-authenticated read across distinct sessions. Raw responses/credentials are not retained. Full live UI-to-model carryover remains a human check.
- Live verification uses repository secrets only; production persistence flags passed again in run 38071607662.
- `scripts/agent-prompt-candidates.mjs` emits measurement metadata only; it cannot deploy candidates or edit production agents.
- Human review packet: `agent-human-review-packet-2026-10-10.md`; bilingual/clinical sign-off and a limited pilot are pending.
- Original immutable prompt report is retained. It predates #1019; do not treat its therapist hash as the current baseline.

## Final isolated experiments

- Coach refinement: rejected, 68/70 with two hard-gate failures; artifact 11676658888.
- Therapist formatting compaction: 77/77 preliminary passes; artifact 11676634734. Human bilingual/clinical review pending; do not infer a quality gain from character savings.
- Combined isolated worktree: 10,980 tests passed, 267 pre-existing skips; lint passed; build produced dist/index.html; 18 boot/coach/continuity checks and 8 archive read checks passed.
- Temporary remote benchmark configs removed. Checkpoint c88f107a2ab8a1231e0a6f681c481dd79316b354 has source content identical to verified baseline 945294067616dd0f8841a2d2d9554d8f18a0c678. Canonical 2-active/4-archived policy passes.
- #1021, #1022 and #1025 are reviewable PRs, not merged production changes. Final CI and human preview/web/Android checks remain release gates.

## Post-1026 human verification — 2026-10-10

- #1021 and #1026 are merged. Base44 source matches #1026 merge fb40d56288284c55462018dfb2bfa45ed5f8efd5.
- Yossi reported overlapping sends and refresh passed in Base44 Preview and again in the published web app. Preview refusal respected; last-session recall retained the reading obstacle and one-page Tuesday step. This is owner-reported live evidence, not agent-observed production testing.
- Recall initially also mentioned an older walking topic; a correction removed it. Revised quality proposal adds explicit session attribution and caller-requested brevity, without changing tools/models/entities. Live output quality remains unverified for this proposal.
- Four merged Preview regressions passed (slow persistence/generation on desktop/mobile), with mocked model responses.
- #1020 crisis workflow succeeded historically; bilingual/clinical review is still pending.
- #1022 remains open with passing Test Suite/Playwright and live persistence evidence. #1025 remains open with passing final CI; archive UI/Android human smoke is pending. Neither is merged by this work.
- Therapist formatting compaction already passed the isolated seven-language comparison. No new semantic compaction or production promotion is performed here.
- The cloud UI connection timed out during agent live QA. New live quality validation must run after restoring a usable browser or on an isolated remote app branch; production agents are not experiment targets.


## QA consolidation — 2026-10-11

- #1027 is merged; current main baseline is 6a855e59e7a6d7f1d61a447d959d4d3be02f2dc1. The separate QA clone contains the proposed post-merge fixes, not production verification.
- Consolidation fixes summary delivery through the normal send lifecycle, summary cache synchronization and per-conversation offers; preserves sanitized most-recent summary outcomes up to the backend 2000-character bound; opens Coach conversations directly after the wizard and hydrates prior opening messages.
- Coach rendering receives the language of its preceding user message and retains sanitized discussion/outcome reviews instead of replacing them with directive templates. Native tool markup sanitization and routing stripping remain active. Agent configuration changes only instructions; both models remain automatic and read-only tool/memory boundaries remain unchanged.
- Owner reported live therapist tests across seven languages, summary visibility without refresh and latest-session retrieval; the negation-attribution detail was explicitly accepted as non-blocking. No complete professional language or clinical sign-off is claimed.
- Codex executed focused live Preview Coach retests in PT/FR/IT/EN/ES through the wizard. The French-to-Spanish directive substitution did not recur; IT/PT single actions and ES/IT openings without multi-day homework passed the focused checks. Evidence calibration, chronology assumptions, extra opening questions/length and subtle English immediacy remain documented in docs/qa/coach-live-focused-retest-2026-10-11.md.
- QA-only Vite feature-flag definitions are intentionally excluded. Production activation and backend/frontend flag parity require separate verification after an approved merge; no production rollout, semantic compaction or main publication occurs in this consolidation.
- Human bilingual/clinical review, published-site smoke and limited pilot remain release gates. Revert this consolidation PR for code rollback; no schema or historical records are removed.

## MAIN Preview closure after #1028 — 2026-10-11

- #1028 merged baseline: a783f3dc08328ccab85881cf53374dce2ddd8f30. Current engineering closure is in MAIN app 69504b725a07f5aa75aeaf7d Preview, not the separate QA clone.
- Coach final response contract tightened: silent context retrieval, no unsolicited prior-history intake, short declarative outline and focused question, tentative single-attempt outcome interpretation. Both active models remain Automatic.
- Direct wizard opening and automatic opening-message hydration passed. Focused seven-language outcome reviews passed; HE/EN/ES opening retests passed the targeted checks. This is focused synthetic live evidence, not comprehensive human language or clinical approval.
- Two server-retained benchmark resources are inert archives with tools/memory/connectors disabled; originals retained for audit, no historical conversations removed. Policy guard validates the canonical inventory and these known inert optional names.
- Full suite 11,004 passed / 267 skipped / zero failed. Agent policy, multilingual benchmark, lint and build passed. Full suite used an isolated worktree with pinned GitHub workflow fixtures absent from the Base44 clone.
- Final live summary/continuity results and reviewer instructions: docs/qa/main-preview-closure-2026-10-11.md. Earlier dated sections remain historical evidence, not current release state.
- Human language and qualified clinical review remain pending. Published-site/Android smoke and explicit limited-pilot decision remain separate gates. No broad publish, model promotion or therapist semantic compaction was performed.

