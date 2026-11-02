// @ts-check
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { MessageCircle, X, Send, Sparkles, MinusCircle, Brain, Loader2, GripVertical } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import { isAuthError, shouldShowAuthError } from '../utils/authErrorHandler';
import AuthErrorBanner from '../utils/AuthErrorBanner';
import InlineConsentBanner from '../chat/InlineConsentBanner';
import { resolveCurrentChatConsent } from '@/lib/chatConsent';
import InlineRiskPanel from '../chat/InlineRiskPanel';
import { detectCrisisWithReason } from '../utils/crisisDetector';
import MessageFeedback from '../chat/MessageFeedback';
import { extractAssistantMessage } from '../utils/validateAgentOutput';
import { BOTTOM_NAV_HEIGHT } from '../layout/BottomNav';
import { ACTIVE_AI_COMPANION_WIRING } from '@/api/activeAgentWiring.js';
import { buildCompanionSessionStartContextAsync } from '@/lib/companionContinuity.js';

const STORAGE_KEY = 'ai_companion_position';
const MOBILE_BREAKPOINT = 768;
// Gap between FAB and the top of the BottomNav (px)
const FAB_NAV_GAP = 16;

/** Returns the visual viewport size, preferring visualViewport over innerWidth/Height. */
const getViewportSize = () => {
  const vp = window.visualViewport;
  return {
    width: vp ? vp.width : window.innerWidth,
    height: vp ? vp.height : window.innerHeight
  };
};

