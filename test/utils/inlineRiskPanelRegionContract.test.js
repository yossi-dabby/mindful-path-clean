import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const ROOT = path.resolve(process.cwd());
const PANEL_PATH = path.join(ROOT, 'src/components/chat/InlineRiskPanel.jsx');
const RESOURCES_PATH = path.join(ROOT, 'src/lib/emergencyResources.js');
const panelSource = fs.readFileSync(PANEL_PATH, 'utf8');
const resourceSource = fs.readFileSync(RESOURCES_PATH, 'utf8');

const mockState = vi.hoisted(() => {
  const normalize = (value) => {
    if (typeof value !== 'string') return null;
    const normalized = value.trim().toUpperCase();
    return ['US', 'IL', 'ES', 'FR', 'DE', 'IT', 'PT'].includes(normalized) ? normalized : null;
  };

  const state = {
    language: 'en',
    storedRegion: null,
    writeStoredEmergencyRegion: vi.fn((storage, region) => normalize(region)),
    clearStoredEmergencyRegion: vi.fn(() => null),
    readStoredEmergencyRegion: vi.fn(() => state.storedRegion),
    getEmergencyResources: vi.fn((region) => {
      const normalized = normalize(region);
      const resources = {
        US: {
          hotlineLabel: 'Crisis Hotline',
          hotlineNumber: '988 (US)',
          textLabel: 'Crisis Text Line',
          textNumber: 'Text "HELLO" to 741741',
          emergencyLabel: 'Emergency',
          emergencyNumber: '911 / 112',
        },
        IL: {
          hotlineLabel: 'קו עזרה למשבר (ערן)',
          hotlineNumber: '1201',
          textLabel: 'קו חירום כללי',
          textNumber: '101 (מד"א) / 100 (משטרה)',
          emergencyLabel: 'חירום',
          emergencyNumber: '101 / 112',
        },
      };
      return normalized ? resources[normalized] ?? { hotlineLabel: normalized, hotlineNumber: normalized, textLabel: normalized, textNumber: normalized, emergencyLabel: normalized, emergencyNumber: normalized } : null;
    }),
    normalizeEmergencyRegion: vi.fn((value) => normalize(value)),
  };

  return state;
});

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    i18n: { language: mockState.language },
  }),
}));

vi.mock('../../src/lib/app-params.js', () => ({
  appParams: { appId: null },
}));

vi.mock('../../src/components/ui/button.jsx', () => ({
  Button: ({ children, ...props }) => React.createElement('button', props, children),
}));

vi.mock('../../src/components/ui/card.jsx', () => ({
  Card: ({ children, ...props }) => React.createElement('div', props, children),
}));

vi.mock('../../src/lib/emergencyResources.js', () => ({
  SUPPORTED_EMERGENCY_REGIONS: ['US', 'IL', 'ES', 'FR', 'DE', 'IT', 'PT'],
  normalizeEmergencyRegion: mockState.normalizeEmergencyRegion,
  readStoredEmergencyRegion: mockState.readStoredEmergencyRegion,
  writeStoredEmergencyRegion: mockState.writeStoredEmergencyRegion,
  clearStoredEmergencyRegion: mockState.clearStoredEmergencyRegion,
  getEmergencyResources: mockState.getEmergencyResources,
}));

import InlineRiskPanel from '../../src/components/chat/InlineRiskPanel.jsx';

function renderPanel({ language = 'en', storedRegion = null } = {}) {
  mockState.language = language;
  mockState.storedRegion = storedRegion;
  return renderToStaticMarkup(React.createElement(InlineRiskPanel, { onDismiss: () => {} }));
}

