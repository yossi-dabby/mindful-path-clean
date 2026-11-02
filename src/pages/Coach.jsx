import BotanicalAccent from '@/components/brand/BotanicalAccent';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Heart, Target, MessageCircle, TrendingUp, BarChart3, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import CoachingSessionList from '../components/coaching/CoachingSessionList';
import CoachingSessionWizard from '../components/coaching/CoachingSessionWizard';
import CoachingChat from '../components/coaching/CoachingChat';
import PersonalizedInsights from '../components/coaching/PersonalizedInsights';

export default function Coach() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [showWizard, setShowWizard] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const queryClient = useQueryClient();

  const { data: user, isLoading: isUserLoading, isError: isUserError } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: sessions, isLoading: isSessionsLoading, isError: isSessionsError, refetch: refetchSessions } = useQuery({
    queryKey: ['coachingSessions', user?.email],
    queryFn: async () => {
      if (!user) return [];
      try {
        return await base44.entities.CoachingSession.filter(
          { created_by: user.email },
          '-created_date'
        );
      } catch (error) {
        console.error('Error fetching coaching sessions:', error);
        throw error;
      }
    },
    enabled: !!user
  });

  const safeSessions = Array.isArray(sessions) ? sessions : [];
  const isCoachLoading = isUserLoading || isSessionsLoading;
  const isCoachError = isUserError || isSessionsError;
  const activeSessions = safeSessions.filter((s) => s.status === 'active');
  const completedSessions = safeSessions.filter((s) => s.status === 'completed');

  const handleStartSession = () => {
    setShowWizard(true);
    setSelectedSession(null);
  };

  const handleSelectSession = (session) => {
    setSelectedSession(session);
  };

  const handleCloseWizard = () => {
    setShowWizard(false);
    setSelectedSession(null);
  };

  const deleteSessionMutation = useMutation({
    mutationFn: (sessionId) => base44.entities.CoachingSession.delete(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coachingSessions'] });
    },
    onError: (error) => {
      console.error('Failed to delete session:', error);
      alert(t('coach.delete_error'));
    }
  });

  const handleDeleteSession = (sessionId) => {
    if (confirm(t('coach.delete_confirm'))) {
      deleteSessionMutation.mutate(sessionId);
    }
  };

  // If wizard is shown, render it as the main content (not overlay)
  if (showWizard) {
    return <CoachingSessionWizard onClose={handleCloseWizard} onSessionCreated={(session) => {
      setSelectedSession(session);
      setShowWizard(false);
    }} />;
  }

  // If session is selected, show chat
  if (selectedSession) {
    return (
      <CoachingChat
        session={selectedSession}
        onBack={() => setSelectedSession(null)} />);


  }

  // Main coach page
  return (
    <main data-testid="coach-page" className="min-h-[100dvh] w-full bg-transparent p-3 sm:p-5">
      {/* Mobile Header - Matches web structure */}
      <motion.header className="rounded-[26px] border border-border/70 bg-card/95 p-3 shadow-[var(--shadow-sm)] backdrop-blur-2xl md:hidden"

      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}>

        <div className="garden-responsive-heading flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
              style={{ borderRadius: '50%', width: '36px', height: '36px' }}
              aria-label={t('coach.go_back_aria')} className="text-primary font-medium tracking-[0.005em] leading-none rounded-[var(--radius-control)] inline-flex items-center justify-center gap-2 whitespace-nowrap border border-transparent transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow-none hover:bg-secondary/78 hover:text-foreground active:bg-secondary/88 h-9 w-9 min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0">

              <ArrowLeft className="w-5 h-5 rtl:scale-x-[-1]" />
            </Button>
            <motion.div className="bg-primary text-primary-foreground rounded-[20px] w-9 h-9 flex items-center justify-center shadow-[var(--shadow-sm)]"

            whileHover={{ rotate: 360 }}
            transition={{ duration: 0.5 }}>

              <Heart className="w-5 h-5 text-white" />
            </motion.div>
            <div>
              <div className="botanical-title-row"><h1 className="text-foreground text-sm font-semibold">{t('coach.title')}</h1><BotanicalAccent variant="leaves" className="botanical-title-art" /></div>
              <p className="text-primary text-xs font-medium">{t('coach.subtitle')}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link to={createPageUrl('CoachingAnalytics')}>
              <Button variant="ghost" size="icon" style={{ borderRadius: '50%', width: '36px', height: '36px' }} aria-label={t('coach.analytics_aria')} className="text-primary font-medium tracking-[0.005em] leading-none rounded-[var(--radius-control)] inline-flex items-center justify-center gap-2 whitespace-nowrap border border-transparent transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow-none hover:bg-secondary/78 hover:text-foreground active:bg-secondary/88 h-9 w-9 min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0" mobileLabel={t('coach.analytics_aria')}>
                <BarChart3 className="w-5 h-5" />
              </Button>
            </Link>
            <Button
              onClick={handleStartSession}
              size="icon" className="bg-primary text-primary-foreground font-medium tracking-[0.005em] leading-none rounded-full inline-flex items-center justify-center gap-2 whitespace-nowrap border border-transparent transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover:bg-primary/92 hover:shadow-[var(--shadow-lg)] active:bg-primary/95 min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0 w-9 h-9 shadow-[var(--shadow-sm)]"

              aria-label={t('coach.new_session_aria')} mobileLabel={t('coach.new_session_aria')}>

              <Target className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </motion.header>

      {/* Desktop Header - Hidden on mobile */}
      <motion.header className="hidden rounded-[26px] border border-border/70 bg-card/95 p-4 shadow-[var(--shadow-sm)] backdrop-blur-2xl md:block"

      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}>

        <div className="garden-responsive-heading max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
              style={{ borderRadius: '50%' }}
              aria-label={t('coach.go_back_aria')} className="text-primary font-medium tracking-[0.005em] leading-none rounded-[var(--radius-control)] inline-flex items-center justify-center gap-2 whitespace-nowrap border border-transparent transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow-none hover:bg-secondary/78 hover:text-foreground active:bg-secondary/88 h-9 w-9 min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0">

              <ArrowLeft className="w-5 h-5 rtl:scale-x-[-1]" />
            </Button>
            <motion.div className="bg-primary text-primary-foreground rounded-3xl w-12 h-12 flex items-center justify-center shadow-[var(--shadow-md)]"

            whileHover={{ rotate: 360 }}
            transition={{ duration: 0.5 }}>

              <Heart className="w-6 h-6 text-white" />
            </motion.div>
            <div>
              <div className="botanical-title-row"><h1 className="text-foreground text-xl font-semibold">{t('coach.title')}</h1><BotanicalAccent variant="leaves" className="botanical-title-art" /></div>
              <p className="text-primary text-sm">{t('coach.subtitle')}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Link to={createPageUrl('CoachingAnalytics')}>
              <Button variant="outline" className="bg-primary text-primary-foreground px-4 py-2 font-medium tracking-[0.005em] leading-none rounded inline-flex items-center justify-center whitespace-nowrap transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-border/70 shadow-[var(--shadow-sm)] hover:bg-secondary/92 hover:text-foreground active:bg-secondary/96 h-9 min-h-[44px] md:min-h-0 gap-2 shadow-sm" style={{ borderRadius: '24px' }}>
                <BarChart3 className="w-4 h-4" />
                {t('coach.analytics')}
              </Button>
            </Link>
            <Button
              onClick={handleStartSession} className="bg-primary text-primary-foreground px-4 py-2 font-medium tracking-[0.005em] leading-none rounded-2xl inline-flex items-center justify-center gap-2 whitespace-nowrap border border-transparent transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow-[var(--shadow-md)] hover:bg-primary/92 hover:shadow-[var(--shadow-lg)] active:bg-primary/95 h-9 min-h-[44px] md:min-h-0">


              <Target className="w-5 h-5 mr-2" />
              {t('coach.start_new_session')}
            </Button>
          </div>
        </div>
      </motion.header>

      {/* Content */}
      <div className="mx-auto w-full max-w-7xl p-3 pb-32 sm:p-4 md:p-6 md:pb-24">
        {isCoachLoading ? (
          <div className="min-h-[40vh] flex flex-col items-center justify-center gap-3" role="status" aria-live="polite">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium text-primary">{t('coach.loading')}</p>
          </div>
        ) : isCoachError ? (
          <Card className="mt-4 border border-red-200 bg-[hsl(var(--card)/0.97)] shadow-[var(--shadow-md)] md:mt-10">
            <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
              <AlertCircle className="h-10 w-10 text-red-500" />
              <p className="font-medium text-muted-foreground">{t('coach.load_error')}</p>
              <Button variant="outline" onClick={() => refetchSessions()}>{t('coach.retry')}</Button>
            </CardContent>
          </Card>
        ) : safeSessions.length === 0 ?
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-4 md:mt-12">

            <Card className="overflow-hidden border border-border/70 bg-card/95 shadow-[var(--shadow-xl)] backdrop-blur-xl">
              <CardContent className="p-6 text-center sm:p-8 md:p-12">
                {/* Animated Heart icon */}
                <motion.div className="bg-primary text-teal-100 mb-4 mx-auto rounded-full w-16 h-16 md:w-20 md:h-20 flex items-center justify-center shadow-[var(--shadow-md)]"

              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}>

                  <Heart className="bg-primary text-primary-foreground lucide lucide-heart w-8 h-8 md:w-10 md:h-10" />
                </motion.div>
                <h2 className="mb-3 text-xl font-bold text-foreground md:text-3xl">{t('coach.welcome.title')}</h2>
                <p className="mx-auto mb-6 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">{t('coach.welcome.description')}</p>
                <ul className="text-left text-sm md:text-base mb-6 max-w-lg mx-auto space-y-2 text-foreground/85">
                  <li className="text-muted-foreground">• {t('coach.welcome.bullet_1')}</li>
                  <li className="text-muted-foreground">• {t('coach.welcome.bullet_2')}</li>
                  <li className="text-muted-foreground">• {t('coach.welcome.bullet_3')}</li>
                </ul>
                <Button
                data-testid="coach-start-first"
                onClick={handleStartSession}
                size="lg" className="bg-primary text-primary-foreground px-8 py-6 text-base font-medium tracking-[0.005em] rounded-2xl inline-flex items-center justify-center gap-2 whitespace-nowrap border border-transparent duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover:bg-primary/92 hover:shadow-[var(--shadow-lg)] active:bg-primary/95 h-10 min-h-[44px] md:min-h-0 shadow-[var(--shadow-lg)] transition-all w-full md:w-auto md:text-lg">


                  <Target className="w-5 h-5 mr-2" />
                  {t('coach.welcome.start')}
                </Button>
                <ul className="text-left text-sm md:text-base mt-6 max-w-lg mx-auto space-y-2 text-foreground/85">
                  <li className="text-muted-foreground">• {t('coach.welcome.bullet_4')}</li>
                  <li className="text-muted-foreground">• {t('coach.welcome.bullet_5')}</li>
                </ul>
              </CardContent>
            </Card>
          </motion.div> :

        <div className="space-y-5 md:space-y-7">
            {/* Personalized Insights */}
            <div>
              <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-foreground md:text-2xl">{t('coach.personalized_insights')}</h2>
              <PersonalizedInsights onStartSession={handleStartSession} />
            </div>

            <Tabs defaultValue="active" className="w-full">
              <TabsList className="grid min-h-[48px] w-full grid-cols-2 gap-1 rounded-[var(--radius-control)] border border-border/70 bg-[hsl(var(--card)/0.97)] p-1 text-muted-foreground shadow-[var(--shadow-sm)] backdrop-blur-xl sm:inline-grid sm:w-auto">
                <TabsTrigger value="active" className="px-3 py-1 font-medium tracking-[0.003em] leading-none rounded-[calc(var(--radius-control)-2px)] inline-flex items-center justify-center whitespace-nowrap min-h-[44px] md:min-h-0 ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-45 hover:bg-secondary/65 hover:text-foreground data-[state=active]:border data-[state=active]:border-primary/12 data-[state=active]:bg-[hsl(var(--card)/0.96)] data-[state=active]:text-primary data-[state=active]:shadow-[var(--shadow-sm)] gap-2">
                  <TrendingUp className="w-4 h-4" />
                  {t('coach.tabs.active', { count: activeSessions.length })}
                </TabsTrigger>
                <TabsTrigger value="completed" className="px-3 py-1 font-medium tracking-[0.003em] leading-none rounded-[calc(var(--radius-control)-2px)] inline-flex items-center justify-center whitespace-nowrap min-h-[44px] md:min-h-0 ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-45 hover:bg-secondary/65 hover:text-foreground data-[state=active]:border data-[state=active]:border-primary/12 data-[state=active]:bg-[hsl(var(--card)/0.96)] data-[state=active]:text-primary data-[state=active]:shadow-[var(--shadow-sm)] gap-2">
                  <MessageCircle className="text-primary lucide lucide-message-circle w-4 h-4" />
                  {t('coach.tabs.completed', { count: completedSessions.length })}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="active">
                <CoachingSessionList
                sessions={activeSessions}
                onSelectSession={handleSelectSession}
                onDeleteSession={handleDeleteSession} />

              </TabsContent>

              <TabsContent value="completed">
                <CoachingSessionList
                sessions={completedSessions}
                onSelectSession={handleSelectSession}
                onDeleteSession={handleDeleteSession} />

              </TabsContent>
            </Tabs>
          </div>
        }

        {/* Mobile FAB for Starting Session */}
        {safeSessions.length > 0 &&
        <Button
          onClick={handleStartSession}
          mobileLabel={t('coach.new_session_aria')} size="lg" className="fixed end-4 z-30 inline-flex h-14 w-14 min-h-[56px] min-w-[56px] items-center justify-center rounded-full border border-border/70 bg-primary p-0 text-primary-foreground shadow-[var(--shadow-xl)] transition hover:bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-45 md:hidden"

          style={{
            bottom: 'calc(env(safe-area-inset-bottom, 0px) + 96px)'
          }}>

            <Target className="w-6 h-6" />
          </Button>
        }
      </div>
    </main>);

}
