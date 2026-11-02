import {describe,it,expect} from 'vitest';
import {toolsStage5UiCopy,applyToolsStage5UiTranslations} from '../../src/components/i18n/toolsStage5UiTranslations';

describe('Tools Stage 5 localized interface',()=>{
  for(const language of ['en','he','es','fr','de','it','pt'])it(`has complete interpolatable copy for ${language}`,()=>{
    const resources=Object.fromEntries(Object.keys(toolsStage5UiCopy).map(key=>[key,{translation:{existing:'retained'}}]));
    applyToolsStage5UiTranslations(resources);
    expect(Object.keys(resources[language].translation.tools_stage5).sort()).toEqual(Object.keys(toolsStage5UiCopy.en).sort());
    expect(resources[language].translation.existing).toBe('retained');
    for(const [key,value] of Object.entries(toolsStage5UiCopy[language])){
      expect(value.trim().length,key).toBeGreaterThan(0);
      expect((value.match(/{{\w+}}/g)||[]).sort(),key).toEqual((toolsStage5UiCopy.en[key].match(/{{\w+}}/g)||[]).sort());
    }
  });
});
