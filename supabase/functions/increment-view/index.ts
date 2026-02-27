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
  const listingId = payload?.listingId;

  if (!listingId || typeof listingId !== 'string') {
    return json({ error: 'listingId is required' }, 400);
  }

  try {
    const supabase = createRequestClient(req);
    const { data, error } = await supabase.rpc('increment_listing_view', {
      p_listing_id: listingId
    });

    if (error) {
      return json({ error: error.message }, 400);
    }

    return json({ ok: true, viewCount: data ?? 0 });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Unexpected error' }, 500);
  }
});
