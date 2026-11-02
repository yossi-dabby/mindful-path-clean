import {describe,it,expect,vi} from 'vitest';
import {createPreferenceWriter} from '../../src/lib/userPreferenceWriter';
import {APPEARANCE_PALETTES,applyAppearancePalette} from '../../src/lib/appearancePalettes';
import {stage6UiCopy} from '../../src/components/i18n/stage6UiTranslations';

describe('preference patch persistence',()=>{
 it('serializes concurrent controls against fresh state and preserves unrelated preferences',async()=>{
  let user={id:'qa',preferences:{unknown:'keep',theme:'default'}};let inFlight=0,max=0;
  const auth={me:vi.fn(async()=>structuredClone(user)),updateMe:vi.fn(async data=>{inFlight++;max=Math.max(max,inFlight);await Promise.resolve();user={...user,...data};inFlight--;return structuredClone(user);})};
  const save=createPreferenceWriter(auth);
  await Promise.all([save({data_retention_days:90},'qa'),save({notifications:{dailyReminders:true}},'qa'),save({language:'he'},'qa')]);
  expect(max).toBe(1);expect(user.preferences).toEqual({unknown:'keep',theme:'default',data_retention_days:90,notifications:{dailyReminders:true},language:'he'});
 });
 it('recovers the queue after a failed request without persisting its optimistic value',async()=>{
  const user={id:'qa',preferences:{theme:'ocean'}};
  const auth={me:async()=>user,updateMe:vi.fn().mockRejectedValueOnce(new Error('offline')).mockImplementation(async data=>({...user,...data}))};
  const save=createPreferenceWriter(auth);
  await expect(save({theme:'forest'},'qa')).rejects.toThrow('offline');
  expect((await save({language:'he'},'qa')).preferences).toEqual({theme:'ocean',language:'he'});
 });
 it('rejects a queued patch when the signed-in identity changes',async()=>{
  const auth={me:async()=>({id:'different',preferences:{}}),updateMe:vi.fn()};
  await expect(createPreferenceWriter(auth)({theme:'ocean'},'qa')).rejects.toThrow('Profile changed');expect(auth.updateMe).not.toHaveBeenCalled();
 });
 it('does not report a saved server value as failed when local storage is unavailable',async()=>{
  const auth={me:async()=>({id:'qa',preferences:{}}),updateMe:async data=>({id:'qa',...data})};
  await expect(createPreferenceWriter(auth,()=>{throw new Error('quota');})({theme:'ocean'},'qa')).resolves.toMatchObject({preferences:{theme:'ocean'}});
 });
});
it('uses the same canonical palette on selection and initialization, including unknown fallback',()=>{
 const setProperty=vi.fn();vi.stubGlobal('document',{documentElement:{dataset:{},style:{setProperty}}});
 for(const [id,colors] of Object.entries(APPEARANCE_PALETTES)){applyAppearancePalette(id);expect(setProperty).toHaveBeenLastCalledWith('--color-accent',colors.accent);}
 applyAppearancePalette('unknown');expect(setProperty).toHaveBeenCalledWith('--color-primary',APPEARANCE_PALETTES.default.primary);vi.unstubAllGlobals();
});
it('provides every stage-six UI message in all seven languages with matching interpolation tokens',()=>{
 expect(Object.keys(stage6UiCopy).sort()).toEqual(['de','en','es','fr','he','it','pt']);
 for(const copy of Object.values(stage6UiCopy)){
  expect(Object.keys(copy).sort()).toEqual(Object.keys(stage6UiCopy.en).sort());
  for(const [key,value] of Object.entries(copy)){expect(value.trim(),key).not.toBe('');expect(value.match(/{{[^}]+}}/g)||[]).toEqual(stage6UiCopy.en[key].match(/{{[^}]+}}/g)||[]);}
 }
});
