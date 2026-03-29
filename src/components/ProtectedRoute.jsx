import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { clearAuthSession, getAccessToken, hasMenuPermission, isAuthenticated } from '../utils/auth';

const DEV_BYPASS_TOKEN = 'dev-bypass-token';

const ProtectedRoute = ({ children, menuKey }) => {
  const location = useLocation();
  const accessToken = getAccessToken();

  if (accessToken === DEV_BYPASS_TOKEN) {
    clearAuthSession();
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (menuKey && !hasMenuPermission(menuKey)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default ProtectedRoute;
