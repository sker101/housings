import { corsHeaders, json, withCors } from '../_shared/cors.ts';
import { createRequestClient } from '../_shared/supabase.ts';

const VALID_ANGLES = new Set(['bedroom', 'kitchen', 'bathroom', 'outside']);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return withCors('ok', 200, corsHeaders);
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const payload = await req.json().catch(() => null);
  const listing = payload?.listing;
  const photos = Array.isArray(payload?.photos) ? payload.photos : [];

  if (!listing || typeof listing !== 'object') {
    return json({ error: 'listing payload is required' }, 400);
  }

  try {
    const supabase = createRequestClient(req);
    const { data: listingId, error: listingError } = await supabase.rpc('submit_listing', {
      p_listing: listing
    });

    if (listingError) {
      return json({ error: listingError.message }, 400);
    }

    if (!listingId) {
      return json({ error: 'Failed to create listing' }, 500);
    }

    if (photos.length > 0) {
      const rows = photos
        .filter((photo: Record<string, unknown>) => {
          return (
            typeof photo?.public_url === 'string' &&
            typeof photo?.storage_path === 'string' &&
            typeof photo?.angle === 'string' &&
            VALID_ANGLES.has(String(photo.angle).toLowerCase())
          );
        })
        .map((photo: Record<string, unknown>) => ({
          listing_id: listingId,
          angle: String(photo.angle).toLowerCase(),
          storage_path: String(photo.storage_path),
          public_url: String(photo.public_url),
          ai_verified:
            typeof photo.ai_verified === 'boolean' ? Boolean(photo.ai_verified) : null,
          ai_confidence:
            typeof photo.ai_confidence === 'number' ? Number(photo.ai_confidence) : null
        }));

      if (rows.length > 0) {
        const { error: photoError } = await supabase.from('listing_photos').insert(rows);
        if (photoError) {
          return json({ error: photoError.message, listingId }, 400);
        }
      }
    }

    return json({ ok: true, listingId });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Unexpected error' }, 500);
  }
});
