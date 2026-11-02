import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const json = (body, status = 200) => Response.json(body, { status });

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405);

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user?.email) return json({ error: 'UNAUTHORIZED' }, 401);

    const { group_id } = await req.json();
    if (typeof group_id !== 'string' || !group_id.trim()) {
      return json({ error: 'INVALID_GROUP' }, 400);
    }

    const group = await base44.asServiceRole.entities.CommunityGroup.get(group_id);
    if (!group) return json({ error: 'GROUP_NOT_FOUND' }, 404);
    if (group.is_private) {
      return json({ error: 'PRIVATE_GROUP_REQUIRES_APPROVAL' }, 409);
    }

    const existing = await base44.entities.GroupMembership.filter({ group_id });
    let membership = existing[0];
    if (!membership) {
      membership = await base44.entities.GroupMembership.create({
        group_id,
        role: 'member',
        joined_date: new Date().toISOString()
      });
    }

    const members = await base44.asServiceRole.entities.GroupMembership.filter({ group_id });
    const member_count = members.length;
    await base44.asServiceRole.entities.CommunityGroup.update(group_id, { member_count });

    return json({ joined: true, member_count, membership_id: membership.id });
  } catch (error) {
    console.error('[joinCommunityGroup]', error?.message || error);
    return json({ error: 'JOIN_FAILED' }, 500);
  }
});
