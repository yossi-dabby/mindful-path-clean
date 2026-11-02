import { describe, it, expect } from 'vitest';
import { translations } from '../../src/components/i18n/translations.jsx';

const LANGUAGES = ['en', 'he', 'es', 'fr', 'de', 'it', 'pt'];

describe('translations', () => {
  it('all 7 languages are present in the translations object', () => {
    for (const lng of LANGUAGES) {
      expect(translations[lng], `Missing language: ${lng}`).toBeDefined();
      expect(translations[lng].translation, `Missing translation key for: ${lng}`).toBeDefined();
    }
  });

  it('all languages have core sidebar navigation keys', () => {
    const coreKeys = ['home', 'chat', 'coach', 'mood', 'journal', 'progress', 'exercises'];
    for (const lng of LANGUAGES) {
      const sidebar = translations[lng].translation.sidebar;
      expect(sidebar, `Missing sidebar for ${lng}`).toBeDefined();
      for (const key of coreKeys) {
        expect(sidebar[key]?.name, `Missing sidebar.${key}.name for ${lng}`).toBeTruthy();
      }
    }
  });

  it('all languages have settings language labels for all 7 languages', () => {
    const langCodes = ['en', 'he', 'es', 'fr', 'de', 'it', 'pt'];
    for (const lng of LANGUAGES) {
      const langSettings = translations[lng].translation.settings?.language;
      expect(langSettings, `Missing settings.language for ${lng}`).toBeDefined();
      for (const code of langCodes) {
        expect(langSettings[code], `Missing settings.language.${code} for ${lng}`).toBeTruthy();
      }
    }
  });

  it('new languages (fr, de, it, pt) have mind_games interactive game UI in their own language', () => {
    const newLangs = {
      fr: { memory_match_title: 'Correspondance de Mémoire', moves: 'Mouvements' },
      de: { memory_match_title: 'Gedächtnis-Match', moves: 'Züge' },
      it: { memory_match_title: 'Abbinamento di Memoria', moves: 'Mosse' },
      pt: { memory_match_title: 'Combinação de Memória', moves: 'Movimentos' },
    };
    for (const [lng, expected] of Object.entries(newLangs)) {
      const mindGames = translations[lng].translation.mind_games;
      expect(mindGames, `Missing mind_games for ${lng}`).toBeDefined();
      expect(mindGames.memory_match?.title, `Wrong memory_match title for ${lng}`)
        .toBe(expected.memory_match_title);
      expect(mindGames.memory_match?.moves, `Wrong memory_match moves for ${lng}`)
        .toBe(expected.moves);
    }
  });

  it('new languages (fr, de, it, pt) have translated focus_flow game strings', () => {
    const expected = {
      fr: 'Flux de Concentration',
      de: 'Fokus-Fluss',
      it: 'Flusso di Concentrazione',
      pt: 'Fluxo de Foco',
    };
    for (const [lng, title] of Object.entries(expected)) {
      const focusFlow = translations[lng].translation.mind_games?.focus_flow;
      expect(focusFlow?.title, `Wrong focus_flow title for ${lng}`).toBe(title);
    }
  });

  it('new languages (fr, de, it, pt) have translated number_sequence game strings', () => {
    const expected = {
      fr: 'Séquence de Nombres',
      de: 'Zahlenfolge',
      it: 'Sequenza di Numeri',
      pt: 'Sequência Numérica',
    };
    for (const [lng, title] of Object.entries(expected)) {
      const numSeq = translations[lng].translation.mind_games?.number_sequence;
      expect(numSeq?.title, `Wrong number_sequence title for ${lng}`).toBe(title);
    }
  });

  it('English remains unaffected with English game strings', () => {
    const mindGames = translations.en.translation.mind_games;
    expect(mindGames.memory_match?.title).toBe('Memory Match');
    expect(mindGames.memory_match?.moves).toBe('Moves');
    expect(mindGames.focus_flow?.title).toBe('Focus Flow');
    expect(mindGames.number_sequence?.title).toBe('Number Sequence');
  });

  it('all languages have daily_check_in core UI keys translated', () => {
    const coreKeys = ['title', 'complete_title', 'step1_question', 'step2_question', 'step3_question',
      'intensity_low', 'intensity_high', 'emotions_label', 'intensity_label',
      'category_positive', 'category_intermediate', 'category_negative',
      'btn_return', 'btn_continue', 'btn_complete', 'delete_confirm'];
    for (const lng of LANGUAGES) {
      const dci = translations[lng].translation.daily_check_in;
      expect(dci, `Missing daily_check_in for ${lng}`).toBeDefined();
      for (const key of coreKeys) {
        expect(dci[key], `Missing daily_check_in.${key} for ${lng}`).toBeTruthy();
      }
    }
  });

  it('all languages have daily_check_in mood translations', () => {
    const moodKeys = ['excellent', 'good', 'okay', 'low', 'very_low'];
    for (const lng of LANGUAGES) {
      const moods = translations[lng].translation.daily_check_in?.moods;
      expect(moods, `Missing daily_check_in.moods for ${lng}`).toBeDefined();
      for (const key of moodKeys) {
        expect(moods[key], `Missing daily_check_in.moods.${key} for ${lng}`).toBeTruthy();
      }
    }
  });

  it('all languages have daily_check_in emotion translations', () => {
    const emotionSample = ['Happy', 'Sad', 'Anxious', 'Peaceful', 'Confused'];
    for (const lng of LANGUAGES) {
      const emotions = translations[lng].translation.daily_check_in?.emotions;
      expect(emotions, `Missing daily_check_in.emotions for ${lng}`).toBeDefined();
      for (const emotion of emotionSample) {
        expect(emotions[emotion], `Missing daily_check_in.emotions.${emotion} for ${lng}`).toBeTruthy();
      }
    }
  });

  it('all languages have all 7 starter_path day_themes with title and description', () => {
    for (const lng of LANGUAGES) {
      const dayThemes = translations[lng].translation.starter_path?.day_themes;
      expect(dayThemes, `Missing starter_path.day_themes for ${lng}`).toBeDefined();
      for (let day = 1; day <= 7; day++) {
        expect(dayThemes[day]?.title, `Missing starter_path.day_themes.${day}.title for ${lng}`).toBeTruthy();
        expect(dayThemes[day]?.description, `Missing starter_path.day_themes.${day}.description for ${lng}`).toBeTruthy();
      }
    }
  });

  it('all languages have starter_path card button keys including card_btn_review', () => {
    const btnKeys = ['card_btn_continue', 'card_btn_review', 'card_btn_start', 'card_btn_starting'];
    for (const lng of LANGUAGES) {
      const starterPath = translations[lng].translation.starter_path;
      expect(starterPath, `Missing starter_path for ${lng}`).toBeDefined();
      for (const key of btnKeys) {
        expect(starterPath[key], `Missing starter_path.${key} for ${lng}`).toBeTruthy();
      }
    }
  });

  it('all languages have thought_coach new translation keys', () => {
    const newKeys = [
      'go_back_step_aria', 'go_back_nav_aria', 'step_label',
      'step_details_situation_label', 'step_details_thoughts_label', 'step_details_emotions_label',
      'step_intensity_label', 'step_analysis_subtitle', 'step_analysis_cbt_note',
      'step_analysis_balanced_label', 'step_analysis_balanced_optional'
    ];
    for (const lng of LANGUAGES) {
      const tc = translations[lng].translation.thought_coach;
      expect(tc, `Missing thought_coach for ${lng}`).toBeDefined();
      for (const key of newKeys) {
        expect(tc[key], `Missing thought_coach.${key} for ${lng}`).toBeTruthy();
      }
    }
  });

  it('all languages have thought_coach thought_types with label and description for all 10 types', () => {
    const typeKeys = [
      'fear_anxiety', 'self_criticism', 'catastrophizing', 'guilt_shame', 'anger_resentment',
      'social_anxiety', 'perfectionism', 'overthinking', 'hopelessness', 'other'
    ];
    for (const lng of LANGUAGES) {
      const tc = translations[lng].translation.thought_coach;
      expect(tc?.thought_types, `Missing thought_coach.thought_types for ${lng}`).toBeDefined();
      for (const typeKey of typeKeys) {
        expect(tc.thought_types[typeKey]?.label, `Missing thought_coach.thought_types.${typeKey}.label for ${lng}`).toBeTruthy();
        expect(tc.thought_types[typeKey]?.description, `Missing thought_coach.thought_types.${typeKey}.description for ${lng}`).toBeTruthy();
      }
    }
  });

  it('all languages have thought_coach emotion_options for all 13 emotions', () => {
    const emotionKeys = [
      'anxious', 'worried', 'sad', 'angry', 'frustrated', 'guilty', 'ashamed',
      'hopeless', 'overwhelmed', 'confused', 'scared', 'lonely', 'disappointed'
    ];
    for (const lng of LANGUAGES) {
      const tc = translations[lng].translation.thought_coach;
      expect(tc?.emotion_options, `Missing thought_coach.emotion_options for ${lng}`).toBeDefined();
      for (const emotionKey of emotionKeys) {
        expect(tc.emotion_options[emotionKey], `Missing thought_coach.emotion_options.${emotionKey} for ${lng}`).toBeTruthy();
      }
    }
  });

  it('all languages have mind_games memory_match title and moves keys', () => {
    for (const lng of LANGUAGES) {
      const mindGames = translations[lng].translation.mind_games;
      expect(mindGames, `Missing mind_games for ${lng}`).toBeDefined();
      expect(mindGames.memory_match?.title, `Missing mind_games.memory_match.title for ${lng}`).toBeTruthy();
      expect(mindGames.memory_match?.moves, `Missing mind_games.memory_match.moves for ${lng}`).toBeTruthy();
    }
  });

  it('all languages have mind_games focus_flow and number_sequence title keys', () => {
    for (const lng of LANGUAGES) {
      const mindGames = translations[lng].translation.mind_games;
      expect(mindGames?.focus_flow?.title, `Missing mind_games.focus_flow.title for ${lng}`).toBeTruthy();
      expect(mindGames?.number_sequence?.title, `Missing mind_games.number_sequence.title for ${lng}`).toBeTruthy();
    }
  });

  it('Hebrew has translated mind_games memory_match, focus_flow and number_sequence keys', () => {
    const he = translations.he.translation.mind_games;
    expect(he.memory_match?.title).toBe('התאמת זיכרון');
    expect(he.memory_match?.moves).toBeTruthy();
    expect(he.focus_flow?.title).toBe('זרימת מיקוד');
    expect(he.number_sequence?.title).toBe('רצף מספרים');
  });

  it('Spanish has translated mind_games memory_match, focus_flow and number_sequence keys', () => {
    const es = translations.es.translation.mind_games;
    expect(es.memory_match?.title).toBe('Emparejamiento de Memoria');
    expect(es.memory_match?.moves).toBe('Movimientos');
    expect(es.focus_flow?.title).toBe('Flujo de Enfoque');
    expect(es.number_sequence?.title).toBe('Secuencia Numérica');
  });

  it('all languages have mind_games content section with all game content keys', () => {
    const contentKeys = [
      'thought_quiz', 'reframe_pick', 'value_compass', 'tiny_experiment',
      'quick_win', 'calm_bingo', 'dbt_stop', 'opposite_action',
      'urge_surfing', 'worry_time', 'evidence_balance', 'defusion_cards',
      'tipp_skills', 'accepts', 'improve', 'self_soothe'
    ];
    for (const lng of LANGUAGES) {
      const content = translations[lng].translation.mind_games?.content;
      expect(content, `Missing mind_games.content for ${lng}`).toBeDefined();
      for (const key of contentKeys) {
        expect(content[key], `Missing mind_games.content.${key} for ${lng}`).toBeDefined();
      }
    }
  });

  it('all languages have mind_games content sub-keys (items/values/presets/tiles/etc.)', () => {
    for (const lng of LANGUAGES) {
      const content = translations[lng].translation.mind_games?.content;
      expect(content?.thought_quiz?.items, `Missing mind_games.content.thought_quiz.items for ${lng}`).toBeTruthy();
      expect(content?.thought_quiz?.advanced, `Missing mind_games.content.thought_quiz.advanced for ${lng}`).toBeTruthy();
      expect(content?.reframe_pick?.items, `Missing mind_games.content.reframe_pick.items for ${lng}`).toBeTruthy();
      expect(content?.value_compass?.values, `Missing mind_games.content.value_compass.values for ${lng}`).toBeTruthy();
      expect(content?.tiny_experiment?.items, `Missing mind_games.content.tiny_experiment.items for ${lng}`).toBeTruthy();
      expect(content?.quick_win?.presets, `Missing mind_games.content.quick_win.presets for ${lng}`).toBeTruthy();
      expect(content?.calm_bingo?.tiles, `Missing mind_games.content.calm_bingo.tiles for ${lng}`).toBeTruthy();
      expect(content?.dbt_stop?.prompts, `Missing mind_games.content.dbt_stop.prompts for ${lng}`).toBeTruthy();
      expect(content?.opposite_action?.items, `Missing mind_games.content.opposite_action.items for ${lng}`).toBeTruthy();
      expect(content?.urge_surfing?.beginner, `Missing mind_games.content.urge_surfing.beginner for ${lng}`).toBeTruthy();
      expect(content?.urge_surfing?.advanced, `Missing mind_games.content.urge_surfing.advanced for ${lng}`).toBeTruthy();
      expect(content?.worry_time?.items, `Missing mind_games.content.worry_time.items for ${lng}`).toBeTruthy();
      expect(content?.evidence_balance?.items, `Missing mind_games.content.evidence_balance.items for ${lng}`).toBeTruthy();
      expect(content?.defusion_cards?.cards, `Missing mind_games.content.defusion_cards.cards for ${lng}`).toBeTruthy();
      expect(content?.tipp_skills?.situation, `Missing mind_games.content.tipp_skills.situation for ${lng}`).toBeTruthy();
      expect(content?.tipp_skills?.skills, `Missing mind_games.content.tipp_skills.skills for ${lng}`).toBeTruthy();
      expect(content?.tipp_skills?.actions, `Missing mind_games.content.tipp_skills.actions for ${lng}`).toBeTruthy();
      expect(content?.accepts?.items, `Missing mind_games.content.accepts.items for ${lng}`).toBeTruthy();
      expect(content?.improve?.items, `Missing mind_games.content.improve.items for ${lng}`).toBeTruthy();
      expect(content?.self_soothe?.senses, `Missing mind_games.content.self_soothe.senses for ${lng}`).toBeTruthy();
    }
  });
});
