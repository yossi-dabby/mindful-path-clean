import { describe, expect, it } from "vitest";
import { EXERCISE_CONTENT_BATCH_5B_IDS, EXERCISE_CONTENT_TRANSLATIONS_BATCH_5B } from "../../src/components/exercises/exerciseContentTranslationsBatch5B.js";
import { localizeExercise, localizeExerciseCollection } from "../../src/components/exercises/exerciseLocalization.js";
const LOCALES=["en","he","es","fr","de","it","pt"];
const FIELDS=["title","description","tags","steps","benefits","tips"];

describe("P1 wave 3 exercise content batch 5B",()=>{
  it("contains seven API exercises in seven locales",()=>{
    expect(EXERCISE_CONTENT_BATCH_5B_IDS).toHaveLength(7);
    for(const id of EXERCISE_CONTENT_BATCH_5B_IDS) expect(Object.keys(EXERCISE_CONTENT_TRANSLATIONS_BATCH_5B[id]).sort()).toEqual([...LOCALES].sort());
  });
  it("keeps complete aligned localized content",()=>{
    for(const id of EXERCISE_CONTENT_BATCH_5B_IDS){
      const translations=EXERCISE_CONTENT_TRANSLATIONS_BATCH_5B[id];
      const count=translations.en.steps.length;
      for(const locale of LOCALES){
        const value=translations[locale];
        expect(Object.keys(value).sort()).toEqual([...FIELDS].sort());
        expect(value.title.trim().length).toBeGreaterThan(2);
        expect(value.description.trim().length).toBeGreaterThan(20);
        expect(value.tags.length).toBeGreaterThanOrEqual(4);
        expect(value.steps).toHaveLength(count);
        expect(value.benefits).toHaveLength(3);
        expect(value.tips.length).toBeGreaterThanOrEqual(2);
        value.steps.forEach(step=>{expect(step.title.trim().length).toBeGreaterThan(1);expect(step.description.trim().length).toBeGreaterThan(9);});
        if(locale!=="en") expect(value.title).not.toBe(translations.en.title);
      }
    }
  });
  it("resolves API ids and canonical titles through the central resolver",()=>{
    for(const id of EXERCISE_CONTENT_BATCH_5B_IDS){
      for(const locale of LOCALES){
        expect(localizeExercise({id,title:"source",language:"en"},locale).title).toBe(EXERCISE_CONTENT_TRANSLATIONS_BATCH_5B[id][locale].title);
      }
    }
    const collection=localizeExerciseCollection([{id:"api-copy",title:"Safe Place Visualization",category:"mindfulness",language:"en"}],"he");
    expect(collection[0].title).toBe("דמיון מודרך של מקום בטוח");
    expect(collection[0].content_language).toBe("he");
  });
  it("preserves safeguards in higher-sensitivity exercises",()=>{
    for(const locale of LOCALES){
      expect(EXERCISE_CONTENT_TRANSLATIONS_BATCH_5B["69519590cc9f81fd9daed0ba"][locale].tips.join(" ").length).toBeGreaterThan(90);
      expect(EXERCISE_CONTENT_TRANSLATIONS_BATCH_5B["69b11c0f9b78b21b9c2351ef"][locale].tips.join(" ").length).toBeGreaterThan(90);
      expect(EXERCISE_CONTENT_TRANSLATIONS_BATCH_5B["69519590cc9f81fd9daed0af"][locale].tips.join(" ").length).toBeGreaterThan(80);
    }
  });
});
