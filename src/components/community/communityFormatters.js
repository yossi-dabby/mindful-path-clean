export function formatCommunityTime(value, t) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return '';
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return t('community_ui.time.just_now');
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return t('community_ui.time.minutes', { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t('community_ui.time.hours', { count: hours });
  return t('community_ui.time.days', { count: Math.floor(hours / 24) });
}

export const forumCategoryKey = (value) => `community_ui.categories.${value || 'general'}`;
export const groupCategoryKey = (value) => `community_ui.group_categories.${value || 'other'}`;
export const progressTypeKey = (value) => `community_ui.progress_types.${value || 'mood_improvement'}`;
