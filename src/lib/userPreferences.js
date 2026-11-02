import { base44 } from '@/api/base44Client';

import { createPreferenceWriter } from './userPreferenceWriter';

export const saveUserPreferences = createPreferenceWriter(base44.auth, preferences => {
  const previous = JSON.parse(sessionStorage.getItem('user_prefs_loaded') || '{}');
  sessionStorage.setItem('user_prefs_loaded', JSON.stringify({ ...previous, theme: preferences.theme || previous.theme || 'default', lang: preferences.language || previous.lang }));
});
