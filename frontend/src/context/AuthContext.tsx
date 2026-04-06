import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  AUTH_SESSION_REFRESH_EVENT,
  clearStoredSession,
  fetchAuthUser,
  isSessionExpired,
  readStoredSession,
  refreshAuthSession,
  selectRows,
  signInWithPassword,
  signOut,
  signUpWithPassword,
  upsertRows,
  writeStoredSession,
} from '../lib/supabase';
import { APP_ROLE, toAppRole } from '../lib/roles';
import type { Profile } from '../types';

// ─────────────────────────────────────────────────────────────
// Context Shape
// ─────────────────────────────────────────────────────────────
interface AuthUser {
  userId: string;
  fullName: string;
  email: string;
  phone: string;
  phoneVerified: boolean;
  role: string;
  roleRaw: string;
  listerType: string;
  landlordVerificationStatus: string;
  university: string;
  preferredLanguage: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  profile: Profile | null;
  token: string | null;
  session: Record<string, unknown> | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (
    credentials: Record<string, string>,
    options?: { rememberMe?: boolean }
  ) => Promise<Record<string, unknown>>;
  logout: () => Promise<void>;
  registerStudent: (payload: Record<string, string>) => Promise<Record<string, unknown>>;
  registerLandlord: (payload: Record<string, string>) => Promise<Record<string, unknown>>;
  refreshMe: () => Promise<AuthUser | null>;
  networkError: boolean;
  setNetworkError: (v: boolean) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
function normalizeVerificationStatus(rawStatus: unknown): string {
  const normalized = String(rawStatus || '').trim().toLowerCase();
  if (!normalized) return '';
  return normalized.toUpperCase();
}

function buildSessionObject(authPayload: Record<string, unknown>): Record<string, unknown> | null {
  if (!authPayload?.access_token || !authPayload?.user) return null;
  return {
    access_token: authPayload.access_token,
    refresh_token: authPayload.refresh_token,
    expires_at: authPayload.expires_at,
    expires_in: authPayload.expires_in,
    token_type: authPayload.token_type,
    user: authPayload.user,
  };
}

function buildCurrentUser(
  session: Record<string, unknown>,
  profile: Profile | null
): AuthUser | null {
  const sessionUser = session?.user as Record<string, unknown> | undefined;
  if (!sessionUser) return null;

  const role = toAppRole(profile?.role);

  return {
    userId: sessionUser.id as string,
    fullName:
      (profile?.full_name as string) ||
      (sessionUser.user_metadata as Record<string, string>)?.full_name ||
      (sessionUser.email as string),
    email: (sessionUser.email as string) || '',
    phone: profile?.phone || (sessionUser.user_metadata as Record<string, string>)?.phone || '',
    phoneVerified: Boolean((profile as unknown as Record<string, unknown>)?.phone_verified),
    role,
    roleRaw: profile?.role || (role === APP_ROLE.LISTER ? 'lister' : 'student'),
    listerType: (profile as unknown as Record<string, unknown>)?.lister_type as string || '',
    landlordVerificationStatus: normalizeVerificationStatus(
      (profile as unknown as Record<string, unknown>)?.verification_status
    ),
    university: (profile as unknown as Record<string, unknown>)?.university as string || '',
    preferredLanguage: (profile as unknown as Record<string, unknown>)?.preferred_language as string || 'en',
  };
}

async function fetchProfile(userId: string, accessToken: string): Promise<Profile | null> {
  if (!userId || !accessToken) return null;

  const rows = await selectRows('profiles', {
    select: [
      'id', 'role', 'lister_type', 'full_name', 'phone', 'phone_verified',
      'university', 'profile_photo_url', 'id_verified', 'id_document_url',
      'suspended', 'avg_rating', 'verification_status', 'preferred_language',
      'created_at',
    ].join(','),
    filters: [{ column: 'id', op: 'eq', value: userId }],
    limit: 1,
    accessToken,
  });

  return (rows[0] as Profile) || null;
}

// ─────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [{ session, persistent }, setSessionState] = useState<{
    session: Record<string, unknown> | null;
    persistent: boolean;
  }>(() => readStoredSession() as { session: Record<string, unknown> | null; persistent: boolean });

  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [networkError, setNetworkError] = useState(false);
  const authFlowIdRef = React.useRef(0);
  // Redirect helper — we use window.location so we don't need router here
  const suspendedRedirectRef = React.useRef(false);

  const beginAuthFlow = useCallback(() => {
    authFlowIdRef.current += 1;
    return authFlowIdRef.current;
  }, []);

  const isCurrentAuthFlow = useCallback(
    (flowId: number) => authFlowIdRef.current === flowId,
    []
  );

  const applySession = useCallback(
    (nextSession: Record<string, unknown> | null, rememberMe = true) => {
      if (!nextSession) {
        setSessionState({ session: null, persistent: rememberMe });
        setUser(null);
        setProfile(null);
        clearStoredSession();
        return;
      }
      writeStoredSession(nextSession, rememberMe);
      setSessionState({ session: nextSession, persistent: rememberMe });
    },
    []
  );

  const hydrateUser = useCallback(
    async (
      activeSession: Record<string, unknown>,
      rememberMe = true,
      flowId = authFlowIdRef.current
    ): Promise<AuthUser | null> => {
      const sessionUser = activeSession?.user as Record<string, unknown> | undefined;
      if (!activeSession?.access_token || !sessionUser?.id) {
        if (flowId === authFlowIdRef.current) applySession(null, rememberMe);
        return null;
      }

      const fetchedProfile = await fetchProfile(
        sessionUser.id as string,
        activeSession.access_token as string
      );

      if (flowId !== authFlowIdRef.current) return null;

      // ─── Suspended account guard ───────────────────────────────
      if (fetchedProfile?.suspended && !suspendedRedirectRef.current) {
        suspendedRedirectRef.current = true;
        applySession(null, rememberMe);
        try {
          await signOut(activeSession.access_token as string);
        } catch {
          // ignore
        }
        // Hard redirect — avoids needing useNavigate at this level
        window.location.href = '/auth/login?reason=suspended';
        return null;
      }

      setProfile(fetchedProfile);
      const nextUser = buildCurrentUser(activeSession, fetchedProfile);
      setUser(nextUser);
      applySession(activeSession, rememberMe);
      return nextUser;
    },
    [applySession]
  );

  const initialize = useCallback(async () => {
    const flowId = beginAuthFlow();
    setLoading(true);

    try {
      let workingSession = session;
      const rememberMe = persistent;

      if (!workingSession) {
        if (isCurrentAuthFlow(flowId)) setUser(null);
        return;
      }

      if (isSessionExpired(workingSession) && workingSession.refresh_token) {
        const refreshed = await refreshAuthSession(workingSession.refresh_token as string) as Record<string, unknown>;
        const refreshedSession = buildSessionObject(refreshed);
        if (!refreshedSession) throw new Error('Session refresh failed');
        workingSession = refreshedSession;
      }

      const authUser = await fetchAuthUser(workingSession.access_token as string) as Record<string, unknown>;
      workingSession = { ...workingSession, user: authUser };

      await hydrateUser(workingSession, rememberMe, flowId);
    } catch {
      if (isCurrentAuthFlow(flowId)) applySession(null);
    } finally {
      if (isCurrentAuthFlow(flowId)) setLoading(false);
    }
  }, [session, persistent, hydrateUser, applySession, beginAuthFlow, isCurrentAuthFlow]);

  const hasInitialized = React.useRef(false);
  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      initialize();
    }
  }, [initialize]);

  useEffect(() => {
    const handleSessionRefresh = (event: Event) => {
      const detail = (event as CustomEvent)?.detail;
      if (!detail?.session) return;
      setSessionState({
        session: detail.session,
        persistent: detail.persistent !== false,
      });
    };
    window.addEventListener(AUTH_SESSION_REFRESH_EVENT, handleSessionRefresh);
    return () => window.removeEventListener(AUTH_SESSION_REFRESH_EVENT, handleSessionRefresh);
  }, []);

  const login = useCallback(
    async (
      credentials: Record<string, string>,
      options: { rememberMe?: boolean } = {}
    ): Promise<Record<string, unknown>> => {
      const flowId = beginAuthFlow();
      setLoading(true);
      try {
        const response = await signInWithPassword({
          email: credentials.email,
          password: credentials.password,
        }) as Record<string, unknown>;

        const nextSession = buildSessionObject(response);
        if (!nextSession) throw new Error('Unable to establish session');

        const nextUser = await hydrateUser(nextSession, options.rememberMe !== false, flowId);
        return { ...response, role: nextUser?.role || APP_ROLE.STUDENT };
      } finally {
        if (isCurrentAuthFlow(flowId)) setLoading(false);
      }
    },
    [hydrateUser, beginAuthFlow, isCurrentAuthFlow]
  );

  const registerStudent = useCallback(
    async (payload: Record<string, string>): Promise<Record<string, unknown>> => {
      const flowId = beginAuthFlow();
      setLoading(true);
      try {
        const response = await signUpWithPassword({
          email: payload.email.trim().toLowerCase(),
          password: payload.password,
          data: { full_name: payload.fullName.trim(), phone: payload.phone.trim(), role: 'student' },
        }) as Record<string, unknown>;

        const accessToken = (response?.access_token as string) || null;
        const userId = (response?.user as Record<string, string>)?.id;
        if (userId) {
          try {
            await upsertRows(
              'profiles',
              {
                id: userId,
                role: 'student',
                full_name: payload.fullName.trim(),
                phone: payload.phone.trim(),
                university: payload.university?.trim() || null,
                phone_verified: false,
                verification_status: 'unverified',
                preferred_language: payload.preferredLanguage || 'en',
              },
              { onConflict: 'id', accessToken: accessToken || undefined }
            );
          } catch (profileError) {
            if (accessToken) throw profileError;
          }
        }

        const nextSession = buildSessionObject(response);
        if (nextSession) {
          await hydrateUser(nextSession, true, flowId);
        } else if (isCurrentAuthFlow(flowId)) {
          applySession(null, true);
        }
        return { ...response, role: APP_ROLE.STUDENT };
      } finally {
        if (isCurrentAuthFlow(flowId)) setLoading(false);
      }
    },
    [hydrateUser, applySession, beginAuthFlow, isCurrentAuthFlow]
  );

  const registerLandlord = useCallback(
    async (payload: Record<string, string>): Promise<Record<string, unknown>> => {
      const flowId = beginAuthFlow();
      setLoading(true);
      try {
        const response = await signUpWithPassword({
          email: payload.email.trim().toLowerCase(),
          password: payload.password,
          data: {
            full_name: payload.fullName.trim(),
            phone: payload.phone.trim(),
            role: 'lister',
            lister_type: payload.listerType || 'owner',
          },
        }) as Record<string, unknown>;

        const accessToken = (response?.access_token as string) || null;
        const userId = (response?.user as Record<string, string>)?.id;
        if (userId) {
          try {
            await upsertRows(
              'profiles',
              {
                id: userId,
                role: 'lister',
                lister_type: payload.listerType || 'owner',
                full_name: payload.fullName.trim(),
                phone: payload.phone.trim(),
                phone_verified: false,
                verification_status: 'pending',
                preferred_language: payload.preferredLanguage || 'en',
              },
              { onConflict: 'id', accessToken: accessToken || undefined }
            );
          } catch (profileError) {
            if (accessToken) throw profileError;
          }
        }

        const nextSession = buildSessionObject(response);
        if (nextSession) {
          await hydrateUser(nextSession, true, flowId);
        } else if (isCurrentAuthFlow(flowId)) {
          applySession(null, true);
        }
        return { ...response, role: APP_ROLE.LISTER };
      } finally {
        if (isCurrentAuthFlow(flowId)) setLoading(false);
      }
    },
    [hydrateUser, applySession, beginAuthFlow, isCurrentAuthFlow]
  );

  const logout = useCallback(async () => {
    try {
      if (session?.access_token) {
        await signOut(session.access_token as string);
      }
    } catch {
      // Ignore logout API errors
    } finally {
      applySession(null);
      setUser(null);
      setProfile(null);
    }
  }, [applySession, session?.access_token]);

  const refreshMe = useCallback(async (): Promise<AuthUser | null> => {
    const flowId = beginAuthFlow();
    if (!session?.access_token || !(session?.user as Record<string, unknown>)?.id) return null;
    try {
      const authUser = await fetchAuthUser(session.access_token as string) as Record<string, unknown>;
      const nextSession = { ...session, user: authUser } as Record<string, unknown>;
      return await hydrateUser(nextSession, persistent, flowId);
    } catch {
      if (isCurrentAuthFlow(flowId)) applySession(null);
      return null;
    }
  }, [session, persistent, hydrateUser, applySession, beginAuthFlow, isCurrentAuthFlow]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      token: (session?.access_token as string) || null,
      session,
      loading,
      isAuthenticated: Boolean(session?.access_token),
      login,
      logout,
      registerStudent,
      registerLandlord,
      refreshMe,
      networkError,
      setNetworkError,
    }),
    [user, profile, session, loading, login, logout, registerStudent, registerLandlord, refreshMe, networkError]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
