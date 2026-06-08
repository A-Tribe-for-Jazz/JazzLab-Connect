import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  allowedRoles?: ('master_admin' | 'partner' | 'educator')[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const { user, profile, loading, requiresPasswordSetup } = useAuth();
  const location = useLocation();

  console.log('ProtectedRoute: path =', location.pathname, 'user =', user?.email, 'profile =', profile?.full_name, 'loading =', loading, 'requiresPasswordSetup =', requiresPasswordSetup);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-xl font-medium text-gray-500">Loading JazzLab Connect...</div>
      </div>
    );
  }

  if (!user || !profile) {
    console.log('ProtectedRoute: no user or profile, redirecting to /signin');
    return <Navigate to={`/signin${window.location.hash}`} state={{ from: location }} replace />;
  }

  if (requiresPasswordSetup && location.pathname !== '/password-setup' && location.pathname !== '/set-password') {
    console.log('ProtectedRoute: requiresPasswordSetup is true, redirecting from', location.pathname, 'to /password-setup');
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
        return <Navigate to="/signin" replace />;
    }
  }

  return <Outlet />;
};
