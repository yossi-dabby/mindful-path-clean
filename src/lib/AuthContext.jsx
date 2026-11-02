import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { AUTH_CHECK_TIMEOUT_MS, withTimeout } from '@/lib/promiseTimeout';
import { shouldRecoverAuthOnOnline } from '@/lib/authRecovery';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings] = useState(false); // No longer blocks render
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings] = useState(null);

  const checkAuth = useCallback(async function checkAuth(retryCount = 0) {
    try {
      setIsLoadingAuth(true);
      setAuthError(null);
      const currentUser = await withTimeout(
        base44.auth.me(),
        AUTH_CHECK_TIMEOUT_MS,
        'Authentication check timed out',
      );
      setUser(currentUser);
      setIsAuthenticated(true);
    } catch (error) {
      const status = error?.status || error?.response?.status;

      // Check user_not_registered BEFORE the generic 401/403 guard.
      if (error?.data?.extra_data?.reason === 'user_not_registered') {
        setIsAuthenticated(false);
        setAuthError({ type: 'user_not_registered', message: 'User not registered for this app' });
        setIsLoadingAuth(false);
        return;
      }

      // After OAuth (Google/social) redirect, the session cookie may not yet
      // be fully committed when checkAuth fires. Retry once after a short delay
      // before treating it as unauthenticated.
      if ((status === 401 || status === 403) && retryCount < 1) {
        await new Promise(resolve => setTimeout(resolve, 800));
        return checkAuth(retryCount + 1);
      }

      setIsAuthenticated(false);

      if (status === 401 || status === 403) {
        // Custom-auth app: do not invoke Base44's legacy hosted login here.
        // Once loading settles, ProtectedRoute renders the single in-app
        // /login route. Calling redirectToLogin would stack a second auth
        // flow on top of the custom Login page (especially in incognito).
        setIsLoadingAuth(false);
        return;
      }

      if (error?.code === 'PROMISE_TIMEOUT') {
        setAuthError({ type: 'auth_timeout', message: error.message });
        return;
      }

      setAuthError({ type: 'unknown', message: error.message || 'Failed to load app' });
    } finally {
      setIsLoadingAuth(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!shouldRecoverAuthOnOnline(authError)) return undefined;

    const retryWhenOnline = () => {
      if (window.navigator.onLine !== false) {
        checkAuth();
      }
    };

    window.addEventListener('online', retryWhenOnline);
    return () => window.removeEventListener('online', retryWhenOnline);
  }, [authError, checkAuth]);

  const logout = (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);
    if (shouldRedirect) {
      base44.auth.logout(window.location.href);
    } else {
      base44.auth.logout();
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      logout,
      checkAppState: checkAuth
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
