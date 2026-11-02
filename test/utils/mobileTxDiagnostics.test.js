import { describe, it, expect } from 'vitest';
import {
  buildTranscriptionFailureDescription,
  extractBackendTranscriptionErrorReason,
} from '../../src/utils/audioTranscriptionDiagnostics.js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const chatSource = readFileSync(resolve(process.cwd(), 'src/pages/Chat.jsx'), 'utf8');

describe('buildTranscriptionFailureDescription', () => {
  it('returns a non-empty string for a typical failure with diagInfo', () => {
    const result = buildTranscriptionFailureDescription({
      diagInfo: { type: 'audio/webm', size: 20480, isZeroBytes: false, canPlayType: 'probably' },
      backendReason: null,
      conversionError: null,
    });
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('includes file type and size in KB when diagInfo is provided', () => {
    const result = buildTranscriptionFailureDescription({
      diagInfo: { type: 'audio/webm', size: 20480, isZeroBytes: false, canPlayType: 'probably' },
      backendReason: null,
      conversionError: null,
    });
    expect(result).toContain('audio/webm');
    expect(result).toContain('20.0');
  });

  it('includes 0-byte message and check-permissions hint when isZeroBytes is true', () => {
    const result = buildTranscriptionFailureDescription({
      diagInfo: { type: 'audio/webm', size: 0, isZeroBytes: true, canPlayType: null },
      backendReason: null,
      conversionError: null,
    });
    expect(result).toContain('0-byte');
    expect(result).toContain('microphone permissions');
  });

  it('includes canPlayType warning when format is not playable (canPlayType=no)', () => {
    const result = buildTranscriptionFailureDescription({
      diagInfo: { type: 'audio/webm', size: 5120, isZeroBytes: false, canPlayType: 'no' },
      backendReason: null,
      conversionError: null,
    });
    expect(result).toContain('not be playable');
  });

  it('includes canPlayType warning when canPlayType is empty string', () => {
    const result = buildTranscriptionFailureDescription({
      diagInfo: { type: 'audio/webm', size: 5120, isZeroBytes: false, canPlayType: '' },
      backendReason: null,
      conversionError: null,
    });
    expect(result).toContain('not be playable');
  });

  it('does not add canPlayType warning when canPlayType is probably or maybe', () => {
    const result = buildTranscriptionFailureDescription({
      diagInfo: { type: 'audio/webm', size: 5120, isZeroBytes: false, canPlayType: 'probably' },
      backendReason: null,
      conversionError: null,
    });
    expect(result).not.toContain('not be playable');
  });

  it('includes conversion error message when provided as an Error object', () => {
    const result = buildTranscriptionFailureDescription({
      diagInfo: { type: 'audio/webm', size: 8192, isZeroBytes: false, canPlayType: 'probably' },
      backendReason: null,
      conversionError: new Error('AudioContext decode failed: EncodingError'),
    });
    expect(result).toContain('Conversion error');
    expect(result).toContain('AudioContext decode');
  });

  it('includes conversion error message when provided as a plain string', () => {
    const result = buildTranscriptionFailureDescription({
      diagInfo: { type: 'audio/mp4', size: 8192, isZeroBytes: false, canPlayType: 'maybe' },
      backendReason: null,
      conversionError: 'codec not supported',
    });
    expect(result).toContain('codec not supported');
  });

  it('truncates a long conversion error message to at most 80 chars', () => {
    const longMsg = 'x'.repeat(200);
    const result = buildTranscriptionFailureDescription({
      diagInfo: { type: 'audio/webm', size: 1024, isZeroBytes: false, canPlayType: null },
      backendReason: null,
      conversionError: new Error(longMsg),
    });
    expect(result).toContain('Conversion error');
    const convIdx = result.indexOf('Conversion error: ');
    const afterPrefix = result.slice(convIdx + 'Conversion error: '.length);
    const endIdx = afterPrefix.indexOf('.');
    expect(endIdx).toBeLessThanOrEqual(80);
  });

  it('includes backend server reason in quoted form', () => {
    const result = buildTranscriptionFailureDescription({
      diagInfo: { type: 'audio/ogg', size: 12288, isZeroBytes: false, canPlayType: 'probably' },
      backendReason: 'invalid file format',
      conversionError: null,
    });
    expect(result).toContain('Server:');
    expect(result).toContain('invalid file format');
  });

  it('returns a retry hint when not a 0-byte case', () => {
    const result = buildTranscriptionFailureDescription({
      diagInfo: { type: 'audio/webm', size: 4096, isZeroBytes: false, canPlayType: 'probably' },
      backendReason: null,
      conversionError: null,
    });
    expect(result).toContain('Try again');
  });

  it('returns a non-empty fallback string when diagInfo is null', () => {
    const result = buildTranscriptionFailureDescription({
      diagInfo: null,
      backendReason: null,
      conversionError: null,
    });
    expect(typeof result).toBe('string');
    expect(result).toContain('Try again');
  });

  it('includes all relevant details when all params are provided', () => {
    const result = buildTranscriptionFailureDescription({
      diagInfo: { type: 'audio/webm', size: 8192, isZeroBytes: false, canPlayType: 'no' },
      backendReason: 'silent audio',
      conversionError: new Error('decode failed'),
    });
    expect(result).toContain('audio/webm');
    expect(result).toContain('not be playable');
    expect(result).toContain('Conversion error');
    expect(result).toContain('silent audio');
    expect(result).toContain('Try again');
  });
});

describe('extractBackendTranscriptionErrorReason', () => {
  it('returns null for a null error', () => {
    expect(extractBackendTranscriptionErrorReason(null)).toBeNull();
  });

  it('returns null when no string properties are present', () => {
    expect(extractBackendTranscriptionErrorReason({ status: 500 })).toBeNull();
  });

  it('returns error.data.error first when available', () => {
    const err = { data: { error: 'invalid file format', message: 'other msg' }, message: 'fallback' };
    expect(extractBackendTranscriptionErrorReason(err)).toBe('invalid file format');
  });

  it('falls back to error.data.message when data.error is missing', () => {
    const err = { data: { message: 'decode error from server' }, message: 'fallback' };
    expect(extractBackendTranscriptionErrorReason(err)).toBe('decode error from server');
  });

  it('falls back to error.message when data fields are absent', () => {
    const err = new Error('silent audio detected');
    expect(extractBackendTranscriptionErrorReason(err)).toBe('silent audio detected');
  });

  it('truncates reasons longer than 120 chars with an ellipsis', () => {
    const longMsg = 'x'.repeat(150);
    const err = { message: longMsg };
    const result = extractBackendTranscriptionErrorReason(err);
    expect(result).toHaveLength(121); // 120 chars + ellipsis char (single codepoint)
    expect(result.endsWith('\u2026')).toBe(true);
  });

  it('returns as-is for reasons at exactly 120 chars', () => {
    const exactMsg = 'a'.repeat(120);
    const err = { message: exactMsg };
    const result = extractBackendTranscriptionErrorReason(err);
    expect(result).toBe(exactMsg);
  });

  it('ignores non-string values in data fields', () => {
    const err = { data: { error: 42, message: null }, message: 'real message' };
    expect(extractBackendTranscriptionErrorReason(err)).toBe('real message');
  });
});

describe('Mobile transcription diagnostic contracts (Chat.jsx source)', () => {
  it('imports diagnostic utilities from audioTranscriptionDiagnostics module', () => {
    expect(chatSource).toContain("from '@/utils/audioTranscriptionDiagnostics.js'");
  });

  it('gates diagnostic info to mobile-only paths via isMobileBrowser()', () => {
    expect(chatSource).toContain('function isMobileBrowser()');
    expect(chatSource).toContain('const onMobile = isMobileBrowser()');
  });

  it('performs an early 0-byte guard before setting isTranscribingAudio', () => {
    const guardIdx = chatSource.indexOf('audioDraftFile.size === 0');
    const transcribingIdx = chatSource.indexOf('setIsTranscribingAudio(true)');
    expect(guardIdx).toBeGreaterThan(-1);
    expect(transcribingIdx).toBeGreaterThan(-1);
    expect(guardIdx).toBeLessThan(transcribingIdx);
  });

  it('captures conversion errors from convertAndroidWebmDraftToWav gracefully', () => {
    expect(chatSource).toContain('conversionError = convertErr');
    expect(chatSource).toContain('falling back to original file');
  });

  it('calls buildMobileAudioDiagnosticInfo only on mobile', () => {
    expect(chatSource).toContain('onMobile ? buildMobileAudioDiagnosticInfo(audioDraftFile)');
  });

  it('calls extractBackendTranscriptionErrorReason on transcription errors', () => {
    expect(chatSource).toContain('extractBackendTranscriptionErrorReason(transcriptionError)');
    expect(chatSource).toContain('extractBackendTranscriptionErrorReason(retryError)');
  });

  it('calls buildTranscriptionFailureDescription on all mobile failure paths', () => {
    const matchCount = (chatSource.match(/buildTranscriptionFailureDescription\(/g) || []).length;
    expect(matchCount).toBeGreaterThanOrEqual(3);
  });
});
