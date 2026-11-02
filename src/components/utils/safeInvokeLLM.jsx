import { base44 } from '@/api/base44Client';
import { detectCrisisLanguage } from './crisisDetector';
import i18n from '../i18n/i18nConfig';
import { getCurrentAppLocale } from '../i18n/appLocale';

// Map i18n language codes to natural language names for AI prompts
const LANGUAGE_NAMES = {
  en: 'English',
  he: 'Hebrew',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  it: 'Italian',
  pt: 'Portuguese'
};

/**
 * Safe wrapper around base44.integrations.Core.InvokeLLM
 * Applies client-side risk gate for user-message-driven calls
 * 
 * @param {Object} params - InvokeLLM parameters
 * @param {string} params.prompt - The user prompt
 * @param {boolean} params.add_context_from_internet - Optional
 * @param {Object} params.response_json_schema - Optional JSON schema
 * @param {string|Array} params.file_urls - Optional file URLs
 * @param {boolean} skipRiskGate - Internal flag to bypass risk check (for system prompts)
 * @returns {Promise} - InvokeLLM response
 * @throws {Error} - If crisis language detected or API error
 */
export async function safeInvokeLLM(params, skipRiskGate = false) {
  // Risk gate check for user-driven prompts
  if (!skipRiskGate && params.prompt && detectCrisisLanguage(params.prompt)) {
    const error = new Error('CRISIS_LANGUAGE_DETECTED');
    error.isCrisisError = true;
    throw error;
  }

  // Inject user's selected language into every AI prompt
  const lang = getCurrentAppLocale(i18n);
  const langName = LANGUAGE_NAMES[lang] || 'English';
  const langInstruction = lang !== 'en'
    ? `IMPORTANT: You must respond entirely in ${langName}. All text, labels, and content must be in ${langName}.\n\n`
    : '';

  const enrichedParams = langInstruction
    ? { ...params, prompt: langInstruction + params.prompt }
    : params;

  // Pass through to actual InvokeLLM
  return await base44.integrations.Core.InvokeLLM(enrichedParams);
}

/**
 * Check if an error is a crisis detection error
 * @param {Error} error 
 * @returns {boolean}
 */
export function isCrisisError(error) {
  return error?.isCrisisError === true || error?.message === 'CRISIS_LANGUAGE_DETECTED';
}