// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import AccessibilityManager from '../../src/components/accessibility/AccessibilityManager.jsx';

vi.mock('react-router-dom', () => ({ useLocation: () => ({ pathname: '/Journal' }) }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ i18n: { resolvedLanguage: 'en', language: 'en' } }) }));

let root;
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  root = undefined;
  vi.useRealTimers();
  document.body.innerHTML = '';
  delete globalThis.IS_REACT_ACT_ENVIRONMENT;
});

it('does not move focus behind an open modal while its focused control is replaced', async () => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  vi.useFakeTimers();
  document.body.innerHTML = '<main tabindex="-1"><h1>Journal</h1></main><div role="dialog" aria-modal="true" data-state="open"><button>Save</button></div><div id="manager"></div>';
  const main = document.querySelector('main');
  const dialog = document.querySelector('[role="dialog"]');
  dialog.querySelector('button').focus();
  root = createRoot(document.querySelector('#manager'));
  await act(async () => root.render(React.createElement(AccessibilityManager)));
  // Saving removes the focused button before the dialog restores focus.
  dialog.querySelector('button').remove();
  expect(document.activeElement).toBe(document.body);
  await act(async () => vi.advanceTimersByTimeAsync(1100));
  expect(document.activeElement).not.toBe(main);

  // Ordinary route focus still works once the modal is gone.
  dialog.remove();
  main.querySelector('h1').textContent = 'Your Saved Journal Entry';
  await act(async () => vi.advanceTimersByTimeAsync(500));
  expect(document.activeElement).toBe(main);
});
