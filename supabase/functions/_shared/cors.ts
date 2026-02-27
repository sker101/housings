export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS'
};

export function withCors(payload: BodyInit | null, status = 200, headers: HeadersInit = {}) {
  return new Response(payload, {
    status,
    headers: {
      ...corsHeaders,
      ...headers
    }
  });
}

export function json(payload: unknown, status = 200) {
  return withCors(JSON.stringify(payload), status, {
    'Content-Type': 'application/json'
  });
}

export function parseJsonSafe<T = Record<string, unknown>>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}
