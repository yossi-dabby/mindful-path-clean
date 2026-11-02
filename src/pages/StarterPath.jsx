import BotanicalAccent from '@/components/brand/BotanicalAccent';
import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Sparkles, CheckCircle2, Loader2, RotateCcw, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import PersonalizationSetup from '../components/starterpath/PersonalizationSetup';
import { getStage11Copy } from '../components/i18n/stage11UiCopy.js';
import { getScrollContainer } from '@/lib/scrollContainer';

const DAY_STRUCTURE = [
{
  day: 1,
  goal: "Help the user understand the connection between thoughts and emotions",
  exerciseType: "awareness_reflection",
  title: "Understanding Your Mind",
  description: "Explore how your thoughts influence your emotions"
},
{
  day: 2,
  goal: "Identify automatic thoughts in daily situations",
  exerciseType: "thought_identification",
  title: "Catching Automatic Thoughts",
  description: "Notice the thoughts that pop up automatically"
},
{
  day: 3,
  goal: "Recognize a common cognitive distortion",
  exerciseType: "pattern_recognition",
  title: "Spotting Thinking Patterns",
  description: "Identify thinking traps that affect your mood"
},
{
  day: 4,
  goal: "Create a pause between trigger and reaction",
  exerciseType: "response_delay",
  title: "The Power of Pause",
  description: "Learn to create space before responding"
},
{
  day: 5,
  goal: "Generate a balanced alternative thought",
  exerciseType: "cognitive_restructuring",
  title: "Building Balanced Thoughts",
  description: "Transform unhelpful thoughts into realistic ones"
},
{
  day: 6,
  goal: "Apply a new response in a real-life situation",
  exerciseType: "behavioral_experiment",
  title: "Testing New Approaches",
  description: "Try out a new way of responding"
},
{
  day: 7,
  goal: "Consolidate learning and prepare for ongoing daily use",
  exerciseType: "review_integration",
  title: "Your Journey Forward",
  description: "Review your progress and plan ahead"
}];


