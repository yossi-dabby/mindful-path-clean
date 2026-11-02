import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { AlertCircle, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import GameCard from './GameCard';
import { gamesCatalog } from './mindGamesContent';
import { getMindGameRecommendations } from './mindGameMetadata';

export default function MindGameRecommendations({ onGameSelect, onGameInfo }) {
  const { t } = useTranslation();
  const { data: activities = [], isPending, isError, isFetching, refetch } = useQuery({
    queryKey: ['mindGameActivities'],
    queryFn: () => base44.entities.MindGameActivity.list('-created_date', 50),
    staleTime: 60_000,
  });

  const recommendedGameIds = getMindGameRecommendations(activities, gamesCatalog);
  const recommendedGames = recommendedGameIds
    .map(id => gamesCatalog.find(g => g.id === id))
    .filter(Boolean);

  return (
    <Card
      className="mb-8 overflow-hidden rounded-[28px] border border-teal-700/15 bg-gradient-to-br from-white/95 via-emerald-50/90 to-violet-50/80 p-5 shadow-[0_20px_50px_rgba(39,104,91,0.12)] sm:p-6"
      data-testid="mindgames-recommendations"
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-sm">
            <Sparkles className="h-5 w-5" aria-hidden="true" />
          </span>
          <h2 className="break-words text-lg font-semibold text-teal-950 sm:text-xl">
          {t('mind_games.recommended_title')}
          </h2>
        </div>
        {isFetching && !isPending && <Loader2 className="h-5 w-5 animate-spin text-teal-600" aria-hidden="true" />}
      </div>
      <p className="mb-5 text-sm leading-6 text-slate-600">
        {t('mind_games.recommended_subtitle')}
      </p>

      {isPending && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3" aria-label={t('mind_games.premium.recommendations_loading')}>
          {[0, 1, 2].map((item) => <div key={item} className="h-[196px] animate-pulse rounded-[24px] bg-white/70" />)}
        </div>
      )}

      {isError && (
        <div className="flex flex-col items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-start" role="status">
          <div className="flex items-center gap-2 text-sm font-medium text-amber-950">
            <AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
            {t('mind_games.premium.recommendations_error')}
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-amber-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            {t('mind_games.premium.retry')}
          </button>
        </div>
      )}

      {!isPending && !isError && (
        <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {recommendedGames.map((game, index) => (
            <GameCard
              key={game.id}
              game={game}
              onClick={() => onGameSelect(game)}
              onInfo={onGameInfo}
              index={index}
              featured
            />
          ))}
        </div>
      )}
    </Card>
  );
}
