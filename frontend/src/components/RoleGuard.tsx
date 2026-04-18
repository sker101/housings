import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { dashboardDefaultPath, normalizeForRouteGuard, AppRoleValue } from '../lib/roles';

interface RoleGuardProps {
  roles: AppRoleValue[];
  children: React.ReactNode;
  fallbackPath?: string;
}

export default function RoleGuard({ roles, children, fallbackPath }: RoleGuardProps) {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex bg-cream min-h-screen items-center justify-center">
        <span className="spinner-border text-jade animate-spin inline-block w-8 h-8 rounded-full border-4" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/auth/login" replace />;
  }

  const normalizedUserRole = normalizeForRouteGuard(user.role);
  // Ensure the user's role is string matching one of the required roles
  const hasAccess = roles.map(r => normalizeForRouteGuard(r)).includes(normalizedUserRole);

  if (!hasAccess) {
    return <Navigate to={fallbackPath || dashboardDefaultPath(user.role)} replace />;
  }

  return <>{children}</>;
}
