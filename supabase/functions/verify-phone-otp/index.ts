import { corsHeaders, json, withCors } from '../_shared/cors.ts';
import { createRequestClient } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return withCors('ok', 200, corsHeaders);
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const payload = await req.json().catch(() => null);
  const action = String(payload?.action || '').toLowerCase();
  const phone = payload?.phone;

  if (!phone || typeof phone !== 'string') {
    return json({ error: 'phone is required' }, 400);
  }

  try {
    const supabase = createRequestClient(req);

    if (action === 'send') {
      const { data, error } = await supabase.rpc('request_phone_otp', {
        p_phone: phone
      });

      if (error) {
        return json({ error: error.message }, 400);
      }

      return json({ ok: true, ...data });
    }

    if (action === 'verify') {
      const code = payload?.code;
      if (!code || typeof code !== 'string') {
        return json({ error: 'code is required for verify action' }, 400);
      }

      const { data, error } = await supabase.rpc('verify_phone_otp', {
        p_phone: phone,
        p_code: code
      });

      if (error) {
        return json({ error: error.message }, 400);
      }

      return json({ ok: true, ...data });
    }

    return json({ error: 'action must be either send or verify' }, 400);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Unexpected error' }, 500);
  }
});
