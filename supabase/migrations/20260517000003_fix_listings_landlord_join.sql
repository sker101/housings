-- 20260517000003_fix_listings_landlord_join.sql
-- Fix listings view to properly join the profiles and auth.users tables via the landlords table.
-- Previously it was joining on p.landlord_id = prof.id, which failed because p.landlord_id is the primary key of the landlords table, not the auth.users ID.

DROP VIEW IF EXISTS public.listings CASCADE;

CREATE OR REPLACE VIEW public.listings AS
 SELECT r.id,
    r.id AS listing_id,
    r.property_id,
    ll.profile_id AS lister_id,
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
    r.created_at AS updated_at,
    r.is_coming_soon
   FROM public.rooms r
     JOIN public.properties p ON r.property_id = p.id
     LEFT JOIN public.landlords ll ON p.landlord_id = ll.id
     LEFT JOIN public.profiles prof ON ll.profile_id = prof.id
     LEFT JOIN auth.users au ON ll.profile_id = au.id;

CREATE OR REPLACE FUNCTION public.trg_upd_listings()
RETURNS trigger AS $$
BEGIN
  -- Handle updating rooms
  UPDATE public.rooms
  SET 
    price_tzs = COALESCE(NEW.price_monthly, price_tzs),
    deposit_tzs = COALESCE(NEW.security_deposit, deposit_tzs),
    availability_status = COALESCE(NEW.vacancy_status, availability_status),
    available_from = COALESCE(NEW.available_from, available_from),
    is_coming_soon = COALESCE(NEW.is_coming_soon, is_coming_soon)
  WHERE id = OLD.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_upd_listings
  INSTEAD OF UPDATE ON public.listings
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_upd_listings();

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
