/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import { lazy } from 'react';
import __Layout from './Layout.jsx';
import MoodTracker from './pages/MoodTracker';
const MyPath = lazy(() => import('./pages/MyPath'));

const AdvancedAnalytics = lazy(() => import('./pages/AdvancedAnalytics'));
const Chat = lazy(() => import('./pages/Chat'));
const Coach = lazy(() => import('./pages/Coach'));
const CoachingAnalytics = lazy(() => import('./pages/CoachingAnalytics'));
const Community = lazy(() => import('./pages/Community'));
const CrisisAlerts = lazy(() => import('./pages/CrisisAlerts'));
const ExerciseView = lazy(() => import('./pages/ExerciseView'));
const Exercises = lazy(() => import('./pages/Exercises'));
const ExperientialGames = lazy(() => import('./pages/ExperientialGames'));
const GoalCoach = lazy(() => import('./pages/GoalCoach'));
const Goals = lazy(() => import('./pages/Goals'));
const Home = lazy(() => import('./pages/Home'));
const Journal = lazy(() => import('./pages/Journal'));
const JournalDashboard = lazy(() => import('./pages/JournalDashboard'));
const Journeys = lazy(() => import('./pages/Journeys'));
const PersonalizedFeed = lazy(() => import('./pages/PersonalizedFeed'));
const PlaylistDetail = lazy(() => import('./pages/PlaylistDetail'));
const Playlists = lazy(() => import('./pages/Playlists'));
const Progress = lazy(() => import('./pages/Progress'));
const Resources = lazy(() => import('./pages/Resources'));
const Settings = lazy(() => import('./pages/Settings'));
const StarterPath = lazy(() => import('./pages/StarterPath'));
const TestSetupGuide = lazy(() => import('./pages/TestSetupGuide'));
const ThoughtCoach = lazy(() => import('./pages/ThoughtCoach'));
const VideoPlayer = lazy(() => import('./pages/VideoPlayer'));
const Videos = lazy(() => import('./pages/Videos'));
const TherapeuticForms = lazy(() => import('./pages/TherapeuticForms'));
const Tools = lazy(() => import('./pages/Tools'));


export const PAGES = {
    "AdvancedAnalytics": AdvancedAnalytics,
    "Chat": Chat,
    "Coach": Coach,
    "CoachingAnalytics": CoachingAnalytics,
    "Community": Community,
    "CrisisAlerts": CrisisAlerts,
    "ExerciseView": ExerciseView,
    "Exercises": Exercises,
    "ExperientialGames": ExperientialGames,
    "GoalCoach": GoalCoach,
    "Goals": Goals,
    "Home": Home,
    "Journal": Journal,
    "JournalDashboard": JournalDashboard,
    "Journeys": Journeys,
    "MoodTracker": MoodTracker,
    "MyPath": MyPath,
    "PersonalizedFeed": PersonalizedFeed,
    "PlaylistDetail": PlaylistDetail,
    "Playlists": Playlists,
    "Progress": Progress,
    "Resources": Resources,
    "Settings": Settings,
    "StarterPath": StarterPath,
    "TestSetupGuide": TestSetupGuide,
    "ThoughtCoach": ThoughtCoach,
    "VideoPlayer": VideoPlayer,
    "Videos": Videos,
    "TherapeuticForms": TherapeuticForms,
    "Tools": Tools,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};