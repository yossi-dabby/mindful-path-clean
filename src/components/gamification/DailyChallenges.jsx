import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle, Sparkles, Trophy } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import PremiumIcon from '@/components/ui/PremiumIcon';

const challengeIcons = {
  mood_check: 'sun',
  journal: 'journal',
  exercise: 'movement',
  meditation: 'waves',
  goal_action: 'target',
  gratitude: 'heart'
};

const difficultyColors = {
  easy: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  hard: 'bg-red-100 text-red-700'
};

export default function DailyChallenges() {
  const queryClient = useQueryClient();
  const today = new Date().toISOString().split('T')[0];

  const { data: challenges, isLoading } = useQuery({
    queryKey: ['dailyChallenges', today],
    queryFn: () => base44.entities.DailyChallenge.filter({ date: today }),
    initialData: []
  });

  const completeMutation = useMutation({
    mutationFn: (challenge) =>
      base44.entities.DailyChallenge.update(challenge.id, {
        completed: true,
        current_progress: challenge.target_value
      }),
    onMutate: async (challenge) => {
      const queryKey = ['dailyChallenges', today];
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData(queryKey);
      queryClient.setQueryData(queryKey, (current = []) =>
        current.map((item) =>
          item.id === challenge.id
            ? { ...item, completed: true, current_progress: challenge.target_value }
            : item
        )
      );
      return { previous, queryKey };
    },
    onError: (_error, _challenge, context) => {
      if (context?.previous) queryClient.setQueryData(context.queryKey, context.previous);
    },
    onSettled: (_data, _error, _challenge, context) => {
      queryClient.invalidateQueries({ queryKey: context?.queryKey || ['dailyChallenges', today] });
    }
  });

  const completed = challenges.filter(c => c.completed).length;
  const total = challenges.length;

  if (isLoading) return null;

  return (
    <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-purple-600" />
            Today's Challenges
          </CardTitle>
          <Badge className="bg-purple-100 text-purple-700 border-0">
            {completed}/{total} completed
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {challenges.length === 0 ? (
          <div className="text-center py-8">
            <Sparkles className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-muted-foreground">New challenges coming soon!</p>
          </div>
        ) : (
          challenges.map((challenge, i) => (
            <motion.div
              key={challenge.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <div className={cn(
                "bg-white rounded-xl p-4 transition-all",
                challenge.completed ? "opacity-75" : "hover:shadow-md"
              )}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <PremiumIcon name={challengeIcons[challenge.challenge_type] || 'sparkle'} size="sm" className="shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-foreground">{challenge.title}</p>
                        <Badge className={difficultyColors[challenge.difficulty]} variant="secondary">
                          {challenge.difficulty}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{challenge.description}</p>
                      
                      {/* Progress Bar */}
                      {challenge.target_value > 1 && (
                        <div className="mb-2">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-xs text-muted-foreground">Progress</p>
                            <p className="text-xs font-semibold text-muted-foreground">
                              {challenge.current_progress}/{challenge.target_value}
                            </p>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ 
                                width: `${(challenge.current_progress / challenge.target_value) * 100}%` 
                              }}
                              className="bg-gradient-to-r from-purple-400 to-blue-500 h-2 rounded-full"
                            />
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Sparkles className="w-3 h-3 text-yellow-500" />
                        <span>{challenge.points} points</span>
                      </div>
                    </div>
                  </div>

                  {challenge.completed ? (
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle2 className="w-5 h-5" />
                      <span className="text-sm font-semibold">Done!</span>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => completeMutation.mutate(challenge)}
                      disabled={completeMutation.isPending}
                      className="border-purple-300 hover:bg-purple-50"
                     mobileLabelKey="save">
                      <Circle className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          ))
        )}
      </CardContent>
    </Card>
  );
}