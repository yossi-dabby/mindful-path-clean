/**
 * Pure utility functions for Android/mobile audio transcoding.
 *
 * Converts recorded mobile audio blobs (WebM, MP4/M4A) to WAV via the Web Audio API
 * so they can be uploaded to the transcription endpoint which requires a supported format.
 *
 * No browser globals are accessed at import time — all DOM/API access is deferred to
 * call time. Safe to import in test environments when browser APIs are mocked or stubbed.
 *
 * Conversion is done entirely client-side:
 *   recorded Blob → AudioContext.decodeAudioData → PCM samples → WAV RIFF header + data
 */

export const MIN_WAV_SAMPLE_RATE = 8000;
export const DEFAULT_WAV_SAMPLE_RATE = 44100;

/**
 * Target sample rate for speech-recognition-optimised WAV output.
 * 16 kHz mono PCM is the format that all major speech-to-text services support.
 * Using it avoids large uncompressed files at 44.1 / 48 kHz and eliminates
 * transcription rejections caused by high sample rates or stereo audio.
 */
export const SPEECH_WAV_SAMPLE_RATE = 16000;

/**
 * Returns true when the file is a WebM audio recording (by MIME type or file extension).
 *
 * @param {File|Blob|{type?: string, name?: string}} file
 * @returns {boolean}
 */
export function isWebmFile(file) {
  if (!file || typeof file !== 'object') return false;
  const mimeType = typeof file.type === 'string' ? file.type.toLowerCase() : '';
  if (mimeType.includes('webm')) return true;
  const fileName = typeof file.name === 'string' ? file.name.toLowerCase() : '';
  return fileName.endsWith('.webm');
}

/**
 * Returns true when the file is an MP4 or M4A audio recording (by MIME type or file extension).
 * Also matches `audio/mp4;codecs=opus` — the negotiated-codec variant produced by real Android
 * MediaRecorder instances that commonly causes server-side transcription rejections.
 *
 * @param {File|Blob|{type?: string, name?: string}} file
 * @returns {boolean}
 */
export function isMp4File(file) {
  if (!file || typeof file !== 'object') return false;
  const mimeType = typeof file.type === 'string' ? file.type.toLowerCase() : '';
  if (mimeType.startsWith('audio/mp4')) return true;
  const fileName = typeof file.name === 'string' ? file.name.toLowerCase() : '';
  return fileName.endsWith('.m4a');
}

/**
 * Resolves the actual recorded MIME type from up to three sources, in priority order:
 *   1. The first non-empty chunk MIME type (most accurate on Android)
 *   2. The MediaRecorder instance's `.mimeType` property
 *   3. The explicitly requested MIME type passed to the MediaRecorder constructor
 *
 * Falls back to `'audio/webm'` when all sources are empty/undefined.
 *
 * @param {{ chunkMimeType?: string, recorderMimeType?: string, requestedMimeType?: string }} params
 * @returns {string}
 */
export function resolveRecordedAudioMimeType({ chunkMimeType, recorderMimeType, requestedMimeType }) {
  const normalizeMimeType = (mimeType) => {
    if (typeof mimeType !== 'string') return '';
    return mimeType.trim().toLowerCase();
  };

  const chunkType = normalizeMimeType(chunkMimeType);
  if (chunkType) return chunkType;

  const recorderType = normalizeMimeType(recorderMimeType);
  if (recorderType) return recorderType;

  const requestedType = normalizeMimeType(requestedMimeType);
  if (requestedType) return requestedType;

  return 'audio/webm';
}

/**
 * Normalizes the legacy callback-style and modern promise-style `decodeAudioData` APIs.
 * Both styles are in use across different browser/WebView versions, including older Android
 * WebViews that do not return a Promise from `decodeAudioData`.
 *
 * @param {AudioContext} audioContext
 * @param {ArrayBuffer} arrayBuffer
 * @returns {Promise<AudioBuffer>}
 */
export function decodeAudioDataAsync(audioContext, arrayBuffer) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const settle = (fn, value) => {
      if (settled) return;
      settled = true;
      fn(value);
    };

    const onSuccess = (audioBuffer) => settle(resolve, audioBuffer);
    const onError = (error) => settle(reject, error || new Error('Audio decode failed'));

    try {
      const maybePromise = audioContext.decodeAudioData(arrayBuffer, onSuccess, onError);
      if (maybePromise && typeof maybePromise.then === 'function') {
        maybePromise.then(onSuccess).catch(onError);
      }
    } catch (error) {
      onError(error);
    }
  });
}

/**
 * Encodes an `AudioBuffer` as a standard 16-bit PCM WAV blob.
 *
 * The WAV header is written as a RIFF/WAVE chunk with a `fmt ` sub-chunk (PCM, 16-bit)
 * followed by a `data` sub-chunk containing interleaved, channel-ordered PCM samples
 * clamped to the [-1, 1] float range and quantised to Int16.
 *
 * @param {AudioBuffer} audioBuffer
 * @returns {Blob}  A Blob with type `"audio/wav"`
 */
