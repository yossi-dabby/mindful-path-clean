import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Clock, Heart, Headphones } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import PremiumIcon from '@/components/ui/PremiumIcon';

export default function DailyProgram() {
  const { data: exercises } = useQuery({
    queryKey: ['featuredExercises'],
    queryFn: () => base44.entities.Exercise.list('?completed_count', 5),
    initialData: []
  });

  const { data: audioContent } = useQuery({
    queryKey: ['featuredAudio'],
    queryFn: () => base44.entities.AudioContent.list('?play_count', 3),
    initialData: []
  });

  // Curate daily content
  const dailyExercise = exercises.find(e => e.category === 'breathing') || exercises[0];
  const dailyAudio = audioContent.find(a => a.type === 'meditation') || audioContent[0];

  return (
    <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 rounded-2xl overflow-hidden">
      <CardHeader className="border-b border-purple-100">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-pink-600" />
            Your Daily Program
          </CardTitle>
          <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0">
            Personalized
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        {/* Morning Practice */}
        {dailyExercise && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            <div className="bg-[hsl(var(--card)/0.97)] rounded-xl p-5 hover:shadow-lg transition-all">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <Badge className="bg-orange-100 text-orange-700 mb-2">Morning</Badge>
                  <h3 className="font-semibold text-foreground text-lg mb-1">
                    {dailyExercise.title}
                  </h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {dailyExercise.description}
                  </p>
                </div>
                <PremiumIcon name="sun" size="md" />
              </div>
              
              <div className="flex items-center gap-4 mb-3">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>{dailyExercise.duration_options?.[0] || 5} min</span>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {dailyExercise.category}
                </Badge>
              </div>

              <Link to={createPageUrl('Exercises')}>
                <Button className="w-full bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600">
                  <Play className="w-4 h-4 mr-2" />
                  Start Practice
                </Button>
              </Link>
            </div>
          </motion.div>
        )}

        {/* Evening Meditation */}
        {dailyAudio && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            whileHover={{ scale: 1.02 }}
          >
            <div className="bg-[hsl(var(--card)/0.97)] rounded-xl p-5 hover:shadow-lg transition-all">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <Badge className="bg-indigo-100 text-indigo-700 mb-2">Evening</Badge>
                  <h3 className="font-semibold text-foreground text-lg mb-1">
                    {dailyAudio.title}
                  </h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {dailyAudio.description}
                  </p>
                </div>
                <PremiumIcon name="moon" size="md" />
              </div>
              
              <div className="flex items-center gap-4 mb-3">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Headphones className="w-3 h-3" />
                  <span>{dailyAudio.duration_minutes} min</span>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {dailyAudio.type}
                </Badge>
              </div>

              <Link to={createPageUrl('Exercises')}>
                <Button className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600">
                  <Play className="w-4 h-4 mr-2" />
                  Listen Now
                </Button>
              </Link>
            </div>
          </motion.div>
        )}

        {/* Daily Tip */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl p-5 border border-yellow-200"
        >
          <div className="flex items-start gap-3">
            <PremiumIcon name="idea" size="sm" className="shrink-0" />
            <div>
              <h4 className="font-semibold text-foreground mb-1">Tip of the Day</h4>
              <p className="text-sm text-muted-foreground">
                Take three deep breaths before responding to stress. This simple pause can help you respond thoughtfully rather than react impulsively.
              </p>
            </div>
          </div>
        </motion.div>
      </CardContent>
    </Card>
  );
}