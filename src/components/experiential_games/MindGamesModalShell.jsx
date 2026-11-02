import React from 'react';

/**
 * Shared styling shell for all Mind Games modals
 * Ensures consistent mint/teal theme across all mini-games
 * Handles mobile-safe sizing and scrolling automatically
 * Prevents text overflow on mobile
 */
export default function MindGamesModalShell({ children, title }) {
  return (
    <div className="space-y-4 w-full min-w-0">
      {title && (
        <h2 className="text-xl font-semibold mb-4 break-words" style={{ color: 'hsl(var(--foreground))' }}>
          {title}
        </h2>
      )}
      <div className="space-y-4 w-full min-w-0">
        {children}
      </div>
    </div>
  );
}