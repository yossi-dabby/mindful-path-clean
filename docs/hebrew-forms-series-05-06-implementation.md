# Hebrew continuation series — batches 5 and 6

Adds 180 original blank draft PDFs in 20 units, with 240 pages and 800 distinct age-specific prompts. The deployment advances the app from 640 to 820 forms. Batch 5 completes FAMILY-02–06 and SCREEN-02–06; batch 6 completes SHAME-02–06 and MEANING-02–06. Both versioned catalogs remain available to support staggered frontend/backend publication.

| Batch | Version | Count | New PDF bytes | Compact catalog bytes | Canonical SHA-256 |
| --- | --- | ---: | ---: | ---: | --- |
| 5 | `0.11-series-05` | 730 | 2,238,212 | 342,125 | `773c342232fb7a58f26da2fd6046f8296cc0b41c1dbd758dc5de4e9ea05866b7` |
| 6 | `0.12-series-06` | 820 | 2,218,173 | 383,667 | `c465f21602d142ea0b96105f71275a68a3a5260f0da2dc6d6dad3c896dc1740e` |

## Content and provenance

See [batch 5 source](../content/hebrew-forms/series-05/README.md) and [batch 6 source](../content/hebrew-forms/series-06/README.md). Each unit has a four-page shared guide and W/P sheets for CH, TE, AD and OA. Guides contain purpose, limits, reuse references, fictional examples, discussion prompts, anticipated difficulties, age/companion adaptations, practice and reflection.

FAMILY supports voluntary communication and shared agreements without making children responsible for adult conflict, requiring reconciliation or overriding safety. SCREEN supports chosen changes to digital habits; it does not collect passwords, messages, browsing history or location, prescribe a universal time limit, or introduce hidden monitoring.

SHAME supports respectful reflection, realistic responsibility and optional support; it does not demand confession, repeated reassurance, compensation, disclosure or trauma processing. MEANING explores freely chosen values, resources and feasible actions; it does not impose faith, positive meaning, a purpose for suffering, or a full ACT protocol.

All professional review dates/names remain null and approval flags remain false. The unchanged warning, terms and draft labels continue to apply. Technical tests, merging, publication and the owner's execution authorization do not constitute professional or rights approval.

## Compatibility and validation

- All nine historical catalogs, pins and 640 existing PDFs remain unchanged. New catalogs append 90 records each.
- Client order is series-06 → series-05 → series-04 → older pinned releases. Only unsupported 400/404 responses permit fallback; authorization, server, network and integrity errors stop the request.
- Startup verifies all 11 catalogs and 820 PDF hashes; the unchanged 512 KiB catalog bound accommodates the 383,667-byte latest catalog. The PDF transport size bound is unchanged.
- Exact Stage 0 membership, independent age prompts, metadata, hashes, page count and blank HTML fields are covered by source/provenance tests.
- All 180 PDFs passed structural/layout checks and 240 rendered pages were visually reviewed. All 160 W/P sheets passed short-answer fit and long-answer print blocking/export preservation.
- Browser coverage adds all new age variants/guides, byte-exact downloads, back/focus behavior and 400/404 fallbacks to both 730 and 640. Historical fallbacks, authorization and corruption rejection remain covered.
- CI job deadlines rise from 20 to 30 minutes to accommodate 180 additional render checks and 104 additional browser cases per project; individual test timeouts and assertions are unchanged. Common checks still run once under the prior CI optimization.

App administrator authorization and private/no-store responses remain intact. The public repository exposes committed blank source/PDF files; app access rules do not make public GitHub files private. No patient responses are added.

## Deployment record

At implementation time: merge, Railway rollout, Base44 sync/function redeployment/publication and authenticated live verification are pending. The associated PR records their final results. Verify version `0.12-series-06`, 820 forms, six units in each of FAMILY/SCREEN/SHAME/MEANING, new W/P files and a four-page guide, byte/hash integrity, and back navigation. Local fixture tests do not establish live Base44/Railway transport behavior.

Rollback uses the previous application release while retaining all pinned catalogs and PDFs. Do not weaken hash checks or remove assets. The remaining [150 specialist PDFs](hebrew-series-specialist-readiness.md) are not generated or represented as clinically reviewed in this release.
