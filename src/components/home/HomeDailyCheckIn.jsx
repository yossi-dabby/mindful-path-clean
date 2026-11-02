import React, { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import PremiumDialog from '@/components/ui/PremiumDialog';
import PremiumMoodIcon from '@/components/ui/PremiumMoodIcon';
import { Button } from '@/components/ui/button';
import { completeTimeToFirstValue } from '@/lib/timeToFirstValue';
import { saveHomeDailyCheckIn } from '@/lib/homeDailyCheckIn';

const moods = ['very_low', 'low', 'okay', 'good', 'excellent'];
const energyLevels = ['very_low', 'low', 'moderate', 'high', 'very_high'];

export default function HomeDailyCheckIn({ initialMood, onClose }) {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const inFlight = useRef(false);
  const [data, setData] = useState({
    mood: initialMood?.mood || '',
    energy_level: initialMood?.energy_level || 'moderate',
    stress_level: initialMood?.stress_level || 5,
    notes: initialMood?.notes || '',
  });
  const save = useMutation({
    mutationFn: () => saveHomeDailyCheckIn(base44, data),
    onSuccess: ({ mood, flow }) => {
      completeTimeToFirstValue({ valueType: 'checkin_saved', locale: i18n.resolvedLanguage || i18n.language });
      queryClient.setQueryData(['todayMood'], mood);
      queryClient.setQueryData(['todayFlow'], flow);
      queryClient.invalidateQueries({ queryKey: ['moodEntries'] });
      queryClient.invalidateQueries({ queryKey: ['todayExercise'] });
      queryClient.invalidateQueries({ queryKey: ['dailyRecords'] });
      onClose();
    },
  });
  const submit = async (event) => {
    event.preventDefault();
    if (!data.mood || inFlight.current) return;
    inFlight.current = true;
    try { await save.mutateAsync(); } catch (_) { /* The form retains answers and renders the error below. */ }
    finally { inFlight.current = false; }
  };
  return (
    <PremiumDialog label={t('home_practice.checkin_title')} onClose={onClose}
      className="fixed inset-0 overflow-y-auto bg-black/50 p-4 backdrop-blur-sm">
      <div className="flex min-h-full items-start justify-center py-4 sm:items-center sm:py-8">
        <form onSubmit={submit} className="w-full max-w-xl rounded-[28px] border border-border bg-card p-5 text-foreground shadow-2xl sm:p-8">
          <div className="mb-5 flex items-start justify-between gap-3">
            <h2 className="text-2xl font-semibold">{t('home_practice.checkin_title')}</h2>
            <Button type="button" variant="ghost" size="icon" aria-label={t('common.close')} onClick={onClose}><X className="h-5 w-5" /></Button>
          </div>
          <p className="mb-5 text-sm leading-relaxed text-muted-foreground">{t('home_practice.records.storage')}</p>
          <fieldset disabled={save.isPending} className="min-w-0 space-y-5">
            <fieldset>
              <legend className="mb-3 font-semibold">{t('home_practice.checkin_mood')}</legend>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {moods.map((mood) => <button key={mood} type="button" aria-pressed={data.mood === mood}
                  onClick={() => setData((current) => ({ ...current, mood }))}
                  className={`flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl border p-3 text-center text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${data.mood === mood ? 'border-primary bg-secondary' : 'border-border bg-muted'}`}>
                  <PremiumMoodIcon mood={mood} size="sm" selected={data.mood === mood} />
                  <span>{t(`onboarding.mood.${mood === 'excellent' ? 'great' : mood}`)}</span>
                </button>)}
              </div>
            </fieldset>
            <label className="block font-semibold" htmlFor="home-checkin-energy">{t('home_practice.checkin_energy')}
              <select id="home-checkin-energy" value={data.energy_level} onChange={(e) => setData((current) => ({ ...current, energy_level: e.target.value }))}
                className="mt-2 block min-h-11 w-full rounded-xl border border-border bg-card p-3 font-normal text-foreground">
                {energyLevels.map((level) => <option key={level} value={level}>{t(`home_practice.energy_${level}`)}</option>)}
              </select>
            </label>
            <label className="block font-semibold" htmlFor="home-checkin-stress">{t('home_practice.checkin_stress')} <output>{data.stress_level}/10</output>
              <input id="home-checkin-stress" type="range" min="1" max="10" value={data.stress_level}
                onChange={(e) => setData((current) => ({ ...current, stress_level: Number(e.target.value) }))} className="mt-3 block min-h-11 w-full accent-primary" />
            </label>
            <label className="block font-semibold" htmlFor="home-checkin-notes">{t('home_practice.checkin_notes')}
              <textarea id="home-checkin-notes" rows={3} maxLength={1000} value={data.notes} onChange={(e) => setData((current) => ({ ...current, notes: e.target.value }))}
                className="mt-2 block w-full rounded-xl border border-border bg-card p-3 font-normal text-foreground" />
            </label>
          </fieldset>
          {save.isError && <p role="alert" className="mt-4 rounded-xl border border-border bg-secondary p-3">{t('home_practice.checkin_error')}</p>}
          <div className="mt-6 flex flex-wrap gap-3">
            <Button type="button" variant="outline" onClick={onClose} className="h-auto flex-1 whitespace-normal">{t('common.cancel')}</Button>
            <Button type="submit" disabled={!data.mood || save.isPending} aria-busy={save.isPending} className="h-auto flex-1 whitespace-normal">{t(save.isPending ? 'home_practice.saving' : 'home_practice.checkin_save')}</Button>
          </div>
        </form>
      </div>
    </PremiumDialog>
  );
}
