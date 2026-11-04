# CI efficiency without reducing coverage

The E2E workflow previously ran the same unit suite, build, lint and policy/index validators inside all nine browser jobs. These checks now run once in `Shared E2E checks`. Every browser job has `needs: checks`, so a failed shared check prevents the expensive browser stage from starting. The workflow remains self-contained for manual dispatch; it does not assume that a separate Test Suite run exists or has passed.

| Work per complete applicable CI round | Before | After |
| --- | ---: | ---: |
| Full unit suites inside Playwright E2E | 9 | 1 |
| Full unit suites in Test Suite (Node 20/22) | 2 | 2 |
| E2E production build / lint / explicit policy-index checks | 9 each | 1 each |
| General browser jobs, including smoke | 9 | 9 |
| Hebrew source reproduction and PDF layout validation | 2 | 1 |
| Hebrew browser projects | 2 | 2 |

The Hebrew workflow similarly validates every existing source generation and PDF layout once in `Validate Hebrew forms sources and PDFs`, then gates both browser projects on that job. Each browser job retains its own production build: the fixture serves `/Tools` from `dist/index.html`, and jobs do not share a filesystem. This build also retains index generation and PDF-worker preparation through `prebuild`. The general E2E jobs retain the same Vite development server, whose `predev` generates the index and copies the PDF worker. No build artifacts or mutable workspace are shared between jobs. An initial CI attempt caught this dependency when removing the per-browser Hebrew build caused both web-server readiness checks to time out; the build remains in each browser job and no timeout or readiness assertion was relaxed.

## Cancellation boundaries

The three test workflows use concurrency groups that include the workflow name, event type and ref. A newer PR commit or branch push cancels superseded queued/running checks in the same group. PR numbers are isolated by their `refs/pull/<number>/merge` refs, including PRs from forks with identical branch names. Push checks and PR checks cannot cancel one another. Manual E2E dispatch uses its unique run ID and cannot cancel automatic runs or another manual run.

This does not change deployment workflows, permissions, billing budgets or subscriptions. Trigger events, branch/path filters, test files, assertions, project/shard matrices, browser timeouts and retry behavior remain unchanged. The informational typecheck job retains its existing non-blocking status. A deliberate rerun still consumes runner time; a new commit is required to supersede an older commit's automatic checks.

## Cost interpretation and evidence

PR 22 is the comparison baseline: Test Suite run `41915250569`, E2E run `41915250811`, and Hebrew run `41915250919`. Their job timestamps sum to approximately 195 rounded runner-minutes (9 + 160 + 26). This is an execution-time estimate, not a billing statement or wall-clock duration.

The nine E2E jobs spent about 23.5 runner-minutes in the checks now shared (17.4 unit tests, 4.4 build, 1.6 lint, and a small amount of index/policy validation). Keeping one execution removes eight copies, offset by the new job's checkout/install overhead. Unit-suite executions fall from 11 to 3 across Test Suite and E2E, about 73% fewer executions of that stage; this is **not** a 73% reduction in total CI cost. Browser runtime is still the main cost, and installation/network/runner variance affects comparisons. Cancellation savings depend on how frequently a PR is updated before its earlier run completes.

## Validation and maintenance

- Compare parsed workflow events, matrices, per-browser limits, command/environment coverage, and required job dependencies before and after the change.
- Run the shared commands locally, then validate the actual GitHub job graph and all original browser projects in the PR. Record measured run results in the PR description.
- The unchanged baseline discovers 1,784 general browser cases (1,460 passed and 324 existing skips in PR 22), plus 594 Hebrew browser cases. Existing skips are not new exclusions introduced by this change.
- New shared checks belong in the prerequisite job. Browser-specific setup stays in each matrix job. Keep the prerequisite dependency when adding a browser project.
- Rollback consists of reverting the three workflow changes; application code and forms are unaffected.

GitHub references: [job dependencies](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-jobs) and [workflow concurrency](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency).
