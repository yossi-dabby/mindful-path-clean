/**
 * @file src/lib/trustedCBTChunkImporter.js
 *
 * TrustedCBTChunk Seed / Import Utility
 *
 * PURPOSE
 * -------
 * Provides a utility for loading and importing the pre-authored
 * TrustedCBTChunk batch from src/data/trusted-cbt-batch-1.json into the
 * ExternalKnowledgeChunk entity storage surface via the persistence adapter
 * (externalKnowledgePersistence.js).
 *
 * This utility is a passive, pure helper — it validates each record before
 * import and reports per-record outcomes. It does NOT alter auth, routing,
 * or public chat flows.
 *
 * USAGE CONTEXT
 * -------------
 * Call importTrustedCBTBatch() from a one-time setup script or a gated
 * admin action. The caller must:
 *   1. Confirm the THERAPIST_UPGRADE_TRUSTED_INGESTION_ENABLED flag is active.
 *   2. Supply a real entity client (e.g. KnowledgeInfrastructure.ExternalKnowledgeChunk
 *      from src/api/entities/index.js) or a mock for testing.
 *
 * FAILURE HANDLING
 * ----------------
 * Validation failures are collected and returned — they do NOT throw.
 * Persistence failures from the adapter are also collected.
 * The importer always returns a structured result even on partial failure.
 *
 * ISOLATION GUARANTEE
 * -------------------
 * This module does NOT connect to the current therapist runtime, agent wiring,
 * or any retrieval pipeline. It is an offline seed utility only.
 *
 * What this module must NOT do:
 * - Connect to the therapist runtime or agent wiring
 * - Modify any existing entity schemas
 * - Automatically run at app startup
 */

import { validateTrustedCBTChunkBatch } from './trustedCBTChunk.js';

// ─── Batch data loader ────────────────────────────────────────────────────────

/**
 * Returns the pre-authored TrustedCBTChunk records from the inline batch constant.
 *
 * The records mirror src/data/trusted-cbt-batch-1.json. The data is kept as an
 * inline constant (see TRUSTED_CBT_BATCH below) rather than a live JSON import
 * to ensure compatibility across Vite browser builds and Node/Vitest environments.
 *
 * @returns {object[]}
 */
export function loadTrustedCBTBatch() {
  return TRUSTED_CBT_BATCH;
}

// ─── Import orchestrator ──────────────────────────────────────────────────────

/**
 * Validates and imports all records from the trusted-cbt-batch-1.json into
 * the ExternalKnowledgeChunk entity storage surface.
 *
 * Steps:
 * 1. Load the batch records.
 * 2. Validate every record using validateTrustedCBTChunkBatch().
 * 3. Skip records that fail validation and collect errors.
 * 4. For valid records, call entityClient.create() for each.
 * 5. Return a structured ImportResult.
 *
 * The caller is responsible for supplying a real or mock entity client.
 * The importer does NOT check feature flags — the caller must do so.
 *
 * @param {{ create: (record: object) => Promise<object> }} entityClient
 *   A Base44 entity client that exposes a `create(record)` method.
 *   In tests, pass a mock that records calls.
 *
 * @returns {Promise<ImportResult>}
 */
export async function importTrustedCBTBatch(entityClient) {
  if (!entityClient || typeof entityClient.create !== 'function') {
    return {
      success: false,
      error: 'entityClient must expose a create(record) method',
      attempted: 0,
      imported: 0,
      skipped: 0,
      validationErrors: [],
      persistenceErrors: [],
    };
  }

  const records = loadTrustedCBTBatch();
  const validationResults = validateTrustedCBTChunkBatch(records);

  const validationErrors = [];
  const persistenceErrors = [];
  let imported = 0;
  let skipped = 0;

  for (const { index, chunk_id, result } of validationResults) {
    if (!result.valid) {
      validationErrors.push({
        index,
        chunk_id,
        missing: result.missing ?? [],
        invalid: result.invalid ?? [],
      });
      skipped++;
      continue;
    }

    try {
      await entityClient.create(records[index]);
      imported++;
    } catch (err) {
      persistenceErrors.push({
        index,
        chunk_id,
        error: err?.message ?? String(err),
      });
      skipped++;
    }
  }

  return {
    success: validationErrors.length === 0 && persistenceErrors.length === 0,
    attempted: records.length,
    imported,
    skipped,
    validationErrors,
    persistenceErrors,
  };
}

/**
 * @typedef {object} ImportResult
 * @property {boolean} success              - True when all records imported without errors.
 * @property {string}  [error]              - Top-level error message (entity client missing).
 * @property {number}  attempted            - Total number of records in the batch.
 * @property {number}  imported             - Number of records successfully persisted.
 * @property {number}  skipped              - Number of records skipped (validation or persistence error).
 * @property {Array}   validationErrors     - Per-record validation failure details.
 * @property {Array}   persistenceErrors    - Per-record persistence failure details.
 */

