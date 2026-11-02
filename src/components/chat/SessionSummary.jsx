import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CalendarClock, CheckCircle2, Sparkles } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { createPageUrl } from '../../utils';

export default function SessionSummary({ conversation }) {
  const { t } = useTranslation();
  const { data: exercises = [] } = useQuery({
    queryKey: ['exercises'],
    queryFn: () => base44.entities.Exercise.list(),
    initialData: [],
  });

  if (!conversation?.session_summary) return null;

  const recommendedExercise = exercises.find((exercise) =>
    conversation.suggested_exercises?.includes(exercise.id)
  );

  return (
    <section data-testid="chat-session-summary" className="min-w-0 p-3 sm:p-4 md:p-6">
      <Card className="mx-auto max-w-3xl rounded-[28px] border border-border/70 bg-[hsl(var(--card)/0.97)] shadow-[var(--shadow-md)]">
        <CardContent className="space-y-3 p-5 sm:p-6">
          <SummarySection icon={CheckCircle2} title={t('chat_stage.summary.understood')}>
            <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-sm leading-6 text-muted-foreground">{conversation.session_summary}</p>
          </SummarySection>

          <SummarySection icon={Sparkles} title={t('chat_stage.summary.practice')}>
            {recommendedExercise ? (
              <div className="flex flex-col gap-3 rounded-2xl bg-secondary/70 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="break-words font-semibold text-foreground">{recommendedExercise.title}</p>
                  {recommendedExercise.description && <p className="mt-1 line-clamp-2 break-words text-xs leading-5 text-muted-foreground">{recommendedExercise.description}</p>}
                </div>
                <Button asChild className="min-h-11 w-full shrink-0 rounded-xl bg-primary font-semibold text-primary-foreground hover:bg-primary sm:w-auto">
                  <Link to={createPageUrl('Exercises')}>{t('chat_stage.summary.open_practice')}</Link>
                </Button>
              </div>
            ) : (
              <p className="text-sm leading-6 text-muted-foreground">{t('daily_path.action.description')}</p>
            )}
          </SummarySection>

          <SummarySection icon={CalendarClock} title={t('chat_stage.summary.return')}>
            <p className="text-sm leading-6 text-muted-foreground">{t('chat_stage.summary.return_body')}</p>
          </SummarySection>
        </CardContent>
      </Card>
    </section>
  );
}

function SummarySection({ icon: Icon, title, children }) {
  return (
    <section className="rounded-2xl border border-border bg-[hsl(var(--card)/0.97)] p-4">
      <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-foreground">
        <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
        {title}
      </h3>
      {children}
    </section>
  );
}