export function audioBufferToWavBlob(audioBuffer) {
  const numberOfChannels = Math.max(1, Number(audioBuffer?.numberOfChannels) || 1);
  const sampleRate = Math.max(MIN_WAV_SAMPLE_RATE, Number(audioBuffer?.sampleRate) || DEFAULT_WAV_SAMPLE_RATE);
  const frameCount = Math.max(1, Number(audioBuffer?.length) || 0);
  const bytesPerSample = 2;
  const blockAlign = numberOfChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataByteLength = frameCount * blockAlign;
  const wavBuffer = new ArrayBuffer(44 + dataByteLength);
  const view = new DataView(wavBuffer);

  const writeAscii = (offset, text) => {
    for (let i = 0; i < text.length; i += 1) {
      view.setUint8(offset + i, text.charCodeAt(i));
    }
  };

  writeAscii(0, 'RIFF');
  view.setUint32(4, 36 + dataByteLength, true);
  writeAscii(8, 'WAVE');
  writeAscii(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numberOfChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeAscii(36, 'data');
  view.setUint32(40, dataByteLength, true);

  const channels = [];
  for (let channel = 0; channel < numberOfChannels; channel += 1) {
    const samples = audioBuffer?.getChannelData?.(channel);
    channels.push(samples instanceof Float32Array ? samples : new Float32Array(frameCount));
  }

  let writeOffset = 44;
  for (let frame = 0; frame < frameCount; frame += 1) {
    for (let channel = 0; channel < numberOfChannels; channel += 1) {
      const sample = Math.max(-1, Math.min(1, channels[channel][frame] || 0));
      const pcmValue = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      view.setInt16(writeOffset, Math.round(pcmValue), true);
      writeOffset += bytesPerSample;
    }
  }

  return new Blob([wavBuffer], { type: 'audio/wav' });
}

/**
 * Encodes an `AudioBuffer` as a 16-bit **mono** PCM WAV blob, mixing all channels down to a
 * single channel.
 *
 * Why mono instead of preserving the original channel count:
 *   - Voice recordings captured by a mobile MediaRecorder are inherently single-speaker audio.
 *   - Speech-to-text services are optimised for (and often require) mono input.
 *   - Halving the channel count halves the file size, keeping uploads well within API size limits.
 *
 * Mono mixing uses arithmetic mean: each output sample is the average of the corresponding
 * samples across all source channels. This is appropriate for voice recordings where all
 * channels carry the same speech content.
 *
 * @param {AudioBuffer} audioBuffer
 * @returns {Blob}  A Blob with type `"audio/wav"`
 */
export function audioBufferToMonoWavBlob(audioBuffer) {
  const numberOfChannels = Math.max(1, Number(audioBuffer?.numberOfChannels) || 1);
  const sampleRate = Math.max(MIN_WAV_SAMPLE_RATE, Number(audioBuffer?.sampleRate) || DEFAULT_WAV_SAMPLE_RATE);
  const frameCount = Math.max(1, Number(audioBuffer?.length) || 0);
  const bytesPerSample = 2;

  // Always output a single (mono) channel regardless of the source channel count.
  const outputChannels = 1;
  const blockAlign = outputChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataByteLength = frameCount * blockAlign;
  const wavBuffer = new ArrayBuffer(44 + dataByteLength);
  const view = new DataView(wavBuffer);

  const writeAscii = (offset, text) => {
    for (let i = 0; i < text.length; i += 1) {
      view.setUint8(offset + i, text.charCodeAt(i));
    }
  };

  writeAscii(0, 'RIFF');
  view.setUint32(4, 36 + dataByteLength, true);
  writeAscii(8, 'WAVE');
  writeAscii(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);             // PCM format
  view.setUint16(22, outputChannels, true); // always 1 (mono)
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);            // bits per sample
  writeAscii(36, 'data');
  view.setUint32(40, dataByteLength, true);

  // Collect source channel data arrays.
  const channels = [];
  for (let channel = 0; channel < numberOfChannels; channel += 1) {
    const samples = audioBuffer?.getChannelData?.(channel);
    channels.push(samples instanceof Float32Array ? samples : new Float32Array(frameCount));
  }

  // Mix all channels to mono (arithmetic mean) and write as Int16 PCM.
  let writeOffset = 44;
  for (let frame = 0; frame < frameCount; frame += 1) {
    let sum = 0;
    for (let channel = 0; channel < numberOfChannels; channel += 1) {
      sum += channels[channel][frame] || 0;
    }
    const monoSample = Math.max(-1, Math.min(1, sum / numberOfChannels));
    const pcmValue = monoSample < 0 ? monoSample * 0x8000 : monoSample * 0x7FFF;
    view.setInt16(writeOffset, Math.round(pcmValue), true);
    writeOffset += bytesPerSample;
  }

  return new Blob([wavBuffer], { type: 'audio/wav' });
}
