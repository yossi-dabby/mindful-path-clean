import BotanicalAccent from '@/components/brand/BotanicalAccent';
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import PersonalizedContentFeed from '../components/home/PersonalizedContentFeed';
import FeedPreferences from '../components/feed/FeedPreferences';
import FeedFilters from '../components/feed/FeedFilters';
import { Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import PullToRefresh from '../components/utils/PullToRefresh';
import { useTranslation } from 'react-i18next';

export default function PersonalizedFeed() {
  const { t } = useTranslation();
  const [userInterests, setUserInterests] = useState([]);
  const [contentType, setContentType] = useState('all');
  const [sortBy, setSortBy] = useState('relevance');

  const handlePreferencesChange = (interests) => {
    setUserInterests(interests);
  };

  const handleClearFilters = () => {
    setContentType('all');
    setSortBy('relevance');
  };

  const hasActiveFilters = contentType !== 'all' || sortBy !== 'relevance';

  return (
    <PullToRefresh queryKeys={['personalizedFeed', 'feedContent']}>
      <div className="min-h-dvh p-4 md:p-8 pb-24 max-w-5xl mx-auto">
      {/* Header */}
      <motion.div 
        className="min-w-0 mb-6 mt-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex min-w-0 items-start gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => window.history.back()}
            className="rounded-full shrink-0"
            aria-label={t('personalized_feed.go_back_aria')}
          >
            <svg className="rtl:rotate-180" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </Button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-6 h-6 shrink-0" style={{ color: 'hsl(var(--primary))' }} />
              <div className="botanical-title-row"><h1 className="min-w-0 break-words text-2xl sm:text-3xl md:text-4xl font-semibold" style={{ color: 'hsl(var(--foreground))' }}>{t('personalized_feed.title')}</h1><BotanicalAccent variant="leaves" className="botanical-title-art" /></div>
            </div>
            <p className="mt-1" style={{ color: 'hsl(var(--foreground))' }}>{t('personalized_feed.subtitle')}</p>
          </div>
        </div>
      </motion.div>

      {/* Preferences */}
      <FeedPreferences onPreferencesChange={handlePreferencesChange} />

      {/* Filters */}
      <FeedFilters
        contentType={contentType}
        setContentType={setContentType}
        sortBy={sortBy}
        setSortBy={setSortBy}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={handleClearFilters}
      />

      {/* Feed Content */}
      <PersonalizedContentFeed
        userInterests={userInterests}
        contentType={contentType}
        sortBy={sortBy}
      />
      </div>
    </PullToRefresh>
  );
}