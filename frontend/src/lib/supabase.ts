const DEFAULT_PROJECT_REF = 'iavflytaqfdwhmshocvm';
const SESSION_KEY = 'irent.supabase.session.v1';
export const AUTH_SESSION_REFRESH_EVENT = 'irent:session-refreshed';

const projectRef = DEFAULT_PROJECT_REF;

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || `https://${projectRef}.supabase.co`;

const DEFAULT_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlhdmZseXRhcWZkd2htc2hvY3ZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxOTU1ODEsImV4cCI6MjA4Nzc3MTU4MX0.kvC4YaE9LnbTpJHGgul8AEqXc81pkEpwdK_6PQJUdSU';

export const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_ANON_KEY).trim();

export const isSupabaseConfigured = Boolean(
  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
);

interface BuildHeadersOptions {
  accessToken?: string;
  contentType?: string;
  prefer?: string;
  extra?: Record<string, string>;
}

function buildHeaders({ accessToken, contentType, prefer, extra = {} }: BuildHeadersOptions = {}): Record<string, string> {
  const headers: Record<string, string> = {
    apikey: SUPABASE_ANON_KEY,
    ...extra
  };

  if (contentType) {
    headers['Content-Type'] = contentType;
  }

  if (prefer) {
    headers.Prefer = prefer;
  }

  // ONLY add Authorization if we have a real User Access Token. 
  // Public requests only need the 'apikey' header.
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  return headers;
}

function normalizeErrorMessage(payload, fallback) {
  if (!payload) {
    return fallback;
  }

  if (typeof payload === 'string') {
    return payload;
  }

  return (
    payload.msg ||
    payload.message ||
    payload.error_description ||
    payload.error ||
    fallback
  );
}

interface RequestOptions {
  method?: string;
  accessToken?: string;
  body?: any;
  contentType?: string;
  prefer?: string;
  query?: Record<string, unknown>;
  raw?: boolean;
  extraHeaders?: Record<string, string>;
}

function _buildSessionFromAuthPayload(authPayload, existingSession = null) {
  if (!authPayload?.access_token) {
    return null;
  }

  return {
    access_token: authPayload.access_token,
    refresh_token: authPayload.refresh_token || existingSession?.refresh_token || null,
    expires_at: authPayload.expires_at,
    expires_in: authPayload.expires_in,
    token_type: authPayload.token_type,
    user: authPayload.user || existingSession?.user || null
  };
}

function _dispatchSessionRefresh(session, persistent) {
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(AUTH_SESSION_REFRESH_EVENT, {
      detail: { session, persistent }
    })
  );
}

function shouldRefreshAuthToken(status, payload) {
  if (status !== 401) {
    return false;
  }

  const message = normalizeErrorMessage(payload, '').toLowerCase();
  return (
    message.includes('jwt expired') ||
    message.includes('invalid jwt') ||
    message.includes('token has expired') ||
    message.includes('expired')
  );
}

function isUnsupportedJwtAlgorithm(payload) {
  const message = normalizeErrorMessage(payload, '').toLowerCase();
  return message.includes('es256') || message.includes('unsupported jwt algorithm');
}

async function refreshStoredAccessToken(accessToken?: string | null, isAuthRequest = false) {
  // Never send cookies/tokens for initial sign-in to the Cloud
  if (isAuthRequest) return undefined;
  
  // Explicit null means "anonymous request - do not use stored token"
  if (accessToken === null) {
    return undefined;
  }
  
  // Undefined means "use stored token if available"
  if (accessToken === undefined) {
    const { session } = readStoredSession();
    return session?.access_token;
  }
  return accessToken;
}

