import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AuthLoader from './AuthLoader';
import { getProfile } from '../lib/auth';
import {
  appRoleFromProfile,
  dashboardDefaultPath,
  normalizeForRouteGuard,
} from '../lib/roles';
import type { Role } from '../types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles: Role[];
}

export default function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { user, token, loading: authLoading } = useAuth();
  const location = useLocation();

  const [verifiedRouteRole, setVerifiedRouteRole] = useState<Role | null>(null);
  const [checking, setChecking] = useState(true);
  const [suspended, setSuspended] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function verifyRole() {
      if (!user?.userId || !token) {
        setChecking(false);
        return;
      }

      try {
        const profile = await getProfile(user.userId, token);

        if (cancelled) return;

        if (profile?.suspended) {
          setSuspended(true);
          setChecking(false);
          return;
        }

        const routeRole = (
          profile
            ? normalizeForRouteGuard(appRoleFromProfile(profile))
            : normalizeForRouteGuard(user.role)
        ) as Role;

        setVerifiedRouteRole(routeRole);
      } catch {
        if (!cancelled) {
          setVerifiedRouteRole(normalizeForRouteGuard(user.role) as Role);
        }
      } finally {
        if (!cancelled) setChecking(false);
      }
    }

    if (!authLoading) {
      verifyRole();
    }

    return () => {
      cancelled = true;
    };
  }, [user?.userId, token, authLoading, user?.role]);

  if (authLoading || checking) {
    return (
      <AuthLoader title="Verifying access…" subtitle="Checking permissions and preparing your dashboard" />
    );
  }

  if (!user || !token) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  if (suspended) {
    return <Navigate to="/auth/login?reason=suspended" replace />;
  }

  const normalizedEffective = (verifiedRouteRole ||
    (normalizeForRouteGuard(user.role) as Role)) as Role;

  const isAdminRequired = roles.length === 1 && roles.includes('admin');
  const hasAdminRole = normalizedEffective === 'admin';

  if (isAdminRequired && !hasAdminRole) {
    const correct = dashboardDefaultPath(user.role);
    return <Navigate to={correct} replace />;
  }

  if (!roles.includes(normalizedEffective)) {
    const correct = dashboardDefaultPath(user.role);
    if (location.pathname === correct) return <>{children}</>;
    return <Navigate to={correct} replace />;
  }

  return <>{children}</>;
}
