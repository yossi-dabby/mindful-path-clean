/**
 * Reusable Auth Error Banner Component
 * 
 * Shows when session expires with action to redirect to login.
 * Uses base44.auth.redirectToLogin() if available.
 * 
 * SAFETY: Standalone component, no impact on existing UI unless explicitly rendered.
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function AuthErrorBanner({ onDismiss }) {
  const handleSignIn = () => {
    try {
      // Use current path as nextUrl to return user to same page after login
      const currentPath = window.location.pathname + window.location.search;
      base44.auth.redirectToLogin(currentPath);
    } catch (error) {
      // Fallback: redirect to root login (if redirectToLogin fails)
      console.error('[AuthErrorBanner] redirectToLogin failed:', error);
      window.location.href = '/';
    }
  };

  return (
    <div 
      className="fixed top-4 left-1/2 -translate-x-1/2 max-w-md w-full mx-4"
      style={{ zIndex: 90 }}
      role="alert"
      aria-live="assertive"
    >
      <div 
        className="p-4 rounded-xl border-2 shadow-2xl flex items-start gap-3"
        style={{
          backgroundColor: 'rgba(254, 242, 242, 0.98)',
          borderColor: 'rgba(239, 68, 68, 0.4)',
          backdropFilter: 'blur(12px)'
        }}
      >
        <div className="w-10 h-10 flex items-center justify-center flex-shrink-0" style={{
          borderRadius: '12px',
          backgroundColor: 'rgba(239, 68, 68, 0.15)'
        }}>
          <AlertCircle className="w-5 h-5 text-red-600" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-900 mb-1">
            Session Expired
          </p>
          <p className="text-xs text-gray-700 mb-3">
            Your session has expired. Please sign in again to continue.
          </p>
          <div className="flex gap-2">
            <Button
              onClick={handleSignIn}
              size="sm"
              className="bg-red-600 hover:bg-red-700 text-white"
              style={{ borderRadius: '12px' }}
            >
              Sign In
            </Button>
            {onDismiss && (
              <Button
                onClick={onDismiss}
                size="sm"
                variant="outline"
                style={{ borderRadius: '12px' }}
              >
                Dismiss
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}