import PremiumOverlay from '@/components/ui/PremiumOverlay';
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { getCurrentAppLocale } from '@/components/i18n/appLocale';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Dumbbell, Calendar, Loader2, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import PremiumIcon from '@/components/ui/PremiumIcon';

export default function AiExerciseCoaching({ onClose, onSelectExercise, exercises: availableExerciseCollection }) {
  const { t, i18n } = useTranslation();
  const locale = getCurrentAppLocale(i18n);
  const closeButtonRef = useRef(null);
  useEffect(() => {
    const previousFocus = document.activeElement;
    closeButtonRef.current?.focus();
    const handleKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('keydown', handleKey);
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [onClose]);
  useEffect(() => { setPlan(null); }, [locale]);
  const [plan, setPlan] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: fetchedExercises } = useQuery({
    queryKey: ['exercises'],
    queryFn: () => base44.entities.Exercise.list(),
    initialData: []
  });

  const exercises = availableExerciseCollection || fetchedExercises;

  const { data: recentMoods } = useQuery({
    queryKey: ['recentMoods'],
    queryFn: () => base44.entities.MoodEntry.list('-created_date', 7),
    initialData: []
  });

  const { data: exerciseHistory } = useQuery({
    queryKey: ['exerciseHistory'],
    queryFn: async () => {
      const allExercises = await base44.entities.Exercise.list();
      return allExercises.filter(e => e.completed_count > 0);
    },
    initialData: []
  });

  const generatePlanMutation = useMutation({
    mutationFn: async () => {
      setIsGenerating(true);
      
      // Prepare context
      const moodSummary = recentMoods.length > 0
        ? `Recent moods: ${recentMoods.map(m => `${m.mood} (emotions: ${m.emotions?.join(', ') || 'none'})`).join('; ')}`
        : 'No recent mood data';
      
      const exerciseSummary = exerciseHistory.length > 0
        ? `Completed exercises: ${exerciseHistory.map(e => `${e.title} (${e.completed_count} times)`).slice(0, 5).join(', ')}`
        : 'No exercise history';

      const availableExercises = exercises.map(e => ({
        id: e.id,
        title: e.title,
        category: e.category,
        difficulty: e.difficulty,
        duration: e.duration_options?.[0] || 10
      }));

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a CBT-informed wellbeing assistant creating a personalized exercise practice plan. Based on the user's context, recommend a structured plan without diagnosis or promises of benefit.
Write ALL user-facing strings (summary, exercise titles, reasons, focus, progression and outcomes) exclusively in the user's language: ${locale}. Preserve exercise IDs and JSON field names unchanged.

User Context:
${moodSummary}
${exerciseSummary}

Available exercises:
${JSON.stringify(availableExercises, null, 2)}

Create a 7-day exercise plan with:
1. Daily recommendations (select from available exercises by ID)
2. Why each exercise was chosen
3. Progression strategy
4. Expected outcomes

Format as JSON:
{
  "plan_summary": "brief overview",
  "daily_plan": [
    {
      "day": 1,
      "exercise_id": "...",
      "exercise_title": "...",
      "duration": 10,
      "reason": "why this exercise",
      "focus": "what to pay attention to"
    }
  ],
  "progression_strategy": "...",
  "expected_outcomes": ["outcome1", "outcome2", ...]
}`,
        response_json_schema: {
          type: "object",
          properties: {
            plan_summary: { type: "string" },
            daily_plan: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  day: { type: "number" },
                  exercise_id: { type: "string" },
                  exercise_title: { type: "string" },
                  duration: { type: "number" },
                  reason: { type: "string" },
                  focus: { type: "string" }
                }
              }
            },
            progression_strategy: { type: "string" },
            expected_outcomes: { type: "array", items: { type: "string" } }
          }
        }
      });

      setPlan(result);
      setIsGenerating(false);
      return result;
    },
    onSettled: () => setIsGenerating(false)
  });

  const handleStartExercise = (exerciseId) => {
    const exercise = exercises.find(e => e.id === exerciseId);
    if (exercise && onSelectExercise) {
      onSelectExercise(exercise);
      onClose();
    }
  };

  return createPortal((
    <PremiumOverlay role="dialog" aria-modal="true" aria-labelledby="ai-practice-title" data-testid="ai-practice-dialog" dir={locale === 'he' ? 'rtl' : 'ltr'} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[80] flex items-center justify-center p-4" style={{ paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-4xl flex flex-col"
        style={{ maxHeight: 'calc(100dvh - 2rem)' }}
      >
        <Card className="min-h-0 max-h-full border-0 shadow-2xl flex flex-col overflow-hidden">
          <CardHeader className="border-b flex-shrink-0" style={{
            background: 'linear-gradient(145deg, rgba(200, 230, 225, 0.9) 0%, rgba(180, 220, 210, 0.8) 100%)'
          }}>
            <div className="flex items-center justify-between">
              <CardTitle id="ai-practice-title" className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" style={{ color: '#26A69A' }} />
                {t('ai_practice.title')}
              </CardTitle>
              <Button variant="ghost" size="icon" ref={closeButtonRef} onClick={onClose} aria-label={t('ai_practice.close')}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4 md:p-6 space-y-6 overflow-y-auto flex-1" style={{ minHeight: 0 }}>
            {generatePlanMutation.isError && <p role="alert" className="text-sm text-destructive">{t('ai_practice.error')}</p>}
            {!plan && !isGenerating && (
              <div className="text-center py-8">
                <Dumbbell className="w-16 h-16 mx-auto mb-4" style={{ color: '#A8D4CB' }} />
                <h3 className="text-xl font-semibold mb-2" style={{ color: '#1A3A34' }}>
                  {t('ai_practice.intro')}
                </h3>
                <p className="mb-6 max-w-md mx-auto" style={{ color: '#5A7A72' }}>
                  {t('ai_practice.description')}
                </p>
                <Button
                  onClick={() => generatePlanMutation.mutate()}
                  className="text-white px-8 py-6 text-lg"
                  style={{
                    borderRadius: '28px',
                    backgroundColor: '#26A69A',
                    boxShadow: '0 8px 24px rgba(38, 166, 154, 0.35)'
                  }}
                >
                  <Sparkles className="w-5 h-5 me-2" />
                  {t('ai_practice.generate')}
                </Button>
              </div>
            )}

            {isGenerating && (
              <div className="text-center py-12">
                <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin" style={{ color: '#26A69A' }} />
                <p style={{ color: '#5A7A72' }}>{t('ai_practice.generating')}</p>
              </div>
            )}

            {plan && (
              <div className="space-y-6">
                {/* Plan Overview */}
                <div className="p-6 rounded-xl" style={{
                  background: 'linear-gradient(135deg, rgba(38, 166, 154, 0.15) 0%, rgba(56, 178, 172, 0.1) 100%)',
                  border: '2px solid rgba(38, 166, 154, 0.2)'
                }}>
                  <div className="flex items-start gap-3 mb-4">
                    <TrendingUp className="w-6 h-6 mt-1" style={{ color: '#26A69A' }} />
                    <div>
                      <h4 className="font-semibold mb-2" style={{ color: '#1A3A34' }}>{t('ai_practice.overview')}</h4>
                      <p style={{ color: '#3D5A52' }}>{plan.plan_summary}</p>
                    </div>
                  </div>
                  
                  {/* Expected Outcomes */}
                  <div className="mt-4">
                    <h5 className="font-medium text-sm mb-2" style={{ color: '#1A3A34' }}>{t('ai_practice.outcomes')}</h5>
                    <div className="flex flex-wrap gap-2">
                      {plan.expected_outcomes.map((outcome, i) => (
                        <Badge key={i} variant="outline" style={{ borderColor: '#26A69A', color: '#26A69A' }}>
                          ✓ {outcome}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Daily Plan */}
                <div>
                  <h4 className="font-semibold mb-4 flex items-center gap-2" style={{ color: '#1A3A34' }}>
                    <Calendar className="w-5 h-5" style={{ color: '#26A69A' }} />
                    {t('ai_practice.schedule')}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {plan.daily_plan.map((day) => (
                      <div
                        key={day.day}
                        className="p-4 rounded-xl hover:shadow-md transition-all"
                        style={{
                          background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.9) 0%, rgba(240, 249, 247, 0.85) 100%)',
                          border: '2px solid rgba(38, 166, 154, 0.1)'
                        }}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <Badge style={{ backgroundColor: '#26A69A', color: 'white' }}>
                              {t('ai_practice.day', { day: day.day })}
                            </Badge>
                            <h5 className="font-semibold mt-2" style={{ color: '#1A3A34' }}>
                              {day.exercise_title}
                            </h5>
                            <p className="text-xs mt-1" style={{ color: '#5A7A72' }}>
                              {t('ai_practice.minutes', { count: day.duration })}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStartExercise(day.exercise_id)}
                          >
                            {t('ai_practice.start')}
                          </Button>
                        </div>
                        <div className="space-y-2">
                          <div>
                            <p className="text-xs font-medium mb-1" style={{ color: '#1A3A34' }}>
                              {t('ai_practice.reason')}
                            </p>
                            <p className="text-xs" style={{ color: '#5A7A72' }}>{day.reason}</p>
                          </div>
                          <div>
                            <p className="text-xs font-medium mb-1" style={{ color: '#1A3A34' }}>
                              {t('ai_practice.focus')}
                            </p>
                            <p className="text-xs" style={{ color: '#5A7A72' }}>{day.focus}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* {t('ai_practice.progression')} */}
                <div className="p-4 rounded-xl" style={{
                  background: 'linear-gradient(145deg, rgba(240, 240, 250, 0.6) 0%, rgba(245, 245, 255, 0.5) 100%)',
                  border: '1px solid rgba(139, 92, 246, 0.2)'
                }}>
                  <h5 className="flex items-center gap-2 font-semibold mb-2 text-sm" style={{ color: '#6D28D9' }}>
                    <PremiumIcon name="chart" size="sm" bare /> {t('ai_practice.progression')}
                  </h5>
                  <p className="text-sm" style={{ color: '#5A7A72' }}>{plan.progression_strategy}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </PremiumOverlay>
  ), document.body);
}