async function rawAuthRequest(path: string, options: { method: string; query?: Record<string, string>; body?: any }) {
  const target = new URL(path, SUPABASE_URL);
  if (options.query) {
    Object.entries(options.query).forEach(([key, value]) => {
      target.searchParams.append(key, value);
    });
  }

  const fetchOptions: RequestInit = {
    method: options.method,
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Content-Type': 'application/json'
    },
    credentials: 'omit',
    referrerPolicy: 'no-referrer',
    // Don't follow redirects - we need to capture the redirect URL
    redirect: 'manual' as RequestRedirect,
  };
  
  // Only add body for methods that support it (POST, PUT, PATCH)
  if (options.body && options.method !== 'GET') {
    fetchOptions.body = JSON.stringify(options.body);
  }
  
  const response = await fetch(target.toString(), fetchOptions);

  // Handle 302 redirect (OAuth authorize endpoint returns this)
  if (response.status === 302 || response.status === 0) {
    const location = response.headers.get('location');
    if (location) {
      return { url: location };
    }
    // If no location header, parse the HTML body for the URL
    const text = await response.text();
    const urlMatch = text.match(/href="([^"]+)"/);
    if (urlMatch) {
      return { url: urlMatch[1].replace(/&amp;/g, '&') };
    }
    throw new Error('OAuth redirect URL not found');
  }

  // Handle non-JSON responses (like HTML error pages)
  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  
  if (!response.ok) {
    if (!isJson) {
      const text = await response.text();
      console.error('Non-JSON error response:', text.substring(0, 500));
      throw new Error(`Auth error (${response.status}): Provider may not be configured. Check Supabase Auth settings.`);
    }
    const payload = await response.json();
    throw payload;
  }
  
  // For successful responses, try to parse JSON
  if (isJson) {
    return await response.json();
  }
  
  // Some auth endpoints may return empty bodies
  const text = await response.text();
  if (!text) {
    return {};
  }
  
  try {
    return JSON.parse(text);
  } catch {
    return { url: text };
  }
}

export async function signInWithPassword({ email, password }) {
  return rawAuthRequest('/auth/v1/token', {
    method: 'POST',
    query: { grant_type: 'password' },
    body: { 
      email, 
      password,
      grant_type: 'password'
    }
  });
}

export async function signUpWithPassword({ email, password, data }) {
  return rawAuthRequest('/auth/v1/signup', {
    method: 'POST',
    body: { email, password, data }
  });
}

// ─────────────────────────────────────────────────────────────
// Google OAuth
// ─────────────────────────────────────────────────────────────

interface OAuthProvider {
  provider: 'google' | 'apple' | 'facebook';
  redirectTo?: string;
  scopes?: string;
}

