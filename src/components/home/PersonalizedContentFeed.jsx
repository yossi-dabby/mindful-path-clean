import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2, BookOpen, Dumbbell, TrendingUp, ExternalLink, Quote, Users, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { motion } from 'framer-motion';
import { normalizeFeedData, safeJoin, safeArray } from '@/components/utils/aiDataNormalizer';
import PullToRefresh from '@/components/utils/PullToRefresh';
import { getCurrentAppLocale } from '@/components/i18n/appLocale';

export default function PersonalizedContentFeed({ userInterests = [], contentType = 'all', sortBy = 'relevance' }) {
  const { t, i18n } = useTranslation();
  const appLocale = getCurrentAppLocale(i18n);
  const [feed, setFeed] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const { data: goals } = useQuery({
    queryKey: ['goals'],
    queryFn: () => base44.entities.Goal.filter({ status: 'active' }),
    initialData: []
  });

  const { data: moodEntries } = useQuery({
    queryKey: ['moodEntries'],
    queryFn: () => base44.entities.MoodEntry.list('-date', 10),
    initialData: []
  });

  const { data: journalEntries } = useQuery({
    queryKey: ['thoughtJournals'],
    queryFn: () => base44.entities.ThoughtJournal.list('-created_date', 10),
    initialData: []
  });

  const { data: exercises } = useQuery({
    queryKey: ['exercises'],
    queryFn: () => base44.entities.Exercise.list(),
    initialData: []
  });

  const { data: resources } = useQuery({
    queryKey: ['resources', appLocale],
    queryFn: () => base44.entities.Resource.filter(
      { language: appLocale, status: 'active' },
      '-publication_date',
      100
    ),
    initialData: []
  });

  const { data: communityPosts } = useQuery({
    queryKey: ['forumPosts'],
    queryFn: () => base44.entities.ForumPost.list('-created_date', 20),
    initialData: []
  });

  useEffect(() => {
    generateFeed();
  }, [goals, moodEntries, journalEntries, userInterests, resources, appLocale]);

  const generateFeed = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const stripHtml = (html) => {
        if (!html || typeof html !== 'string') return '';
        return html.replace(/<[^>]*>/g, '');
      };

      // Prepare context
      const goalsContext = goals.map(g => ({
        title: g.title,
        category: g.category,
        description: g.description
      }));

      const moodContext = moodEntries.map(m => ({
        mood: m.mood,
        emotions: safeJoin(m.emotions),
        triggers: safeJoin(m.triggers),
        activities: safeJoin(m.activities)
      }));

      const journalContext = journalEntries.map(e => ({
        emotions: safeJoin(e.emotions),
        distortions: safeJoin(e.cognitive_distortions),
        tags: safeJoin(e.tags)
      }));

      const exerciseCategories = [...new Set(exercises.map(e => e.category))];
      const resourceCategories = [...new Set(resources.map(r => r.category))];

      const interestsPrompt = userInterests.length > 0 
        ? `\n\n**USER INTERESTS:**\nThe user has specifically expressed interest in: ${userInterests.map(i => i.replace('_', ' ')).join(', ')}. Prioritize content that aligns with these interests.`
        : '';

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a mental wellness curator creating a personalized content feed for a user.

**USER CONTEXT:**
- Active Goals: ${JSON.stringify(goalsContext, null, 2)}
- Recent Moods (last 10): ${JSON.stringify(moodContext, null, 2)}
- Recent Journal Patterns: ${JSON.stringify(journalContext, null, 2)}${interestsPrompt}

**AVAILABLE CONTENT:**
- Exercise Categories: ${exerciseCategories.join(', ')}
- Resource Types Available: articles, meditations, practice scenarios, expert interviews, guides
- Resource Categories: ${resourceCategories.join(', ')}

Based on the user's current state, goals, mood patterns, journal themes, and selected interests, curate a personalized content feed with:

1. **Recommended Exercises** (3-5): Suggest specific exercise categories with personalized reasons why they'd help right now. Align with user interests when possible.
2. **Relevant Articles/Resources** (3-5): Suggest resource categories with topics that would be most helpful. Consider user's interests.
3. **Inspirational Quote**: One motivational, therapy-aligned quote relevant to their current journey
4. **Community Highlights** (2-3): Suggest what community topics they might find valuable
5. **Daily Focus**: A short, actionable suggestion for today (1-2 sentences)

Make it personal, warm, and encouraging. Reference their specific patterns and interests when possible.`,
        response_json_schema: {
          type: "object",
          properties: {
            recommended_exercises: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  category: { type: "string" },
                  title: { type: "string" },
                  reason: { type: "string" }
                }
              }
            },
            relevant_resources: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  category: { type: "string" },
                  topic: { type: "string" },
                  reason: { type: "string" }
                }
              }
            },
            inspirational_quote: {
              type: "object",
              properties: {
                text: { type: "string" },
                author: { type: "string" }
              }
            },
            community_highlights: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  topic: { type: "string" },
                  description: { type: "string" }
                }
              }
            },
            daily_focus: { type: "string" }
          }
        }
      });

      if (!response || !response.daily_focus) {
        throw new Error('Invalid response from AI - missing required fields');
      }
      
      // Normalize the feed data to ensure all arrays are valid
      const normalizedFeed = normalizeFeedData(response);
      setFeed(normalizedFeed);
    } catch (error) {
      console.error('Failed to generate feed:', error.message, error.stack);
      setError(error.message || 'Failed to generate personalized feed');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="border-0 shadow-lg">
        <CardContent className="p-8 text-center">
          <Loader2 className="w-8 h-8 text-purple-600 animate-spin mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">{t('tools_stage5.curating')}</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-0 shadow-lg border-2 border-red-200">
        <CardContent role="alert" className="p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
            <Sparkles className="w-6 h-6 text-red-600" />
          </div>
          <h3 className="font-semibold text-foreground mb-2">{t('tools_stage5.feed_error')}</h3>
          <p className="text-sm text-muted-foreground mb-4">{t('tools_stage5.load_error')}</p>
          <Button
            onClick={generateFeed}
            variant="outline"
            size="sm"
            className="text-primary border-border hover:bg-secondary"
           mobileLabelKey="refresh">
            <RefreshCw className="w-4 h-4 mr-2" />
            {t('tools_stage5.retry')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!feed) {
    return (
      <Card className="border-0 shadow-lg">
        <CardContent className="p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
            <Sparkles className="w-6 h-6 text-gray-400" />
          </div>
          <h3 className="font-semibold text-foreground mb-2">{t('tools_stage5.feed_empty')}</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {t('tools_stage5.feed_empty_description')}
          </p>
          <Button
            onClick={generateFeed}
            variant="outline"
            size="sm"
            className="text-primary border-border hover:bg-secondary"
           mobileLabelKey="refresh">
            <RefreshCw className="w-4 h-4 mr-2" />
            {t('tools_stage5.generate_feed')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Filter and sort based on user preferences
  // Match exercises by category from AI recommendations
  let filteredExercises = [];
  if (safeArray(feed.recommended_exercises).length > 0) {
    const recommendedCategories = safeArray(feed.recommended_exercises).map(rec => rec.category);
    filteredExercises = exercises.filter(ex => recommendedCategories.includes(ex.category));
  }

  // Match resources by category from AI recommendations
  let filteredResources = [];
  if (safeArray(feed.relevant_resources).length > 0) {
    const recommendedResourceCategories = safeArray(feed.relevant_resources).map(rec => rec.category);
    filteredResources = resources.filter(res => recommendedResourceCategories.includes(res.category));
  }

  let filteredPosts = communityPosts.filter(post => post.upvotes > 0);

  // Apply content type filter
  const showExercises = contentType === 'all' || contentType === 'exercises';
  const showResources = contentType === 'all' || contentType === 'resources';
  const showCommunity = contentType === 'all' || contentType === 'community';
  const showQuotes = contentType === 'all' || contentType === 'quotes';

  // Apply sorting
  if (sortBy === 'recent') {
    filteredExercises = filteredExercises.sort((a, b) => 
      new Date(b.created_date) - new Date(a.created_date)
    );
    filteredResources = filteredResources.sort((a, b) => 
      new Date(b.created_date) - new Date(a.created_date)
    );
  } else if (sortBy === 'popular') {
    filteredExercises = filteredExercises.sort((a, b) => 
      (b.completed_count || 0) - (a.completed_count || 0)
    );
    filteredPosts = filteredPosts.sort((a, b) => b.upvotes - a.upvotes);
  }

  const recommendedExercisesList = filteredExercises.slice(0, 5);
  const recommendedResourcesList = filteredResources.slice(0, 5);
  const highlightedPosts = filteredPosts.slice(0, 3);

  return (
    <PullToRefresh
      queryKeys={['goals', 'moodEntries', 'thoughtJournals', 'exercises', 'resources', 'forumPosts']}
      onRefresh={generateFeed}
    >
    <div className="space-y-4 min-w-0 [overflow-wrap:anywhere]">
      {/* Refresh Button */}
      <div className="flex justify-end mb-2">
        <Button
          onClick={generateFeed}
          variant="ghost"
          size="sm"
          className="text-foreground hover:text-primary"
         mobileLabelKey="refresh">
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {!((showExercises && safeArray(feed.recommended_exercises).length) || (showResources && safeArray(feed.relevant_resources).length) || (showCommunity && (safeArray(feed.community_highlights).length || highlightedPosts.length)) || (showQuotes && feed.inspirational_quote?.text)) && <p role="status" className="garden-surface p-6 text-foreground">{t('tools_stage5.no_matches')}</p>}
      {/* Daily Focus */}
      {feed.daily_focus && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border border-border/70 bg-card">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">{t('tools_stage5.focus')}</h3>
                  <p className="text-sm text-muted-foreground">{feed.daily_focus}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Inspirational Quote */}
      {showQuotes && feed.inspirational_quote && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border border-border/70 bg-card">
            <CardContent className="p-4">
              <Quote className="w-6 h-6 text-blue-400 mb-2" />
              <p className="text-muted-foreground italic mb-2">"{feed.inspirational_quote.text}"</p>
              <p className="text-sm text-muted-foreground">— {feed.inspirational_quote.author}</p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Recommended Exercises */}
      {showExercises && safeArray(feed.recommended_exercises).length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-0 shadow-md">
            <CardContent className="p-4">
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <Dumbbell className="w-5 h-5 text-green-600" />
                {t('tools_stage5.recommended')}
              </h3>
              <div className="space-y-3">
                {safeArray(feed.recommended_exercises).map((rec, i) => {
                  const exercise = recommendedExercisesList.find(ex => ex.category === rec.category);
                  return (
                    <div key={i} className="bg-secondary/50 p-3 rounded-lg border border-border">
                      <div className="flex items-start justify-between mb-1">
                        <div>
                          <p className="font-medium text-sm text-foreground">{rec.title}</p>
                          <Badge variant="outline" className="text-xs mt-1 capitalize">
                            {(rec.category || '').replace(/_/g, ' ')}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">{rec.reason}</p>
                      {exercise && (
                        <Link to={createPageUrl('Exercises')}>
                          <Button variant="ghost" size="sm" className="mt-2 text-primary hover:text-primary min-h-11 p-0">
                            {t('tools_stage5.try_exercise')}
                          </Button>
                        </Link>
                      )}
                    </div>
                  );
                })}
              </div>
              <Link to={createPageUrl('Exercises')}>
                <Button variant="outline" size="sm" className="w-full mt-3">
                  {t('tools_stage5.browse_exercises')}
                </Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Relevant Resources */}
      {showResources && safeArray(feed.relevant_resources).length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border-0 shadow-md">
            <CardContent className="p-4">
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-600" />
                {t('tools_stage5.articles_resources')}
              </h3>
              <div className="space-y-3">
                {safeArray(feed.relevant_resources).map((rec, i) => {
                  const resource = recommendedResourcesList.find(res => res.category === rec.category);
                  return (
                    <div key={i} className="bg-secondary/50 p-3 rounded-lg border border-border">
                      <div className="flex items-start justify-between mb-1">
                        <div>
                          <p className="font-medium text-sm text-foreground">{rec.topic}</p>
                          <Badge variant="outline" className="text-xs mt-1 capitalize">
                            {rec.category}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">{rec.reason}</p>
                      {resource && (
                        <a href={resource.url} target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="sm" className="mt-2 text-primary hover:text-primary min-h-11 p-0">
                            {t('tools_stage5.read_article')} <ExternalLink className="w-3 h-3 ml-1" />
                          </Button>
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
              <Link to={createPageUrl('Resources')}>
                <Button variant="outline" size="sm" className="w-full mt-3">
                  {t('tools_stage5.explore_resources')}
                </Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Community Highlights */}
      {showCommunity && (safeArray(feed.community_highlights).length > 0 || highlightedPosts.length > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="border-0 shadow-md">
            <CardContent className="p-4">
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                {t('tools_stage5.community_highlights')}
              </h3>
              <div className="space-y-3">
                {safeArray(feed.community_highlights).map((highlight, i) => (
                  <div key={i} className="bg-secondary/70 p-3 rounded-lg border border-border">
                    <p className="font-medium text-sm text-foreground mb-1">{highlight.topic}</p>
                    <p className="text-xs text-muted-foreground">{highlight.description}</p>
                  </div>
                ))}
              </div>
              {highlightedPosts.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs font-medium text-muted-foreground mb-2">{t('tools_stage5.popular_posts')}</p>
                  <div className="space-y-2">
                    {highlightedPosts.map((post) => (
                      <Link key={post.id} to={createPageUrl('Community')}>
                        <div className="bg-[hsl(var(--card)/0.97)] p-2 rounded border hover:border-border transition-colors">
                          <p className="text-xs text-muted-foreground line-clamp-2">{post.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="text-xs">{post.category}</Badge>
                            <span className="text-xs text-muted-foreground">↑ {post.upvotes}</span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
              <Link to={createPageUrl('Community')}>
                <Button variant="outline" size="sm" className="w-full mt-3">
                  {t('tools_stage5.join_community')}
                </Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
    </PullToRefresh>
  );
}