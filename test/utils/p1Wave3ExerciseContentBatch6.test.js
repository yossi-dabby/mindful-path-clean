import { describe, expect, it } from "vitest";
import { EXERCISE_CONTENT_BATCH_6_IDS, EXERCISE_CONTENT_TRANSLATIONS_BATCH_6 } from "../../src/components/exercises/exerciseContentTranslationsBatch6.js";
import { localizeExercise } from "../../src/components/exercises/exerciseLocalization.js";

const LOCALES = ["en", "he", "es", "fr", "de", "it", "pt"];
const FIELDS = ["title", "description", "tags", "steps", "benefits", "tips"];

const API_CASES = [
  ["69505184bc1ccb9021bc3962", "Body Scan Meditation"],
  ["69505184bc1ccb9021bc3961", "Behavioral Activation"],
  ["69505184bc1ccb9021bc395e", "5-4-3-2-1 Grounding"],
  ["69505868395719979d90c8bd", "5-4-3-2-1 Grounding Technique"],
  ["69505868395719979d90c8c0", "Scheduled Worry Time"],
  ["69505868395719979d90c8be", "Cognitive Reframing Worksheet"],
  ["69519590cc9f81fd9daed0b1", "Five Senses Grounding"],
  ["69519590cc9f81fd9daed0ae", "Full Body Scan Meditation"],
  ["69519590cc9f81fd9daed0b3", "Thought Record Challenge"],
  ["69519590cc9f81fd9daed0b9", "Pleasure-Mastery Balance"],
  ["69b11c0f9b78b21b9c2351ee", "Urge Surfing Basics"]
];

describe("P1 wave 3 API exercise parity batch 6", () => {
  it("covers exactly the eleven user-visible English API cards", () => {
    expect(EXERCISE_CONTENT_BATCH_6_IDS).toEqual(API_CASES.map(([id]) => id));
  });

  it("provides complete aligned content in all seven locales", () => {
    for (const id of EXERCISE_CONTENT_BATCH_6_IDS) {
      const translations = EXERCISE_CONTENT_TRANSLATIONS_BATCH_6[id];
      expect(Object.keys(translations).sort()).toEqual([...LOCALES].sort());
      const stepCount = translations.en.steps.length;
      for (const locale of LOCALES) {
        const value = translations[locale];
        expect(Object.keys(value).sort()).toEqual([...FIELDS].sort());
        expect(value.title.trim().length).toBeGreaterThan(2);
        expect(value.description.trim().length).toBeGreaterThan(20);
        expect(value.tags.length).toBeGreaterThanOrEqual(3);
        expect(value.steps).toHaveLength(stepCount);
        expect(value.benefits.length).toBeGreaterThanOrEqual(3);
        expect(value.tips.length).toBeGreaterThanOrEqual(1);
        if (locale !== "en") expect(value.title).not.toBe(translations.en.title);
      }
    }
  });

  it("resolves every live API id and canonical title centrally", () => {
    for (const [id, title] of API_CASES) {
      for (const locale of LOCALES) {
        const byId = localizeExercise({ id, title, language: "en" }, locale);
        const byTitle = localizeExercise({ id: `copy-${id}`, title, language: "en" }, locale);
        expect(byId.title).toBe(EXERCISE_CONTENT_TRANSLATIONS_BATCH_6[id][locale].title);
        expect(byTitle.title).toBe(EXERCISE_CONTENT_TRANSLATIONS_BATCH_6[id][locale].title);
        expect(byId.content_language).toBe(locale);
        expect(byId.localization_available).toBe(true);
      }
    }
  });

  it("does not mix English titles into Hebrew results", () => {
    for (const [id, title] of API_CASES) {
      const localized = localizeExercise({ id, title, language: "en" }, "he");
      expect(localized.title).not.toBe(title);
      expect(localized.content_language).toBe("he");
    }
  });
});
