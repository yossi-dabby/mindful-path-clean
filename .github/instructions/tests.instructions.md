---
applyTo: "{tests,test}/**"
---

# Copilot Instructions — `tests/` and `test/` Directories

> These instructions apply to all files under `tests/` and `test/`.
> These directories contain **Playwright E2E tests, Android tests, and Vitest unit tests**.
> Tests are production safety nets — do not weaken them.

---

## Risk Level

🟡 **MEDIUM-LOW RISK** — Test changes do not alter runtime behavior directly.
However, removing, skipping, or weakening tests removes safety nets from production code.

---

## What You May Do Without Explicit Approval

- Add new Vitest unit tests in `test/utils/` for existing approved utility functions.
- Add new Playwright E2E specs in `tests/e2e/` for approved user flows.
- Add new Playwright Android specs in `tests/android/`.
- Add golden retrieval scenarios to `functions/goldenScenarios.ts` (additive only).
- Add safety test cases to `functions/safetyGoldenScenarios.ts` (additive only).
- Add test fixtures, mocks, and test helpers that do not change runtime behavior.
- Refactor test helpers for clarity, as long as all existing tests continue to pass.

---

## What You Must NOT Do Without Explicit Approval

- **Do not remove any existing test.** Removing tests removes safety coverage.
- **Do not skip or disable any existing test** (`test.skip`, `it.skip`, `xit`, `xdescribe`).
- **Do not weaken existing test assertions** (e.g., changing `expect(x).toBe(y)` to `expect(x).toBeDefined()`).
- **Do not mock safety-critical functions** in a way that bypasses their logic in production code.
- **Do not add tests that require schema changes or new entities** — tests must work with the current schema.
- **Do not change test helper logic** in a way that causes existing tests to pass when they should fail.

---

## Test Quality Rules

1. New tests must be deterministic and non-flaky.
2. New tests must describe what behavior they are testing (clear test names).
3. Mock data must reflect the actual shape of live entities — do not invent fields.
4. Do not use `setTimeout` or arbitrary waits in tests — use proper async patterns.
5. Do not add console suppression (`console.error = jest.fn()`) unless it is already the pattern in the file.
6. E2E tests must work against the actual running app — do not mock the entire backend in E2E specs.

---

## Required Validation After Adding Tests

- `npm test` — all unit tests must pass (44+ tests; your new tests must pass too).
- `npm run test:e2e` — if you added or modified E2E specs, all E2E tests must pass.
- Confirm new tests are not flaky before merge (run at least twice).

---

## Test Fixture and Mock Rules

- Fixtures must use realistic data that reflects the actual entity shape.
- Never use real user data (PII, actual conversations, real journal entries) in test fixtures.
- Mocks for agent responses must not bypass the actual safety filter logic.
- Never commit test fixtures that contain secrets, tokens, or environment values.

---

## Special Files

| File | Rule |
|---|---|
| `functions/goldenScenarios.ts` | Additive only — do not remove or modify existing scenarios |
| `functions/safetyGoldenScenarios.ts` | Additive only — do not remove or modify existing safety test cases |
| `test/utils/translations.test.js` | Run this after any i18n change to confirm all 7 languages are covered |

---

## When to Stop and Ask for Approval

Stop immediately and request approval if:
- A proposed test requires adding a new entity or changing an existing schema.
- A proposed test requires modifying the behavior of a safety-critical function.
- A test helper change would cause existing tests to behave differently.
- You are unsure whether a mock accurately reflects live behavior.

---

> See `docs/copilot-task-lanes.md` for the Test / Regression Lane definition (Lane 2).
> See `docs/copilot-task-invocation-guide.md` for how to invoke this lane.
> See `.github/copilot-instructions.md` for the master Copilot instruction set.
