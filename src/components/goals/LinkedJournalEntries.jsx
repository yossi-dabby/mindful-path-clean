import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Calendar, TrendingDown } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

// Helper to strip HTML tags
const stripHtml = (html) => {
  if (!html) return '';
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
};

export default function LinkedJournalEntries({ goalId }) {
  const { data: entries, isLoading } = useQuery({
    queryKey: ['linkedJournalEntries', goalId],
    queryFn: () => base44.entities.ThoughtJournal.filter({ linked_goal_id: goalId }, '-created_date'),
    initialData: []
  });

  if (isLoading) {
    return (
      <Card className="border border-border/70 bg-card shadow-[var(--shadow-md)]">
        <CardContent className="p-6 text-center text-muted-foreground">
          Loading related entries...
        </CardContent>
      </Card>
    );
  }

  if (entries.length === 0) {
    return (
      <Card className="border border-border/70 bg-card shadow-[var(--shadow-md)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="w-4 h-4" />
            Related Journal Entries
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <p className="text-sm text-muted-foreground">
            No journal entries linked to this goal yet.
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Link entries when journaling to track context and insights.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-border/70 bg-card shadow-[var(--shadow-md)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BookOpen className="w-4 h-4" />
          Related Journal Entries ({entries.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {entries.map((entry) => {
          const intensityChange = entry.emotion_intensity - entry.outcome_emotion_intensity;
          const improvement = intensityChange > 0;
          
          return (
            <div
              key={entry.id}
              className="p-3 rounded-lg border border-border hover:border-purple-300 hover:bg-secondary/70 transition-all"
            >
              <div className="flex items-start justify-between mb-2">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {(() => {
                    try {
                      const date = new Date(entry.created_date);
                      return !isNaN(date.getTime()) ? format(date, 'MMM d, yyyy') : 'Date unavailable';
                    } catch {
                      return 'Date unavailable';
                    }
                  })()}
                </p>
                {entry.outcome_emotion_intensity && (
                  <div className={cn(
                    'px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1',
                    improvement ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-muted-foreground'
                  )}>
                    {improvement && <TrendingDown className="w-3 h-3" />}
                    {entry.emotion_intensity} → {entry.outcome_emotion_intensity}
                  </div>
                )}
              </div>
              
              <p className="text-sm text-foreground line-clamp-2 mb-2">
                {stripHtml(entry.situation)}
              </p>
              
              <div className="flex flex-wrap gap-1">
                {entry.emotions?.slice(0, 3).map((emotion) => (
                  <Badge key={emotion} variant="secondary" className="text-xs bg-purple-100 text-purple-700">
                    {emotion}
                  </Badge>
                ))}
                {entry.emotions?.length > 3 && (
                  <Badge variant="secondary" className="text-xs bg-gray-100 text-muted-foreground">
                    +{entry.emotions.length - 3}
                  </Badge>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}