// ─── Inline batch data ────────────────────────────────────────────────────────
//
// The batch is intentionally inlined here as a JS constant rather than imported
// from trusted-cbt-batch-1.json. This ensures the importer works in both
// Vite-bundled browser builds and in Node/Vitest test environments without
// relying on JSON import assertions, which behave differently across runtimes
// and bundler configurations.
//
// src/data/trusted-cbt-batch-1.json is the canonical human-readable source of
// truth for the batch content. TRUSTED_CBT_BATCH below must remain a faithful
// copy of that file. If records are added or modified, update both files.
//
// If the batch grows beyond 50 records, consider switching to a dynamic
// import() with an assert { type: 'json' } assertion once that syntax is
// stable across all target runtimes.

/** @type {object[]} */
const TRUSTED_CBT_BATCH = [
  {
    chunk_id: 'trusted-cbt::who-mhgap-ig-v2::chunk_0',
    source_id: 'who-mhgap-ig-v2',
    external_source_record_id: null,
    source_url: 'https://www.who.int/publications/i/item/9789241549790',
    source_title: 'WHO mhGAP Intervention Guide v2.0',
    publisher: 'World Health Organization',
    domain: 'who.int',
    retrieval_date: '2026-03-01T00:00:00.000Z',
    chunk_index: 0,
    total_chunks: 4,
    chunk_text: 'Cognitive behavioural therapy (CBT) is a structured, time-limited psychotherapy that focuses on the links between thoughts, feelings and behaviours. In CBT the patient and clinician work collaboratively to identify unhelpful thinking patterns and behavioural responses, and to develop more adaptive coping strategies. Core techniques include: psychoeducation about the CBT model, thought monitoring using thought records, cognitive restructuring to challenge automatic negative thoughts, and behavioural experiments to test beliefs in real-world situations.',
    character_count: 549,
    content_source_type: 'external_trusted',
    entity_type: 'TrustedCBTChunk',
    language: 'en',
    version: 1,
    metadata: {},
    cbt_topic: 'cognitive_restructuring',
    technique: 'thought records',
    evidence_level: 'high',
  },
  {
    chunk_id: 'trusted-cbt::who-mhgap-ig-v2::chunk_1',
    source_id: 'who-mhgap-ig-v2',
    external_source_record_id: null,
    source_url: 'https://www.who.int/publications/i/item/9789241549790',
    source_title: 'WHO mhGAP Intervention Guide v2.0',
    publisher: 'World Health Organization',
    domain: 'who.int',
    retrieval_date: '2026-03-01T00:00:00.000Z',
    chunk_index: 1,
    total_chunks: 4,
    chunk_text: 'Behavioural activation (BA) is a first-line intervention for depression recommended in the WHO mhGAP guide. The rationale is that depression is maintained by avoidance and inactivity, which reduce opportunities for positive reinforcement. BA involves: collaboratively scheduling pleasant and rewarding activities, monitoring mood in relation to activity, and gradually increasing engagement with meaningful and goal-directed behaviours. Patients are encouraged to act against the urge to withdraw, even when motivation is low.',
    character_count: 523,
    content_source_type: 'external_trusted',
    entity_type: 'TrustedCBTChunk',
    language: 'en',
    version: 1,
    metadata: {},
    cbt_topic: 'behavioral_activation',
    technique: 'activity scheduling',
    evidence_level: 'high',
  },
  {
    chunk_id: 'trusted-cbt::who-mhgap-ig-v2::chunk_2',
    source_id: 'who-mhgap-ig-v2',
    external_source_record_id: null,
    source_url: 'https://www.who.int/publications/i/item/9789241549790',
    source_title: 'WHO mhGAP Intervention Guide v2.0',
    publisher: 'World Health Organization',
    domain: 'who.int',
    retrieval_date: '2026-03-01T00:00:00.000Z',
    chunk_index: 2,
    total_chunks: 4,
    chunk_text: 'Problem-solving therapy (PST) is a brief structured intervention that helps individuals apply systematic problem-solving skills to stressors that contribute to emotional distress. The steps are: (1) define the problem clearly, (2) generate multiple possible solutions through brainstorming, (3) evaluate each solution\'s pros and cons, (4) choose the best solution and make an action plan, (5) carry out the plan, and (6) review the outcome. PST is effective for depression and can be delivered in as few as six sessions.',
    character_count: 521,
    content_source_type: 'external_trusted',
    entity_type: 'TrustedCBTChunk',
    language: 'en',
    version: 1,
    metadata: {},
    cbt_topic: 'problem_solving',
    technique: 'problem-solving therapy',
    evidence_level: 'high',
  },
  {
    chunk_id: 'trusted-cbt::who-mhgap-ig-v2::chunk_3',
    source_id: 'who-mhgap-ig-v2',
    external_source_record_id: null,
    source_url: 'https://www.who.int/publications/i/item/9789241549790',
    source_title: 'WHO mhGAP Intervention Guide v2.0',
    publisher: 'World Health Organization',
    domain: 'who.int',
    retrieval_date: '2026-03-01T00:00:00.000Z',
    chunk_index: 3,
    total_chunks: 4,
    chunk_text: 'Psychoeducation is an integral component of every CBT intervention. It involves providing the patient and, where appropriate, family members with clear, accessible information about: the nature of the mental health condition, the CBT model of how thoughts, feelings, and behaviours interact, the rationale for therapy techniques, and realistic expectations about the recovery process. Psychoeducation reduces stigma, increases engagement, and builds the foundation for active collaborative treatment.',
    character_count: 495,
    content_source_type: 'external_trusted',
    entity_type: 'TrustedCBTChunk',
    language: 'en',
    version: 1,
    metadata: {},
    cbt_topic: 'psychoeducation',
    technique: 'psychoeducation',
    evidence_level: 'high',
  },
  {
    chunk_id: 'trusted-cbt::nice-depression-ng222::chunk_0',
    source_id: 'nice-depression-ng222',
    external_source_record_id: null,
    source_url: 'https://www.nice.org.uk/guidance/ng222',
    source_title: 'NICE Depression in adults: treatment and management',
    publisher: 'National Institute for Health and Care Excellence',
    domain: 'nice.org.uk',
    retrieval_date: '2026-03-01T00:00:00.000Z',
    chunk_index: 0,
    total_chunks: 3,
    chunk_text: 'NICE guideline NG222 recommends cognitive behavioural therapy (CBT) as a first-line psychological treatment for depression in adults. Individual CBT should typically consist of 16 to 20 sessions over 3 to 4 months. A course of CBT should include: assessment and formulation, psychoeducation about depression and the CBT model, identification and challenging of negative automatic thoughts, behavioural activation, relapse prevention planning, and regular review of progress using validated outcome measures such as the PHQ-9.',
    character_count: 525,
    content_source_type: 'external_trusted',
    entity_type: 'TrustedCBTChunk',
    language: 'en',
    version: 1,
    metadata: {},
    cbt_topic: 'assessment',
    technique: 'cognitive behavioural therapy',
    evidence_level: 'high',
  },
  {
    chunk_id: 'trusted-cbt::nice-depression-ng222::chunk_1',
    source_id: 'nice-depression-ng222',
    external_source_record_id: null,
    source_url: 'https://www.nice.org.uk/guidance/ng222',
    source_title: 'NICE Depression in adults: treatment and management',
    publisher: 'National Institute for Health and Care Excellence',
    domain: 'nice.org.uk',
    retrieval_date: '2026-03-01T00:00:00.000Z',
    chunk_index: 1,
    total_chunks: 3,
    chunk_text: 'Relapse prevention is a critical phase of CBT for depression. NICE recommends that the final sessions of a CBT course should explicitly address relapse prevention by: identifying personal warning signs of deterioration, reviewing the coping strategies that have been most helpful, creating a written relapse prevention plan, and discussing when and how to seek help if symptoms return. Patients who have had three or more depressive episodes should be offered mindfulness-based cognitive therapy (MBCT) to reduce the risk of further relapse.',
    character_count: 535,
    content_source_type: 'external_trusted',
    entity_type: 'TrustedCBTChunk',
    language: 'en',
    version: 1,
    metadata: {},
    cbt_topic: 'cognitive_restructuring',
    technique: 'relapse prevention planning',
    evidence_level: 'high',
  },
  {
    chunk_id: 'trusted-cbt::nice-depression-ng222::chunk_2',
    source_id: 'nice-depression-ng222',
    external_source_record_id: null,
    source_url: 'https://www.nice.org.uk/guidance/ng222',
    source_title: 'NICE Depression in adults: treatment and management',
    publisher: 'National Institute for Health and Care Excellence',
    domain: 'nice.org.uk',
    retrieval_date: '2026-03-01T00:00:00.000Z',
    chunk_index: 2,
    total_chunks: 3,
    chunk_text: 'Mindfulness-based cognitive therapy (MBCT) integrates mindfulness practices with core CBT techniques. It teaches patients to observe thoughts and feelings non-judgementally rather than engaging in ruminative processing. Key mindfulness exercises include: the body scan, mindful breathing, the three-minute breathing space, and mindful movement. NICE NG222 specifically recommends MBCT for adults with recurrent depression who are currently in remission.',
    character_count: 449,
    content_source_type: 'external_trusted',
    entity_type: 'TrustedCBTChunk',
    language: 'en',
    version: 1,
    metadata: {},
    cbt_topic: 'mindfulness',
    technique: 'mindfulness-based cognitive therapy',
    evidence_level: 'high',
  },
  {
    chunk_id: 'trusted-cbt::samhsa-tip57::chunk_0',
    source_id: 'samhsa-tip57',
    external_source_record_id: null,
    source_url: 'https://store.samhsa.gov/product/tip-57-trauma-informed-care-behavioral-health-services/PEP14-02-00-002',
    source_title: 'SAMHSA TIP 57 Trauma-Informed Care in Behavioral Health Services',
    publisher: 'Substance Abuse and Mental Health Services Administration',
    domain: 'store.samhsa.gov',
    retrieval_date: '2026-03-01T00:00:00.000Z',
    chunk_index: 0,
    total_chunks: 2,
    chunk_text: 'Trauma-informed CBT (TF-CBT) adapts standard cognitive behavioural techniques to address the specific needs of trauma survivors. Core components include: trauma psychoeducation, relaxation skills training, affective modulation, cognitive coping, trauma narrative development and processing, in-vivo mastery of trauma reminders, conjoint parent-child sessions (where applicable), and enhancing safety and future development. TF-CBT is among the most evidence-based treatments for post-traumatic stress disorder across the lifespan.',
    character_count: 526,
    content_source_type: 'external_trusted',
    entity_type: 'TrustedCBTChunk',
    language: 'en',
    version: 1,
    metadata: {},
    cbt_topic: 'trauma_informed',
    technique: 'trauma-focused CBT',
    evidence_level: 'high',
  },
  {
    chunk_id: 'trusted-cbt::samhsa-tip57::chunk_1',
    source_id: 'samhsa-tip57',
    external_source_record_id: null,
    source_url: 'https://store.samhsa.gov/product/tip-57-trauma-informed-care-behavioral-health-services/PEP14-02-00-002',
    source_title: 'SAMHSA TIP 57 Trauma-Informed Care in Behavioral Health Services',
    publisher: 'Substance Abuse and Mental Health Services Administration',
    domain: 'store.samhsa.gov',
    retrieval_date: '2026-03-01T00:00:00.000Z',
    chunk_index: 1,
    total_chunks: 2,
    chunk_text: 'Relaxation techniques are foundational self-regulation skills taught in trauma-informed CBT. SAMHSA TIP 57 highlights three core techniques: (1) Diaphragmatic breathing — slow, controlled abdominal breathing to activate the parasympathetic nervous system and reduce arousal; (2) Progressive muscle relaxation (PMR) — systematically tensing and releasing major muscle groups to reduce physical tension; (3) Safe-place visualisation — guided imagery in which the patient imagines a personally meaningful calm and safe environment. These skills are practised repeatedly so they become automatic coping tools.',
    character_count: 597,
    content_source_type: 'external_trusted',
    entity_type: 'TrustedCBTChunk',
    language: 'en',
    version: 1,
    metadata: {},
    cbt_topic: 'relaxation',
    technique: 'progressive muscle relaxation',
    evidence_level: 'moderate',
  },
  {
    chunk_id: 'trusted-cbt::va-dod-suicide-risk-cpg::chunk_0',
    source_id: 'va-dod-suicide-risk-cpg',
    external_source_record_id: null,
    source_url: 'https://www.healthquality.va.gov/guidelines/MH/srb/',
    source_title: 'VA/DoD Clinical Practice Guideline \u2013 Suicide Risk \u2013 Provider Summary',
    publisher: 'U.S. Department of Veterans Affairs / Department of Defense',
    domain: 'healthquality.va.gov',
    retrieval_date: '2026-03-01T00:00:00.000Z',
    chunk_index: 0,
    total_chunks: 1,
    chunk_text: 'The VA/DoD Clinical Practice Guideline for the Assessment and Management of Patients at Risk for Suicide recommends safety planning as a core evidence-based intervention for individuals at elevated suicide risk. A safety plan is a prioritised written list of coping strategies and sources of support co-created collaboratively by the patient and clinician. The six steps of safety planning are: (1) recognising personal warning signs; (2) internal coping strategies; (3) social contacts and settings that provide distraction; (4) people and family members to ask for help; (5) professionals and agencies to contact in crisis; (6) reducing access to lethal means. Safety planning should be documented and reviewed at each subsequent encounter.',
    character_count: 733,
    content_source_type: 'external_trusted',
    entity_type: 'TrustedCBTChunk',
    language: 'en',
    version: 1,
    metadata: {},
    cbt_topic: 'safety_planning',
    technique: 'safety planning',
    evidence_level: 'high',
  },
];