// PKCE helpers
function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  // Check if crypto.subtle is available (requires secure context: HTTPS or localhost)
  if (!crypto?.subtle?.digest) {
    console.warn('Web Crypto API not available. OAuth may not work in insecure contexts (HTTP).');
    // Fallback: use plain verifier (less secure, but allows development)
    return btoa(verifier).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function signInWithOAuth({ provider, redirectTo, scopes }: OAuthProvider) {
  // Generate PKCE pair
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  // Store verifier for the callback to use
  sessionStorage.setItem('pkce_code_verifier', codeVerifier);

  const target = new URL('/auth/v1/authorize', SUPABASE_URL);
  target.searchParams.append('provider', provider);
  target.searchParams.append('code_challenge', codeChallenge);
  target.searchParams.append('code_challenge_method', 'S256');

  if (redirectTo) {
    target.searchParams.append('redirect_to', redirectTo);
  }
  if (scopes) {
    target.searchParams.append('scopes', scopes);
  }

  const url = target.toString();
  console.log('[supabase] Generated OAuth URL (PKCE):', url);
  return { url };
}

// ─────────────────────────────────────────────────────────────
// Email Magic Link / OTP
// ─────────────────────────────────────────────────────────────

export async function sendMagicLink({ email, redirectTo }: { email: string; redirectTo?: string }) {
  const body: Record<string, unknown> = { email };
  if (redirectTo) {
    body.redirect_to = redirectTo;
  }
  
  return rawAuthRequest('/auth/v1/magiclink', {
    method: 'POST',
    body
  });
}

export async function sendOTP({ email }: { email: string }) {
  return rawAuthRequest('/auth/v1/otp', {
    method: 'POST',
    body: { email, type: 'email' }
  });
}

export async function verifyOTP({ email, token, type = 'email' }: { email: string; token: string; type?: string }) {
  return rawAuthRequest('/auth/v1/verify', {
    method: 'POST',
    body: { email, token, type }
  });
}

export async function exchangeCodeForSession({ auth_code, code_verifier }: { auth_code: string; code_verifier?: string }) {
  const target = new URL('/auth/v1/token?grant_type=pkce', SUPABASE_URL);

  const body: Record<string, string> = { auth_code };
  if (code_verifier) body.code_verifier = code_verifier;

  const response = await fetch(target.toString(), {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error_description || err.msg || err.message || 'Token exchange failed');
  }

  return response.json();
}

async function request(path: string, options: RequestOptions = {}) {
  const isAuthRequest = path.includes('/auth/v1/token') || path.includes('/auth/v1/signup');
  
  if (!SUPABASE_ANON_KEY) {
    throw new Error(
      'Missing Supabase anon key.'
    );
  }

  const {
    method = 'GET',
    accessToken,
    body,
    contentType = 'application/json',
    prefer,
    query,
    raw = false,
    extraHeaders = {}
  } = options;

  const resolvedAccessToken = await refreshStoredAccessToken(accessToken as string | undefined | null, isAuthRequest);
  const target = new URL(path, SUPABASE_URL);
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value != null && value !== '') {
        target.searchParams.append(key, String(value));
      }
    });
  }

  const executeFetch = async (tokenOverride?: string) =>
    fetch(target.toString(), {
      method,
      headers: buildHeaders({
        accessToken: tokenOverride,
        contentType: body == null ? undefined : contentType,
        prefer,
        extra: extraHeaders
      }),
      credentials: 'omit',
      body: body == null ? undefined : contentType === 'application/json' ? JSON.stringify(body) : body
    });

  console.log(`[Supabase] ${method} ${target.toString()}`);
  let response = await executeFetch(resolvedAccessToken);
  console.log(`[Supabase] Response ${response.status} from ${path}`);

  if (raw) {
    if (accessToken && response.status === 401) {
      const retriedAccessToken = await refreshStoredAccessToken(resolvedAccessToken);
      if (retriedAccessToken && retriedAccessToken !== resolvedAccessToken) {
        response = await executeFetch(retriedAccessToken);
      }
    }
    return response;
  }

  const parseResponse = async (activeResponse) => {
    const text = await activeResponse.text();
    let payload = null;
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = text;
      }
    }
    return payload;
  };

  let payload = await parseResponse(response);

  if (accessToken && shouldRefreshAuthToken(response.status, payload)) {
    const retriedAccessToken = await refreshStoredAccessToken(resolvedAccessToken);
    if (retriedAccessToken && retriedAccessToken !== resolvedAccessToken) {
      response = await executeFetch(retriedAccessToken);
      payload = await parseResponse(response);
    }
  }

  if (!response.ok) {
    if (isUnsupportedJwtAlgorithm(payload)) {
      throw new Error(
        'Unsupported JWT algorithm ES256 — please sign out and sign back in to refresh your session.'
      );
    }
    throw new Error(normalizeErrorMessage(payload, `Supabase request failed (${response.status})`));
  }

  console.log(`[Supabase] Payload from ${path}:`, payload);
  return payload;
}

function nowEpochSeconds() {
  return Math.floor(Date.now() / 1000);
}

