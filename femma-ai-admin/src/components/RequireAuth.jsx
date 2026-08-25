import PropTypes from 'prop-types';
import { Navigate, useLocation } from 'react-router-dom';

// project imports
import { useAuth } from 'contexts/AuthContext';
import Loader from 'components/Loader';

// ==============================|| AUTH GUARD ||============================== //

export default function RequireAuth({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <Loader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}

RequireAuth.propTypes = { children: PropTypes.node };
