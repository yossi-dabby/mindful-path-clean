import { test, expect } from '@playwright/test';
import { mockApi, spaNavigate } from '../helpers/ui';

const installFakeMediaRecording = async (page: any, mimeType = 'audio/webm') => {
  await page.addInitScript((chosenMimeType: string) => {
    localStorage.setItem('chat_consent_accepted', 'true');
    localStorage.setItem('age_verified', 'true');
    (window as any).__TEST_APP_ID__ = 'test-app-id';
    (window as any).__DISABLE_ANALYTICS__ = true;
    Object.defineProperty(window.navigator, 'userAgent', {
      configurable: true,
      get: () => 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });
    (window as any).Capacitor = undefined;

    class FakeMediaRecorder {
      stream: any;
      state: 'inactive' | 'recording' = 'inactive';
      mimeType = chosenMimeType;
      ondataavailable: ((event: { data: Blob }) => void) | null = null;
      onerror: ((event: any) => void) | null = null;
      onstop: (() => void) | null = null;

      constructor(stream: any) {
        this.stream = stream;
      }

      start() {
        this.state = 'recording';
      }

      stop() {
        if (this.state !== 'recording') return;
        this.state = 'inactive';
        const blob = new Blob([new Uint8Array([1, 2, 3, 4])], { type: this.mimeType });
        this.ondataavailable?.({ data: blob });
        this.onstop?.();
      }
    }

    Object.defineProperty(window, 'MediaRecorder', {
      configurable: true,
      writable: true,
      value: FakeMediaRecorder,
    });

    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: async () => ({
          getTracks: () => [{ stop() {} }],
        }),
      },
    });
  }, mimeType);
};

const installFakeAndroidMediaRecording = async (page: any, supportedMimeType = 'audio/mp4') => {
  await page.addInitScript((chosenSupportedMimeType: string) => {
    localStorage.setItem('chat_consent_accepted', 'true');
    localStorage.setItem('age_verified', 'true');
    (window as any).__TEST_APP_ID__ = 'test-app-id';
    (window as any).__DISABLE_ANALYTICS__ = true;

    Object.defineProperty(window.navigator, 'userAgent', {
      configurable: true,
      get: () => 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    });

    (window as any).Capacitor = {
      getPlatform: () => 'android',
    };

    class FakeMediaRecorder {
      stream: any;
      state: 'inactive' | 'recording' = 'inactive';
      mimeType: string;
      ondataavailable: ((event: { data: Blob }) => void) | null = null;
      onerror: ((event: any) => void) | null = null;
      onstop: (() => void) | null = null;

      constructor(stream: any, options: { mimeType?: string } = {}) {
        this.stream = stream;
        if (options?.mimeType !== chosenSupportedMimeType) {
          throw new DOMException('Unsupported MediaRecorder mimeType on Android runtime', 'NotSupportedError');
        }
        this.mimeType = options.mimeType;
      }

      static isTypeSupported(candidate: string) {
        return candidate === chosenSupportedMimeType;
      }

      start() {
        this.state = 'recording';
      }

      stop() {
        if (this.state !== 'recording') return;
        this.state = 'inactive';
        const blob = new Blob([new Uint8Array([1, 2, 3, 4])], { type: this.mimeType });
        this.ondataavailable?.({ data: blob });
        this.onstop?.();
      }
    }

    Object.defineProperty(window, 'MediaRecorder', {
      configurable: true,
      writable: true,
      value: FakeMediaRecorder,
    });

    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: async () => ({
          getTracks: () => [{ stop() {} }],
        }),
      },
    });
  }, supportedMimeType);
};

const installFakeAndroidMediaRecordingWithEmptyRecorderMimeType = async (page: any, supportedMimeType = 'audio/mp4') => {
  await page.addInitScript((chosenSupportedMimeType: string) => {
    localStorage.setItem('chat_consent_accepted', 'true');
    localStorage.setItem('age_verified', 'true');
    (window as any).__TEST_APP_ID__ = 'test-app-id';
    (window as any).__DISABLE_ANALYTICS__ = true;

    Object.defineProperty(window.navigator, 'userAgent', {
      configurable: true,
      get: () => 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    });

    (window as any).Capacitor = {
      getPlatform: () => 'android',
    };

    class FakeMediaRecorder {
      stream: any;
      state: 'inactive' | 'recording' = 'inactive';
      mimeType = '';
      ondataavailable: ((event: { data: Blob }) => void) | null = null;
      onerror: ((event: any) => void) | null = null;
      onstop: (() => void) | null = null;

      constructor(stream: any, options: { mimeType?: string } = {}) {
        this.stream = stream;
        if (typeof options?.mimeType === 'string' && options.mimeType !== chosenSupportedMimeType) {
          throw new DOMException('Unsupported MediaRecorder mimeType on Android runtime', 'NotSupportedError');
        }
      }

      static isTypeSupported(candidate: string) {
        return candidate === chosenSupportedMimeType;
      }

      start() {
        this.state = 'recording';
      }

      stop() {
        if (this.state !== 'recording') return;
        this.state = 'inactive';
        const blob = new Blob([new Uint8Array([1, 2, 3, 4])], { type: chosenSupportedMimeType });
        this.ondataavailable?.({ data: blob });
        this.onstop?.();
      }
    }

    Object.defineProperty(window, 'MediaRecorder', {
      configurable: true,
      writable: true,
      value: FakeMediaRecorder,
    });

    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: async () => ({
          getTracks: () => [{ stop() {} }],
        }),
      },
    });
  }, supportedMimeType);
};

