import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path) => readFileSync(path, 'utf8');

describe('App store readiness warning contracts', () => {
  const bottomSheetSelect = read('src/components/ui/bottom-sheet-select.jsx');
  const chunkForm = read('src/components/knowledge/ChunkForm.jsx');
  const chunkList = read('src/components/knowledge/ChunkList.jsx');
  const riskPanel = read('src/components/chat/InlineRiskPanel.jsx');

  it('uses mobile-safe accessible selection controls', () => {
    expect(chunkForm).toContain("import BottomSheetSelect");
    expect(chunkList).toContain("import BottomSheetSelect");
    expect(chunkForm).not.toContain("components/ui/select");
    expect(chunkList).not.toContain("components/ui/select");
    expect((chunkForm.match(/<BottomSheetSelect/g) || [])).toHaveLength(3);
    expect((chunkList.match(/<BottomSheetSelect/g) || [])).toHaveLength(2);
    expect(bottomSheetSelect).toContain("'min-h-12 w-full");
    expect(bottomSheetSelect).toContain('aria-label={ariaLabel || title}');
    expect(bottomSheetSelect).toContain('role="listbox"');
    expect(bottomSheetSelect).toContain('role="option"');
    expect(bottomSheetSelect).toContain('aria-selected={isSelected}');
    expect(riskPanel).toContain('min-h-12 w-full rounded-xl');
  });

  it('optimistically updates notifications with rollback and reconciliation', () => {
    const source = read('src/components/notifications/NotificationBell.jsx');
    expect((source.match(/onMutate:/g) || [])).toHaveLength(3);
    expect((source.match(/onError:/g) || [])).toHaveLength(3);
    expect((source.match(/onSettled:/g) || [])).toHaveLength(3);
  });

  it('optimistically updates playlist operations with rollback', () => {
    const files = [
      'src/components/playlists/AddToPlaylistModal.jsx',
      'src/components/playlists/CreatePlaylistModal.jsx',
      'src/pages/Playlists.jsx',
      'src/pages/PlaylistDetail.jsx'
    ];
    for (const path of files) {
      const source = read(path);
      expect(source, path).toContain('onMutate:');
      expect(source, path).toContain('onError:');
      expect(source, path).toContain('onSettled:');
    }
  });

  it('optimistically completes daily challenges with rollback', () => {
    const source = read('src/components/gamification/DailyChallenges.jsx');
    expect(source).toContain('onMutate:');
    expect(source).toContain("queryKey = ['dailyChallenges', today]");
    expect(source).toContain('onError:');
    expect(source).toContain('onSettled:');
  });

  it('optimistically updates coaching action plans with rollback', () => {
    const source = read('src/components/coaching/ActionPlanPanel.jsx');
    expect(source).toContain('onMutate:');
    expect(source).toContain('previousSession');
    expect(source).toContain("sessionKey = ['coachingSession', session.id]");
    expect(source).toContain('onError:');
    expect(source).toContain('onSettled:');
  });

  it('optimistically updates journey starts and step progress with rollback', () => {
    const journeys = read('src/pages/Journeys.jsx');
    const detail = read('src/components/journeys/JourneyDetail.jsx');
    expect(journeys).toContain('onMutate:');
    expect(journeys).toContain('optimisticProgress');
    expect(journeys).toContain('onError:');
    expect(journeys).toContain('onSettled:');
    expect(detail).toContain('const optimisticProgress');
    expect(detail).toContain('const previousProgress');
    expect(detail).toContain('setLocalProgress(previousProgress)');
    expect(detail).toContain("invalidateQueries({ queryKey: ['journey_progress'] })");
  });
});
