import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getProfile } from '../lib/auth';
import type { Role } from '../types';

// Maps a DB role to the correct dashboard root path
function dashboardRoot(role: string): string {
  const r = String(role).toLowerCase();
  if (r === 'admin') return '/admin';
  if (r === 'lister' || r === 'landlord') return '/landlord/dashboard';
  if (r === 'dalali') return '/dalali/dashboard';
  return '/tenant/dashboard';
}

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles: Role[];
}

export default function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { user, token, loading: authLoading } = useAuth();
  const location = useLocation();

  const [serverRole, setServerRole] = useState<string | null>(null);
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
        // Always re-fetch profile server-side — never trust client state alone
        const profile = await getProfile(user.userId, token);

        if (cancelled) return;

        if (profile?.suspended) {
          setSuspended(true);
          setChecking(false);
          return;
        }

        setServerRole(profile?.role ?? user.role);
      } catch {
        // Fallback to client-side role
        if (!cancelled) setServerRole(user.role);
      } finally {
        if (!cancelled) setChecking(false);
      }
    }

    if (!authLoading) {
      verifyRole();
    }

    return () => { cancelled = true; };
  }, [user?.userId, token, authLoading, user?.role]);

  // Still loading auth
  if (authLoading || checking) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: 'var(--paper)',
      }}>
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

  // Not logged in
  if (!user || !token) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  // Suspended
  if (suspended) {
    return <Navigate to="/auth/login?reason=suspended" replace />;
  }

  // Normalize role for comparison
  const effectiveRole = (serverRole || user.role).toLowerCase();
  const normalizedEffective = (() => {
    if (effectiveRole === 'lister' || effectiveRole === 'landlord') return 'landlord';
    if (effectiveRole === 'dalali') return 'dalali';
    if (effectiveRole === 'admin') return 'admin';
    return 'student';
  })() as Role;

  // Wrong role — redirect to correct dashboard
  if (!roles.includes(normalizedEffective)) {
    const correct = dashboardRoot(normalizedEffective);
    // Avoid redirect loop
    if (location.pathname === correct) return <>{children}</>;
    return <Navigate to={correct} replace />;
  }

  return <>{children}</>;
}
