import { test, expect, type Page } from '@playwright/test';
import { prepareChatStage2, openStage2Conversation } from '../helpers/chatStage2';

const detail = /\/api\/.*\/agents\/conversations\/(?:v2\/)?qa-chat-stage2(?:[/?]|$)/;
const list = /\/api\/.*\/agents\/conversations(?:\?|$)/;
const draft = 'Synthetic unsent draft — keep this text.';

async function openMenu(page: Page) {
  await page.getByTestId('chat-refresh-menu').click();
}
async function refresh(page: Page) {
  await openMenu(page);
  await page.getByRole('menuitem', { name: 'Refresh conversation', exact: true }).click();
}
function appendReply(state: any, suffix: string) {
  const now = new Date().toISOString();
  state.conversation.messages.push(
    { id: `user-${suffix}`, role: 'user', content: `Synthetic saved question ${suffix}.`, created_date: now },
    { id: `assistant-${suffix}`, role: 'assistant', content: `Synthetic saved response ${suffix}.`, status: 'completed', metadata: { completed: true }, created_date: now },
  );
}
async function setup(page: Page, project: string) {
  const width = project === 'web-desktop' ? 1440 : 390;
  const state = await prepareChatStage2(page, { width });
  await openStage2Conversation(page, width);
  return { state, width };
}

test('manual refresh retrieves new messages without a page reload or loss of draft/attachment', async ({ page }, info) => {
  const { state } = await setup(page, info.project.name);
  const input = page.getByTestId('therapist-chat-input');
  await input.fill(draft);
  await page.locator('input[type=file]').setInputFiles({ name: 'synthetic-notes.txt', mimeType: 'text/plain', buffer: Buffer.from('Synthetic test only') });
  const origin = await page.evaluate(() => performance.timeOrigin);
  const writes = state.writes.length;
  appendReply(state, 'manual');
  await refresh(page);
  await expect(page.getByRole('log')).toContainText('Synthetic saved response manual.');
  await expect(input).toHaveValue(draft);
  await expect(page.getByText('synthetic-notes.txt', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => performance.timeOrigin)).toBe(origin);
  expect(state.writes).toHaveLength(writes);
  expect(state.requests.filter(request => request.startsWith('POST'))).toHaveLength(0);
});

for (const event of ['online', 'focus', 'visibilitychange', 'mindfulpath:native-app-state']) {
  test(`return/reconnect refreshes an idle conversation on ${event}`, async ({ page }, info) => {
    const { state } = await setup(page, info.project.name);
    await page.getByTestId('therapist-chat-input').fill(draft);
    appendReply(state, event);
    await page.evaluate(eventName => {
      if (eventName === 'visibilitychange') {
        Object.defineProperty(document, 'hidden', { configurable: true, value: true });
        document.dispatchEvent(new Event(eventName));
        Object.defineProperty(document, 'hidden', { configurable: true, value: false });
        document.dispatchEvent(new Event(eventName));
      } else if (eventName === 'mindfulpath:native-app-state') {
        window.dispatchEvent(new CustomEvent(eventName, { detail: { isActive: true } }));
      } else window.dispatchEvent(new Event(eventName));
    }, event);
    await expect(page.getByRole('log')).toContainText(`Synthetic saved response ${event}.`);
    await expect(page.getByTestId('therapist-chat-input')).toHaveValue(draft);
    expect(state.requests.filter(request => request.startsWith('POST'))).toHaveLength(0);
  });
}

test('a failed refresh keeps visible messages and the draft; retry recovers', async ({ page }, info) => {
  const { state } = await setup(page, info.project.name);
  let fail = true;
  await page.route(detail, route => fail ? route.fulfill({ status: 503, json: { message: 'Synthetic read failure' } }) : route.fulfill({ json: state.conversation }));
  await page.getByTestId('therapist-chat-input').fill(draft);
  await refresh(page);
  const error = page.getByTestId('chat-load-error');
  await expect(error).toBeVisible();
  await expect(page.getByRole('log')).toContainText('One small step is enough.');
  await expect(page.getByTestId('therapist-chat-input')).toHaveValue(draft);
  fail = false; appendReply(state, 'retry');
  await error.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByRole('log')).toContainText('Synthetic saved response retry.');
  await expect(error).toHaveCount(0);
  await expect(page.getByTestId('therapist-chat-input')).toHaveValue(draft);
});

