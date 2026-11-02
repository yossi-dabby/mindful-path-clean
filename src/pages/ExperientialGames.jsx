import BotanicalAccent from '@/components/brand/BotanicalAccent';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Brain, Search, SlidersHorizontal, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { gamesCatalog } from '../components/experiential_games/mindGamesContent';
import GameInfoModal from '../components/experiential_games/GameInfoModal';
import GameCard from '../components/experiential_games/GameCard';
import MindGamesModalShell from '../components/experiential_games/MindGamesModalShell';
import MindGameRecommendations from '../components/experiential_games/MindGameRecommendations';
import { useMindGameTracking } from '../components/experiential_games/useMindGameTracking';
import ThoughtQuiz from '../components/experiential_games/ThoughtQuiz';
import ReframePick from '../components/experiential_games/ReframePick';
import ValueCompass from '../components/experiential_games/ValueCompass';
import TinyExperiment from '../components/experiential_games/TinyExperiment';
import QuickWin from '../components/experiential_games/QuickWin';
import CalmBingo from '../components/experiential_games/CalmBingo';
import DBTSTOP from '../components/experiential_games/DBTSTOP';
import OppositeAction from '../components/experiential_games/OppositeAction';
import UrgeSurfing from '../components/experiential_games/UrgeSurfing';
import WorryTime from '../components/experiential_games/WorryTime';
import EvidenceBalance from '../components/experiential_games/EvidenceBalance';
import DefusionCards from '../components/experiential_games/DefusionCards';
import TIPPSkills from '../components/experiential_games/TIPPSkills';
import ACCEPTS from '../components/experiential_games/ACCEPTS';
import WillingHands from '../components/experiential_games/WillingHands';
import HalfSmile from '../components/experiential_games/HalfSmile';
import IMPROVE from '../components/experiential_games/IMPROVE';
import LeavesOnStream from '../components/experiential_games/LeavesOnStream';
import Expansion from '../components/experiential_games/Expansion';
import ValuesCheck from '../components/experiential_games/ValuesCheck';
import ProsAndCons from '../components/experiential_games/ProsAndCons';
import CheckTheFacts from '../components/experiential_games/CheckTheFacts';
import SelfSoothe from '../components/experiential_games/SelfSoothe';
import MountainMeditation from '../components/experiential_games/MountainMeditation';
import MemoryMatch from '../components/experiential_games/MemoryMatch';
import FocusFlow from '../components/experiential_games/FocusFlow';
import PatternShift from '../components/experiential_games/PatternShift';
import WordAssociation from '../components/experiential_games/WordAssociation';
import NumberSequence from '../components/experiential_games/NumberSequence';
import { getMindGameMetadata } from '../components/experiential_games/mindGameMetadata';

const gameComponents = {
  ThoughtQuiz,
  ReframePick,
  ValueCompass,
  TinyExperiment,
  QuickWin,
  CalmBingo,
  DBTSTOP,
  OppositeAction,
  UrgeSurfing,
  WorryTime,
  EvidenceBalance,
  DefusionCards,
  TIPPSkills,
  ACCEPTS,
  WillingHands,
  HalfSmile,
  IMPROVE,
  LeavesOnStream,
  Expansion,
  ValuesCheck,
  ProsAndCons,
  CheckTheFacts,
  SelfSoothe,
  MountainMeditation,
  MemoryMatch,
  FocusFlow,
  PatternShift,
  WordAssociation,
  NumberSequence,
};

