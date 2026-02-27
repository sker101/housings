const DEFAULT_PROJECT_REF = 'iavflytaqfdwhmshocvm';
const SESSION_KEY = 'campusstay.supabase.session.v1';

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

function buildHeaders({ accessToken, contentType, prefer, extra = {} } = {}) {
  const headers = {
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

async function request(path, options = {}) {
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

  const target = new URL(path, SUPABASE_URL);
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value != null && value !== '') {
        target.searchParams.append(key, String(value));
      }
    });
  }

  const response = await fetch(target.toString(), {
    method,
    headers: buildHeaders({
      accessToken,
      contentType: body == null ? undefined : contentType,
      prefer,
      extra: extraHeaders
    }),
    body: body == null ? undefined : contentType === 'application/json' ? JSON.stringify(body) : body
  });

  if (raw) {
    return response;
  }

  const text = await response.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
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

export async function selectRows(table, options = {}) {
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
    searchParams.set('or', or);
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

export async function countRows(table, options = {}) {
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

export async function insertRows(table, payload, options = {}) {
  return request(`/rest/v1/${table}`, {
    method: 'POST',
    accessToken: options.accessToken,
    body: payload,
    prefer: options.prefer || 'return=representation'
  });
}

export async function upsertRows(table, payload, options = {}) {
  const headers = {};
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

export async function updateRows(table, payload, options = {}) {
  const searchParams = new URLSearchParams();
  applyFilters(searchParams, options.filters || []);

  return request(`/rest/v1/${table}?${searchParams.toString()}`, {
    method: 'PATCH',
    accessToken: options.accessToken,
    body: payload,
    prefer: options.prefer || 'return=representation'
  });
}

export async function deleteRows(table, options = {}) {
  const searchParams = new URLSearchParams();
  applyFilters(searchParams, options.filters || []);

  return request(`/rest/v1/${table}?${searchParams.toString()}`, {
    method: 'DELETE',
    accessToken: options.accessToken,
    contentType: undefined,
    prefer: options.prefer || 'return=representation'
  });
}

export async function invokeFunction(name, body, accessToken) {
  return request(`/functions/v1/${name}`, {
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

  const response = await fetch(
    `${SUPABASE_URL}/storage/v1/object/${encodeURIComponent(bucket)}/${encodedPath}`,
    {
      method: 'POST',
      headers: {
        ...buildHeaders({ accessToken, contentType: file.type || 'application/octet-stream' }),
        'x-upsert': 'true'
      },
      body: file
    }
  );

  const text = await response.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
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

  return `${SUPABASE_URL}/storage/v1/object/public/${encodeURIComponent(bucket)}/${encodedPath}`;
}
