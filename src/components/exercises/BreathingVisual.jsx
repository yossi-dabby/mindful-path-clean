import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, RotateCcw, X, Volume2, VolumeX } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import PremiumDialog from '@/components/ui/PremiumDialog';

export default function BreathingVisual({ exercise, duration, onClose, onComplete }) {
  const { t } = useTranslation();
  const [isPlaying, setIsPlaying] = useState(false);
  const [phase, setPhase] = useState('inhale');
  const [timeRemaining, setTimeRemaining] = useState(duration * 60);
  const [cycleProgress, setCycleProgress] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(50);
  const audioRef = useRef(null);
  const videoRef = useRef(null);

  const pattern = exercise.breathing_pattern || { inhale: 4, hold1: 0, exhale: 4, hold2: 0 };
  const totalCycleTime = pattern.inhale + pattern.hold1 + pattern.exhale + pattern.hold2;

  useEffect(() => {
    let interval;
    if (isPlaying && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            setIsPlaying(false);
            onComplete();
            return 0;
          }
          return prev - 1;
        });

        setCycleProgress(prev => {
          const newProgress = prev + 1;
          if (newProgress >= totalCycleTime) return 0;
          return newProgress;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, timeRemaining, totalCycleTime, onComplete]);

  useEffect(() => {
    if (cycleProgress < pattern.inhale) {
      setPhase('inhale');
    } else if (cycleProgress < pattern.inhale + pattern.hold1) {
      setPhase('hold1');
    } else if (cycleProgress < pattern.inhale + pattern.hold1 + pattern.exhale) {
      setPhase('exhale');
    } else {
      setPhase('hold2');
    }
  }, [cycleProgress, pattern]);

  const getPhaseText = () => {
    switch (phase) {
      case 'inhale': return t('breathing_tool.phases.inhale');
      case 'hold1': return t('breathing_tool.phases.hold');
      case 'exhale': return t('breathing_tool.phases.exhale');
      case 'hold2': return t('breathing_tool.phases.hold');
      default: return '';
    }
  };

  const getCircleScale = () => {
    if (phase === 'inhale') return 2;
    if (phase === 'exhale') return 0.6;
    return phase === 'hold1' ? 2 : 0.6;
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
    if (audioRef.current) {
      if (!isPlaying) {
        audioRef.current.play().catch(() => {});
      } else {
        audioRef.current.pause();
      }
    }
  };

  const handleReset = () => {
    setIsPlaying(false);
    setTimeRemaining(duration * 60);
    setCycleProgress(0);
    setPhase('inhale');
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVolumeChange = (value) => {
    const newVolume = value[0];
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume / 100;
    }
  };

  return (
    <PremiumDialog onClose={onClose} label={exercise.title || t('breathing_tool.title')} className="breathing-practice fixed inset-0 overflow-y-auto bg-black text-white">
      {/* Background Video */}
      <video
        ref={videoRef}
        className="fixed inset-0 w-full h-full object-cover"
        src="https://firebasestorage.googleapis.com/v0/b/my-cbt-therapy.firebasestorage.app/o/14657405_1920_1080_30fps.mp4?alt=media&token=953136b7-37e5-4f9e-9940-1fa3807d9819"
        autoPlay
        loop
        muted
        playsInline
      />

      {/* Dark Overlay for Readability */}
      <div className="fixed inset-0 bg-black/70" />

      {/* Ambient Audio */}
      <audio ref={audioRef} loop preload="auto">
        <source src="https://firebasestorage.googleapis.com/v0/b/my-cbt-therapy.firebasestorage.app/o/relaxation-for-relaxing-145469.mp3?alt=media&token=069ea89b-e8d9-4d3b-830f-947a4ab2e22b" type="audio/mpeg" />
      </audio>

      {/* Controls - Top Bar */}
      <div className="sticky top-0 flex items-center justify-between gap-4 bg-black/80 px-4 py-3 md:px-8 z-50">
        <div className="flex items-center gap-2 md:gap-4 bg-black/30 backdrop-blur-xl rounded-full px-3 md:px-4 py-2 pointer-events-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleMute();
            }}
            className="text-white/80 hover:text-white hover:bg-white/10 rounded-full h-8 w-8 md:h-10 md:w-10"
            aria-label={t(isMuted ? 'mobile_actions.unmute' : 'mobile_actions.mute')}
           mobileLabelKey={isMuted ? 'unmute' : 'mute'}>
            {isMuted ? <VolumeX className="w-4 h-4 md:w-5 md:h-5" /> : <Volume2 className="w-4 h-4 md:w-5 md:h-5" />}
          </Button>
          <Slider
            value={[volume]}
            onValueChange={handleVolumeChange}
            max={100}
            step={1}
            className="w-16 md:w-24"
            disabled={isMuted}
            aria-label={t('home_practice.volume')}
            aria-valuetext={t('home_practice.volume_value', { volume })}
          />
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onClose();
          }}
          className="text-white/80 hover:text-white hover:bg-white/10 backdrop-blur-xl rounded-full h-8 w-8 md:h-10 md:w-10 pointer-events-auto"
          aria-label={t('home_practice.close_breathing')}
        >
          <X className="w-5 h-5 md:w-6 md:h-6" />
        </Button>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex min-h-[calc(100dvh-5rem)] flex-col items-center justify-center text-white px-4 py-16">
        {/* Breathing Circle */}
        <div className="relative z-10 mb-16">
          {/* Outer Ripple Effects */}
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              animate={{
                scale: [1, 2.5],
                opacity: [0.4, 0]
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                delay: i * 1,
                ease: "easeOut"
              }}
              className="absolute inset-0 rounded-full border-4 border-white/30"
            />
          ))}

          {/* Main Breathing Circle */}
          <motion.div
            animate={{ scale: getCircleScale() }}
            transition={{
              duration: phase === 'inhale' ? pattern.inhale : phase === 'exhale' ? pattern.exhale : 0.5,
              ease: "easeInOut"
            }}
            className="relative w-24 h-24 md:w-32 md:h-32 rounded-full flex items-center justify-center"
            style={{
              background: 'rgba(0, 0, 0, 0.85)',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 0 80px rgba(139, 92, 246, 0.5), inset 0 0 80px rgba(236, 72, 153, 0.3)'
            }}
          >
            <div className="text-center">
              <motion.p
                key={phase}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative z-10 text-base md:text-xl font-medium mb-1 tracking-wide"
              >
                {getPhaseText()}
              </motion.p>
              <motion.p
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-2xl md:text-3xl font-bold tracking-wider"
              >
                {formatTime(timeRemaining)}
              </motion.p>
            </div>
          </motion.div>

          {/* Glow Effect */}
          <motion.div
            animate={{
              scale: getCircleScale() * 1.15,
              opacity: [0.3, 0.6, 0.3]
            }}
            transition={{
              duration: totalCycleTime,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="pointer-events-none absolute -z-10 inset-0 rounded-full blur-3xl"
            style={{
              background: 'radial-gradient(circle, rgba(139, 92, 246, 0.6), rgba(236, 72, 153, 0.4))'
            }}
          />
        </div>

        {/* Exercise Title */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="max-w-full text-center [overflow-wrap:anywhere] text-2xl md:text-3xl font-medium mb-8 tracking-wide"
        >
          {exercise.title}
        </motion.h2>

        {/* Controls */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex flex-wrap justify-center gap-4"
        >
          <Button
            onClick={handlePlayPause}
            size="lg"
            className="bg-white/20 hover:bg-white/30 backdrop-blur-xl border-2 border-white/40 text-white px-10 py-7 rounded-2xl text-lg font-medium shadow-2xl"
          >
            {isPlaying ? (
              <>
                <Pause className="w-6 h-6 mr-3" />
                {t('breathing_tool.controls.pause')}
              </>
            ) : (
              <>
                <Play className="w-6 h-6 mr-3" />
                {t('breathing_tool.controls.start')}
              </>
            )}
          </Button>
          <Button
            onClick={handleReset}
            size="lg"
            className="bg-white/10 hover:bg-white/20 backdrop-blur-xl border-2 border-white/30 text-white px-10 py-7 rounded-2xl text-lg font-medium shadow-2xl"
          >
            <RotateCcw className="w-6 h-6 mr-3" />
            {t('breathing_tool.controls.reset')}
          </Button>
        </motion.div>

        {/* Progress Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="mt-12 w-full max-w-md"
        >
          <div className="h-3 bg-white/20 rounded-full overflow-hidden backdrop-blur-xl border border-white/30" dir="ltr">
            <motion.div
              className="h-full rounded-full"
              style={{
                background: 'linear-gradient(90deg, #8b5cf6, #ec4899)'
              }}
              animate={{ width: `${((duration * 60 - timeRemaining) / (duration * 60)) * 100}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-sm text-white">
            <span>{t('home_practice.elapsed', { time: formatTime((duration * 60) - timeRemaining) })}</span>
            <span>{t('home_practice.remaining', { time: formatTime(timeRemaining) })}</span>
          </div>
        </motion.div>
      </div>
    </PremiumDialog>
  );
}