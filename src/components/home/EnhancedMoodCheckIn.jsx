import React, { useState } from 'react';
import PremiumMoodIcon from '@/components/ui/PremiumMoodIcon';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, ChevronLeft, ChevronDown, ChevronUp, Edit2, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const moodOptions = [
  { value: 'excellent', label: 'Excellent' },
  { value: 'good', label: 'Good' },
  { value: 'okay', label: 'Okay' },
  { value: 'low', label: 'Low' },
  { value: 'very_low', label: 'Very Low' }
];

const emotionCategories = {
  positive: [
    'Happy', 'Joyful', 'Peaceful', 'Grateful', 'Excited', 'Hopeful', 'Confident',
    'Proud', 'Content', 'Energized', 'Inspired', 'Loved', 'Optimistic', 'Relaxed',
    'Satisfied', 'Amused', 'Interested', 'Playful', 'Courageous', 'Compassionate'
  ],
  intermediate: [
    'Uncertain', 'Confused', 'Curious', 'Surprised', 'Bored', 'Tired', 'Restless',
    'Indifferent', 'Neutral', 'Ambivalent', 'Pensive', 'Nostalgic', 'Wistful',
    'Distracted', 'Apathetic', 'Disconnected', 'Numb', 'Empty', 'Doubtful', 'Hesitant'
  ],
  negative: [
    'Anxious', 'Sad', 'Angry', 'Frustrated', 'Stressed', 'Overwhelmed', 'Lonely',
    'Fearful', 'Guilty', 'Ashamed', 'Disappointed', 'Hopeless', 'Jealous', 'Resentful',
    'Irritated', 'Worried', 'Depressed', 'Helpless', 'Rejected', 'Insecure'
  ]
};

const categoryColors = {
  positive: { bg: 'bg-green-500', hover: 'hover:bg-green-600', selected: 'bg-green-600', text: 'text-white' },
  intermediate: { bg: 'bg-orange-500', hover: 'hover:bg-orange-600', selected: 'bg-orange-600', text: 'text-white' },
  negative: { bg: 'bg-red-500', hover: 'hover:bg-red-600', selected: 'bg-red-600', text: 'text-white' }
};

