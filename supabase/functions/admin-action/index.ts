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
  const action = payload?.action;
  const targetType = payload?.targetType;
  const targetId = payload?.targetId;
  const reason = payload?.reason ?? null;

  if (!action || !targetType || !targetId) {
    return json({ error: 'action, targetType, and targetId are required' }, 400);
  }

  try {
    const supabase = createRequestClient(req);
    const { data, error } = await supabase.rpc('admin_action_handler', {
      p_action: action,
      p_target_type: targetType,
      p_target_id: targetId,
      p_reason: reason
    });

    if (error) {
      return json({ error: error.message }, 400);
    }

    return json({ ok: true, result: data });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Unexpected error' }, 500);
  }
});
