import React, { useState, useEffect, useRef, useCallback } from 'react';
import PremiumDialog from '@/components/ui/PremiumDialog';
import './interactiveBreathing.css';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Slider } from '@/components/ui/slider';
import {
  X, Play, Pause, RotateCcw, Volume2, VolumeX, Settings, ChevronLeft, ChevronRight
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import PremiumIcon from '@/components/ui/PremiumIcon';
import {
  BREATHING_EXERCISES,
  getPhases,
} from './breathingExercisesData.js';

export { BREATHING_EXERCISES };

// ─── Theme Definitions ─────────────────────────────────────────────────────────
const THEMES = {
  mint: {
    circleGradient: 'linear-gradient(135deg, #a8edda 0%, #40c9a2 100%)',
    circleShadow: 'rgba(64, 201, 162, 0.55)',
    bgGradient: 'linear-gradient(165deg, #D4EDE8 0%, #BDE0D9 30%, #A8D4CB 60%, #9ECCC2 100%)',
    ringColor: '#0f766e',
    textPrimary: '#1A3A34',
    textSecondary: '#3D5A52',
    cardBg: 'rgba(255,255,255,0.18)',
    cardBorder: 'rgba(38,166,154,0.22)',
  },
  indigo: {
    circleGradient: 'linear-gradient(135deg, #c7d2fe 0%, #6366f1 100%)',
    circleShadow: 'rgba(99, 102, 241, 0.55)',
    bgGradient: 'linear-gradient(165deg, #EDE9FE 0%, #DDD6FE 30%, #C4B5FD 60%, #A78BFA 100%)',
    ringColor: '#4f46e5',
    textPrimary: '#1e1b4b',
    textSecondary: '#4338ca',
    cardBg: 'rgba(255,255,255,0.18)',
    cardBorder: 'rgba(99,102,241,0.22)',
  },
  sunset: {
    circleGradient: 'linear-gradient(135deg, #fecda5 0%, #f97316 100%)',
    circleShadow: 'rgba(249, 115, 22, 0.55)',
    bgGradient: 'linear-gradient(165deg, #FFF7ED 0%, #FFEDD5 30%, #FED7AA 60%, #FDBA74 100%)',
    ringColor: '#c2410c',
    textPrimary: '#431407',
    textSecondary: '#9a3412',
    cardBg: 'rgba(255,255,255,0.18)',
    cardBorder: 'rgba(249,115,22,0.22)',
  },
};

// ─── Local helpers ─────────────────────────────────────────────────────────────
function getCircleScale(phaseKey, reduced) {
  if (reduced) return phaseKey === 'inhale' || phaseKey === 'hold1' ? 1.1 : 0.95;
  if (phaseKey === 'inhale') return 1.5;
  if (phaseKey === 'hold1') return 1.5;
  if (phaseKey === 'exhale') return 0.7;
  if (phaseKey === 'hold2') return 0.7;
  return 1;
}

function formatTime(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

// ─── Web Audio Soft Bell ───────────────────────────────────────────────────────
function playBell(audioCtxRef) {
  try {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    const ctx = audioCtxRef.current;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(528, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.6);
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7);
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.7);
  } catch {
    // AudioContext not supported – silent fallback
  }
}