const installFakeAndroidMediaRecordingWithMultipleSupportedTypes = async (
  page: any,
  supportedMimeTypes = ['audio/webm', 'audio/ogg'],
) => {
  await page.addInitScript((chosenSupportedMimeTypes: string[]) => {
    localStorage.setItem('chat_consent_accepted', 'true');
    localStorage.setItem('age_verified', 'true');
    (window as any).__TEST_APP_ID__ = 'test-app-id';
    (window as any).__DISABLE_ANALYTICS__ = true;

    Object.defineProperty(window.navigator, 'userAgent', {
      configurable: true,
      get: () => 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    });

    (window as any).Capacitor = {
      getPlatform: () => 'android',
    };

    class FakeMediaRecorder {
      stream: any;
      state: 'inactive' | 'recording' = 'inactive';
      mimeType: string;
      ondataavailable: ((event: { data: Blob }) => void) | null = null;
      onerror: ((event: any) => void) | null = null;
      onstop: (() => void) | null = null;

      constructor(stream: any, options: { mimeType?: string } = {}) {
        this.stream = stream;
        const requestedMimeType = options?.mimeType;
        if (!requestedMimeType || !chosenSupportedMimeTypes.includes(requestedMimeType)) {
          throw new DOMException('Unsupported MediaRecorder mimeType on Android runtime', 'NotSupportedError');
        }
        this.mimeType = requestedMimeType;
      }

      static isTypeSupported(candidate: string) {
        return chosenSupportedMimeTypes.includes(candidate);
      }

      start() {
        this.state = 'recording';
      }

      stop() {
        if (this.state !== 'recording') return;
        this.state = 'inactive';
        const blob = new Blob([new Uint8Array([1, 2, 3, 4])], { type: this.mimeType });
        this.ondataavailable?.({ data: blob });
        this.onstop?.();
      }
    }

    Object.defineProperty(window, 'MediaRecorder', {
      configurable: true,
      writable: true,
      value: FakeMediaRecorder,
    });

    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: async () => ({
          getTracks: () => [{ stop() {} }],
        }),
      },
    });
  }, supportedMimeTypes);
};

/**
 * Simulates an Android MediaRecorder that accepts 'audio/mp4' but whose .mimeType
 * property reports 'audio/mp4;codecs=opus' after construction — matching the real-device
 * behavior that produces the "Unsupported file type: ...m4a" transcription failure.
 */
const installFakeAndroidMediaRecordingWithMp4CodecsMimeType = async (page: any) => {
  await page.addInitScript(() => {
    localStorage.setItem('chat_consent_accepted', 'true');
    localStorage.setItem('age_verified', 'true');
    (window as any).__TEST_APP_ID__ = 'test-app-id';
    (window as any).__DISABLE_ANALYTICS__ = true;

    Object.defineProperty(window.navigator, 'userAgent', {
      configurable: true,
      get: () => 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    });

    (window as any).Capacitor = {
      getPlatform: () => 'android',
    };

    class FakeMediaRecorder {
      stream: any;
      state: 'inactive' | 'recording' = 'inactive';
      mimeType = 'audio/mp4;codecs=opus';
      ondataavailable: ((event: { data: Blob }) => void) | null = null;
      onerror: ((event: any) => void) | null = null;
      onstop: (() => void) | null = null;

      constructor(stream: any, options: { mimeType?: string } = {}) {
        this.stream = stream;
        // Accepts 'audio/mp4' or no mimeType (matches Android MediaRecorder default-type behavior).
        // Any other explicit mimeType is unsupported, mirroring the real Android WebView API.
        if (options?.mimeType && options.mimeType !== 'audio/mp4') {
          throw new DOMException('Unsupported MediaRecorder mimeType on Android runtime', 'NotSupportedError');
        }
        // Even when constructed with 'audio/mp4', the real recorder reports the negotiated
        // codec in its .mimeType property — e.g. 'audio/mp4;codecs=opus'.
      }

      static isTypeSupported(candidate: string) {
        return candidate === 'audio/mp4';
      }

      start() {
        this.state = 'recording';
      }

      stop() {
        if (this.state !== 'recording') return;
        this.state = 'inactive';
        const blob = new Blob([new Uint8Array([1, 2, 3, 4])], { type: 'audio/mp4;codecs=opus' });
        this.ondataavailable?.({ data: blob });
        this.onstop?.();
      }
    }

    Object.defineProperty(window, 'MediaRecorder', {
      configurable: true,
      writable: true,
      value: FakeMediaRecorder,
    });

    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: async () => ({
          getTracks: () => [{ stop() {} }],
        }),
      },
    });
  });
};

const installFakeSpeechRecognition = async (page: any, transcript: string) => {
  await page.addInitScript((spokenText: string) => {
    class FakeSpeechRecognition {
      continuous = true;
      interimResults = true;
      lang = 'en';
      onresult: ((event: any) => void) | null = null;
      onerror: ((event: any) => void) | null = null;
      onend: (() => void) | null = null;

      start() { (window as any).__speechRecognitionStarts = ((window as any).__speechRecognitionStarts || 0) + 1; }

      stop() {
        this.onresult?.({
          resultIndex: 0,
          results: [{
            0: { transcript: spokenText },
            isFinal: true,
            length: 1,
          }],
        });
        this.onend?.();
      }

      abort() {
        this.onend?.();
      }
    }

    Object.defineProperty(window, 'SpeechRecognition', {
      configurable: true,
      writable: true,
      value: FakeSpeechRecognition,
    });
  }, transcript);
};

