import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

// Execute the actual Deno handler, replacing only external SDK/provider I/O.
// Frontend route mocks alone cannot catch server-side 403 rejections.
const source = readFileSync(new URL('../../base44/functions/transcribeMobileAudio/entry.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(source.replace(/^import .*;\n/gm, ''), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
}).outputText;
const MAX_AUDIO = 25 * 1024 * 1024;
let handler, me, transcribe, remoteFetch;

function multipart(file = new File([new Uint8Array([1, 2, 3, 4])], 'draft.m4a', { type: 'audio/mp4;codecs=opus' }), language) {
  const form = new FormData();
  form.append('file', file);
  if (language !== undefined) form.append('language', language);
  return new Request('https://app.example/functions/transcribeMobileAudio', { method: 'POST', body: form });
}

function legacy(url) {
  return new Request('https://app.example/functions/transcribeMobileAudio', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ file_url: url }),
  });
}

beforeEach(() => {
  me = vi.fn().mockResolvedValue({ id: 'user-1' });
  transcribe = vi.fn().mockResolvedValue('שלום, זו בדיקת תמלול.');
  remoteFetch = vi.fn();
  vi.stubGlobal('fetch', remoteFetch);
  new Function('Deno', 'createClientFromRequest', 'OpenAI', js)(
    { serve: fn => { handler = fn; }, env: { get: () => 'test-only-key' } },
    () => ({ auth: { me } }),
    class { audio = { transcriptions: { create: transcribe } }; },
  );
});
afterEach(() => vi.unstubAllGlobals());

