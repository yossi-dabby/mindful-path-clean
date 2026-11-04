# P3 browsing and removal of obsolete forms-page blocks

The companion content/backend PR adds 54 private draft PDFs and a pinned 217-file
release. This UI change selects that release, exposes SELF/PERF/REG/EXEC/SOC and
MOOD-02 only when their verified records are present, and removes the two blocks
identified in the owner's screenshot: the amber maintenance notice and the static
planned-library diagram. The administrator's draft-review notice is preserved.

For a regular user or a language other than Hebrew, the unavailable public catalog
now shows a short localized empty state and the existing chat link. It does not
show the administrator pilot or request its API. Removing obsolete presentation
does not activate public/AI forms, alter the global content status or widen access.

## Publication compatibility

The client tries `catalog-p3-01` (217), `catalog-mood-01` (163), then `catalog`
(154). Only an explicit unsupported endpoint (400/404) permits the next request.
Each response must match its own pinned digest before any card appears. A malformed
or substituted catalog, auth error, network error or 5xx stops the sequence. If an
older release is in use, a localized status explains that additional forms await
the update; unavailable tracks/units are hidden. No caller-selected server, token
fallback or extra credential access is added.

## Acceptance coverage

The dedicated suite exercises all 54 new PDFs on desktop and mobile: each of the
48 age-specific W/P variants opens as one real PDF.js page and downloads with its
exact filename, length and SHA-256; all six guides open four pages and download
unchanged. Age/unit selection and keyboard focus survive Back. The suite retains
the original 32 scenarios, adds 163-file rollout fallback in addition to the
154-file case, and checks that obsolete blocks are absent while the review notice
remains. Total: 98 scenarios across both viewports.

The existing public-library tests now require zero obsolete architecture nodes,
an empty state in all seven languages/light and dark themes, no PDF links, an empty
public/AI registry, no horizontal overflow and the existing chat route. Their old
positive assertions for four/two placeholder cards are intentionally replaced
because the owner explicitly requested deletion of those cards; no access or
navigation assertion is relaxed. English and Spanish still check localized copy.

All five new labels and the generalized rollout message are supplied in seven
languages. No route, app shell, global scroll container or agent behavior changes.
See `hebrew-forms-p3-01-implementation.md` for merge order and live acceptance.
