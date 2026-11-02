import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';

const FLOW_STEPS = {
  helpNow: {
    step1: "I hear you, and I'm here to help. What's happening right now that's making you feel this way?",
    step2: (userText) => `It sounds like you're dealing with ${userText.toLowerCase()}. Did I understand that correctly? Would you like me to help you work through this right now?`
  },
  botheringThought: {
    step1: "I'm here to listen. What thought is on your mind?",
    step2: (userText) => `So the thought that's bothering you is: "${userText}". Did I capture that right? Would you like me to help you work with this thought now?`
  },
  writeReflect: {
    step1: "I'm glad you want to reflect. What's on your mind that you'd like to explore?",
    step2: (userText) => `It sounds like you want to explore ${userText.toLowerCase()}. Is that accurate? Should we work through this together?`
  },
  workOnGoal: {
    step1: "That's great. What goal would you like to focus on today?",
    step2: (userText) => `So you want to work on: ${userText}. Is that right? Would you like me to help you break this down?`
  },
  somethingCalming: {
    step1: "I understand. What would help you feel calm right now—something gentle, realistic, or confidence-building?",
    step2: (userText) => `You're looking for something ${userText.toLowerCase()}. Did I get that right? Let me guide you to something that fits.`
  }
};

export default function TherapyFlowHandler({ 
  selectedOption, 
  onSendMessage, 
  onAutoRunJournal,
  isLoading 
}) {
  const [flowStep, setFlowStep] = useState(1);
  const [userResponse, setUserResponse] = useState('');
  const [botMessage, setBotMessage] = useState(null);

  const getFlowKey = () => {
    const optionMap = {
      'help_now': 'helpNow',
      'bothering_thought': 'botheringThought',
      'write_reflect': 'writeReflect',
      'work_on_goal': 'workOnGoal',
      'something_calming': 'somethingCalming'
    };
    return optionMap[selectedOption.id];
  };

  const handleStep1Response = (response) => {
    setUserResponse(response);
    const flowKey = getFlowKey();
    const step2Message = FLOW_STEPS[flowKey].step2(response);
    setBotMessage(step2Message);
    setFlowStep(2);
  };

  const handleStep2Confirmation = async (confirmed) => {
    if (confirmed) {
      setFlowStep(3);
      
      // Auto-run logic based on selected option
      if (selectedOption.id === 'bothering_thought') {
        await onAutoRunJournal(userResponse);
      } else {
        // For other options, send the context to the agent
        await onSendMessage(`${selectedOption.label}. ${userResponse}`);
      }
    } else {
      // User said no, ask clarification
      setBotMessage("I want to make sure I understand. Can you tell me a bit more?");
    }
  };

  const flowKey = getFlowKey();

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <AnimatePresence mode="wait">
        {flowStep === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Card className="p-6 border-0" style={{
              borderRadius: '24px',
              background: 'hsl(var(--card) / 0.97)',
              backdropFilter: 'blur(12px)',
              boxShadow: 'var(--shadow-md)'
            }}>
              <div className="flex gap-3 mb-4">
                <div className="h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0" style={{
                  backgroundColor: 'hsl(var(--secondary))'
                }}>
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: 'hsl(var(--primary))' }} />
                </div>
                <div className="flex-1">
                  <p style={{ color: 'hsl(var(--foreground))', lineHeight: '1.6' }}>
                    {FLOW_STEPS[flowKey].step1}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <textarea
                  placeholder="Type your response here..."
                  className="w-full p-4 rounded-xl resize-none min-h-[100px]"
                  style={{
                    border: '1px solid rgba(38, 166, 154, 0.2)',
                    backgroundColor: 'hsl(var(--card) / 0.97)',
                    color: 'hsl(var(--foreground))'
                  }}
                  onChange={(e) => setUserResponse(e.target.value)}
                />
                <Button
                  onClick={() => handleStep1Response(userResponse)}
                  disabled={!userResponse.trim() || isLoading}
                  className="w-full text-white"
                  style={{
                    borderRadius: '16px',
                    backgroundColor: 'hsl(var(--primary))',
                    boxShadow: 'var(--shadow-md)'
                  }}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Continue'
                  )}
                </Button>
              </div>
            </Card>
          </motion.div>
        )}

        {flowStep === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <Card className="p-6 border-0" style={{
              borderRadius: '24px',
              background: 'hsl(var(--card) / 0.97)',
              backdropFilter: 'blur(12px)',
              boxShadow: 'var(--shadow-md)'
            }}>
              <div className="flex gap-3 mb-4">
                <div className="h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0" style={{
                  backgroundColor: 'hsl(var(--secondary))'
                }}>
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: 'hsl(var(--primary))' }} />
                </div>
                <div className="flex-1">
                  <p style={{ color: 'hsl(var(--foreground))', lineHeight: '1.6' }}>
                    {botMessage}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => handleStep2Confirmation(true)}
                  disabled={isLoading}
                  className="flex-1 text-white"
                  style={{
                    borderRadius: '16px',
                    backgroundColor: 'hsl(var(--primary))',
                    boxShadow: 'var(--shadow-md)'
                  }}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    'Yes, continue'
                  )}
                </Button>
                <Button
                  onClick={() => handleStep2Confirmation(false)}
                  variant="outline"
                  disabled={isLoading}
                  className="flex-1"
                  style={{
                    borderRadius: '16px',
                    borderColor: 'hsl(var(--border))'
                  }}
                >
                  Not quite
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}