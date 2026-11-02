import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Download, Heart, Music2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import PremiumBadge from '../subscription/PremiumBadge';

export default function AudioPlayer({ audioContent, onComplete, compact = false }) {
  const { t } = useTranslation();
  const [mediaError, setMediaError] = useState(false);
  const [downloadError, setDownloadError] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const audioRef = useRef(null);

  const updatePlayCountMutation = useMutation({
    mutationFn: () => base44.entities.AudioContent.update(audioContent.id, {
      play_count: (audioContent.play_count || 0) + 1
    })
  });

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    const handleEnded = () => {
      setIsPlaying(false);
      if (onComplete) onComplete();
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [onComplete]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio || isStarting) return;
    if (isPlaying) { audio.pause(); setIsPlaying(false); return; }
    setIsStarting(true);
    setMediaError(false);
    try {
      if (audio.error) audio.load();
      const startedAtBeginning = audio.currentTime === 0;
      await audio.play();
      setIsPlaying(true);
      if (startedAtBeginning) updatePlayCountMutation.mutate();
    } catch {
      setIsPlaying(false);
      setMediaError(true);
    } finally { setIsStarting(false); }
  };

  const handleSeek = (value) => {
    const audio = audioRef.current;
    const newTime = value[0];
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (value) => {
    const newVolume = value[0];
    audioRef.current.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (isMuted) {
      audio.volume = volume || 0.5;
      setIsMuted(false);
    } else {
      audio.volume = 0;
      setIsMuted(true);
    }
  };

  const skip = (seconds) => {
    const audio = audioRef.current;
    audio.currentTime = Math.max(0, Math.min(duration, currentTime + seconds));
  };

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const downloadAudio = async () => {
    try {
      const response = await fetch(audioContent.audio_url);
      if (!response.ok || response.headers.get('content-type')?.includes('text/html')) throw new Error('Audio download unavailable');
      const blob = await response.blob();
      setDownloadError(false);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${audioContent.title}.mp3`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (error) {
      setDownloadError(true);
    }
  };

  const errorNotice = (mediaError || downloadError) && <div role="alert" className="mt-3 rounded-xl border border-destructive/40 bg-card p-3 text-sm text-foreground"><p>{t(mediaError ? 'tools_stage5.media_error' : 'tools_stage5.download_error')}</p><Button variant="outline" className="mt-2 min-h-11" disabled={isStarting} onClick={mediaError ? togglePlay : downloadAudio}>{t('tools_stage5.retry')}</Button></div>;

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-3 p-3 bg-secondary rounded-xl border border-border">
        <audio ref={audioRef} src={audioContent.audio_url} preload="metadata" onError={() => { setMediaError(true); setIsPlaying(false); }} />
        <Button
          onClick={togglePlay}
          disabled={isStarting}
          size="icon"
          className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
          aria-label={t(isPlaying ? 'mobile_actions.pause' : 'mobile_actions.play')}
         mobileLabelKey={isPlaying ? 'pause' : 'play'}>
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
        </Button>
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">{audioContent.title}</p>
          <p className="text-xs text-foreground">{t('breathing_tool.controls.duration_value', { min: audioContent.duration_minutes })}</p>
        </div>
        <div className="text-xs text-foreground">
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>
        {errorNotice}
      </div>
    );
  }

  return (
    <Card className="border border-border bg-card overflow-hidden">
      <CardContent className="p-6">
        <audio ref={audioRef} src={audioContent.audio_url} preload="metadata" onError={() => { setMediaError(true); setIsPlaying(false); }} />

        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <h3 className="font-semibold text-foreground text-lg [overflow-wrap:anywhere]">{audioContent.title}</h3>
            <p className="text-sm text-foreground mt-1">{audioContent.description}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                {t('breathing_tool.controls.duration_value', { min: audioContent.duration_minutes })}
              </span>
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full capitalize">
                {(audioContent.type || '').replace(/_/g, ' ')}
              </span>
              {audioContent.narrator && (
                <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                  {audioContent.narrator}
                </span>
              )}
              {audioContent.duration_minutes > 30 && <PremiumBadge compact />}
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsFavorite(!isFavorite)}
              className={cn(isFavorite && "text-red-500")}
              aria-label={t(isFavorite ? 'exercise_view.remove_favorite' : 'exercise_view.add_favorite')}
             mobileLabelKey={isFavorite ? 'remove' : 'favorite'}>
              <Heart className={cn("w-5 h-5", isFavorite && "fill-current")} />
            </Button>
            {audioContent.download_enabled && (
              <Button variant="ghost" size="icon" onClick={downloadAudio} aria-label={t('home_practice.audio_download')} mobileLabelKey="download">
                <Download className="w-5 h-5" />
              </Button>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <Slider
            value={[currentTime]}
            max={duration || 100}
            step={0.1}
            onValueChange={handleSeek}
            className="cursor-pointer"
            aria-label={t('home_practice.audio_position')}
          />
          <div className="flex justify-between text-xs text-foreground mt-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center justify-center gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMute}
              className="text-foreground"
              aria-label={t(isMuted ? 'mobile_actions.unmute' : 'mobile_actions.mute')}
             mobileLabelKey={isMuted ? 'unmute' : 'mute'}>
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </Button>
            <Slider
              value={[isMuted ? 0 : volume]}
              max={1}
              step={0.01}
              onValueChange={handleVolumeChange}
              className="w-24"
              aria-label={t('home_practice.volume')}
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => skip(-10)}
              className="rounded-full"
              aria-label={t('mobile_actions.back10')} mobileLabelKey="back10"
            >
              <SkipBack className="w-4 h-4" />
            </Button>
            <Button
              onClick={togglePlay}
          disabled={isStarting}
              size="lg"
              className="rounded-full w-14 h-14 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg"
              aria-label={t(isPlaying ? 'mobile_actions.pause' : 'mobile_actions.play')}
             mobileLabelKey={isPlaying ? 'pause' : 'play'}>
              {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => skip(10)}
              className="rounded-full"
              aria-label={t('mobile_actions.forward10')}
             mobileLabelKey="forward10">
              <SkipForward className="w-4 h-4" />
            </Button>
          </div>


        </div>

        {/* Background Music Indicator */}
        {errorNotice}
        {audioContent.background_music && (
          <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-foreground">
            <Music2 className="h-3.5 w-3.5" aria-hidden="true" /> {t('home_practice.audio_music')}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