// ─── SVG Progress Ring ─────────────────────────────────────────────────────────
function ProgressRing({ radius, strokeWidth, progress, color }) {
  const inner = radius - strokeWidth;
  const circ = 2 * Math.PI * inner;
  const offset = circ - (Math.min(100, Math.max(0, progress)) / 100) * circ;

  return (
    <svg
      height={radius * 2}
      width={radius * 2}
      viewBox={`0 0 ${radius * 2} ${radius * 2}`}
      style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)', position: 'absolute', inset: 0, pointerEvents: 'none' }}
      aria-hidden="true"
    >
      <circle
        stroke="rgba(255,255,255,0.18)"
        fill="transparent"
        strokeWidth={strokeWidth}
        r={inner}
        cx={radius}
        cy={radius}
      />
      <circle
        stroke={color}
        fill="transparent"
        strokeWidth={strokeWidth}
        strokeDasharray={`${circ} ${circ}`}
        strokeDashoffset={offset}
        strokeLinecap="round"
        r={inner}
        cx={radius}
        cy={radius}
        style={{ transition: 'stroke-dashoffset 1s linear' }}
      />
    </svg>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function InteractiveBreathingTool({ onClose, onComplete }) {
  const { t } = useTranslation();
  const prefersReduced = useReducedMotion();

  // Exercise selection
  const [exerciseIdx, setExerciseIdx] = useState(0);

  // Settings
  const [sessionMinutes, setSessionMinutes] = useState(BREATHING_EXERCISES[0].defaultMinutes);
  const [themeKey, setThemeKey] = useState(BREATHING_EXERCISES[0].themeKey);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  // Timer display state (synced from refs each tick)
  const [display, setDisplay] = useState({
    phaseIdx: 0,
    phaseTimeLeft: 4,
    cycleCount: 0,
    totalTimeLeft: BREATHING_EXERCISES[0].defaultMinutes * 60,
    isPlaying: false,
    isComplete: false,
  });

  // Stable refs – avoids stale closures in interval
  const phaseIdxRef = useRef(0);
  const phaseTimeLeftRef = useRef(4);
  const cycleCountRef = useRef(0);
  const totalTimeLeftRef = useRef(BREATHING_EXERCISES[0].defaultMinutes * 60);
  const isPlayingRef = useRef(false);
  const exerciseIdxRef = useRef(0);
  const soundEnabledRef = useRef(true);
  const intervalRef = useRef(null);
  const audioCtxRef = useRef(null);
  const selectorScrollRef = useRef(null);
  const pillRefs = useRef([]);

  exerciseIdxRef.current = exerciseIdx;
  soundEnabledRef.current = soundEnabled;

  // Helper: get exercise from index ref
  const getExercise = () => BREATHING_EXERCISES[exerciseIdxRef.current];

  // ─── Reset session ─────────────────────────────────────────────────────────
  const resetSession = useCallback((newMinutes, newExerciseIdx) => {
    clearInterval(intervalRef.current);
    const exIdx = newExerciseIdx !== undefined ? newExerciseIdx : exerciseIdxRef.current;
    const ex = BREATHING_EXERCISES[exIdx];
    const phases = getPhases(ex, 0);
    const firstDuration = phases[0]?.duration || 4;
    const totalSecs = (newMinutes !== undefined ? newMinutes : sessionMinutes) * 60;

    phaseIdxRef.current = 0;
    phaseTimeLeftRef.current = firstDuration;
    cycleCountRef.current = 0;
    totalTimeLeftRef.current = totalSecs;
    isPlayingRef.current = false;

    setDisplay({
      phaseIdx: 0,
      phaseTimeLeft: firstDuration,
      cycleCount: 0,
      totalTimeLeft: totalSecs,
      isPlaying: false,
      isComplete: false,
    });
  }, [sessionMinutes]);

  // ─── Switch exercise ───────────────────────────────────────────────────────
  const switchExercise = useCallback((newIdx) => {
    const ex = BREATHING_EXERCISES[newIdx];
    setExerciseIdx(newIdx);
    setSessionMinutes(ex.defaultMinutes);
    setThemeKey(ex.themeKey);
    resetSession(ex.defaultMinutes, newIdx);
  }, [resetSession]);

  // ─── Tick function (called from interval) ─────────────────────────────────
  const tick = useCallback(() => {
    const ex = getExercise();
    const cycleCount = cycleCountRef.current;
    const phases = getPhases(ex, cycleCount);

    // Decrement phase timer
    phaseTimeLeftRef.current -= 1;

    let phaseChanged = false;
    if (phaseTimeLeftRef.current <= 0) {
      phaseChanged = true;
      const nextPhaseIdx = (phaseIdxRef.current + 1) % phases.length;
      const isNewCycle = nextPhaseIdx === 0;
      if (isNewCycle) cycleCountRef.current += 1;

      const newPhases = getPhases(ex, cycleCountRef.current);
      phaseIdxRef.current = nextPhaseIdx;
      phaseTimeLeftRef.current = newPhases[nextPhaseIdx]?.duration || 4;
    }

    // Decrement total timer
    totalTimeLeftRef.current -= 1;

    if (totalTimeLeftRef.current <= 0) {
      clearInterval(intervalRef.current);
      isPlayingRef.current = false;
      setDisplay(prev => ({ ...prev, totalTimeLeft: 0, phaseTimeLeft: 0, isPlaying: false, isComplete: true }));
      return;
    }

    if (phaseChanged && soundEnabledRef.current) {
      playBell(audioCtxRef);
    }

    setDisplay({
      phaseIdx: phaseIdxRef.current,
      phaseTimeLeft: phaseTimeLeftRef.current,
      cycleCount: cycleCountRef.current,
      totalTimeLeft: totalTimeLeftRef.current,
      isPlaying: true,
      isComplete: false,
    });
  }, []);

  // ─── Play / Pause ──────────────────────────────────────────────────────────
  const handlePlayPause = useCallback(() => {
    if (display.isComplete) return;

    if (isPlayingRef.current) {
      clearInterval(intervalRef.current);
      isPlayingRef.current = false;
      setDisplay(prev => ({ ...prev, isPlaying: false }));
    } else {
      isPlayingRef.current = true;
      setDisplay(prev => ({ ...prev, isPlaying: true }));
      intervalRef.current = setInterval(tick, 1000);
    }
  }, [display.isComplete, tick]);

  // ─── Reset ────────────────────────────────────────────────────────────────
  const handleReset = useCallback(() => {
    resetSession(sessionMinutes, exerciseIdx);
  }, [resetSession, sessionMinutes, exerciseIdx]);

  // ─── Duration change ───────────────────────────────────────────────────────
  const handleDurationChange = useCallback((val) => {
    const mins = val[0];
    setSessionMinutes(mins);
    resetSession(mins, exerciseIdx);
  }, [resetSession, exerciseIdx]);

  // ─── Complete callback ─────────────────────────────────────────────────────
  useEffect(() => {
    if (display.isComplete && onComplete) {
      onComplete();
    }
  }, [display.isComplete, onComplete]);

  // ─── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => clearInterval(intervalRef.current);
  }, []);

  // ─── Scroll active pill into view on exercise change ──────────────────────
  useEffect(() => {
    const pill = pillRefs.current[exerciseIdx];
    if (pill) {
      pill.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
    }
  }, [exerciseIdx]);

  // ─── Selector keyboard navigation ─────────────────────────────────────────
  const handleSelectorKeyDown = useCallback((e) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      const delta = e.key === 'ArrowLeft' ? -1 : 1;
      const newIdx = Math.max(0, Math.min(BREATHING_EXERCISES.length - 1, exerciseIdx + delta));
      if (newIdx !== exerciseIdx) switchExercise(newIdx);
    }
  }, [exerciseIdx, switchExercise]);

  // ─── Derived values ────────────────────────────────────────────────────────
  const exercise = BREATHING_EXERCISES[exerciseIdx];
  const theme = THEMES[themeKey] || THEMES.mint;
  const phases = getPhases(exercise, display.cycleCount);
  const currentPhase = phases[display.phaseIdx] || phases[0];
  const totalSessionSecs = sessionMinutes * 60;
  const sessionProgress = totalSessionSecs > 0
    ? ((totalSessionSecs - display.totalTimeLeft) / totalSessionSecs) * 100
    : 0;
  const phaseProgress = currentPhase
    ? ((currentPhase.duration - display.phaseTimeLeft) / currentPhase.duration) * 100
    : 0;

  const circleScale = currentPhase ? getCircleScale(currentPhase.key, prefersReduced) : 1;
  const phaseDuration = currentPhase?.duration || 4;

  const themeKeys = Object.keys(THEMES);

  // ─── Calm Ladder stage label ───────────────────────────────────────────────
  const calmLadderStage = exercise.isAdaptive
    ? display.cycleCount < 3 ? t('breathing_tool.calm_ladder.stage_1')
      : display.cycleCount < 6 ? t('breathing_tool.calm_ladder.stage_2')
      : t('breathing_tool.calm_ladder.stage_3')
    : null;

  return (
    <PremiumDialog
      onClose={onClose}
      label={t('breathing_tool.title')}
      className="fixed inset-0 flex flex-col"
    >
      <div className="breathing-session absolute inset-0 flex flex-col overflow-y-auto overscroll-contain" style={{ background: theme.bgGradient }} data-testid="interactive-breathing-surface">
      {/* ── Top Bar ─────────────────────────────────────────────────────────── */}
      <div className="breathing-session-header flex shrink-0 items-center justify-between gap-2 px-4 py-3 md:px-6 md:py-4" style={{ background: theme.bgGradient }}>
        <button
          onClick={onClose}
          className="breathing-session-close flex min-h-11 shrink-0 items-center gap-1 rounded-full px-2 py-2 text-sm font-medium transition-colors"
          style={{ color: theme.textSecondary, background: theme.cardBg }}
          aria-label={t('breathing_tool.controls.close')}
        >
          <X className="w-4 h-4" />
          <span className="inline">{t('breathing_tool.controls.close')}</span>
        </button>

        <h2 className="min-w-0 text-center text-base font-semibold md:text-lg" style={{ color: theme.textPrimary }}>
          {t('breathing_tool.title')}
        </h2>

        <div className="breathing-session-actions flex shrink-0 gap-2">
          <button
            onClick={() => setSoundEnabled(s => !s)}
            className="breathing-session-sound min-h-11 min-w-11 rounded-full p-2 transition-colors"
            style={{ color: theme.textSecondary, background: theme.cardBg }}
            aria-label={soundEnabled ? t('breathing_tool.controls.sound_off') : t('breathing_tool.controls.sound_on')}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          <span className="mobile-action-label md:hidden">{soundEnabled ? t('breathing_tool.controls.sound_off') : t('breathing_tool.controls.sound_on')}</span></button>
          <button
            onClick={() => setShowSettings(s => !s)}
            className="breathing-session-settings min-h-11 min-w-11 rounded-full p-2 transition-colors"
            style={{
              color: showSettings ? '#fff' : theme.textSecondary,
              background: showSettings ? theme.ringColor : theme.cardBg
            }}
            aria-label={t('breathing_tool.controls.settings')}
          >
            <Settings className="w-4 h-4" />
          <span className="mobile-action-label md:hidden">{t('breathing_tool.controls.settings')}</span></button>
        </div>
      </div>

      {/* ── Exercise Selector ───────────────────────────────────────────────── */}
      <div className="breathing-session-selector flex shrink-0 items-center gap-1 px-2 pb-2">
        {/* Previous exercise arrow */}
        <button
          onClick={() => switchExercise(Math.max(0, exerciseIdx - 1))}
          disabled={exerciseIdx === 0}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-30"
          style={{ color: theme.textSecondary, background: theme.cardBg }}
          aria-label={t('breathing_tool.controls.prev_exercise')}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Scrollable pills */}
        <div
          ref={selectorScrollRef}
          className="flex min-w-0 flex-1 gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden"
          style={{ scrollbarWidth: 'none', flexWrap: 'nowrap' }}
          role="tablist"
          onKeyDown={handleSelectorKeyDown}
        >
          {BREATHING_EXERCISES.map((ex, idx) => (
            <button
              key={ex.id}
              ref={el => { pillRefs.current[idx] = el; }}
              onClick={() => switchExercise(idx)}
              role="tab"
              aria-selected={idx === exerciseIdx}
              className="px-3 py-1.5 rounded-full text-xs md:text-sm font-medium whitespace-nowrap transition-all flex-shrink-0"
              style={{
                background: idx === exerciseIdx ? theme.ringColor : theme.cardBg,
                color: idx === exerciseIdx ? '#fff' : theme.textSecondary,
                border: `1px solid ${idx === exerciseIdx ? theme.ringColor : theme.cardBorder}`,
                whiteSpace: 'nowrap',
                minWidth: 'max-content',
              }}
            >
              {t(ex.nameKey)}
            </button>
          ))}
        </div>

        {/* Next exercise arrow */}
        <button
          onClick={() => switchExercise(Math.min(BREATHING_EXERCISES.length - 1, exerciseIdx + 1))}
          disabled={exerciseIdx === BREATHING_EXERCISES.length - 1}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-30"
          style={{ color: theme.textSecondary, background: theme.cardBg }}
          aria-label={t('breathing_tool.controls.next_exercise')}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* ── Main Area ───────────────────────────────────────────────────────── */}
      <div className="breathing-session-main flex flex-1 flex-col items-center justify-center gap-6 px-4 py-4 lg:flex-row lg:gap-12">

        {/* ── Circle & Phase Info ──────────────────────────────────────────── */}
        <div className="interactive-breathing-practice flex shrink-0 flex-col items-center justify-center">
          {/* Phase label */}
          <AnimatePresence mode="wait">
            <motion.p
              key={currentPhase?.key || 'ready'}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.3 }}
              className="breathing-phase mb-2 text-xl font-light uppercase tracking-widest md:text-2xl"
              style={{ color: theme.textPrimary }}
              aria-live="polite"
              aria-label={t('breathing_tool.accessibility.aria_phase', { phase: t(currentPhase?.labelKey || '') })}
            >
              {display.isComplete
                ? t('breathing_tool.status.completed')
                : !display.isPlaying && display.totalTimeLeft === totalSessionSecs
                ? t('breathing_tool.status.get_ready')
                : t(currentPhase?.labelKey || '')}
            </motion.p>
          </AnimatePresence>

          {/* Animated Circle with Progress Ring */}
          <div
            className="breathing-circle relative flex items-center justify-center"
            style={{ width: 'var(--breathing-circle-size, 240px)', height: 'var(--breathing-circle-size, 240px)' }}
            data-testid="breathing-circle"
            aria-hidden="true"
          >
            {/* Outer glow (reduced for prefers-reduced-motion) */}
            {!prefersReduced && (
              <motion.div
                animate={{ scale: circleScale * 1.18, opacity: [0.25, 0.5, 0.25] }}
                transition={{ duration: phaseDuration, ease: 'easeInOut', repeat: Infinity }}
                className="absolute rounded-full blur-3xl"
                style={{
                  width: '66.6667%', height: '66.6667%',
                  background: theme.circleGradient,
                }}
              />
            )}

            {/* Progress ring (session progress) */}
            <ProgressRing
              radius={120}
              strokeWidth={5}
              progress={sessionProgress}
              color={theme.ringColor}
            />

            {/* Main breathing circle */}
            <motion.div
              animate={{ scale: circleScale }}
              transition={{
                duration: prefersReduced ? 0.4 : phaseDuration,
                ease: prefersReduced ? 'easeOut' : [0.4, 0, 0.2, 1],
              }}
              className="absolute rounded-full flex items-center justify-center"
              style={{
                width: '66.6667%',
                height: '66.6667%',
                background: theme.circleGradient,
                boxShadow: `0 0 60px ${theme.circleShadow}, 0 0 120px ${theme.circleShadow.replace('0.55', '0.2')}`,
              }}
            >
              {/* Phase countdown inside circle */}
              <div className="text-center select-none">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={display.phaseTimeLeft}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="block text-3xl md:text-4xl font-bold"
                    style={{ color: theme.textPrimary }}
                    data-testid="breathing-countdown"
                  >
                    {display.isComplete ? '✓' : display.phaseTimeLeft}
                  </motion.span>
                </AnimatePresence>
              </div>
            </motion.div>
          </div>

          {/* Phase progress bar */}
          <div className="breathing-phase-progress mt-4 w-48 md:w-56">
            <div
              className="h-1.5 rounded-full overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.3)' }}
            >
              <motion.div
                className="h-full rounded-full"
                style={{ background: theme.ringColor }}
                animate={{ width: `${phaseProgress}%` }}
                transition={{ duration: 1, ease: 'linear' }}
              />
            </div>
          </div>

          {/* Session info row */}
          <div className="breathing-session-stats mt-4 flex items-center gap-6 text-center">
            <div>
              <p className="text-xs uppercase tracking-wider" style={{ color: theme.textSecondary }}>
                {t('breathing_tool.controls.cycles')}
              </p>
              <p className="text-lg font-semibold" style={{ color: theme.textPrimary }}>
                {display.cycleCount}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider" style={{ color: theme.textSecondary }}>
                {t('breathing_tool.status.time_remaining')}
              </p>
              <p
                className="text-lg font-semibold"
                style={{ color: theme.textPrimary }}
                aria-label={t('breathing_tool.accessibility.aria_timer', { time: formatTime(display.totalTimeLeft) })}
              >
                {formatTime(display.totalTimeLeft)}
              </p>
            </div>
            {calmLadderStage && (
              <div>
                <p className="text-xs uppercase tracking-wider" style={{ color: theme.textSecondary }}>
                  {t('breathing_tool.controls.stage')}
                </p>
                <p className="text-sm font-medium" style={{ color: theme.textPrimary }}>
                  {calmLadderStage}
                </p>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="breathing-session-controls mt-6 flex flex-wrap justify-center gap-3">
            <button
              onClick={handlePlayPause}
              disabled={display.isComplete}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl text-white font-semibold text-base shadow-lg transition-transform active:scale-95"
              style={{
                background: display.isComplete ? 'rgba(0,0,0,0.15)' : theme.ringColor,
                opacity: display.isComplete ? 0.5 : 1,
                minWidth: 120,
              }}
            >
              {display.isPlaying
                ? <><Pause className="w-5 h-5" />{t('breathing_tool.controls.pause')}</>
                : display.totalTimeLeft < totalSessionSecs && !display.isComplete
                ? <><Play className="w-5 h-5" />{t('breathing_tool.controls.resume')}</>
                : <><Play className="w-5 h-5" />{t('breathing_tool.controls.start')}</>
              }
            </button>
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-3 rounded-2xl font-medium text-sm shadow transition-transform active:scale-95"
              style={{
                background: theme.cardBg,
                color: theme.textSecondary,
                border: `1px solid ${theme.cardBorder}`,
              }}
              aria-label={t('breathing_tool.controls.reset')}
            >
              <RotateCcw className="w-4 h-4" />
              <span className="inline">{t('breathing_tool.controls.reset')}</span>
            </button>
          </div>

          {/* Description */}
          <p
            className="breathing-session-description mt-4 max-w-xs text-center text-sm"
            style={{ color: theme.textSecondary }}
          >
            {t(exercise.descKey)}
          </p>
        </div>

        {/* ── Settings Panel ───────────────────────────────────────────────── */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ duration: 0.25 }}
              className="rounded-3xl p-5 w-full max-w-xs flex-shrink-0"
              style={{
                background: theme.cardBg,
                border: `1px solid ${theme.cardBorder}`,
                backdropFilter: 'blur(16px)',
              }}
            >
              <h3
                className="text-sm font-semibold uppercase tracking-wider mb-4"
                style={{ color: theme.textPrimary }}
              >
                {t('breathing_tool.controls.settings')}
              </h3>

              {/* Duration */}
              <div className="mb-5">
                <label className="text-xs mb-2 block" style={{ color: theme.textSecondary }}>
                  {t('breathing_tool.controls.duration')}:{' '}
                  <strong style={{ color: theme.textPrimary }}>
                    {t('breathing_tool.controls.duration_value', { min: sessionMinutes })}
                  </strong>
                </label>
                <Slider
                  value={[sessionMinutes]}
                  onValueChange={handleDurationChange}
                  min={exercise.minMinutes}
                  max={exercise.maxMinutes}
                  step={1}
                  disabled={display.isPlaying}
                  aria-label={t('breathing_tool.controls.duration')}
                />
                <div className="flex justify-between text-xs mt-1" style={{ color: theme.textSecondary }}>
                  <span>{t('breathing_tool.controls.duration_value', { min: exercise.minMinutes })}</span>
                  <span>{t('breathing_tool.controls.duration_value', { min: exercise.maxMinutes })}</span>
                </div>
              </div>

              {/* Theme */}
              <div className="mb-5">
                <p className="text-xs mb-2" style={{ color: theme.textSecondary }}>
                  {t('breathing_tool.controls.theme')}
                </p>
                <div className="flex gap-2">
                  {themeKeys.map((tk) => (
                    <button
                      key={tk}
                      onClick={() => setThemeKey(tk)}
                      className="flex-1 py-2 rounded-xl text-xs font-medium transition-all"
                      style={{
                        background: THEMES[tk].circleGradient,
                        border: tk === themeKey ? `2px solid ${THEMES[tk].ringColor}` : '2px solid transparent',
                        boxShadow: tk === themeKey ? `0 0 0 2px white` : 'none',
                        color: '#fff',
                        fontSize: '0.65rem',
                      }}
                    >
                      {t(`breathing_tool.themes.${tk}`)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sound Toggle */}
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: theme.textSecondary }}>
                  {t('breathing_tool.controls.sound')}
                </span>
                <button
                  onClick={() => setSoundEnabled(s => !s)}
                  className="relative w-10 h-5 rounded-full transition-colors"
                  style={{
                    background: soundEnabled ? theme.ringColor : 'rgba(0,0,0,0.15)',
                  }}
                  role="switch"
                  aria-checked={soundEnabled}
                  aria-label={t('breathing_tool.controls.sound')}
                >
                  <span
                    className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform"
                    style={{ left: soundEnabled ? '1.25rem' : '0.125rem' }}
                  />
                </button>
              </div>

              {/* Reduce motion note */}
              {prefersReduced && (
                <p className="mt-4 text-xs italic" style={{ color: theme.textSecondary }}>
                  {t('breathing_tool.controls.reduce_motion_active')}
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Complete Banner ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {display.isComplete && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mx-auto mb-6 w-[calc(100%_-_2rem)] max-w-sm shrink-0 rounded-3xl p-5 text-center shadow-2xl"
            style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}`, backdropFilter: 'blur(16px)' }}
          >
            <p className="mb-1 flex items-center justify-center gap-2 text-lg font-semibold" style={{ color: theme.textPrimary }}>
              <PremiumIcon name="leaf" size="sm" bare /> {t('breathing_tool.status.completed')}
            </p>
            <p className="text-sm" style={{ color: theme.textSecondary }}>
              {t('breathing_tool.status.well_done')}
            </p>
            <button
              onClick={handleReset}
              className="mt-3 px-5 py-2 rounded-full text-white text-sm font-medium"
              style={{ background: theme.ringColor }}
            >
              {t('breathing_tool.controls.reset')}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </PremiumDialog>
  );
}
