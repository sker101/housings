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
  writeStoredSession
} from '../lib/supabase';
import { APP_ROLE, toAppRole } from '../lib/roles';

const AuthContext = createContext(null);

function normalizeVerificationStatus(rawStatus) {
  const normalized = String(rawStatus || '').trim().toLowerCase();

  if (!normalized) {
    return '';
  }

  return normalized.toUpperCase();
}

function buildSessionObject(authPayload) {
  if (!authPayload?.access_token || !authPayload?.user) {
    return null;
  }

  return {
    access_token: authPayload.access_token,
    refresh_token: authPayload.refresh_token,
    expires_at: authPayload.expires_at,
    expires_in: authPayload.expires_in,
    token_type: authPayload.token_type,
    user: authPayload.user
  };
}

function buildCurrentUser(session, profile) {
  if (!session?.user) {
    return null;
  }

  const role = toAppRole(profile?.role);

  return {
    userId: session.user.id,
    fullName:
      profile?.full_name || session.user.user_metadata?.full_name || session.user.email,
    email: session.user.email || '',
    phone: profile?.phone || session.user.user_metadata?.phone || '',
    phoneVerified: Boolean(profile?.phone_verified),
    role,
    roleRaw: profile?.role || (role === APP_ROLE.LISTER ? 'lister' : 'student'),
    listerType: profile?.lister_type || '',
    landlordVerificationStatus: normalizeVerificationStatus(profile?.verification_status),
    university: profile?.university || '',
    preferredLanguage: profile?.preferred_language || 'en'
  };
}

async function fetchProfile(userId, accessToken) {
  if (!userId || !accessToken) {
    return null;
  }

  const rows = await selectRows('profiles', {
    select:
      'id,role,lister_type,full_name,phone,phone_verified,university,profile_photo_url,id_doc_url,selfie_url,verification_status,subscription_plan,payout_provider,payout_reference,created_at,preferred_language',
    filters: [{ column: 'id', op: 'eq', value: userId }],
    limit: 1,
    accessToken
  });

  return rows[0] || null;
}

