import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessageCircle, ThumbsUp, Pin, User, Shield, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatCommunityTime, forumCategoryKey } from './communityFormatters';

function ForumPostCard({ post, onUpvote, onModerate, isUpvoting, isReacted }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const author = post.is_anonymous
    ? t('community_ui.card.anonymous')
    : (post.author_display_name || t('community_ui.card.anonymous'));

  return (
    <Card data-testid={`forum-post-${post.id}`} className="overflow-hidden border border-border/80 bg-[hsl(var(--card)/0.94)] shadow-[var(--shadow-sm)] transition-shadow hover:shadow-[var(--shadow-md)]">
      <CardContent className="p-4 sm:p-5">
        <article className="flex min-w-0 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary shadow-[var(--shadow-sm)]" aria-hidden="true">
            <User className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex items-start gap-2">
              {post.pinned && <Pin className="mt-1 h-4 w-4 shrink-0 text-amber-600" aria-label={t('community_ui.card.pinned')} />}
              <h2 className="min-w-0 break-words text-base font-semibold leading-snug text-foreground sm:text-lg">{post.title}</h2>
            </div>
            <p className={`mb-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground ${expanded ? '' : 'line-clamp-3'}`}>{post.content}</p>
            {(post.content?.length || 0) > 180 && (
              <Button type="button" variant="ghost" size="sm" className="mb-2 min-h-[44px] px-2 text-primary" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded}>
                {expanded ? <ChevronUp className="me-1 h-4 w-4" /> : <ChevronDown className="me-1 h-4 w-4" />}
                {t(expanded ? 'community_ui.card.show_less' : 'community_ui.card.show_more')}
              </Button>
            )}
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge variant="outline">{t(forumCategoryKey(post.category))}</Badge>
              {post.tags?.slice(0, 5).map((tag) => <Badge key={tag} variant="secondary" className="max-w-full truncate">{tag}</Badge>)}
              {post.is_anonymous && <Badge variant="outline">{t('community_ui.card.anonymous')}</Badge>}
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <span className="flex min-w-0 items-center gap-1"><User className="h-4 w-4 shrink-0" /><span className="truncate">{author}</span></span>
              <time dateTime={post.created_date}>{formatCommunityTime(post.created_date, t)}</time>
              <Button
                type="button"
                variant={isReacted ? 'secondary' : 'ghost'}
                size="sm"
                className="min-h-[44px] min-w-[44px] px-2"
                onClick={() => onUpvote(post)}
                disabled={isUpvoting}
                aria-pressed={Boolean(isReacted)}
                aria-label={t(isReacted ? 'community_ui.card.remove_upvote' : 'community_ui.card.upvote')}
               mobileLabel={t(isReacted ? 'community_ui.card.remove_upvote' : 'community_ui.card.upvote')}>
                {isUpvoting ? <Loader2 className="me-1 h-4 w-4 animate-spin" /> : <ThumbsUp className={`me-1 h-4 w-4 ${isReacted ? 'fill-current' : ''}`} />}
                {post.upvotes || 0}
              </Button>
              <span className="flex items-center gap-1" aria-label={t('community_ui.card.comments', { count: post.comment_count || 0 })}>
                <MessageCircle className="h-4 w-4" />{post.comment_count || 0}
              </span>
              {onModerate && (
                <Button type="button" variant="ghost" size="sm" className="min-h-[44px] px-2 text-amber-700" onClick={() => onModerate(post)}>
                  <Shield className="me-1 h-4 w-4" />{t('community_ui.card.moderate')}
                </Button>
              )}
            </div>
          </div>
        </article>
      </CardContent>
    </Card>
  );
}

export default React.memo(ForumPostCard);
