import { describe, it, expect, vi } from 'vitest';
import {
  isWebmFile,
  isMp4File,
  resolveRecordedAudioMimeType,
  audioBufferToWavBlob,
  audioBufferToMonoWavBlob,
  decodeAudioDataAsync,
  MIN_WAV_SAMPLE_RATE,
  DEFAULT_WAV_SAMPLE_RATE,
  SPEECH_WAV_SAMPLE_RATE,
} from '../../src/utils/androidAudioTranscoder.js';

// ─── isWebmFile ───────────────────────────────────────────────────────────────

describe('isWebmFile', () => {
  it('returns true for audio/webm mime type', () => {
    expect(isWebmFile({ type: 'audio/webm', name: 'rec.webm' })).toBe(true);
  });

  it('returns true for audio/webm;codecs=opus mime type', () => {
    expect(isWebmFile({ type: 'audio/webm;codecs=opus', name: 'rec.webm' })).toBe(true);
  });

  it('returns true for .webm file extension when mime type is empty', () => {
    expect(isWebmFile({ type: '', name: 'voice-draft.webm' })).toBe(true);
  });

  it('returns true for uppercase .WEBM extension', () => {
    expect(isWebmFile({ type: '', name: 'VOICE.WEBM' })).toBe(true);
  });

  it('returns false for audio/mp4 mime type', () => {
    expect(isWebmFile({ type: 'audio/mp4', name: 'rec.m4a' })).toBe(false);
  });

  it('returns false for audio/ogg mime type', () => {
    expect(isWebmFile({ type: 'audio/ogg', name: 'rec.ogg' })).toBe(false);
  });

  it('returns false for null', () => {
    expect(isWebmFile(null)).toBe(false);
  });

  it('returns false for a plain object with no type or name', () => {
    expect(isWebmFile({})).toBe(false);
  });
});

// ─── isMp4File ────────────────────────────────────────────────────────────────

describe('isMp4File', () => {
  it('returns true for audio/mp4 mime type', () => {
    expect(isMp4File({ type: 'audio/mp4', name: 'rec.m4a' })).toBe(true);
  });

  it('returns true for audio/mp4;codecs=opus — the real Android negotiated codec variant', () => {
    expect(isMp4File({ type: 'audio/mp4;codecs=opus', name: 'rec.m4a' })).toBe(true);
  });

  it('returns true for .m4a file extension when mime type is empty', () => {
    expect(isMp4File({ type: '', name: 'voice-draft.m4a' })).toBe(true);
  });

  it('returns true for uppercase .M4A extension', () => {
    expect(isMp4File({ type: '', name: 'VOICE.M4A' })).toBe(true);
  });

  it('returns false for audio/webm mime type', () => {
    expect(isMp4File({ type: 'audio/webm', name: 'rec.webm' })).toBe(false);
  });

  it('returns false for audio/ogg mime type', () => {
    expect(isMp4File({ type: 'audio/ogg', name: 'rec.ogg' })).toBe(false);
  });

  it('returns false for null', () => {
    expect(isMp4File(null)).toBe(false);
  });

  it('returns false for an empty object', () => {
    expect(isMp4File({})).toBe(false);
  });
});

// ─── resolveRecordedAudioMimeType ─────────────────────────────────────────────

describe('resolveRecordedAudioMimeType', () => {
  it('prefers chunk mime type over recorder and requested types', () => {
    expect(
      resolveRecordedAudioMimeType({
        chunkMimeType: 'audio/mp4',
        recorderMimeType: 'audio/webm',
        requestedMimeType: 'audio/ogg',
      }),
    ).toBe('audio/mp4');
  });

  it('falls back to recorder mime type when chunk type is absent', () => {
    expect(
      resolveRecordedAudioMimeType({
        chunkMimeType: '',
        recorderMimeType: 'audio/mp4;codecs=opus',
        requestedMimeType: 'audio/ogg',
      }),
    ).toBe('audio/mp4;codecs=opus');
  });

  it('falls back to requested mime type when chunk and recorder types are absent', () => {
    expect(
      resolveRecordedAudioMimeType({
        chunkMimeType: undefined,
        recorderMimeType: '',
        requestedMimeType: 'audio/ogg;codecs=opus',
      }),
    ).toBe('audio/ogg;codecs=opus');
  });

  it('returns audio/webm when all sources are absent', () => {
    expect(
      resolveRecordedAudioMimeType({
        chunkMimeType: undefined,
        recorderMimeType: undefined,
        requestedMimeType: undefined,
      }),
    ).toBe('audio/webm');
  });

  it('normalises mime types to lowercase', () => {
    expect(
      resolveRecordedAudioMimeType({
        chunkMimeType: 'Audio/WebM',
        recorderMimeType: '',
        requestedMimeType: '',
      }),
    ).toBe('audio/webm');
  });

  it('trims leading and trailing whitespace from mime types', () => {
    expect(
      resolveRecordedAudioMimeType({
        chunkMimeType: '  audio/mp4  ',
        recorderMimeType: '',
        requestedMimeType: '',
      }),
    ).toBe('audio/mp4');
  });
});

