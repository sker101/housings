-- GOD MODE SEARCH FIX
-- This migration updates the 'listings' view to be dynamically dependent on the 'bookings' table.
-- If any room has a confirmed 'paid' booking, the view will AUTOMATICALLY report it as 
-- 'occupied' and 'unavailable', even if the underlying rooms table hasn't been updated yet.
-- This is a foolproof way to ensure paid rooms never appear in search results.

DROP VIEW IF EXISTS public.listings CASCADE;

CREATE OR REPLACE VIEW public.listings AS
 SELECT r.id,
    r.id AS listing_id,
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
    -- Dynamic Availability Check
    (
      CASE 
        WHEN EXISTS (SELECT 1 FROM public.bookings b WHERE b.listing_id = r.id AND b.status = 'paid') THEN false
        ELSE (r.availability_status = 'available')
      END
    ) AS available,
    -- Dynamic Vacancy Status Check
    (
      CASE 
        WHEN EXISTS (SELECT 1 FROM public.bookings b WHERE b.listing_id = r.id AND b.status = 'paid') THEN 'occupied'::text
        ELSE r.availability_status 
      END
    ) AS vacancy_status,
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
   FROM public.rooms r
     JOIN public.properties p ON r.property_id = p.id
     LEFT JOIN public.profiles prof ON p.landlord_id = prof.id
     LEFT JOIN auth.users au ON p.landlord_id = au.id;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
