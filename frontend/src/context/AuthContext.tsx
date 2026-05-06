import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  AUTH_SESSION_REFRESH_EVENT,
  clearStoredSession,
  exchangeCodeForSession,
  fetchAuthUser,
  isSessionExpired,
  readStoredSession,
  refreshAuthSession,
  selectRows,
  insertRows,
  sendMagicLink,
  sendOTP,
  signInWithOAuth,
  signInWithPassword,
  signOut,
  signUpWithPassword,
  verifyOTP,
  writeStoredSession,
  updateRows,
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
} from '../lib/supabase';
import {
  APP_ROLE,
  appRoleFromProfile,
  parseRolesFromProfile,
  getActiveRole,
  setActiveRole,
  clearActiveRole,
  canSwitchRoles
} from '../lib/roles';
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
  role: string; // Active/current role
  roles: string[]; // All roles the user has
  roleRaw: string;
  listerType: string;
  landlordVerificationStatus: string;
  university: string;
  nidaNumber: string;
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
    _credentials: Record<string, string>,
    _options?: { rememberMe?: boolean }
  ) => Promise<Record<string, unknown>>;
  logout: () => Promise<void>;
  registerStudent: (_payload: Record<string, string>) => Promise<Record<string, unknown>>;
  registerLandlord: (_payload: Record<string, string>) => Promise<Record<string, unknown>>;
  signInWithGoogle: (_role?: string) => Promise<void>;
  handleOAuthCallback: (_code: string) => Promise<{ user: AuthUser | null; isNewUser: boolean }>;
  sendVerificationCode: (_email: string) => Promise<void>;
  verifyEmailCode: (_email: string, _code: string) => Promise<AuthUser | null>;
  refreshMe: () => Promise<AuthUser | null>;
  switchRole: (role: string) => void;
  canSwitchRoles: boolean;
  networkError: boolean;
  setNetworkError: (_v: boolean) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
function normalizeVerificationStatus(rawStatus: unknown): string {
  const normalized = String(rawStatus || '').trim().toLowerCase();
  if (!normalized) return '';
  return normalized; // keep lowercase so comparisons like === 'verified' work
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
  profile: Profile | null,
  requestedRole?: string
): AuthUser | null {
  const sessionUser = session?.user as Record<string, unknown> | undefined;
  if (!sessionUser) return null;

  // Parse all roles from profile
  const allRoles = parseRolesFromProfile(profile);

  // Determine active role: requested > stored > first available
  let activeRole: string;
  if (requestedRole && allRoles.includes(requestedRole)) {
    activeRole = requestedRole;
    setActiveRole(requestedRole);
  } else {
    activeRole = getActiveRole(allRoles);
  }

  return {
    userId: sessionUser.id as string,
    fullName:
      (profile?.full_name as string) ||
      (sessionUser.user_metadata as Record<string, string>)?.full_name ||
      (sessionUser.email as string),
    email: (sessionUser.email as string) || '',
    phone: profile?.phone || (sessionUser.user_metadata as Record<string, string>)?.phone || '',
    phoneVerified: Boolean((profile as unknown as Record<string, unknown>)?.phone_verified),
    role: activeRole,
    roles: allRoles,
    roleRaw: profile?.role || (activeRole === APP_ROLE.LANDLORD ? 'landlord' : 'tenant'),
    listerType: (profile as unknown as Record<string, unknown>)?.lister_type as string || '',
    landlordVerificationStatus: normalizeVerificationStatus(
      (profile as unknown as Record<string, unknown>)?.verification_status
    ),
    university: (profile as unknown as Record<string, unknown>)?.university as string || '',
    nidaNumber: profile?.nida_number || (sessionUser.user_metadata as Record<string, string>)?.nida_number || '',
    preferredLanguage: (profile as unknown as Record<string, unknown>)?.preferred_language as string || 'en',
  };
}

