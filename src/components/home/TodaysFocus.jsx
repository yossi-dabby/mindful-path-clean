import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Heart, Dumbbell, Lightbulb, Sparkles, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPageUrl } from '../../utils';

export default function TodaysFocus({ onStartCheckIn, onStartExercise, onStartReflection }) {
  const queryClient = useQueryClient();
  const [showVideoModal, setShowVideoModal] = useState(false);

  // Get today's flow
  const { data: todayFlow, isLoading } = useQuery({
    queryKey: ['todayFlow'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const flows = await base44.entities.DailyFlow.filter({ date: today });
      return flows[0] || null;
    }
  });

  // Get today's mood
  const { data: todayMood } = useQuery({
    queryKey: ['todayMood'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const moods = await base44.entities.MoodEntry.filter({ date: today });
      return moods[0] || null;
    }
  });

  // Get today's exercise if assigned
  const { data: todayExercise } = useQuery({
    queryKey: ['todayExercise', todayFlow?.exercise_id],
    queryFn: async () => {
      if (!todayFlow?.exercise_id) return null;
      const exercises = await base44.entities.Exercise.filter({ id: todayFlow.exercise_id });
      return exercises[0] || null;
    },
    enabled: !!todayFlow?.exercise_id
  });

  if (isLoading) {
    return (
      <Card className="mb-8 border-0" style={{ 
        borderRadius: '32px',
        background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 253, 252, 0.95) 100%)',
        boxShadow: '0 12px 40px rgba(38, 166, 154, 0.12), 0 4px 16px rgba(0,0,0,0.04), inset 0 2px 0 rgba(255,255,255,0.9)'
      }}>
        <CardContent className="p-8 text-center">
          <p style={{ color: '#5A7A72' }}>Loading today's focus...</p>
        </CardContent>
      </Card>
    );
  }

  // Determine current step
  const getCurrentStep = () => {
    if (!todayFlow || !todayFlow.check_in_completed) {
      return {
        step: 1,
        title: "Daily Check-in",
        description: "Let's start by understanding how you're feeling today",
        icon: Heart,
        action: "Start Check-in",
        onAction: () => window.location.href = createPageUrl('Chat', 'intent=daily_checkin'),
        color: 'accent'
      };
    }

    if (!todayFlow.exercise_completed) {
      return {
        step: 2,
        title: "Today's Exercise",
        description: todayExercise?.title || "Complete your personalized CBT exercise",
        icon: Dumbbell,
        action: "Start Exercise",
        onAction: onStartExercise,
        color: 'success',
        subtitle: todayExercise?.description
      };
    }

    if (!todayFlow.reflection_completed) {
      return {
        step: 3,
        title: "Daily Reflection",
        description: "Take a moment to reflect on today's practice",
        icon: Lightbulb,
        action: "Complete Reflection",
        onAction: onStartReflection,
        color: 'calm'
      };
    }

    // All steps completed
    return {
      step: 'complete',
      title: "You're all done for today!",
      description: todayFlow.daily_takeaway || "You've completed your daily practice. Great work!",
      icon: CheckCircle2,
      color: 'success'
    };
  };

  const currentStep = getCurrentStep();
  const Icon = currentStep.icon;

  const colorMap = {
    accent: '#26A69A',
    success: '#26A69A',
    calm: '#26A69A'
  };

  const bgColorMap = {
    accent: 'rgba(38, 166, 154, 0.15)',
    success: 'rgba(38, 166, 154, 0.15)',
    calm: 'rgba(38, 166, 154, 0.15)'
  };

  if (currentStep.step === 'complete') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="border-0" style={{ 
          borderRadius: '36px',
          background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.98) 0%, rgba(232, 246, 243, 0.9) 100%)',
          backdropFilter: 'blur(16px)',
          boxShadow: '0 16px 48px rgba(38, 166, 154, 0.15), 0 6px 20px rgba(0,0,0,0.05), inset 0 2px 0 rgba(255,255,255,0.95)'
        }}>
          <CardContent className="p-7 text-center">
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: [0.2, 0.8, 0.2, 1] }}
              className="inline-flex w-14 h-14 items-center justify-center mb-4"
              style={{ 
                borderRadius: '22px',
                backgroundColor: bgColorMap[currentStep.color],
                boxShadow: '0 4px 12px rgba(38, 166, 154, 0.2)'
              }}
            >
              <Icon className="w-7 h-7 icon-default" style={{ color: colorMap[currentStep.color] }} strokeWidth={2} />
            </motion.div>
            <h2 className="text-lg font-semibold mb-2" style={{ color: '#1A3A34' }}>
              {currentStep.title}
            </h2>
            <p className="text-sm" style={{ color: '#5A7A72' }}>
              Come back tomorrow for your next practice
            </p>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="border-0 hover:shadow-xl transition-calm" style={{ 
        borderRadius: '36px',
        background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.98) 0%, rgba(232, 246, 243, 0.9) 100%)',
        backdropFilter: 'blur(16px)',
        boxShadow: '0 16px 48px rgba(38, 166, 154, 0.15), 0 6px 20px rgba(0,0,0,0.05), inset 0 2px 0 rgba(255,255,255,0.95)'
      }}>
        <CardContent className="p-7">
          {/* Progress Indicator */}
          <div className="flex items-center gap-3 mb-7">
            <div className="flex gap-2">
              {[1, 2, 3].map((stepNum) => (
                <div
                  key={stepNum}
                  className="h-2 transition-calm"
                  style={{
                    width: '56px',
                    borderRadius: '12px',
                    backgroundColor: stepNum <= currentStep.step 
                      ? colorMap[currentStep.color]
                      : 'rgba(200, 220, 215, 0.5)',
                    boxShadow: stepNum <= currentStep.step 
                      ? '0 2px 8px rgba(38, 166, 154, 0.3)'
                      : 'none'
                  }}
                />
              ))}
            </div>
            <span className="text-sm font-medium ml-2" style={{ color: '#5A7A72' }}>
              Step {currentStep.step} of 3
            </span>
          </div>

          {/* Main Content */}
          <div className="flex items-start gap-6">
            <div className="flex flex-col gap-4 flex-shrink-0">
              <motion.div
                animate={{ scale: [1, 1.12, 1] }}
                transition={{ duration: 3, repeat: Infinity, ease: [0.2, 0.8, 0.2, 1] }}
                className="flex items-center justify-center"
                style={{ 
                  width: '72px',
                  height: '72px',
                  borderRadius: '24px',
                  backgroundColor: bgColorMap[currentStep.color],
                  boxShadow: '0 6px 20px rgba(38, 166, 154, 0.2), inset 0 1px 0 rgba(255,255,255,0.5)'
                }}
              >
                <Icon className="w-9 h-9 icon-default" style={{ color: colorMap[currentStep.color] }} strokeWidth={2} />
              </motion.div>

              {currentStep.step === 1 && (
                <motion.button
                  animate={{ 
                    scale: [1, 1.05, 1],
                    boxShadow: [
                      '0 6px 20px rgba(38, 166, 154, 0.2), inset 0 1px 0 rgba(255,255,255,0.5)',
                      '0 8px 24px rgba(38, 166, 154, 0.35), inset 0 1px 0 rgba(255,255,255,0.6)',
                      '0 6px 20px rgba(38, 166, 154, 0.2), inset 0 1px 0 rgba(255,255,255,0.5)'
                    ]
                  }}
                  transition={{ duration: 2, repeat: Infinity, ease: [0.2, 0.8, 0.2, 1] }}
                  onClick={() => setShowVideoModal(true)}
                  className="flex items-center justify-center cursor-pointer hover:scale-105 transition-transform"
                  style={{ 
                    width: '72px',
                    height: '72px',
                    borderRadius: '24px',
                    backgroundColor: bgColorMap[currentStep.color],
                    border: 'none',
                    outline: 'none'
                  }}
                  aria-label="Introduction Video"
                  title="Introduction Video"
                >
                  <User className="w-9 h-9 icon-default" style={{ color: colorMap[currentStep.color] }} strokeWidth={2} />
                </motion.button>
              )}
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-xl font-semibold truncate" style={{ color: '#1A3A34' }}>
                  {currentStep.title}
                </h2>
                <Sparkles className="w-5 h-5 icon-default" style={{ color: colorMap[currentStep.color] }} strokeWidth={2} />
              </div>
              <p className="text-sm mb-2 line-clamp-2" style={{ color: '#3D5A52' }}>
                {currentStep.description}
              </p>
              {currentStep.subtitle && (
                <p className="text-xs mb-5 line-clamp-2" style={{ color: '#5A7A72' }}>
                  {currentStep.subtitle}
                </p>
              )}

              <Button
                onClick={currentStep.onAction}
                className="px-8 py-6 text-base font-medium hover:shadow-xl transition-calm text-white"
                style={{ 
                  borderRadius: '24px',
                  backgroundColor: colorMap[currentStep.color],
                  boxShadow: '0 8px 24px rgba(38, 166, 154, 0.35), 0 4px 10px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.2)'
                }}
              >
                {currentStep.action}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Video Modal */}
      <AnimatePresence>
        {showVideoModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.85)' }}
            onClick={() => setShowVideoModal(false)}
          >
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
              }}
            >
              <button
                onClick={() => setShowVideoModal(false)}
                className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center text-white hover:bg-[hsl(var(--card)/0.97)] transition-colors"
                style={{
                  borderRadius: '50%',
                  backgroundColor: 'rgba(0,0,0,0.5)',
                  border: 'none',
                  cursor: 'pointer'
                }}
                aria-label="Close video"
              >
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
                style={{ maxHeight: '80vh', backgroundColor: '#000' }}
              >
                <source src="https://firebasestorage.googleapis.com/v0/b/my-cbt-therapy.firebasestorage.app/o/cbt%201.mp4?alt=media&token=5a32c03e-2031-4c1b-a24f-f82d21409313" type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}