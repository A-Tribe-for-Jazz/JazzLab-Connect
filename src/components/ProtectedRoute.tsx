import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  allowedRoles?: ('master_admin' | 'partner' | 'educator')[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const { user, profile, loading, requiresPasswordSetup } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-xl font-medium text-gray-500">Loading JazzLab Connect...</div>
      </div>
    );
  }

  if (!user || !profile) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiresPasswordSetup && location.pathname !== '/password-setup') {
    return <Navigate to="/password-setup" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    // Redirect to their default dashboard if they try to access unauthorized routes
    switch (profile.role) {
      case 'master_admin':
        return <Navigate to="/admin/dashboard" replace />;
      case 'partner':
        return <Navigate to="/partner/dashboard" replace />;
      case 'educator':
        return <Navigate to="/educator/roster" replace />;
      default:
        return <Navigate to="/login" replace />;
    }
  }

  return <Outlet />;
};
