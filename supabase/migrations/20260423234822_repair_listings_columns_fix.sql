-- Add missing columns to listing_photos view for full compatibility
DROP VIEW IF EXISTS public.listing_photos CASCADE;
CREATE OR REPLACE VIEW public.listing_photos AS
 SELECT id,
    room_id AS listing_id,
    photo_url AS public_url,
    'main'::text AS angle,
    0 AS position,
    is_cover,
    ''::text AS caption,
    uploaded_at AS created_at,
    true AS ai_verified,
    100 AS ai_confidence
   FROM room_photos;

NOTIFY pgrst, 'reload schema';