export default function ExperientialGames() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const gameOpener = useRef(null);
  const transitioning = useRef(false);
  const rememberOpener = () => { gameOpener.current = document.activeElement; };
  const handleInfo = (game) => { rememberOpener(); transitioning.current = false; setInfoGame(game); };
  const [activeGame, setActiveGame] = useState(null);
  const [gameStartTime, setGameStartTime] = useState(null);
  const [infoGame, setInfoGame] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const { trackGamePlay } = useMindGameTracking();

  useEffect(() => {
    const gameSlug = searchParams.get('game');
    if (gameSlug) {
      const game = gamesCatalog.find(g => g.slug === gameSlug);
      if (game) {
        setActiveGame(game);
        setGameStartTime(Date.now());
      }
    }
  }, [searchParams]);

  const handleGameClick = (game, fromInfo = false) => {
    if (!fromInfo) rememberOpener();
    setActiveGame(game);
    setGameStartTime(Date.now());
  };

  const handleClose = useCallback(() => {
    // Track game play when closing
    if (activeGame && gameStartTime) {
      const durationSeconds = Math.floor((Date.now() - gameStartTime) / 1000);
      trackGamePlay({
        game: {
          id: activeGame.id,
          slug: activeGame.slug,
          title: activeGame.titleKey ? t(activeGame.titleKey) : (activeGame.title || activeGame.id),
        },
        completed: durationSeconds >= 30, // Consider completed if played for 30+ seconds
        durationSeconds,
      });
    }
    
    setActiveGame(null);
    setGameStartTime(null);
    if (searchParams.has('game')) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('game');
      setSearchParams(nextParams, { replace: true });
    }
  }, [activeGame, gameStartTime, searchParams, setSearchParams, t, trackGamePlay]);

  useEffect(() => {
    if (!activeGame) return undefined;
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        handleClose();
      }
    };
    window.addEventListener('keydown', handleEscape, true);
    return () => window.removeEventListener('keydown', handleEscape, true);
  }, [activeGame, handleClose]);

  const ActiveGameComponent = activeGame ? gameComponents[activeGame.componentKey] : null;
  const filters = ['all', 'CBT', 'DBT', 'ACT', 'focus'];
  const normalizedSearch = searchTerm.trim().toLocaleLowerCase();
  const filteredGames = useMemo(() => gamesCatalog.filter((game) => {
    const metadata = getMindGameMetadata(game.id);
    const matchesFilter = activeFilter === 'all' || metadata.group === activeFilter;
    if (!matchesFilter) return false;
    if (!normalizedSearch) return true;
    const title = game.titleKey ? t(game.titleKey) : game.title;
    const description = game.descriptionKey ? t(game.descriptionKey) : game.description;
    return `${title} ${description}`.toLocaleLowerCase().includes(normalizedSearch);
  }), [activeFilter, normalizedSearch, t]);

  const resetFilters = () => {
    setSearchTerm('');
    setActiveFilter('all');
  };

  return (
    <div
      className="min-h-dvh overflow-x-hidden bg-transparent"
      data-testid="mindgames-hub"
    >
      <main className="mx-auto w-full max-w-6xl px-4 pb-[calc(2rem+env(safe-area-inset-bottom,0px))] pt-4 sm:px-6 sm:pt-6">
        <section className="relative mb-8 overflow-hidden rounded-[30px] border border-border/70 bg-[hsl(var(--card)/0.97)] p-5 shadow-[0_24px_60px_rgba(42,103,91,0.13)] backdrop-blur-xl sm:p-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
            className="relative mb-5 h-12 w-12 rounded-2xl border border-border bg-[hsl(var(--card)/0.97)] text-primary shadow-sm hover:bg-[hsl(var(--card)/0.97)]"
            aria-label={t('mind_games.go_back_aria')}
          >
            <ArrowLeft className="h-5 w-5 rtl:rotate-180" aria-hidden="true" />
          </Button>

          <div className="relative grid items-end gap-6 xl:grid-cols-[1fr_auto]">
            <div className="min-w-0">
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-primary">
                {t('mind_games.premium.eyebrow')}
              </p>
              <div className="mb-3 flex items-center gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-700 text-white shadow-[0_12px_24px_rgba(13,148,136,0.24)]">
                  <Brain className="h-6 w-6" aria-hidden="true" />
                </span>
                <div className="botanical-title-row"><h1 className="break-words text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl">
                  {t('mind_games.premium.hero_title')}
                </h1><BotanicalAccent variant="leaves" className="botanical-title-art" /></div>
              </div>
              <p className="max-w-3xl break-words text-sm leading-7 text-muted-foreground sm:text-base">
                {t('mind_games.premium.hero_description')}
              </p>
            </div>
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-[hsl(var(--card)/0.97)] px-4 py-2 text-sm font-semibold text-primary shadow-sm">
              <span className="h-2 w-2 rounded-full bg-primary" />
              {t('mind_games.premium.games_count', { count: gamesCatalog.length })}
            </div>
          </div>
        </section>

        <MindGameRecommendations onGameSelect={handleGameClick} onGameInfo={handleInfo} />

        <section aria-labelledby="all-games-title">
          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 id="all-games-title" className="text-2xl font-bold text-foreground">
                {t('mind_games.premium.all_games_title')}
              </h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{t('mind_games.premium.all_games_subtitle')}</p>
            </div>

            <div className="relative w-full lg:max-w-sm">
              <Search className="pointer-events-none absolute start-4 top-1/2 h-5 w-5 -translate-y-1/2 text-primary" aria-hidden="true" />
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder={t('mind_games.premium.search_placeholder')}
                aria-label={t('mind_games.premium.search_aria')}
                className="h-12 w-full rounded-2xl border border-border bg-[hsl(var(--card)/0.97)] ps-12 pe-12 text-sm text-primary shadow-sm outline-none placeholder:text-slate-400 focus:border-border focus:ring-2 focus:ring-ring"
                data-testid="mindgames-search"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute end-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl text-muted-foreground hover:bg-secondary/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={t('mind_games.premium.clear_search_aria')}
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                <span className="mobile-action-label md:hidden">{t('mind_games.premium.clear_search_aria')}</span></button>
              )}
            </div>
          </div>

          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-2 overflow-x-auto pb-1" role="group" aria-label={t('mind_games.premium.filters_aria')}>
              <SlidersHorizontal className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
              {filters.map((filter) => {
                const isActive = activeFilter === filter;
                return (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setActiveFilter(filter)}
                    className={`min-h-11 shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${isActive ? 'border-border bg-primary text-white shadow-md' : 'border-border bg-[hsl(var(--card)/0.97)] text-primary hover:bg-[hsl(var(--card)/0.97)]'}`}
                    aria-pressed={isActive}
                    data-testid={`mindgames-filter-${filter}`}
                  >
                    {t(`mind_games.premium.categories.${filter}`)}
                  </button>
                );
              })}
            </div>
            <p className="shrink-0 text-sm font-medium text-muted-foreground" aria-live="polite" data-testid="mindgames-results-count">
              {t('mind_games.premium.results_count', { count: filteredGames.length })}
            </p>
          </div>

          {filteredGames.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3" data-testid="mindgames-grid">
              {filteredGames.map((game, index) => (
                <GameCard
                  key={game.id}
                  game={game}
                  onClick={() => handleGameClick(game)}
                  onInfo={handleInfo}
                  index={index}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-[28px] border border-dashed border-border bg-[hsl(var(--card)/0.97)] px-5 py-12 text-center" data-testid="mindgames-empty-state">
              <Brain className="mx-auto mb-4 h-10 w-10 text-primary" aria-hidden="true" />
              <h3 className="text-lg font-semibold text-foreground">{t('mind_games.premium.no_results_title')}</h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">{t('mind_games.premium.no_results_description')}</p>
              <Button onClick={resetFilters} className="mt-5 min-h-11 rounded-xl bg-primary px-5 text-primary-foreground hover:bg-primary">
                {t('mind_games.premium.reset_filters')}
              </Button>
            </div>
          )}
        </section>
      </main>

      {/* Game Modal */}
      <Dialog open={!!activeGame} onOpenChange={(open) => { if (!open) handleClose(); }}>
        <DialogContent
          onCloseAutoFocus={(event) => { event.preventDefault(); if (gameOpener.current?.isConnected) gameOpener.current.focus({ preventScroll: true }); }}
          closeLabel={t('mind_games.close_aria')}
          onEscapeKeyDown={(event) => {
            event.preventDefault();
            handleClose();
          }}
          className="max-h-[calc(100dvh-1rem)] max-w-2xl overflow-hidden rounded-t-[28px] border-border/70 bg-card p-0 sm:max-h-[calc(100vh-3rem)] sm:rounded-[28px]"
          data-testid={activeGame ? `mindgame-modal-${activeGame.slug}` : undefined}
        >
          <div className="flex max-h-[calc(100dvh-1rem)] flex-col overflow-hidden sm:max-h-[calc(100vh-3rem)]">
            <DialogHeader className="shrink-0 border-b border-border/70 bg-secondary/35 px-6 pb-4 pt-6 pe-16 text-start">
              <DialogTitle className="min-w-0 break-words text-xl text-primary">
                {activeGame?.titleKey ? t(activeGame.titleKey) : activeGame?.title}
              </DialogTitle>
              <DialogDescription>
                {activeGame ? t(`mind_games.premium.categories.${getMindGameMetadata(activeGame.id).group}`) : ''}
              </DialogDescription>
            </DialogHeader>
            <div className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 sm:px-6" style={{ overscrollBehavior: 'contain' }}>
              <MindGamesModalShell>
                {ActiveGameComponent && <ActiveGameComponent onClose={handleClose} />}
              </MindGamesModalShell>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* Game Info Modal */}
      {infoGame && (
        <GameInfoModal
          game={infoGame}
          returnFocusTo={gameOpener}
          transitioning={transitioning}
          onClose={() => setInfoGame(null)}
          onPlay={() => { transitioning.current = true; setInfoGame(null); handleGameClick(infoGame, true); }}
        />
      )}
    </div>
  );
}
