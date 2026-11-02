import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, Lock, MessageSquare, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { groupCategoryKey } from './communityFormatters';

function GroupCard({ group, isMember, onJoin, isJoining }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  return (
    <Card data-testid={`community-group-${group.id}`} className="overflow-hidden border border-border/80 bg-[hsl(var(--card)/0.94)] shadow-[var(--shadow-sm)] transition-shadow hover:shadow-[var(--shadow-md)]">
      <CardContent className="p-4 sm:p-5">
        <article className="flex min-w-0 flex-col gap-4 sm:flex-row">
          {group.image_url ? (
            <img src={group.image_url} alt="" loading="lazy" className="h-20 w-full rounded-xl object-cover sm:h-16 sm:w-16" />
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-primary shadow-[var(--shadow-sm)]" aria-hidden="true">
              <Users className="h-8 w-8 text-white" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex min-w-0 items-start gap-2">
              <div className="min-w-0 flex-1">
                <h2 className="break-words text-base font-semibold leading-snug text-foreground sm:text-lg">{group.name}</h2>
                <p className="mt-1 break-words text-sm leading-relaxed text-muted-foreground">{group.description}</p>
              </div>
              {group.is_private && <Lock className="h-5 w-5 shrink-0 text-muted-foreground" aria-label={t('community_ui.card.private')} />}
            </div>
            <div className="mb-3 flex flex-wrap gap-2">
              <Badge variant="outline">{t(groupCategoryKey(group.category))}</Badge>
              {group.is_private && <Badge variant="secondary">{t('community_ui.card.private')}</Badge>}
            </div>
            {expanded && (
              <div className="mb-3 rounded-xl border border-border/70 bg-secondary/40 p-3">
                <h3 className="mb-1 text-sm font-semibold text-foreground">{t('community_ui.card.guidelines')}</h3>
                <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">{group.guidelines || t('community_ui.card.no_guidelines')}</p>
              </div>
            )}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><Users className="h-4 w-4" />{t('community_ui.card.members', { count: group.member_count || 0 })}</span>
                <span className="flex items-center gap-1"><MessageSquare className="h-4 w-4" />{t('community_ui.card.posts', { count: group.post_count || 0 })}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" className="min-h-[44px]" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded}>
                  {expanded ? <ChevronUp className="me-1 h-4 w-4" /> : <ChevronDown className="me-1 h-4 w-4" />}
                  {t(expanded ? 'community_ui.card.show_less' : 'community_ui.card.show_more')}
                </Button>
                {isMember ? (
                  <Badge className="flex min-h-[44px] items-center bg-emerald-100 px-3 text-emerald-800">{t('community_ui.card.joined')}</Badge>
                ) : (
                  <Button type="button" size="sm" className="min-h-[44px] bg-primary" onClick={() => onJoin(group)} disabled={isJoining || group.is_private}>
                    {isJoining && <Loader2 className="me-1 h-4 w-4 animate-spin" />}
                    {t(isJoining ? 'community_ui.card.joining' : group.is_private ? 'community_ui.card.private' : 'community_ui.card.join')}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </article>
      </CardContent>
    </Card>
  );
}

export default React.memo(GroupCard);
