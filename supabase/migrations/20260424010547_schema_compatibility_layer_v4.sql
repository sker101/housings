-- Implement a comprehensive compatibility layer for room_id vs listing_id
-- 1. Update listings view to provide both identifiers
DROP VIEW IF EXISTS public.listings CASCADE;
CREATE OR REPLACE VIEW public.listings AS
 SELECT r.id,
    r.id AS listing_id, -- Provides both for different component needs
    r.property_id,
    p.landlord_id AS lister_id,
    au.email AS email,
    au.email AS owner_email,
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
    prof.phone AS whatsapp_number,
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
    r.created_at AS updated_at
   FROM rooms r
     JOIN properties p ON r.property_id = p.id
     LEFT JOIN profiles prof ON p.landlord_id = prof.id
     LEFT JOIN auth.users au ON p.landlord_id = au.id;

-- 2. Restore room_id column to bookings for dashboard compatibility
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'room_id') THEN
    ALTER TABLE public.bookings ADD COLUMN room_id uuid REFERENCES public.rooms(id);
    UPDATE public.bookings SET room_id = listing_id;
  END IF;
END $$;

-- 3. Restore room_id column to tenant_leases for dashboard compatibility
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tenant_leases' AND column_name = 'room_id') THEN
    ALTER TABLE public.tenant_leases ADD COLUMN room_id uuid REFERENCES public.rooms(id);
    UPDATE public.tenant_leases SET room_id = listing_id;
  END IF;
END $$;

-- 4. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
