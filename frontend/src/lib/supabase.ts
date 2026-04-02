const DEFAULT_PROJECT_REF = 'iavflytaqfdwhmshocvm';
const SESSION_KEY = 'campusstay.supabase.session.v1';
export const AUTH_SESSION_REFRESH_EVENT = 'campusstay:session-refreshed';

const projectRef =
  import.meta.env.VITE_SUPABASE_PROJECT_REF ||
  import.meta.env.VITE_SUPABASE_PROJECT ||
  DEFAULT_PROJECT_REF;

export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || `https://${projectRef}.supabase.co`;

export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

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

function buildSessionFromAuthPayload(authPayload, existingSession = null) {
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

function dispatchSessionRefresh(session, persistent) {
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

async function refreshStoredAccessToken(accessToken?: string) {
  if (!accessToken) {
    return accessToken;
  }

  const { session, persistent } = readStoredSession();
  if (!session?.refresh_token) {
    return session?.access_token || accessToken;
  }

  if (session.access_token && session.access_token !== accessToken && !isSessionExpired(session)) {
    return session.access_token;
  }

  if (!isSessionExpired(session) && session.access_token) {
    return session.access_token;
  }

  try {
    const refreshed = await refreshAuthSession(session.refresh_token);
    const nextSession = buildSessionFromAuthPayload(refreshed, session);

    if (!nextSession?.access_token) {
      return accessToken;
    }

    writeStoredSession(nextSession, persistent);
    dispatchSessionRefresh(nextSession, persistent);
    return nextSession.access_token;
  } catch {
    return accessToken;
  }
}

async function request(path: string, options: RequestOptions = {}) {
  if (!SUPABASE_ANON_KEY) {
    throw new Error(
      'Missing Supabase anon key. Set VITE_SUPABASE_ANON_KEY in frontend/.env and restart the dev server.'
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

  const resolvedAccessToken = await refreshStoredAccessToken(accessToken);
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
      body: body == null ? undefined : contentType === 'application/json' ? JSON.stringify(body) : body
    });

  let response = await executeFetch(resolvedAccessToken);

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
    throw new Error(normalizeErrorMessage(payload, `Supabase request failed (${response.status})`));
  }

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

export async function signInWithPassword({ email, password }) {
  return request('/auth/v1/token', {
    method: 'POST',
    query: { grant_type: 'password' },
    body: { email, password }
  });
}

export async function signUpWithPassword({ email, password, data }) {
  return request('/auth/v1/signup', {
    method: 'POST',
    body: { email, password, data }
  });
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
    accessToken,
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
        ...buildHeaders({ accessToken: tokenOverride, contentType: file.type || 'application/octet-stream' }),
        'x-upsert': 'true'
      },
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

  // If we are local, fall back to production URLs for storage parity
  const baseUrl = SUPABASE_URL.includes('localhost')
    ? `https://${DEFAULT_PROJECT_REF}.supabase.co`
    : SUPABASE_URL;

  return `${baseUrl}/storage/v1/object/public/${encodeURIComponent(bucket)}/${encodedPath}`;
}