export function readStoredSession() {
  const persistent = localStorage.getItem(SESSION_KEY);
  if (persistent) {
    try {
      return { session: JSON.parse(persistent), persistent: true };
    } catch {
      localStorage.removeItem(SESSION_KEY);
    }
  }

  const temporary = sessionStorage.getItem(SESSION_KEY);
  if (temporary) {
    try {
      return { session: JSON.parse(temporary), persistent: false };
    } catch {
      sessionStorage.removeItem(SESSION_KEY);
    }
  }

  return { session: null, persistent: true };
}

export function writeStoredSession(session, persistent = true) {
  const serialized = JSON.stringify(session);

  if (persistent) {
    localStorage.setItem(SESSION_KEY, serialized);
    sessionStorage.removeItem(SESSION_KEY);
    return;
  }

  sessionStorage.setItem(SESSION_KEY, serialized);
  localStorage.removeItem(SESSION_KEY);
}

export function clearStoredSession() {
  localStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(SESSION_KEY);
}

export function isSessionExpired(session) {
  if (!session?.expires_at) {
    return true;
  }

  return Number(session.expires_at) <= nowEpochSeconds() + 30;
}

export async function requestPasswordReset(email: string) {
  return request('/auth/v1/recover', {
    method: 'POST',
    body: { email }
  });
}

export async function confirmPasswordReset(accessToken: string, newPassword: string) {
  return request('/auth/v1/user', {
    method: 'PUT',
    accessToken,
    body: { password: newPassword }
  });
}

export async function resendVerificationEmail(email: string) {
  return request('/auth/v1/resend', {
    method: 'POST',
    body: { type: 'signup', email }
  });
}

export async function refreshAuthSession(refreshToken) {
  return request('/auth/v1/token', {
    method: 'POST',
    query: { grant_type: 'refresh_token' },
    body: { refresh_token: refreshToken }
  });
}

export async function fetchAuthUser(accessToken) {
  return request('/auth/v1/user', {
    method: 'GET',
    accessToken,
    contentType: undefined
  });
}

export async function signOut(accessToken) {
  return request('/auth/v1/logout', {
    method: 'POST',
    accessToken,
    body: {}
  });
}

function encodeFilterValue(value) {
  if (value == null) {
    return 'null';
  }

  if (typeof value === 'boolean' || typeof value === 'number') {
    return String(value);
  }

  return String(value);
}

function applyFilters(searchParams, filters = []) {
  filters.forEach((filter) => {
    if (!filter || !filter.column || filter.value == null || filter.value === '') {
      return;
    }

    const op = filter.op || 'eq';
    searchParams.append(filter.column, `${op}.${encodeFilterValue(filter.value)}`);
  });
}

interface Filter {
  column: string;
  op?: string;
  value: unknown;
  orGroup?: boolean;
}

interface SelectOptions {
  select?: string;
  filters?: Filter[];
  or?: string;
  order?: string;
  limit?: number;
  offset?: number;
  accessToken?: string;
  head?: boolean;
  count?: string;
}

interface RowOptions {
  accessToken?: string;
  prefer?: string;
  filters?: Filter[];
  onConflict?: string;
}

export async function selectRows(table: string, options: SelectOptions = {}) {
  const {
    select = '*',
    filters = [],
    or,
    order,
    limit,
    offset,
    accessToken,
    head = false,
    count
  } = options;

  const searchParams = new URLSearchParams();
  searchParams.set('select', select);

  applyFilters(searchParams, filters);

  if (or) {
    searchParams.set('or', `(${or})`);
  }

  if (order) {
    searchParams.set('order', order);
  }

  if (limit != null) {
    searchParams.set('limit', String(limit));
  }

  if (offset != null) {
    searchParams.set('offset', String(offset));
  }

  const response = await request(`/rest/v1/${table}?${searchParams.toString()}`, {
    method: head ? 'HEAD' : 'GET',
    accessToken,
    contentType: undefined,
    prefer: count ? `count=${count}` : undefined,
    raw: head
  });

  if (head) {
    return response;
  }

  return Array.isArray(response) ? response : [];
}

