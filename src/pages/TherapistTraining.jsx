import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import ScenarioSelector from '@/components/training/ScenarioSelector';
import TrainingSimulator from '@/components/training/TrainingSimulator';
import { GraduationCap } from 'lucide-react';

export default function TherapistTraining() {
  const {t}=useTranslation();
  const [activeScenario, setActiveScenario] = useState(null);

  return (
    <div className="min-h-dvh p-4 md:p-6 pb-24 md:pb-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">{t('stage6.training_title')}</h1>
            <p className="text-sm text-muted-foreground">
              {t('stage6.training_intro')}
            </p>
          </div>
        </div>

        {activeScenario ? (
          <TrainingSimulator
            scenario={activeScenario}
            onReset={() => setActiveScenario(null)}
          />
        ) : (
          <ScenarioSelector onSelect={setActiveScenario} />
        )}
      </div>
    </div>
  );
}