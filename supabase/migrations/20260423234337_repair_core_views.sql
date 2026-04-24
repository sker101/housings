-- 1. Re-create listings view with all expected columns
DROP VIEW IF EXISTS public.listings CASCADE;
CREATE OR REPLACE VIEW public.listings AS
 SELECT r.id,
    r.property_id,
    p.landlord_id AS lister_id,
    p.title,
    COALESCE(r.description, p.description) AS description,
    r.room_type,
    'any'::text AS gender_preference,
    r.price_tzs AS price_monthly,
    r.deposit_tzs AS security_deposit,
    false AS utilities_included,
    r.floor_number AS floor,
    1 AS total_rooms,
    false AS furnished,
    'house'::text AS property_type,
    'Landlord'::text AS owner_name,
    ''::text AS owner_phone,
    ''::text AS whatsapp_number,
    1 AS min_lease_months,
    'monthly'::text AS payment_schedule,
    ''::text AS late_fee_policy,
    ''::text AS video_tour_url,
    ''::text AS accessibility_notes,
    p.city AS region,
    p.district,
    p.ward,
    p.address AS street,
    p.latitude AS lat,
    p.longitude AS lng,
    array_to_json(r.amenities)::text AS amenities,
    ''::text AS house_rules,
    r.available_from,
    (r.availability_status = 'available') AS available,
    r.availability_status AS vacancy_status,
        CASE
            WHEN p.status = 'active'::text THEN 'approved'::text
            ELSE p.status
        END AS status,
    ''::text AS rejection_reason,
    p.is_featured AS featured,
    ARRAY[]::text[] AS near_universities,
    0 AS view_count,
    r.created_at
   FROM rooms r
     JOIN properties p ON r.property_id = p.id;

-- 2. Re-create listing_photos view
DROP VIEW IF EXISTS public.listing_photos CASCADE;
CREATE OR REPLACE VIEW public.listing_photos AS
 SELECT id,
    room_id AS listing_id,
    photo_url AS public_url,
    'main'::text AS angle,
    0 AS position,
    is_cover,
    ''::text AS caption,
    uploaded_at AS created_at
   FROM room_photos;

-- 3. Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
