import { useCallback, useEffect, useRef, useState } from 'react';
import { createChatRefreshController, listenForChatRefresh } from '@/lib/chatRefreshController';

export function useChatRefresh({ scope, blocked, getScope, isBlocked, refresh }) {
  const latest = useRef({ getScope, isBlocked, refresh });
  latest.current = { getScope, isBlocked, refresh };
  const controller = useRef(null);
  const [state, setState] = useState({ refreshing: false, error: false });

  useEffect(() => {
    const instance = createChatRefreshController({
      getScope: () => latest.current.getScope(),
      isBlocked: () => document.hidden || latest.current.isBlocked(),
      refresh: (isCurrent) => latest.current.refresh(isCurrent),
      onStateChange: setState,
    });
    controller.current = instance;
    const unsubscribe = listenForChatRefresh(window, document, instance.schedule);
    return () => { unsubscribe(); instance.dispose(); };
  }, []);

  useEffect(() => { controller.current?.reset(); }, [scope]);
  useEffect(() => { if (!blocked) controller.current?.flush(); }, [blocked]);

  const requestRefresh = useCallback(() => controller.current?.request(), []);
  return { ...state, requestRefresh };
}
