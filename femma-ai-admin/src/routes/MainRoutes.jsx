import { lazy } from 'react';

// project imports
import Loadable from 'components/Loadable';
import DashboardLayout from 'layout/Dashboard';
import RequireAuth from 'components/RequireAuth';

const DashboardDefault = Loadable(lazy(() => import('pages/dashboard/default')));
const CategoriesPage = Loadable(lazy(() => import('pages/admin/Categories')));
const CoursesPage = Loadable(lazy(() => import('pages/admin/Courses')));
const ModulesLessonsPage = Loadable(lazy(() => import('pages/admin/ModulesLessons')));
const MediaLibraryPage = Loadable(lazy(() => import('pages/admin/MediaLibrary')));
const UsersPage = Loadable(lazy(() => import('pages/admin/Users')));
const SubscriptionsPage = Loadable(lazy(() => import('pages/admin/Subscriptions')));
const AnalyticsPage = Loadable(lazy(() => import('pages/admin/Analytics')));
const NotificationsPage = Loadable(lazy(() => import('pages/admin/Notifications')));
// const SettingsPage = Loadable(lazy(() => import('pages/admin/Settings')));

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
        { path: 'categories', element: <CategoriesPage /> },
        { path: 'courses', element: <CoursesPage /> },
        { path: 'modules-lessons', element: <ModulesLessonsPage /> },
        { path: 'media', element: <MediaLibraryPage /> }
      ]
    },
    { path: 'users', element: <UsersPage /> },
    { path: 'subscriptions', element: <SubscriptionsPage /> },
    { path: 'analytics', element: <AnalyticsPage /> },
    { path: 'notifications', element: <NotificationsPage /> }
    // { path: 'settings', element: <SettingsPage /> }
  ]
};

export default MainRoutes;
