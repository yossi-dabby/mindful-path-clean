import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
  ArrowRight,
  Brain,
  Clock3,
  Hash,
  Info,
  Link as LinkIcon,
  Puzzle,
  Shuffle,
  Target,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { formatMindGameDuration, getMindGameMetadata } from './mindGameMetadata';

const GAME_ICONS = { Brain, Target, Shuffle, Link: LinkIcon, Hash, Puzzle };

export default function GameCard({ game, onClick, onInfo, index = 0, featured = false }) {
  const { t } = useTranslation();
  const title = game.titleKey ? t(game.titleKey) : game.title;
  const description = game.descriptionKey ? t(game.descriptionKey) : game.description;
  const metadata = getMindGameMetadata(game.id);
  const Icon = GAME_ICONS[game.icon] || Puzzle;
  const duration = formatMindGameDuration(game.time, t);
  const categoryLabel = t(`mind_games.premium.categories.${metadata.group}`);

  return (
    <motion.article
      className="h-full min-w-0"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay: Math.min(index, 8) * 0.045 }}
    >
      <Card
        className="group relative h-full min-h-[196px] overflow-hidden rounded-[24px] border border-teal-900/10 bg-white/90 shadow-[0_14px_34px_rgba(39,104,91,0.10)] backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:border-teal-600/30 hover:shadow-[0_20px_44px_rgba(39,104,91,0.16)]"
        data-featured={featured ? 'true' : 'false'}
      >
        <button
          type="button"
          onClick={onClick}
          className="h-full w-full rounded-[24px] text-start outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-600"
          aria-label={t('mind_games.premium.open_game_aria', { title })}
          data-testid={game.testId}
        >
          <CardContent className="flex h-full flex-col p-5">
            <div className="mb-4 flex flex-wrap items-center gap-3 pe-12">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-[0_10px_20px_rgba(13,148,136,0.22)]">
                <Icon className="h-6 w-6" aria-hidden="true" />
              </div>
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <span className="rounded-full border border-teal-700/15 bg-teal-50 px-2.5 py-1 text-[11px] font-semibold text-teal-800">
                  {categoryLabel}
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500">
                  <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                  <span dir="ltr">{duration}</span>
                </span>
              </div>
            </div>

            <h3 className="mb-2 break-words text-base font-semibold leading-6 text-teal-950">
              {title}
            </h3>
            <p className="line-clamp-3 break-words text-sm leading-6 text-slate-600">
              {description}
            </p>

            <div className="mt-auto flex items-center gap-1 pt-4 text-sm font-semibold text-teal-700">
              <span>{t('mind_games.premium.start_game')}</span>
              <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
            </div>
          </CardContent>
        </button>

        {onInfo && (
          <button
            type="button"
            onClick={() => onInfo(game)}
            className="absolute end-3 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-teal-800/10 bg-white/90 text-teal-700 shadow-sm transition hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
            aria-label={t('mind_games.premium.info_aria', { title })}
            data-testid={`mindgame-info-${game.slug}`}
          >
            <Info className="h-5 w-5" aria-hidden="true" />
          <span className="mobile-action-label md:hidden">{t('mind_games.premium.info_aria', { title })}</span></button>
        )}
      </Card>
    </motion.article>
  );
}
