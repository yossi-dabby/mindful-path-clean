/**
 * React Hook for Cross-Tab Query Invalidation
 * 
 * Automatically invalidates React Query caches when changes occur in other tabs.
 * 
 * SAFETY: Additive hook, opt-in usage per component.
 */

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { listenForInvalidations } from './crossTabSync';

/**
 * Hook to enable cross-tab query invalidation
 * @param {boolean} enabled - Whether to enable cross-tab sync (default: true)
 */
export function useCrossTabInvalidation(enabled = true) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;

    const cleanup = listenForInvalidations(({ queryKeys }) => {
      // Invalidate each query key separately to avoid over-invalidation
      queryKeys.forEach(key => {
        queryClient.invalidateQueries({ queryKey: key });
      });
    });

    return cleanup;
  }, [enabled, queryClient]);
}