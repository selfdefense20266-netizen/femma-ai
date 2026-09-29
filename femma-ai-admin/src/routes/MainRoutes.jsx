import { lazy } from 'react';

// project imports
import Loadable from 'components/Loadable';
import DashboardLayout from 'layout/Dashboard';
import RequireAuth from 'components/RequireAuth';

const DashboardDefault = Loadable(lazy(() => import('pages/dashboard/default')));
const JourneysPage = Loadable(lazy(() => import('pages/admin/Journeys')));
const DailyPlansPage = Loadable(lazy(() => import('pages/admin/DailyPlans')));
const DailyPlanEditorPage = Loadable(lazy(() => import('pages/admin/DailyPlanEditor')));
const RecoverySectionsPage = Loadable(lazy(() => import('pages/admin/RecoverySections')));
const ProgramCardsPage = Loadable(lazy(() => import('pages/admin/ProgramCards')));
const CategoriesPage = Loadable(lazy(() => import('pages/admin/Categories')));
const CoursesPage = Loadable(lazy(() => import('pages/admin/Courses')));
const ModulesLessonsPage = Loadable(lazy(() => import('pages/admin/ModulesLessons')));
const UsersPage = Loadable(lazy(() => import('pages/admin/Users')));
const AnalyticsPage = Loadable(lazy(() => import('pages/admin/Analytics')));
const NotificationsPage = Loadable(lazy(() => import('pages/admin/Notifications')));
const SettingsPage = Loadable(lazy(() => import('pages/admin/Settings')));

// ==============================|| MAIN ROUTING ||============================== //

const MainRoutes = {
  path: '/',
  element: (
    <RequireAuth>
      <DashboardLayout />
    </RequireAuth>
  ),
  children: [
    {
      path: '/',
      element: <DashboardDefault />
    },
    {
      path: 'dashboard',
      element: <DashboardDefault />
    },
    {
      path: 'content',
      children: [
        { path: 'guided-journeys', element: <JourneysPage /> },
        { path: 'daily-plans', element: <DailyPlansPage /> },
        { path: 'daily-plans/new', element: <DailyPlanEditorPage /> },
        { path: 'daily-plans/:planId', element: <DailyPlanEditorPage /> },
        { path: 'recovery', element: <RecoverySectionsPage /> },
        { path: 'program', element: <ProgramCardsPage /> },
        { path: 'categories', element: <CategoriesPage /> },
        { path: 'courses', element: <CoursesPage /> },
        { path: 'modules-lessons', element: <ModulesLessonsPage /> }
      ]
    },
    { path: 'users', element: <UsersPage /> },
    { path: 'analytics', element: <AnalyticsPage /> },
    { path: 'notifications', element: <NotificationsPage /> },
    { path: 'settings', element: <SettingsPage /> }
  ]
};

export default MainRoutes;