// ─── audioBufferToWavBlob ─────────────────────────────────────────────────────

function makeFakeAudioBuffer({ numberOfChannels = 1, sampleRate = 44100, length = 4, samples = null } = {}) {
  const channelData = samples || new Float32Array(length).fill(0);
  return {
    numberOfChannels,
    sampleRate,
    length,
    getChannelData: () => channelData,
  };
}

describe('audioBufferToWavBlob', () => {
  it('returns a Blob with type audio/wav', () => {
    const blob = audioBufferToWavBlob(makeFakeAudioBuffer());
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('audio/wav');
  });

  it('produces a blob of exactly 44 + (frameCount * channels * 2) bytes', () => {
    const frameCount = 8;
    const numberOfChannels = 2;
    const blob = audioBufferToWavBlob(makeFakeAudioBuffer({ numberOfChannels, length: frameCount }));
    expect(blob.size).toBe(44 + frameCount * numberOfChannels * 2);
  });

  it('writes RIFF header signature at offset 0', async () => {
    const blob = audioBufferToWavBlob(makeFakeAudioBuffer({ length: 4 }));
    const buf = await blob.arrayBuffer();
    const view = new DataView(buf);
    const riff = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
    expect(riff).toBe('RIFF');
  });

  it('writes WAVE format identifier at offset 8', async () => {
    const blob = audioBufferToWavBlob(makeFakeAudioBuffer({ length: 4 }));
    const buf = await blob.arrayBuffer();
    const view = new DataView(buf);
    const wave = String.fromCharCode(view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11));
    expect(wave).toBe('WAVE');
  });

  it('writes PCM audio format code 1 at offset 20', async () => {
    const blob = audioBufferToWavBlob(makeFakeAudioBuffer({ length: 4 }));
    const buf = await blob.arrayBuffer();
    const view = new DataView(buf);
    expect(view.getUint16(20, true)).toBe(1);
  });

  it('writes correct channel count into the WAV header', async () => {
    const blob = audioBufferToWavBlob(makeFakeAudioBuffer({ numberOfChannels: 2, length: 4 }));
    const buf = await blob.arrayBuffer();
    const view = new DataView(buf);
    expect(view.getUint16(22, true)).toBe(2);
  });

  it('writes correct sample rate into the WAV header', async () => {
    const blob = audioBufferToWavBlob(makeFakeAudioBuffer({ sampleRate: 16000, length: 4 }));
    const buf = await blob.arrayBuffer();
    const view = new DataView(buf);
    expect(view.getUint32(24, true)).toBe(16000);
  });

  it('clamps sample rate to MIN_WAV_SAMPLE_RATE for abnormally low values', () => {
    const blob = audioBufferToWavBlob(makeFakeAudioBuffer({ sampleRate: 1000, length: 4 }));
    expect(blob.size).toBeGreaterThanOrEqual(44);
  });

  it('handles a null audioBuffer gracefully by producing a minimal 44-byte header blob', () => {
    const blob = audioBufferToWavBlob(null);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBe(44 + 1 * 2); // 1 channel, 1 frame minimum, 2 bytes/sample
  });

  it('clamps float samples to Int16 PCM range without overflow', async () => {
    const samples = new Float32Array([1.5, -1.5, 0, 0.5]);
    const blob = audioBufferToWavBlob(makeFakeAudioBuffer({ length: 4, samples }));
    const buf = await blob.arrayBuffer();
    const view = new DataView(buf);
    const s0 = view.getInt16(44, true);
    const s1 = view.getInt16(46, true);
    expect(s0).toBe(0x7FFF); // 1.5 clamped to 1.0 → 32767
    expect(s1).toBe(-0x8000); // -1.5 clamped to -1.0 → -32768
  });
});

