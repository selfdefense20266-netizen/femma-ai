import { createBrowserRouter, Navigate } from 'react-router-dom';

// project imports
import MainRoutes from './MainRoutes';
import LoginRoutes from './LoginRoutes';

// ==============================|| ROUTING RENDER ||============================== //

// Unknown URLs -> dashboard (RequireAuth sends signed-out visitors on to /login).
const NotFoundRoute = { path: '*', element: <Navigate to="/dashboard" replace /> };

const router = createBrowserRouter([MainRoutes, LoginRoutes, NotFoundRoute], { basename: import.meta.env.VITE_APP_BASE_NAME });

export default router;