export default function EnhancedMoodCheckIn({ onClose, onComplete, existingData = null }) {
  const [step, setStep] = useState(existingData ? 4 : 1);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [formData, setFormData] = useState(existingData || {
    mood: '',
    mood_emoji: '',
    emotions: [],
    intensity: 50
  });

  const selectedMood = moodOptions.find(m => m.value === formData.mood);

  const handleMoodSelect = (mood) => {
    setFormData({ ...formData, mood: mood.value, mood_emoji: mood.value });
  };

  const toggleEmotion = (emotion) => {
    setFormData(prev => ({
      ...prev,
      emotions: prev.emotions.includes(emotion)
        ? prev.emotions.filter(e => e !== emotion)
        : [...prev.emotions, emotion]
    }));
  };

  const handleContinue = () => {
    if (step < 3) {
      setStep(step + 1);
    } else if (step === 3) {
      // Save and show summary
      handleSubmit();
    }
  };

  const handleReturn = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSubmit = () => {
    const timestamp = new Date().toISOString();
    const dataToSend = {
      ...formData,
      timestamp,
      emotion_categories: {
        positive: formData.emotions.filter(e => emotionCategories.positive.includes(e)),
        intermediate: formData.emotions.filter(e => emotionCategories.intermediate.includes(e)),
        negative: formData.emotions.filter(e => emotionCategories.negative.includes(e))
      }
    };
    
    onComplete(dataToSend);
    setStep(4); // Show summary
  };

  const handleEdit = () => {
    setStep(1);
    setIsCollapsed(false);
  };

  const handleDelete = () => {
    if (confirm('Delete this check-in?')) {
      onClose();
    }
  };

  // Summary view (step 4)
  if (step === 4) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="fixed bottom-4 right-4 z-40 w-[calc(100vw-2rem)] sm:w-80"
      >
        <Card className="border-0 shadow-2xl" style={{
          borderRadius: '24px',
          background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.98) 0%, rgba(232, 246, 243, 0.95) 100%)'
        }}>
          <CardHeader 
            className="cursor-pointer hover:bg-gray-50/50 transition-colors"
            onClick={() => setIsCollapsed(!isCollapsed)}
            style={{ borderRadius: '24px 24px 0 0', padding: '16px' }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <PremiumMoodIcon mood={selectedMood?.value} size="md" selected />
                <CardTitle className="text-base">Daily Check-in Complete</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEdit();
                  }}
                  className="h-8 w-8 min-h-[44px] min-w-[44px]"
                  aria-label="Edit check-in"
                 mobileLabelKey="edit">
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete();
                  }}
                  className="h-8 w-8 min-h-[44px] min-w-[44px]"
                  aria-label="Delete check-in"
                 mobileLabelKey="delete">
                  <Trash2 className="w-4 h-4" />
                </Button>
                {isCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </div>
          </CardHeader>
          
          <AnimatePresence>
            {!isCollapsed && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
              >
                <CardContent className="p-4 space-y-3">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Emotions:</p>
                    <div className="flex flex-wrap gap-1">
                      {formData.emotions.map((emotion) => {
                        const category = Object.keys(emotionCategories).find(cat => 
                          emotionCategories[cat].includes(emotion)
                        );
                        const colors = categoryColors[category];
                        return (
                          <Badge key={emotion} className={cn(colors.bg, colors.text, "text-xs")}>
                            {emotion}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Intensity:</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-green-400 to-green-600 transition-all"
                          style={{ width: `${formData.intensity}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold" style={{ color: '#26A69A' }}>
                        {formData.intensity}
                      </span>
                    </div>
                  </div>

                  <Button
                    onClick={onClose}
                    className="w-full text-white"
                    style={{
                      borderRadius: '16px',
                      backgroundColor: '#26A69A'
                    }}
                  >
                    Close
                  </Button>
                </CardContent>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </motion.div>
    );
  }

  // Full modal view (steps 1-3)
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 pb-24 overflow-y-auto" style={{ zIndex: 50 }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl my-8"
        style={{ maxHeight: 'calc(100vh - 160px)', zIndex: 55 }}
      >
        <Card className="border-0 shadow-2xl" style={{ borderRadius: '32px' }}>
          <CardHeader style={{ borderBottom: '1px solid rgba(38, 166, 154, 0.2)', padding: '20px 24px' }}>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">Daily Check-in</CardTitle>
              <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="flex gap-2 mt-4">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className="h-1.5 flex-1 rounded-full transition-all"
                  style={{
                    backgroundColor: s <= step ? '#26A69A' : 'rgba(200, 220, 215, 0.5)'
                  }}
                />
              ))}
            </div>
          </CardHeader>

          <CardContent className="p-4 md:p-6 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 300px)' }}>
            {/* Step 1: Mood Selection */}
            {step === 1 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <h3 className="text-lg font-semibold text-foreground">
                  How are you feeling overall?
                </h3>
                <div className="grid grid-cols-5 gap-1 sm:gap-2 md:gap-3">
                  {moodOptions.map((mood) => (
                    <button
                      key={mood.value}
                      onClick={() => handleMoodSelect(mood)}
                      className={cn(
                        "min-h-[44px] p-2 sm:p-4 rounded-2xl border-2 transition-all hover:scale-105",
                        formData.mood === mood.value
                          ? "border-green-500 bg-green-50 shadow-lg"
                          : "border-gray-200 bg-[hsl(var(--card)/0.97)] hover:border-gray-300"
                      )}
                    >
                      <PremiumMoodIcon mood={mood.value} size="md" selected={formData.mood === mood.value} className="mb-1 sm:mb-2" />
                      <div className="text-[10px] sm:text-xs font-medium text-muted-foreground leading-tight">{mood.label}</div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Step 2: Emotions Selection */}
            {step === 2 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <h3 className="text-lg font-semibold text-foreground">
                  What emotions are you experiencing?
                </h3>
                
                {Object.entries(emotionCategories).map(([category, emotions]) => {
                  const colors = categoryColors[category];
                  return (
                    <div key={category}>
                      <p className="text-sm font-medium text-muted-foreground mb-2 capitalize">
                        {category} Emotions
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {emotions.map((emotion) => (
                          <button
                            key={emotion}
                            type="button"
                            onClick={() => toggleEmotion(emotion)}
                            className={cn(
                              "min-h-[44px] px-4 py-2 rounded-full text-sm font-medium transition-all border-2 cursor-pointer",
                              formData.emotions.includes(emotion)
                                ? cn(colors.selected, colors.text, "border-transparent scale-105 shadow-[var(--shadow-sm)]")
                                : "border-gray-300 text-muted-foreground hover:border-gray-400"
                            )}
                          >
                            {emotion}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </motion.div>
            )}

            {/* Step 3: Intensity */}
            {step === 3 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <h3 className="text-lg font-semibold text-foreground">
                  How intense are your emotions?
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Low</span>
                    <span className="text-3xl font-bold" style={{ color: '#26A69A' }}>
                      {formData.intensity}
                    </span>
                    <span className="text-sm text-muted-foreground">High</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={formData.intensity}
                    onChange={(e) => setFormData({ ...formData, intensity: parseInt(e.target.value) || 50 })}
                    className="w-full h-3 rounded-lg appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, #26A69A 0%, #26A69A ${formData.intensity}%, #E5E7EB ${formData.intensity}%, #E5E7EB 100%)`
                    }}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>1</span>
                    <span>25</span>
                    <span>50</span>
                    <span>75</span>
                    <span>100</span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Navigation */}
            <div className="flex gap-3 mt-8">
              {step > 1 && (
                <Button
                  onClick={handleReturn}
                  variant="outline"
                  className="flex-1"
                  style={{ borderRadius: '16px' }}
                >
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Return
                </Button>
              )}
              <Button
                onClick={handleContinue}
                disabled={
                  (step === 1 && !formData.mood) ||
                  (step === 2 && formData.emotions.length === 0)
                }
                className="flex-1 text-white"
                style={{
                  borderRadius: '16px',
                  backgroundColor: '#26A69A'
                }}
              >
                {step === 3 ? 'Complete' : 'Continue'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}