export async function countRows(table: string, options: SelectOptions = {}) {
  const response = await selectRows(table, {
    ...options,
    head: true,
    count: 'exact',
    select: options.select || 'id'
  });

  const range = response.headers.get('content-range') || '';
  const total = Number(range.split('/')[1] || 0);
  return Number.isFinite(total) ? total : 0;
}

export async function insertRows(table: string, payload: unknown, options: RowOptions = {}) {
  return request(`/rest/v1/${table}`, {
    method: 'POST',
    accessToken: options.accessToken,
    body: payload,
    prefer: options.prefer || 'return=representation'
  });
}

export async function upsertRows(table: string, payload: unknown, options: RowOptions = {}) {
  const headers: Record<string, string> = {};
  if (options.onConflict) {
    headers['On-Conflict'] = options.onConflict;
  }

  return request(`/rest/v1/${table}`, {
    method: 'POST',
    accessToken: options.accessToken,
    body: payload,
    prefer:
      options.prefer ||
      'resolution=merge-duplicates,return=representation',
    extraHeaders: headers
  });
}

export async function updateRows(table: string, payload: unknown, options: RowOptions = {}) {
  const searchParams = new URLSearchParams();
  applyFilters(searchParams, options.filters || []);

  return request(`/rest/v1/${table}?${searchParams.toString()}`, {
    method: 'PATCH',
    accessToken: options.accessToken,
    body: payload,
    prefer: options.prefer || 'return=representation'
  });
}

export async function deleteRows(table: string, options: RowOptions = {}) {
  const searchParams = new URLSearchParams();
  applyFilters(searchParams, options.filters || []);

  return request(`/rest/v1/${table}?${searchParams.toString()}`, {
    method: 'DELETE',
    accessToken: options.accessToken,
    contentType: undefined,
    prefer: options.prefer || 'return=representation'
  });
}

export async function invokeFunction(name: string, body: unknown, accessToken?: string) {
  return request(`/functions/v1/${name}`, {
    method: 'POST',
    // Pass the user's access token so edge functions can identify the caller
    accessToken: accessToken || undefined,
    body
  });
}

export async function rpc(name: string, body?: unknown, accessToken?: string) {
  return request(`/rest/v1/rpc/${name}`, {
    method: 'POST',
    accessToken,
    body
  });
}

export async function uploadPublicObject({ bucket, path, file, accessToken }) {
  const encodedPath = path
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');

  const resolvedAccessToken = await refreshStoredAccessToken(accessToken);
  const target = `${SUPABASE_URL}/storage/v1/object/${encodeURIComponent(bucket)}/${encodedPath}`;
  const executeUpload = async (tokenOverride?: string) =>
    fetch(target, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${tokenOverride || SUPABASE_ANON_KEY}`,
        'x-upsert': 'true'
      },
      credentials: 'omit',
      body: file
    });

  let response = await executeUpload(resolvedAccessToken);

  const parseResponse = async (activeResponse) => {
    const text = await activeResponse.text();
    let payload = null;
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = text;
      }
    }
    return payload;
  };

  let payload = await parseResponse(response);

  if (accessToken && shouldRefreshAuthToken(response.status, payload)) {
    const retriedAccessToken = await refreshStoredAccessToken(resolvedAccessToken);
    if (retriedAccessToken && retriedAccessToken !== resolvedAccessToken) {
      response = await executeUpload(retriedAccessToken);
      payload = await parseResponse(response);
    }
  }

  if (!response.ok) {
    throw new Error(normalizeErrorMessage(payload, 'Storage upload failed'));
  }

  return payload;
}

export function publicObjectUrl(bucket, path) {
  const encodedPath = path
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');

  const baseUrl = SUPABASE_URL;

  return `${baseUrl}/storage/v1/object/public/${encodeURIComponent(bucket)}/${encodedPath}`;
}
