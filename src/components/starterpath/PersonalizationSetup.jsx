import PremiumOverlay from '@/components/ui/PremiumOverlay';
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Target, Brain, Heart, TrendingUp, Sparkles, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

export default function PersonalizationSetup({ onComplete }) {
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const [selectedConcerns, setSelectedConcerns] = useState([]);
  const [selectedGoals, setSelectedGoals] = useState([]);

  const primaryConcerns = [
    { id: 'anxiety', label: t('personalization.concerns.anxiety.label'), icon: Brain, color: '#4299E1', description: t('personalization.concerns.anxiety.description') },
    { id: 'stress', label: t('personalization.concerns.stress.label'), icon: TrendingUp, color: '#F6AD55', description: t('personalization.concerns.stress.description') },
    { id: 'mood', label: t('personalization.concerns.mood.label'), icon: Heart, color: '#ED8936', description: t('personalization.concerns.mood.description') },
    { id: 'self_esteem', label: t('personalization.concerns.self_esteem.label'), icon: Sparkles, color: '#9F7AEA', description: t('personalization.concerns.self_esteem.description') },
    { id: 'sleep', label: t('personalization.concerns.sleep.label'), icon: Brain, color: '#38B2AC', description: t('personalization.concerns.sleep.description') },
    { id: 'relationships', label: t('personalization.concerns.relationships.label'), icon: Heart, color: 'hsl(var(--primary))', description: t('personalization.concerns.relationships.description') }
  ];

  const goals = [
    t('personalization.goals.goal_0'),
    t('personalization.goals.goal_1'),
    t('personalization.goals.goal_2'),
    t('personalization.goals.goal_3'),
    t('personalization.goals.goal_4'),
    t('personalization.goals.goal_5'),
    t('personalization.goals.goal_6'),
    t('personalization.goals.goal_7'),
  ];

  const toggleConcern = (id) => {
    setSelectedConcerns(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const toggleGoal = (goal) => {
    setSelectedGoals(prev =>
      prev.includes(goal) ? prev.filter(g => g !== goal) : [...prev, goal]
    );
  };

  const handleComplete = () => {
    onComplete({
      concerns: selectedConcerns,
      goals: selectedGoals
    });
  };

  return (
    <PremiumOverlay className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-6" style={{
      background: 'hsl(var(--overlay) / 0.34)',
      backdropFilter: 'blur(8px)'
    }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="my-auto w-full max-w-2xl shrink-0"
      >
        <Card className="border-0" style={{
          borderRadius: '32px',
          background: 'hsl(var(--card))',
          boxShadow: 'var(--shadow-lg)'
        }}>
          <CardContent className="p-6 sm:p-8">
            {/* Progress Indicator */}
            <div className="flex items-center gap-2 mb-6">
              {[1, 2].map((s) => (
                <div
                  key={s}
                  className="h-2 flex-1 rounded-full transition-all"
                  style={{
                    backgroundColor: s <= step ? '#26A69A' : 'rgba(200, 220, 215, 0.5)'
                  }}
                />
              ))}
            </div>

            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="text-center mb-6">
                    <Target className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4" style={{ color: 'hsl(var(--primary))' }} />
                    <h2 className="text-2xl sm:text-3xl font-bold mb-2" style={{ color: 'hsl(var(--foreground))' }}>
                      {t('personalization.title_step1')}
                    </h2>
                    <p className="text-sm sm:text-base" style={{ color: 'hsl(var(--muted-foreground))' }}>
                      {t('personalization.subtitle_step1')}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {primaryConcerns.map((concern) => {
                      const Icon = concern.icon;
                      const isSelected = selectedConcerns.includes(concern.id);
                      
                      return (
                        <motion.button
                          key={concern.id}
                          type="button"
                          aria-pressed={isSelected}
                          onClick={() => toggleConcern(concern.id)}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className={cn(
                            'p-4 rounded-2xl text-start transition-all border-2',
                            isSelected 
                              ? 'shadow-lg' 
                              : 'shadow-sm hover:shadow-md'
                          )}
                          style={{
                            background: isSelected 
                              ? 'hsl(var(--secondary))'
                              : 'hsl(var(--card))',
                            borderColor: isSelected ? concern.color : 'rgba(200, 220, 215, 0.3)'
                          }}
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 flex items-center justify-center flex-shrink-0" style={{
                              borderRadius: '12px',
                              backgroundColor: `${concern.color}20`
                            }}>
                              <Icon className="w-5 h-5" style={{ color: concern.color }} />
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold text-sm sm:text-base mb-1" style={{ color: 'hsl(var(--foreground))' }}>
                                {concern.label}
                              </p>
                              <p className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
                                {concern.description}
                              </p>
                            </div>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>

                  <Button
                    onClick={() => setStep(2)}
                    disabled={selectedConcerns.length === 0 || selectedConcerns.length > 3}
                    className="w-full py-6 text-white text-base"
                    style={{
                      borderRadius: '20px',
                      backgroundColor: 'hsl(var(--primary))',
                      boxShadow: '0 8px 24px rgba(38, 166, 154, 0.3)'
                    }}
                  >
                    {t('personalization.btn_continue')}
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="text-center mb-6">
                    <Sparkles className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4" style={{ color: '#9F7AEA' }} />
                    <h2 className="text-2xl sm:text-3xl font-bold mb-2" style={{ color: 'hsl(var(--foreground))' }}>
                      {t('personalization.title_step2')}
                    </h2>
                    <p className="text-sm sm:text-base" style={{ color: 'hsl(var(--muted-foreground))' }}>
                      {t('personalization.subtitle_step2')}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 sm:gap-3">
                    {goals.map((goal) => {
                      const isSelected = selectedGoals.includes(goal);
                      
                      return (
                        <Button
                          type="button"
                          variant="outline"
                          aria-pressed={isSelected}
                          key={goal}
                          onClick={() => toggleGoal(goal)}
                          className={cn(
                            'min-h-11 h-auto whitespace-normal text-start cursor-pointer px-4 py-2 text-sm transition-all',
                            isSelected
                              ? 'shadow-md'
                              : 'shadow-sm hover:shadow-md'
                          )}
                          style={{
                            borderRadius: '16px',
                            background: isSelected 
                              ? 'hsl(var(--primary))'
                              : 'hsl(var(--card))',
                            color: isSelected ? 'hsl(var(--primary-foreground))' : 'hsl(var(--foreground))',
                            border: isSelected ? 'none' : '1px solid rgba(200, 220, 215, 0.3)'
                          }}
                        >
                          {goal}
                        </Button>
                      );
                    })}
                  </div>

                  <div className="flex gap-3">
                    <Button
                      onClick={() => setStep(1)}
                      variant="outline"
                      className="flex-1 py-6"
                      style={{ borderRadius: '20px' }}
                    >
                      {t('personalization.btn_back')}
                    </Button>
                    <Button
                      onClick={handleComplete}
                      disabled={selectedGoals.length === 0}
                      className="flex-1 py-6 text-white"
                      style={{
                        borderRadius: '20px',
                        backgroundColor: 'hsl(var(--primary))',
                        boxShadow: '0 8px 24px rgba(159, 122, 234, 0.3)'
                      }}
                    >
                      {t('personalization.btn_start')}
                      <Sparkles className="w-5 h-5 ml-2" />
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>
    </PremiumOverlay>
  );
}