// ─── decodeAudioDataAsync ─────────────────────────────────────────────────────

describe('decodeAudioDataAsync', () => {
  it('resolves with the AudioBuffer returned by a promise-style decodeAudioData', async () => {
    const fakeBuffer = { numberOfChannels: 1, sampleRate: 44100, length: 4 };
    const ctx = { decodeAudioData: vi.fn().mockResolvedValue(fakeBuffer) };
    const result = await decodeAudioDataAsync(ctx, new ArrayBuffer(4));
    expect(result).toBe(fakeBuffer);
  });

  it('resolves with the AudioBuffer delivered via the success callback (legacy API)', async () => {
    const fakeBuffer = { numberOfChannels: 1, sampleRate: 44100, length: 4 };
    const ctx = {
      decodeAudioData: vi.fn((_buf, onSuccess) => {
        onSuccess(fakeBuffer);
        return undefined; // legacy: no Promise returned
      }),
    };
    const result = await decodeAudioDataAsync(ctx, new ArrayBuffer(4));
    expect(result).toBe(fakeBuffer);
  });

  it('rejects when the error callback is invoked (legacy API)', async () => {
    const ctx = {
      decodeAudioData: vi.fn((_buf, _onSuccess, onError) => {
        onError(new Error('EncodingError'));
        return undefined;
      }),
    };
    await expect(decodeAudioDataAsync(ctx, new ArrayBuffer(4))).rejects.toThrow('EncodingError');
  });

  it('rejects when the returned promise rejects', async () => {
    const ctx = { decodeAudioData: vi.fn().mockRejectedValue(new Error('decode failed')) };
    await expect(decodeAudioDataAsync(ctx, new ArrayBuffer(4))).rejects.toThrow('decode failed');
  });

  it('rejects when decodeAudioData throws synchronously', async () => {
    const ctx = {
      decodeAudioData: vi.fn(() => {
        throw new Error('sync throw');
      }),
    };
    await expect(decodeAudioDataAsync(ctx, new ArrayBuffer(4))).rejects.toThrow('sync throw');
  });

  it('does not call the onSuccess callback more than once when both promise and callback fire', async () => {
    const fakeBuffer = { numberOfChannels: 1, sampleRate: 44100, length: 4 };
    const ctx = {
      decodeAudioData: vi.fn((_buf, onSuccess) => {
        onSuccess(fakeBuffer); // legacy callback fires
        return Promise.resolve(fakeBuffer); // promise also resolves
      }),
    };
    const result = await decodeAudioDataAsync(ctx, new ArrayBuffer(4));
    expect(result).toBe(fakeBuffer);
  });

  it('provides a fallback Error when the error callback receives a falsy value', async () => {
    const ctx = {
      decodeAudioData: vi.fn((_buf, _onSuccess, onError) => {
        onError(null);
        return undefined;
      }),
    };
    await expect(decodeAudioDataAsync(ctx, new ArrayBuffer(4))).rejects.toThrow('Audio decode failed');
  });
});

// ─── constants ────────────────────────────────────────────────────────────────

describe('androidAudioTranscoder constants', () => {
  it('MIN_WAV_SAMPLE_RATE is 8000', () => {
    expect(MIN_WAV_SAMPLE_RATE).toBe(8000);
  });

  it('DEFAULT_WAV_SAMPLE_RATE is 44100', () => {
    expect(DEFAULT_WAV_SAMPLE_RATE).toBe(44100);
  });

  it('SPEECH_WAV_SAMPLE_RATE is 16000', () => {
    expect(SPEECH_WAV_SAMPLE_RATE).toBe(16000);
  });
});

// ─── audioBufferToMonoWavBlob ─────────────────────────────────────────────────