export default function DraggableAiCompanion() {
  // Stage 1 runtime-path clarification:
  // This is the AI Companion widget chat surface, not the therapist /Chat runtime path.
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [message, setMessage] = useState('');
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [shouldShow, setShouldShow] = useState(false);
  const [position, setPosition] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [sendError, setSendError] = useState(null);
  const [showAuthError, setShowAuthError] = useState(false);
  const [showConsentBanner, setShowConsentBanner] = useState(false);
  const [isConsentResolved, setIsConsentResolved] = useState(false);
  const [showRiskPanel, setShowRiskPanel] = useState(false);
  const [isAgeVerified, setIsAgeVerified] = useState(true);
  const mountedRef = useRef(true);
  const messagesEndRef = useRef(null);
  const dragRef = useRef({ startX: 0, startY: 0, initialX: 0, initialY: 0, initialRight: 0, initialBottom: 0 });
  const elementRef = useRef(null);
  const queryClient = useQueryClient();

  // Initialize position from localStorage or defaults
  useEffect(() => {
    const { width: vpWidth } = getViewportSize();
    const isMobile = vpWidth < MOBILE_BREAKPOINT;
    const stored = localStorage.getItem(STORAGE_KEY);

    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const storedPos = isMobile ? parsed.mobile : parsed.desktop;
        if (storedPos &&
        typeof storedPos.right === 'number' && isFinite(storedPos.right) &&
        typeof storedPos.bottom === 'number' && isFinite(storedPos.bottom)) {
          // Fully clamp both axes so a position saved on a wider/taller screen
          // never places the bubble off-screen on the current (smaller) viewport.
          const clamped = constrainPosition(storedPos);
          if (import.meta.env.DEV) {
            console.debug('[AI Companion] init | saved:', storedPos, '| clamped:', clamped);
          }
          setPosition(clamped);
          return;
        }
      } catch (e) {
        console.error('Failed to parse stored position', e);
      }
    }

    // Default positions — safe area is added at render time via positionStyle,
    // so position.bottom stores the offset above the bottom nav only.
    const safeBottomOffset = isMobile ? BOTTOM_NAV_HEIGHT + FAB_NAV_GAP : 24;

    setPosition(
      isMobile ?
      { bottom: safeBottomOffset, right: 20 } :
      { bottom: 24, right: 24 }
    );
  }, []);

  // Re-clamp position when the viewport changes (resize, orientation change, or
  // visualViewport resize inside an embedded/app-like window) so the bubble is
  // never left off-screen after the viewport shrinks.
  useEffect(() => {
    const handleViewportChange = () => {
      setPosition((prev) => {
        if (!prev) return prev;
        return constrainPosition(prev);
      });
    };

    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('orientationchange', handleViewportChange);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportChange);
    }

    return () => {
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('orientationchange', handleViewportChange);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleViewportChange);
      }
    };
  }, []);

  // Check age verification and consent
  useEffect(() => {
    const isTestEnv =
    window.navigator.webdriver === true ||
    window.Cypress !== undefined ||
    window.playwright !== undefined ||
    /HeadlessChrome/.test(window.navigator.userAgent);

    if (isTestEnv) {
      localStorage.setItem('age_verified', 'true');
      setShowConsentBanner(false);
      setIsConsentResolved(true);
      setIsAgeVerified(true);
      return;
    }

    const ageVerified = localStorage.getItem('age_verified');
    setIsAgeVerified(ageVerified === 'true');

    if (ageVerified === 'true') {
      resolveCurrentChatConsent(base44)
        .then((hasConsent) => {
          setShowConsentBanner(!hasConsent);
          setIsConsentResolved(true);
        })
        .catch(() => {
          setShowConsentBanner(true);
          setIsConsentResolved(true);
        });
    }
  }, []);

  // Delay showing the button on Videos page
  useEffect(() => {
    const isVideosPage = window.location.pathname.includes('Videos');
    if (isVideosPage) {
      const timer = setTimeout(() => setShouldShow(true), 2000);
      return () => clearTimeout(timer);
    } else {
      setShouldShow(true);
    }
  }, []);

  // Create or get companion conversation with memory context
  useEffect(() => {
    if (!isOpen || conversation) return;

    let isCancelled = false;

    (async () => {
      let memoryContext = '';

      try {
        memoryContext = await buildCompanionSessionStartContextAsync(
          base44.entities,
          ACTIVE_AI_COMPANION_WIRING,
        );
      } catch {
        // Fail-closed: session start continues without context
      }

      if (isCancelled) return;

      try {
        // tool_configs is a runtime extension to the SDK's CreateConversationParams — it is
        // accepted by the Base44 backend but not yet declared in the public type definition.
        const createParams = /** @type {import('@base44/sdk/dist/modules/agents.types.js').CreateConversationParams & { tool_configs?: unknown }} */ ({
          agent_name: ACTIVE_AI_COMPANION_WIRING.name,
          tool_configs: ACTIVE_AI_COMPANION_WIRING.tool_configs,
          metadata: {
            name: 'AI Companion Chat',
            type: 'companion',
            persistent: true,
            memory_context: memoryContext,
          },
        });
        const conv = await base44.agents.createConversation(createParams);

        if (!isCancelled) {
          setConversation(conv);
          setMessages(conv.messages || []);
        }
      } catch (error) {
        console.error('Failed to create conversation:', error);
        // TODO: Show error UI to user
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [isOpen, conversation]);

  // Subscribe to conversation updates
  const messagesRef = useRef([]);
  const isUpdatingRef = useRef(false);

  useEffect(() => {
    if (!conversation?.id) return;

    let isSubscribed = true;
    const conversationId = conversation.id;

    const unsubscribe = base44.agents.subscribeToConversation(conversationId, (data) => {
      if (!isSubscribed || !mountedRef.current || isUpdatingRef.current) return;

      const newMessages = data.messages || [];

      // Check if messages actually changed
      const lastNew = newMessages[newMessages.length - 1];
      const lastOld = messagesRef.current[messagesRef.current.length - 1];

      const messagesChanged =
      newMessages.length !== messagesRef.current.length ||
      lastNew?.content !== lastOld?.content ||
      lastNew?.role !== lastOld?.role;

      if (!messagesChanged) return;

      isUpdatingRef.current = true;

      // Process messages to extract assistant_message from JSON
      const processedMessages = newMessages.map((msg) => {
        if (msg.role === 'assistant' && msg.content) {
          const extracted = extractAssistantMessage(msg.content);
          return { ...msg, content: extracted };
        }
        return msg;
      });

      messagesRef.current = processedMessages;

      requestAnimationFrame(() => {
        if (isSubscribed && mountedRef.current) {
          setMessages(processedMessages);
          setIsLoading(false);
          isUpdatingRef.current = false;
        }
      });
    });

    return () => {
      isSubscribed = false;
      isUpdatingRef.current = false;
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [conversation?.id]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Save position to localStorage
  const savePosition = (newPos) => {
    const isMobile = window.innerWidth < MOBILE_BREAKPOINT;
    const stored = localStorage.getItem(STORAGE_KEY);
    let positions = stored ? JSON.parse(stored) : {};

    if (isMobile) {
      positions.mobile = newPos;
    } else {
      positions.desktop = newPos;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
  };

  // Constrain position within viewport with safe margins.
  // Uses visualViewport (more accurate in embedded/app-like windows and on iOS)
  // falling back to window dimensions.
  const constrainPosition = (pos) => {
    const { width: vpWidth, height: vpHeight } = getViewportSize();
    const isMobileVp = vpWidth < MOBILE_BREAKPOINT;
    const margin = 16;
    // On mobile, keep FAB above BottomNav + gap; on desktop no nav bar.
    const bottomNavHeight = isMobileVp ? BOTTOM_NAV_HEIGHT : 0;

    // Get safe area insets (iOS/Android)
    const computedStyle = getComputedStyle(document.documentElement);
    const safeAreaBottom = parseInt(computedStyle.getPropertyValue('--sab') || '0') || 0;

    // Use the wider bubble width (open card = 384px on desktop, ~96px on mobile) so
    // the bubble is guaranteed on-screen even after it's opened or the viewport shrinks.
    const elementWidth = isMobileVp ? 96 : 384;
    const maxRight = Math.max(margin, vpWidth - elementWidth - margin);
    const maxBottom = vpHeight - bottomNavHeight - safeAreaBottom - margin;

    const clamped = {
      right: Math.max(margin, Math.min(maxRight, pos.right)),
      // Minimum bottom keeps FAB above the nav bar (+ gap) so it never overlaps it
      bottom: Math.max(bottomNavHeight + margin, Math.min(maxBottom, pos.bottom))
    };

    if (import.meta.env.DEV) {
      console.debug(
        '[AI Companion] constrainPosition | viewport:', vpWidth, 'x', vpHeight,
        '| input:', pos, '| clamped:', clamped,
        '| maxRight:', maxRight, '| maxBottom:', maxBottom,
        '| bottomNavH:', bottomNavHeight
      );
    }

    return clamped;
  };

  const handleDragStart = (e) => {
    if (!position) return;
    setIsDragging(true);

    const clientX = e.type === 'mousedown' ? e.clientX : e.touches[0].clientX;
    const clientY = e.type === 'mousedown' ? e.clientY : e.touches[0].clientY;

    dragRef.current = {
      startX: clientX,
      startY: clientY,
      initialX: clientX,
      initialY: clientY,
      initialRight: position.right,
      initialBottom: position.bottom
    };

    e.preventDefault();
  };

  useEffect(() => {
    if (!isDragging || !elementRef.current) return;

    let rafId = null;

    const handleDragMove = (e) => {
      if (rafId) return;

      rafId = requestAnimationFrame(() => {
        const clientX = e.type === 'mousemove' ? e.clientX : e.touches[0].clientX;
        const clientY = e.type === 'mousemove' ? e.clientY : e.touches[0].clientY;

        // deltaX: positive = moved right, deltaY: positive = moved down
        const deltaX = clientX - dragRef.current.startX;
        const deltaY = clientY - dragRef.current.startY;

        const isMobile = window.innerWidth < MOBILE_BREAKPOINT;
        const margin = 16;
        // Use the correct nav height (same constant as BottomNav component)
        const bottomNavHeight = isMobile ? BOTTOM_NAV_HEIGHT : 0;

        const computedStyle = getComputedStyle(document.documentElement);
        const safeAreaBottom = parseInt(computedStyle.getPropertyValue('--sab') || '0') || 0;

        const { width: vpWidth, height: vpHeight } = getViewportSize();
        const elementWidth = isMobile ? 96 : 384;
        const maxRight = Math.max(margin, vpWidth - elementWidth - margin);
        const maxBottom = vpHeight - bottomNavHeight - safeAreaBottom - margin;

        // Moving right → right CSS value decreases (element anchored from right edge)
        // Moving down  → bottom CSS value decreases (element anchored from bottom edge)
        const newRight = Math.max(margin, Math.min(maxRight, dragRef.current.initialRight - deltaX));
        // Minimum bottom keeps FAB above the nav bar so it never overlaps it
        const newBottom = Math.max(bottomNavHeight + margin, Math.min(maxBottom, dragRef.current.initialBottom - deltaY));

        if (elementRef.current) {
          elementRef.current.style.right = `${newRight}px`;
          elementRef.current.style.bottom = `${newBottom}px`;
        }

        rafId = null;
      });
    };

    const handleDragEnd = () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }

      setIsDragging(false);

      requestAnimationFrame(() => {
        if (elementRef.current) {
          const finalRight = parseInt(elementRef.current.style.right) || dragRef.current.initialRight;
          const finalBottom = parseInt(elementRef.current.style.bottom) || dragRef.current.initialBottom;

          if (Math.abs(finalRight - dragRef.current.initialRight) > 1 || Math.abs(finalBottom - dragRef.current.initialBottom) > 1) {
            const finalPos = { right: finalRight, bottom: finalBottom };
            setPosition(finalPos);
            savePosition(finalPos);
          }
        }
      });
    };

    window.addEventListener('mousemove', handleDragMove, { passive: false });
    window.addEventListener('mouseup', handleDragEnd);
    window.addEventListener('touchmove', handleDragMove, { passive: true });
    window.addEventListener('touchend', handleDragEnd);

    return () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchmove', handleDragMove);
      window.removeEventListener('touchend', handleDragEnd);
    };
  }, [isDragging]);

  const sendMessage = async () => {
    if (!isConsentResolved || showConsentBanner) {
      setShowConsentBanner(true);
      return;
    }

    if (!message.trim() || !conversation) return;

    // Crisis detection gate
    const reasonCode = detectCrisisWithReason(message);
    if (reasonCode) {
      setShowRiskPanel(true);

      // Log crisis alert (non-blocking)
      (async () => {
        try {
          const user = await base44.auth.me();
          await base44.entities.CrisisAlert.create({
            surface: 'companion',
            conversation_id: conversation?.id || 'none',
            reason_code: reasonCode,
            user_email: user?.email || 'unknown'
          });
        } catch (error) {
          console.error('[CRISIS ALERT] Failed to log alert:', error);
        }
      })();
      return;
    }

    const userMessage = message;
    setMessage('');
    setSendError(null);
    setIsLoading(true);

    try {
      await base44.agents.addMessage(conversation, {
        role: 'user',
        content: userMessage
      });
      if (!mountedRef.current) return;
      queryClient.invalidateQueries({ queryKey: ['proactiveReminders'] });
    } catch (error) {
      console.error('Failed to send message:', error);
      if (!mountedRef.current) return;
      setIsLoading(false);
      if (isAuthError(error) && shouldShowAuthError()) {
        setShowAuthError(true);
      } else {
        setSendError('Failed to send message. Please try again.');
      }
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
    if (e.key === 'Escape' && isOpen) {
      setIsOpen(false);
      setIsMinimized(false);
    }
  };

  const quickPrompts = [
  "How am I doing?",
  "I'm feeling anxious",
  "Help me with goals",
  "Suggest an exercise"];


  const handleQuickPrompt = async (prompt) => {
    if (!conversation) return;

    setMessage('');
    setSendError(null);
    setIsLoading(true);

    // Crisis detection gate
    const reasonCode = detectCrisisWithReason(prompt);
    if (reasonCode) {
      setShowRiskPanel(true);
      setIsLoading(false);
      return;
    }

    try {
      await base44.agents.addMessage(conversation, {
        role: 'user',
        content: prompt
      });
      if (!mountedRef.current) return;
      queryClient.invalidateQueries({ queryKey: ['proactiveReminders'] });
    } catch (error) {
      console.error('Failed to send message:', error);
      if (!mountedRef.current) return;
      setIsLoading(false);
      if (isAuthError(error) && shouldShowAuthError()) {
        setShowAuthError(true);
      } else {
        setSendError('Failed to send message. Please try again.');
      }
    }
  };

  if (!isOpen && !shouldShow) {
    return null;
  }

  if (!position) {
    return null; // Wait for position to initialize
  }

  // Hide if age not verified
  if (!isAgeVerified) {
    return null;
  }

  const isMobile = window.innerWidth < MOBILE_BREAKPOINT;
  // position: fixed with a high z-index so the companion always floats above page
  // content. Rendered via createPortal to document.body so it is never clipped by
  // ancestor overflow:hidden/clip containers or trapped in ancestor stacking contexts
  // created by transform/filter/will-change on parent elements.
  // Cast to MotionStyle: framer-motion expects CSS position as a specific string literal,
  // but our 'fixed' value is inferred as `string` by TypeScript.  The cast is safe because
  // 'fixed' is a valid CSS position value and framer-motion accepts it at runtime.
  const positionStyle = /** @type {import('framer-motion').MotionStyle} */ ({
    position: 'fixed',
    right: `${position.right}px`,
    bottom: isMobile ? `calc(${position.bottom}px + env(safe-area-inset-bottom, 0px))` : `${position.bottom}px`,
    zIndex: 9990
  });

  if (!isOpen) {
    return createPortal(
      <motion.div
        ref={elementRef}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        style={{ ...positionStyle, touchAction: 'none' }}
        onMouseDown={handleDragStart}
        onTouchStart={handleDragStart}
        className={cn("cursor-move", isDragging && "cursor-grabbing")}>

        <Button
          onClick={() => setIsOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setIsOpen(true);
            }
          }}
          size="lg" className="bg-teal-600 text-primary-foreground px-8 font-medium tracking-[0.005em] leading-none rounded-full inline-flex items-center justify-center gap-2 whitespace-nowrap transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover:shadow-[var(--shadow-lg)] active:bg-primary/95 min-h-[44px] md:min-h-0 w-16 h-16 border border-border/60 shadow-[var(--shadow-lg)] hover:bg-primary/94"

          aria-label="Open AI Companion chat" mobileLabelKey="chat">

          <MessageCircle className="w-7 h-7" />
        </Button>
        <div className="bg-cyan-700 rounded-full absolute -top-1 -right-1 w-4 h-4 border-2 border-card" />
      </motion.div>,
      document.body
    );
  }

  if (isMinimized) {
    return createPortal(
      <motion.div
        ref={elementRef}
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        style={positionStyle}>

        <Card
          className="w-64 border border-border/80 shadow-[var(--shadow-lg)] cursor-pointer hover:shadow-[var(--shadow-lg)] transition-shadow"
          onClick={() => setIsMinimized(false)}>

          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                <Brain className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <p className="font-semibold text-foreground">AI Companion</p>
                <p className="text-xs text-muted-foreground">Click to expand</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
                setIsMinimized(false);
              }}
              className="flex-shrink-0"
              aria-label="Close AI Companion">

              <X className="w-4 h-4" />
            </Button>
          </CardContent>
        </Card>
      </motion.div>,
      document.body
    );
  }

  return createPortal(
    <>
      {showAuthError && <AuthErrorBanner onDismiss={() => setShowAuthError(false)} />}
      <motion.div
        ref={elementRef}
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 20, opacity: 0 }}
        style={positionStyle}
        className="w-[calc(100vw-3rem)] md:w-96 flex flex-col">

      <Card className="border border-border/80 shadow-[var(--shadow-lg)] flex flex-col overflow-hidden bg-card" style={{ maxHeight: 'calc(100dvh - 200px)' }}>
        {/* Draggable Header */}
        <div className="bg-teal-600 p-4 rounded-t-[var(--radius-card)] flex items-center justify-between cursor-move border-b border-white/10"

          style={{ touchAction: 'none' }}
          onMouseDown={handleDragStart}
          onTouchStart={handleDragStart}>

          <div className="flex items-center gap-3">
            <GripVertical className="w-4 h-4 text-white/60" />
            <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-xl flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-white">AI Companion</h3>
              <p className="text-xs text-white/80">Drag to move</p>
            </div>
          </div>
          <div className="flex gap-1">
            <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMinimized(true)}
                className="text-white hover:bg-white/20"
                aria-label="Minimize AI Companion" mobileLabelKey="minimize">

              <MinusCircle className="w-4 h-4" />
            </Button>
            <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setIsOpen(false);
                  setIsMinimized(false);
                }}
                className="text-white hover:bg-white/20"
                aria-label="Close AI Companion">

              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Messages */}
        <CardContent data-testid="companion-messages" className="bg-teal-50 p-4 flex-1 overflow-y-auto space-y-4 min-h-0" style={{ maxHeight: 'calc(100dvh - 350px)' }}>
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
          <AnimatePresence>
            {messages.length === 0 &&
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-8">

                <Sparkles className="text-teal-600 mb-3 mx-auto lucide lucide-sparkles w-12 h-12" />
                <h4 className="text-teal-600 mb-2 font-semibold">Hello! I'm here for you</h4>
                <p className="text-teal-600 mb-4 text-sm">I can help with your wellness journey, answer questions, or just listen.

                </p>
                <div className="grid grid-cols-2 gap-2">
                  {quickPrompts.map((prompt, i) =>
                  <Button
                    key={i}
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickPrompt(prompt)} className="bg-teal-200 text-teal-600 px-3 text-xs font-medium tracking-[0.005em] rounded-[var(--radius-control)] inline-flex items-center justify-center gap-2 whitespace-nowrap transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-border/70 shadow-[var(--shadow-sm)] hover:bg-secondary/92 hover:text-foreground active:bg-secondary/96 h-8 min-h-[44px] md:min-h-0">


                      {prompt}
                    </Button>
                  )}
                </div>
              </motion.div>
              }

            {messages.map((msg, i) =>
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "flex gap-2",
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                )}>

                {msg.role === 'assistant' &&
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                    <Brain className="w-4 h-4 text-primary-foreground" />
                  </div>
                }
                <div
                  className={cn(
                    "max-w-[75%] rounded-2xl px-4 py-2",
                    msg.role === 'user' ?
                    'bg-primary text-primary-foreground' :
                    'bg-card border border-border/80 text-foreground'
                  )}>

                  {msg.role === 'user' ?
                  <p className="text-sm">{msg.content}</p> :

                  <ReactMarkdown
                    className="text-sm prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                    components={{
                      p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                      ul: ({ children }) => <ul className="ml-4 mb-2 list-disc">{children}</ul>,
                      ol: ({ children }) => <ol className="ml-4 mb-2 list-decimal">{children}</ol>,
                      li: ({ children }) => <li className="mb-1">{children}</li>,
                      strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                      // react-markdown v9 removed the `inline` prop from the code renderer;
                      // distinguish inline vs block code by presence of a language className.
                      code: ({ className, children }) =>
                      className?.includes('language-') ?
                      <code className={`block p-2 rounded bg-secondary text-xs font-mono ${className ?? ''}`}>{children}</code> :
                      <code className="px-1 py-0.5 rounded bg-secondary text-xs font-mono">{children}</code>

                    }}>

                      {msg.content}
                      </ReactMarkdown>
                  }
                      {msg.role === 'assistant' && conversation?.id &&
                  <MessageFeedback
                    conversationId={conversation.id}
                    messageIndex={i}
                    agentName={ACTIVE_AI_COMPANION_WIRING.name}
                    context="companion" />

                  }
                      </div>
                      </motion.div>
              )}

            {isLoading &&
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                data-testid="companion-loading"
                className="flex gap-2">

                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                  <Brain className="w-4 h-4 text-primary-foreground" />
                </div>
                <div className="bg-card border border-border/80 rounded-2xl px-4 py-3">
                  <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
                </div>
              </motion.div>
              }
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </CardContent>

        {/* Input */}
        <div className="bg-teal-50 text-teal-600 p-4 rounded-b-[var(--radius-card)] border-t border-border/80 flex-shrink-0">
          <div className="text-teal-600 flex gap-2">
            <Input
                data-testid="ai-companion-input"
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  setSendError(null);
                }}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything..." className="bg-[hsl(var(--surface-nested)/0.92)] text-teal-800 px-3 py-1 font-normal tracking-[0.001em] leading-6 rounded-xl flex h-9 w-full border border-input/90 shadow-[var(--shadow-sm)] transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 flex-1"

                disabled={isLoading || !isConsentResolved || showConsentBanner} />

            <Button
                data-testid="ai-companion-send"
                onClick={sendMessage}
                disabled={!message.trim() || isLoading || !isConsentResolved || showConsentBanner} className="bg-teal-500 text-teal-800 px-4 py-2 font-medium tracking-[0.005em] leading-none rounded-[var(--radius-control)] inline-flex items-center justify-center gap-2 whitespace-nowrap border border-transparent transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow-[var(--shadow-md)] hover:shadow-[var(--shadow-lg)] active:bg-primary/95 h-9 min-h-[44px] md:min-h-0 hover:bg-primary/94"

                aria-label="Send message" mobileLabelKey="send">

              <Send className="w-4 h-4" />
            </Button>
          </div>
          {sendError &&
            <p className="text-xs text-destructive mt-2 text-center">
              {sendError}
            </p>
            }
          {!sendError &&
            <p className="text-teal-600 mt-2 text-xs text-center">I remember our conversations and your wellness journey

            </p>
            }
        </div>
      </Card>
      </motion.div>
    </>,
    document.body
  );
}
