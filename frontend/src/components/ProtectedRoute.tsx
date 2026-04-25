import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
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
      <div
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          background: 'var(--paper)',
        }}
      >
        <div style={{ textAlign: 'center', color: 'var(--mid)' }}>
          <div
            style={{
              width: 36,
              height: 36,
              border: '3px solid var(--border)',
              borderTopColor: 'var(--jade)',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 0.75rem',
            }}
          />
          <p style={{ fontSize: '0.88rem' }}>Verifying access…</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
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