describe('InlineRiskPanel region contract', () => {
  beforeEach(() => {
    mockState.language = 'en';
    mockState.storedRegion = null;
    mockState.readStoredEmergencyRegion.mockClear();
    mockState.writeStoredEmergencyRegion.mockClear();
    mockState.clearStoredEmergencyRegion.mockClear();
    mockState.getEmergencyResources.mockClear();
    mockState.normalizeEmergencyRegion.mockClear();
  });

  it('imports the explicit emergency region utility', () => {
    expect(panelSource).toContain("from '../../lib/emergencyResources.js'");
  });

  it('keeps country-specific numbers out of language-copy objects', () => {
    expect(panelSource).not.toContain('988 (US)');
    expect(panelSource).not.toContain('1201');
    expect(panelSource).not.toContain('024 (España)');
    expect(panelSource).not.toContain('3114 (France)');
  });

  it('does not introduce geolocation, timezone, IP lookup, or locale-to-country inference', () => {
    const combinedSource = `${panelSource}\n${resourceSource}`;

    expect(combinedSource).not.toContain('navigator.geolocation');
    expect(combinedSource).not.toContain('navigator.language');
    expect(combinedSource).not.toContain('navigator.languages');
    expect(combinedSource).not.toContain('timeZone');
    expect(combinedSource).not.toContain('ipinfo');
    expect(combinedSource).not.toContain('ipapi');
    expect(combinedSource).not.toContain('fetch(');
  });

  it('renders generic guidance and the global directory in the unknown-region state', () => {
    const markup = renderPanel({ language: 'en', storedRegion: null });

    expect(markup).toContain('data-testid="emergency-generic-guidance"');
    expect(markup).toContain('Contact local emergency services immediately or go to the nearest emergency department.');
    expect(markup).toContain('data-testid="emergency-global-directory"');
    expect(markup).toContain('https://findahelpline.com/');
    expect(markup).toContain('target="_blank"');
    expect(markup).toContain('rel="noopener noreferrer"');
  });

  it('renders local resources only when a valid selected region exists', () => {
    const unknownMarkup = renderPanel({ language: 'en', storedRegion: null });
    const localMarkup = renderPanel({ language: 'en', storedRegion: 'IL' });

    expect(unknownMarkup).not.toContain('data-testid="emergency-local-resources"');
    expect(localMarkup).toContain('data-testid="emergency-local-resources"');
    expect(localMarkup).toContain('1201');
  });

  it('includes all required emergency region test ids', () => {
    for (const testId of [
      'emergency-region-select',
      'emergency-region-current',
      'emergency-region-change',
      'emergency-global-directory',
      'emergency-generic-guidance',
      'emergency-local-resources',
    ]) {
      expect(panelSource).toContain(`data-testid="${testId}"`);
    }
  });

  it('shows no country-specific hotline when English has no stored region', () => {
    const markup = renderPanel({ language: 'en', storedRegion: null });

    expect(markup).not.toContain('988 (US)');
    expect(markup).not.toContain('1201');
  });

  it('shows no country-specific hotline when Hebrew has no stored region', () => {
    const markup = renderPanel({ language: 'he', storedRegion: null });

    expect(markup).not.toContain('1201');
    expect(markup).not.toContain('988 (US)');
  });

  it('renders Israeli resources for English UI when IL is stored', () => {
    const markup = renderPanel({ language: 'en', storedRegion: 'IL' });

    expect(markup).toContain('Resources for Israel');
    expect(markup).toContain('1201');
    expect(markup).toContain('101 / 112');
  });

  it('renders US resources for Hebrew UI when US is stored', () => {
    const markup = renderPanel({ language: 'he', storedRegion: 'US' });

    expect(markup).toContain('משאבים עבור');
    expect(markup).toContain('988 (US)');
    expect(markup).toContain('911 / 112');
    expect(markup).not.toContain('1201');
  });

  it('does not overwrite the selected region when the UI language changes', () => {
    const englishMarkup = renderPanel({ language: 'en', storedRegion: 'IL' });
    const hebrewMarkup = renderPanel({ language: 'he', storedRegion: 'IL' });

    expect(englishMarkup).toContain('1201');
    expect(hebrewMarkup).toContain('1201');
    expect(mockState.writeStoredEmergencyRegion).not.toHaveBeenCalled();
  });

  it('falls back to generic guidance when stored region is invalid', () => {
    const markup = renderPanel({ language: 'en', storedRegion: null });

    expect(markup).toContain('data-testid="emergency-generic-guidance"');
    expect(markup).not.toContain('988 (US)');
  });

  it('reads the stored region synchronously and avoids async loading gates', () => {
    expect(panelSource).toContain('useState(() => readStoredEmergencyRegion())');
    expect(panelSource).not.toContain('useEffect(');
    expect(panelSource).not.toContain('setTimeout(');
  });
});
