# Stage 0 validation record

🟢 Documentation and planning data only. Baseline main commit: f698e7bc47bef5329d2bfe066f48a311549c40f6. The local starting tree matched remote main tree 3726ccd06c72bfde15a1e861747e105cc3ab8034.

| Check | Result on 2026-11-04 |
| --- | --- |
| Stage 0 deterministic audit | Passed: 289 existing PDF sizes/hashes, 135 expansion HTML hashes and review records, 970 unique inventory IDs, 96 packages, 360 age/unit rows, source/model/role references and batch totals. |
| Existing runtime loader | Passed: loadPilot loaded all 289 assets and five pinned catalogs. |
| Shared catalog validation | Passed: current P4B catalog accepted; unpinned synthetic version rejected. |
| Documentation links | All relative Markdown targets exist. |
| npm run lint | Passed, exit 0. |
| npm test | Passed, 354 test files and 11,074 tests. |
| npm run build | Passed, exit 0. Existing local environment warnings: Base44 app ID/base URL are unset and Browserslist data is old. This is a compilation check, not a functional production build/deployment verification. |
| Full browser E2E | Not run locally for this documentation-only change. Repository CI/human review still apply before merge. |
| Live sandbox/public site | Not exercised in Stage 0; latest live verification was reported by the project owner before this task. |
| Clinical/manual/age/rights sign-off | Not supplied. The corresponding decisions remain open and the inventory is not frozen. |

Reproduce the planning-data audit with `python docs/hebrew-series-stage0/audit.py` from the repository root. It reads files only and compares its result with technical-audit.json. No test assertions, runtime modules, forms, release pins or deployment settings were changed.

The capacity estimate uses synthetic metadata in memory, not real uncreated PDFs. Its pass result cannot prove future content quality, catalog size after editorial changes, browser usability, production networking, clinical completeness or permission to distribute a source.

Last updated: 2026-11-04.
