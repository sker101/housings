-- Finalize Schema Sync: Add missing columns and update views
-- 1. Add updated_at to core tables
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();
ALTER TABLE public.tenant_leases ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- 2. Update listings view to include contact email and other missing fields
DROP VIEW IF EXISTS public.listings CASCADE;
CREATE OR REPLACE VIEW public.listings AS
 SELECT r.id,
    r.property_id,
    p.landlord_id AS lister_id,
    au.email AS email, -- Email from auth.users
    au.email AS owner_email, -- Alias for safety
    prof.full_name AS owner_name,
    prof.phone AS owner_phone,
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
    prof.phone AS whatsapp_number, -- Default to phone if missing
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
    r.created_at,
    r.created_at AS updated_at -- Fallback for views
   FROM rooms r
     JOIN properties p ON r.property_id = p.id
     LEFT JOIN profiles prof ON p.landlord_id = prof.id
     LEFT JOIN auth.users au ON p.landlord_id = au.id; -- Join with auth.users for email

-- 3. Notify PostgREST
NOTIFY pgrst, 'reload schema';
