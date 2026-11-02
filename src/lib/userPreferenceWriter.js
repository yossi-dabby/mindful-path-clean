// Serialize preference patches and merge against the latest server profile.
// Each control owns only its patch, never a stale snapshot of other settings.
export function createPreferenceWriter(auth, cache) {
  let tail = Promise.resolve();
  return (patch, expectedUserId) => {
    const write = tail.catch(() => undefined).then(async () => {
      const user = await auth.me();
      if (!user || (expectedUserId && user.id !== expectedUserId)) throw new Error('Profile changed');
      const updated = await auth.updateMe({ preferences: { ...(user.preferences || {}), ...patch } });
      const preferences = updated?.preferences || { ...(user.preferences || {}), ...patch };
      try { cache?.(preferences); } catch { /* Storage availability must not invalidate a saved preference. */ }
      return updated;
    });
    tail = write;
    return write;
  };
}

