import PremiumOverlay from '@/components/ui/PremiumOverlay';
import React, { useState } from 'react';
import PremiumMoodIcon from '@/components/ui/PremiumMoodIcon';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

const moodOptions = [
  { value: 'excellent', label: 'Excellent', color: 'bg-green-500' },
  { value: 'good', label: 'Good', color: 'bg-green-400' },
  { value: 'okay', label: 'Okay', color: 'bg-yellow-400' },
  { value: 'low', label: 'Low', color: 'bg-orange-400' },
  { value: 'very_low', label: 'Very Low', color: 'bg-red-400' }
];

const commonEmotions = [
  'Happy', 'Anxious', 'Sad', 'Calm', 'Angry', 'Excited',
  'Overwhelmed', 'Grateful', 'Lonely', 'Hopeful', 'Frustrated', 'Peaceful'
];

const commonTriggers = [
  'Work stress', 'Relationship issues', 'Financial worries', 'Health concerns',
  'Social interaction', 'Lack of sleep', 'Physical pain', 'Family conflict',
  'Time pressure', 'Positive event', 'Achievement', 'Exercise'
];

const commonActivities = [
  'Exercise', 'Meditation', 'Socializing', 'Work', 'Hobbies',
  'Rest', 'Self-care', 'Learning', 'Entertainment', 'Chores'
];

