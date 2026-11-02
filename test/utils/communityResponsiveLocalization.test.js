import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { applyCommunityUiTranslations } from '../../src/components/i18n/communityUiTranslations.js';

const read = (path) => readFileSync(new URL('../../' + path, import.meta.url), 'utf8');
const languages = ['en', 'he', 'es', 'fr', 'de', 'it', 'pt'];

describe('Community production UX and privacy safeguards', () => {
  it('installs a complete Community UI pack for all supported languages', () => {
    const translations = Object.fromEntries(languages.map((language) => [language, { translation: {} }]));
    applyCommunityUiTranslations(translations);
    for (const language of languages) {
      const pack = translations[language].translation.community_ui;
      expect(pack.page.load_error).toBeTruthy();
      expect(pack.post.title).toBeTruthy();
      expect(pack.group.title).toBeTruthy();
      expect(pack.share.title).toBeTruthy();
      expect(pack.moderation.title).toBeTruthy();
      expect(Object.keys(pack.categories)).toHaveLength(7);
      expect(Object.keys(pack.group_categories)).toHaveLength(10);
      expect(Object.keys(pack.progress_types)).toHaveLength(6);
    }
  });

  it('applies the Community pack during i18n bootstrap', () => {
    const source = read('src/components/i18n/i18nConfig.jsx');
    expect(source).toContain("import { applyCommunityUiTranslations } from './communityUiTranslations'");
    expect(source).toContain('applyCommunityUiTranslations(translations)');
  });

  it('uses authenticated server functions for reactions and group membership counts', () => {
    const page = read('src/pages/Community.jsx');
    expect(page).toContain("functions.invoke('toggleCommunityReaction'");
    expect(page).toContain("functions.invoke('joinCommunityGroup'");
    expect(page).not.toContain('entities.ForumPost.update(post.id');
    expect(page).not.toContain('entities.CommunityGroup.update(group.id');
    const reaction = read('base44/functions/toggleCommunityReaction/entry.ts');
    const join = read('base44/functions/joinCommunityGroup/entry.ts');
    expect(reaction).toContain('base44.auth.me()');
    expect(reaction).toContain('asServiceRole.entities[entityName].update');
    expect(join).toContain('PRIVATE_GROUP_REQUIRES_APPROVAL');
    expect(join).toContain('member_count = members.length');
  });

  it('restricts moderation controls to administrators', () => {
    const page = read('src/pages/Community.jsx');
    expect(page).toContain("userQuery.data?.role === 'admin'");
    expect(page).not.toContain('onModerate={() => setModeratingPost(post)}');
  });

  it('keeps the page responsive and exposes loading and failure states', () => {
    const page = read('src/pages/Community.jsx');
    expect(page).toContain('data-testid="community-page"');
    expect(page).toContain('grid-cols-3');
    expect(page).toContain('sm:grid-cols-3');
    expect(page).toContain('md:grid-cols-2');
    expect(page).toContain('isError');
    expect(page).toContain('aria-label={t(\'community_ui.page.search_label\')}');
  });

  it('keeps every Community form accessible and mobile-safe', () => {
    const shell = read('src/components/community/CommunityDialogShell.jsx');
    expect(shell).toContain('<PremiumDialog label={title}');
    expect(read('src/components/ui/PremiumDialog.jsx')).toContain('aria-modal="true"');
    expect(shell).toContain('onClose={onClose} localEscape');
    expect(shell).toContain('max-h-[92dvh]');
    for (const file of ['ForumPostForm.jsx','GroupForm.jsx','ProgressShareForm.jsx','ModerationTools.jsx']) {
      const source = read(`src/components/community/${file}`);
      expect(source).toContain('CommunityDialogShell');
      expect(source).toContain('community_ui.');
    }
  });

  it('renders nested category drawers above Community dialogs', () => {
    const drawer = read('src/components/ui/drawer.jsx');
    const select = read('src/components/ui/bottom-sheet-select.jsx');
    const shell = read('src/components/community/CommunityDialogShell.jsx');
    expect(drawer).toContain('z-[100]');
    expect(drawer).toContain('z-[101]');
    expect(select).toContain('aria-haspopup="dialog"');
    expect(select).toContain('bottom-sheet-select-options');
    expect(shell).toContain('layer={70}');
    expect(read('src/components/ui/PremiumDialog.jsx')).toContain('!isTopDialog()');
  });

  it('removes dead card navigation and provides inline expansion', () => {
    const post = read('src/components/community/ForumPostCard.jsx');
    const group = read('src/components/community/GroupCard.jsx');
    expect(post).not.toContain('onView');
    expect(group).not.toContain('onView');
    expect(post).toContain('aria-expanded');
    expect(group).toContain('aria-expanded');
  });
});