export function AuthProvider({ children }) {
  const [{ session, persistent }, setSessionState] = useState(() => readStoredSession());
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [networkError, setNetworkError] = useState(false);
  const authFlowIdRef = React.useRef(0);

  const beginAuthFlow = useCallback(() => {
    authFlowIdRef.current += 1;
    return authFlowIdRef.current;
  }, []);

  const isCurrentAuthFlow = useCallback((flowId) => authFlowIdRef.current === flowId, []);

  const applySession = useCallback((nextSession, rememberMe = true) => {
    if (!nextSession) {
      setSessionState({ session: null, persistent: rememberMe });
      setUser(null);
      clearStoredSession();
      return;
    }

    writeStoredSession(nextSession, rememberMe);
    setSessionState({ session: nextSession, persistent: rememberMe });
  }, []);

  const hydrateUser = useCallback(
    async (activeSession, rememberMe = true, flowId = authFlowIdRef.current) => {
      if (!activeSession?.access_token || !activeSession?.user?.id) {
        if (flowId === authFlowIdRef.current) {
          applySession(null, rememberMe);
        }
        return null;
      }

      const profile = await fetchProfile(activeSession.user.id, activeSession.access_token);
      if (flowId !== authFlowIdRef.current) {
        return null;
      }
      const nextUser = buildCurrentUser(activeSession, profile);
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
      let rememberMe = persistent;

      if (!workingSession) {
        if (isCurrentAuthFlow(flowId)) {
          setUser(null);
        }
        return;
      }

      if (isSessionExpired(workingSession) && workingSession.refresh_token) {
        const refreshed = await refreshAuthSession(workingSession.refresh_token);
        const refreshedSession = buildSessionObject(refreshed);
        if (!refreshedSession) {
          throw new Error('Session refresh failed');
        }
        workingSession = refreshedSession;
      }

      const authUser = await fetchAuthUser(workingSession.access_token);
      workingSession = {
        ...workingSession,
        user: authUser
      };

      await hydrateUser(workingSession, rememberMe, flowId);
    } catch {
      if (isCurrentAuthFlow(flowId)) {
        applySession(null);
      }
    } finally {
      if (isCurrentAuthFlow(flowId)) {
        setLoading(false);
      }
    }
  }, [session, persistent, hydrateUser, applySession, beginAuthFlow, isCurrentAuthFlow]);

  // We only want to initialize auth ONCE when the provider mounts.
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
      if (!detail?.session) {
        return;
      }

      setSessionState({
        session: detail.session,
        persistent: detail.persistent !== false
      });
    };

    window.addEventListener(AUTH_SESSION_REFRESH_EVENT, handleSessionRefresh);
    return () => window.removeEventListener(AUTH_SESSION_REFRESH_EVENT, handleSessionRefresh);
  }, []);

  const login = useCallback(
    async (credentials: Record<string, string>, options: { rememberMe?: boolean } = {}) => {
      const flowId = beginAuthFlow();
      setLoading(true);

      try {
        const response = await signInWithPassword({
          email: credentials.email,
          password: credentials.password
        });

        const nextSession = buildSessionObject(response);
        if (!nextSession) {
          throw new Error('Unable to establish session');
        }

        const nextUser = await hydrateUser(nextSession, options.rememberMe !== false, flowId);

        return {
          ...response,
          role: nextUser?.role || APP_ROLE.STUDENT
        };
      } finally {
        if (isCurrentAuthFlow(flowId)) {
          setLoading(false);
        }
      }
    },
    [hydrateUser, beginAuthFlow, isCurrentAuthFlow]
  );

  const registerStudent = useCallback(
    async (payload) => {
      const flowId = beginAuthFlow();
      setLoading(true);

      try {
        const response = await signUpWithPassword({
          email: payload.email.trim().toLowerCase(),
          password: payload.password,
          data: {
            full_name: payload.fullName.trim(),
            phone: payload.phone.trim(),
            role: 'student'
          }
        });

        const accessToken = response?.access_token || null;
        const userId = response?.user?.id;
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
                preferred_language: payload.preferredLanguage || 'en'
              },
              { onConflict: 'id', accessToken }
            );
          } catch (profileError) {
            if (accessToken) {
              throw profileError;
            }
          }
        }

        const nextSession = buildSessionObject(response);
        if (nextSession) {
          await hydrateUser(nextSession, true, flowId);
        } else if (isCurrentAuthFlow(flowId)) {
          applySession(null, true);
        }

        return {
          ...response,
          role: APP_ROLE.STUDENT
        };
      } finally {
        if (isCurrentAuthFlow(flowId)) {
          setLoading(false);
        }
      }
    },
    [hydrateUser, applySession, beginAuthFlow, isCurrentAuthFlow]
  );

  const registerLandlord = useCallback(
    async (payload) => {
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
            lister_type: payload.listerType || 'owner'
          }
        });

        const accessToken = response?.access_token || null;
        const userId = response?.user?.id;
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
                preferred_language: payload.preferredLanguage || 'en'
              },
              { onConflict: 'id', accessToken }
            );
          } catch (profileError) {
            if (accessToken) {
              throw profileError;
            }
          }
        }

        const nextSession = buildSessionObject(response);
        if (nextSession) {
          await hydrateUser(nextSession, true, flowId);
        } else if (isCurrentAuthFlow(flowId)) {
          applySession(null, true);
        }

        return {
          ...response,
          role: APP_ROLE.LISTER
        };
      } finally {
        if (isCurrentAuthFlow(flowId)) {
          setLoading(false);
        }
      }
    },
    [hydrateUser, applySession, beginAuthFlow, isCurrentAuthFlow]
  );

  const logout = useCallback(async () => {
    try {
      if (session?.access_token) {
        await signOut(session.access_token);
      }
    } catch {
      // Ignore logout API errors and clear local session regardless.
    } finally {
      applySession(null);
      setUser(null);
    }
  }, [applySession, session?.access_token]);

  const refreshMe = useCallback(async () => {
    const flowId = beginAuthFlow();
    if (!session?.access_token || !session?.user?.id) {
      return null;
    }

    try {
      const authUser = await fetchAuthUser(session.access_token);
      const nextSession = {
        ...session,
        user: authUser
      };
      return await hydrateUser(nextSession, persistent, flowId);
    } catch {
      if (isCurrentAuthFlow(flowId)) {
        applySession(null);
      }
      return null;
    }
  }, [session, persistent, hydrateUser, applySession, beginAuthFlow, isCurrentAuthFlow]);

  const value = useMemo(
    () => ({
      user,
      token: session?.access_token || null,
      session,
      loading,
      isAuthenticated: Boolean(session?.access_token),
      login,
      logout,
      registerStudent,
      registerLandlord,
      refreshMe,
      networkError,
      setNetworkError
    }),
    [user, session, loading, login, logout, registerStudent, registerLandlord, refreshMe, networkError]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