export default function MoodCheckIn({ onClose, onComplete }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    mood: '',
    emotions: [],
    intensity: 5,
    energy_level: '',
    sleep_quality: '',
    stress_level: 5,
    triggers: [],
    activities: [],
    notes: ''
  });

  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: (data) => base44.entities.MoodEntry.create(data),
    onMutate: async (newEntry) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['moodEntries'] });
      
      // Snapshot previous value
      const previousMoodEntries = queryClient.getQueryData(['moodEntries']);
      
      // Optimistically update cache
      const optimisticEntry = {
        id: 'temp-' + Date.now(),
        ...newEntry,
        created_date: new Date().toISOString()
      };
      
      queryClient.setQueryData(['moodEntries'], (old) => [optimisticEntry, ...(old || [])]);
      
      return { previousMoodEntries };
    },
    onSuccess: () => {
      onClose();
      if (onComplete) onComplete();
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousMoodEntries) {
        queryClient.setQueryData(['moodEntries'], context.previousMoodEntries);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['moodEntries'] });
    }
  });

  const toggleEmotion = (emotion) => {
    setFormData(prev => ({
      ...prev,
      emotions: prev.emotions.includes(emotion)
        ? prev.emotions.filter(e => e !== emotion)
        : [...prev.emotions, emotion]
    }));
  };

  const toggleTrigger = (trigger) => {
    setFormData(prev => ({
      ...prev,
      triggers: prev.triggers.includes(trigger)
        ? prev.triggers.filter(t => t !== trigger)
        : [...prev.triggers, trigger]
    }));
  };

  const toggleActivity = (activity) => {
    setFormData(prev => ({
      ...prev,
      activities: prev.activities.includes(activity)
        ? prev.activities.filter(a => a !== activity)
        : [...prev.activities, activity]
    }));
  };

  const handleSubmit = () => {
    saveMutation.mutate(formData);
  };

  return (
    <PremiumOverlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 pb-24 overflow-y-auto">
      <Card className="w-full max-w-lg border-0 shadow-2xl my-8" style={{ maxHeight: 'calc(100vh - 160px)' }}>
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <CardTitle>Daily Check-in</CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4 text-foreground">
                  How are you feeling overall?
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {moodOptions.map((mood) => (
                    <button
                      key={mood.value}
                      onClick={() => setFormData({ ...formData, mood: mood.value })}
                      className={cn(
                        "p-4 rounded-2xl border-2 transition-all hover:scale-105",
                        formData.mood === mood.value
                          ? "border-green-500 bg-green-50 shadow-md"
                          : "border-gray-200 bg-[hsl(var(--card)/0.97)] hover:border-gray-300"
                      )}
                    >
                      <PremiumMoodIcon mood={mood.value} size="md" selected={formData.mood === mood.value} className="mb-2" />
                      <div className="text-sm font-medium text-muted-foreground">{mood.label}</div>
                    </button>
                  ))}
                </div>
              </div>
              <Button
                onClick={() => setStep(2)}
                disabled={!formData.mood}
                className="w-full bg-green-600 hover:bg-green-700 py-6 rounded-xl"
              >
                Continue
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4 text-foreground">
                  What emotions are you experiencing?
                </h3>
                <div className="flex flex-wrap gap-2 mb-4">
                  {commonEmotions.map((emotion) => (
                    <Badge
                      key={emotion}
                      variant={formData.emotions.includes(emotion) ? "default" : "outline"}
                      className={cn(
                        "cursor-pointer px-4 py-2 text-sm transition-all",
                        formData.emotions.includes(emotion)
                          ? "bg-green-600 hover:bg-green-700"
                          : "hover:bg-gray-100"
                      )}
                      onClick={() => toggleEmotion(emotion)}
                    >
                      {emotion}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  Intensity (1-10)
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={formData.intensity}
                    onChange={(e) => setFormData({ ...formData, intensity: parseInt(e.target.value) })}
                    className="flex-1"
                  />
                  <span className="text-2xl font-bold text-green-600 w-12 text-center">
                    {formData.intensity}
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => setStep(1)}
                  variant="outline"
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={() => setStep(3)}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  Continue
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-3 text-foreground">
                  Energy & Sleep
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-2 block">
                      Energy Level
                    </label>
                    <div className="grid grid-cols-5 gap-1 sm:gap-2">
                      {['very_low', 'low', 'moderate', 'high', 'very_high'].map((level) => (
                        <button
                          key={level}
                          onClick={() => setFormData({ ...formData, energy_level: level })}
                          className={cn(
                            "p-2 sm:p-3 rounded-xl border-2 text-[10px] sm:text-xs font-medium transition-all leading-tight",
                            formData.energy_level === level
                              ? "border-green-500 bg-green-50"
                              : "border-gray-200 hover:border-gray-300"
                          )}
                        >
                          {level.replace('_', ' ')}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-2 block">
                      Sleep Quality (last night)
                    </label>
                    <div className="grid grid-cols-4 gap-1 sm:gap-2">
                      {['poor', 'fair', 'good', 'excellent'].map((quality) => (
                        <button
                          key={quality}
                          onClick={() => setFormData({ ...formData, sleep_quality: quality })}
                          className={cn(
                            "p-2 sm:p-3 rounded-xl border-2 text-[10px] sm:text-xs font-medium capitalize transition-all",
                            formData.sleep_quality === quality
                              ? "border-green-500 bg-green-50"
                              : "border-gray-200 hover:border-gray-300"
                          )}
                        >
                          {quality}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-2 block">
                      Stress Level (1-10)
                    </label>
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={formData.stress_level}
                        onChange={(e) => setFormData({ ...formData, stress_level: parseInt(e.target.value) })}
                        className="flex-1"
                      />
                      <span className="text-2xl font-bold text-green-600 w-12 text-center">
                        {formData.stress_level}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => setStep(2)}
                  variant="outline"
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={() => setStep(4)}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  Continue
                </Button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-3 text-foreground">
                  What triggered your mood?
                </h3>
                <div className="flex flex-wrap gap-2">
                  {commonTriggers.map((trigger) => (
                    <Badge
                      key={trigger}
                      variant={formData.triggers.includes(trigger) ? "default" : "outline"}
                      className={cn(
                        "cursor-pointer px-3 py-2 text-sm transition-all",
                        formData.triggers.includes(trigger)
                          ? "bg-green-600 hover:bg-green-700"
                          : "hover:bg-gray-100"
                      )}
                      onClick={() => toggleTrigger(trigger)}
                    >
                      {trigger}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3 text-foreground">
                  Activities today
                </h3>
                <div className="flex flex-wrap gap-2">
                  {commonActivities.map((activity) => (
                    <Badge
                      key={activity}
                      variant={formData.activities.includes(activity) ? "default" : "outline"}
                      className={cn(
                        "cursor-pointer px-3 py-2 text-sm transition-all",
                        formData.activities.includes(activity)
                          ? "bg-purple-600 hover:bg-purple-700"
                          : "hover:bg-gray-100"
                      )}
                      onClick={() => toggleActivity(activity)}
                    >
                      {activity}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => setStep(3)}
                  variant="outline"
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={() => setStep(5)}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  Continue
                </Button>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-6">
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  Additional notes (optional)
                </label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Anything else you'd like to remember..."
                  className="rounded-xl h-32"
                />
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => setStep(4)}
                  variant="outline"
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={saveMutation.isPending}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {saveMutation.isPending ? 'Saving...' : 'Complete Check-in'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </PremiumOverlay>
  );
}