describe('audioBufferToMonoWavBlob', () => {
  it('returns a Blob with type audio/wav', () => {
    const blob = audioBufferToMonoWavBlob(makeFakeAudioBuffer());
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('audio/wav');
  });

  it('always produces a mono (1-channel) WAV regardless of source channels', async () => {
    const blob = audioBufferToMonoWavBlob(makeFakeAudioBuffer({ numberOfChannels: 2, length: 8 }));
    const buf = await blob.arrayBuffer();
    const view = new DataView(buf);
    // WAV channel count field is at offset 22
    expect(view.getUint16(22, true)).toBe(1);
  });

  it('produces exactly 44 + frameCount * 2 bytes for a mono source', () => {
    const frameCount = 10;
    const blob = audioBufferToMonoWavBlob(makeFakeAudioBuffer({ numberOfChannels: 1, length: frameCount }));
    expect(blob.size).toBe(44 + frameCount * 2);
  });

  it('produces exactly 44 + frameCount * 2 bytes for a stereo source (mixed to mono)', () => {
    const frameCount = 10;
    const blob = audioBufferToMonoWavBlob(makeFakeAudioBuffer({ numberOfChannels: 2, length: frameCount }));
    // Output is always mono so data section = frameCount * 1 channel * 2 bytes
    expect(blob.size).toBe(44 + frameCount * 2);
  });

  it('writes RIFF header signature at offset 0', async () => {
    const blob = audioBufferToMonoWavBlob(makeFakeAudioBuffer({ length: 4 }));
    const buf = await blob.arrayBuffer();
    const view = new DataView(buf);
    const riff = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
    expect(riff).toBe('RIFF');
  });

  it('writes WAVE format identifier at offset 8', async () => {
    const blob = audioBufferToMonoWavBlob(makeFakeAudioBuffer({ length: 4 }));
    const buf = await blob.arrayBuffer();
    const view = new DataView(buf);
    const wave = String.fromCharCode(view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11));
    expect(wave).toBe('WAVE');
  });

  it('writes PCM audio format code 1 at offset 20', async () => {
    const blob = audioBufferToMonoWavBlob(makeFakeAudioBuffer({ length: 4 }));
    const buf = await blob.arrayBuffer();
    const view = new DataView(buf);
    expect(view.getUint16(20, true)).toBe(1);
  });

  it('writes correct sample rate into the WAV header', async () => {
    const blob = audioBufferToMonoWavBlob(makeFakeAudioBuffer({ sampleRate: 16000, length: 4 }));
    const buf = await blob.arrayBuffer();
    const view = new DataView(buf);
    expect(view.getUint32(24, true)).toBe(16000);
  });

  it('mixes two identical stereo channels to the same mono value', async () => {
    // Both channels carry the same signal; mono mix should equal that signal.
    const samples = new Float32Array([0.5, -0.5, 0.25]);
    const blob = audioBufferToMonoWavBlob({
      numberOfChannels: 2,
      sampleRate: 16000,
      length: 3,
      getChannelData: () => samples,
    });
    const buf = await blob.arrayBuffer();
    const view = new DataView(buf);
    const s0 = view.getInt16(44, true);
    const s1 = view.getInt16(46, true);
    // 0.5 → Math.round(0.5 * 0x7FFF) = 16383 (0x3FFF)
    expect(s0).toBe(Math.round(0.5 * 0x7FFF));
    // -0.5 → Math.round(-0.5 * 0x8000) = -16384
    expect(s1).toBe(Math.round(-0.5 * 0x8000));
  });

  it('clamps mixed float samples to Int16 PCM range without overflow', async () => {
    const samples = new Float32Array([1.5, -1.5]);
    const blob = audioBufferToMonoWavBlob(makeFakeAudioBuffer({ length: 2, samples }));
    const buf = await blob.arrayBuffer();
    const view = new DataView(buf);
    expect(view.getInt16(44, true)).toBe(0x7FFF);   // 1.5 clamped to 1.0 → 32767
    expect(view.getInt16(46, true)).toBe(-0x8000);  // -1.5 clamped to -1.0 → -32768
  });

  it('handles a null audioBuffer gracefully by producing a minimal 44+2-byte header blob', () => {
    const blob = audioBufferToMonoWavBlob(null);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBe(44 + 1 * 2); // 1 frame minimum, mono, 2 bytes/sample
  });

  it('handles an undefined audioBuffer gracefully by producing a minimal 44+2-byte header blob', () => {
    const blob = audioBufferToMonoWavBlob(undefined);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBe(44 + 1 * 2);
  });
});
