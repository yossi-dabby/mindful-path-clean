/**
 * STAGE 7 — PRODUCTION HARDENING
 * evaluateKnowledgeIndex
 *
 * Admin-only regression evaluation function for the live knowledge retrieval
 * pipeline. Runs a curated test suite directly against the vector index and
 * returns structured pass/fail results.
 *
 * SCOPE: Evaluation only. No writes. No agents. No UI. No user exposure.
 * Only tests the already-approved shared content entities:
 *   Exercise, Resource, JournalTemplate, Psychoeducation
 *
 * AUTH: Admin only.
 *
 * INPUT: {} or { verbose: true } for top result details per test
 *
 * OUTPUT:
 *   {
 *     success: boolean,
 *     summary: { total, passed, failed, pass_rate, total_ms },
 *     results: TestResult[],
 *     provider: string,
 *     index_name: string,
 *     evaluated_at: string,
 *   }
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const ALLOWED_ENTITY_TYPES = ['Exercise', 'Resource', 'JournalTemplate', 'Psychoeducation'];

function getProviderConfig() {
  const provider = Deno.env.get('KNOWLEDGE_PROVIDER');
  const embedding_key = Deno.env.get('KNOWLEDGE_EMBEDDING_KEY');
  const index_key = Deno.env.get('KNOWLEDGE_INDEX_KEY');
  const index_host = Deno.env.get('KNOWLEDGE_INDEX_HOST');
  const index_name = Deno.env.get('KNOWLEDGE_INDEX_NAME') || 'cbt-knowledge';
  if (!provider || !embedding_key || !index_key || !index_host) return null;
  return { provider, embedding_key, index_key, index_host, index_name };
}

async function embedQuery(text, config) {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.embedding_key}` },
    body: JSON.stringify({ model: 'text-embedding-3-small', input: text }),
  });
  if (!res.ok) throw new Error(`OpenAI embedding failed (${res.status})`);
  const data = await res.json();
  return data.data[0].embedding;
}

async function searchIndex(embedding, entity_types, top_k, min_score, config) {
  const res = await fetch(`${config.index_host}/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Api-Key': config.index_key },
    body: JSON.stringify({
      vector: embedding,
      topK: top_k,
      includeMetadata: true,
      filter: { entity_type: { '$in': entity_types }, language: { '$eq': 'en' } },
      namespace: config.index_name,
    }),
  });
  if (!res.ok) throw new Error(`Pinecone query failed (${res.status})`);
  const data = await res.json();
  return (data.matches || []).filter(m => m.score >= min_score);
}

// ─── CURATED TEST SUITE ───────────────────────────────────────────────────────
// Each test defines: query, expected result count range, min_score threshold,
// optional max_top_score (for low-confidence checks), criteria category.
const TEST_SUITE = [
  // Relevance — therapeutic content should surface at moderate thresholds
  {
    id: 'REL-01', criteria: 'relevance',
    description: 'Breathing exercise for anxiety returns Exercise/Resource results',
    query: 'breathing exercise for anxiety and panic',
    expected_min: 1, expected_max: 10, min_score: 0.35,
    entity_types: ['Exercise', 'Resource'],
  },
  {
    id: 'REL-02', criteria: 'relevance',
    description: 'Mindfulness body scan returns relevant results',
    query: 'mindfulness meditation body scan relaxation',
    expected_min: 1, expected_max: 10, min_score: 0.35,
    entity_types: ['Exercise', 'Resource'],
  },
  {
    id: 'REL-03', criteria: 'relevance',
    description: 'Cognitive distortions CBT returns relevant results',
    query: 'cognitive distortion all or nothing thinking CBT',
    expected_min: 1, expected_max: 10, min_score: 0.35,
    entity_types: ['Exercise', 'Resource'],
  },
  {
    id: 'REL-04', criteria: 'relevance',
    description: 'Sleep hygiene insomnia returns relevant content',
    query: 'sleep hygiene insomnia bedtime routine CBT',
    expected_min: 1, expected_max: 10, min_score: 0.35,
    entity_types: ['Exercise', 'Resource'],
  },
  {
    id: 'REL-05', criteria: 'relevance',
    description: 'Behavioral activation scheduling returns relevant content',
    query: 'behavioral activation scheduling activities depression',
    expected_min: 1, expected_max: 10, min_score: 0.35,
    entity_types: ['Exercise', 'Resource'],
  },
  {
    id: 'REL-06', criteria: 'relevance',
    description: 'Thought record evidence-based reframing returns results',
    query: 'thought record evidence for against balanced perspective',
    expected_min: 1, expected_max: 10, min_score: 0.35,
    entity_types: ['Exercise', 'Resource'],
  },
  {
    id: 'REL-07', criteria: 'relevance',
    description: 'Gratitude journaling daily reflection returns results',
    query: 'gratitude journaling daily reflection positive',
    expected_min: 1, expected_max: 10, min_score: 0.30,
    entity_types: ['Exercise', 'Resource', 'JournalTemplate'],
  },
  // Crisis / safety — must return zero results above strict threshold
  {
    id: 'SAFE-01', criteria: 'crisis_exclusion',
    description: 'Suicidal ideation returns 0 results above 0.90 threshold',
    query: 'I want to kill myself end my life',
    expected_min: 0, expected_max: 0, min_score: 0.90,
    entity_types: [...ALLOWED_ENTITY_TYPES],
  },
  {
    id: 'SAFE-02', criteria: 'crisis_exclusion',
    description: 'Self-harm query returns 0 results above 0.90 threshold',
    query: 'I want to hurt myself cut myself',
    expected_min: 0, expected_max: 0, min_score: 0.90,
    entity_types: [...ALLOWED_ENTITY_TYPES],
  },
  // Medical / diagnostic exclusion — must return zero above strict threshold
  {
    id: 'MED-01', criteria: 'medical_exclusion',
    description: 'Medication prescription query returns 0 results above 0.85',
    query: 'prescribe me antidepressants medication SSRI dosage',
    expected_min: 0, expected_max: 0, min_score: 0.85,
    entity_types: [...ALLOWED_ENTITY_TYPES],
  },
  {
    id: 'MED-02', criteria: 'medical_exclusion',
    description: 'Diagnosis query returns 0 results above 0.85',
    query: 'diagnose me bipolar disorder borderline personality',
    expected_min: 0, expected_max: 0, min_score: 0.85,
    entity_types: [...ALLOWED_ENTITY_TYPES],
  },
  // No-result / noise — random strings must not return high-confidence matches
  {
    id: 'NOISE-01', criteria: 'no_result',
    description: 'Random noise query returns 0 results above 0.80',
    query: 'xyzqnonexistentcontent12345abc',
    expected_min: 0, expected_max: 0, min_score: 0.80,
    entity_types: [...ALLOWED_ENTITY_TYPES],
  },
  // Low confidence — vague query must not produce hallucinated high-confidence matches
  {
    id: 'CONF-01', criteria: 'low_confidence',
    description: 'Vague query top_score must be below 0.90 (no false-confidence hallucination)',
    query: 'something feels off lately',
    expected_min: 0, expected_max: 10, min_score: 0.0, max_top_score: 0.89,
    entity_types: [...ALLOWED_ENTITY_TYPES],
  },
];

// ─── HANDLER ──────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const verbose = body?.verbose === true;

    const config = getProviderConfig();
    if (!config) {
      return Response.json({
        error: 'Provider not configured. Check KNOWLEDGE_PROVIDER, KNOWLEDGE_EMBEDDING_KEY, KNOWLEDGE_INDEX_KEY, KNOWLEDGE_INDEX_HOST.',
      }, { status: 500 });
    }

    const results = [];
    let passed = 0;
    let failed = 0;
    const t_suite = Date.now();

    for (const test of TEST_SUITE) {
      const t0 = Date.now();
      let status = 'pass';
      let failure_reason = null;
      let matches = [];
      let top_score = null;

      try {
        const embedding = await embedQuery(test.query, config);
        matches = await searchIndex(embedding, test.entity_types, 10, test.min_score, config);
        top_score = matches.length > 0 ? matches[0].score : null;

        // Count range check
        if (matches.length < test.expected_min) {
          status = 'fail';
          failure_reason = `Expected >= ${test.expected_min} results at min_score=${test.min_score}, got ${matches.length}`;
        } else if (matches.length > test.expected_max) {
          status = 'fail';
          failure_reason = `Expected <= ${test.expected_max} results at min_score=${test.min_score}, got ${matches.length}`;
        }

        // Max top score check (for low-confidence tests)
        if (status === 'pass' && test.max_top_score !== undefined && top_score !== null && top_score > test.max_top_score) {
          status = 'fail';
          failure_reason = `Expected top_score <= ${test.max_top_score}, got ${top_score.toFixed(4)}`;
        }
      } catch (err) {
        status = 'error';
        failure_reason = `Execution error: ${err.message}`;
      }

      if (status === 'pass') passed++;
      else failed++;

      const result = {
        id: test.id,
        criteria: test.criteria,
        description: test.description,
        status,
        result_count: matches.length,
        top_score: top_score !== null ? parseFloat(top_score.toFixed(4)) : null,
        min_score_threshold: test.min_score,
        expected_range: `[${test.expected_min}, ${test.expected_max}]`,
        ms: Date.now() - t0,
      };
      if (failure_reason) result.failure_reason = failure_reason;
      if (verbose && matches.length > 0) {
        result.top_results = matches.slice(0, 3).map(m => ({
          title: m.metadata?.title || '',
          entity_type: m.metadata?.entity_type || '',
          score: parseFloat((m.score || 0).toFixed(4)),
        }));
      }
      results.push(result);
    }

    const summary = {
      total: TEST_SUITE.length,
      passed,
      failed,
      pass_rate: `${Math.round((passed / TEST_SUITE.length) * 100)}%`,
      total_ms: Date.now() - t_suite,
    };

    console.log(`[KB:EVAL] total=${summary.total} passed=${passed} failed=${failed} pass_rate=${summary.pass_rate} ms=${summary.total_ms}`);
    if (failed > 0) {
      const failedIds = results.filter(r => r.status !== 'pass').map(r => r.id).join(',');
      console.error(`[KB:EVAL:FAILURES] failed_tests=${failedIds}`);
    }

    return Response.json({
      success: failed === 0,
      summary,
      results,
      provider: config.provider,
      index_name: config.index_name,
      evaluated_at: new Date().toISOString(),
    });

  } catch (error) {
    console.error(`[KB:EVAL:ERROR] ${error.message}`);
    return Response.json({ error: error.message }, { status: 500 });
  }
});