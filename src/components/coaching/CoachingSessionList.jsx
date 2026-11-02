import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Target, Calendar, ChevronRight, CheckCircle2, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

const focusAreaColors = {
  mood_improvement: 'bg-blue-100 text-blue-700',
  stress_management: 'bg-purple-100 text-purple-700',
  goal_achievement: 'bg-green-100 text-green-700',
  behavior_change: 'bg-orange-100 text-orange-700',
  relationship: 'bg-pink-100 text-pink-700',
  self_esteem: 'bg-yellow-100 text-yellow-700',
  general: 'bg-gray-100 text-muted-foreground'
};

export default function CoachingSessionList({ sessions, onSelectSession, onDeleteSession }) {
  const { t, i18n } = useTranslation();
  const formatDate = (value) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat(i18n.resolvedLanguage || i18n.language, {
      year: 'numeric', month: 'short', day: 'numeric'
    }).format(date);
  };
  if (sessions.length === 0) {
    return (
      <Card className="rounded-[var(--radius-card)] border border-border/70 bg-[hsl(var(--card)/0.97)] text-card-foreground shadow-[var(--shadow-md)] backdrop-blur-xl">
        <CardContent className="p-8 text-center md:p-12">
          <Target className="mx-auto mb-3 h-12 w-12 text-primary" aria-hidden="true" />
          <p className="font-medium text-primary">{t('coach.session.none')}</p>
        </CardContent>
      </Card>);

  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {sessions.map((session, index) => {
        const completedActions = session.action_plan?.filter((a) => a.completed).length || 0;
        const totalActions = session.action_plan?.length || 0;

        return (
          <motion.div
            key={session.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}>

            <Card className="group rounded-[var(--radius-card)] border border-border/70 bg-[hsl(var(--card)/0.97)] text-card-foreground shadow-[var(--shadow-md)] backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-lg)]">


              <CardContent
                className="cursor-pointer p-4 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:p-6"
                role="button"
                tabIndex={0}
                aria-label={t('coach.session.open_aria', { title: session.title })}
                onClick={() => onSelectSession(session)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSelectSession(session);
                  }
                }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-secondary/70 shadow-[var(--shadow-sm)] sm:h-12 sm:w-12">
                      <Target className="text-primary lucide lucide-target w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-foreground mb-1 font-semibold group-hover:text-foreground transition-colors">
                        {session.title}
                      </h3>
                      <Badge variant="secondary" className="bg-secondary/86 text-primary px-2.5 py-1 font-medium capitalize tracking-[0.01em] leading-4 rounded-[var(--radius-chip)] inline-flex items-center border transition-colors focus:outline-none focus:ring-1 focus:ring-ring focus:ring-offset-1 border-border/60">
                        {t(`coach.focus.${session.focus_area}.label`, { defaultValue: session.focus_area?.replace(/_/g, ' ') })}
                      </Badge>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-primary transition-colors group-hover:text-primary rtl:scale-x-[-1]" aria-hidden="true" />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="text-primary lucide lucide-calendar w-4 h-4" />
                    <span className="font-medium text-primary">{t('coach.session.started', { date: formatDate(session.created_date) })}</span>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="font-medium text-primary">{t('coach.session.stage')}:</span>
                      <span className="font-medium text-primary">{t(`coach.stage.${session.stage || 'discovery'}`)}</span>
                    </div>
                  </div>

                  {totalActions > 0 &&
                  <div>
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-muted-foreground">{t('coach.session.progress')}:</span>
                        <span className="font-medium text-foreground">{t('coach.session.actions', { completed: completedActions, total: totalActions })}</span>
                      </div>
                      <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                        <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${totalActions > 0 ? completedActions / totalActions * 100 : 0}%` }} />

                      </div>
                    </div>
                  }

                  {session.status === 'completed' &&
                  <div className="flex items-center gap-2 text-green-700 text-sm font-medium pt-2 border-t">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{t('coach.session.completed')}</span>
                    </div>
                  }
                </div>
              </CardContent>
              <div className="flex justify-end border-t px-4 pb-3 pt-2 sm:px-6 sm:pb-4 sm:pt-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="min-h-[44px] text-red-600 hover:bg-red-50 hover:text-red-700"
                  aria-label={t('coach.session.delete_aria', { title: session.title })}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteSession(session.id);
                  }}>

                  <Trash2 className="h-4 w-4" />
                  {t('coach.session.delete')}
                </Button>
              </div>
            </Card>
          </motion.div>);

      })}
    </div>);

}