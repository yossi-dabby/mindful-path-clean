import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, Send, Loader2, Target, CheckCircle2 } from 'lucide-react';
import { detectLanguage } from '../utils/finalOutputGovernor';
import MessageBubble from '../chat/MessageBubble';
import InlineConsentBanner from '../chat/InlineConsentBanner';
import { resolveCurrentChatConsent } from '@/lib/chatConsent';
import InlineRiskPanel from '../chat/InlineRiskPanel';
import { detectCrisisWithReason } from '../utils/crisisDetector';
import ActionPlanPanel from './ActionPlanPanel';
import { triggerSessionEndSummarization } from '../../lib/sessionEndSummarization.js';
import { useIsMobile } from '@/hooks/use-mobile';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { useTranslation } from 'react-i18next';

export default function CoachingChat({ session, onBack }) {
  const { t } = useTranslation();
  // Stage 1 runtime-path clarification:
  // This is the Coach surface chat (route: /Coach), not the therapist /Chat runtime path.
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showActionPanel, setShowActionPanel] = useState(false);
  const [showConsentBanner, setShowConsentBanner] = useState(false);
  const [isConsentResolved, setIsConsentResolved] = useState(false);
  const [showRiskPanel, setShowRiskPanel] = useState(false);
  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);

  // Check consent on mount
  React.useEffect(() => {
    const isTestEnv =
    window.navigator.webdriver === true ||
    window.Cypress !== undefined ||
    window.playwright !== undefined ||
    /HeadlessChrome/.test(window.navigator.userAgent);

    if (isTestEnv) {
      setShowConsentBanner(false);
      setIsConsentResolved(true);
      return;
    }

    resolveCurrentChatConsent(base44)
      .then((hasConsent) => {
        setShowConsentBanner(!hasConsent);
        setIsConsentResolved(true);
      })
      .catch(() => {
        setShowConsentBanner(true);
        setIsConsentResolved(true);
      });
  }, []);

  const { data: currentSession, refetch: refetchSession } = useQuery({
    queryKey: ['coachingSession', session.id],
    queryFn: () => base44.entities.CoachingSession.get?.(session.id) || session,
    initialData: session
  });

  useEffect(() => {
    const conversationId = currentSession.agent_conversation_id;
    if (!conversationId) return;
    let active = true;
    let revision = 0;
    let openingComplete = false;
    let reading = false;
    let attempts = 0;
    let timer = null;
    setMessages([]);
    setIsLoading(true);

    const acceptSnapshot = (data) => {
      if (!active) return;
      revision += 1;
      const next = data?.messages || [];
      setMessages(next);
      if (next.some((message) => message.role === 'assistant' && message.content)) {
        openingComplete = true;
        if (timer) clearInterval(timer);
        setIsLoading(false);
      }
    };
    const hydrateOpening = async () => {
      if (!active || reading || openingComplete) return;
      if (attempts >= 20) {
        if (timer) clearInterval(timer);
        setIsLoading(false);
        return;
      }
      reading = true;
      attempts += 1;
      const readRevision = revision;
      try {
        const data = await base44.agents.getConversation(conversationId);
        // A late initial read must not replace a newer subscription event.
        if (active && revision === readRevision) acceptSnapshot(data);
      } catch (error) {
        if (active) console.error('Conversation hydration error:', error);
      } finally {
        reading = false;
      }
    };
    const unsubscribe = base44.agents.subscribeToConversation(
      conversationId,
      acceptSnapshot,
      (error) => {
        if (active) {
          console.error('Conversation subscription error:', error);
          setIsLoading(false);
        }
      },
    );
    // The wizard sends the opener before this component subscribes.
    // Hydrate existing messages and briefly poll if its response is still pending.
    if (!openingComplete) timer = setInterval(hydrateOpening, 1500);
    void hydrateOpening();
    return () => {
      active = false;
      clearInterval(timer);
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [currentSession.agent_conversation_id]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    const isNearBottom = distanceFromBottom < 140;

    if (isNearBottom || isLoading) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  const updateStageMutation = useMutation({
    mutationFn: (newStage) =>
    base44.entities.CoachingSession.update(session.id, { stage: newStage }),
    onSuccess: (_, newStage) => {
      refetchSession();
      queryClient.invalidateQueries({ queryKey: ['coachingSessions'] });
      // Phase 2.1: non-blocking session-end summarization trigger.
      // Fires only when stage transitions to 'completed'. Inert when flag is off.
      // Merges newStage into currentSession so the payload reflects the
      // completed stage, not the stale pre-update value.
      if (newStage === 'completed') {
        triggerSessionEndSummarization(
          { ...currentSession, stage: newStage },
          messages,
          'stage_completed',
        );
      }
    }
  });

  const handleSendMessage = async () => {
    if (!isConsentResolved || showConsentBanner) {
      setShowConsentBanner(true);
      return;
    }

    if (!inputMessage.trim() || !currentSession.agent_conversation_id) return;

    // Crisis detection gate - check before sending
    const reasonCode = detectCrisisWithReason(inputMessage);
    if (reasonCode) {
      setShowRiskPanel(true);
      return;
    }

    try {
      const conversation = await base44.agents.getConversation(currentSession.agent_conversation_id);
      setIsLoading(true);
      setInputMessage('');

      await base44.agents.addMessage(conversation, {
        role: 'user',
        content: inputMessage
      });
    } catch (error) {
      console.error('Error sending message:', error);
      setIsLoading(false);
      alert(t('coach.chat.send_error'));
    }
  };

  const quickPrompts = {
    discovery: [1, 2, 3].map((number) => t(`coach.chat.prompt.discovery_${number}`)),
    planning: [1, 2, 3].map((number) => t(`coach.chat.prompt.planning_${number}`)),
    action: [1, 2, 3].map((number) => t(`coach.chat.prompt.action_${number}`)),
    review: [1, 2, 3].map((number) => t(`coach.chat.prompt.review_${number}`))
  };

  const completedActions = currentSession.action_plan?.filter((a) => a.completed).length || 0;
  const totalActions = currentSession.action_plan?.length || 0;

  return (
    <div data-testid="coach-chat" className="flex flex-col bg-transparent" style={{ position: 'fixed', inset: 0, height: '100dvh', overflow: 'hidden', zIndex: 70, paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      {/* Header */}
      <header className="flex-shrink-0 border-b border-border/70 bg-secondary/70 p-3 backdrop-blur-xl sm:p-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-3 flex items-center justify-between gap-2">
            <Button variant="ghost" onClick={onBack} className="text-primary px-4 py-2 font-medium tracking-[0.005em] leading-none rounded-[var(--radius-control)] inline-flex items-center justify-center whitespace-nowrap border border-transparent transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow-none hover:bg-secondary/78 hover:text-foreground active:bg-secondary/88 h-9 min-h-[44px] md:min-h-0 gap-2">
              <ChevronLeft className="w-4 h-4 rtl:scale-x-[-1]" />
              <span className="inline">{t('coach.chat.back')}</span>
            </Button>
            <Badge variant="outline" className="bg-[hsl(var(--card)/0.82)] text-primary px-2.5 py-1 font-medium tracking-[0.01em] leading-4 rounded-[var(--radius-chip)] inline-flex items-center border transition-colors focus:outline-none focus:ring-1 focus:ring-ring focus:ring-offset-1 border-border/70 gap-2">
              <Target className="w-3 h-3" />
              {t(`coach.stage.${currentSession.stage || 'discovery'}`)}
            </Badge>
          </div>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="mb-1 line-clamp-2 text-lg font-bold text-foreground sm:text-xl">{currentSession.title}</h1>
              <p className="line-clamp-2 text-sm leading-5 text-muted-foreground">{currentSession.current_challenge}</p>
            </div>
            {totalActions > 0 &&
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowActionPanel(!showActionPanel)}
              className="min-h-[44px] shrink-0 gap-2"
              aria-label={`${t('coach.chat.action_plan')}: ${completedActions}/${totalActions}`} mobileLabel={`${t('coach.chat.action_plan')}: ${completedActions}/${totalActions}`}>

                <CheckCircle2 className="w-4 h-4" />
                {completedActions}/{totalActions}
              </Button>
            }
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Chat Area */}
        <div className="flex-1 min-h-0 flex flex-col">
          <div ref={scrollContainerRef} data-testid="coach-chat-messages" className="p-4 flex-1 min-h-0 overflow-y-auto" style={{ overscrollBehavior: 'none', WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}>
            <div className="max-w-4xl mx-auto space-y-4">
              {/* Inline Consent Banner - Non-blocking */}
              {showConsentBanner &&
              <InlineConsentBanner onAccept={() => {
                setShowConsentBanner(false);
                setIsConsentResolved(true);
              }} />
              }
              {/* Inline Risk Panel - Non-blocking, shown when crisis language detected */}
              {showRiskPanel &&
              <InlineRiskPanel onDismiss={() => setShowRiskPanel(false)} />
              }
              {messages.filter((m) => m && m.content).map((message, index) =>
              <MessageBubble
                key={index}
                message={message}
                conversationId={currentSession.agent_conversation_id}
                messageIndex={index}
                agentName="ai_coach"
                context="coach"
                userMessage={messages.slice(0, messages.indexOf(message) + 1).filter((m) => m.role === 'user').at(-1)?.content}
                sessionLanguage={detectLanguage(messages.slice(0, messages.indexOf(message) + 1).filter((m) => m.role === 'user').at(-1)?.content || '')} />

              )}
              {isLoading &&
              <div data-testid="coach-loading" className="flex gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center shadow-[var(--shadow-sm)]">
                    <Loader2 className="w-4 h-4 text-primary-foreground animate-spin" />
                  </div>
                  <div className="bg-card rounded-2xl px-4 py-3 shadow-[var(--shadow-sm)] border border-border/80">
                    <p className="text-sm text-muted-foreground">{t('coach.chat.thinking')}</p>
                  </div>
                </div>
              }
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Quick Prompts */}
          {quickPrompts[currentSession.stage] &&
          <div className="border-t border-border/70 bg-secondary/70 px-3 py-2 sm:px-4 sm:py-3">
              <div className="mx-auto max-w-4xl">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary sm:text-sm">{t('coach.chat.quick_prompts')}</p>
                <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
                  {quickPrompts[currentSession.stage].map((prompt, i) =>
                <Button
                  key={i}
                  variant="outline"
                  size="sm"
                  onClick={() => setInputMessage(prompt)} className="inline-flex min-h-[44px] shrink-0 items-center justify-center whitespace-nowrap rounded-full border border-border bg-[hsl(var(--card)/0.97)] px-3 text-xs font-medium text-primary shadow-sm transition hover:bg-secondary/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">


                      {prompt}
                    </Button>
                )}
                </div>
              </div>
            </div>
          }

          {/* Input Area */}
          <div className="flex-shrink-0 border-t border-border/70 bg-secondary/70 p-3 sm:p-4" style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}>
            <div className="mx-auto flex max-w-4xl items-end gap-2 text-primary sm:gap-3">
              <Textarea
                data-testid="coach-chat-input"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder={t('coach.chat.placeholder')}
                className="min-h-[52px] max-h-[160px] flex-1 resize-none rounded-[var(--radius-card)] bg-[hsl(var(--card)/0.97)] text-base"
                enterKeyHint="send"
                autoCapitalize="sentences"
                autoComplete="off"
                autoCorrect="on"
                disabled={isLoading || !isConsentResolved || showConsentBanner} />

              <Button
                data-testid="coach-chat-send"
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isLoading || !isConsentResolved || showConsentBanner}
                aria-label={t('coach.chat.send_aria')}
                className="inline-flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full bg-primary p-0 text-primary-foreground shadow-[var(--shadow-md)] transition hover:bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-45 sm:h-[60px] sm:w-[60px]" mobileLabelKey="send">


                <Send className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Action Plan Panel - drawer on mobile, side panel on desktop */}
        {isMobile ? (
          <Drawer open={showActionPanel} onOpenChange={setShowActionPanel}>
            <DrawerContent>
              <DrawerHeader className="sr-only">
                <DrawerTitle>{t('coach.action_plan.title')}</DrawerTitle>
              </DrawerHeader>
              <ActionPlanPanel
                session={currentSession}
                onClose={() => setShowActionPanel(false)}
                onUpdate={refetchSession}
                className="w-full border-0 rounded-none shadow-none h-auto max-h-[70vh] overflow-y-auto" />
            </DrawerContent>
          </Drawer>
        ) : (
          showActionPanel &&
          <ActionPlanPanel
            session={currentSession}
            onClose={() => setShowActionPanel(false)}
            onUpdate={refetchSession} />
        )}
      </div>
    </div>);

}
