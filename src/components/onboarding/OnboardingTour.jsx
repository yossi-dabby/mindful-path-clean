import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, ChevronRight, ChevronLeft, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';

const tourSteps = [
  {
    title: 'Welcome to Your Mental Wellness Journey',
    description: 'This app combines AI therapy, journaling, and CBT exercises to support your mental health.',
    position: 'center'
  },
  {
    title: 'AI Therapist Chat',
    description: 'Talk to your AI therapist anytime. Share your thoughts, feelings, and challenges in a safe space.',
    target: 'chat',
    position: 'bottom'
  },
  {
    title: 'Track Your Mood',
    description: 'Check in daily to monitor your emotional patterns and identify triggers over time.',
    target: 'mood',
    position: 'bottom'
  },
  {
    title: 'Journaling Tools',
    description: 'Use structured CBT journaling to challenge negative thoughts and develop balanced perspectives.',
    target: 'journal',
    position: 'bottom'
  },
  {
    title: 'Practice Exercises',
    description: 'Access breathing exercises, mindfulness practices, and other CBT techniques.',
    target: 'exercises',
    position: 'bottom'
  },
  {
    title: 'Set & Track Goals',
    description: 'Create meaningful goals and track your progress towards better mental health.',
    target: 'goals',
    position: 'bottom'
  },
  {
    title: 'View Your Progress',
    description: 'Visualize your journey with insights, trends, and AI-powered analysis.',
    target: 'progress',
    position: 'bottom'
  },
  {
    title: 'You\'re All Set!',
    description: 'Remember: This is a tool for support, not a replacement for professional help. In crisis, contact emergency services.',
    position: 'center'
  }
];

export default function OnboardingTour({ onComplete, onSkip }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    setIsVisible(false);
    await base44.auth.updateMe({ onboarding_completed: true });
    setTimeout(() => onComplete(), 300);
  };

  const handleSkip = async () => {
    setIsVisible(false);
    await base44.auth.updateMe({ onboarding_completed: true });
    setTimeout(() => onSkip(), 300);
  };

  const step = tourSteps[currentStep];
  const progress = ((currentStep + 1) / tourSteps.length) * 100;

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={handleSkip}
          />

          {/* Tour Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className={`fixed z-50 ${
              step.position === 'center' 
                ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2' 
                : 'bottom-24 md:bottom-8 left-4 right-4 md:left-1/2 md:-translate-x-1/2'
            }`}
          >
            <Card className="border-0 shadow-2xl max-w-lg mx-auto">
              <CardContent className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-purple-400 flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{step.title}</h3>
                      <p className="text-xs text-muted-foreground">
                        Step {currentStep + 1} of {tourSteps.length}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleSkip}
                    className="text-gray-400 hover:text-muted-foreground"
                    aria-label="Skip tour"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {/* Content */}
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  {step.description}
                </p>

                {/* Progress Bar */}
                <div className="w-full h-1.5 bg-gray-200 rounded-full mb-4 overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-green-500 to-purple-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  {currentStep > 0 && (
                    <Button
                      variant="outline"
                      onClick={handlePrevious}
                      className="flex-1"
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" />
                      Back
                    </Button>
                  )}
                  <Button
                    onClick={handleNext}
                    className="flex-1 bg-gradient-to-r from-green-600 to-purple-600 hover:from-green-700 hover:to-purple-700"
                  >
                    {currentStep === tourSteps.length - 1 ? (
                      'Get Started'
                    ) : (
                      <>
                        Next
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </>
                    )}
                  </Button>
                </div>

                {currentStep === 0 && (
                  <button
                    onClick={handleSkip}
                    className="w-full text-center text-sm text-muted-foreground hover:text-muted-foreground mt-3"
                  >
                    Skip tour
                  </button>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}