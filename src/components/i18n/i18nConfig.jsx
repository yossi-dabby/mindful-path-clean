import { applyStage6UiTranslations } from './stage6UiTranslations';
import i18n from 'i18next';
import { applyToolsStage5UiTranslations } from './toolsStage5UiTranslations';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { translations } from './translations';
import { applyMindGamesTranslations } from './translationsBuilder';
import { applyChatUiTranslations } from './chatUiTranslations';
import { applyCoachUiTranslations } from './coachUiTranslations';
import { applyMoodUiTranslations } from './moodUiTranslations';
import { applyJournalUiTranslations } from './journalUiTranslations';
import { applyProgressUiTranslations } from './progressUiTranslations';
import { applyCommunityUiTranslations } from './communityUiTranslations';
import { applyResourcesUiTranslations } from './resourcesUiTranslations';
import { applySettingsUiTranslations } from './settingsUiTranslations';
import { applyStarterPathUiTranslations } from './starterPathUiTranslations';
import { applyRecommendationsUiTranslations } from './recommendationsUiTranslations';
import { applyMindGamesPremiumTranslations } from './mindGamesPremiumTranslations';
import { applyHomePracticeUiTranslations } from './homePracticeUiTranslations';
import { applyStageBUiTranslations } from './stageBUiTranslations';
import {
  applyAppLocaleSideEffects,
  applyAppLocaleToDocument,
  getCurrentAppLocale,
  resolveInitialAppLocale
} from './appLocale';

// Apply mind games UI + content translations to all languages
applyMindGamesTranslations(translations);
applyMindGamesPremiumTranslations(translations);
applyChatUiTranslations(translations);
applyCoachUiTranslations(translations);
applyMoodUiTranslations(translations);
applyJournalUiTranslations(translations);
applyProgressUiTranslations(translations);
applyCommunityUiTranslations(translations);
applyResourcesUiTranslations(translations);
applySettingsUiTranslations(translations);
applyStarterPathUiTranslations(translations);
applyRecommendationsUiTranslations(translations);
applyStageBUiTranslations(translations);
applyHomePracticeUiTranslations(translations);
applyToolsStage5UiTranslations(translations);
applyStage6UiTranslations(translations);

/**
 * Convert a dot-notation key into a human-readable fallback label.
 * e.g. "community.page_title" → "Page Title"
 */
function keyToHumanFallback(key) {
  const leaf = key.split('.').pop() || key;
  return leaf
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: translations,
    fallbackLng: 'en',
    lng: resolveInitialAppLocale(),
    
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage']
    },
    
    interpolation: {
      escapeValue: false
    },
    
    react: {
      useSuspense: false
    },

    // Warn on missing keys and return a human-readable fallback instead of raw key strings
    saveMissing: true,
    missingKeyHandler: (lngs, ns, key) => {
      if (!import.meta.env.PROD) {
        console.warn(`[i18n] Missing translation key: "${key}" (langs: ${lngs.join(', ')}, ns: ${ns})`);
      }
    },
    parseMissingKeyHandler: (key) => keyToHumanFallback(key),
  });

// Save language changes to localStorage
i18n.on('languageChanged', (lng) => {
  applyAppLocaleSideEffects(lng);
});

// Set initial language metadata on load through the same canonical resolver.
applyAppLocaleToDocument(getCurrentAppLocale(i18n));

export default i18n;
