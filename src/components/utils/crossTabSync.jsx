/**
 * Cross-Tab Synchronization Utility
 * 
 * Provides mechanisms for synchronizing state across multiple browser tabs/windows
 * using BroadcastChannel (modern browsers) with localStorage fallback.
 * 
 * SAFETY: Additive utility, no modifications to existing code required.
 */

// Check BroadcastChannel support
const hasBroadcastChannel = typeof BroadcastChannel !== 'undefined';

// Create singleton channel
let broadcastChannel = null;
if (hasBroadcastChannel) {
  try {
    broadcastChannel = new BroadcastChannel('app-sync');
  } catch (e) {
    console.warn('[CrossTabSync] BroadcastChannel creation failed:', e);
  }
}

// Storage key for fallback mechanism
const STORAGE_KEY = 'app-sync-message';

/**
 * Emit an invalidation event across all tabs
 * @param {string[]} queryKeys - React Query keys to invalidate
 */
export function emitInvalidation(queryKeys) {
  if (!Array.isArray(queryKeys) || queryKeys.length === 0) {
    console.warn('[CrossTabSync] Invalid queryKeys:', queryKeys);
    return;
  }

  const message = {
    type: 'INVALIDATE',
    queryKeys,
    timestamp: Date.now()
  };

  // Try BroadcastChannel first
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage(message);
    } catch (e) {
      console.warn('[CrossTabSync] BroadcastChannel send failed:', e);
    }
  }

  // Always use localStorage as fallback/redundancy
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(message));
    // Clear after brief delay to avoid multiple reads
    setTimeout(() => {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (e) {
        // Ignore cleanup errors
      }
    }, 100);
  } catch (e) {
    console.warn('[CrossTabSync] localStorage fallback failed:', e);
  }
}

/**
 * Listen for invalidation events from other tabs
 * @param {Function} callback - Called with {queryKeys: string[]} when event received
 * @returns {Function} cleanup function
 */
export function listenForInvalidations(callback) {
  if (typeof callback !== 'function') {
    throw new Error('[CrossTabSync] Callback must be a function');
  }

  const listeners = [];

  // BroadcastChannel listener
  if (broadcastChannel) {
    const bcHandler = (event) => {
      if (event.data?.type === 'INVALIDATE' && Array.isArray(event.data.queryKeys)) {
        callback({ queryKeys: event.data.queryKeys });
      }
    };
    broadcastChannel.addEventListener('message', bcHandler);
    listeners.push(() => broadcastChannel.removeEventListener('message', bcHandler));
  }

  // localStorage listener (fallback)
  const storageHandler = (event) => {
    if (event.key === STORAGE_KEY && event.newValue) {
      try {
        const message = JSON.parse(event.newValue);
        if (message.type === 'INVALIDATE' && Array.isArray(message.queryKeys)) {
          callback({ queryKeys: message.queryKeys });
        }
      } catch (e) {
        console.warn('[CrossTabSync] Failed to parse storage event:', e);
      }
    }
  };
  window.addEventListener('storage', storageHandler);
  listeners.push(() => window.removeEventListener('storage', storageHandler));

  // Return cleanup function
  return () => {
    listeners.forEach(cleanup => cleanup());
  };
}

/**
 * Emit entity change event (create/update/delete)
 * Convenience wrapper for entity-specific invalidations
 */
export function emitEntityChange(entityName, operation) {
  const queryKeys = [
    [entityName],
    [`${entityName}s`],
    [`all${entityName}s`]
  ];
  emitInvalidation(queryKeys);
}