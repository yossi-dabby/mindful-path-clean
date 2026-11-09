import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { isPrivateAttachmentRef, resolvePrivateAttachment } from '@/lib/privateAttachments';

export function usePrivateAttachmentUrl(reference) {
  const { user, isAuthenticated } = useAuth();
  const userId = isAuthenticated ? user?.id : null;
  const [resolved, setResolved] = useState(null);
  useEffect(() => {
    let cancelled = false;
    let timer;
    setResolved(null);
    if (!isPrivateAttachmentRef(reference) || !userId) return undefined;
    async function refresh() {
      try {
        const data = await resolvePrivateAttachment(base44, reference);
        if (cancelled) return;
        setResolved({ reference, userId, url: data.file_url });
        timer = setTimeout(refresh, Math.max(30, (data.expires_in || 300) - 30) * 1000);
      } catch {
        if (!cancelled) setResolved(null);
      }
    }
    refresh();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [reference, userId]);
  if (!isPrivateAttachmentRef(reference)) return reference;
  // A previously resolved URL must not appear while another account is active.
  return resolved?.reference === reference && resolved?.userId === userId ? resolved.url : null;
}
