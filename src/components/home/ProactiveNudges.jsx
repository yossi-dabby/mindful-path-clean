import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bell, X, TrendingUp, BookOpen, Target, Activity, CheckCircle, Lightbulb } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';

const iconMap = {
  mood_trend: Activity,
  journal_insight: BookOpen,
  goal_follow_up: Target,
  exercise_follow_up: TrendingUp,
  general: Bell
};

export default function ProactiveNudges() {
  const queryClient = useQueryClient();

  const { data: nudges, isLoading } = useQuery({
    queryKey: ['proactiveReminders'],
    queryFn: () => base44.entities.ProactiveReminder.filter({ status: 'pending' }),
    initialData: []
  });

  const dismissMutation = useMutation({
    mutationFn: (id) => base44.entities.ProactiveReminder.update(id, { status: 'dismissed' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proactiveReminders'] });
    }
  });

  const completeMutation = useMutation({
    mutationFn: (id) => base44.entities.ProactiveReminder.update(id, { status: 'completed' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proactiveReminders'] });
    }
  });

  const getPageUrl = (type, referenceId) => {
    switch (type) {
      case 'mood_trend':
        return createPageUrl('MoodTracker');
      case 'journal_insight':
        return createPageUrl('Journal');
      case 'goal_follow_up':
        return createPageUrl('Goals');
      case 'exercise_follow_up':
        return createPageUrl('Exercises');
      default:
        return createPageUrl('Home');
    }
  };

  if (isLoading || nudges.length === 0) return null;

  return (
    <div className="space-y-3">
      <AnimatePresence>
        {nudges.slice(0, 2).map((nudge, index) => {
          const Icon = iconMap[nudge.reminder_type] || Bell;
          
          return (
            <motion.div
              key={nudge.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-white overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-400 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="font-semibold text-foreground text-sm">{nudge.title}</h4>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => dismissMutation.mutate(nudge.id)}
                          className="h-6 w-6 flex-shrink-0"
                          aria-label="Dismiss notification"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{nudge.message}</p>
                      
                      {nudge.suggested_action && (
                        <p className="text-xs text-amber-700 mb-3 flex items-start gap-1">
                          <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          <span>{nudge.suggested_action}</span>
                        </p>
                      )}

                      <div className="flex gap-2">
                        <Link to={getPageUrl(nudge.reminder_type, nudge.reference_id)}>
                          <Button
                            size="sm"
                            className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-xs"
                            onClick={() => completeMutation.mutate(nudge.id)}
                          >
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Take Action
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => dismissMutation.mutate(nudge.id)}
                          className="text-xs"
                        >
                          Later
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}