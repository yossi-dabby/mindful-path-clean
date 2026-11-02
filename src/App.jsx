import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import RouteMetadata from '@/components/seo/RouteMetadata'
import AccessibilityManager from '@/components/accessibility/AccessibilityManager'
import AndroidNativeBridge from '@/components/native/AndroidNativeBridge'
import IOSNativeBridge from '@/components/native/IOSNativeBridge'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import KnowledgeStudio from './pages/KnowledgeStudio';
import AdminFeatureFlags from './pages/AdminFeatureFlags';
import TherapistTraining from './pages/TherapistTraining';
import PdfViewer from './pages/PdfViewer';
import About from './pages/About';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import Contact from './pages/Contact';
import AccountDeletion from './pages/AccountDeletion';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { ThemeProvider } from 'next-themes';
import { useTranslation } from 'react-i18next';
import React, { Suspense } from 'react';

/** Fallback shown while a lazy-loaded page chunk is being fetched.
 *  Matches the auth-loading spinner style to avoid a jarring flash. */
const PageLoadingFallback = () => { const {t}=useTranslation();return (
  <div
    role="status"
    aria-live="polite"
    aria-label={t('stage6.loading')}
    className="fixed inset-0 flex items-center justify-center"
    style={{ background: 'rgb(var(--bg, 248 248 246))' }}
  >
    <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" aria-hidden="true" />
  </div>
);};

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

// z-index for the auth loading overlay — must sit above all other layers
// (BottomNav: 35, MobileHeader: 40, DraggableAiCompanion: 40, pull-to-refresh: 50)
const AUTH_OVERLAY_Z_INDEX = 9999;

const StartupErrorScreen = ({ message, onRetry }) => {
  const {t,i18n}=useTranslation();

  return (
    <main
      role="alert"
      dir={i18n.dir()}
      data-testid="startup-error-screen"
      className="min-h-screen min-h-dvh flex items-center justify-center p-6 bg-background text-foreground"
    >
      <section className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
        <h1 className="text-xl font-semibold">{t('stage6.startup_title')}</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{t('stage6.startup_body')}</p>
        {message && (
          <p className="mt-3 break-words rounded-lg bg-secondary p-3 text-xs text-muted-foreground" data-testid="startup-error-detail">
            {message}
          </p>
        )}
        <button
          type="button"
          onClick={onRetry}
          className="mt-5 min-h-11 rounded-xl bg-teal-700 px-5 py-2.5 font-medium text-white"
        >
          {t('stage6.retry')}
        </button>
      </section>
    </main>
  );
};

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const {t}=useTranslation();
  const { isLoadingAuth, isLoadingPublicSettings, authError, checkAppState } = useAuth();

  // Only render the explicit "not registered" error screen here. All other
  // unauthenticated states are handled by the ProtectedRoute layout route
  // below, which navigates to /login.
  if (!isLoadingPublicSettings && !isLoadingAuth && authError?.type === 'user_not_registered') {
    return <UserNotRegisteredError />;
  }

  if (!isLoadingPublicSettings && !isLoadingAuth && authError) {
    return <StartupErrorScreen message={authError.message} onRetry={() => checkAppState()} />;
  }

  // Always render the main app routes so that the Layout shell (including
  // #app-scroll-container and navigation buttons) is present in the DOM from
  // the very first render.  This ensures E2E tests that query for buttons or
  // the scroll container work correctly even before auth finishes loading.
  // During the auth check a full-screen overlay is shown on top of the routes.
  return (
    <>
      {/* Loading overlay — shown while auth / public-settings are being fetched.
          pointer-events: none lets underlying DOM elements still receive events
          (needed for touch-event E2E tests), while the backdrop visually hides
          the partially-loaded content from the user.
          aria-hidden keeps screen readers focused on the overlay message only. */}
      {(isLoadingPublicSettings || isLoadingAuth) && (
        <div
          role="status"
          aria-live="polite"
          aria-label={t('stage6.loading')}
          className="fixed inset-0 flex items-center justify-center"
          style={{ zIndex: AUTH_OVERLAY_Z_INDEX, background: 'rgb(var(--bg, 248 248 246))', pointerEvents: 'none' }}
        >
          <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" aria-hidden="true" />
        </div>
      )}
      <Suspense fallback={<PageLoadingFallback />}>
        <Routes>
          {/* Every app route is gated by ProtectedRoute: unauthenticated users
              are redirected to /login instead of hitting an external firewall. */}
          <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
            <Route path="/" element={
              <LayoutWrapper currentPageName={mainPageKey}>
                <MainPage />
              </LayoutWrapper>
            } />
            {Object.entries(Pages).map(([path, Page]) => (
              <Route
                key={path}
                path={`/${path}`}
                element={
                  <LayoutWrapper currentPageName={path}>
                    <Page />
                  </LayoutWrapper>
                }
              />
            ))}
            <Route path="/KnowledgeStudio" element={<LayoutWrapper currentPageName="KnowledgeStudio"><KnowledgeStudio /></LayoutWrapper>} />
            <Route path="/AdminFeatureFlags" element={<LayoutWrapper currentPageName="AdminFeatureFlags"><AdminFeatureFlags /></LayoutWrapper>} />
            <Route path="/TherapistTraining" element={<LayoutWrapper currentPageName="TherapistTraining"><TherapistTraining /></LayoutWrapper>} />
            <Route path="/pdf-viewer" element={<PdfViewer />} />
            <Route path="*" element={<PageNotFound />} />
          </Route>
        </Routes>
      </Suspense>
    </>
  );
};

const ProtectedApp = () => (
  <AuthProvider>
    <NavigationTracker />
    <AuthenticatedApp />
  </AuthProvider>
);


function App() {

  React.useEffect(() => {
    window.__MINDFUL_PATH_MARK_MOUNTED__?.();
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem storageKey="theme">
      <QueryClientProvider client={queryClientInstance}>
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <RouteMetadata />
          <AccessibilityManager />
          <AndroidNativeBridge />
          <IOSNativeBridge />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/about" element={<About />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/account-deletion" element={<AccountDeletion />} />
            <Route path="/data-deletion" element={<AccountDeletion defaultSection="data" />} />
            <Route path="/*" element={<ProtectedApp />} />
          </Routes>
        </Router>
        <Toaster />
      </QueryClientProvider>
    </ThemeProvider>
  )
}

export default App
