import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AuthLoader from './AuthLoader';
import { getProfile } from '../lib/auth';
import {
  appRoleFromProfile,
  dashboardDefaultPath,
  normalizeForRouteGuard,
  parseRolesFromProfile,
} from '../lib/roles';
import type { Role } from '../types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles: Role[];
}

export default function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { user, token, loading: authLoading } = useAuth();
  const location = useLocation();

  const [verifiedRoles, setVerifiedRoles] = useState<Role[]>([]);
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

        // Get ALL roles the user has
        const allRoles = parseRolesFromProfile(profile);
        setVerifiedRoles(allRoles as Role[]);
      } catch {
        if (!cancelled) {
          // Fallback to the role in JWT if profile fetch fails
          setVerifiedRoles([normalizeForRouteGuard(user.role) as Role]);
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

  const userRoles = verifiedRoles.length > 0 
    ? verifiedRoles 
    : [normalizeForRouteGuard(user.role) as Role];

  // If ANY of the user's roles are in the allowed 'roles' list, they are authorized
  const isAuthorized = roles.some(r => userRoles.includes(r));

  if (!isAuthorized) {
    const correct = dashboardDefaultPath(user.role);
    if (location.pathname === correct) return <>{children}</>;
    return <Navigate to={correct} replace />;
  }

  return <>{children}</>;
}
