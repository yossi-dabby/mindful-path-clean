// This module applies mind games UI and content translations to the main translations object
import { mindGamesUiStrings, mindGamesUiByLanguage } from './mindGamesUiTranslations';
import { mindGamesContentByLanguage } from './mindGamesContentTranslations';
import { mindGamesHelpStrings, mindGamesHelpByLanguage } from './mindGamesHelpTranslations';

const gameKeys = [
  'common','quick_win','opposite_action','urge_surfing','value_compass','tiny_experiment',
  'worry_time','dbt_stop','defusion_cards','calm_bingo','tipp_skills','accepts','improve',
  'self_soothe','memory_match','focus_flow','pattern_shift','word_association','number_sequence',
  'reframe_pick','evidence_balance','mountain_meditation','check_the_facts','pros_and_cons',
  'values_check','expansion','leaves_on_stream','half_smile','willing_hands'
];

const contentKeys = [
  'thought_quiz','reframe_pick','value_compass','tiny_experiment','quick_win','calm_bingo',
  'dbt_stop','opposite_action','urge_surfing','worry_time','evidence_balance','defusion_cards',
  'tipp_skills','accepts','improve','self_soothe'
];

// Injects missing common keys that components reference via t('common.next') / t('common.finish')
const commonKeysByLanguage = {
  en: { next: 'Next', finish: 'Finish' },
  he: { next: 'הבא', finish: 'סיום' },
  es: { next: 'Siguiente', finish: 'Finalizar' },
  fr: { next: 'Suivant', finish: 'Terminer' },
  de: { next: 'Weiter', finish: 'Fertig' },
  it: { next: 'Avanti', finish: 'Fine' },
  pt: { next: 'Próximo', finish: 'Concluir' },
};

export function applyMindGamesTranslations(translations) {
  // Game IDs that have a `title` field in mindGamesUiStrings / mindGamesUiByLanguage
  const gameTitleKeys = [
    'memory_match', 'focus_flow', 'pattern_shift', 'word_association', 'number_sequence'
  ];

  ['en', 'he', 'es', 'fr', 'de', 'it', 'pt'].forEach((lng) => {
    const current = translations[lng]?.translation?.mind_games || {};
    const lngUi = mindGamesUiByLanguage[lng] || {};
    const lngContent = mindGamesContentByLanguage[lng] || {};
    const merged = { ...current };

    // Merge UI strings (buttons, labels, prompts)
    gameKeys.forEach(key => {
      merged[key] = { ...(current[key] || {}), ...(mindGamesUiStrings[key] || {}), ...(lngUi[key] || {}) };
    });

    // Also propagate title strings into mind_games.games.<id>.title so that
    // t('mind_games.games.memory_match.title') etc. resolve correctly.
    const currentGames = merged.games || {};
    gameTitleKeys.forEach(key => {
      const title = (lngUi[key] || mindGamesUiStrings[key] || {}).title;
      if (title) {
        currentGames[key] = { ...(currentGames[key] || {}), title };
      }
    });
    merged.games = currentGames;

    // Merge translated game content (items, values, tiles, etc.)
    contentKeys.forEach(key => {
      if (lngContent[key]) {
        merged.content = { ...(merged.content || {}), [key]: lngContent[key] };
      }
    });

    // Merge help strings into mind_games.help
    const lngHelp = mindGamesHelpByLanguage[lng] || {};
    const helpMerged = { ...mindGamesHelpStrings, ...lngHelp };
    // Per-game: override each game's help data with language-specific version
    const gameIds = Object.keys(mindGamesHelpStrings).filter(k =>
      !['purpose_label','how_to_play_label','benefits_label','play_button','technique_label'].includes(k)
    );
    gameIds.forEach(gid => {
      if (lngHelp[gid]) helpMerged[gid] = { ...mindGamesHelpStrings[gid], ...lngHelp[gid] };
    });
    merged.help = helpMerged;

    translations[lng].translation.mind_games = merged;

    // Inject common.next / common.finish if missing (for step-based games)
    const commonKeys = commonKeysByLanguage[lng] || commonKeysByLanguage.en;
    const existingCommon = translations[lng].translation.common || {};
    if (!existingCommon.next || !existingCommon.finish) {
      translations[lng].translation.common = {
        ...existingCommon,
        next: existingCommon.next || commonKeys.next,
        finish: existingCommon.finish || commonKeys.finish,
      };
    }
  });

  return translations;
}