async function fetchProfile(userId: string, accessToken: string): Promise<Profile | null> {
  if (!userId || !accessToken) return null;

  const columns = [
    'id', 'role', 'roles', 'full_name', 'phone', 'phone_verified',
    'university', 'nida_number', 'profile_photo_url', 'id_doc_url', 'selfie_url',
    'verification_status', 'subscription_plan', 'preferred_language',
    'commission_rate_pct', 'created_at',
  ];

  try {
    try {
      // First attempt with standard columns
      const rows = await selectRows('profiles', {
        select: columns.join(','),
        filters: [{ column: 'id', op: 'eq', value: userId }],
        limit: 1,
        accessToken,
      });

      const profile = rows[0] as any;
      if (profile) {
        profile.suspended = profile.verification_status === 'suspended';
        profile.id_document_url = profile.id_doc_url;
        return profile as Profile;
      }
      return null;
    } catch (err: any) {
      // Fallback: if columns are missing, try a minimal set
      if (err.message.includes('column') || err.message.includes('400')) {
        const minimalColumns = ['id', 'role', 'full_name', 'verification_status', 'created_at'];
        const rows = await selectRows('profiles', {
          select: minimalColumns.join(','),
          filters: [{ column: 'id', op: 'eq', value: userId }],
          limit: 1,
          accessToken,
        });

        const profile = rows[0] as any;
        if (profile) {
          profile.suspended = profile.verification_status === 'suspended';
          profile.id_document_url = profile.id_doc_url;
        }
        return (profile as Profile) || null;
      }
      throw err;
    }
  } catch (err) {
    console.error('Failed to fetch profile during auth:', err);
    return null;
  }
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
      flowId?: string,
      requestedRole?: string
    ): Promise<AuthUser | null> => {
      if (!activeSession?.access_token) return null;

      const currentFlowId = flowId ?? authFlowIdRef.current;

      try {
        let fetchedProfile = await fetchProfile(
          (activeSession.user as Record<string, unknown>)?.id as string,
          activeSession.access_token as string
        );

        // Check for pending role upgrade from session storage
        const pendingRole = sessionStorage.getItem('oauth_signup_role');
        const effectiveRequestedRole = requestedRole || pendingRole || undefined;

        if (fetchedProfile && effectiveRequestedRole && effectiveRequestedRole !== 'tenant' && effectiveRequestedRole !== fetchedProfile.role) {
          console.log('[Auth] Hydrate: Upgrading role to', effectiveRequestedRole);
          try {
            const currentRoles = (fetchedProfile as unknown as Record<string, unknown>)?.roles as string[] || [fetchedProfile.role || 'tenant'];
            if (!currentRoles.includes(effectiveRequestedRole)) {
              const newRoles = [...currentRoles, effectiveRequestedRole];
              
              try {
                // Try updating both columns (roles and role)
                await updateRows('profiles', {
                  role: effectiveRequestedRole,
                  roles: newRoles,
                  lister_type: 'owner',
                }, {
                  filters: [{ column: 'id', op: 'eq', value: (activeSession.user as Record<string, unknown>).id }],
                  accessToken: activeSession.access_token as string,
                  prefer: 'return=minimal'
                });
              } catch (patchErr) {
                console.warn('[Auth] Multi-role update failed, falling back to single role:', patchErr);
                // Fallback to updating only the single 'role' column
                await updateRows('profiles', {
                  role: effectiveRequestedRole,
                  lister_type: 'owner',
                }, {
                  filters: [{ column: 'id', op: 'eq', value: (activeSession.user as Record<string, unknown>).id }],
                  accessToken: activeSession.access_token as string,
                  prefer: 'return=minimal'
                });
              }
              
              // Refetch profile
              fetchedProfile = await fetchProfile(
                (activeSession.user as Record<string, unknown>)?.id as string,
                activeSession.access_token as string
              );
            }
          } catch (err) {
            console.error('[Auth] Failed to update profile roles during hydrate:', err);
          }
        }

        // Clean up the pending role if it was consumed
        if (pendingRole) {
          sessionStorage.removeItem('oauth_signup_role');
        }

        if (!fetchedProfile) {
          // Profile may not exist yet (race condition with DB trigger)
          // Return a minimal user object to allow the app to continue
          const sessionUser = activeSession.user as Record<string, unknown>;
          const minimalUser: AuthUser = {
            userId: sessionUser.id as string,
            fullName: (sessionUser.user_metadata as Record<string, string>)?.full_name || (sessionUser.email as string) || '',
            email: (sessionUser.email as string) || '',
            phone: '',
            phoneVerified: false,
            role: effectiveRequestedRole || APP_ROLE.TENANT,
            roles: effectiveRequestedRole ? ['tenant', effectiveRequestedRole] : [APP_ROLE.TENANT],
            roleRaw: 'tenant',
            listerType: '',
            landlordVerificationStatus: '',
            university: '',
            nidaNumber: '',
            preferredLanguage: 'en',
          };
          setUser(minimalUser);
          applySession(activeSession, rememberMe);
          return minimalUser;
        }

        setProfile(fetchedProfile);
        const nextUser = buildCurrentUser(activeSession, fetchedProfile, effectiveRequestedRole);
        setUser(nextUser);
        applySession(activeSession, rememberMe);
        return nextUser;
      } catch (err) {
        if (isCurrentAuthFlow(currentFlowId)) {
          setLoading(false);
        }
        return null;
      }
    },
    []
  );

  const initialize = useCallback(async () => {
    // Prevent initialize from cancelling an in-flight OAuth callback flow
    if (typeof window !== 'undefined' && window.location.pathname.includes('/auth/callback')) {
      const hasCode = window.location.search.includes('code=');
      const hasToken = window.location.hash.includes('access_token=');
      if (hasCode || hasToken) {
        console.log('[Auth] initialize: OAuth callback detected, unlocking loading guard');
        setLoading(false);
        return;
      }
    }

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
      // Hydrate user manually because initialize only runs once on mount
      setLoading(true);
      const flowId = beginAuthFlow();
      hydrateUser(detail.session, detail.persistent !== false, flowId)
        .finally(() => {
          if (isCurrentAuthFlow(flowId)) setLoading(false);
        });
    };
    window.addEventListener(AUTH_SESSION_REFRESH_EVENT, handleSessionRefresh);
    return () => window.removeEventListener(AUTH_SESSION_REFRESH_EVENT, handleSessionRefresh);
  }, [hydrateUser, beginAuthFlow, isCurrentAuthFlow]);

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
        return { ...response, role: nextUser?.role || APP_ROLE.TENANT };
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
          data: { 
            full_name: payload.fullName.trim(), 
            phone: payload.phone.trim(), 
            nida_number: payload.nidaNumber?.trim() || '',
            role: 'tenant',
            roles: ['tenant']
          },
        }) as Record<string, unknown>;

        // Profile is handled by DB trigger handle_new_user()
        const nextSession = buildSessionObject(response);
        if (nextSession) {
          await hydrateUser(nextSession, true, flowId);
        } else if (isCurrentAuthFlow(flowId)) {
          applySession(null, true);
        }
        return { ...response, role: APP_ROLE.TENANT };
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
        const selectedRole = payload.role || 'landlord';
        const response = await signUpWithPassword({
          email: payload.email.trim().toLowerCase(),
          password: payload.password,
          data: {
            full_name: payload.fullName.trim(),
            phone: payload.phone.trim(),
            nida_number: payload.nidaNumber?.trim() || '',
            role: selectedRole,
            roles: selectedRole === 'tenant' ? ['tenant'] : ['tenant', selectedRole],
            lister_type: payload.listerType || 'owner',
          },
        }) as Record<string, unknown>;

        // Profile is handled by DB trigger handle_new_user()
        const nextSession = buildSessionObject(response);
        if (nextSession) {
          await hydrateUser(nextSession, true, flowId);
        } else if (isCurrentAuthFlow(flowId)) {
          applySession(null, true);
        }
        return { ...response, role: APP_ROLE.LANDLORD };
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
      clearActiveRole();
    }
  }, [applySession, session?.access_token]);

  const refreshMe = useCallback(async (): Promise<AuthUser | null> => {
    const flowId = beginAuthFlow();
    if (!session?.access_token || !(session?.user as Record<string, unknown>)?.id) return null;
    setLoading(true);
    try {
      const authUser = await fetchAuthUser(session.access_token as string) as Record<string, unknown>;
      const nextSession = { ...session, user: authUser } as Record<string, unknown>;
      const res = await hydrateUser(nextSession, persistent, flowId);
      if (isCurrentAuthFlow(flowId)) setLoading(false);
      return res;
    } catch {
      if (isCurrentAuthFlow(flowId)) {
        applySession(null);
        setLoading(false);
      }
      return null;
    }
  }, [session, persistent, hydrateUser, applySession, beginAuthFlow, isCurrentAuthFlow]);

  // ─── Google OAuth ───────────────────────────────────────────
  const signInWithGoogle = useCallback(
    async (role?: string) => {
      // Use current origin for redirect - window.location.origin includes port automatically
      // This ensures localhost dev redirects to localhost, not production
      const redirectTo = `${window.location.origin}/auth/callback`;
      
      console.log('[Auth] OAuth signInWithGoogle initiated', {
        redirectTo,
        hostname: window.location.hostname,
        origin: window.location.origin,
        supabaseUrl: SUPABASE_URL,
      });
      
      // Store role preference for new users
      if (role) {
        sessionStorage.setItem('oauth_signup_role', role);
      }
      
      try {
        const response = await signInWithOAuth({
          provider: 'google',
          redirectTo,
          scopes: 'openid profile email',
        }) as { url?: string };
        
        console.log('[Auth] OAuth URL generated:', response?.url);
        
        if (response?.url) {
          window.location.href = response.url;
        } else {
          throw new Error('Failed to get Google sign-in URL');
        }
      } catch (err) {
        console.error('[Auth] signInWithGoogle error:', err);
        throw err;
      }
    },
    []
  );

  const handleOAuthCallback = useCallback(
    async (code: string): Promise<{ user: AuthUser | null; isNewUser: boolean }> => {
      const flowId = beginAuthFlow();
      setLoading(true);
      
      try {
        // Retrieve PKCE code_verifier stored during signInWithOAuth
        const codeVerifier = sessionStorage.getItem('pkce_code_verifier') || undefined;
        sessionStorage.removeItem('pkce_code_verifier');

        const response = await exchangeCodeForSession({ auth_code: code, code_verifier: codeVerifier }) as Record<string, unknown>;
        const nextSession = buildSessionObject(response);
        
        if (!nextSession) {
          throw new Error('Failed to exchange code for session');
        }
        
        // Check if this is a new user by looking at user metadata
        const sessionUser = nextSession.user as Record<string, unknown>;
        const isNewUser = !sessionUser?.last_sign_in_at || 
          (sessionUser.created_at as string) === (sessionUser.last_sign_in_at as string);
        
        // Get requested role from session storage
        const requestedRole = sessionStorage.getItem('oauth_signup_role') || 'tenant';
        console.log('[Auth] OAuth callback - requestedRole:', requestedRole);
        
        // Fetch or create profile
        let fetchedProfile = await fetchProfile(
          sessionUser.id as string,
          nextSession.access_token as string
        );
        
        console.log('[Auth] Existing profile:', fetchedProfile);
        
        // If profile exists and user wants to add a new role, update it
        if (fetchedProfile && requestedRole !== 'tenant' && requestedRole !== fetchedProfile.role) {
          console.log('[Auth] Adding new role to existing profile:', requestedRole);
          try {
            const currentRoles = (fetchedProfile as unknown as Record<string, unknown>)?.roles as string[] || [fetchedProfile.role || 'tenant'];
            console.log('[Auth] Current roles:', currentRoles);
            if (!currentRoles.includes(requestedRole)) {
              const newRoles = [...currentRoles, requestedRole];
              console.log('[Auth] New roles array:', newRoles);
              try {
                await updateRows('profiles', {
                  role: requestedRole,
                  roles: newRoles,
                  lister_type: 'owner',
                }, {
                  filters: [{ column: 'id', op: 'eq', value: sessionUser.id }],
                  accessToken: nextSession.access_token as string,
                  prefer: 'return=minimal'
                });
              } catch (err) {
                console.warn('[Auth] Role update failed, trying fallback:', err);
                await updateRows('profiles', {
                  role: requestedRole,
                  lister_type: 'owner',
                }, {
                  filters: [{ column: 'id', op: 'eq', value: sessionUser.id }],
                  accessToken: nextSession.access_token as string,
                  prefer: 'return=minimal'
                });
              }
              console.log('[Auth] Profile roles updated successfully');
              // Refresh profile after update
              fetchedProfile = await fetchProfile(
                sessionUser.id as string,
                nextSession.access_token as string
              );
              console.log('[Auth] Refreshed profile:', fetchedProfile);
            }
          } catch (err) {
            console.error('[Auth] Failed to update profile roles:', err);
          }
        }
        
        // If no profile exists (new OAuth user), create one with pending status
        if (!fetchedProfile) {
          const metadata = (sessionUser.user_metadata as Record<string, unknown>) || {};
          
          // Create initial profile via RPC or direct insert
          try {
            // Build roles array based on requested role
            const roles = requestedRole === 'tenant' ? ['tenant'] : ['tenant', requestedRole];

            const profileData: Record<string, any> = {
              id: sessionUser.id,
              role: requestedRole,
              full_name: metadata.full_name || metadata.name || '',
              phone: '',
              phone_verified: false,
              profile_photo_url: metadata.avatar_url || metadata.picture || '',
              verification_status: 'pending_profile_completion',
            };

            try {
              // Try with roles column
              await insertRows('profiles', { ...profileData, roles }, {
                accessToken: nextSession.access_token as string,
                prefer: 'return=minimal'
              });
            } catch (postErr) {
              console.warn('[Auth] OAuth profile creation fallback:', postErr);
              // Fallback without roles column
              await insertRows('profiles', profileData, {
                accessToken: nextSession.access_token as string,
                prefer: 'return=minimal'
              });
            }
          } catch (err) {
            console.error('Failed to create profile:', err);
          }
          
          // Fetch the newly created profile
          fetchedProfile = await fetchProfile(
            sessionUser.id as string,
            nextSession.access_token as string
          );
          
          // Create tenant record if role is tenant
          if (requestedRole === 'tenant') {
            try {
              console.log('[Auth] Creating tenant record for OAuth user:', sessionUser.id);
              // Use a fetch with timeout to prevent hanging the whole login flow
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 5000);
              
              await fetch(`${SUPABASE_URL}/rest/v1/tenants`, {
                method: 'POST',
                headers: {
                  'apikey': SUPABASE_ANON_KEY,
                  'Authorization': `Bearer ${nextSession.access_token as string}`,
                  'Content-Type': 'application/json',
                  'Prefer': 'return=minimal',
                },
                body: JSON.stringify({
                  profile_id: sessionUser.id,
                  tenant_type: 'student',
                  status: 'active'
                }),
                signal: controller.signal
              });
              clearTimeout(timeoutId);
              console.log('[Auth] Tenant record created successfully');
            } catch (tenantErr) {
              console.log('[Auth] Tenant record creation note (non-blocking):', tenantErr);
            }
          }
          
          // Clear the stored role
          sessionStorage.removeItem('oauth_signup_role');
        }
        
        // Pass requestedRole so buildCurrentUser uses it as the active role
        const nextUser = await hydrateUser(nextSession, true, flowId, requestedRole);
        
        return { user: nextUser, isNewUser: !fetchedProfile || fetchedProfile.phone === '' };
      } catch (err) {
        console.error('OAuth callback error:', err);
        if (isCurrentAuthFlow(flowId)) applySession(null);
        throw err;
      } finally {
        if (isCurrentAuthFlow(flowId)) setLoading(false);
      }
    },
    [hydrateUser, applySession, beginAuthFlow, isCurrentAuthFlow]
  );

  // ─── Magic Link / Email OTP ─────────────────────────────────
  const sendVerificationCode = useCallback(
    async (email: string) => {
      await sendOTP({ email });
    },
    []
  );

  const verifyEmailCode = useCallback(
    async (email: string, code: string): Promise<AuthUser | null> => {
      const flowId = beginAuthFlow();
      setLoading(true);
      
      try {
        const response = await verifyOTP({ email, token: code, type: 'email' }) as Record<string, unknown>;
        const nextSession = buildSessionObject(response);
        
        if (!nextSession) {
          throw new Error('Invalid verification code');
        }
        
        const sessionUser = nextSession.user as Record<string, unknown>;
        
        // Check if profile exists - if not, create one for new user
        let fetchedProfile = await fetchProfile(
          sessionUser.id as string,
          nextSession.access_token as string
        );
        
        const requestedRole = sessionStorage.getItem('oauth_signup_role') || 'tenant';
        console.log('[Auth] OTP verification - requestedRole:', requestedRole);
        
        // If profile exists and user wants to add a new role, update it
        if (fetchedProfile && requestedRole !== 'tenant' && requestedRole !== fetchedProfile.role) {
          console.log('[Auth] Adding new role to existing profile via OTP:', requestedRole);
          try {
            const currentRoles = (fetchedProfile as unknown as Record<string, unknown>)?.roles as string[] || [fetchedProfile.role || 'tenant'];
            if (!currentRoles.includes(requestedRole)) {
              const newRoles = [...currentRoles, requestedRole];
              try {
                await updateRows('profiles', {
                  role: requestedRole,
                  roles: newRoles,
                  lister_type: 'owner',
                }, {
                  filters: [{ column: 'id', op: 'eq', value: sessionUser.id }],
                  accessToken: nextSession.access_token as string,
                  prefer: 'return=minimal'
                });
              } catch (err) {
                console.warn('[Auth] Role update failed (OTP), trying fallback:', err);
                await updateRows('profiles', {
                  role: requestedRole,
                  lister_type: 'owner',
                }, {
                  filters: [{ column: 'id', op: 'eq', value: sessionUser.id }],
                  accessToken: nextSession.access_token as string,
                  prefer: 'return=minimal'
                });
              }
              console.log('[Auth] Profile roles updated successfully via OTP');
              
              fetchedProfile = await fetchProfile(
                sessionUser.id as string,
                nextSession.access_token as string
              );
            }
          } catch (err) {
            console.error('[Auth] Failed to update profile roles via OTP:', err);
          }
        }
        
        // If no profile exists (new email user), create one
        if (!fetchedProfile) {
          // Extract username from email (part before @) and format it
          const emailUsername = email.split('@')[0];
          const displayName = emailUsername
            .replace(/[._-]/g, ' ')
            .replace(/\b\w/g, (c) => c.toUpperCase()); // Capitalize each word
          
          try {
            const roles = requestedRole === 'tenant' ? ['tenant'] : ['tenant', requestedRole];
            
            const profileData: Record<string, any> = {
              id: sessionUser.id,
              role: requestedRole,
              full_name: displayName,
              phone: '',
              phone_verified: false,
              profile_photo_url: '',
              verification_status: 'pending_profile_completion',
            };

            try {
              // Try with roles column
              await insertRows('profiles', { ...profileData, roles }, {
                accessToken: nextSession.access_token as string,
                prefer: 'return=minimal'
              });
            } catch (postErr) {
              console.warn('[Auth] OTP profile creation fallback:', postErr);
              // Fallback without roles column
              await insertRows('profiles', profileData, {
                accessToken: nextSession.access_token as string,
                prefer: 'return=minimal'
              });
            }
            
            // Fetch the newly created profile
            fetchedProfile = await fetchProfile(
              sessionUser.id as string,
              nextSession.access_token as string
            );
            
            // Create tenant record if role is tenant
            if (requestedRole === 'tenant') {
              try {
                await fetch(`${SUPABASE_URL}/rest/v1/tenants`, {
                  method: 'POST',
                  headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${nextSession.access_token as string}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal',
                  },
                  body: JSON.stringify({
                    profile_id: sessionUser.id,
                    tenant_type: 'student',
                    status: 'active'
                  }),
                });
                console.log('[Auth] Created tenant record for:', sessionUser.id);
              } catch (tenantErr) {
                // Tenant might already exist, that's ok
                console.log('[Auth] Tenant record may already exist:', tenantErr);
              }
            }
            
            // Clear stored role
            sessionStorage.removeItem('oauth_signup_role');
          } catch (err) {
            console.error('Failed to create profile:', err);
          }
        }
        
        return await hydrateUser(nextSession, true, flowId, requestedRole);
      } catch (err) {
        console.error('Email verification error:', err);
        throw err;
      } finally {
        if (isCurrentAuthFlow(flowId)) setLoading(false);
      }
    },
    [hydrateUser, beginAuthFlow, isCurrentAuthFlow]
  );

  // Role switching functionality
  const switchRole = useCallback((newRole: string) => {
    if (!user?.roles?.includes(newRole)) {
      console.error('Cannot switch to role:', newRole, 'User does not have this role');
      return;
    }
    
    // Set loading immediately
    setLoading(true);
    
    // Persist active role
    console.log('[Auth] switchRole: switching to', newRole);
    setActiveRole(newRole);
    
    // Redirect to appropriate dashboard to force a clean UI/Theme state
    let targetPath = '/';
    if (newRole === 'landlord') targetPath = '/landlord/dashboard';
    else if (newRole === 'property_manager') targetPath = '/manager/dashboard';
    else if (newRole === 'admin') targetPath = '/admin';
    else targetPath = '/tenant/dashboard';

    // Using window.location.href forces a clean reload, solving potential CSS/State staleness
    window.location.href = targetPath;
  }, [user]);

  const canSwitchRolesValue = useMemo(() => {
    return canSwitchRoles(user?.roles || []);
  }, [user?.roles]);

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
      signInWithGoogle,
      handleOAuthCallback,
      sendVerificationCode,
      verifyEmailCode,
      refreshMe,
      switchRole,
      canSwitchRoles: canSwitchRolesValue,
      networkError,
      setNetworkError,
    }),
    [user, profile, session, loading, login, logout, registerStudent, registerLandlord, signInWithGoogle, handleOAuthCallback, sendVerificationCode, verifyEmailCode, refreshMe, switchRole, canSwitchRolesValue, networkError]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
