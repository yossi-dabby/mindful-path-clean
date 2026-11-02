import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, Brain, MessageCircle, BookOpen, Target, Dumbbell, Play, Sparkles, CirclePlay, Compass, ClipboardList } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { motion, AnimatePresence } from 'framer-motion';
import AiPersonalizedFeed from './AiPersonalizedFeed';
import StarterPathQuickAction from './StarterPathQuickAction';
import VideoModal from './VideoModal';
import { useTranslation } from 'react-i18next';
import { gamesCatalog } from '@/components/experiential_games/mindGamesContent';

export default function QuickActions() {
  const { t } = useTranslation();
  const [activeVideo, setActiveVideo] = useState(null);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [showRecommendedVideo, setShowRecommendedVideo] = useState(false);
  const [showStarterPathVideo, setShowStarterPathVideo] = useState(false);
  const therapeuticActions = [
  {
    title: t('quick_actions.ai_therapist.title'),
    description: t('quick_actions.ai_therapist.description'),
    icon: MessageCircle,
    intent: null,
    page: 'Chat',
    color: '#26A69A',
    bgColor: 'rgba(38, 166, 154, 0.15)',
    videoUrl: 'https://firebasestorage.googleapis.com/v0/b/my-cbt-therapy.firebasestorage.app/o/AI%20Therapist.mp4?alt=media&token=db591799-a5af-422f-9b95-0c4ceb15f17b'
  },
  {
    title: t('quick_actions.journal_thought.title'),
    description: t('quick_actions.journal_thought.description'),
    icon: BookOpen,
    intent: null,
    page: 'ThoughtCoach',
    testIds: ['quickaction-thoughtcoach', 'quickaction-thoughtcoach-card'],
    color: '#9F7AEA',
    bgColor: 'rgba(159, 122, 234, 0.15)',
    videoUrl: 'https://firebasestorage.googleapis.com/v0/b/my-cbt-therapy.firebasestorage.app/o/Journal%20a%20Thought.mp4?alt=media&token=863057e2-8265-47cc-ade1-1fae55cbca20'
  },
  {
    title: t('quick_actions.set_goal.title'),
    description: t('quick_actions.set_goal.description'),
    icon: Target,
    intent: null,
    page: 'GoalCoach',
    testIds: ['quickaction-goalcoach', 'quickaction-goalcoach-card'],
    color: '#F6AD55',
    bgColor: 'rgba(246, 173, 85, 0.15)',
    videoUrl: 'https://firebasestorage.googleapis.com/v0/b/my-cbt-therapy.firebasestorage.app/o/Goal%20Coach.mp4?alt=media&token=f28cf868-bf68-4896-816e-2a02e43951de'
  },
  {
    title: t('quick_actions.mind_games.title'),
    description: t('quick_actions.mind_games.description'),
    icon: Brain,
    page: 'ExperientialGames',
    color: '#4299E1',
    bgColor: 'rgba(66, 153, 225, 0.15)',
    videoUrl: 'https://firebasestorage.googleapis.com/v0/b/my-cbt-therapy.firebasestorage.app/o/Mind%20Games.mp4?alt=media&token=275ef615-9611-457c-8e0e-f17c5621dac7',
    testIds: ['quickaction-grounding', 'quickaction-mindgames'],
    premiumMindGames: true
  },
  {
    title: t('quick_actions.journeys.title'),
    description: t('quick_actions.journeys.description'),
    icon: Compass,
    page: 'Journeys',
    testIds: ['quickaction-journeys', 'quickaction-journeys-card'],
    color: '#8B5CF6',
    bgColor: 'rgba(139, 92, 246, 0.15)',
    videoUrl: 'https://firebasestorage.googleapis.com/v0/b/my-cbt-therapy.firebasestorage.app/o/Journeys.mp4?alt=media&token=07d21248-a2b0-47ed-ab83-bf26a0ca0d0b',
    premiumJourneys: true
  }];


  const selfDirectedActions = [
  {
    title: t('quick_actions.exercises_library.title'),
    description: t('quick_actions.exercises_library.description'),
    icon: Dumbbell,
    page: 'Exercises',
    color: '#38B2AC',
    bgColor: 'rgba(56, 178, 172, 0.15)',
    videoUrl: 'https://firebasestorage.googleapis.com/v0/b/my-cbt-therapy.firebasestorage.app/o/Exercises%20Library.mp4?alt=media&token=3c3d0112-f226-4a69-b8c9-74ad0a5a3a05'
  },
  {
    title: t('quick_actions.video_library.title'),
    description: t('quick_actions.video_library.description'),
    icon: Play,
    page: 'Videos',
    color: '#ED8936',
    bgColor: 'rgba(237, 137, 54, 0.15)',
    videoUrl: 'https://firebasestorage.googleapis.com/v0/b/my-cbt-therapy.firebasestorage.app/o/CBT%20Video%20Library.mp4?alt=media&token=3e7a4ce8-5b61-4398-8579-dd2c42c83687'
  },
  {
    title: t('quick_actions.therapeutic_forms.title'),
    description: t('quick_actions.therapeutic_forms.description'),
    icon: ClipboardList,
    page: 'TherapeuticForms',
    color: '#6B7280',
    bgColor: 'rgba(107, 114, 128, 0.15)',
    videoUrl: null,
    testIds: ['quickaction-therapeutic-forms']
  }];


  const actions = [...therapeuticActions, ...selfDirectedActions];

  return (
    <div className="mb-6">
      <h2 className="text-emerald-600 mb-4 text-lg font-semibold truncate">{t('quick_actions.title')}</h2>
      <div className="rounded-3xl grid grid-cols-2 md:grid-cols-3 gap-4 w-full overflow-x-hidden">
        {/* AI Recommendations Card */}
        <div className="relative min-w-0 rounded-lg">
          <Card
            className="group h-full overflow-hidden rounded-[20px] border border-border/60 bg-[hsl(var(--card)/0.94)] text-card-foreground shadow-[var(--shadow-md)] backdrop-blur-[10px] transition-all hover:shadow-[var(--shadow-lg)]"
            style={{ borderColor: 'rgba(118, 170, 156, 0.34)', background: 'linear-gradient(180deg, rgba(255,252,248,0.99) 0%, rgba(227,244,238,0.96) 100%)', boxShadow: '0 24px 56px rgba(68, 108, 96, 0.16), 0 10px 22px rgba(68, 108, 96, 0.08)' }}
          >
              <CardContent className="rounded-[20px] p-5">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-[var(--radius-control)] bg-primary text-accent-foreground shadow-[var(--shadow-sm)]">
                    <Sparkles className="h-7 w-7 text-slate-50" strokeWidth={2.5} />
                  </div>
                  <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowRecommendedVideo(true);
                  }} className="flex h-14 w-14 items-center justify-center rounded-[var(--radius-control)] border-0 bg-green-100 text-emerald-50 transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"

                  aria-label={t('quick_actions.aria.guided_intro_video')}
                  title={t('quick_actions.aria.guided_intro_video')}>

                    <CirclePlay className="h-6 w-6 text-primary" strokeWidth={2.2} />
                  <span className="mobile-action-label md:hidden">{t('quick_actions.aria.guided_intro_video')}</span></button>
                </div>
                <button
                  type="button"
                  onClick={() => setShowRecommendations(true)}
                  className="min-h-12 w-full rounded-xl text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  aria-label={t('recommendations.premium.open_aria')}
                  data-testid="recommended-action"
                >
                  <h3 className="mb-1 break-words text-sm font-semibold text-foreground">{t('quick_actions.recommended.title')}</h3>
                  <p className="line-clamp-2 break-words text-xs leading-5 text-primary">{t('quick_actions.recommended.description')}</p>
                </button>
              </CardContent>
            </Card>
        </div>

        <StarterPathQuickAction onWatchVideo={() => setShowStarterPathVideo(true)} />

        {actions.map((action) => {
          const Icon = action.icon;
          const destination = action.intent ? createPageUrl('Chat', `intent=${action.intent}`) : createPageUrl(action.page);
          return (
            <div key={action.title} className="relative min-w-0">
                <Card className="group h-full overflow-hidden rounded-[20px] border border-border/60 bg-[hsl(var(--card)/0.94)] text-card-foreground shadow-[var(--shadow-md)] backdrop-blur-[10px] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-lg)]"
                style={{ borderColor: action.premiumMindGames ? 'rgba(59, 130, 246, 0.28)' : 'rgba(118, 170, 156, 0.34)', background: action.premiumMindGames ? 'linear-gradient(160deg, rgba(248,253,255,0.99) 0%, rgba(222,243,240,0.97) 58%, rgba(235,232,255,0.94) 100%)' : 'linear-gradient(180deg, rgba(255,252,248,0.99) 0%, rgba(230,244,238,0.96) 100%)', boxShadow: '0 24px 56px rgba(68, 108, 96, 0.16), 0 10px 22px rgba(68, 108, 96, 0.08)' }}
                data-testid={action.testIds ? action.testIds[1] : undefined}>

                  <CardContent className="relative rounded-2xl p-5">
                    <Link
                      to={destination}
                      className="absolute inset-0 z-0 rounded-[20px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                      aria-label={action.title}
                      data-testid={action.testIds ? action.testIds[0] : undefined}
                    >
                      <span className="sr-only">{action.title}</span>
                    </Link>
                    <div className="pointer-events-none relative z-10 mb-4 flex items-center gap-3">
                      <div
                        className="w-14 h-14 flex items-center justify-center rounded-[var(--radius-control)]"
                        style={{ background: `linear-gradient(180deg, ${action.color} 0%, ${action.color}dd 100%)`, boxShadow: '0 16px 30px rgba(68, 108, 96, 0.16)' }}>

                        <Icon className="w-7 h-7 text-white" strokeWidth={2.5} />
                      </div>
                      
                      {/* Angel Button - next to icon */}
                      {action.videoUrl &&
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setActiveVideo(action.videoUrl);
                        }}
                        className="pointer-events-auto flex h-14 w-14 cursor-pointer items-center justify-center rounded-[var(--radius-control)] border-0 outline-none transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        style={{ backgroundColor: action.bgColor }}
                        aria-label={t('quick_actions.aria.guided_intro_video')}
                        title={t('quick_actions.aria.guided_intro_video')}>

                        <CirclePlay className="w-6 h-6 icon-default" style={{ color: action.color }} strokeWidth={2.2} />
                      <span className="mobile-action-label md:hidden">{t('quick_actions.aria.guided_intro_video')}</span></button>
                      }
                    </div>
                    <div className="pointer-events-none relative z-10">
                      <h3 className="mb-1 break-words text-sm font-semibold text-foreground">{action.title}</h3>
                      <p className="line-clamp-2 break-words text-xs leading-5 text-primary">{action.description}</p>
                      {action.premiumMindGames && (
                        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-[11px] font-semibold text-primary">
                          <span className="rounded-full bg-[hsl(var(--card)/0.97)] px-2.5 py-1 shadow-sm">
                            {t('mind_games.premium.games_count', { count: gamesCatalog.length })}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            {t('mind_games.premium.explore')}
                            <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" aria-hidden="true" />
                          </span>
                        </div>
                      )}
                      {action.premiumJourneys && (
                        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-violet-800/10 pt-3 text-[11px] font-semibold text-violet-800">
                          <span className="rounded-full bg-[hsl(var(--card)/0.97)] px-2.5 py-1 shadow-sm">
                            {t('journeys.premium.card_badge')}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            {t('journeys.premium.explore')}
                            <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" aria-hidden="true" />
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
            </div>);

        })}
      </div>

      {/* Video Modal */}
      <AnimatePresence>
        {activeVideo &&
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.85)' }}
          onClick={() => setActiveVideo(null)}>

            <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative w-full max-w-4xl"
            onClick={(e) => e.stopPropagation()}
            style={{
              borderRadius: '24px',
              overflow: 'hidden',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
            }}>

              <button
              onClick={() => setActiveVideo(null)}
              className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center text-white hover:bg-[hsl(var(--card)/0.97)] transition-colors"
              style={{
                borderRadius: '50%',
                backgroundColor: 'rgba(0,0,0,0.5)',
                border: 'none',
                cursor: 'pointer'
              }}
              aria-label="Close video">

                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
              <video
              autoPlay
              controls
              playsInline
              className="w-full"
              style={{ maxHeight: '80vh', backgroundColor: '#000' }}>

                <source src={activeVideo} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </motion.div>
          </motion.div>
        }
      </AnimatePresence>

      {/* Recommended for You Video Modal */}
      {showRecommendedVideo &&
      <VideoModal
        videoUrl="https://firebasestorage.googleapis.com/v0/b/my-cbt-therapy.firebasestorage.app/o/Recommended%20for%20You.mp4?alt=media&token=d6126635-2c04-459b-b88c-fce5d36135b5"
        onClose={() => setShowRecommendedVideo(false)} />

      }

      {/* StarterPath Video Modal */}
      {showStarterPathVideo &&
      <VideoModal
        videoUrl="https://firebasestorage.googleapis.com/v0/b/my-cbt-therapy.firebasestorage.app/o/7-Day%20Starter%20Path.mp4?alt=media&token=4fcbf1a9-fbec-42f2-a969-fb887f804819"
        onClose={() => setShowStarterPathVideo(false)} />

      }

      {/* AI Recommendations Modal */}
      <Dialog open={showRecommendations} onOpenChange={setShowRecommendations}>
        <DialogContent
          closeLabel={t('recommendations.premium.close_aria')}
          className="max-h-[calc(100dvh-2rem)] max-w-3xl overflow-y-auto rounded-t-[28px] p-4 sm:max-h-[calc(100vh-4rem)] sm:rounded-[28px] sm:p-6"
          data-testid="recommendations-dialog"
        >
          <DialogHeader className="pe-10 text-start">
            <DialogTitle className="flex items-center gap-2 text-xl text-primary sm:text-2xl">
              <Sparkles className="h-5 w-5 shrink-0 text-primary" />
              {t('quick_actions.personalized_recommendations')}
            </DialogTitle>
            <DialogDescription>{t('recommendations.premium.modal_description')}</DialogDescription>
          </DialogHeader>
          <AiPersonalizedFeed />
        </DialogContent>
      </Dialog>
    </div>);

}