export default function StarterPath() {
  const { t, i18n } = useTranslation();
  const copy = getStage11Copy(i18n.resolvedLanguage || i18n.language);
  const [step, setStep] = useState('loading'); // loading, intro, exercise, complete
  const [userResponse, setUserResponse] = useState('');
  const [generatedContent, setGeneratedContent] = useState(null);
  const [showPersonalization, setShowPersonalization] = useState(false);
  const [userPreferences, setUserPreferences] = useState(null);
  const completionHeading = useRef(null);
  const queryClient = useQueryClient();

  // Get starter path progress
  const { data: starterPath } = useQuery({
    queryKey: ['starterPath'],
    queryFn: async () => {
      const paths = await base44.entities.StarterPath.list();
      const user = await base44.auth.me();
      if (user.starter_path_preferences) {
        setUserPreferences(user.starter_path_preferences);
      } else if (paths.length === 0) {
        setShowPersonalization(true);
      }
      return paths[0] || null;
    }
  });

  // Get user context for AI generation
  const { data: userContext } = useQuery({
    queryKey: ['userContext'],
    queryFn: async () => {
      const recentMoods = await base44.entities.MoodEntry.list('-created_date', 7);
      const recentJournals = await base44.entities.ThoughtJournal.list('-created_date', 5);
      return { recentMoods, recentJournals };
    },
    initialData: { recentMoods: [], recentJournals: [] }
  });

  const currentDay = starterPath?.current_day || 1;
  const dayStructure = DAY_STRUCTURE[currentDay - 1];

  // Handle personalization complete
  const handlePersonalizationComplete = async (preferences) => {
    try {
      await base44.auth.updateMe({
        starter_path_preferences: preferences
      });
      if (!starterPath) {
        await base44.entities.StarterPath.create({
          current_day: 1,
          started_date: new Date().toISOString().split('T')[0],
          completed: false,
          day_exercises: {}
        });
      }
      setUserPreferences(preferences);
      setShowPersonalization(false);
      setGeneratedContent(null);
      setStep('loading');
      queryClient.invalidateQueries({ queryKey: ['starterPath'] });
    } catch (error) {
      console.error('Error saving preferences:', error);
    }
  };

  // Generate daily content with AI
  const generateContentMutation = useMutation({
    mutationFn: async () => {
      const { recentMoods, recentJournals } = userContext;

      // Build context string
      let contextStr = "User context:\n";
      if (recentMoods.length > 0) {
        contextStr += `Recent moods: ${recentMoods.slice(0, 3).map((m) =>
        `${m.mood}${m.emotions ? ` (${m.emotions.join(', ')})` : ''}`
        ).join('; ')}\n`;
      }
      if (recentJournals.length > 0) {
        contextStr += `Recent journal themes: ${recentJournals.slice(0, 2).map((j) =>
        j.automatic_thoughts || j.situation
        ).filter(Boolean).join('; ')}\n`;
      }
      if (!recentMoods.length && !recentJournals.length) {
        contextStr += "No previous data available - generate general but helpful content.\n";
      }

      // Add personalization
      if (userPreferences?.concerns?.length > 0) {
        contextStr += `Primary concerns: ${userPreferences.concerns.join(', ')}\n`;
      }
      if (userPreferences?.goals?.length > 0) {
        contextStr += `User goals: ${userPreferences.goals.join('; ')}\n`;
      }

      const prompt = `You are a CBT therapist creating a personalized guided exercise for Day ${currentDay} of a 7-day program.

${contextStr}

Day ${currentDay} Goal: ${dayStructure.goal}
Exercise Type: ${dayStructure.exerciseType}

${userPreferences?.concerns || userPreferences?.goals ? 'IMPORTANT: Tailor this exercise to address the user\'s specific concerns and goals.' : ''}

Generate a brief, personalized exercise in JSON format:
{
  "introduction": "2-3 sentences explaining today's focus in a warm, supportive tone",
  "main_prompt": "One clear question or task for the user (must be specific and actionable, under 10 minutes)",
  "guidance": "1-2 sentences of helpful context or tips",
  "example": "A brief relevant example if helpful (optional, keep very short)"
}

RULES:
- Be specific and clinical, not generic or motivational
- Reference their actual experiences if data is available
- Keep total content under 200 words
- Use simple, clear language
- No bullet points or formatting, just clear sentences
- Make it feel personal and directly relevant
- IMPORTANT: Write ALL text content in the following language: ${i18n.language}`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            introduction: { type: "string" },
            main_prompt: { type: "string" },
            guidance: { type: "string" },
            example: { type: "string" }
          },
          required: ["introduction", "main_prompt", "guidance"]
        }
      });

      return result;
    },
    onSuccess: (data) => {
      setGeneratedContent(data);
      setStep('intro');
    }
  });

  // Complete day mutation
  const completeDayMutation = useMutation({
    mutationFn: async () => {
      const today = new Date().toISOString().split('T')[0];

      // Generate takeaway with AI
      const takeawayPrompt = `Based on this CBT exercise response, generate ONE clear, actionable takeaway (1 sentence):

Exercise goal: ${dayStructure.goal}
User response: ${userResponse}

Generate a concise insight or action the user can apply today.
IMPORTANT: Write the takeaway in the following language: ${i18n.language}`;

      const takeawayResult = await base44.integrations.Core.InvokeLLM({
        prompt: takeawayPrompt
      });

      // Update starter path
      const updates = {
        current_day: currentDay < 7 ? currentDay + 1 : currentDay,
        last_completed_date: today,
        completed: currentDay === 7,
        completed_date: currentDay === 7 ? today : undefined,
        day_exercises: {
          ...starterPath?.day_exercises,
          [currentDay]: userResponse
        }
      };

      await base44.entities.StarterPath.update(starterPath.id, updates);

      // Keep the finished day stable while the progress query advances to tomorrow.
      return { takeaway: takeawayResult, completedDay: currentDay };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['starterPath'] });
      setStep('complete');
    }
  });

  const managePathMutation = useMutation({
    mutationFn: async (action) => {
      if (!starterPath?.id) return;
      if (action === 'restart') {
        await base44.entities.StarterPath.update(starterPath.id, {
          current_day: 1,
          started_date: new Date().toISOString().split('T')[0],
          completed: false,
          day_exercises: {}
        });
        return;
      }
      await base44.entities.StarterPath.delete(starterPath.id);
    },
    onSuccess: (_data, action) => {
      setGeneratedContent(null);
      setUserResponse('');
      setStep('loading');
      if (action === 'remove') setShowPersonalization(true);
      queryClient.invalidateQueries({ queryKey: ['starterPath'] });
    },
    onError: () => alert(copy.starter.actionError)
  });

  const handleRestartPath = () => {
    if (window.confirm(copy.starter.restartConfirm)) managePathMutation.mutate('restart');
  };

  const handleRemovePath = () => {
    if (window.confirm(copy.starter.removeConfirm)) managePathMutation.mutate('remove');
  };

  // Generate content on mount
  useEffect(() => {
    if (starterPath && !generatedContent && step === 'loading') {
      generateContentMutation.mutate();
    }
  }, [starterPath?.id, step]);

  useEffect(() => {
    if (step === 'complete') {
      getScrollContainer().scrollTop = 0;
      completionHeading.current?.focus({ preventScroll: true });
    }
  }, [step]);

  if (showPersonalization && !starterPath) {
    return <PersonalizationSetup onComplete={handlePersonalizationComplete} />;
  }

  if (!starterPath || step === 'loading' || generateContentMutation.isPending) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin" style={{ color: 'rgb(var(--calm))' }} strokeWidth={2} />
          <p style={{ color: 'rgb(var(--theme-muted))' }}>{t('starter_path.loading')}</p>
        </div>
      </div>);

  }

  if (step === 'complete') {
    const completedDay = completeDayMutation.data?.completedDay ?? currentDay;
    return (
      <div className="min-h-[calc(100dvh-var(--mobile-header-height,60px)-var(--mobile-bottom-nav-height,76px))] md:min-h-dvh flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-2xl">
          
          <Card data-testid="starter-path-completion" className="border border-border bg-card/95 shadow-lg">
            <CardContent className="p-6 sm:p-10 text-center">
              <motion.div
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: [0.2, 0.8, 0.2, 1] }}
                className="inline-flex w-12 h-12 sm:w-20 sm:h-20 items-center justify-center mb-4 sm:mb-6 rounded-2xl bg-primary/10">
                
                <CheckCircle2 className="w-8 h-8 sm:w-10 sm:h-10 text-primary" strokeWidth={2} />
              </motion.div>
              <h2 ref={completionHeading} tabIndex={-1} className="text-xl sm:text-2xl font-semibold mb-3 text-foreground">
                {t('starter_path.day_complete', { day: completedDay })}
              </h2>
              {completeDayMutation.data?.takeaway &&
              <div className="mb-4 sm:mb-6 p-4 rounded-2xl bg-secondary/70 border border-border">
                  <p className="text-sm font-medium mb-2 text-primary">
                    {t('starter_path.todays_takeaway')}
                  </p>
                  <p className="text-foreground break-words">
                    {completeDayMutation.data.takeaway}
                  </p>
                </div>
              }
              <p className="mb-4 sm:mb-6 text-muted-foreground">
                {completedDay === 7 ?
                t('starter_path.completed_all') :
                t('starter_path.come_back_tomorrow', { day: completedDay + 1 })}
              </p>
              <Link to={createPageUrl('Home')}>
                <Button className="min-h-11 rounded-full px-7">
                {t('starter_path.return_home')}
                </Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>
      </div>);

  }

  return (
    <div data-testid="starter-path-page" className="min-h-dvh p-4">
      {showPersonalization &&
      <PersonalizationSetup onComplete={handlePersonalizationComplete} />
      }
      
      <div className="max-w-3xl mx-auto py-8">
        {/* Header */}
        <div className="mb-6">
          <Link to={createPageUrl('Home')}>
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" strokeWidth={2} />
              {t('starter_path.back_to_home')}
            </Button>
          </Link>
          <div className="flex min-w-0 flex-col items-start justify-between gap-4 sm:flex-row">
            <div className="min-w-0 flex-1">
              <div className="botanical-title-row"><h1 className="min-w-0 break-words text-2xl sm:text-3xl font-semibold mb-2" style={{ color: 'rgb(var(--text))' }}>
                {t('starter_path.day_of_7', { day: currentDay })}: {t(`starter_path.day_structure.${currentDay}.title`, { defaultValue: dayStructure.title })}
              </h1><BotanicalAccent variant="route" className="botanical-title-art" /></div>
              <p style={{ color: 'rgb(var(--theme-muted))' }}>{t(`starter_path.day_structure.${currentDay}.description`, { defaultValue: dayStructure.description })}</p>
            </div>
            <div className="shrink-0 text-start sm:text-end">
              <p className="text-sm font-medium" style={{ color: 'rgb(var(--calm))' }}>
                {t('starter_path.day_of_7', { day: currentDay })}
              </p>
              <div className="flex gap-1 mt-2">
                {[1, 2, 3, 4, 5, 6, 7].map((d) =>
                <div
                  key={d}
                  className="w-2 h-2 rounded-full"
                  style={{
                    backgroundColor: d <= currentDay ?
                    'rgb(var(--calm))' :
                    'rgb(var(--theme-border))'
                  }} />

                )}
              </div>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={handleRestartPath} disabled={managePathMutation.isPending} className="min-h-11 rounded-xl border-border bg-[hsl(var(--card)/0.97)] text-primary">
              <RotateCcw className="me-2 h-4 w-4" />
              {copy.starter.restart}
            </Button>
            <Button type="button" variant="outline" onClick={handleRemovePath} disabled={managePathMutation.isPending} className="min-h-11 rounded-xl border-red-200 bg-[hsl(var(--card)/0.97)] text-red-700 hover:bg-red-50" mobileLabelKey="delete">
              <Trash2 className="me-2 h-4 w-4" />
              {copy.starter.remove}
            </Button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {/* Introduction Step */}
          {step === 'intro' &&
          <motion.div
            key="intro"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}>
            
              <Card className="border-0 shadow-soft mb-6" style={{
              borderRadius: 'var(--r-xl)',
              backgroundColor: 'rgb(var(--surface))'
            }}>
                <CardContent className="p-8">
                  <div className="flex items-start gap-4 mb-6">
                    <div className="w-12 h-12 flex items-center justify-center flex-shrink-0" style={{
                    borderRadius: 'var(--r-md)',
                    backgroundColor: 'rgb(var(--calm) / 0.15)'
                  }}>
                      <Sparkles className="w-6 h-6 icon-default" style={{ color: 'rgb(var(--calm))' }} strokeWidth={2} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold mb-3" style={{ color: 'rgb(var(--text))' }}>
                        {t('starter_path.todays_focus')}
                      </h3>
                      <p className="mb-4 leading-relaxed" style={{ color: 'rgb(var(--text))' }}>
                        {generatedContent?.introduction}
                      </p>
                      {generatedContent?.guidance &&
                    <p className="text-sm leading-relaxed" style={{ color: 'rgb(var(--theme-muted))' }}>
                          {generatedContent.guidance}
                        </p>
                    }
                    </div>
                  </div>

                  <Button
                  onClick={() => setStep('exercise')}
                  data-testid="starter-path-begin"
                  className="w-full transition-calm text-white px-7 py-6"
                  style={{
                    borderRadius: '9999px',
                    backgroundColor: 'hsl(var(--primary))',
                    boxShadow: '0 3px 10px rgba(38, 166, 154, 0.2), 0 1px 3px rgba(0,0,0,0.08)'
                  }}>
                  
                    {t('starter_path.begin_exercise')}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          }

          {/* Exercise Step */}
          {step === 'exercise' &&
          <motion.div
            key="exercise"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}>
            
              <Card className="border-0 shadow-soft mb-6" style={{
              borderRadius: 'var(--r-xl)',
              backgroundColor: 'rgb(var(--surface))'
            }}>
                <CardContent className="p-8">
                  <h3 className="text-lg font-semibold mb-4" style={{ color: 'rgb(var(--text))' }}>
                    {generatedContent?.main_prompt}
                  </h3>

                  {generatedContent?.example &&
                    <div data-testid="starter-path-example" className="mb-4 rounded-2xl border border-border bg-secondary/70 p-4 shadow-sm">
                      <p className="text-sm leading-6 text-primary">
                        {generatedContent.example}
                      </p>
                    </div>
                  }

                  <Textarea
                  value={userResponse}
                  onChange={(e) => setUserResponse(e.target.value)}
                  placeholder={t('starter_path.reflect_placeholder')}
                  rows={6}
                  className="mb-4"
                  style={{
                    borderRadius: 'var(--r-md)',
                    borderColor: 'rgb(var(--theme-border))'
                  }} />
                

                  <div className="flex gap-3">
                    <Button
                    variant="outline"
                    onClick={() => setStep('intro')}
                    className="flex-1"
                    style={{ borderRadius: 'var(--r-md)' }}>
                    
                      {t('starter_path.back_button')}
                    </Button>
                    <Button
                    onClick={() => completeDayMutation.mutate()}
                    disabled={!userResponse.trim() || completeDayMutation.isPending}
                    className="flex-1 transition-calm text-white px-6 py-5"
                    style={{
                      borderRadius: '9999px',
                      backgroundColor: 'hsl(var(--primary))',
                      boxShadow: '0 2px 8px rgba(38, 166, 154, 0.2), 0 1px 3px rgba(0,0,0,0.06)',
                      opacity: !userResponse.trim() ? 0.5 : 1
                    }}>
                    
                      {completeDayMutation.isPending ? t('starter_path.completing') : t('starter_path.complete_day', { day: currentDay })}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          }
        </AnimatePresence>
      </div>
    </div>);

}
