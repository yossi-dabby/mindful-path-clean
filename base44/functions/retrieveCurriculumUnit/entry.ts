import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * retrieveCurriculumUnit
 *
 * Retrieves active CBTCurriculumUnit records matching a clinical query.
 * Used by cbt_therapist to load structured clinical guidance during live sessions.
 *
 * INPUT (JSON body)
 * -----------------
 * {
 *   unit_type?:              string   — filter by unit_type (e.g. "intervention", "phrasing_pattern")
 *   clinical_topic?:         string   — filter by clinical_topic (e.g. "avoidance", "flooding")
 *   linked_hierarchy_level?: string   — filter by L2–L10 or "any"
 *   linked_outcome_pattern?: string   — filter by outcome pattern name or "any"
 *   language?:               string   — "en" | "he" | "es" | "fr" | "de" | "it" | "pt"
 *   limit?:                  number   — max records to return (default 3, max 8)
 * }
 *
 * OUTPUT (always HTTP 200)
 * ------
 * {
 *   units:  CBTCurriculumUnit[],   — matched units, sorted by priority_score desc
 *   count:  number,
 *   query:  object,                — echo of filters used
 *   error?: string                 — present only on fetch failure
 * }
 *
 * FAIL-OPEN: any error returns { units: [], count: 0, ... } — never blocks agent.
 */

const MAX_LIMIT = 20;
const DEFAULT_LIMIT = 3;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Auth — agent calls are authenticated via session token
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ units: [], count: 0, query: {}, error: 'Unauthorized' });
    }

    // Parse input
    let input = {};
    try {
      input = await req.json();
    } catch (_) {
      // Empty body is fine — returns all active units up to limit
    }

    const {
      unit_type,
      clinical_topic,
      planner_domain,
      linked_hierarchy_level,
      linked_outcome_pattern,
      language,
      limit: rawLimit
    } = input;

    const limit = Math.min(
      typeof rawLimit === 'number' && rawLimit > 0 ? rawLimit : DEFAULT_LIMIT,
      MAX_LIMIT
    );

    // Build filter — always include is_active: true
    const filter = { is_active: true };
    if (unit_type) filter.unit_type = unit_type;
    if (clinical_topic) filter.clinical_topic = clinical_topic;
    if (planner_domain) filter.planner_domain = planner_domain;

    // Fetch broader set then filter in-memory for array fields and language
    // (Base44 entity filter does not support array-contains natively)
    let raw = [];
    try {
      raw = await base44.asServiceRole.entities.CBTCurriculumUnit.filter(
        filter,
        '-priority_score',
        50 // fetch generously, filter down
      );
    } catch (fetchError) {
      const msg = fetchError instanceof Error ? fetchError.message : String(fetchError);
      console.warn('[retrieveCurriculumUnit] Fetch failed:', msg);
      return Response.json({ units: [], count: 0, query: input, error: msg });
    }

    // In-memory filters for array fields
    let units = raw;

    // Filter by linked_hierarchy_level
    if (linked_hierarchy_level && linked_hierarchy_level !== 'any') {
      units = units.filter(u =>
        !u.linked_hierarchy_level ||
        u.linked_hierarchy_level === 'any' ||
        u.linked_hierarchy_level === linked_hierarchy_level
      );
    }

    // Filter by linked_outcome_pattern
    if (linked_outcome_pattern && linked_outcome_pattern !== 'any') {
      units = units.filter(u => {
        if (!u.linked_outcome_patterns || u.linked_outcome_patterns.length === 0) return true;
        return u.linked_outcome_patterns.includes('any') ||
               u.linked_outcome_patterns.includes(linked_outcome_pattern);
      });
    }

    // Filter by language — include units marked 'all' and units matching the requested language
    if (language) {
      units = units.filter(u => {
        if (!u.languages || u.languages.length === 0) return true;
        return u.languages.includes('all') || u.languages.includes(language);
      });
    }

    // Re-sort by priority_score descending (already sorted, but re-apply after filtering)
    units.sort((a, b) => (b.priority_score || 5) - (a.priority_score || 5));

    // Trim to limit
    units = units.slice(0, limit);

    // Strip admin_notes before returning — never expose to agent
    units = units.map(u => {
      const { admin_notes, source_chunk_ids, ...safe } = u;
      return safe;
    });

    return Response.json({
      units,
      count: units.length,
      query: { unit_type, clinical_topic, planner_domain, linked_hierarchy_level, linked_outcome_pattern, language, limit }
    });

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[retrieveCurriculumUnit] Unexpected error:', msg);
    return Response.json({ units: [], count: 0, query: {}, error: msg });
  }
});
