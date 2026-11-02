import { describe, expect, it } from "vitest";
import { EXERCISE_CONTENT_BATCH_5A_IDS, EXERCISE_CONTENT_TRANSLATIONS_BATCH_5A } from "../../src/components/exercises/exerciseContentTranslationsBatch5A.js";
import { localizeExercise, localizeExerciseCollection } from "../../src/components/exercises/exerciseLocalization.js";

const LOCALES = ["en","he","es","fr","de","it","pt"];
const FIELDS = ["title","description","tags","steps","benefits","tips"];

describe("P1 wave 3 exercise content batch 5A", () => {
  it("contains seven planned exercises in seven locales", () => {
    expect(EXERCISE_CONTENT_BATCH_5A_IDS).toHaveLength(7);
    for (const id of EXERCISE_CONTENT_BATCH_5A_IDS) {
      expect(Object.keys(EXERCISE_CONTENT_TRANSLATIONS_BATCH_5A[id]).sort()).toEqual([...LOCALES].sort());
    }
  });

  it("keeps complete, aligned, single-language content", () => {
    for (const id of EXERCISE_CONTENT_BATCH_5A_IDS) {
      const translations = EXERCISE_CONTENT_TRANSLATIONS_BATCH_5A[id];
      const stepCount = translations.en.steps.length;
      for (const locale of LOCALES) {
        const value = translations[locale];
        expect(Object.keys(value).sort()).toEqual([...FIELDS].sort());
        expect(value.title.trim().length).toBeGreaterThan(2);
        expect(value.description.trim().length).toBeGreaterThan(20);
        expect(value.tags.length).toBeGreaterThanOrEqual(4);
        expect(value.steps).toHaveLength(stepCount);
        expect(value.benefits).toHaveLength(3);
        expect(value.tips.length).toBeGreaterThanOrEqual(2);
        value.steps.forEach((step) => {
          expect(step.title.trim().length).toBeGreaterThan(1);
          expect(step.description.trim().length).toBeGreaterThan(9);
        });
        if (locale !== "en") expect(value.title).not.toBe(translations.en.title);
      }
    }
  });

  it("resolves local ids and the API canonical title centrally", () => {
    for (const id of EXERCISE_CONTENT_BATCH_5A_IDS) {
      for (const locale of LOCALES) {
        expect(localizeExercise({ id, title: "source", language: "en" }, locale).title)
          .toBe(EXERCISE_CONTENT_TRANSLATIONS_BATCH_5A[id][locale].title);
      }
    }
    const localized = localizeExerciseCollection([
      { id: "69519590cc9f81fd9daed0b2", title: "Mindful Walking Meditation", category: "mindfulness", language: "en" }
    ], "he");
    expect(localized[0].title).toBe("מדיטציית הליכה מודעת");
    expect(localized[0].content_language).toBe("he");
  });

  it("keeps explicit physical and emergency safeguards", () => {
    for (const locale of LOCALES) {
      expect(EXERCISE_CONTENT_TRANSLATIONS_BATCH_5A["local-stress-progressive-muscle"][locale].tips.join(" ").length).toBeGreaterThan(60);
      expect(EXERCISE_CONTENT_TRANSLATIONS_BATCH_5A["69519590cc9f81fd9daed0b2"][locale].tips.join(" ").length).toBeGreaterThan(80);
      expect(EXERCISE_CONTENT_TRANSLATIONS_BATCH_5A["local-stress-problem-solving"][locale].tips.join(" ").length).toBeGreaterThan(70);
    }
  });
});