test('failed conversation selection offers retry instead of clearing the screen', async ({ page }, info) => {
  const width = info.project.name === 'web-desktop' ? 1440 : 390;
  const state = await prepareChatStage2(page, { width });
  let fail = true;
  await page.route(detail, route => fail ? route.fulfill({ status: 503, json: { message: 'Synthetic read failure' } }) : route.fulfill({ json: state.conversation }));
  await page.getByTestId('therapist-chat-input').fill(draft);
  await page.getByRole('button', { name: 'Open conversations sidebar', exact: true }).click();
  await page.getByRole('button', { name: /^QA stage 2 conversation/ }).click();
  const error = page.getByTestId('chat-load-error');
  await expect(error).toBeVisible();
  await expect(page.getByTestId('therapist-chat-input')).toHaveValue(draft);
  fail = false;
  await error.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByRole('log')).toContainText('One small step is enough.');
  await expect(error).toHaveCount(0);
});

test('list failure retains cached conversations and offers a working retry', async ({ page }, info) => {
  const { state } = await setup(page, info.project.name);
  let fail = true;
  await page.route(list, route => fail ? route.fulfill({ status: 503, json: { message: 'Synthetic list failure' } }) : route.fallback());
  await refresh(page);
  await expect(page.getByTestId('chat-load-error')).toBeVisible();
  await page.getByRole('button', { name: 'Open conversations sidebar', exact: true }).click();
  const error = page.getByTestId('chat-list-error');
  await expect(error).toBeVisible();
  await expect(page.getByRole('button', { name: /^QA stage 2 conversation/ })).toBeVisible();
  fail = false; state.conversation.metadata.name = 'Updated synthetic session';
  await error.getByRole('button', { name: 'Try again' }).click();
  await expect(error).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Updated synthetic session/ })).toBeVisible();
});

test('recording defers automatic refresh and preserves the finished audio draft', async ({ page }, info) => {
  await page.addInitScript(() => {
    let stopped = 0;
    class Recorder {
      static isTypeSupported() { return true; }
      state = 'inactive'; mimeType = 'audio/webm';
      ondataavailable: any; onstop: any;
      start() { this.state = 'recording'; }
      stop() { this.state = 'inactive'; stopped++; this.ondataavailable?.({ data: new Blob(['synthetic'], { type: this.mimeType }) }); this.onstop?.(); }
    }
    Object.defineProperty(window, 'MediaRecorder', { configurable: true, value: Recorder });
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: async () => ({ getTracks: () => [{ stop() {} }] }) } });
    (window as any).SpeechRecognition = undefined;
    (window as any).webkitSpeechRecognition = undefined;
    (window as any).__qaRecordingStops = () => stopped;
  });
  const { state } = await setup(page, info.project.name);
  await page.getByTestId('therapist-chat-input').fill(draft);
  await page.getByRole('button', { name: 'Record voice draft', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Stop recording', exact: true })).toBeVisible();
  let reads = 0;
  await page.route(detail, route => { reads++; return route.fulfill({ json: state.conversation }); });
  appendReply(state, 'after-recording');
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await openMenu(page);
  await expect(page.getByRole('menuitem', { name: 'Refresh conversation', exact: true })).toHaveAttribute('aria-disabled', 'true');
  await page.keyboard.press('Escape');
  // Beyond the 200ms lifecycle debounce: no read or microphone stop while recording.
  await page.waitForTimeout(500);
  expect(reads).toBe(0);
  expect(await page.evaluate(() => (window as any).__qaRecordingStops())).toBe(0);
  await page.getByRole('button', { name: 'Stop recording', exact: true }).click();
  await expect(page.getByRole('log')).toContainText('Synthetic saved response after-recording.');
  await expect(page.getByRole('button', { name: 'Play recording', exact: true })).toBeVisible();
  await expect(page.getByTestId('therapist-chat-input')).toHaveValue(draft);
  expect(await page.evaluate(() => (window as any).__qaRecordingStops())).toBe(1);
});
