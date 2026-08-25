import { RouterProvider } from 'react-router-dom';

// project imports
import router from 'routes';
import ThemeCustomization from 'themes';
import { AuthProvider } from 'contexts/AuthContext';
import { AdminDataProvider } from 'contexts/AdminDataContext';

// ==============================|| APP - THEME, ROUTER, LOCAL ||============================== //

export default function App() {
  return (
    <ThemeCustomization>
      <AuthProvider>
        <AdminDataProvider>
          <RouterProvider router={router} />
        </AdminDataProvider>
      </AuthProvider>
    </ThemeCustomization>
  );
}
