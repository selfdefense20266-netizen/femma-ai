import { Navigate } from 'react-router-dom';

// material-ui
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

// project imports
import AuthWrapper from 'sections/auth/AuthWrapper';
import AuthLogin from 'sections/auth/AuthLogin';
import Loader from 'components/Loader';
import { useAuth } from 'contexts/AuthContext';

// ================================|| ADMIN LOGIN ||================================ //

export default function Login() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <Loader />;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <AuthWrapper>
      <Grid container spacing={3}>
        <Grid size={12}>
          <Stack sx={{ gap: 0.5, mb: { xs: -0.5, sm: 0.5 } }}>
            <Typography variant="h3">Admin Login</Typography>
            <Typography variant="body1" color="text.secondary">
              Manage Fema AI content, members, and subscriptions.
            </Typography>
          </Stack>
        </Grid>
        <Grid size={12}>
          <AuthLogin />
        </Grid>
      </Grid>
    </AuthWrapper>
  );
}