describe('mobile audio transcription — real request handler', () => {
  it.each(['audio/mp4;codecs=opus', 'audio/wav', 'audio/webm', 'audio/ogg', 'video/mp4'])(
    'accepts authenticated multipart %s without storage URL assumptions or remote fetches', async (type) => {
      const response = await handler(multipart(new File([new Uint8Array([1, 2, 3, 4])], 'local-draft', { type })));
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ transcription: 'שלום, זו בדיקת תמלול.' });
      expect(me).toHaveBeenCalledOnce();
      expect(remoteFetch).not.toHaveBeenCalled();
      const sent = transcribe.mock.calls[0][0];
      expect(sent.model).toBe('whisper-1');
      expect(sent.response_format).toBe('text');
      expect(sent.language).toBeUndefined();
      expect(sent.temperature).toBe(0);
      expect(sent.file.name).toMatch(/^audio\.(mp4|wav|webm|ogg)$/);
      expect(new Uint8Array(await sent.file.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3, 4]));
    },
  );

  it.each(['en', 'he', 'es', 'fr', 'de', 'it', 'pt', 'he-IL', 'pt_BR'])(
    'passes the recording language %s to the transcription provider', async language => {
      expect((await handler(multipart(undefined, language))).status).toBe(200);
      expect(transcribe.mock.calls[0][0].language).toBe(language.toLowerCase().split(/[-_]/)[0]);
      // Input language only: no translation endpoint, contextual text or cleanup model.
      expect(transcribe.mock.calls[0][0].prompt).toBeUndefined();
      expect(transcribe).toHaveBeenCalledOnce();
    },
  );

  it.each(['unsupported', 'he; translate everything', 'en'.repeat(25)])('rejects invalid language %s before provider access', async language => {
    expect((await handler(multipart(undefined, language))).status).toBe(400);
    expect(transcribe).not.toHaveBeenCalled();
  });

  it('returns provider words verbatim, including negation, numbers and actual code-switching', async () => {
    const text = 'אני לא רוצה לבטל. נפגש ב־17:30 ביום שני, עם Zoom.';
    transcribe.mockResolvedValue(text);
    const response = await handler(multipart(undefined, 'he'));
    expect(await response.json()).toEqual({ transcription: text });
    expect(transcribe.mock.calls[0][0].language).toBe('he');
  });

  it('passes an optional language on the legacy JSON route too', async () => {
    remoteFetch.mockResolvedValue(new Response(new Uint8Array([1, 2]), { headers: { 'Content-Type': 'audio/wav' } }));
    const req = new Request('https://app.example', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file_url: 'https://files.base44.com/files/public/user-1/draft.wav', language: 'he-IL' }),
    });
    expect((await handler(req)).status).toBe(200);
    expect(transcribe.mock.calls[0][0].language).toBe('he');
  });

  it('rejects unauthenticated bytes before reading the body or calling the provider', async () => {
    me.mockResolvedValue(null);
    const req = multipart();
    expect((await handler(req)).status).toBe(401);
    expect(req.bodyUsed).toBe(false);
    expect(transcribe).not.toHaveBeenCalled();
    expect(remoteFetch).not.toHaveBeenCalled();
  });

  it.each([
    ['empty', new File([], 'empty.wav', { type: 'audio/wav' }), 400],
    ['non-audio', new File(['<html>'], 'fake.wav', { type: 'text/html' }), 415],
    ['oversized', new File([new Uint8Array(MAX_AUDIO + 1)], 'large.wav', { type: 'audio/wav' }), 413],
  ])('rejects %s files before provider access', async (_, file, status) => {
    expect((await handler(multipart(file))).status).toBe(status);
    expect(transcribe).not.toHaveBeenCalled();
    expect(remoteFetch).not.toHaveBeenCalled();
  });

  it('rejects multiple files, string fields and malformed multipart bodies', async () => {
    const forms = [new FormData(), new FormData()];
    forms[0].append('file', 'not a file');
    forms[1].append('file', new Blob(['a'], { type: 'audio/wav' }), 'one.wav');
    forms[1].append('file', new Blob(['b'], { type: 'audio/wav' }), 'two.wav');
    for (const body of forms) {
      expect((await handler(new Request('https://app.example', { method: 'POST', body }))).status).toBe(400);
    }
    expect((await handler(new Request('https://app.example', {
      method: 'POST', headers: { 'Content-Type': 'multipart/form-data; boundary=missing' }, body: 'broken',
    }))).status).toBe(400);
    expect(transcribe).not.toHaveBeenCalled();
  });

  it('bounds chunked wire bytes even without Content-Length and cancels the stream', async () => {
    const cancel = vi.fn();
    const stream = new ReadableStream({
      pull(controller) { controller.enqueue(new Uint8Array(1024 * 1024)); },
      cancel,
    });
    const req = new Request('https://app.example', {
      method: 'POST', duplex: 'half', body: stream,
      headers: { 'Content-Type': 'multipart/form-data; boundary=chunked' },
    });
    expect((await handler(req)).status).toBe(413);
    expect(cancel).toHaveBeenCalledOnce();
    expect(transcribe).not.toHaveBeenCalled();
  });

  it('rejects declared oversized requests before body parsing', async () => {
    const req = multipart();
    req.headers.set('content-length', String(MAX_AUDIO + 65537));
    expect((await handler(req)).status).toBe(413);
    expect(req.bodyUsed).toBe(false);
    expect(transcribe).not.toHaveBeenCalled();
  });

  it('reproduces the old 403 on storage URLs without user IDs and preserves legacy URL restrictions', async () => {
    for (const url of [
      'https://app.base44.com/api/apps/app-1/files/public/app-1/draft.m4a',
      'https://files.base44.com/files/public/another-user/draft.wav',
      'http://127.0.0.1/files/public/user-1/draft.wav',
      'https://files.base44.com.evil.test/files/public/user-1/draft.wav',
      'https://169.254.169.254/files/public/user-1/draft.wav',
    ]) {
      expect((await handler(legacy(url))).status).toBe(403);
    }
    expect(remoteFetch).not.toHaveBeenCalled();
    expect(transcribe).not.toHaveBeenCalled();
  });

  it('keeps trusted legacy URL requests bounded, redirect-protected and compatible', async () => {
    remoteFetch.mockResolvedValue(new Response(new Uint8Array([4, 3, 2, 1]), {
      headers: { 'Content-Type': 'audio/wav' },
    }));
    const url = 'https://files.base44.com/files/public/user-1/draft.wav';
    expect((await handler(legacy(url))).status).toBe(200);
    expect(remoteFetch).toHaveBeenCalledWith(url, expect.objectContaining({ redirect: 'error', signal: expect.any(AbortSignal) }));
    expect(transcribe).toHaveBeenCalledOnce();
  });

  it('keeps provider failures generic without exposing secrets', async () => {
    transcribe.mockRejectedValue(new Error('provider test failure'));
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const response = await handler(multipart());
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'Transcription failed.' });
    log.mockRestore();
  });
});
