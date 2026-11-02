import React, { createContext, useContext, useReducer, useEffect, useRef, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getScrollContainer } from '@/lib/scrollContainer';

const TabNavigationContext = createContext();

export function useTabNavigation() {
  return useContext(TabNavigationContext);
}

// Define root pages for each tab
const TAB_ROOTS = {
  Home: 'Home',
  Chat: 'Chat',
  MyPath: 'MyPath',
  Journal: 'Journal',
  Tools: 'Tools',
};

// Pages that belong to specific tabs
const TAB_MAPPING = {
  MoodTracker: 'Home',
  ThoughtCoach: 'Chat',
  Coach: 'Chat',
  GoalCoach: 'Chat',
  StarterPath: 'MyPath',
  Goals: 'MyPath',
  Progress: 'MyPath',
  PersonalizedFeed: 'MyPath',
  AdvancedAnalytics: 'MyPath',
  Exercises: 'Tools',
  ExerciseView: 'Tools',
  TherapeuticForms: 'Tools',
  Videos: 'Tools',
  VideoPlayer: 'Tools',
  Playlists: 'Tools',
  PlaylistDetail: 'Tools',
  Journeys: 'Tools',
  ExperientialGames: 'Tools',
  Resources: 'Tools',
  Community: null,
  Settings: null,
};

function getTabForPage(pageName) {
  if (!pageName) return null;
  if (TAB_ROOTS[pageName]) return pageName;
  return TAB_MAPPING[pageName] ?? null;
}

// ─── Reducer ────────────────────────────────────────────────────────────────
// Using useReducer batches all state mutations into a single re-render,
// avoiding the double-render caused by separate setActiveTab + setTabStacks.

const buildInitialStacks = () =>
  Object.fromEntries(
    Object.keys(TAB_ROOTS).map((tab) => [tab, [{ path: `/${tab}`, pageName: tab }]])
  );

const initialState = {
  activeTab: 'Home',
  tabStacks: buildInitialStacks(),
};

function tabReducer(state, action) {
  switch (action.type) {
    case 'SET_ACTIVE_TAB':
      if (state.activeTab === action.tab) return state;
      return { ...state, activeTab: action.tab };

    case 'SWITCH_TAB': {
      const { tab, resetStack, rootPath, rootPageName } = action;
      const tabStacks = resetStack
        ? { ...state.tabStacks, [tab]: [{ path: rootPath, pageName: rootPageName }] }
        : state.tabStacks;
      return { activeTab: tab, tabStacks };
    }

    case 'PUSH_PAGE': {
      const { tab, path, pageName } = action;
      const stack = state.tabStacks[tab] || [{ path: `/${TAB_ROOTS[tab] || tab}`, pageName: TAB_ROOTS[tab] || tab }];
      if (stack[stack.length - 1]?.path === path) return state; // already top
      return {
        ...state,
        tabStacks: { ...state.tabStacks, [tab]: [...stack, { path, pageName }] },
      };
    }

    case 'POP_PAGE': {
      const stack = state.tabStacks[action.tab] || [];
      if (stack.length <= 1) return state;
      return {
        ...state,
        tabStacks: { ...state.tabStacks, [action.tab]: stack.slice(0, -1) },
      };
    }

    default:
      return state;
  }
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function TabNavigationProvider({ children, currentPageName }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [{ activeTab, tabStacks }, dispatch] = useReducer(tabReducer, initialState);

  // Counter-based flag: increment before each programmatic navigate,
  // decrement in the tracking effect. Avoids the race where a second
  // navigation clears a boolean flag before the first effect has consumed it.
  const navFlagRef = useRef(0);

  // ── Sync activeTab when location changes externally (deep-link, etc.) ──
  useEffect(() => {
    const currentTab = getTabForPage(currentPageName);
    if (currentTab && currentTab !== activeTab) {
      dispatch({ type: 'SET_ACTIVE_TAB', tab: currentTab });
    }
  }, [currentPageName, activeTab]);

  // ── Track in-tab push/pop from user navigations ──────────────────────────
  useEffect(() => {
    if (navFlagRef.current > 0) {
      navFlagRef.current -= 1;
      return; // our own programmatic navigation — skip
    }

    const currentTab = getTabForPage(currentPageName);
    if (!currentTab) return;

    const currentPath = location.pathname + location.search;
    const stack = tabStacks[currentTab] || [{ path: `/${TAB_ROOTS[currentTab]}`, pageName: TAB_ROOTS[currentTab] }];
    const top = stack[stack.length - 1];

    if (top?.path === currentPath) return; // already at top — no-op

    // Detect OS/browser back: new location matches second-to-top → pop
    if (stack.length > 1 && stack[stack.length - 2]?.path === currentPath) {
      dispatch({ type: 'POP_PAGE', tab: currentTab });
    } else {
      dispatch({ type: 'PUSH_PAGE', tab: currentTab, path: currentPath, pageName: currentPageName });
    }
  }, [location.pathname, location.search, currentPageName]);

  // ── Switch tab ────────────────────────────────────────────────────────────
  const switchToTab = useCallback((tabName) => {
    if (!TAB_ROOTS[tabName]) return;
    // Read the browser URL at interaction time. Rapid tab taps can happen
    // before React commits the render carrying the latest location, so the
    // callback closure may otherwise compare against a stale path.
    const currentPath = window.location.pathname + window.location.search;

    if (tabName === activeTab) {
      // Re-tapping the active tab: reset its stack to root and scroll to top.
      const rootPage = TAB_ROOTS[tabName];
      if (!rootPage) return;
      const rootPath = `/${rootPage}`;

      dispatch({ type: 'SWITCH_TAB', tab: tabName, resetStack: true, rootPath, rootPageName: rootPage });

      if (currentPath !== rootPath) {
        navFlagRef.current += 1;
        navigate(rootPath, { replace: true });
      }
      getScrollContainer().scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      // Switching to a different tab: restore its last known position.
      const targetStack = tabStacks[tabName];
      const targetPath = targetStack?.length
        ? targetStack[targetStack.length - 1].path
        : `/${TAB_ROOTS[tabName] || tabName}`;

      // Dispatch first so activeTab is correct before navigate fires.
      dispatch({ type: 'SWITCH_TAB', tab: tabName, resetStack: false });

      if (currentPath !== targetPath) {
        navFlagRef.current += 1;
        navigate(targetPath, { replace: true });
      }
      // Jump scroll to top instantly when switching tabs (no animation —
      // content is for a completely different tab).
      getScrollContainer().scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [activeTab, tabStacks, location.pathname, location.search, navigate]);

  // ── Back navigation ───────────────────────────────────────────────────────
  // Delegate to browser history so the iOS swipe-back gesture and Android
  // hardware-back button both work correctly. The tracking effect above
  // automatically pops our in-memory stack when the location changes.
  const goBackInTab = useCallback(() => {
    if ((tabStacks[activeTab]?.length || 0) > 1) {
      navigate(-1);
      return true;
    }
    return false;
  }, [activeTab, tabStacks, navigate]);

  const canGoBack = useCallback(
    () => (tabStacks[activeTab]?.length || 0) > 1,
    [activeTab, tabStacks]
  );

  // ── Stable context value ──────────────────────────────────────────────────
  const value = useMemo(() => ({
    activeTab,
    tabStacks,
    switchToTab,
    goBackInTab,
    canGoBack,
    currentPageName,
  }), [activeTab, tabStacks, switchToTab, goBackInTab, canGoBack, currentPageName]);

  return (
    <TabNavigationContext.Provider value={value}>
      {children}
    </TabNavigationContext.Provider>
  );
}