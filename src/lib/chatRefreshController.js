// Coalesce lifecycle events, defer while the composer is busy, and reject reads
// from an old conversation/send. This controller never reloads or writes data.
export function createChatRefreshController({ getScope, isBlocked, refresh, onStateChange }) {
  let generation = 0;
  let active = null;
  let pending = false;
  let timer = null;
  let disposed = false;

  const request = () => {
    if (disposed) return Promise.resolve();
    if (isBlocked()) {
      pending = true;
      return Promise.resolve();
    }
    const scope = getScope();
    if (active?.scope === scope) return active.promise;
    pending = false;
    clearTimeout(timer);
    const version = ++generation;
    let interrupted = false;
    const isCurrent = () => {
      const current = !disposed && version === generation && scope === getScope() && !isBlocked();
      if (!current) interrupted = true;
      return current;
    };
    const job = { scope, promise: null };
    active = job;
    onStateChange({ refreshing: true, error: false });
    job.promise = Promise.resolve()
      .then(() => isCurrent() ? refresh(isCurrent) : undefined)
      .then(() => {
        if (isCurrent()) onStateChange({ refreshing: false, error: false });
      })
      .catch(() => {
        if (isCurrent()) onStateChange({ refreshing: false, error: true });
      })
      .finally(() => {
        if (active !== job) return;
        active = null;
        if (!disposed && (!isCurrent() || interrupted)) {
          onStateChange({ refreshing: false, error: false });
          pending = true;
        }
        if (pending && !disposed && !isBlocked()) schedule();
      });
    return job.promise;
  };

  const schedule = () => {
    if (disposed) return;
    pending = true;
    clearTimeout(timer);
    timer = setTimeout(request, 200);
  };

  return {
    request,
    schedule,
    flush: () => { if (pending && !isBlocked()) schedule(); },
    reset: () => {
      ++generation;
      active = null;
      pending = false;
      clearTimeout(timer);
      onStateChange({ refreshing: false, error: false });
    },
    dispose: () => {
      disposed = true;
      ++generation;
      clearTimeout(timer);
    },
  };
}

export function listenForChatRefresh(windowTarget, documentTarget, request) {
  const resume = () => { if (!documentTarget.hidden) request(); };
  const resumeNative = (event) => { if (event.detail?.isActive === true) resume(); };
  windowTarget.addEventListener('mindfulpath:native-app-state', resumeNative);
  documentTarget.addEventListener('visibilitychange', resume);
  windowTarget.addEventListener('focus', resume);
  windowTarget.addEventListener('online', resume);
  return () => {
    windowTarget.removeEventListener('mindfulpath:native-app-state', resumeNative);
    documentTarget.removeEventListener('visibilitychange', resume);
    windowTarget.removeEventListener('focus', resume);
    windowTarget.removeEventListener('online', resume);
  };
}