const installFakeAudioTranscodeSupport = async (page: any) => {
  await page.addInitScript(() => {
    const FAKE_AUDIO_SAMPLES = new Float32Array([0.1, -0.1, 0.2, -0.2]);

    class FakeAudioContext {
      sampleRate = 16000;

      decodeAudioData() {
        return Promise.resolve({
          numberOfChannels: 1,
          sampleRate: 16000,
          length: FAKE_AUDIO_SAMPLES.length,
          getChannelData: () => FAKE_AUDIO_SAMPLES,
        });
      }

      close() {
        return Promise.resolve();
      }
    }

    Object.defineProperty(window, 'AudioContext', {
      configurable: true,
      writable: true,
      value: FakeAudioContext,
    });

    Object.defineProperty(window, 'webkitAudioContext', {
      configurable: true,
      writable: true,
      value: FakeAudioContext,
    });
  });
};

test.describe('Chat voice transcription runtime flow', () => {
  test('uses browser speech recognition transcript and skips unsupported audio file transcription endpoint', async ({ page }) => {
    await installFakeMediaRecording(page, 'audio/webm');
    await installFakeSpeechRecognition(page, 'Transcript from browser speech recognition.');
    await mockApi(page);

    let uploadCount = 0;
    let invokeCount = 0;

    await page.route('**/api/**/integration-endpoints/**', async (route) => {
      const url = route.request().url();
      if (/\/integration-endpoints\/Core\/UploadFile\b/i.test(url)) uploadCount += 1;
      if (/\/integration-endpoints\/Core\/InvokeLLM\b/i.test(url)) invokeCount += 1;
      await route.continue();
    });

    await spaNavigate(page, '/Chat');
    await expect(page.locator('[data-testid="therapist-chat-input"]')).toBeVisible({ timeout: 15000 });

    await page.getByRole('button', { name: 'Record' }).click();
    await expect(page.getByRole('button', { name: 'Stop' })).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: 'Stop' }).click();

    await expect(page.getByText('Voice draft ready')).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: 'Transcribe' }).click();

    const composer = page.locator('[data-testid="therapist-chat-input"]');
    await expect(composer).toHaveValue('Transcript from browser speech recognition.', { timeout: 10000 });
    await expect(page.getByText('Transcript added to the message.')).toBeVisible({ timeout: 10000 });
    expect(uploadCount).toBe(0);
    expect(invokeCount).toBe(0);
  });

  test('transcribes uploaded recording and inserts transcript into composer without auto-send', async ({ page }) => {
    await installFakeMediaRecording(page, 'audio/webm');

    await mockApi(page);

    const captured = {
      uploadFileName: '',
      uploadMimeType: '',
      invokePayload: null as null | Record<string, any>,
      messagePostCount: 0,
    };

    await page.route('**/api/**/integration-endpoints/**', async (route) => {
      const req = route.request();
      const url = req.url();

      if (/\/integration-endpoints\/Core\/UploadFile\b/i.test(url)) {
        const rawBody = req.postData() || '';
        captured.uploadFileName = rawBody.match(/filename="([^"]+)"/i)?.[1] || '';
        captured.uploadMimeType = rawBody.match(/Content-Type:\s*([^\r\n;]+)/i)?.[1] || '';
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ file_url: 'https://files.example.com/voice-draft.webm' }),
        });
        return;
      }

      if (/\/integration-endpoints\/Core\/InvokeLLM\b/i.test(url)) {
        const body = req.postDataJSON?.() as Record<string, any>;
        captured.invokePayload = body || null;

        if (body?.response_json_schema) {
          await route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({ message: 'response_json_schema is not supported for this audio transcription path' }),
          });
          return;
        }
        if (body?.model) {
          await route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({ message: 'model override is not supported for this audio transcription path' }),
          });
          return;
        }

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify('Transcribed runtime text from voice draft.'),
        });
        return;
      }

      await route.continue();
    });

    await page.route('**/api/**/agents/conversations/**/messages**', async (route) => {
      captured.messagePostCount += 1;
      const body = route.request().postDataJSON?.() as any;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          role: 'user',
          content: String(body?.content || ''),
          created_date: new Date().toISOString(),
        }),
      });
    });

    await spaNavigate(page, '/Chat');
    await expect(page.locator('[data-testid="therapist-chat-input"]')).toBeVisible({ timeout: 15000 });

    await page.getByRole('button', { name: 'Record' }).click();
    await expect(page.getByRole('button', { name: 'Stop' })).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: 'Stop' }).click();

    await expect(page.getByText('Voice draft ready')).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: 'Transcribe' }).click();

    const composer = page.locator('[data-testid="therapist-chat-input"]');
    await expect(composer).toHaveValue('Transcribed runtime text from voice draft.', { timeout: 10000 });
    await expect(page.getByText('Transcript added to the message.')).toBeVisible({ timeout: 10000 });

    expect(captured.uploadFileName).toMatch(/^voice-draft-\d+\.webm$/);
    expect(captured.uploadMimeType).toBe('audio/webm');
    expect(captured.invokePayload).not.toBeNull();
    expect(captured.invokePayload?.file_urls).toEqual(['https://files.example.com/voice-draft.webm']);
    expect(captured.invokePayload?.model).toBeUndefined();
    expect(captured.invokePayload?.response_json_schema).toBeUndefined();
    expect(captured.messagePostCount).toBe(0);
  });

  test('retries transcription with normalized mime type when first transcription request fails', async ({ page }) => {
    await installFakeMediaRecording(page, 'audio/webm;codecs=opus');
    await mockApi(page);

    const captured = {
      uploadContentTypes: [] as string[],
      uploadCount: 0,
      invokePayloads: [] as Array<Record<string, any>>,
      invokeCount: 0,
    };

    await page.route('**/api/**/integration-endpoints/**', async (route) => {
      const req = route.request();
      const url = req.url();

      if (/\/integration-endpoints\/Core\/UploadFile\b/i.test(url)) {
        captured.uploadCount += 1;
        const rawBody = req.postData() || '';
        captured.uploadContentTypes.push(rawBody.match(/Content-Type:\s*([^\r\n]+)/i)?.[1]?.trim() || '');
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ file_url: `https://files.example.com/voice-draft-${captured.uploadCount}.webm` }),
        });
        return;
      }

      if (/\/integration-endpoints\/Core\/InvokeLLM\b/i.test(url)) {
        captured.invokeCount += 1;
        captured.invokePayloads.push((req.postDataJSON?.() as Record<string, any>) || {});

        if (captured.invokeCount === 1) {
          await route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({ message: 'unsupported file content type metadata' }),
          });
          return;
        }

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify('Recovered transcript after mime normalization.'),
        });
        return;
      }

      await route.continue();
    });

    await spaNavigate(page, '/Chat');
    await expect(page.locator('[data-testid="therapist-chat-input"]')).toBeVisible({ timeout: 15000 });

    await page.getByRole('button', { name: 'Record' }).click();
    await expect(page.getByRole('button', { name: 'Stop' })).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: 'Stop' }).click();

    await expect(page.getByText('Voice draft ready')).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: 'Transcribe' }).click();

    const composer = page.locator('[data-testid="therapist-chat-input"]');
    await expect(composer).toHaveValue('Recovered transcript after mime normalization.', { timeout: 10000 });
    await expect(page.getByText('Transcript added to the message.')).toBeVisible({ timeout: 10000 });

    expect(captured.uploadCount).toBe(2);
    expect(captured.invokeCount).toBe(2);
    expect(captured.uploadContentTypes[0]).toContain('audio/webm;codecs=opus');
    expect(captured.uploadContentTypes[1]).toBe('audio/webm');
    expect(captured.invokePayloads[0]?.file_urls).toEqual(['https://files.example.com/voice-draft-1.webm']);
    expect(captured.invokePayloads[1]?.file_urls).toEqual(['https://files.example.com/voice-draft-2.webm']);
    expect(captured.invokePayloads.every((payload) => payload?.model === undefined)).toBe(true);
    expect(captured.invokePayloads.every((payload) => payload?.response_json_schema === undefined)).toBe(true);
  });

  test('falls back to file-only transcription payload when prompt-based payload is rejected', async ({ page }) => {
    await installFakeMediaRecording(page, 'audio/webm');
    await mockApi(page);

    const captured = {
      invokePayloads: [] as Array<Record<string, any>>,
      invokeCount: 0,
    };

    await page.route('**/api/**/integration-endpoints/**', async (route) => {
      const req = route.request();
      const url = req.url();

      if (/\/integration-endpoints\/Core\/UploadFile\b/i.test(url)) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ file_url: 'https://files.example.com/voice-draft.webm' }),
        });
        return;
      }

      if (/\/integration-endpoints\/Core\/InvokeLLM\b/i.test(url)) {
        captured.invokeCount += 1;
        const body = (req.postDataJSON?.() as Record<string, any>) || {};
        captured.invokePayloads.push(body);

        if (captured.invokeCount === 1 && typeof body?.prompt === 'string') {
          await route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({ message: 'prompt is not supported for this transcription path' }),
          });
          return;
        }

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify('Transcribed using file-only fallback payload.'),
        });
        return;
      }

      await route.continue();
    });

    await spaNavigate(page, '/Chat');
    await expect(page.locator('[data-testid="therapist-chat-input"]')).toBeVisible({ timeout: 15000 });

    await page.getByRole('button', { name: 'Record' }).click();
    await expect(page.getByRole('button', { name: 'Stop' })).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: 'Stop' }).click();

    await expect(page.getByText('Voice draft ready')).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: 'Transcribe' }).click();

    const composer = page.locator('[data-testid="therapist-chat-input"]');
    await expect(composer).toHaveValue('Transcribed using file-only fallback payload.', { timeout: 10000 });
    await expect(page.getByText('Transcript added to the message.')).toBeVisible({ timeout: 10000 });

    expect(captured.invokeCount).toBe(2);
    expect(typeof captured.invokePayloads[0]?.prompt).toBe('string');
    expect(captured.invokePayloads[0]?.file_urls).toEqual(['https://files.example.com/voice-draft.webm']);
    expect(captured.invokePayloads[1]?.prompt).toBeUndefined();
    expect(captured.invokePayloads[1]?.file_urls).toEqual(['https://files.example.com/voice-draft.webm']);
    expect(captured.invokePayloads.every((payload) => payload?.model === undefined)).toBe(true);
    expect(captured.invokePayloads.every((payload) => payload?.response_json_schema === undefined)).toBe(true);
  });

  test('records and transcribes in Android runtime when recorder requires explicit supported mime type', async ({ page }) => {
    await installFakeAndroidMediaRecording(page, 'audio/mp4');
    await mockApi(page);

    const captured = {
      uploadFileName: '',
      uploadMimeType: '',
    };

    await page.route('**/api/**/integration-endpoints/**', async (route) => {
      const req = route.request();
      const url = req.url();

      if (/\/integration-endpoints\/Core\/UploadFile\b/i.test(url)) {
        const rawBody = req.postData() || '';
        captured.uploadFileName = rawBody.match(/filename="([^"]+)"/i)?.[1] || '';
        captured.uploadMimeType = rawBody.match(/Content-Type:\s*([^\r\n;]+)/i)?.[1] || '';
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ file_url: 'https://files.example.com/voice-draft.m4a' }),
        });
        return;
      }

      await route.continue();
    });

    await page.route('**/api/**/functions/**', async (route) => {
      if (/\/functions\/transcribeMobileAudio\b/i.test(route.request().url())) {
        const req = route.request();
        const rawBody = req.postData() || '';
        captured.uploadFileName = rawBody.match(/filename="([^"]+)"/i)?.[1] || '';
        captured.uploadMimeType = rawBody.match(/Content-Type:\s*([^\r\n;]+)/i)?.[1] || '';
        expect(req.headers()['content-type']).toContain('multipart/form-data; boundary=');
        expect(rawBody).toContain('name="file"');
        expect(rawBody).not.toContain('name="file_url"');
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ transcription: 'Android runtime transcript.' }),
        });
        return;
      }
      await route.continue();
    });

    await spaNavigate(page, '/Chat');
    await expect(page.locator('[data-testid="therapist-chat-input"]')).toBeVisible({ timeout: 15000 });

    await page.getByRole('button', { name: 'Record' }).click();
    await expect(page.getByRole('button', { name: 'Stop' })).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: 'Stop' }).click();

    await expect(page.getByText('Voice draft ready')).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: 'Transcribe' }).click();

    const composer = page.locator('[data-testid="therapist-chat-input"]');
    await expect(composer).toHaveValue('Android runtime transcript.', { timeout: 10000 });
    expect(captured.uploadMimeType).toBe('audio/mp4');
    expect(captured.uploadFileName).toMatch(/^voice-draft-\d+\.m4a$/);
  });

  test('uses chunk mime type for Android transcription when recorder mimeType is empty', async ({ page }) => {
    await installFakeAndroidMediaRecordingWithEmptyRecorderMimeType(page, 'audio/mp4');
    await mockApi(page);

    const captured = {
      uploadFileName: '',
      uploadMimeType: '',
    };

    await page.route('**/api/**/integration-endpoints/**', async (route) => {
      const req = route.request();
      const url = req.url();

      if (/\/integration-endpoints\/Core\/UploadFile\b/i.test(url)) {
        const rawBody = req.postData() || '';
        captured.uploadFileName = rawBody.match(/filename="([^"]+)"/i)?.[1] || '';
        captured.uploadMimeType = rawBody.match(/Content-Type:\s*([^\r\n;]+)/i)?.[1] || '';
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ file_url: 'https://files.example.com/voice-draft.m4a' }),
        });
        return;
      }

      await route.continue();
    });

    await page.route('**/api/**/functions/**', async (route) => {
      if (/\/functions\/transcribeMobileAudio\b/i.test(route.request().url())) {
        const req = route.request();
        const rawBody = req.postData() || '';
        captured.uploadFileName = rawBody.match(/filename="([^"]+)"/i)?.[1] || '';
        captured.uploadMimeType = rawBody.match(/Content-Type:\s*([^\r\n;]+)/i)?.[1] || '';
        expect(req.headers()['content-type']).toContain('multipart/form-data; boundary=');
        expect(rawBody).toContain('name="file"');
        expect(rawBody).not.toContain('name="file_url"');
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ transcription: 'Android transcript from empty recorder mime type runtime.' }),
        });
        return;
      }
      await route.continue();
    });

    await spaNavigate(page, '/Chat');
    await expect(page.locator('[data-testid="therapist-chat-input"]')).toBeVisible({ timeout: 15000 });

    await page.getByRole('button', { name: 'Record' }).click();
    await expect(page.getByRole('button', { name: 'Stop' })).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: 'Stop' }).click();

    await expect(page.getByText('Voice draft ready')).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: 'Transcribe' }).click();

    const composer = page.locator('[data-testid="therapist-chat-input"]');
    await expect(composer).toHaveValue('Android transcript from empty recorder mime type runtime.', { timeout: 10000 });
    await expect(page.getByText('Transcript added to the message.')).toBeVisible({ timeout: 10000 });
    expect(captured.uploadMimeType).toBe('audio/mp4');
    expect(captured.uploadFileName).toMatch(/^voice-draft-\d+\.m4a$/);
  });

  test('transcodes Android webm recording to wav for transcription when local transcript is unavailable', async ({ page }) => {
    await installFakeAndroidMediaRecording(page, 'audio/webm');
    await installFakeAudioTranscodeSupport(page);
    await mockApi(page);

    const captured = {
      uploadFileName: '',
      uploadMimeType: '',
    };

    await page.route('**/api/**/integration-endpoints/**', async (route) => {
      const req = route.request();
      const url = req.url();

      if (/\/integration-endpoints\/Core\/UploadFile\b/i.test(url)) {
        const rawBody = req.postData() || '';
        captured.uploadFileName = rawBody.match(/filename="([^"]+)"/i)?.[1] || '';
        captured.uploadMimeType = rawBody.match(/Content-Type:\s*([^\r\n;]+)/i)?.[1] || '';
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ file_url: 'https://files.example.com/voice-draft.wav' }),
        });
        return;
      }

      await route.continue();
    });

    await page.route('**/api/**/functions/**', async (route) => {
      if (/\/functions\/transcribeMobileAudio\b/i.test(route.request().url())) {
        const req = route.request();
        const rawBody = req.postData() || '';
        captured.uploadFileName = rawBody.match(/filename="([^"]+)"/i)?.[1] || '';
        captured.uploadMimeType = rawBody.match(/Content-Type:\s*([^\r\n;]+)/i)?.[1] || '';
        expect(req.headers()['content-type']).toContain('multipart/form-data; boundary=');
        expect(rawBody).toContain('name="file"');
        expect(rawBody).not.toContain('name="file_url"');
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ transcription: 'Android runtime transcript from transcoded wav.' }),
        });
        return;
      }
      await route.continue();
    });

    await spaNavigate(page, '/Chat');
    await expect(page.locator('[data-testid="therapist-chat-input"]')).toBeVisible({ timeout: 15000 });

    await page.getByRole('button', { name: 'Record' }).click();
    await expect(page.getByRole('button', { name: 'Stop' })).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: 'Stop' }).click();

    await expect(page.getByText('Voice draft ready')).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: 'Transcribe' }).click();

    const composer = page.locator('[data-testid="therapist-chat-input"]');
    await expect(composer).toHaveValue('Android runtime transcript from transcoded wav.', { timeout: 10000 });
    await expect(page.getByText('Transcript added to the message.')).toBeVisible({ timeout: 10000 });
    expect(captured.uploadMimeType).toBe('audio/wav');
    expect(captured.uploadFileName).toMatch(/^voice-draft-\d+\.wav$/);
  });

  test('transcodes Android mp4;codecs=opus recording to wav for transcription when local transcript is unavailable', async ({ page }) => {
    await installFakeAndroidMediaRecordingWithMp4CodecsMimeType(page);
    await installFakeAudioTranscodeSupport(page);
    await mockApi(page);

    const captured = {
      uploadFileName: '',
      uploadMimeType: '',
    };

    await page.route('**/api/**/integration-endpoints/**', async (route) => {
      const req = route.request();
      const url = req.url();

      if (/\/integration-endpoints\/Core\/UploadFile\b/i.test(url)) {
        const rawBody = req.postData() || '';
        captured.uploadFileName = rawBody.match(/filename="([^"]+)"/i)?.[1] || '';
        captured.uploadMimeType = rawBody.match(/Content-Type:\s*([^\r\n;]+)/i)?.[1] || '';
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ file_url: 'https://files.example.com/voice-draft.wav' }),
        });
        return;
      }

      await route.continue();
    });

    await page.route('**/api/**/functions/**', async (route) => {
      if (/\/functions\/transcribeMobileAudio\b/i.test(route.request().url())) {
        const req = route.request();
        const rawBody = req.postData() || '';
        captured.uploadFileName = rawBody.match(/filename="([^"]+)"/i)?.[1] || '';
        captured.uploadMimeType = rawBody.match(/Content-Type:\s*([^\r\n;]+)/i)?.[1] || '';
        expect(req.headers()['content-type']).toContain('multipart/form-data; boundary=');
        expect(rawBody).toContain('name="file"');
        expect(rawBody).not.toContain('name="file_url"');
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ transcription: 'Android runtime transcript from transcoded mp4 wav.' }),
        });
        return;
      }
      await route.continue();
    });

    await spaNavigate(page, '/Chat');
    await expect(page.locator('[data-testid="therapist-chat-input"]')).toBeVisible({ timeout: 15000 });

    await page.getByRole('button', { name: 'Record' }).click();
    await expect(page.getByRole('button', { name: 'Stop' })).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: 'Stop' }).click();

    await expect(page.getByText('Voice draft ready')).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: 'Transcribe' }).click();

    const composer = page.locator('[data-testid="therapist-chat-input"]');
    await expect(composer).toHaveValue('Android runtime transcript from transcoded mp4 wav.', { timeout: 10000 });
    await expect(page.getByText('Transcript added to the message.')).toBeVisible({ timeout: 10000 });
    expect(captured.uploadMimeType).toBe('audio/wav');
    expect(captured.uploadFileName).toMatch(/^voice-draft-\d+\.wav$/);
  });

  test('prefers Android non-webm recording mime for transcription when both ogg and webm are supported', async ({ page }) => {
    await installFakeAndroidMediaRecordingWithMultipleSupportedTypes(page, [
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/ogg',
    ]);
    await mockApi(page);

    const captured = {
      uploadFileName: '',
      uploadMimeType: '',
      publicUploadCount: 0,
    };

    await page.route('**/api/**/integration-endpoints/**', async (route) => {
      const req = route.request();
      const url = req.url();

      if (/\/integration-endpoints\/Core\/UploadFile\b/i.test(url)) {
        captured.publicUploadCount += 1;
        const rawBody = req.postData() || '';
        captured.uploadFileName = rawBody.match(/filename="([^"]+)"/i)?.[1] || '';
        captured.uploadMimeType = rawBody.match(/Content-Type:\s*([^\r\n;]+)/i)?.[1] || '';
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ file_url: 'https://files.example.com/voice-draft.ogg' }),
        });
        return;
      }

      await route.continue();
    });

    await page.route('**/api/**/functions/**', async (route) => {
      if (/\/functions\/transcribeMobileAudio\b/i.test(route.request().url())) {
        const req = route.request();
        const rawBody = req.postData() || '';
        captured.uploadFileName = rawBody.match(/filename="([^"]+)"/i)?.[1] || '';
        captured.uploadMimeType = rawBody.match(/Content-Type:\s*([^\r\n;]+)/i)?.[1] || '';
        expect(req.headers()['content-type']).toContain('multipart/form-data; boundary=');
        expect(rawBody).toContain('name="file"');
        expect(rawBody).not.toContain('name="file_url"');
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ transcription: 'Android runtime transcript from ogg fallback path.' }),
        });
        return;
      }
      await route.continue();
    });

    await spaNavigate(page, '/Chat');
    await expect(page.locator('[data-testid="therapist-chat-input"]')).toBeVisible({ timeout: 15000 });

    await page.getByRole('button', { name: 'Record' }).click();
    await expect(page.getByRole('button', { name: 'Stop' })).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: 'Stop' }).click();

    await expect(page.getByText('Voice draft ready')).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: 'Transcribe' }).click();

    const composer = page.locator('[data-testid="therapist-chat-input"]');
    await expect(composer).toHaveValue('Android runtime transcript from ogg fallback path.', { timeout: 10000 });
    await expect(page.getByText('Transcript added to the message.')).toBeVisible({ timeout: 10000 });
    expect(captured.uploadMimeType).toBe('audio/ogg');
    expect(captured.uploadFileName).toMatch(/^voice-draft-\d+\.ogg$/);
    expect(captured.publicUploadCount).toBe(0);
  });

  test('android voice-derived send posts transcript-only payload without audio attachment fields', async ({ page }) => {
    await installFakeAndroidMediaRecording(page, 'audio/mp4');
    await mockApi(page);

    const captured = {
      sentMessages: [] as Array<Record<string, any>>,
      uploadCount: 0,
    };

    await page.route('**/api/**/integration-endpoints/**', async (route) => {
      const req = route.request();
      const url = req.url();

      if (/\/integration-endpoints\/Core\/UploadFile\b/i.test(url)) {
        captured.uploadCount += 1;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ file_url: 'https://files.example.com/voice-draft.m4a' }),
        });
        return;
      }

      await route.continue();
    });

    await page.route('**/api/**/functions/**', async (route) => {
      if (/\/functions\/transcribeMobileAudio\b/i.test(route.request().url())) {
        const req = route.request();
        const rawBody = req.postData() || '';
        expect(req.headers()['content-type']).toContain('multipart/form-data; boundary=');
        expect(rawBody).toContain('name="file"');
        expect(rawBody).not.toContain('name="file_url"');
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ transcription: 'Android transcript only send body.' }),
        });
        return;
      }
      await route.continue();
    });

    await page.route('**/api/**/agents/conversations/**/messages**', async (route) => {
      const body = (route.request().postDataJSON?.() as Record<string, any>) || {};
      captured.sentMessages.push(body);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          role: 'user',
          content: String(body?.content || ''),
          created_date: new Date().toISOString(),
        }),
      });
    });

    await spaNavigate(page, '/Chat');
    await expect(page.locator('[data-testid="therapist-chat-input"]')).toBeVisible({ timeout: 15000 });

    await page.getByRole('button', { name: 'Record' }).click();
    await expect(page.getByRole('button', { name: 'Stop' })).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: 'Stop' }).click();

    await expect(page.getByText('Voice draft ready')).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: 'Transcribe' }).click();

    const composer = page.locator('[data-testid="therapist-chat-input"]');
    await expect(composer).toHaveValue('Android transcript only send body.', { timeout: 10000 });

    await composer.focus();
    await page.keyboard.press('Enter');

    await expect.poll(() => captured.sentMessages.length).toBe(1);

    const sent = captured.sentMessages[0] || {};
    expect(sent.role).toBe('user');
    expect(String(sent.content || '')).toContain('Android transcript only send body.');
    expect(String(sent.content || '')).not.toContain('[ATTACHMENT_CONTEXT]');
    expect(String(sent.content || '')).not.toContain('[ATTACHMENT_METADATA]');
    expect(sent.file_urls).toBeUndefined();
    expect(captured.uploadCount).toBe(0);
  });

  for (const runtime of ['android', 'ios']) {
    test(`${runtime} transcribes the saved file in its captured language instead of live browser text`, async ({ page }) => {
      await installFakeAndroidMediaRecordingWithMp4CodecsMimeType(page);
      if (runtime === 'ios') {
        await page.addInitScript(() => {
          Object.defineProperty(navigator, 'userAgent', { configurable: true, get: () => 'Mozilla/5.0 (iPhone) Mobile Safari/604.1' });
          (window as any).Capacitor = undefined;
        });
      }
      await installFakeSpeechRecognition(page, 'Wrong browser text in a different language.');
      await page.addInitScript(() => {
        (window as any).AudioContext = undefined;
        (window as any).webkitAudioContext = undefined;
      });
      await mockApi(page);
      const transcript = 'אני לא רוצה לבטל. נפגש ב־17:30 ביום שני, עם Zoom.';
      let fileRequests = 0;
      let messagePosts = 0;
      await page.route('**/api/**/agents/conversations/**/messages**', async route => {
        messagePosts += 1;
        await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
      });
      await page.route('**/api/**/functions/transcribeMobileAudio', async route => {
        const req = route.request();
        const form = await new Request(req.url(), { method: 'POST', headers: req.headers(), body: req.postDataBuffer()! }).formData();
        expect(form.get('language')).toBe('he');
        expect(form.get('file_url')).toBeNull();
        const file = form.get('file') as File;
        expect(file.type).toBe('audio/mp4;codecs=opus');
        expect(Array.from(new Uint8Array(await file.arrayBuffer()))).toEqual([1, 2, 3, 4]);
        fileRequests += 1;
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ transcription: transcript }) });
      });
      await spaNavigate(page, '/Chat');
      await page.evaluate(async () => {
        const { default: i18n } = await import('/src/components/i18n/i18nConfig.jsx');
        await i18n.changeLanguage('he');
      });
      const composer = page.getByTestId('therapist-chat-input');
      await composer.fill('טיוטה קיימת');
      await page.getByRole('button', { name: 'הקלטת טיוטה קולית', exact: true }).click();
      await page.getByRole('button', { name: 'עצירת ההקלטה', exact: true }).click();
      // A later UI-language change must not reinterpret an already recorded draft.
      await page.evaluate(async () => {
        const { default: i18n } = await import('/src/components/i18n/i18nConfig.jsx');
        await i18n.changeLanguage('en');
      });
      await page.getByRole('button', { name: 'Transcribe' }).click();
      await expect(composer).toHaveValue(`טיוטה קיימת\n${transcript}`);
      expect(fileRequests).toBe(1);
      expect(messagePosts).toBe(0);
      expect(await page.evaluate(() => (window as any).__speechRecognitionStarts || 0)).toBe(0);
    });

    test(`${runtime} mp4 opus draft survives backend failure and retries without uploading or auto-sending`, async ({ page }) => {
      await installFakeAndroidMediaRecordingWithMp4CodecsMimeType(page);
      if (runtime === 'ios') {
        await page.addInitScript(() => {
          Object.defineProperty(navigator, 'userAgent', { configurable: true, get: () => 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1' });
          (window as any).Capacitor = undefined;
        });
      }
      // Match a WebView that cannot decode MP4/Opus locally: preserve original bytes.
      await page.addInitScript(() => {
        (window as any).AudioContext = undefined;
        (window as any).webkitAudioContext = undefined;
      });
      await mockApi(page);
      let recover = false;
      let publicUploads = 0;
      let messagePosts = 0;
      const submittedBodies: string[] = [];
      await page.route('**/api/**/integration-endpoints/Core/UploadFile', async route => {
        publicUploads += 1;
        await route.fulfill({ status: 500, body: '{}' });
      });
      await page.route('**/api/**/agents/conversations/**/messages**', async route => {
        messagePosts += 1;
        await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
      });
      await page.route('**/api/**/functions/transcribeMobileAudio', async route => {
        const req = route.request();
        expect(req.headers()['content-type']).toContain('multipart/form-data; boundary=');
        submittedBodies.push(req.postData() || '');
        await route.fulfill({
          status: recover ? 200 : 503,
          contentType: 'application/json',
          body: JSON.stringify(recover ? { transcription: 'Recovered mobile recording.' } : { error: 'Temporary service failure' }),
        });
      });
      await spaNavigate(page, '/Chat');
      const composer = page.getByTestId('therapist-chat-input');
      await composer.fill('Existing draft');
      await page.getByRole('button', { name: 'Record' }).click();
      await page.getByRole('button', { name: 'Stop' }).click();
      await expect(page.getByText('Voice draft ready')).toBeVisible();
      await page.getByRole('button', { name: 'Transcribe' }).click();
      await expect(page.getByText('Audio transcription failed', { exact: true })).toBeVisible();
      await expect(composer).toHaveValue('Existing draft');
      await expect(page.getByText('Voice draft ready')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Transcribe' })).toBeEnabled();
      const failureAttempts = submittedBodies.length;
      expect(failureAttempts).toBeGreaterThan(0);
      expect(submittedBodies[0]).toContain('Content-Type: audio/mp4;codecs=opus');
      recover = true;
      await page.getByRole('button', { name: 'Transcribe' }).click();
      await expect(composer).toHaveValue('Existing draft\nRecovered mobile recording.');
      expect(submittedBodies.length).toBeGreaterThan(failureAttempts);
      expect(submittedBodies.every(body => body.includes('name="file"') && !body.includes('name="file_url"'))).toBe(true);
      expect(publicUploads).toBe(0);
      expect(messagePosts).toBe(0);
      if (runtime === 'android') {
        await expect(page.getByText('Voice draft ready')).not.toBeVisible();
      } else {
        await expect(page.getByText('Voice draft ready')).toBeVisible();
      }
    });
  }

  test('toast close button dismisses and mobile toast layout is less intrusive', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await installFakeAndroidMediaRecording(page, 'audio/mp4');
    await installFakeSpeechRecognition(page, 'Transcript from browser speech recognition.');
    await mockApi(page);
    await page.route('**/api/**/functions/transcribeMobileAudio', route => route.fulfill({
      status: 200, contentType: 'application/json', body: JSON.stringify({ transcription: 'Transcript from saved recording.' }),
    }));

    await spaNavigate(page, '/Chat');
    await expect(page.locator('[data-testid="therapist-chat-input"]')).toBeVisible({ timeout: 15000 });

    await page.getByRole('button', { name: 'Record' }).click();
    await expect(page.getByRole('button', { name: 'Stop' })).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: 'Stop' }).click();

    await expect(page.getByText('Voice draft ready')).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: 'Transcribe' }).click();
    const toastMessage = page.getByText('Transcript added to the message.');
    await expect(toastMessage).toBeVisible({ timeout: 10000 });

    const toastMetrics = await page.locator('button[toast-close]').first().evaluate((button) => {
      const toastElement = button.closest('.group');
      if (!toastElement) return null;
      const rect = toastElement.getBoundingClientRect();
      return {
        width: rect.width,
        top: rect.top,
        height: rect.height,
      };
    });
    const viewport = page.viewportSize();
    expect(toastMetrics).not.toBeNull();
    expect(viewport).not.toBeNull();
    expect(toastMetrics!.width).toBeLessThan(viewport!.width - 8);
    expect(toastMetrics!.top).toBeGreaterThan(viewport!.height * 0.45);
    expect(toastMetrics!.height).toBeLessThan(viewport!.height * 0.3);

    const closeButton = page.locator('button[toast-close]').first();
    const hasTouch = Boolean((testInfo.project.use as { hasTouch?: boolean } | undefined)?.hasTouch);
    if (hasTouch) {
      await closeButton.tap();
    } else {
      await closeButton.click();
    }
    await expect(toastMessage).not.toBeVisible({ timeout: 5000 });
  });
});
