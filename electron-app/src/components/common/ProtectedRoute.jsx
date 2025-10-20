import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ProtectedRoute = () => {
  const { user } = useAuth(); // Only need user object

  // The user's authentication status is determined by the presence of the user object.
  // The WebSocket's connection status should not affect the user's authenticated route access.
  // The app can handle connection issues gracefully in the UI without logging the user out.
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;