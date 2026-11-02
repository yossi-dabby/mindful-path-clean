import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const parseJsonc = (path) => JSON.parse(read(path));

describe('production security hardening', () => {
  it('keeps crisis alerts private while allowing owner-attributed creation', () => {
    const schema = parseJsonc('base44/entities/CrisisAlert.jsonc');
    expect(schema.rls.create).toEqual({ 'data.user_email': '{{user.email}}' });
    expect(schema.rls.read.user_condition.role).toBe('admin');
    expect(schema.rls.update.user_condition.role).toBe('admin');
    expect(schema.rls.delete.user_condition.role).toBe('admin');
  });

  it('limits regression logs to administrators', () => {
    const schema = parseJsonc('base44/entities/RegressionLog.jsonc');
    for (const operation of ['create', 'read', 'update', 'delete']) {
      expect(schema.rls[operation].user_condition.role).toBe('admin');
    }
  });

  it('guards notification delivery and prevents arbitrary HTML or recipients', () => {
    const source = read('base44/functions/sendNotification/entry.ts');
    expect(source).toContain('await base44.auth.me()');
    expect(source).toContain("caller.role !== 'admin' && recipient !== callerEmail");
    expect(source).toContain('function escapeHtml');
    expect(source).toContain('TRUSTED_ACTION_ORIGINS');
    expect(source).toContain('created_by: recipient');
  });

  it('makes goal reminder processing admin-only and idempotent per day', () => {
    const source = read('base44/functions/checkGoalReminders/entry.ts');
    expect(source).toContain("caller.role !== 'admin'");
    expect(source).toContain("lastSent.toISOString().slice(0, 10) === now.toISOString().slice(0, 10)");
  });

  it('requires authentication and session ownership for phase transitions', () => {
    const source = read('base44/functions/sessionPhaseEngine/entry.ts');
    expect(source).toContain('await base44.auth.me()');
    expect(source).toContain('base44.asServiceRole.entities.CoachingSession.get(session_id)');
    expect(source).toContain("session.created_by !== caller.email");
  });

  it('requires authentication for deterministic safety processing', () => {
    const safetyMode = read('base44/functions/therapistSafetyMode/entry.ts');
    const postLlmFilter = read('base44/functions/postLlmSafetyFilter/entry.ts');
    expect(safetyMode).toContain('await base44.auth.me()');
    expect(safetyMode).toContain('body.message_text.length > 20_000');
    expect(postLlmFilter).toContain('await base44.auth.me()');
    expect(postLlmFilter).toContain('message_content.length > 100_000');
  });

  it('keeps internal clinical knowledge admin-only at the entity boundary', () => {
    for (const entity of ['CBTCurriculumUnit', 'TrustedCBTChunk']) {
      const schema = parseJsonc(`base44/entities/${entity}.jsonc`);
      for (const operation of ['create', 'read', 'update', 'delete']) {
        expect(schema.rls[operation].user_condition.role).toBe('admin');
      }
    }
  });

  it('routes runtime curriculum reads through an authenticated backend function', () => {
    const retrieval = read('src/lib/cbtKnowledgeRetrieval.js');
    const backend = read('base44/functions/retrieveCurriculumUnit/entry.ts');
    expect(retrieval).toContain("functionsClient.invoke('retrieveCurriculumUnit'");
    expect(backend).toContain('await base44.auth.me()');
    expect(backend).toContain('filter.planner_domain = planner_domain');
  });

  it('limits catalog records to authenticated users and admin-managed writes', () => {
    for (const entity of ['AudioContent', 'GoalTemplate', 'Journey', 'Psychoeducation', 'Resource', 'Video', 'Exercise']) {
      const schema = parseJsonc(`base44/entities/${entity}.jsonc`);
      expect(schema.rls.create.user_condition.role).toBe('admin');
      expect(schema.rls.update.user_condition.role).toBe('admin');
      expect(schema.rls.delete.user_condition.role).toBe('admin');
      expect(schema.rls.read).toBeTruthy();
    }
  });

  it('stores exercise favorites and progress in an owner-only entity', () => {
    const schema = parseJsonc('base44/entities/UserExerciseProgress.jsonc');
    for (const operation of ['create', 'read', 'update', 'delete']) {
      expect(schema.rls[operation].created_by).toBe('{{user.email}}');
    }
    expect(read('src/api/base44Client.js')).toContain('installExerciseProgressAdapter(base44)');
  });

  it('removes the embedded Firebase token and enables anti-framing headers', () => {
    expect(read('base44/entities/Video.jsonc')).not.toContain('token=');
    const serveConfig = JSON.parse(read('serve.json'));
    const headers = Object.fromEntries(serveConfig.headers[0].headers.map(({ key, value }) => [key, value]));
    expect(headers['Content-Security-Policy']).toBe("frame-ancestors 'none'");
    expect(headers['X-Frame-Options']).toBe('DENY');
    expect(read('railway.toml')).toContain('npx serve -s dist -l $PORT');
  });

  it('keeps emergency contacts available locally while protecting the legacy backend mirror', () => {
    const backend = read('base44/functions/emergencyResourceLayer/entry.ts');
    const localResources = read('src/lib/emergencyResourceLayer.js');
    expect(backend).toContain("req.method !== 'POST'");
    expect(backend).toContain('await base44.auth.me()');
    expect(backend).toContain('declaredLength > 1_024');
    expect(backend).not.toContain('InvokeLLM');
    expect(backend).not.toContain('asServiceRole');
    expect(localResources).toContain('VERIFIED_EMERGENCY_RESOURCES');
    expect(localResources).toContain("value: '1201'");
  });

  it('prevents mobile transcription SSRF and bounds downloaded audio', () => {
    const source = read('base44/functions/transcribeMobileAudio/entry.ts');
    expect(source).toContain("parsed.protocol !== 'https:'");
    expect(source).toContain('isTrustedUploadHost(parsed.hostname)');
    expect(source).toContain("segments.includes('files')");
    expect(source).toContain("segments.indexOf('public')");
    expect(source).toContain('segments[publicIndex + 1] === userId');
    expect(source).toContain("redirect: 'error'");
    expect(source).toContain('AbortSignal.timeout(FETCH_TIMEOUT_MS)');
    expect(source).toContain('MAX_AUDIO_BYTES');
    expect(source).toContain('await base44.auth.me()');
  });

  it('sanitizes every rich-text journal field before rendering and persistence', () => {
    const source = read('src/components/journal/ThoughtRecordForm.jsx');
    const packageJson = JSON.parse(read('package.json'));
    expect(packageJson.dependencies.dompurify).toBeTruthy();
    expect(source).toContain("import DOMPurify from 'dompurify'");
    expect(source).toContain('DOMPurify.sanitize');
    expect(source).toContain("FORBID_TAGS: ['img', 'video', 'audio', 'iframe', 'object', 'embed', 'svg', 'math']");
    for (const field of ['situation', 'automatic_thoughts', 'evidence_for', 'evidence_against', 'balanced_thought']) {
      expect(source, field).toContain(`${field}: sanitizeJournalRichText(`);
    }
    expect(source.match(/\.\.\.sanitizeJournalRichTextFields\(data\)/g)).toHaveLength(2);
  });
});
