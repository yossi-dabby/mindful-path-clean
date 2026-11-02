import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Target, Sparkles, BookOpen, Dumbbell, Bell, X, ChevronRight, Lightbulb } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function ProactiveCheckIn({ onSendMessage, className = '' }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [dismissedSuggestionIds, setDismissedSuggestionIds] = useState(() => {
    try {
      const saved = sessionStorage.getItem('dismissed_proactive_checkins');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const today = new Date().toISOString().split('T')[0];

  const persistDismissedIds = (ids) => {
    setDismissedSuggestionIds(ids);
    sessionStorage.setItem('dismissed_proactive_checkins', JSON.stringify(ids));
  };

  const { data: goalsData } = useQuery({
    queryKey: ['activeGoals'],
    queryFn: () => base44.entities.Goal.filter({ status: 'active' })
  });
  const goals = Array.isArray(goalsData) ? goalsData : goalsData?.results || [];

  const { data: recentMoodsData } = useQuery({
    queryKey: ['recentMoods'],
    queryFn: () => base44.entities.MoodEntry.list('-date', 7)
  });
  const recentMoods = Array.isArray(recentMoodsData) ? recentMoodsData : recentMoodsData?.results || [];

  const { data: recentJournalsData } = useQuery({
    queryKey: ['recentJournals'],
    queryFn: () => base44.entities.ThoughtJournal.list('-created_date', 5)
  });
  const recentJournals = Array.isArray(recentJournalsData) ? recentJournalsData : recentJournalsData?.results || [];

  const { data: exercisesData } = useQuery({
    queryKey: ['exercises'],
    queryFn: () => base44.entities.Exercise.list()
  });
  const exercises = Array.isArray(exercisesData) ? exercisesData : exercisesData?.results || [];

  const { data: aiRemindersData } = useQuery({
    queryKey: ['proactiveReminders'],
    queryFn: async () => {
      const reminders = await base44.entities.ProactiveReminder.filter({ status: 'pending' });
      return Array.isArray(reminders) ? reminders.filter((r) => r.scheduled_date <= today) : [];
    }
  });
  const aiReminders = Array.isArray(aiRemindersData) ? aiRemindersData : aiRemindersData?.results || [];

  const dismissReminderMutation = useMutation({
    mutationFn: (reminderId) => base44.entities.ProactiveReminder.update(reminderId, { status: 'dismissed' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proactiveReminders'] });
    }
  });

  const completeReminderMutation = useMutation({
    mutationFn: (reminderId) => base44.entities.ProactiveReminder.update(reminderId, { status: 'completed' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proactiveReminders'] });
    }
  });

  const hasLowMoodTrend = recentMoods.length >= 3 &&
  recentMoods.slice(0, 3).every((m) => ['low', 'very_low'].includes(m.mood));

  const hasPositiveTrend = recentMoods.length >= 3 &&
  recentMoods.slice(0, 3).every((m) => ['good', 'excellent'].includes(m.mood));

  const hasActiveGoals = goals.length > 0;

  const recentJournalPatterns = recentJournals.length >= 2 && recentJournals.
  slice(0, 2).
  flatMap((j) => j.cognitive_distortions || []).
  reduce((acc, d) => {
    acc[d] = (acc[d] || 0) + 1;
    return acc;
  }, {});

  const commonDistortion = recentJournalPatterns && Object.keys(recentJournalPatterns).length > 0 ?
  Object.entries(recentJournalPatterns).sort((a, b) => b[1] - a[1])[0][0] :
  null;

  const practiceOpportunities = exercises.
  filter((ex) => (ex.completed_count || 0) > 0 && ex.last_completed).
  sort((a, b) => new Date(b.last_completed) - new Date(a.last_completed)).
  slice(0, 1)[0];

  const suggestions = [];

  // AI-Generated Reminders (highest priority)
  aiReminders.forEach((reminder) => {
    const icon = {
      'goal_follow_up': Target,
      'mood_trend': TrendingDown,
      'exercise_follow_up': Dumbbell,
      'journal_insight': BookOpen,
      'general': Bell
    }[reminder.reminder_type] || Bell;

    const color = {
      'goal_follow_up': 'text-blue-600 bg-blue-100',
      'mood_trend': 'text-orange-600 bg-orange-100',
      'exercise_follow_up': 'text-purple-600 bg-purple-100',
      'journal_insight': 'text-green-600 bg-green-100',
      'general': 'text-muted-foreground bg-gray-100'
    }[reminder.reminder_type] || 'text-muted-foreground bg-gray-100';

    suggestions.push({
      id: `ai-${reminder.id}`,
      entityId: reminder.id,
      icon,
      color,
      title: reminder.title,
      message: reminder.message,
      prompt: reminder.suggested_action || reminder.message,
      type: 'ai_reminder',
      reminder
    });
  });

  // Mood-based suggestions
  if (hasLowMoodTrend) {
    suggestions.push({
      id: 'mood_trend',
      icon: TrendingDown,
      color: 'text-orange-600 bg-orange-100',
      title: t('chat.proactive.mood_title'), message: t('chat.proactive.mood_message'), prompt: t('chat.proactive.mood_prompt'),
      type: 'mood_trend'
    });
  }

  if (hasPositiveTrend) {
    suggestions.push({
      id: 'positive_trend',
      icon: TrendingUp,
      color: 'text-green-600 bg-green-100',
      title: t('chat.proactive.positive_title'), message: t('chat.proactive.positive_message'), prompt: t('chat.proactive.positive_prompt'),
      type: 'positive_trend'
    });
  }

  // Goal-based suggestions
  if (hasActiveGoals) {
    const oldestGoal = goals.sort((a, b) => new Date(a.created_date) - new Date(b.created_date))[0];
    const daysSinceCreated = Math.floor((new Date() - new Date(oldestGoal.created_date)) / (1000 * 60 * 60 * 24));

    if (daysSinceCreated >= 7) {
      suggestions.push({
        id: `goal_review-${oldestGoal.id}`,
        icon: Target,
        color: 'text-blue-600 bg-blue-100',
        title: t('chat.proactive.goal_title'), message: t('chat.proactive.goal_message', { title: oldestGoal.title, days: daysSinceCreated }), prompt: t('chat.proactive.goal_prompt', { title: oldestGoal.title }),
        type: 'goal_review',
        reference: oldestGoal
      });
    }
  }

  // Journal insight patterns
  if (commonDistortion) {
    suggestions.push({
      id: `journal_insight-${commonDistortion}`,
      icon: BookOpen,
      color: 'text-purple-600 bg-purple-100',
      title: t('chat.proactive.pattern_title'), message: t('chat.proactive.pattern_message', { pattern: commonDistortion }), prompt: t('chat.proactive.pattern_prompt', { pattern: commonDistortion }),
      type: 'journal_insight'
    });
  }

  // Exercise follow-up
  if (practiceOpportunities) {
    const daysSinceLastPractice = Math.floor((new Date() - new Date(practiceOpportunities.last_completed)) / (1000 * 60 * 60 * 24));

    if (daysSinceLastPractice >= 3 && daysSinceLastPractice <= 7) {
      suggestions.push({
        id: `exercise_followup-${practiceOpportunities.id}`,
        icon: Dumbbell,
        color: 'text-indigo-600 bg-indigo-100',
        title: t('chat.proactive.exercise_title'), message: t('chat.proactive.exercise_message', { title: practiceOpportunities.title, days: daysSinceLastPractice }), prompt: t('chat.proactive.exercise_prompt', { title: practiceOpportunities.title }),
        type: 'exercise_followup',
        reference: practiceOpportunities
      });
    }
  }

  const visibleSuggestions = suggestions.filter((suggestion) => !dismissedSuggestionIds.includes(suggestion.id));

  if (visibleSuggestions.length === 0) return null;

  const handleDismiss = (suggestion, e) => {
    e.stopPropagation();
    persistDismissedIds([...dismissedSuggestionIds, suggestion.id]);
    if (suggestion.type === 'ai_reminder') {
      dismissReminderMutation.mutate(suggestion.entityId);
    }
  };

  const handleClick = (suggestion) => {
    if (suggestion.type === 'ai_reminder') {
      completeReminderMutation.mutate(suggestion.entityId);
    }
    onSendMessage(suggestion.prompt);
  };

  return (
    <div data-testid="proactive-check-in" className={`mb-4 px-1 sm:px-2 space-y-3 ${className}`}>
      <div className="mb-3 flex items-center gap-2 text-primary">
        <span className="w-8 h-8 rounded-xl bg-secondary/70 border border-border flex items-center justify-center">
          <Sparkles className="w-4 h-4" />
        </span>
        <h3 className="text-sm font-semibold tracking-wide">{t('chat.proactive.title')}</h3>
      </div>
      
      {visibleSuggestions.map((suggestion) => {
        const Icon = suggestion.icon;
        return (
          <Card
            key={suggestion.id} className="bg-[hsl(var(--card)/0.97)] text-card-foreground rounded-2xl shadow-[var(--shadow-sm)] backdrop-blur-xl border border-border hover:border-border hover:shadow-[var(--shadow-md)] transition-all cursor-pointer"

            onClick={() => handleClick(suggestion)}>

            <CardContent className="bg-transparent p-4">
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-full ${suggestion.color} flex items-center justify-center flex-shrink-0`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold text-foreground text-sm">{suggestion.title}</h4>
                      {suggestion.type === 'ai_reminder' &&
                      <Badge variant="secondary" className="text-xs">
                          {t('chat.proactive.ai_suggested')}
                        </Badge>
                      }
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 -mt-1 -mr-1 flex-shrink-0"
                      onClick={(e) => handleDismiss(suggestion, e)}
                      aria-label={t('chat.proactive.dismiss_aria')}>

                        <X className="w-3 h-3" />
                      </Button>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-2">{suggestion.message}</p>
                  {suggestion.reminder?.context?.insight &&
                  <p className="flex items-start gap-1.5 text-xs text-muted-foreground italic mb-2 bg-[hsl(var(--card)/0.97)] p-2 rounded">
                      <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <span>{suggestion.reminder.context.insight}</span>
                    </p>
                  }
                  <div className="flex items-center gap-2 text-xs text-primary font-semibold">
                    <span>{t('chat.proactive.discuss')}</span>
                    <ChevronRight className="w-3 h-3" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>);

      })}
    </div>);

}
