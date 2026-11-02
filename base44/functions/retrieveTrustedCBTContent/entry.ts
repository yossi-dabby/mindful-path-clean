/**
 * retrieveTrustedCBTContent
 *
 * Retrieves the most relevant TrustedCBTChunk records for the CBT therapist agent.
 *
 * INPUT:
 *   { userMessage, language, topicHint?, emotionalState?, maxResults? }
 *
 * Language is required. Missing or unsupported language returns zero results;
 * the function never falls back silently to English.
 *
 * OUTPUT:
 *   { results: TrustedCBTChunk[], total_results, mode }
 *
 * RETRIEVAL LOGIC (v1 — deterministic, no vector search):
 *   1. Filter: is_active = true only
 *   2. Score by keyword overlap (userMessage + topicHint + emotionalState vs tags/topic/subtopic)
 *   3. Tiebreak by priority_score descending
 *   4. Return up to maxResults items
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const DEFAULT_MAX = 5;
const MAX_LIMIT = 10;
const SUPPORTED_LANGUAGES = new Set(['en', 'he', 'es', 'fr', 'de', 'it', 'pt']);

function normalizeLanguage(value) {
  if (!value || typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase().replace('_', '-').split('-')[0];
  return SUPPORTED_LANGUAGES.has(normalized) ? normalized : null;
}

/**
 * Tokenize a string into lowercase words, stripping punctuation.
 */
function tokenize(str) {
  if (!str || typeof str !== 'string') return [];
  return str.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean);
}

/**
 * Count how many query tokens appear in the candidate token set.
 */
function overlapScore(queryTokens, candidateStr) {
  if (!candidateStr) return 0;
  const candidateTokens = new Set(tokenize(candidateStr));
  return queryTokens.filter(t => candidateTokens.has(t)).length;
}

/**
 * Score a single chunk against the combined query.
 * Tags get 2x weight since they're the most precise signal.
 */
function scoreChunk(chunk, queryTokens) {
  if (!queryTokens.length) return chunk.priority_score || 0;

  const tagsStr = Array.isArray(chunk.tags) ? chunk.tags.join(' ') : '';
  const tagScore = overlapScore(queryTokens, tagsStr) * 2;
  const topicScore = overlapScore(queryTokens, chunk.topic);
  const subtopicScore = overlapScore(queryTokens, chunk.subtopic);
  const titleScore = overlapScore(queryTokens, chunk.title);

  const keywordScore = tagScore + topicScore + subtopicScore + titleScore;
  const priority = typeof chunk.priority_score === 'number' ? chunk.priority_score : 5;

  // Blend: keyword overlap dominates, priority as tiebreaker
  return keywordScore * 10 + priority;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      userMessage = '',
      topicHint = '',
      emotionalState = '',
      maxResults,
      language,
      locale,
    } = body;

    const requestedLanguage = normalizeLanguage(language || locale);
    if (!requestedLanguage) {
      return Response.json({
        results: [],
        total_results: 0,
        mode: 'keyword',
        reason: 'missing_or_unsupported_language',
      });
    }

    const effectiveMax = Math.min(MAX_LIMIT, Math.max(1, Number(maxResults) || DEFAULT_MAX));

    // Build combined query string from all inputs
    const combinedQuery = [userMessage, topicHint, emotionalState].join(' ');
    const queryTokens = tokenize(combinedQuery);

    // Fetch all active chunks (service role for read access)
    const allChunks = await base44.asServiceRole.entities.TrustedCBTChunk.filter({
      is_active: true,
      language: requestedLanguage,
    });

    if (!allChunks || allChunks.length === 0) {
      return Response.json({
        results: [],
        total_results: 0,
        mode: 'keyword',
        language: requestedLanguage,
      });
    }

    // Score and sort
    const scored = allChunks
      .map(chunk => ({ chunk, score: scoreChunk(chunk, queryTokens) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, effectiveMax)
      .map(({ chunk }) => chunk);

    console.log(`[TrustedCBT:RETRIEVE] language=${requestedLanguage} query_tokens=${queryTokens.length} active_chunks=${allChunks.length} returned=${scored.length}`);

    return Response.json({
      results: scored,
      total_results: scored.length,
      mode: 'keyword',
      language: requestedLanguage,
    });

  } catch (error) {
    console.error(`[TrustedCBT:RETRIEVE:ERROR] ${error.message}`);
    return Response.json({ error: error.message }, { status: 500 });
  }
});