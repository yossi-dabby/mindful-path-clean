// Stop automatic record deletion when it could discard an unmanaged upload's
// only reference. An operator must inventory it with Customer Care first.
const attachmentKeys = new Set(['attachments', 'images', 'audio_notes', 'file_uri', 'file_url', 'file_urls', 'audio_url', 'image_url']);
function unmanaged(value) {
  if (!value) return false;
  if (typeof value === 'string') return !value.startsWith('mp-private:');
  if (Array.isArray(value)) return value.some(unmanaged);
  if (typeof value === 'object') {
    if (typeof value.file_ref === 'string' && /^mp-private:[a-f0-9]{24}$/i.test(value.file_ref)) return false;
    return Object.values(value).some(unmanaged);
  }
  return false;
}
export function hasUnmanagedAttachments(value) {
  if (!value || typeof value !== 'object') return false;
  return Object.entries(value).some(([key, item]) => attachmentKeys.has(key) ? unmanaged(item) : hasUnmanagedAttachments(item));
}
export async function checkLegacyReferences(client, entityNames, email) {
  for (const entityName of entityNames) {
    for (let offset = 0; offset <= 100000; offset += 100) {
      const rows = await client.asServiceRole.entities[entityName].filter({ created_by: email }, 'created_date', 100, offset);
      if (!Array.isArray(rows) || rows.some(row => row.created_by !== email || hasUnmanagedAttachments(row))) throw new Error('Manual file inventory required');
      if (rows.length < 100) break;
      if (offset === 100000) throw new Error('Manual file inventory required');
    }
  }
}
