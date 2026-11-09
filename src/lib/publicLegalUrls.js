// This existing public service serves information pages without the Base44
// application's sign-in gate. Changing its host requires a deployment review.
export const PUBLIC_INFORMATION_ORIGIN = 'https://mindful-path-production-7704.up.railway.app';
export const PUBLIC_INFORMATION_PATHS = ['/privacy', '/terms', '/contact', '/account-deletion', '/data-deletion'];
export const INFORMATION_LANGUAGES = ['en', 'he', 'es', 'fr', 'de', 'it', 'pt'];

export function publicLegalUrl(path, language = 'en') {
  if (!PUBLIC_INFORMATION_PATHS.includes(path)) throw new Error('Unknown information page');
  const normalized = String(language).toLowerCase().split('-')[0];
  const lang = INFORMATION_LANGUAGES.includes(normalized) ? normalized : 'en';
  return `${PUBLIC_INFORMATION_ORIGIN}${path}?lang=${lang}`;
}
