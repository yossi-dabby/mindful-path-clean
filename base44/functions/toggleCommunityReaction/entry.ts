import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const TARGETS = {
  forum_post: 'ForumPost',
  shared_progress: 'SharedProgress'
};

const json = (body, status = 200) => Response.json(body, { status });

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405);

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user?.email) return json({ error: 'UNAUTHORIZED' }, 401);

    const { target_type, target_id } = await req.json();
    const entityName = TARGETS[target_type];
    if (!entityName || typeof target_id !== 'string' || !target_id.trim()) {
      return json({ error: 'INVALID_TARGET' }, 400);
    }

    const target = await base44.asServiceRole.entities[entityName].get(target_id);
    if (!target) return json({ error: 'TARGET_NOT_FOUND' }, 404);

    const ownReactions = await base44.entities.CommunityReaction.filter({
      target_type,
      target_id
    });

    let reacted;
    if (ownReactions.length > 0) {
      await Promise.all(ownReactions.map((reaction) =>
        base44.entities.CommunityReaction.delete(reaction.id)
      ));
      reacted = false;
    } else {
      await base44.entities.CommunityReaction.create({ target_type, target_id });
      reacted = true;
    }

    const allReactions = await base44.asServiceRole.entities.CommunityReaction.filter({
      target_type,
      target_id
    });
    const count = allReactions.length;
    await base44.asServiceRole.entities[entityName].update(target_id, { upvotes: count });

    return json({ reacted, count });
  } catch (error) {
    console.error('[toggleCommunityReaction]', error?.message || error);
    return json({ error: 'REACTION_FAILED' }, 500);
  }
});
